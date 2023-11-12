const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map(); // Using a Map to store room names and their online users

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

function broadcastNewMessage(room,username,message) {
  const roomUsers = rooms.get(room);
  if (!roomUsers) return;
  roomUsers.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ newmessage: message, username: username}));
    }
  });
}

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});

