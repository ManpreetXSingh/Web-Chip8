const AudioContext = window.AudioContext || window.webkitAudioContext;

class C8Speaker {
    constructor() {
        this.audioContext = null;
        this.freq = 655;
        this.wave_type = "sine";
        this.oscillator = null;
    }

    // Function to create audiocontext only on user interaction
    initialize() {
        if (this.audioContext) {
            return;
        }
        this.audioContext = new AudioContext();
        this.gain = this.audioContext.createGain();
        this.gain.connect(this.audioContext.destination);
        this.setVolume(0.025);
    }

    setVolume(volume) {
        if (!this.audioContext) {
            return;
        }
        // this.gain.gain.value = volume;
        this.gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }

    start() {
        if (this.oscillator) {
            return;
        }
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = this.wave_type;
        this.oscillator.frequency.value = this.freq;
        this.oscillator.connect(this.gain);
        this.oscillator.start();
    }

    stop() {
        if (!this.oscillator) {
            return;
        }
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
    }
}

export default C8Speaker;
