export class WebRTCAudioChannel {
  constructor(rtcClient, users) {
    this.users = users
    this.handleIncomingAudioData = this.handleIncomingAudioData.bind(this);
    this.mute = this.mute.bind(this);
    this.unmute = this.unmute.bind(this);
    this.startStreaming = this.startStreaming.bind(this);
    this.stopStreaming = this.stopStreaming.bind(this);
    this.send = this.send.bind(this);


    this.handler = this.handleIncomingAudioData;
    this.handleIncomingAudioData.raw = true;

    this.sourceNode = null;
    this.processorNode = null;
    this.streaming = false;

    this.muted = true;
    this.playing = false;

    this.rtcClient = rtcClient;

    // Inside your constructor:
    this.audioContext = new AudioContext();
    this.audioContext.audioWorklet.addModule('./js/utils/audio-processor.js').then(() => {
      // the processor is now available
    });

    // Add a listener to enable the context after a user gesture
      document.body.addEventListener('click', () => {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      });
  }
  set rtcClient(rtcClient){
    this._rtcClient = rtcClient;
    if (rtcClient && rtcClient.handlers){
        rtcClient.handlers.audio = this.handler;
        rtcClient.startStreaming = this.startStreaming.bind(this);
        rtcClient.stopStreaming = this.stopStreaming.bind(this);
        rtcClient.mute = this.mute.bind(this);
        rtcClient.unmute = this.unmute.bind(this);
    }
  }
  get rtcClient(){
    return this._rtcClient;
  }

   setupAudioProcessing(stream) {
    console.log("Setting up audio processing", stream);
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.processorNode = this.audioContext.createScriptProcessor(1024, 1, 1);

    this.processorNode.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      const audioData = new Float32Array(inputBuffer);
      this.send(audioData.buffer);
    };

    this.sourceNode.connect(this.processorNode);
    // Note: not connecting processorNode to destination here
  }


  send(audioDataBuffer){
    this.rtcClient.send(audioDataBuffer, "audio", this.users);
  }

  handleIncomingAudioData(data, sender) {
    if (this.muted) return;
    const audioData = new Float32Array(data);
    // Process and play the audioData through the speakers
    const audioBuffer = this.audioContext.createBuffer(1, audioData.length, this.audioContext.sampleRate);
    audioBuffer.copyToChannel(audioData, 0);
    const audioSource = this.audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(this.audioContext.destination);
    audioSource.start();
  }

  // Method to start streaming
  startStreaming() {
    if (this.streaming) return; // Do not start if already streaming
    console.log("Starting streaming");
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      console.log("Setting up audio processing", stream);
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.processorNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      this.processorNode.port.onmessage = (event) => {
        const audioData = new Float32Array(event.data);
        this.send(audioData.buffer);
      };

      this.sourceNode.connect(this.processorNode);
//      this.processorNode.connect(this.audioContext.destination);

      // This line will directly play the audio from the microphone for testing
      // this.sourceNode.connect(this.audioContext.destination);

      this.mediaStream = stream; // Save the stream for later
      this.streaming = true;
    })
    .catch(error => console.error('Error accessing microphone:', error));
}



  // Method to stop streaming
  stopStreaming() {
    if (!this.streaming) return; // Do not stop if not streaming
//    this.processorNode.disconnect(this.audioContext.destination);
    this.sourceNode.disconnect();

    // Stop the media stream tracks
    this.mediaStream.getTracks().forEach(track => track.stop());

    this.streaming = false;
  }
  mute(){
    this.muted = true;
  }
  unmute(){
    this.muted = false;
  }
}

