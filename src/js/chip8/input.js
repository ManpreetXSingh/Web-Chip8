class C8Input {
  #keysReleased;
  constructor() {
    this.#keysReleased = [];
    this.keysPressed = new Array(16).fill(false);

    // Function to call when a key is pressed. (Initialize when waiting for input)
    this.onKeyPressed = null;
  }

  pressKey(key) {
    key = parseInt(key, 16);
    this.keysPressed[key] = true;
  }

  releaseKey(key) {
    key = parseInt(key, 16);
    this.#keysReleased.push(key);

    if (this.onKeyPressed !== null) {
      this.onKeyPressed(key);
      this.onKeyPressed = null;
    }
  }

  update() {
    for (const keyIdx in this.#keysReleased) {
      this.keysPressed[this.#keysReleased[keyIdx]] = false;
    }
    this.#keysReleased.length = 0;
  }

  isKeyPressed(key) {
    return this.keysPressed[key];
  }
}

export default C8Input;
