const socket = new WebSocket('ws://localhost:3000');

// Send a request for available rooms when the page loads
socket.onopen = () => {
  socket.send(JSON.stringify({ request: 'getRooms' }));
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
    chatItem.textContent = data.username+": "+data.newmessage;
    chatList.appendChild(chatItem);
  } else if (data.createMessage) {
    // handle create account messages
    console.log(data.createMessage);
  } else if (data.loginSuccess) {
    // successful login
    console.log(data.loginMessage);
    removeLoginPage(event);
    const setID = document.getElementById('accountID');
    setID.innerText = data.accountID;
  } else if (!data.loginSuccess) {
    // incorrect login
    console.error(data.loginMessage);
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

  roomTitle.textContent = `Room: ${room}`;
  onlineUsersList.innerHTML = '';
  users.forEach((user) => {
    const listItem = document.createElement('li');
    listItem.textContent = user;
    onlineUsersList.appendChild(listItem);
  });
}

function createAccount(event) {
  event.preventDefault();
  const usernameRegister = document.getElementById('usernameRegister').value;
  const passwordRegister = document.getElementById('passwordRegister').value;

  if (usernameRegister && passwordRegister) {
    const dataCreate = {
      request: 'createAccount',
      username: usernameRegister,
      password: passwordRegister,
    };

    const dataLogin = {
      request: 'accountLogin',
      username: usernameRegister,
      password: passwordRegister,
    };

    const setUsername = {
      username: usernameRegister
    };
    
    socket.send(JSON.stringify(dataCreate));

    // send login request using the same info
    socket.send(JSON.stringify(dataLogin));

    //set username for Map
    socket.send(JSON.stringify(setUsername));
    resetLoginPage();
  }
}

// new code 

function accountLogin(event) {
  event.preventDefault();
  const usernameLogin = document.getElementById('usernameLogin').value;
  const passwordLogin = document.getElementById('passwordLogin').value;

  if (usernameLogin && passwordLogin) {
    const data = {
      request: 'accountLogin',
      username: usernameLogin,
      password: passwordLogin,
    };

    const setUsername = {
      username: usernameLogin
    };

    // request to check for account
    socket.send(JSON.stringify(data));
    //set username for Map
    socket.send(JSON.stringify(setUsername));
    resetLoginPage();
  }
}

function removeLoginPage(event) {
  var loginPage = document.getElementsByClassName('login-page')[0];
  if (loginPage) {
    loginPage.style.display = 'none';
  }
}

function getLoginForm() {
  var loginPage = document.getElementsByClassName('login-page')[0];
  loginPage.style.display = "flex";
}

function cancelLogin(event) {
  event.preventDefault(); // Prevents the default behavior
  resetLoginPage();

  removeLoginPage(event);
}

function resetLoginPage() {
  const usernameRegister = document.getElementById('usernameRegister');
  const passwordRegister = document.getElementById('passwordRegister');
  let languageInput = document.getElementById('languageRegister');

  const usernameLogin = document.getElementById('usernameLogin');;
  const passwordLogin = document.getElementById('passwordLogin');

  usernameRegister.value = '';
  passwordRegister.value = '';
  languageInput.selectedIndex = "0";
  usernameLogin.value = '';
  passwordLogin.value = '';
}

// edit form code
function cancelEditing(event) {
  event.preventDefault();
  removeEditPage();
}

function removeEditPage() {
  var loginPage = document.getElementsByClassName('edit-page')[0];
  loginPage.style.display = "none";
}

function getEditForm() {
  //get current user
  const accountID = document.getElementById('accountID');
  const currentID = accountID.innerText;

  if (currentID != "") {
    var editPage = document.getElementsByClassName('edit-page')[0];
    editPage.style.display = "flex";

    //fillEditForm(currentName);
  }
}

// delete account from database
function deleteAccountAlert(event) {
  event.preventDefault();
  let text = "Please confirm the deletion of your account.";
  if (confirm(text) == true) {
    const accountID = document.getElementById('accountID');
    currentID = accountID.innerText;


    const data = {
      request: 'deleteAccount',
      dataID: currentID
    };

    // set delete request
    socket.send(JSON.stringify(data));

    removeEditPage();
    location.reload();
  }
}

document.getElementById('removeLoginPage').addEventListener('click', cancelLogin);
document.getElementById('removeEditPage').addEventListener('click', cancelEditing);
document.getElementById('deleteAccount').addEventListener('click', deleteAccountAlert);