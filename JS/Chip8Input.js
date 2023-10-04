
class Chip8Input {
    #keysReleased;
    constructor() {
        this.KEYMAP = {
            "1": 0x1,
            "2": 0x2,
            "3": 0x3,
            "4": 0xC,
            "q": 0x4,
            "w": 0x5,
            "e": 0x6,
            "r": 0xD,
            "a": 0x7,
            "s": 0x8,
            "d": 0x9,
            "f": 0xE,
            "z": 0xA,
            "x": 0x0,
            "c": 0xB,
            "v": 0xF
        }
        this.#keysReleased = [];
        this.keysPressed = new Array(0xF).fill(false);

        // Function to call when a key is pressed. Initialized when waiting for input
        this.onKeyPressed = null;

        this.#addEventListners();
    }

    #addEventListners() {
        window.addEventListener("keydown", (e) => {
            var key = this.KEYMAP[e.key];
            if (key == null) { return; }

            this.pressKey(key);
        })

        window.addEventListener("keyup", (e) => {
            var key = this.KEYMAP[e.key];
            if (key == null) { return; }

            this.releaseKey(key);
        })
    }

    pressKey(key) {
        this.keysPressed[key] = true;

        if (this.onKeyPressed !== null) {
            this.onKeyPressed(key)
            this.onKeyPressed = null;
        }
    }

    releaseKey(key) {
        this.#keysReleased.push(key);
    }

    update() {
        // let key;
        // while(key = this.#keysReleased.pop()){
        //     this.keysPressed[key] = false;
        // }
        for (const keyIdx in this.#keysReleased) {
            this.keysPressed[this.#keysReleased[keyIdx]] = false;
        }
        this.#keysReleased = [];
    }

    isKeyPressed(key) {
        return this.keysPressed[key];
    }
}
