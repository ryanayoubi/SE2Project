const socket = new WebSocket('ws://localhost:3000');

socket.onopen = () => {
  // Send a request for online users when the WebSocket connection is established
  socket.send(JSON.stringify({ request: 'getUsers' }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // Check if the response is for online users
  if (data.users) {
    const onlineUsersList = document.getElementById('onlineUsers');
    onlineUsersList.innerHTML = '';
    data.users.forEach((user) => {
      const listItem = document.createElement('li');
      listItem.textContent = user;
      onlineUsersList.appendChild(listItem);
    });
  } else if (data.error) {
    // Handle errors, if any
    console.error(data.error);
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

