const socket = new WebSocket('ws://localhost:3000');
let currentRoom = null;
let currentUser = null;
const roomChatMessages = new Map();

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.rooms) {
    updateRoomList(data.rooms);
  } else if (data.users) {
    updateUserList(data.users);
  } else if (data.type === 'chat') {
    displayChatMessage(data.username, data.message);
  }
};

function createRoom() {
  const roomName = prompt('Enter the new room name:');
  if (roomName) {
    socket.send(JSON.stringify({ type: 'createRoom', room: roomName }));
  }
}

function setUsername() {
  const usernameInput = document.getElementById('usernameInput');
  const username = usernameInput.value.trim();
  if (username) {
    currentUser = username;
    updateRoomTitle();
    updateOnlineUsers([username]);
    usernameInput.value = '';
  }
}

function updateRoomList(rooms) {
  const roomList = document.getElementById('roomList');
  roomList.innerHTML = '';
  rooms.forEach((room) => {
    const roomItem = document.createElement('li');
    roomItem.textContent = room;
    roomItem.onclick = () => joinRoom(room);
    roomList.appendChild(roomItem);
  });
}

function updateRoomTitle() {
  const roomTitle = document.getElementById('roomTitle');
  roomTitle.textContent = currentRoom ? `Room: ${currentRoom}` : 'Select a Room';
}

function updateUserList(users) {
  const onlineUsersList = document.getElementById('onlineUsers');
  onlineUsersList.innerHTML = '';
  users.forEach((user) => {
    const listItem = document.createElement('li');
    listItem.textContent = user;
    onlineUsersList.appendChild(listItem);
  });
}

function joinRoom(roomName) {
  clearChatMessages();
  loadChatMessages(roomName)
  currentRoom = roomName;
  updateRoomTitle();
  socket.send(JSON.stringify({ type: 'joinRoom', room: roomName, username: currentUser }));
}
function clearChatMessages() {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '';
}

function displayChatMessage(username, message) {
  const chatMessages = document.getElementById('chatMessages');
  const messageElement = document.createElement('div');
  messageElement.textContent = `${username}: ${message}`;
  chatMessages.appendChild(messageElement);

  // Auto-scroll the chat box to show the latest message
  // Store the chat message in the map for the current room
  const currentRoom = document.getElementById('roomTitle').textContent.replace('Room: ', '');
  if (!roomChatMessages.has(currentRoom)) {
    roomChatMessages.set(currentRoom, []);
  }
  roomChatMessages.get(currentRoom).push(messageElement.textContent);
  //chatMessages.scrollTop = chatMessages.scrollHeight;
}

function loadChatMessages(room) {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '';
  if (roomChatMessages.has(room)) {
    roomChatMessages.get(room).forEach((message) => {
      const messageElement = document.createElement('div');
      messageElement.textContent = message;
      chatMessages.appendChild(messageElement);
    });
  }
}
function sendChatMessage() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value.trim();
  if (message && currentUser && currentRoom) {
    socket.send(JSON.stringify({ type: 'chat', username: currentUser, message: message }));
    chatInput.value = '';
  }
}
/*
document.getElementById('chatInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendChatMessage();
  }
});*/
