class ROUND {
  constructor(word) {
    this.word = word;
    this.simplified = this.splitWord(this.simplifyWord(word))
    this.clock = null;
    this.lineHistory = [];
    this.lineSizeHistory = []; //attempting to track cvx.lineWidth 
    this.currentLineSize = 5;
  }

  check(word) {
    let prompted = this.splitWord(this.simplifyWord(word));
    if (this.simplified.length != prompted.length) return false;

    let flag = true;

    for (let w of prompted) {
      if (!this.simplified.includes(w)) {
        flag = false;
      }
    }

    return flag;
  }

  isClose(word) {
    if (word.length < 3) {
      return false;
    }
    let prompted = this.splitWord(this.simplifyWord(word));

    let counter = 0;

    for (let p of prompted) {
      for (let w of this.simplified) {
        if (w.includes(p) && w.length > 3 && p.length > 3) {
          counter++;
        }
      }
    }

    return counter >= this.simplified.length / 2.5;
  }

  simplifyWord(word) {
    return word
      .toLowerCase()
      .replace(/\s{2,}/g, " ")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  splitWord(word) {
    return word.split(" ").filter((el) => el.length);
  }

  addLine(line) {
    this.lineHistory.push(line);
  }

  //line size stuff
  addLineSize(size) {
    this.lineSizeHistory.push(size);
  }

  clearLines() {
    this.lineHistory = [];
  }

  //line size stuff
  clearLineSizes() {
    this.lineSizeHistory = [];
  }


}

module.exports = ROUND;
