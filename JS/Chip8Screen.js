
class Chip8Screen {
    #canvas;
    #ctx;
    #screenBuffer;
    #updated;
    #fillColor;
    #backgroundColor;

    constructor(canvas, resolutionScale = 1, width = 64, height = 32) {
        this.renderWidth = width;
        this.renderHeight = height;

        this.#fillColor = "#FFFFFF";
        this.#backgroundColor = "#000000";

        this.#canvas = canvas;
        this.#ctx = this.#canvas.getContext("2d");
        this.#updated = true;

        // Buffer for rendering on the screen
        this.#screenBuffer = new Uint8Array(this.renderWidth * this.renderHeight);

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
        this.#updated = true;

        this.resScale = scale;
        this.#canvas.width = this.renderWidth * scale;
        this.#canvas.height = this.renderHeight * scale;
    }

    clear() {
        this.#updated = true;

        this.#screenBuffer.fill(0);
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    }

    forceRefresh() {
        this.#updated = true;
        this.refresh();
    }

    refresh() {
        if (!this.#updated) {
            return;
        }

        this.#updated = false;

        let cellWidth = this.#canvas.width / this.renderWidth;
        let cellHeight = this.#canvas.height / this.renderHeight;

        for (let y = 0; y < this.renderHeight; y++) {
            for (let x = 0; x < this.renderWidth; x++) {
                if (this.#screenBuffer[y * this.renderWidth + x] != 0) {
                    this.#ctx.fillStyle = this.#fillColor;
                } else {
                    this.#ctx.fillStyle = this.#backgroundColor;
                }
                this.#ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
            }
        }
    }

    setPixel(x, y, color) {
        this.#updated = true;

        x = pyModulo(x, this.renderWidth);
        y = pyModulo(y, this.renderHeight);

        this.#screenBuffer[y * this.renderWidth + x] ^= color;
        return !this.#screenBuffer[y * this.renderWidth + x] && color;    // return true on overflow, ie. pixel was set and color was set
    }
}
