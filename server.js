const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const app = express();

app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();
const users = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'createRoom') {
      const roomName = data.room;
      rooms.set(roomName, new Set());
      broadcastRooms();
    } else if (data.type === 'getRooms') {
      ws.send(JSON.stringify({ rooms: Array.from(rooms.keys()) }));
    } else if (data.type === 'joinRoom') {
      const roomName = data.room;
      const username = data.username;

      if (rooms.has(roomName)) {
        rooms.get(roomName).add(username);
        users.set(username, ws);
        broadcastUsers(roomName);
        ws.room = roomName;
        ws.username = username;
      }
    } else if (data.type === 'chat') {
      if (ws.room && ws.username) {
        const roomName = ws.room;
        broadcastChat(roomName, ws.username, data.message);
      }
    }
  });

  ws.on('close', () => {
    const username = ws.username;
    if (username) {
      users.delete(username);
    }
    if (ws.room) {
      const roomName = ws.room;
      rooms.get(roomName).delete(username);
      broadcastUsers(roomName);
    }
  });
});

function broadcastRooms() {
  const roomList = Array.from(rooms.keys());
  const message = { type: 'rooms', rooms: roomList };
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastUsers(roomName) {
  const userList = Array.from(rooms.get(roomName));
  const message = { type: 'users', users: userList };
  wss.clients.forEach((client) => {
    if (client.room === roomName && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastChat(roomName, username, message) {
  const messageData = { type: 'chat', username, message };
  wss.clients.forEach((client) => {
    if (client.room === roomName && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(messageData));
    }
  });
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
