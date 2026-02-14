class C8Input {
  #keysReleased: number[] = [];
  keysPressed: boolean[] = new Array(16).fill(false);
  onKeyPressed: ((key: number) => void) | null = null;

  pressKey(key: string): void {
    const k = parseInt(key, 16);
    this.keysPressed[k] = true;
  }

  releaseKey(key: string): void {
    const k = parseInt(key, 16);
    this.#keysReleased.push(k);

    if (this.onKeyPressed !== null) {
      this.onKeyPressed(k);
      this.onKeyPressed = null;
    }
  }

  update(): void {
    for (const key of this.#keysReleased) {
      this.keysPressed[key] = false;
    }
    this.#keysReleased.length = 0;
  }

  isKeyPressed(key: number): boolean {
    return this.keysPressed[key];
  }
}

export default C8Input;
