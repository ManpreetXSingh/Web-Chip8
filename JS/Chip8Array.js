class Chip8Array {
    #arr;
    #bitness;
    #updates;
    // #displayCols;
    #displayTableOptions;

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
        // this.#displayCols = 16;
        this.#displayTableOptions = new DisplayTableOptions();
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
     * Sets an array of values.
     * @param {Number} addr The index in the current array at which the values are to be written.
     * @param {Array} mem A typed or untyped array of values to set.
     */
    setArray(addr, mem) {
        if (addr + mem.length > this.#arr.length || addr < 0) {
            throw new Error("Address out of bounds");
        }
        this.#arr.set(mem, addr);
        this.#updates.concat(Array.from({ length: mem.length }, (v, i) => addr + i));
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

    /**
     * Display the array as a table in hexadecimal format.
     * @param {HTMLElement} table HTML element where to display the array
     * @param {number} [numCols=16] Number of columns
     */
    display(table, numCols = 16, tableName = null, vNames = null, hNames = null) {
        if (vNames != null) {
            this.#displayTableOptions.vAddressVisible = false;
            this.#displayTableOptions.vNames = vNames;
        }
        if (hNames != null) {
            this.#displayTableOptions.hAddressVisible = false;
            this.#displayTableOptions.hNames = hNames;
        }
        this.#displayTableOptions.tableName = tableName;
        this.#displayTableOptions.numCols = numCols;
        this.#displayTableOptions.bitness = this.#bitness;
        displayTable(table, this.#arr, this.#displayTableOptions);
        this.#updates = [];
    }

    /**
     * Update the changes in the array to an existing table.
     * @param {HTMLElement} table HTML element where to display the array
     */
    updateDisplay(table) {
        updataTable(table, this.#arr, this.#updates, this.#displayTableOptions);
        this.#updates = [];
    }

    addDisplayClasses(table, classNames) {
        addTableClasses(table, classNames, this.#displayTableOptions);
    }
    removeDisplayClasses(table, classNames) {
        removeTableClasses(table, classNames, this.#displayTableOptions);
    }
    addDisplayAttributes(table, attributes) {
        addTableAttributes(table, attributes, this.#displayTableOptions);
    }
    removeDisplayAttributes(table, attributes) {
        removeTableAttributes(table, attributes, this.#displayTableOptions);
    }
}