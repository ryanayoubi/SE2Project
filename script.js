const socket = new WebSocket('ws://localhost:3000');

// Send a request for available rooms when the page loads
socket.onopen = () => {
  socket.send(JSON.stringify({ request: 'getRooms' }));
  openModal();
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // Check if the response is for available rooms
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
    // Handle success messages
    console.log(data.message);
  } else if (data.error) {
    // Handle error messages
    console.error(data.error);
  } else if (data.users) {
    // Update the room title and online users when receiving user data for a specific room
    updateRoomInfo(data.room, data.users);
  } else if (data.newmessage) {
      const chatList = document.getElementById('chat');
      const chatItem = document.createElement('li');
      if(data.tmessage!=null){
        chatItem.textContent = data.username+": "+data.newmessage+" ("+data.tmessage+")";
      }else{
        chatItem.textContent = data.username+": "+data.newmessage;
      }
      chatList.appendChild(chatItem);
  } else if (data.gameState){
    console.log(data.gameState);
    socket.gameState = data.gameState;
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');

    // Clear the canvas
    ctx.fillStyle = "green";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Draw dealer's hand
    drawCards(ctx, data.gameState.dealer.hand, 10, 20, "Dealer");

    // Draw players' hands
    data.gameState.players.forEach((player, index) => {
      drawCards(ctx, player.hand, 10, 105 + index * 85,player.player);
    }); 

  } else if (data.balance){
    const balance = document.getElementById("balance");
    balance.innerText = "Balance: "+data.balance;
  } else{
    console.log(data);
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
    socket.username = username;
    usernameInput.value = '';
  }
}

function getRooms(){
  socket.send(JSON.stringify({ request: 'getRooms' }));
}

function joinRoom(room) {
  socket.send(JSON.stringify({ request: 'joinRoom', room: room }));
  const chatList = document.getElementById('chat');
  while(chatList.firstChild){
    chatList.removeChild(chatList.firstChild);
  }
}

function createRoom() {
  const roomName = prompt('Enter the new room name:');
  if (roomName) {
    socket.send(JSON.stringify({ request: 'createRoom', room: roomName }));
    // Request the updated list of rooms after creating a new room
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
  const chatInput = document.getElementsByClassName('chat-input')[0];
  chatInput.removeAttribute('hidden');
  const rightBar = document.getElementsByClassName('rightbar')[0];
  rightBar.removeAttribute('hidden');
  const game = document.getElementsByClassName('game')[0];
  game.removeAttribute('hidden');
  roomTitle.textContent = `Room: ${room}`;
  onlineUsersList.innerHTML = '';
  users.forEach((user) => {
    const listItem = document.createElement('li');
    listItem.textContent = user;
    onlineUsersList.appendChild(listItem);
  });
}

function openModal() {
  document.getElementById('login-modal').style.display = 'block';
}

function closeModal() {
  document.getElementById('login-modal').style.display = 'none';
}

function login(){
  const usernameInput = document.getElementById('username');
  const username = usernameInput.value;
  const passwordInput = document.getElementById('password');
  const password = passwordInput.value;
  if (username) {
    const data = {
      username: username,
      password: password
    };
    socket.send(JSON.stringify(data));
    socket.username = username;
    usernameInput.value = '';
  }
  closeModal();
}

function logout() {
  socket.send(JSON.stringify({ request: 'logout' }));
  openModal();
}

function createAccount(){
  const usernameInput = document.getElementById('new-username');
  const username = usernameInput.value;
  const passwordInput = document.getElementById('new-password');
  const password = passwordInput.value;
  if (username) {
    const data = {
      username: username,
      password: password
    };
    socket.send(JSON.stringify(data));
    socket.username = username;
    usernameInput.value = '';
  }
  closeModal();
}

function hit(){
  socket.send(JSON.stringify({action: "hit"}))
}

function stand(){
  socket.send(JSON.stringify({action: "stand"}))
}

function drawCards(ctx, cards, x, y, username) {
  const cardWidth = 45;
  const cardHeight = 65;
  ctx.font = "14px Arial";
  ctx.fillStyle = "black"
  ctx.fillText(username, x, y - 5);
  ctx.fillStyle = "green"
  cards.forEach((card, index) => {
    const cardImage = new Image();
    cardImage.src = `./images/${card}.png`; // Replace with the actual path to card images
    cardImage.onload = () => {
      ctx.drawImage(cardImage, x + index * (cardWidth + 5), y, cardWidth, cardHeight);
    };
  });
}
