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

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
