// audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    this.port.postMessage(inputs[0][0]);
    return true; // keep the processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);
