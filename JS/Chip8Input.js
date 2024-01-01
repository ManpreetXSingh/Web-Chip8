class Chip8Input {
    #keysReleased;
    constructor() {
        this.KEYMAP = {
            1: 0x1,
            2: 0x2,
            3: 0x3,
            4: 0xc,
            q: 0x4,
            w: 0x5,
            e: 0x6,
            r: 0xd,
            a: 0x7,
            s: 0x8,
            d: 0x9,
            f: 0xe,
            z: 0xa,
            x: 0x0,
            c: 0xb,
            v: 0xf,
        };
        this.#keysReleased = [];
        this.keysPressed = new Array(0xf).fill(false);

        // Function to call when a key is pressed. (Initialize when waiting for input)
        this.onKeyPressed = null;
    }

    pressKey(key) {
        this.keysPressed[key] = true;

        if (this.onKeyPressed !== null) {
            this.onKeyPressed(key);
            this.onKeyPressed = null;
        }
    }

    releaseKey(key) {
        this.#keysReleased.push(key);
    }

    update() {
        for (const keyIdx in this.#keysReleased) {
            this.keysPressed[this.#keysReleased[keyIdx]] = false;
        }
        this.#keysReleased = [];
    }

    isKeyPressed(key) {
        return this.keysPressed[key];
    }
}

export default Chip8Input;
