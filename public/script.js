const socket = new WebSocket('ws://localhost:3000');

socket.onopen = () => {
  socket.send(JSON.stringify({ request: 'getRooms' }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.rooms) {
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';
    data.rooms.forEach((room) => {
      const roomItem = document.createElement('li');
      roomItem.textContent = room;
      roomItem.onclick = () => joinRoom(room);
      roomList.appendChild(roomItem);
    });
  } else if (data.message) {
    console.log(data.message);
  } else if (data.error) {
    console.error(data.error);
  } else if (data.users) {
    updateRoomInfo(data.room, data.users);
  } else if (data.newmessage) {
    const chatList = document.getElementById('chat');
    const chatItem = document.createElement('li');
    chatItem.textContent = data.username + ": " + data.newmessage;
    chatList.appendChild(chatItem);
  } else if (data.request === 'login') {
    handleLoginResponse(data);
  }
};

function handleLoginResponse(data) {
  const errorMessage = data.message;

  if (errorMessage === 'Login successful') {
    hideLoginForms();
    console.log('Login Success!');
  } else {
    // Display an error message to the user
    const errorDisplay = document.getElementById('loginError');
    errorDisplay.textContent = errorMessage;
    console.error('Login failed:', errorMessage);
  }

}

function hideLoginForms() {
  const loginForms = document.querySelectorAll('.login-page .form');
  loginForms.forEach(form => form.style.display = 'none');

  const chatWebsite = document.querySelector('.chat-website');
  chatWebsite.style.display = 'block';

  const currentUser = document.getElementById('currentUser');
  currentUser.textContent = document.getElementById('usernameInput').value;
}

function setCredentials() {
  const usernameInput = document.getElementById('usernameLogin');
  const passwordInput = document.getElementById('passwordLogin');
  const username = usernameInput.value;
  const password = passwordInput.value;

  if (username && password) {
    const data = {
      request: 'login',
      username: username,
      password: password
    };
    socket.send(JSON.stringify(data));
  }
}

function setUsername() {
  const usernameInput = document.getElementById('usernameInput');
  const username = usernameInput.value;
  if (username) {
    const data = {
      username: username
    };
    socket.send(JSON.stringify(data));
    usernameInput.value = '';
  }
}

function getRooms() {
  socket.send(JSON.stringify({ request: 'getRooms' }));
}

function joinRoom(room) {
  socket.send(JSON.stringify({ request: 'joinRoom', room: room }));
}

function createRoom() {
  const roomName = prompt('Enter the new room name:');
  if (roomName) {
    socket.send(JSON.stringify({ request: 'createRoom', room: roomName }));
    socket.send(JSON.stringify({ request: 'getRooms' }));
  }
}

function sendMessage() {
  const chatInputElement = document.getElementById('chatInput');
  const chatmessage = chatInputElement.value;
  if (chatmessage) {
    const data = {
      chatmessage: chatmessage
    };
    socket.send(JSON.stringify(data));
    chatInputElement.value = '';
  }
}

function updateRoomInfo(room, users) {
  const roomTitle = document.getElementById('roomTitle');
  const onlineUsersList = document.getElementById('onlineUsers');

  roomTitle.textContent = `Room: ${room}`;
  onlineUsersList.innerHTML = '';
  users.forEach((user) => {
    const listItem = document.createElement('li');
    listItem.textContent = user;
    onlineUsersList.appendChild(listItem);
  });
}

function createAccount() {
  const usernameRegister = document.getElementById('usernameRegister').value;
  const passwordRegister = document.getElementById('passwordRegister').value;

  if (usernameRegister && passwordRegister) {
    const data = {
      request: 'createAccount',
      username: usernameRegister,
      password: passwordRegister,
    };
    socket.send(JSON.stringify(data));
  }
}
