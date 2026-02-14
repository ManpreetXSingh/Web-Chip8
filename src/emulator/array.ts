type Bitness = 8 | 16;

class C8Array {
  #arr: Uint8Array | Uint16Array;
  #bitness: Bitness;
  #updates: number[];

  constructor(length = 4096, bitness: Bitness = 8) {
    this.#bitness = bitness;
    if (bitness === 8) {
      this.#arr = new Uint8Array(length);
    } else {
      this.#arr = new Uint16Array(length);
    }
    this.#updates = [];
  }

  get length(): number {
    return this.#arr.length;
  }

  get bitness(): Bitness {
    return this.#bitness;
  }

  get updates(): number[] {
    return this.#updates;
  }

  get underlyingArray(): Uint8Array | Uint16Array {
    return this.#arr;
  }

  clear(): void {
    this.#arr.fill(0);
    this.#updates = [-1];
  }

  clearUpdates(): void {
    this.#updates.length = 0;
  }

  setArray(addr: number, mem: ArrayLike<number>): void {
    if (addr + mem.length > this.#arr.length || addr < 0) {
      throw new Error("Address out of bounds");
    }
    this.#arr.set(mem, addr);
    this.#updates.push(
      ...Array.from({ length: mem.length }, (_, i) => addr + i),
    );
  }

  set(addr: number, value: number): void {
    if (addr >= this.#arr.length || addr < 0) {
      throw new Error("Address out of bounds");
    }
    this.#arr[addr] = value;
    this.#updates.push(addr);
  }

  get(addr: number): number {
    if (addr >= this.#arr.length || addr < 0) {
      throw new Error("Address out of bounds");
    }
    return this.#arr[addr];
  }
}

export default C8Array;
export type { Bitness };
