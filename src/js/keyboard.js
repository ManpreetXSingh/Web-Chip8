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

  destroy() {
    if (this._onKeyDown) {
      document.removeEventListener("keydown", this._onKeyDown);
      document.removeEventListener("keyup", this._onKeyUp);
      this._onKeyDown = null;
      this._onKeyUp = null;
    }
  }

  moveKeyboard(container, dx, dy, containerX = null, containerY = null) {
    let newX = (containerX === null ? container.offsetLeft : containerX) + dx;
    let newY = (containerY === null ? container.offsetTop : containerY) + dy;

    if (newX < 0) {
      newX = 0;
    } else if (newX + container.offsetWidth > window.innerWidth) {
      newX = window.innerWidth - container.offsetWidth;
    }
    if (newY < 0) {
      newY = 0;
    } else if (newY + container.offsetHeight > window.innerHeight) {
      newY = window.innerHeight - container.offsetHeight;
    }

    container.style.left = newX + "px";
    container.style.top = newY + "px";
  }

  /**
   * Draws the keyboard
   * @param {HTMLElement} container - The parent element
   */
  draw(container) {
    container.style.setProperty("--nRows", this.#nRows);
    container.style.setProperty("--nCols", this.#nCols);

    let draggerContainer = document.createElement("div");
    let dragger = document.createElement("div");

    dragger.classList.add("dragger");
    draggerContainer.appendChild(dragger);
    container.appendChild(draggerContainer);

    draggerContainer.addEventListener("mousedown", (event) => {
      event.preventDefault();
      let initialX = event.clientX,
        initialY = event.clientY;
      let elementX = container.offsetLeft,
        elementY = container.offsetTop;

      const dragEventHandler = (event) => {
        event.preventDefault();
        this.moveKeyboard(
          container,
          event.clientX - initialX,
          event.clientY - initialY,
          elementX,
          elementY,
        );
      };

      document.addEventListener("mousemove", dragEventHandler);
      document.addEventListener(
        "mouseup",
        () => {
          document.removeEventListener("mousemove", dragEventHandler);
        },
        { once: true },
      );
    });

    draggerContainer.addEventListener("touchstart", (event) => {
      event.preventDefault();
      let initialX = event.touches[0].clientX,
        initialY = event.touches[0].clientY;
      let elementX = container.offsetLeft,
        elementY = container.offsetTop;

      const dragEventHandler = (event) => {
        this.moveKeyboard(
          container,
          event.touches[0].clientX - initialX,
          event.touches[0].clientY - initialY,
          elementX,
          elementY,
        );
      };

      document.addEventListener("touchmove", dragEventHandler);
      document.addEventListener(
        "touchend",
        () => {
          document.removeEventListener("touchmove", dragEventHandler);
        },
        { once: true },
      );
    });

    let table = document.createElement("table");
    table.classList.add("keyboard-table");

    for (let i = 0; i < this.#nRows; i++) {
      let row = table.insertRow();
      for (let j = 0; j < this.#nCols; j++) {
        let cell = row.insertCell();
        this._addButton(i * this.#nCols + j, cell);
      }
    }
    container.appendChild(table);

    this._keyToIndex = new Map();
    for (let i = 0; i < this.keyNames.length; i++) {
      for (const physicalKey of this.keyMap[this.keyNames[i]]) {
        this._keyToIndex.set(physicalKey, i);
      }
    }

    this._heldKeys = new Set();

    this._onKeyDown = (event) => {
      if (this._heldKeys.has(event.key)) return;
      const idx = this._keyToIndex.get(event.key);
      if (idx !== undefined) {
        this._heldKeys.add(event.key);
        this._pressKey(idx);
      }
    };

    this._onKeyUp = (event) => {
      this._heldKeys.delete(event.key);
      const idx = this._keyToIndex.get(event.key);
      if (idx !== undefined) {
        this._releaseKey(idx);
      }
    };

    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
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
    button.addEventListener("mousedown", () => {
      this._pressKey(idx);

      document.addEventListener(
        "mouseup",
        () => {
          this._releaseKey(idx);
        },
        { once: true },
      );
    });

    // Touch Events
    button.addEventListener("touchstart", () => {
      this._pressKey(idx);

      button.addEventListener(
        "touchend",
        () => {
          this._releaseKey(idx);
        },
        { once: true },
      );
    });
  }
}

export default Keyboard;
