class WebRTCAudioChannel {
  constructor(rtcConnection) {
    this.rtcConnection = rtcConnection;
    rtcConnection.handlers.audio = this.handleIncomingAudioData.bind(this);

    this.audioContext = new AudioContext();
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => this.setupAudioProcessing(stream))
      .catch(error => console.error('Error accessing microphone:', error));
  }

  setupAudioProcessing(stream) {
    const sourceNode = this.audioContext.createMediaStreamSource(stream);
    const processorNode = this.audioContext.createScriptProcessor(1024, 1, 1);

    processorNode.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      const audioData = new Float32Array(inputBuffer);
      this.send(audioData.buffer);
    };

    sourceNode.connect(processorNode);
    processorNode.connect(this.audioContext.destination);
  }
  send(audioDataBuffer){
    this.rtcConnection.send("audio", audioDataBuffer);
  }

  handleIncomingAudioData(event, sender) {
    const audioData = new Float32Array(event.data);
    // Process and play the audioData through the speakers
    // You may want to feed this into an AudioBuffer and connect it to the audioContext.destination
  }
}

