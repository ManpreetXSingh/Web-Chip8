"use strict";

class Keyboard {
    #nRows;
    #nCols;

    /**
     * Creates an instance of Keyboard.
     * @param {string[]} keylist - The keys.
     * @param {Object.<string, string[]>} keymap - The key mapping.
     */
    constructor(keylist, keymap, ncols) {
        this.keyNames = keylist;
        this.buttons = [];
        this.keyMap = keymap;
        this.#nCols = ncols;
        this.#nRows = (Object.keys(keymap).length / this.#nCols) | 0;
        this.onkeydown = null;
        this.onkeyup = null;
    }


    /**
     * Draws the keyboard
     * @param {HTMLElement} container - The parent element
     */
    draw(container) {
        container.style.setProperty("--nRows", this.#nRows);
        container.style.setProperty("--nCols", this.#nCols);

        let dragger = document.createElement("div");
        dragger.classList.add("dragger");
        container.appendChild(dragger);

        let table = document.createElement("table");
        table.classList.add("keyboard-table");

        for (let i = 0; i < this.#nRows; i++) {
            let row = table.insertRow();
            for (let j = 0; j < this.#nCols; j++) {
                let cell = row.insertCell();
                this._addButton(i * this.#nCols + j, cell);
            }
            table.appendChild(row);
        }
        container.appendChild(table);
    }


    _pressKey(idx) {
        const key = this.keyNames[idx].toLowerCase();
        this.buttons[idx].classList.add("pressed");

        if (this.onkeydown) {
            this.onkeydown(key);
        }
    }


    _releaseKey(idx) {
        const key = this.keyNames[idx].toLowerCase();
        this.buttons[idx].classList.remove("pressed");

        if (this.onkeyup) {
            this.onkeyup(key);
        }
    }


    /**
     * Adds a button to the keyboard
     * @param {number} idx - The index of the button
     * @param {HTMLElement} parent - The parent element
     */
    _addButton(idx, parent) {
        const keyName = this.keyNames[idx];
        let button = document.createElement("button");
        button.classList.add("key");
        button.setAttribute("tabindex", "-1");
        button.textContent = keyName;
        parent.appendChild(button);

        this.buttons.push(button);

        // Mouse Events
        button.addEventListener('mousedown', () => {
            this._pressKey(idx);

            document.addEventListener('mouseup', () => {
                this._releaseKey(idx);
            }, { once: true });
        });

        // Touch Events
        button.addEventListener('touchstart', () => {
            this._pressKey(idx);

            document.addEventListener('touchend', () => {
                this._releaseKey(idx);
            }, { once: true });
        });

        // Keyboard Events
        document.addEventListener('keydown', (event) => {
            const key = event.key;
            if (this.keyMap[keyName].includes(key)) {
                this._pressKey(idx);

                let keyUp = (event) => {
                    if (key === event.key) {
                        this._releaseKey(idx);
                        document.removeEventListener('keyup', keyUp);
                    }
                }

                document.addEventListener('keyup', keyUp);
            }
        });
    }
}