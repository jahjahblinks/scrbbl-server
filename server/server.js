const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, { 
  cors: {
    origin: '*',
    methods: 'GET, POST'
  }
});
const ROOMS = require("./rooms");
const CHAT = require("./chat");
const e = require("express");

global.io = io;
global.CHAT = CHAT;

var clients = [];

io.on("connection", socket => {
  // Connect
  console.log(`User connected: ${socket.id}`);
  socket.name = socket.id;
  clients.push(socket);

  // Disconnect
  socket.on("disconnect", () => {
    ROOMS.leaveRoom(socket);
    console.log(`User disconnected: ${socket.id}`);
    clients.splice(clients.indexOf(socket), 1);
  });

  // Set socket's name
  socket.on("setName", name => {
    socket.name = name;
    let room = ROOMS.getSocketRoom(socket);
    if (room)
      io.to(room.id).emit('receive_users', room.getUsers());
  });

  // Creating the room
  socket.on("create_room", options => {
    ROOMS.createRoom(socket, options);
  });

  // Get Room
  socket.on("get_room", id => {
    socket.emit("receive_room", ROOMS.getRoom(id));
  });

  // Joining Room
  socket.on("join_room", data => {
    if (ROOMS.joinRoom(socket, data.id, data.password)) {
      CHAT.sendServerMessage(data.id, `${socket.name} has joined the game!`);
      let room = ROOMS.getRoom(data.id);
      if (room.round != null) {
        socket.emit('getPainting', ROOMS.getRoom(data.id).round.lineHistory);
      }
    }
  });

  // Leaving Room
  socket.on("leave_room", () => {
    ROOMS.leaveRoom(socket);
  });

  // Getting Rooms
  socket.on("get_rooms", () => {
    socket.emit("receive_rooms", ROOMS.getRooms());
  });

  socket.on("send_message", msg => {
    other = socket;
    console.log(msg)
      clients.forEach(function (cl) {
        if (socket.name==(cl.name+"7")){
          other = cl;
          }
    });
    let room = ROOMS.getSocketRoom(other);
    if (room) {

      if (room.round != null && other.id != room.painter) {
        // Checking if the message is correct
        if (room.round.check(msg)) {
          if(room.userGuessStatus(other.id) == 0){
            ROOMS.givePoints(other);
            CHAT.sendCallback(other, {
              self: `Congratulations! You've guessed the word!`
            });
            CHAT.sendServerMessage(room.id, `${other.name} guessed the word`);
            if(room.getNumGuessed() == (room.getUsers().length - 1))
            {
              room.stopRound();
            }
          }
          else{
            CHAT.sendCallback(other, {
              self: `You cannot guess more than once`
            });
          }
        } else {
          CHAT.sendMessage(room.id, {
            msg,
            sender: other.name
          });
          if (room.round.isClose(msg)) {
            CHAT.sendCallback(other, {
              self: `You're so close!`
            });
          }
        }
      }
    }
  });

  socket.on("paint", (coords) => {
    other = socket;
    clients.forEach(function (cl) {
      if (socket.name==(cl.name+"9")){
        other = cl;
        }
    });
    let room = ROOMS.getSocketRoom(other);
    if (room.painter == other.id && room.round != null) {
      if(room.getButtonStatus(other.id) == 1){
        if(room.getDrawStatus() == true) {
          socket.to(room.id).emit('paint', coords);
          room.round.addLine(coords);
        }
      }
      else{
        socket.to(room.id).emit('paint', coords);
        room.round.addLine(coords);
      }
    }
  });

  socket.on("clear", () => {
    other = socket;
    clients.forEach(function (cl) {
      if (socket.name==(cl.name+"7")){
        other = cl;
        }
    });
    let room = ROOMS.getSocketRoom(other);
    if (room.painter == other.id && room.round != null) {
      room.clearBoard();
    }
  });

  socket.on("word_chosen", word => {
    let room = ROOMS.getSocketRoom(socket);
    if (room.painter == socket.id && room.round == null) {
      room.startRound(word);
    }
  });

  socket.on("button_detected", draw => {
    other = socket;
    clients.forEach(function (cl){
      if(socket.name == (cl.name+"8")) {
        other = cl;
      }
    });
    let room = ROOMS.getSocketRoom(other);
    if(draw == "Drawing!"){
      room.changeDrawStatus(true);
    }
    else{
      room.changeDrawStatus(false);
    }
  });

  socket.on("button_status", draw => {
    other = socket;
    clients.forEach(function (cl){
      if(socket.name == (cl.name+"8")) {
        other = cl;
      }
    });
    let room = ROOMS.getSocketRoom(other);
    if(draw == "Yes"){
      room.changeButtonStatus(other.id);
    }
  });

  socket.on("gesture_detected", gesture => {
    other = socket;
    clients.forEach(function (cl){
      if(socket.name == (cl.name+"8")) {
        other = cl;
      }
    });

    let room = ROOMS.getSocketRoom(other);
    if(room.round != null) {
      switch(gesture) {
        case "Upward_Lift":
          if(room.painter == other.id) {
            if(room.useArtistPowerUp_1(other.id) == 1){
              CHAT.sendCallback(other, {
                self: `Extra time successfully added!`
              });
            }
            else{
              CHAT.sendCallback(other, {
                self: `You don't have this power up...`
              });
            }
          }
          else {
            if(room.useGuesserPowerUp_1(other.id) == 1){
              CHAT.sendCallback(other, {
                self: `Extra hint successfully added!`
              });
            }
            else{
              CHAT.sendCallback(other, {
                self: `You don't have this power up...`
              });
            }
          }
          break;
        case "Clockwise_Twist":
          if(room.painter == other.id) {
            if(room.useArtistPowerUp_2(other.id) == 1){
              CHAT.sendCallback(other, {
                self: `Revealed Hint to the Guessers!`
              });
            }
            else{
              CHAT.sendCallback(other, {
                self: `You don't have this power up...`
              });
            }
          }
          else {
            if(room.useGuesserPowerUp_2(other.id) == 1){
              CHAT.sendCallback(other, {
                self: `Successfully removed hints for everyone!`
              });
            }
            else{
              CHAT.sendCallback(other, {
                self: `You don't have this power up...`
              });
            }
          }
          break;
        case "Vertical_Chop":
          if(room.painter == other.id) {
            CHAT.sendCallback(other, {
              self: `Gesture not available for an artist...`
            });
          }
          else {
            if(room.useGuesserPowerUp_3(other.id) == 1){
              CHAT.sendCallback(other, {
                self: `Extra 💯 points will be added to your score!`
              });
            }
            else{
              CHAT.sendCallback(other, {
                self: `You don't have this power up...`
              });
            }
          }
          break;
        default:
          console.log("Invalid Gesture");
      }
    }
    else {
      console.log("Game has not started yet...");
    }
  });
});

let port = process.env.PORT || 5050;

http.listen(port, () => {
  console.log(`Server is listening on port: ${port}`);
});

process.on("exit", function (code) {
  http.close();
  console.log("Server exit", code);
});