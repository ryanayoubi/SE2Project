const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map(); // Using a Map to store room names and their online users

// Connect to SQLite database
const db = new sqlite3.Database('chatApp.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create a 'users' table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        language TEXT
      )
    `);
  }
});

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
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
    } else if (data.request === 'createRoom') {
      // Handle creating a new room
      const newRoomName = data.room;
      if (!rooms.has(newRoomName)) {
        rooms.set(newRoomName, []);
        ws.send(JSON.stringify({ message: `Room "${newRoomName}" created successfully!` }));
      } else {
        ws.send(JSON.stringify({ error: `Room "${newRoomName}" already exists.` }));
      }
    } else if (data.username && data.password) {
      // Handle setting and updating usernames with SQLite
      const newUsername = data.username;
      const newPassword = data.password;
      const language = data.language || ''; // default to an empty string if not provided

      createUser(newUsername, newPassword, language)
        .then(() => {
          // Set the username for the WebSocket connection
          ws.username = newUsername;

          // Broadcast the updated list of online users for the room to all clients
          broadcastOnlineUsers(ws.room);
        })
        .catch((error) => {
          ws.send(JSON.stringify({ error: error.message }));
        });
    }
  });

  ws.on('close', () => {
    // Remove the user from their current room when they disconnect
    leaveCurrentRoom(ws);
  });
});

function createUser(username, password, language) {
  return new Promise((resolve, reject) => {
    // Check if the username already exists in the database
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) {
        reject(new Error('Database error'));
      } else if (row) {
        reject(new Error('Username is already in use'));
      } else {
        // Insert the new user into the database
        db.run('INSERT INTO users (username, password, language) VALUES (?, ?, ?)', [username, password, language], (err) => {
          if (err) {
            reject(new Error('Error creating user'));
          } else {
            resolve();
          }
        });
      }
    });
  });
}

function isUsernameInUse(username, room) {
  if (!room) return false; // No room selected

  const roomUsers = rooms.get(room);
  if (!roomUsers) return false; // Room doesn't exist

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
