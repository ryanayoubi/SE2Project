const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const onlineUsers = new Map(); // Using a Map to store username and corresponding WebSocket instance

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.request === 'getUsers') {
      // If the client requests the list of online users, send it to them
      const users = Array.from(onlineUsers.keys());
      ws.send(JSON.stringify({ users: users }));
    } else if (data.username) {
      // Handle setting and updating usernames
      const newUsername = data.username;

      // Check if the new username is already in use
      if (onlineUsers.has(newUsername)) {
        // If the new username is in use, send a message to the client indicating the conflict
        ws.send(JSON.stringify({ error: 'Username is already in use' }));
      } else {
        // If the new username is not in use, remove the old username and set the new one
        onlineUsers.delete(ws.username);
        ws.username = newUsername;
        onlineUsers.set(newUsername, ws);
        
        // Broadcast the updated list of online users to all clients
        broadcastOnlineUsers();
      }
    }
  });

  ws.on('close', () => {
    // Remove the user from the onlineUsers map when they disconnect
    onlineUsers.delete(ws.username);
    // Broadcast the updated list of online users to all clients
    broadcastOnlineUsers();
  });
});

function broadcastOnlineUsers() {
  const users = Array.from(onlineUsers.keys());
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ users: users }));
    }
  });
}

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});

