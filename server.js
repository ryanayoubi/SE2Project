const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

const db = new sqlite3.Database('user_accounts.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the database');
    db.run(
      'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)'
    );
  }
});

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.request === 'getRooms') {
      const roomList = Array.from(rooms.keys());
      ws.send(JSON.stringify({ rooms: roomList }));
    } else if (data.request === 'joinRoom') {
      const roomToJoin = data.room;
      leaveCurrentRoom(ws);
      joinRoom(roomToJoin, ws);
      broadcastOnlineUsers(roomToJoin);
    } else if (data.request === 'createRoom') {
      const newRoomName = data.room;
      if (!rooms.has(newRoomName)) {
        rooms.set(newRoomName, []);
        ws.send(JSON.stringify({ message: `Room "${newRoomName}" created successfully!` }));
      } else {
        ws.send(JSON.stringify({ error: `Room "${newRoomName}" already exists.` }));
      }
    } else if (data.username) {
      // Handle setting and updating usernames
      const newUsername = data.username;

      // Check if the new username is already in use
      if (ws.username !== newUsername && isUsernameInUse(newUsername, ws.room)) {
        // If the new username is in use, send a message to the client indicating the conflict
        ws.send(JSON.stringify({ error: 'Username is already in use' }));
      } else {
        // If the new username is not in use, remove the old username and set the new one
        ws.username = newUsername;
        
        // Broadcast the updated list of online users for the room to all clients
        broadcastOnlineUsers(ws.room);
      }
    } else if (data.chatmessage) {
      const message = data.chatmessage;
      broadcastNewMessage(ws.room,ws.username,message);
      
    } else if (data.request === 'createAccount') {
      const username = data.username;
      const password = data.password;

      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
        if (err) {
          ws.send(JSON.stringify({ error: 'Failed to create account. Please try again.' }));
        } else {
          ws.send(JSON.stringify({ message: 'Account created successfully!' }));
        }
      });

    } else if (data.request === 'login') {
      const username = data.username;
      const password = data.password;

      console.log(`Received login request for username: ${username}`);

      loginUser(username, password, ws);

    } else if (data.username) {
      const newUsername = data.username;

      if (ws.username !== newUsername && isUsernameInUse(newUsername, ws.room)) {
        ws.send(JSON.stringify({ error: 'Username is already in use' }));
      } else {
        ws.username = newUsername;
        broadcastOnlineUsers(ws.room);
      }
    }
  });

  ws.on('close', () => {
    leaveCurrentRoom(ws);
  });
});

function isUsernameInUse(username, room) {
  if (!room) return false;

  const roomUsers = rooms.get(room);
  if (!roomUsers) return false;

  return roomUsers.some((user) => user.username === username);
}

function joinRoom(room, ws) {
  let roomUsers = rooms.get(room);

  if (!roomUsers) {
    roomUsers = [];
    rooms.set(room, roomUsers);
  }

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

function loginUser(username, password, ws) {
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      console.error(err.message);
      ws.send(JSON.stringify({ error: 'Internal server error' }));
      return;
    }

    if (row) {
      // Set the username for the WebSocket connection
      ws.username = username;
      ws.send(JSON.stringify({ message: 'Login successful' }));
    } else {
      ws.send(JSON.stringify({ error: 'Invalid username or password' }));
    }
  });
}

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
