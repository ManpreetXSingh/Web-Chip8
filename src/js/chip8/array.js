class C8Array {
    #arr;
    #bitness;
    #updates;

    constructor(length = 4096, bitness = 8) {
        this.#bitness = bitness;
        if (bitness == 8) {
            this.#arr = new Uint8Array(length);
        } else if (bitness == 16) {
            this.#arr = new Uint16Array(length);
        } else {
            throw new Error("Unsupported bitness");
        }
        this.#updates = [];
    }

    get length() {
        return this.#arr.length;
    }

    get bitness() {
        return this.#bitness;
    }

    get updates() {
        return this.#updates;
    }

    get underlyingArray() {
        return this.#arr;
    }

    /**
     * Clear the array by filling it with zeros.
     */
    clear() {
        this.#arr.fill(0);
        this.#updates = [-1];
    }

    /**
     * Reset the `this.updates` array.
     */
    clearUpdates() {
        this.#updates.length = 0;
    }

    /**
     * Sets an array of values.
     * @param {Number} addr The index in the current array at which the values are to be written.
     * @param {Array} mem A typed or untyped array of values to set.
     */
    setArray(addr, mem) {
        if (addr + mem.length > this.#arr.length || addr < 0) {
            throw new Error("Address out of bounds");
        }
        this.#arr.set(mem, addr);
        this.#updates.concat(
            Array.from({ length: mem.length }, (v, i) => addr + i)
        );
    }

    /**
     * Sets a value.
     * @param {Number} addr The index in the current array at which the values are to be written.
     * @param {Number} mem A value to set.
     * @returns {void}
     */
    set(addr, mem) {
        if (addr >= this.#arr.length || addr < 0) {
            throw new Error("Address out of bounds");
        }
        this.#arr[addr] = mem;
        this.#updates.push(addr);
    }

    /**
     * Get a value.
     * @param {Number} addr Address to get
     * @returns {Number}
     */
    get(addr) {
        if (addr >= this.#arr.length || addr < 0) {
            throw new Error("Address out of bounds");
        }
        return this.#arr[addr];
    }
}

export default C8Array;
