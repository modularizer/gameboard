// audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    output[0].set(input[0]);
    this.port.postMessage(input[0]);
    return true; // keep the processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);
