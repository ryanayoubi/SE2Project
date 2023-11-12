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
  }
};

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
