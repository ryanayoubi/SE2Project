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
  }
};

//login-page functions start

function loginOp(event) {
  event.preventDefault(); // Prevents the default behavior
  const usernameInput = document.getElementById('usernameLogin');
  const username = usernameInput.value;
  const passwordInput = document.getElementById('passwordLogin');
  const password = passwordInput.value;

  checkLogin(username, password);
  removeLoginPage();
  usernameInput.value = '';
  passwordInput.value = '';
}

function registerOp() {
  const usernameInput = document.getElementById('usernameRegister').value;
  const passwordInput = document.getElementById('passwordRegister').value;
  const languageInput = document.getElementById('languageRegister').value;

  console.log('Username:', usernameInput);
  console.log('Password:', passwordInput);
  console.log('Language:', languageInput);

  createUser(usernameInput, passwordInput, languageInput, db)
    .then(() => {
      console.log('User created successfully!');
    })
    .catch((error) => {
      console.error('Error creating user:', error.message);
    });
}


function createUser(username, password, language, db) {
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

function removeLoginPage() {
  var loginPage = document.getElementsByClassName('login-page')[0];
  loginPage.style.display = 'none';
}

function checkLogin(username, password) {
  // Send login request to the server
  const data = { username, password };
  socket.send(JSON.stringify(data));
}

//when the buttons are clicked
document.getElementById('pageRegister').addEventListener('click', registerOp);
document.getElementById('pageLogin').addEventListener('click', loginOp);

//login-page functions end

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('chatApp.db');

// Create users table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    language TEXT
  )
`);



function setUsername() {
  
  const usernameInput = document.getElementById('usernameInput');
  const username = usernameInput.value;

  const passwordInput = document.getElementById('passwordInput');
  const password = passwordInput.value;

  const welcomeName = document.getElementById('currentUser');
  const currentName = welcomeName.innerText;

  //check for account
  let userInfo = localStorage.getItem(currentName);

  const storedObject = JSON.parse(userInfo);

  // Accessing properties of the retrieved object
  const userUsername = storedObject.username;
  const userPassword = storedObject.password;
  const userLanguage = storedObject.language;

  if(userPassword != password) {
    alert("Incorrect password! Please try again.");
    return userInfo;
  }

  const userObject = { username, password, language:userLanguage };
  // Convert the object to a JSON string
  const objectString = JSON.stringify(userObject);
  // Store the JSON string in localStorage with a specific key
  localStorage.setItem(username, objectString);
  localStorage.removeItem(userUsername);

  if (username) {
    const data = {
      username: username
    };
    socket.send(JSON.stringify(data));
    usernameInput.value = '';
    passwordInput.value = '';
  }

  // added to have the screen welcome the user
  welcomeName.innerHTML = username;
}



// does not do what it is supposed to do
// deletes all in localStorage so it logs everyone out
// useful for clearing localStorage
function userLogout() {
  //localStorage.removeItem("username");
  localStorage.clear();
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

