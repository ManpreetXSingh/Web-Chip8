
AudioContext = window.AudioContext || window.webkitAudioContext;

class Chip8Speaker {
    constructor() {
        this.audioContext = new AudioContext();
        this.freq = 655;
        this.wave_type = "sine";
        this.oscillator = null;
        this.gain = this.audioContext.createGain();
        this.gain.connect(this.audioContext.destination);
        this.setVolume(0.025);
        // document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this));
    }

    // /**
    //  * Turn the speaker on or off depending on whether the page is visible.
    //  * @returns {void}
    //  */
    // handleVisibilityChange() {
    //     if (!this.oscillator) {
    //         return;
    //     }
    //     if (document.hidden) {
    //         this.stop();
    //     } else {
    //         this.start();
    //     }
    // }

    setVolume(volume) {
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
