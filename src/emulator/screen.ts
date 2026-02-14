import { pyModulo } from "../lib/util";

class C8Screen {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #screenBuffer: Uint8Array;
  #updateIndices: number[] = [];
  #fillColor: string;
  #backgroundColor: string;

  renderWidth: number;
  renderHeight: number;
  resScale = 1;

  constructor(
    canvas: HTMLCanvasElement,
    resolutionScale = 1,
    width = 64,
    height = 32,
  ) {
    this.renderWidth = width;
    this.renderHeight = height;

    this.#fillColor = "#FFFFFF";
    this.#backgroundColor = "#000000";

    this.#canvas = canvas;
    this.#ctx = this.#canvas.getContext("2d", { alpha: false })!;
    this.#updateIndices = [-1];

    this.#screenBuffer = new Uint8Array(this.renderWidth * this.renderHeight);

    this.updateResScale(resolutionScale);
  }

  get fillColor(): string {
    return this.#fillColor;
  }

  set fillColor(color: string) {
    this.#ctx.fillStyle = color;
    this.#fillColor = this.#ctx.fillStyle as string;
  }

  get backgroundColor(): string {
    return this.#backgroundColor;
  }

  set backgroundColor(color: string) {
    this.#ctx.fillStyle = color;
    this.#backgroundColor = this.#ctx.fillStyle as string;
  }

  updateResScale(scale: number): void {
    this.#updateIndices[0] = -1;
    this.resScale = scale;
    this.#canvas.width = this.renderWidth * scale;
    this.#canvas.height = this.renderHeight * scale;
  }

  clear(): void {
    this.#updateIndices[0] = -1;
    this.#screenBuffer.fill(0);
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  forceRefresh(): void {
    this.#updateIndices[0] = -1;
    this.refresh();
  }

  refresh(): void {
    if (this.#updateIndices.length === 0) return;

    const scale = this.resScale;

    // Refresh entire screen
    if (this.#updateIndices[0] === -1) {
      this.#ctx.fillStyle = this.#backgroundColor;
      this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

      this.#ctx.fillStyle = this.#fillColor;
      for (let y = 0; y < this.renderHeight; y++) {
        for (let x = 0; x < this.renderWidth; x++) {
          if (this.#screenBuffer[y * this.renderWidth + x] !== 0) {
            this.#ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }
      return;
    }

    this.#ctx.fillStyle = this.#backgroundColor;
    for (const idx of this.#updateIndices) {
      if (this.#screenBuffer[idx] === 0) {
        const x = (idx % this.renderWidth) | 0;
        const y = (idx / this.renderWidth) | 0;
        this.#ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    this.#ctx.fillStyle = this.#fillColor;
    for (const idx of this.#updateIndices) {
      if (this.#screenBuffer[idx] !== 0) {
        const x = (idx % this.renderWidth) | 0;
        const y = (idx / this.renderWidth) | 0;
        this.#ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    this.#updateIndices.length = 0;
  }

  setPixel(x: number, y: number, color: number): number {
    x = x < this.renderWidth && x >= 0 ? x : pyModulo(x, this.renderWidth);
    y = y < this.renderHeight && y >= 0 ? y : pyModulo(y, this.renderHeight);
    const idx = y * this.renderWidth + x;

    if (this.#updateIndices.length < 1024) {
      this.#updateIndices.push(idx);
    } else {
      this.#updateIndices[0] = -1;
    }

    this.#screenBuffer[idx] ^= color;
    return !this.#screenBuffer[idx] && color ? 1 : 0; // 1 on collision (pixel erased)
  }
}

export default C8Screen;
