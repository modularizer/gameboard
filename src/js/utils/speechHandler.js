export class SpeechHandler {
  constructor(synthesisParams = {}) {
    this.synthesisParams = {
      pitch: synthesisParams.pitch || 1,
      rate: synthesisParams.rate || 3,
      volume: synthesisParams.volume || 1,
      voice: synthesisParams.voice || null, // You can assign a specific voice here
      lang: synthesisParams.lang || 'en-US'
    };
    this.updateTargetText = this.updateTargetText.bind(this);
    this.speakWords = this.speakWords.bind(this);
    this.speakWord = this.speakWord.bind(this);

    this.targetWords = [];
    this.currentWordIndex = 0;
    this.speaking = false;
  }

  // Method to update the target text externally
  updateTargetText(newText) {
    this.targetWords = newText.split(' ');
    console.log(this.currentWordIndex, this.targetWords.length, this.speaking)
    if (this.speaking){return}
    this.speakWords();
    }

  speakWords(){
    if (this.currentWordIndex < this.targetWords.length) {
        this.speaking = true;
//        console.log("Speaking word", this.targetWords[this.currentWordIndex], this.currentWordIndex);
      this.speakWord(this.targetWords[this.currentWordIndex]).then((() => {
          this.currentWordIndex++;
          console.log("Finished speaking word", this.currentWordIndex)
          if (this.currentWordIndex < this.targetWords.length) {
            console.log("next")
            this.speakWords();
          } else {
            console.log("done")
            this.targetWords = [];
            this.currentWordIndex = 0;
            this.speaking = false;
          }
        }).bind(this));
    }
  }


  speakWord(word) {
      return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.pitch = this.synthesisParams.pitch;
        utterance.rate = this.synthesisParams.rate;
        utterance.volume = this.synthesisParams.volume;
        utterance.voice = this.synthesisParams.voice;
        utterance.lang = this.synthesisParams.lang;
        console.log("Speaking word", utterance);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);

        utterance.onend = () => {
            console.log("Finished speaking word", utterance.text)
            resolve();
        }
        utterance.onerror = ()=>{
            console.log("Error speaking word", utterance.text)
            reject();
        };
      })
  }


}


