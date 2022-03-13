const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");
const ROUND = require("./round");

class ROOM {
  constructor(options) {
    this.id = options.id;
    this.name = options.name;
    this.isPrivate = options.isPrivate || false;
    this.password = options.password || "";
    this.letters = options.letters || "";
    this.maxPlayers = options.maxPlayers || 8;
    this.users = [...options.users] || [];
    this.queue = [...options.users] || [];
    this.roundTime = options.roundTime || 180;
    this.wordTime = options.wordTime || 25;
    this.maxRounds = options.maxRounds || 3;
    this.points =
      {
        ...options.points,
      } || {};
    this.underscore_letters =
      {
        ...options.underscore_letters,
      } || {};
    //6 bit number (0 to 63) that stores the information of the power ups based on the id of the user
    this.powerUps = 
      {
        ...options.powerUps,
      } || {};
    //keeps track of the amount of times in a row that everyone guesses their drawing (uses id)
    this.artist_AllCorrectStreak = 
      {
        ...options.AllCorrectStreak,
      } || {};
    this.guessStreak = 
      {
        ...options.guessStreak,
      } || {};
    this.firstGuessStreak = 
      {
        ...options.firstGuessStreak,
      } || {};
    this.roundResults = 
      {
        ...options.roundResults,
      } || {};
    this.buttonStatus = 
      {
        ...options.buttonStatus,
      } || {};
    this.painter = null;
    this.created = true;
    this.round = null;
    this.numRounds = 0;
    this.TimeLeft = 0;
    this.numCorrect = 0;
    this.topPoints = 0;
    this.drawStatus = false;
    this.hintLockActivated = 0;
    this.hintLockActivatedUser = "";
    this.wordChoices = [];
    //this.lineSize = 5; //default line size
  }

  async getWord() {
    var fs = require('fs');
    var data = fs.readFileSync('WordList.txt','utf8')
    data = data.split("\n");
    var high = data.length;
    var num = Math.floor(Math.random() * (high - 0) + 0);
    var word = data[num].trim();
    return word;
  }

  async initRound() {
    let words = [
      await this.getWord(),
      await this.getWord(),
      await this.getWord(),
    ];
    this.wordChoices = words;
    this.setPainter();
    io.to(this.painter).emit("round_initialized", words);
    
    let time = this.wordTime;
    io.to(this.id).emit("countdown_painter", time);
    io.to(this.id).emit("get_maxRounds", this.maxRounds);
    io.to(this.id).emit("get_numRounds", Math.floor(this.numRounds / this.users.length) + 1);
    
    let interval = setInterval(() => {
      if (this.users.length > 1) {
        if (time <= 0) {
          //CHAT.sendServerMessage(
            //this.id,
            //`Painter didn't choose a word, skipping round...`
          //);
          //this.initRound();
          var num = Math.floor(Math.random() * (2 - 0) + 0);
          this.startRound(words[num])
          clearInterval(interval);
        } else if (this.round != null) {
          clearInterval(interval);
        }
        time--;
        if (time >= 0) io.to(this.id).emit("countdown_painter", time);
      }
    }, 1000);
  }

  countDown() {
    io.to(this.id).emit("countdown", this.roundTime);
    let interval = setInterval(() => {
      if (this.TimeLeft <= 0) {
        CHAT.sendServerMessage(
          this.id,
          `The word was: ${this.round.word}`
        );
        this.stopRound();
        clearInterval(interval);
      } else if (this.round == null) {
        clearInterval(interval);
      } else {
        if(this.TimeLeft == Math.floor(this.roundTime/2)) {
          for (let user of this.users) {
            if(this.hintLockActivated == 0){
              this.displayWordHint(user);
            }
            else{
              if(this.hintLockActivatedUser == user){
                this.displayWordHint(user);
              }
            }
          }
        }
        else if(this.TimeLeft == Math.floor(this.roundTime/4)) {
          if(this.letters.length > 3){
            for (let user of this.users) {
              if(this.hintLockActivated == 0){
                this.displayWordHint(user);
              }
              else{
                if(this.hintLockActivatedUser == user){
                  this.displayWordHint(user);
                }
              }
            }
          }
        }
        else if(this.TimeLeft == Math.floor(this.roundTime/8)) {
          if(this.letters.length > 6){
            for (let user of this.users) {
              if(this.hintLockActivated == 0){
                this.displayWordHint(user);
              }
              else{
                if(this.hintLockActivatedUser == user){
                  this.displayWordHint(user);
                }
              }
            }
          }
        }
        else if(this.TimeLeft == Math.floor(this.roundTime/16)) {
          if(this.letters.length > 9){
            for (let user of this.users) {
              if(this.hintLockActivated == 0){
                this.displayWordHint(user);
              }
              else{
                if(this.hintLockActivatedUser == user){
                  this.displayWordHint(user);
                }
              }
            }
          }
        }
        else if(this.TimeLeft == Math.floor(this.roundTime/32)) {
          for (let user of this.users) {
            if(this.hintLockActivated == 0){
              this.displayWordHint(user);
            }
            else{
              if(this.hintLockActivatedUser == user){
                this.displayWordHint(user);
              }
            }
          }
        }
        this.TimeLeft = this.TimeLeft - 1;
        io.to(this.id).emit("countdown", this.TimeLeft);
      }
    }, 1000);
  }

  startRound(word) {
    if (this.users.length > 1) {
      this.round = new ROUND(word);
      io.to(this.id).emit("get_maxRounds", this.maxRounds);
      io.to(this.id).emit("get_numRounds", Math.floor(this.numRounds / this.users.length) + 1);
      io.to(this.id).emit("round_started");
      io.to(this.painter).emit("receive_password", word);
      CHAT.sendServerMessage(this.id, `Round started!`);
      CHAT.sendCallbackID(this.painter, `The chosen word is: ${word}`);
      this.TimeLeft = this.roundTime;
      this.countDown();
      this.letters = word;
      this.drawStatus = false;

      var resStr = "";
      var space_index = word.indexOf(' ');
      var i;

      for (i = 0; i < word.length; i++) {
        if(i == 0) {
          resStr = resStr + "_";
        }
        else {
          if(i == space_index){
            resStr = resStr + "  ";
          }
          else {
            resStr = resStr + " _";
          }
        }
      }
      for (let user of this.users) {
        this.underscore_letters[user] = resStr;
        io.to(user).emit("receive_hint", this.underscore_letters[user]);
      }
    } else {
      CHAT.sendCallbackID(
        this.painter,
        `You need at least 2 players to start!`
      );
    }
  }

  stopRound() {
    this.round = null;

    if(this.TimeLeft >= Math.floor(this.roundTime/2)){
      var temp = this.powerUps[this.painter]%32;
      var valid = Math.floor(temp/16);
      if(valid == 0)
      {
        this.powerUps[this.painter] += 16;
      }
    }
    
    //If everyone guessed correctly
    if(this.numCorrect == this.users.length - 1){
      CHAT.sendServerMessage(
        this.id,
        `Everyone guessed the word: ${this.letters}`
      );
      this.artist_AllCorrectStreak[this.painter] += 1;
      //if the streak is 1
      if(this.artist_AllCorrectStreak[this.painter] == 1){
        //check if they already have this power up
        var valid = Math.floor(this.powerUps[this.painter]/32);
        if(valid == 0){
          //if they don't, assign the sixth bit by adding 32 (2^5 = 32)
          this.powerUps[this.painter] += 32;
        }
      }
      
      else if(this.artist_AllCorrectStreak[this.painter] == 3)
      {
        var temp = this.powerUps[this.painter]%32;
        temp = temp%16;
        var valid = Math.floor(temp/8);
        if(valid == 0){
          this.powerUps[this.painter] += 8;
        }
      }
    }
    else{
      //if they do not all guess correctly, the streak is over, so assign it 0
      this.artist_AllCorrectStreak[this.painter] = 0;
    }

    //artist gets half the points of first place plus an incentive for the more people guess
    var artist_points = parseInt(this.topPoints/2) + parseInt((this.numCorrect/(this.users.length-1)) * (this.topPoints/4));
    this.points[this.painter] += artist_points;
    this.updateUsers();

    //If we are in the last round
    if(this.numRounds >= (this.users.length*(this.maxRounds-1))){

      //check if they have the double points power up
      var temp = this.powerUps[this.painter]%16;
      var valid = Math.floor(temp/8);

      //if they do, double the points from this round
      if(valid == 1) 
      {
        this.points[this.painter] += artist_points;
        this.updateUsers();
      }
    }

    for(let user of this.users){
      //only look at guessers 
      if(user != this.painter){
        if(this.roundResults[user] == 0){
          this.guessStreak[user] = 0;
          this.firstGuessStreak[user] = 0;
        }
      }
      this.roundResults[user] = 0;
      io.to(user).emit("get_powerups", this.powerUps[user]);
      console.log(this.powerUps[user]);
    }
    
    
    this.clearBoard();
    io.to(this.id).emit("round_stopped");
    CHAT.sendServerMessage(this.id, `Round finished!`);
    io.to(this.id).emit("countdown", 0);

    this.numRounds++;
    this.numCorrect = 0;
    this.topPoints = 0;

    this.hintLockActivated = 0;
    this.hintLockActivatedUser = "";
  
    
    // Restart
    if (this.numRounds < (this.maxRounds*this.users.length)) {
      this.initRound();
    } else {
      io.to(this.id).emit("game_ended");
    }
    //else do something
  }

  clearBoard() {
    if (this.round != null) {
      this.round.clearLines();
    }
    io.to(this.id).emit("clear");
  }

  setPainter() {
    if (this.users.length == 0) return false;

    let newPainter;
    do {
      newPainter = this.queue.pop();
      this.queue.unshift(newPainter);
    } while (this.painter == newPainter);
    this.painter = newPainter;
    io.to(this.id).emit("painter_changed", newPainter);
    CHAT.sendCallbackID(this.painter, "You are the new painter!");
    return true;
  }

  getPainter() {
    for (let user of this.users) {
      if (user == this.painter) {
        return user;
      }
    }
    return false;
  }

  addUser({ id }) {
    this.users.push(id);
    if(this.numRounds > 0){
      this.numRounds += Math.floor(this.numRounds / (this.users.length-1));
      this.underscore_letters[id] = this.underscore_letters[this.users[0]];

      io.to(id).emit("receive_hint", this.underscore_letters[id]);
      io.to(this.id).emit("get_numRounds", Math.floor(this.numRounds / this.users.length) + 1);
      io.to(this.id).emit("get_maxRounds", this.maxRounds);
    }
    else{
      if(this.TimeLeft != 0){
        this.underscore_letters[id] = this.underscore_letters[this.users[0]];
        io.to(id).emit("get_numRounds", 1);
        io.to(this.id).emit("get_maxRounds", this.maxRounds);
        io.to(this.id).emit("receive_hint", this.underscore_letters[id]);
      }
    }
    this.points[id] = 0;
    this.powerUps[id] = 0;
    this.artist_AllCorrectStreak[id] = 0;
    this.guessStreak[id] = 0;
    this.firstGuessStreak[id] = 0;
    this.roundResults[id] = 0;
    this.buttonStatus[id] = 0;
    if(this.numRounds > 0){
      var person = this.queue.shift();
      this.queue.unshift(id);
      this.queue.unshift(person);
    }
    else{
      this.queue.unshift(id);
    }
    this.updateUsers();
  }

  removeUser({ id, name }) {
    this.users.splice(this.users.indexOf(id), 1);
    this.queue.splice(this.queue.indexOf(id), 1);

  if(this.numRounds > 0){
    this.numRounds -= Math.floor(this.numRounds / (this.users.length+1));
    io.to(this.id).emit("get_numRounds", Math.floor(this.numRounds / this.users.length) + 1);
    io.to(this.id).emit("get_maxRounds", this.maxRounds);
  }

    // If user who left was a painter, replace him.
    if (this.painter == id) {
      this.stopRound();
      CHAT.sendServerMessage(
        this.id,
        `${name} left the game, choosing another painter...`
      );
    }

    this.updateUsers();

    // Return if room is empty
    return this.users.length == 0 ? true : false;
  }

  givePoints({ id }, points = 500) {
    if(this.roundResults[id] == 0){
      //if this is the first person to guess
      if(this.numCorrect == 0){
        //store the points that go to first guesser in order to assign to artist at the end
        this.topPoints = parseInt(points*(this.TimeLeft/this.roundTime));
        this.firstGuessStreak[id] += 1;

        var temp = this.powerUps[id]%32;
        temp = temp%16;
        temp = temp%8;
        var valid = Math.floor(temp/4);
        if(valid == 0){
          this.powerUps[id] += 4;
        }

        //if user guesses first three times in row
        if(this.firstGuessStreak[id] == 3)
        {
          temp = temp%4;
          valid = Math.floor(temp/2);
          if(valid == 0){
            this.powerUps[id] += 2;
          }
        }
      }
      //if it is not the first person to guess -> need to reset firstGuessStreak
      else{
        this.firstGuessStreak[id] = 0;
      }
    

      //update score of guesser
      this.points[id] += parseInt(points*(this.TimeLeft/this.roundTime));
      this.guessStreak[id] += 1;

      //if user guesses three in a row
      if(this.guessStreak[id] == 3){
        var temp = this.powerUps[id]%32;
        temp = temp%16;
        temp = temp%8;
        temp = temp%4;
        valid = temp%2;
        if(valid == 0){
          this.powerUps[id] += 1;
        }
      }
      //this person guessed right, so roundResults should be 1 for them
      this.roundResults[id] = 1;
      this.numCorrect++;
      this.updateUsers();
    }
  }

  updateUsers() {
    io.to(this.id).emit("receive_users", this.getUsers());
  }


  getUsers() {
    let usrs = [];
    
    for (let user of this.users) {
      usrs.push({
        id: user,
        points: this.points[user] || 0,
        name: io.sockets.sockets.get(user).name || user,
      });
    }
    return usrs;
  }

  getNumGuessed(){
    return this.numCorrect;
  }

  changeButtonStatus(id){
    this.buttonStatus[id] = 1;
  }

  getButtonStatus(id){
    return this.buttonStatus[id];
  }

  getDrawStatus(){
    return this.drawStatus;
  }

  changeDrawStatus(status){
    this.drawStatus = status;
  }

  userGuessStatus(id) {
    return this.roundResults[id];
  }

  //Increase drawing pen size
  increaseDrawSize(){
    this.increaseLineSize();
  }

  //Decrease drawing pen size
  decreaseDrawSize(){
    this.decreaseLineSize();
  }

  useArtistPowerUp_1(id){
    var valid = Math.floor(this.powerUps[id]/32);
    if(valid == 1)
    {
      this.powerUps[id] -= 32;
      io.to(id).emit("get_powerups", this.powerUps[id]);

      this.TimeLeft = this.TimeLeft + 15;
      io.to(this.id).emit("countdown", this.TimeLeft);
      return 1;
    }
    else {
      return 0;
    }
  }

  //extra points
  useArtistPowerUp_2(id){
    var temp = this.powerUps[id]%32;
    var valid = Math.floor(temp/16);
    if(valid == 1)
    {
      for (let user of this.users) {
        this.displayWordHint(user);
      }
      this.powerUps[id] -= 16;
      io.to(id).emit("get_powerups", this.powerUps[id]);
      return 1;
    }
    else {
      return 0;
    }
  }

  useGuesserPowerUp_1(id) {
    var temp = this.powerUps[id]%32;
    temp = temp%16;
    temp = temp%8;
    var valid = Math.floor(temp/4);
    if(valid == 1)
    {
      this.displayWordHint(id);
      this.powerUps[id] -= 4;
      io.to(id).emit("get_powerups", this.powerUps[id]);
      return 1;
    }
    else {
      return 0;
    }
  }

 /*  useGuesserPowerUp_2(id) {
    var temp = this.powerUps[id]%32;
    temp = temp%16;
    temp = temp%8;
    var valid = Math.floor(temp/2);
    if(valid == 1)
    {
      var resStr = "";
      var space_index = this.letters.indexOf(' ');
      var i;

      for (i = 0; i < this.letters.length; i++) {
        if(i == 0) {
          resStr = resStr + "_";
        }
        else {
          if(i == space_index){
            resStr = resStr + "  ";
          }
          else {
            resStr = resStr + " _";
          }
        }
      }
      for (let user of this.users) {
        if(user != id){
          this.underscore_letters[user] = resStr;
          io.to(user).emit("receive_hint", this.underscore_letters[user]);
        }
      }
      this.hintLockActivated = 1;
      this.hintLockActivatedUser = id;
      this.powerUps[id] -= 2;
      io.to(id).emit("get_powerups", this.powerUps[id]);
      return 1;
    }
    else {
      return 0;
    }
  } */
  
  /* useGuesserPowerUp_3(id) {
    var temp = this.powerUps[id]%32;
    temp = temp%16;
    temp = temp%8;
    temp = temp%4;
    var valid = temp%2;
    if(valid == 1)
    {
      //extra points
      this.points[id] += 100;
      this.powerUps[id] -= 1;
      io.to(id).emit("get_powerups", this.powerUps[id]);
      return 1;
    }
    else {
      return 0;
    }
  } */

  displayWordHint(id){
    var index = Math.floor((Math.random() * (this.letters.length-1)) + 1);
    var space_index = this.letters.indexOf(' ');

    var done = 0;
    while(done == 0) {
      if(index != space_index) {
        if(index == 0) {
          if(this.underscore_letters[id].charAt(index) == '_') {
            var temp = this.letters.charAt(index) + this.underscore_letters[id].substring(index+1);
            this.underscore_letters[id] = temp;
            io.to(id).emit("receive_hint", this.underscore_letters[id]);
            done = 1;
          }
          else {
            index = Math.floor((Math.random() * (this.letters.length-1)) + 1);
          }
        }
        else {
          var new_index = index*2;
          if(this.underscore_letters[id].charAt(index) == '_') {
            var temp = this.underscore_letters[id].substring(0,new_index) + this.letters.charAt(index) + this.underscore_letters[id].substring(new_index+1);
            this.underscore_letters[id] = temp;
            io.to(id).emit("receive_hint", this.underscore_letters[id]);
            done = 1;
          }
          else {
            index = Math.floor((Math.random() * (this.letters.length-1)) + 1);
          }
        }
      }
      else {
        index = Math.floor((Math.random() * (this.letters.length-1)) + 1);
      }
    }
  }
}

module.exports = ROOM;
