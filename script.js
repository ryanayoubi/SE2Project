const socket = new WebSocket('ws://localhost:3000');

// these are the file locations of index.html and login.html
// make sure to change these to match their location on your computer before running
const createAccountPage = "file:///C:/Users/namdi/OneDrive/Desktop/CMPE-133/SE2Project-master/createAccount.html";
const chatPage = "file:///C:/Users/namdi/OneDrive/Desktop/CMPE-133/SE2Project-master/index.html";


// Send a request for available rooms when the page loads
socket.onopen = () => {
  socket.send(JSON.stringify({ request: 'getRooms' }));

  // this part runs when on the home page to get the login info
  let currentURL = document.location.href;
  if(currentURL != createAccountPage) {
    //console.log("You are on the User page");
    //setUserFromLogin();
  }else {
    //console.log("You are on the Account Creation page");
  }

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
  }
};

function setUsername() {
  
  const usernameInput = document.getElementById('usernameInput');
  const username = usernameInput.value;

  // gets the password to change the username linked to it
  //const password = passwordCheck();
  const passwordInput = document.getElementById('passwordInput');
  const password = passwordInput.value;

  //check for account
  let userInfo = localStorage.getItem(password);
  if(userInfo == null) {
    alert("Incorrect password! Please try again.");
    return userInfo;
  }
  localStorage.setItem(password, username);

  if (username) {
    const data = {
      username: username
    };
    socket.send(JSON.stringify(data));
    usernameInput.value = '';
    passwordInput.value = '';
  }

  // added to have the screen welcome the user
  const welcomeName = document.getElementById('currentUser');
  welcomeName.innerHTML = username;
}

//used to check password
function passwordCheck() {
  let password = prompt("Enter your password (or press enter if you don't have an account):");

  if(password == "") {
    alert("Please create an account.");
    document.location.href = createAccountPage;
    // to get out of the function
    return null;
  }

  let username = localStorage.getItem(password);
  let tries = 1;

  while(username == null) {
    password = prompt('Incorrect password, Please try again:');
    username = localStorage.getItem(password);
    tries += 1;
    if(tries > 3) {
      alert("Too many incorrect password tries. Please create a new account.");
      document.location.href = loginPage;

      // to get out of the function
      return null;
    }
  }

  
  return password;
}

//
function createAccount() {
  const usernameInput = document.getElementById('usernameInput');
  const username = usernameInput.value;
  const passwordInput = document.getElementById('passwordInput');
  const password = passwordInput.value;
  localStorage.setItem(password, username);
  document.location.href = chatPage;
  //setUserFromLogin();
}

// does not do what it is supposed to do
// deletes all in localStorage so it logs everyone out
// useful for clearing localStorage
function userLogout() {
  //localStorage.removeItem("username");
  localStorage.clear();
  document.location.href = loginPage;
}


// uses the username from getLoginData set the client's username
function setUserFromLogin() {
  const username = getLoginData();
  const welcomeName = document.getElementById('currentUser');
  welcomeName.innerHTML = username;
  if (username) {
    const data = {
      username: username
    };
    socket.send(JSON.stringify(data));
    usernameInput.value = '';
  }
}

// asks the user to enter in the password to retrieve the username from localStorage
function getLoginData() {
  let password = prompt("Enter your password (or press enter if you don't have an account):");

  if(password == "") {
    alert("Please create an account.");
    document.location.href = loginPage;
    // to get out of the function
    return null;
  }


  let username = localStorage.getItem(password);
  let tries = 1;

  while(username == null) {
    password = prompt('Incorrect password, Please try again:');
    username = localStorage.getItem(password);
    tries += 1;
    if(tries > 3) {
      alert("Too many incorrect password tries. Please create a new account.");
      document.location.href = loginPage;

      // to get out of the function
      return null;
    }
  }

  
  return username;
}


function getRooms(){
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

