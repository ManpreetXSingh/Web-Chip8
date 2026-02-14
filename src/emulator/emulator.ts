import C8Cpu from "./cpu";
import type { C8Font } from "./cpu";

const C8FONT: C8Font = {
  0: [0xf0, 0x90, 0x90, 0x90, 0xf0],
  1: [0x20, 0x60, 0x20, 0x20, 0x70],
  2: [0xf0, 0x10, 0xf0, 0x80, 0xf0],
  3: [0xf0, 0x10, 0xf0, 0x10, 0xf0],
  4: [0x90, 0x90, 0xf0, 0x10, 0x10],
  5: [0xf0, 0x80, 0xf0, 0x10, 0xf0],
  6: [0xf0, 0x80, 0xf0, 0x90, 0xf0],
  7: [0xf0, 0x10, 0x20, 0x40, 0x40],
  8: [0xf0, 0x90, 0xf0, 0x90, 0xf0],
  9: [0xf0, 0x90, 0xf0, 0x10, 0xf0],
  A: [0xf0, 0x90, 0xf0, 0x90, 0x90],
  B: [0xe0, 0x90, 0xe0, 0x90, 0xe0],
  C: [0xf0, 0x80, 0x80, 0x80, 0xf0],
  D: [0xe0, 0x90, 0x90, 0x90, 0xe0],
  E: [0xf0, 0x80, 0xf0, 0x80, 0xf0],
  F: [0xf0, 0x80, 0x80, 0xf0, 0x80],
};

class Chip8Emulator {
  #processId: ReturnType<typeof setTimeout> | null;
  #timePrevious: number;
  #loadedRom: Uint8Array | null;
  #instructionIdx: number;
  #oneSecTimer: number;
  #adjustedTargetFps: number;

  targetFps: number;
  targetFrameInterval: number;
  FpsCounter: number;
  instructionsPerFrame: number;
  fps: number;
  ips: number;
  updateDisplay: () => void;
  cpu: C8Cpu;

  constructor(
    canvas: HTMLCanvasElement,
    fps = 60,
    ipf = 7,
    font: C8Font = C8FONT,
  ) {
    this.targetFps = fps;
    this.#adjustedTargetFps = fps + 3;
    this.targetFrameInterval = 1000 / this.#adjustedTargetFps;
    this.FpsCounter = 0;
    this.instructionsPerFrame = ipf;
    this.fps = 0;
    this.ips = 0;
    this.#processId = null;
    this.#timePrevious = 0;
    this.#loadedRom = null;
    this.#instructionIdx = 0;
    this.#oneSecTimer = 0;
    this.updateDisplay = () => {};
    this.cpu = new C8Cpu(canvas, font);
  }

  get speaker() {
    return this.cpu.speaker;
  }

  get screen() {
    return this.cpu.screen;
  }

  get input() {
    return this.cpu.input;
  }

  get memory() {
    return this.cpu.memory;
  }

  get stack() {
    return this.cpu.stack;
  }

  get registers() {
    return this.cpu.registers;
  }

  get programCounter() {
    return this.cpu.programCounter;
  }

  get indexRegister() {
    return this.cpu.indexRegister;
  }

  get stackPointer() {
    return this.cpu.stackPointer;
  }

  get delayTimer() {
    return this.cpu.delayTimer;
  }

  get soundTimer() {
    return this.cpu.soundTimer;
  }

  get paused(): boolean {
    return this.#processId == null;
  }

  loadRom(rom: Uint8Array): boolean {
    if (rom.length > this.memory.length - 0x200) {
      console.error(
        `Rom is too large. ${rom.length} > ${this.memory.length - 0x200}`,
      );
      return false;
    }
    this.#loadedRom = rom;
    this.cpu.loadRom(rom);
    this.speaker.initialize();
    return true;
  }

  pressKey(key: string): void {
    this.input.pressKey(key);
  }

  releaseKey(key: string): void {
    this.input.releaseKey(key);
  }

  pause(): void {
    if (this.#processId) {
      clearTimeout(this.#processId);
      this.speaker.stop();
      this.#processId = null;
    }
  }

  resume(): void {
    if (this.#processId == null) {
      if (this.cpu.interrupted) {
        this.killProcess();
      }

      this._updateDisplay();

      this.#oneSecTimer = 0;
      this.#timePrevious = performance.now();

      this.#processId = setTimeout(() => {
        this.process(performance.now());
      }, this.targetFrameInterval);
    }
  }

  killProcess(): void {
    this.pause();
    this.cpu.resetCPU();
    this.#instructionIdx = 0;
    this.#oneSecTimer = 0;

    if (this.#loadedRom != null) {
      this.cpu.loadRom(this.#loadedRom);
    }
  }

  beginProcess(): void {
    this.resume();
  }

  step(): void {
    if (this.cpu.interrupted) return;

    if (this.#instructionIdx === this.instructionsPerFrame) {
      this.#instructionIdx = 0;
      this.stepFrame(false);
    } else {
      this.#instructionIdx++;
      this.cpu.processNext();

      if (this.#oneSecTimer >= 1000) {
        this.ips = 0;
        this.#oneSecTimer = 0;
      }
      this.ips += this.#instructionIdx;

      this.cpu.updateScreen();
      this._updateDisplay();
    }
  }

  stepFrame(autoAdjustFps = true): void {
    this.FpsCounter++;
    for (let i = this.#instructionIdx; i < this.instructionsPerFrame; i++) {
      this.#instructionIdx++;
      this.cpu.processNext();
      if (
        this.cpu.quirks.quirkVBlank &&
        this.cpu.nextInstruction.type === 0xd
      ) {
        break;
      }
    }
    this.#instructionIdx = 0;

    // Update Speaker
    if (this.cpu.soundTimer <= 0) {
      this.speaker.stop();
    } else {
      this.speaker.start();
    }

    // Update and adjust FPS
    if (this.#oneSecTimer >= 1000) {
      this.calculateFps();
      if (autoAdjustFps) {
        this._adjustFrameInterval();
      }
    }

    this.cpu.updateScreen();
    this.cpu.updateTimers();
    this._updateDisplay();
  }

  process(time: number): void {
    if (this.cpu.interrupted) {
      this.pause();
      return;
    }
    this.#oneSecTimer += time - this.#timePrevious;
    this.stepFrame();
    this.#timePrevious = time;

    this.#processId = setTimeout(() => {
      this.process(performance.now());
    }, this.targetFrameInterval);
  }

  calculateFps(): void {
    this.fps = (this.FpsCounter * 1000) / this.#oneSecTimer;
    this.ips = this.fps * this.instructionsPerFrame;
    this.#oneSecTimer = 0;
    this.FpsCounter = 0;
  }

  _updateDisplay(): void {
    this.updateDisplay();
    this.memory.clearUpdates();
    this.stack.clearUpdates();
    this.registers.clearUpdates();
  }

  _adjustFrameInterval(): void {
    if (this.targetFps < this.fps - 5) {
      this.#adjustedTargetFps += this.targetFps - this.fps;
    } else if (this.targetFps > this.fps + 5) {
      this.#adjustedTargetFps += this.targetFps - this.fps;
    } else if (Math.abs(this.fps - this.targetFps) > 1) {
      this.#adjustedTargetFps =
        this.#adjustedTargetFps +
        (Number(this.fps < this.targetFps) -
          Number(this.fps > this.targetFps));
      this.targetFrameInterval = 1000 / this.#adjustedTargetFps;
    }
  }
}

export default Chip8Emulator;
export { C8FONT };
