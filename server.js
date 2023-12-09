const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3');
const {Translate} = require('@google-cloud/translate').v2;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const db = new sqlite3.Database('users.db');
const translate = new Translate({keyFilename: './translateapi-406803-9f722f2db0b5.json'});

const rooms = new Map(); // Using a Map to store room names and their online users
const games = new Map();

const suits = ["c","d","h","s"];

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (username TEXT, password TEXT, balance INT, bet INT)");
});

wss.on('connection', (ws) => {
  ws.balance = 100;
  ws.bet = 25;
  ws.on('message', async (message) => {
    const data = JSON.parse(message);

    if (data.request === 'getRooms') {
      // If the client requests the list of available rooms, send it to them
      const roomList = Array.from(rooms.keys());
      ws.send(JSON.stringify({ rooms: roomList }));
    } else if (data.request === 'joinRoom') {
      // Handle joining a room
      const roomToJoin = data.room;
      // Remove the user from their current room, if any
      leaveCurrentRoom(ws);
      // Add the user to the selected room
      joinRoom(roomToJoin, ws);

      // Send the updated list of online users for the selected room
      broadcastOnlineUsers(roomToJoin);
      broadcastGameState(roomToJoin);
    } else if (data.request === 'createRoom') {
      // Handle creating a new room
      const newRoomName = data.room;
      if (!rooms.has(newRoomName)) {
        rooms.set(newRoomName, []);
        ws.send(JSON.stringify({ message: `Room "${newRoomName}" created successfully!` }));
      } else {
        ws.send(JSON.stringify({ error: `Room "${newRoomName}" already exists.` }));
      }
    } else if (data.username) {
      if(data.password){
          ws.balance = data.balance;
          ws.bet = data.bet;
          db.run("INSERT INTO users(username, password, balance, bet) VALUES (?, ?, ?, ?)",[data.username,data.password,data.balance,data.bet]);
      }
      ws.send(JSON.stringify({balance: ws.balance}));
      // Handle setting and updating usernames
      const newUsername = data.username;
      // Check if the new username is already in use
      if (ws.username !== newUsername && isUsernameInUse(newUsername, ws.room)) {
        // If the new username is in use, send a message to the client indicating the conflict
        ws.send(JSON.stringify({ error: 'Username is already in use' }));
      } else {
        if(ws.room){
          // Update the username in game
          games.get(ws.room).players.set(newUsername,games.get(ws.room).players.get(ws.username));
          // Remove the old username from the game
          games.get(ws.room).players.delete(ws.username);
        }
        // If the new username is not in use, remove the old username and set the new one
        ws.username = newUsername;
        
        // Broadcast the updated list of online users for the room to all clients
        broadcastOnlineUsers(ws.room);
        broadcastGameState(ws.room);
      }
    } else if (data.chatmessage) {
      const message = await translateText(data.chatmessage);
      broadcastNewMessage(ws.room,ws.username,data.chatmessage,message);
    } else if (data.action){
      gameHandler(ws.room,ws.username,data.action);
    } else if (data.bet){
      ws.bet = data.bet;
    }
  });

  ws.on('close', () => {
    // Remove the user from their current room when they disconnect
    leaveCurrentRoom(ws);
  });
});

function isUsernameInUse(username, room) {
  if (!room) return false; // No room selected

  const roomUsers = rooms.get(room);
  if (!roomUsers) return false; // Room doesn't exist

  return roomUsers.some((user) => user.username === username);
}

function joinRoom(room, ws) {
  let roomUsers = rooms.get(room);
  let gameState = games.get(room);

  if (!roomUsers) {
    roomUsers = [];
    rooms.set(room, roomUsers);
  }

  if (!gameState) {
    gameState = {players: new Map(),dealer:{hand:[suits[Math.floor(Math.random()*suits.length)]+(Math.floor(Math.random()*13)+1)]}};
    games.set(room,gameState);
  }

  gameState.players.set(ws.username,{
    hand:[suits[Math.floor(Math.random()*suits.length)]+(Math.floor(Math.random()*13)+1),suits[Math.floor(Math.random()*suits.length)]+(Math.floor(Math.random()*13)+1)],
    done:0});

  ws.balance -= ws.bet;
  ws.send(JSON.stringify({balance: ws.balance}));

  roomUsers.push(ws);
  ws.room = room;
}

function leaveCurrentRoom(ws) {
  if (ws.room) {
    const roomUsers = rooms.get(ws.room);

    if (roomUsers) {
      const index = roomUsers.indexOf(ws);
      if (index !== -1) {
        roomUsers.splice(index, 1);
        broadcastOnlineUsers(ws.room);
        games.get(ws.room).players.delete(ws.username);
        broadcastGameState(ws.room)
        ws.room = null;
      }
    }
  }
}

function broadcastOnlineUsers(room) {
  const roomUsers = rooms.get(room);
  if (!roomUsers) return;

  const users = roomUsers.map((user) => user.username);
  
  roomUsers.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ users: users, room: room }));
    }
  });
}

function broadcastNewMessage(room,username,message,tmessage) {
  const roomUsers = rooms.get(room);
  if (!roomUsers) return;
  roomUsers.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ newmessage: message, tmessage: tmessage, username: username}));
    }
  });
}

async function translateText(text) {
  try {
    const [detection] = await translate.detect(text);
    const {language} = detection;
    const [translation] = await translate.translate(text,{from: language, to: 'en'});
    return translation;
  }catch(error){
    return null;
  }
}

function gameHandler(room, player, action){
  if(games.get(room).players.get(player).done!=1){
    if(action == "hit"){
      games.get(room).players.get(player).hand.push(suits[Math.floor(Math.random()*suits.length)]+(Math.floor(Math.random()*13)+1));
      let score = 0;
      games.get(room).players.get(player).hand.forEach((card) => {
        if(card.charAt(2)){
          score += 10;
        }else{
          score += parseInt(card.charAt(1));
        }
      });
      if(score>21){
        games.get(room).players.get(player).done=1;
      }
    }else if(action == "stand"){
      games.get(room).players.get(player).done=1;
    }
  }

  const roomUsers = rooms.get(room);
  if (!roomUsers) return;
  let allDone = 1;
  roomUsers.forEach((client) => {
    if (games.get(room).players.get(client.username).done != 1){
      allDone = 0;
    }
  });
  if (allDone == 1){
    let dealerScore = 0;
    let soft = 0;
    if(games.get(room).dealer.hand[0].charAt(2)){
      dealerScore = 10;
    }else if(games.get(room).dealer.hand[0].charAt(1) == 1){
      dealerScore = 11;
      soft = 1;
    }else{
      dealerScore = parseInt(games.get(room).dealer.hand[0].charAt(1));      
    }
    console.log(dealerScore);
    while (dealerScore < 17) {;
      const newCard = Math.floor(Math.random()*13)+1;
      games.get(room).dealer.hand.push(suits[Math.floor(Math.random()*suits.length)]+newCard);
      if(newCard>10){
        dealerScore += 10;
      }else if((newCard == 1)&&(soft == 0)){
        dealerScore += 11;
        soft = 1;
      }else{
        dealerScore += newCard;
      }
      if ((dealerScore > 21)&&(soft == 1)){
        dealerScore -= 10;
        soft = 2;
      }
    }

    roomUsers.forEach((client) => {
      let playerScore = 0;
      soft = 0;
      games.get(room).players.get(client.username).hand.forEach((card) => {
        if(card.charAt(2)){
          playerScore += 10;
        }else{
          if(card.charAt(1) == 1){
            playerScore += 11;
            soft = 1;
          }else{
            playerScore += parseInt(card.charAt(1));
          }
        }
        if((playerScore>21)&&(soft == 1)){
          playerScore -= 10;
          soft = 2;
        }
      });
      if(playerScore==21&&dealerScore!=21){
        client.balance += (client.bet + client.bet*1.5);
      }else if(playerScore>21){
        client.balance = client.balance;
      }else if(playerScore>dealerScore||dealerScore>21){
        client.balance += (client.bet*2);
      }else if(playerScore==dealerScore){
        client.balance += client.bet;
      }
      client.send(JSON.stringify({balance: client.balance}));
    });
    setTimeout(() => {
      games.delete(room);
      games.set(room, {players: new Map(),dealer:{hand:[suits[Math.floor(Math.random()*suits.length)]+(Math.floor(Math.random()*13)+1)]}});
      roomUsers.forEach((client) => {
        games.get(room).players.set(client.username,{
          hand:[suits[Math.floor(Math.random()*suits.length)]+(Math.floor(Math.random()*13)+1),suits[Math.floor(Math.random()*suits.length)]+(Math.floor(Math.random()*13)+1)],
          done:0});
        client.balance -= client.bet;
        client.send(JSON.stringify({balance: client.balance}));
      });
      broadcastGameState(room);
    }, 3000);
  }
  broadcastGameState(room);
  console.log(games.get(room),games.get(room).players.get(player), player, action);
}

function broadcastGameState(room){
  const roomUsers = rooms.get(room);
  if (!roomUsers) return;

  roomUsers.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ gameState: {players: Array.from(games.get(room).players,([player,{hand,done}])=>({player,hand,done})),dealer: games.get(room).dealer}}));
    }
  });
}

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/styles.css', (req, res) => {
  res.sendFile(__dirname + '/styles.css');
});

app.get('/script.js', (req, res) => {
  res.sendFile(__dirname + '/script.js');
});

app.get('/*.png', (req, res) => {
  res.sendFile(__dirname + req.url);
});