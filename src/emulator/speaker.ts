class C8Speaker {
  audioContext: AudioContext | null = null;
  freq = 655;
  wave_type: OscillatorType = "sine";
  oscillator: OscillatorNode | null = null;
  gain: GainNode | null = null;

  initialize(): void {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();
    this.gain = this.audioContext.createGain();
    this.gain.connect(this.audioContext.destination);
    this.setVolume(0.025);
  }

  setVolume(volume: number): void {
    if (!this.audioContext || !this.gain) return;
    this.gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
  }

  start(): void {
    if (this.oscillator || !this.audioContext || !this.gain) return;
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = this.wave_type;
    this.oscillator.frequency.value = this.freq;
    this.oscillator.connect(this.gain);
    this.oscillator.start();
  }

  stop(): void {
    if (!this.oscillator) return;
    this.oscillator.stop();
    this.oscillator.disconnect();
    this.oscillator = null;
  }
}

export default C8Speaker;
