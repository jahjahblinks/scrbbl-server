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
        /* 
        socket.emit('getPainting', {lineHistory: ROOMS.getRoom(data.id).round.lineHistory, lineSizeHistory: ROOMS.getRoom(data.id).round.lineSizeHistory);
        */
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
  
  socket.on("send_message_tutorial", msg => {
    other = socket;
    console.log(msg)
      clients.forEach(function (cl) {
        if (socket.name==(cl.name+"7")){
          other = cl;
          }
    });
    
    console.log("sending message for tutorial");
    let room = ROOMS.getSocketRoom(other);
    if (room) {

      if (true) {
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
      //socket.to(room.id).emit('reset_pen_size');
    }
  });

  socket.on("clear_tutorial", () => {
    other = socket;
    clients.forEach(function (cl) {
      if (socket.name==(cl.name+"7")){
        other = cl;
        }
    });
    console.log("clear board tutorial");
    let room = ROOMS.getSocketRoom(other);
    if (room.painter == other.id) {
      room.clearBoard();
      //socket.to(room.id).emit('reset_pen_size');
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
        case "Right_Tilt": //Right Gesture
          if(room.painter == other.id) {
            socket.to(room.id).emit('increase_pen_size');  
            CHAT.sendCallback(other, {
              self: 'Brush size increased.'
            });
          }
          else {
            if(room.useGuesserPowerUp_3(other.id) == 1){
              CHAT.sendCallback(other, {
                self: `Extra 100 points will be added to your score!`
              });
            }
            else{
              CHAT.sendCallback(other, {
                self: `You don't have this power up...`
              });
            }
          }
          break;

          case "Left_Tilt": //Left Gesture
          if(room.painter == other.id) {
            socket.to(room.id).emit('decrease_pen_size');
            CHAT.sendCallback(other, {
              self: 'Brush size decreased.'
            });
          }
          else {
            if(room.useGuesserPowerUp_3(other.id) == 1){
              CHAT.sendCallback(other, {
                self: `Extra 100 points will be added to your score!`
              });
            }
            else{
              CHAT.sendCallback(other, {
                self: `You don't have this power up...`
              });
            }
          }
          break;

          case "Forward_Tilt": //Forward Gesture
          if(room.painter == other.id) {
            
          }
          else {
            if(room.useGuesserPowerUp_1(other.id) == 1){
              CHAT.sendCallback(other, {
                self: `Extra word hint provided!`
              });
            }
            else{
              CHAT.sendCallback(other, {
                self: `You don't have this power up...`
              });
            }
          }
          break;

          case "Backward_Tilt": //Backward Gesture
          if(room.painter == other.id) {
           
          }
          else {
            socket.to(room.id).emit('start_speech');
          }
          break;

          case "Idle": //Idle Gesture
          //We just chillin.
          break;

          default:
          console.log("Invalid Gesture");
          break;
      }
    }
    else if(room.round == null) {
      switch(gesture) {
          case "Forward_Tilt":
            if(room.painter == other.id) {
              room.startRound(room.wordChoices[0]);
              }
              break;
          case "Backward_Tilt":
            if(room.painter == other.id) {
              room.startRound(room.wordChoices[2]);
              }
              break;
          case "Left_Tilt":
            if(room.painter == other.id) {
              room.startRound(room.wordChoices[1]);
              }
            break;
          case "Right_Tilt":
            if(room.painter == other.id) {
              room.startRound(room.wordChoices[1]);
              }
          break;
          case "Idle":
          //We just chillin.
          break;
        default:
          console.log("Invalid Gesture");
          break;
      }
    }
    else {
      console.log("Game has not started yet...");
    }
  });

  /* IDK IF THIS WORKS
  socket.on("update_brush_size", size => {
    other = socket;
    clients.forEach(function (cl){
      if(socket.name == (cl.name+"8")) {
        other = cl;
      }
    });

    CHAT.sendCallback(other, {
      self: `Brush size set to` + toString(size)
    });
  });
*/
  socket.on("hand_coordinates", coords => {
    other = socket;
    clients.forEach(function (cl){
      if(socket.name == (cl.name+"8")) {
        other = cl;
      }
    });
    let obj = {x : coords[0], y : coords[1]};
    let room = ROOMS.getSocketRoom(other);
    if(room.round != null && other.id == room.painter) {
      console.log(inputCoords);
      CHAT.sendCallback(other, {
        self: coords
      });
    }
    else {
      console.log("oop hands should not be getting tracked");
      CHAT.sendCallback(other, {
        self: "either round hasn't started or you aren't the drawer"
      });
    }
    if (room.painter == other.id && room.round != null) {
      if(room.getButtonStatus(other.id) == 1){
        if(room.getDrawStatus() == true) {
          socket.to(room.id).emit('handCoords', obj);
        }
      }
      else{
        socket.to(room.id).emit('handCoords', obj);
      }
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
