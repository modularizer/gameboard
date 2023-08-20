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
    this.audioContext = new AudioContext({sampleRate: this.config.sampleRate});
    this.audioContext.audioWorklet.addModule('./src/js/utils/audio-processor.js').then(() => {
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

  config = {
       audio: {
        // Specify other constraints as needed
        sampleSize: 16, // bits per sample
        channelCount: 1, // stereo
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        latency: 0, // optimum latency
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true,
        bitrate: 8000 * 16,
      },
      sampleRate: 8000, // Sample rate in Hz, common values are 44100 or 48000 Hz
      freq: 800, // Frequency for bandpass filter, commonly between 300 to 3400 Hz for voice
      q: 1, // Quality factor for bandpass filter, ranges from 0.001 to 100; lower values less resonant
      threshold: -40, // Compressor threshold in dB, typical range from -100 to 0 dB; sets level where compression begins
      knee: 10, // Compressor knee in dB, typical range from 0 to 40 dB; higher values result in a softer knee and smoother transition
      ratio: 5, // Compression ratio, typical range from 1 (no compression) to 20 (hard compression); higher values reduce dynamic range more aggressively
      attack: 0.0001, // Attack time in seconds, typical range from 0.0001 to 1 s; sets how quickly compression begins once threshold is reached
      release: 0.1, // Release time in seconds, typical range from 0.01 to 1 s; sets how quickly compression stops after signal drops below threshold
      delay: 1*(localStorage.getItem("delay") || 0) // Delay in seconds, typically between 0 to whatever latency is acceptable; represents a simple latency delay, often used to align signals
    }


  // Method to start streaming
  startStreaming() {
    if (this.streaming) return; // Do not start if already streaming
    console.log("Starting streaming");
  navigator.mediaDevices.getUserMedia({ audio: this.config.audio})
    .then(stream => {
      console.log("Setting up audio processing", stream);
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

     // Biquad filter for band-pass
      const biquadFilter = this.audioContext.createBiquadFilter();
      biquadFilter.type = "bandpass";
      biquadFilter.frequency.value = this.config.freq;
      biquadFilter.Q.value = this.config.q;

      // Dynamics compressor for managing dynamic range
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.value = this.config.threshold;
      compressor.knee.value = this.config.knee;
      compressor.ratio.value = this.config.ratio;
      compressor.attack.value = this.config.attack;
      compressor.release.value = this.config.release;

      this.processorNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
      this.processorNode.port.onmessage = (event) => {
        const audioData = new Float32Array(event.data);
        this.send(audioData.buffer);
      };

      // Create a 1-second delay node
      const delay = this.audioContext.createDelay(5.0);
      delay.delayTime.value = this.config.delay; // add a delay in testing

      // Connecting nodes
      this.sourceNode.connect(delay);
      delay.connect(biquadFilter);
      biquadFilter.connect(compressor);
      compressor.connect(this.processorNode);
      this.startStreamingSubtitles();
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
    this.stopStreamingSubtitles();

    this.streaming = false;
  }
  startStreamingSubtitles(){
       // Speech Recognition Setup
      if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }

          // Post the subtitles via RTC
          this.rtcClient.send(transcript, "subtitles", this.users);
        };

        recognition.start();
      } else {
        console.error('Web Speech API is not supported in this browser.');
      }
  }
    stopStreamingSubtitles(){
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.stop();
        }
    }


  mute(){
    this.muted = true;
  }
  unmute(){
    this.muted = false;
  }
}

