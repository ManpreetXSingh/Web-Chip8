import { pyModulo } from "./Utils.js";

class Chip8Screen {
    #canvas;
    #ctx;
    #screenBuffer;
    #updateIndices = [];
    #fillColor;
    #backgroundColor;

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {number} resolutionScale
     * @param {number} width
     * @param {number} height
     */
    constructor(canvas, resolutionScale = 1, width = 64, height = 32) {
        this.renderWidth = width;
        this.renderHeight = height;

        this.#fillColor = "#FFFFFF";
        this.#backgroundColor = "#000000";

        this.#canvas = canvas;
        this.#ctx = this.#canvas.getContext("2d", { alpha: false });
        this.#updateIndices = [-1];

        this.#screenBuffer = new Uint8Array(
            this.renderWidth * this.renderHeight
        );

        this.updateResScale(resolutionScale);
    }

    get fillColor() {
        return this.#fillColor;
    }

    set fillColor(color) {
        this.#ctx.fillStyle = color;
        this.#fillColor = this.#ctx.fillStyle;
    }

    get backgroundColor() {
        return this.#backgroundColor;
    }

    set backgroundColor(color) {
        this.#ctx.fillStyle = color;
        this.#backgroundColor = this.#ctx.fillStyle;
    }

    updateResScale(scale) {
        this.#updateIndices[0] = -1;

        this.resScale = scale;
        this.#canvas.width = this.renderWidth * scale;
        this.#canvas.height = this.renderHeight * scale;
    }

    clear() {
        this.#updateIndices[0] = -1;

        this.#screenBuffer.fill(0);
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    }

    forceRefresh() {
        this.#updateIndices[0] = -1;
        this.refresh();
    }

    refresh() {
        if (this.#updateIndices.length === 0) {
            return;
        }

        const scale = this.resScale;

        // Refresh entire screen
        if (this.#updateIndices[0] === -1) {
            // FIll background
            this.#ctx.fillStyle = this.#backgroundColor;
            this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

            // Fill foreground
            this.#ctx.fillStyle = this.#fillColor;
            for (let y = 0; y < this.renderHeight; y++) {
                for (let x = 0; x < this.renderWidth; x++) {
                    if (this.#screenBuffer[y * this.renderWidth + x] != 0) {
                        this.#ctx.fillRect(x * scale, y * scale, scale, scale);
                    }
                }
            }
            return;
        }

        // Fill background
        this.#ctx.fillStyle = this.#backgroundColor;
        for (let idx of this.#updateIndices) {
            if (this.#screenBuffer[idx] === 0) {
                let x = idx % this.renderWidth | 0;
                let y = (idx / this.renderWidth) | 0;
                this.#ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }

        // Fill foreground
        this.#ctx.fillStyle = this.#fillColor;
        for (let idx of this.#updateIndices) {
            if (this.#screenBuffer[idx] !== 0) {
                let x = idx % this.renderWidth | 0;
                let y = (idx / this.renderWidth) | 0;
                this.#ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
        this.#updateIndices.length = 0;
    }

    setPixel(x, y, color) {
        x = x < this.renderWidth && x >= 0 ? x : pyModulo(x, this.renderWidth);
        y = y < this.renderHeight && y >= 0 ? y : pyModulo(y, this.renderHeight);
        const idx = y * this.renderWidth + x;

        if (this.#updateIndices.length < 1024){
            this.#updateIndices.push(idx);
        } else {
            this.#updateIndices[0] = -1;
        }

        this.#screenBuffer[idx] ^= color;
        return !this.#screenBuffer[idx] && color; // return true on overflow, ie. pixel was set and color was set
    }
}

export default Chip8Screen;
