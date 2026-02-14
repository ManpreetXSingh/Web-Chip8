import C8Array from "./array";
import C8Screen from "./screen";
import C8Input from "./input";
import C8Speaker from "./speaker";

interface Quirks {
  quirkShift: boolean;
  quirkMemoryLeaveIUnchanged: boolean;
  quirkMemoryIncrementByX: boolean;
  quirkWrap: boolean;
  quirkJump: boolean;
  quirkLogic: boolean;
  quirkVBlank: boolean;
}

type C8Font = Record<string, number[]>;

class Instruction {
  type = 0;
  x = 0;
  y = 0;
  n = 0;
  kk = 0;
  nnn = 0;

  constructor(instruction: number) {
    this.set(instruction);
  }

  set(instruction: number): void {
    this.type = (instruction >> 12) & 0x000f;
    this.x = (instruction >> 8) & 0x000f;
    this.y = (instruction >> 4) & 0x000f;
    this.n = instruction & 0x000f;
    this.kk = instruction & 0x00ff;
    this.nnn = instruction & 0x0fff;
  }
}

class C8Cpu {
  screen: C8Screen;
  input: C8Input;
  speaker: C8Speaker;
  font: C8Font;
  currentInstruction: Instruction;
  fontOffset = 0x0050;
  memory: C8Array;
  stack: C8Array;
  registers: C8Array;
  indexRegister = 0;
  programCounter = 0x200;
  stackPointer = 0;
  delayTimer = 0;
  soundTimer = 0;
  waitForInput = false;
  interrupted = false;
  quirks!: Quirks;

  constructor(screen: HTMLCanvasElement, font: C8Font) {
    this.screen = new C8Screen(screen, 5);
    this.input = new C8Input();
    this.speaker = new C8Speaker();
    this.font = font;
    this.currentInstruction = new Instruction(0);

    this.memory = new C8Array(4096, 8);
    this.stack = new C8Array(16, 16);
    this.registers = new C8Array(16, 8);

    this.loadFont(this.font);
    this.resetQuirks();
  }

  get nextInstruction(): Instruction {
    return new Instruction(this._fetch());
  }

  loadRom(rom: Uint8Array): void {
    this.memory.setArray(0x200, rom);
  }

  loadFont(font: C8Font): void {
    const fontHeight = font[0].length;
    let i = 0;
    // Insert built in font in memory 0x050–0x09F
    for (const key in font) {
      this.memory.setArray(i++ * fontHeight + this.fontOffset, font[key]);
    }
  }

  resetCPU(): void {
    this.screen.clear();
    this.speaker.stop();
    this.memory.clear();
    this.stack.clear();
    this.registers.clear();

    this.programCounter = 0x200;
    this.indexRegister = 0;
    this.stackPointer = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.waitForInput = false;
    this.interrupted = false;
    this.loadFont(this.font);
  }

  resetQuirks(mode?: string): void {
    this.quirks = {
      quirkShift: false,
      quirkMemoryLeaveIUnchanged: false,
      quirkMemoryIncrementByX: false,
      quirkWrap: mode !== "chip8",
      quirkJump: false,
      quirkLogic: true,
      quirkVBlank: false,
    };
  }

  updateTimers(): void {
    this.delayTimer -= Number(this.delayTimer > 0);
    this.soundTimer -= Number(this.soundTimer > 0);
  }

  updateScreen(): void {
    this.screen.refresh();
  }

  processNext(): void {
    if (this.interrupted || this.waitForInput) return;

    const instruction = this._fetch();
    this.programCounter += 2;

    const executed = this._execute(this._decode(instruction));
    if (!executed) {
      this.interrupted = true;
      console.warn(`Unknown instruction ${instruction}`);
    }
    this.input.update();
  }

  _set_carry(register: number, value: number, carry: number | boolean): void {
    this.registers.set(register, value & 0xff);
    this.registers.set(0xf, carry ? 1 : 0);
  }

  _fetch(): number {
    return (
      (this.memory.get(this.programCounter) << 8) |
      this.memory.get(this.programCounter + 1)
    );
  }

  _decode(instruction: number): Instruction {
    this.currentInstruction.set(instruction);
    return this.currentInstruction;
  }

  _execute(instruction: Instruction): boolean {
    let Vx = this.registers.get(instruction.x);
    const Vy = this.registers.get(instruction.y);

    // Original CHIP-8 incremented index register by X+1
    const i_increment =
      (this.quirks.quirkMemoryLeaveIUnchanged
        ? 0
        : this.quirks.quirkMemoryIncrementByX
          ? instruction.x
          : instruction.x + 1) & 0xfff;

    switch (instruction.type) {
      case 0x0:
        switch (instruction.nnn) {
          // 00E0
          case 0x0e0:
            this.screen.clear();
            return true;
          // 00EE
          case 0x0ee:
            this.stackPointer = this.stackPointer - 1;
            if (this.stackPointer < 0) {
              this.stackPointer = 0;
              console.warn("Stack underflow");
            }
            this.programCounter = this.stack.get(this.stackPointer);
            return true;
        }
        break;

      // 1NNN
      case 0x1:
        this.programCounter = instruction.nnn;
        return true;

      // 2NNN
      case 0x2:
        this.stack.set(this.stackPointer, this.programCounter);
        this.stackPointer = this.stackPointer + 1;
        if (this.stackPointer > 0xf) {
          this.stackPointer = 0xf;
          console.warn("Stack overflow");
        }
        this.programCounter = instruction.nnn;
        return true;

      // 3XKK
      case 0x3:
        if (instruction.kk === Vx) {
          this.programCounter += 2;
        }
        return true;

      // 4XKK
      case 0x4:
        if (instruction.kk !== Vx) {
          this.programCounter += 2;
        }
        return true;

      // 5XY0
      case 0x5:
        if (Vx === Vy) {
          this.programCounter += 2;
        }
        return true;

      // 6XKK
      case 0x6:
        this.registers.set(instruction.x, instruction.kk);
        return true;

      // 7XKK
      case 0x7:
        this.registers.set(instruction.x, Vx + instruction.kk);
        return true;

      case 0x8:
        switch (instruction.n) {
          // 8XY0
          case 0x0:
            this.registers.set(instruction.x, Vy);
            return true;

          // 8XY1
          case 0x1:
            this.registers.set(instruction.x, Vx | Vy);
            if (this.quirks.quirkLogic) {
              this.registers.set(0xf, 0);
            }
            return true;

          // 8XY2
          case 0x2:
            this.registers.set(instruction.x, Vx & Vy);
            if (this.quirks.quirkLogic) {
              this.registers.set(0xf, 0);
            }
            return true;

          // 8XY3
          case 0x3:
            this.registers.set(instruction.x, Vx ^ Vy);
            if (this.quirks.quirkLogic) {
              this.registers.set(0xf, 0);
            }
            return true;

          // 8XY4
          case 0x4: {
            const result = Vx + Vy;
            this._set_carry(instruction.x, result, result > 0xff);
            return true;
          }

          // 8XY5
          case 0x5: {
            const result = Vx - Vy;
            this._set_carry(instruction.x, result, Vx >= Vy);
            return true;
          }

          // 8XY6
          case 0x6: {
            if (!this.quirks.quirkShift) {
              Vx = Vy;
            }
            const result = Vx >> 1;
            this._set_carry(instruction.x, result, Vy & 0x1);
            return true;
          }

          // 8XY7
          case 0x7: {
            const result = Vy - Vx;
            this._set_carry(instruction.x, result, Vy >= Vx);
            return true;
          }

          // 8XYE
          case 0xe: {
            if (!this.quirks.quirkShift) {
              Vx = Vy;
            }
            const result = Vx << 1;
            this._set_carry(instruction.x, result, (Vy >> 7) & 0x1);
            return true;
          }
        }
        break;

      // 9XY0
      case 0x9:
        if (Vx !== Vy) {
          this.programCounter += 2;
        }
        return true;

      // ANNN
      case 0xa:
        this.indexRegister = instruction.nnn;
        return true;

      // BNNN
      case 0xb:
        if (this.quirks.quirkJump) {
          this.programCounter = instruction.nnn + Vx;
        } else {
          this.programCounter = instruction.nnn + this.registers.get(0);
        }
        return true;

      // CXKK
      case 0xc:
        this.registers.set(
          instruction.x,
          Math.floor(Math.random() * 256) & instruction.kk,
        );
        return true;

      // DXYN
      case 0xd: {
        const screenX = Vx % this.screen.renderWidth;
        const screenY = Vy % this.screen.renderHeight;
        const spriteHeight = instruction.n;
        const spriteWidth = 8;
        const yCondition = this.quirks.quirkWrap
          ? (y: number) => y < spriteHeight
          : (y: number) =>
              y < spriteHeight && y + screenY < this.screen.renderHeight;
        const xCondition = this.quirks.quirkWrap
          ? (x: number) => x < spriteWidth
          : (x: number) =>
              x < spriteWidth && x + screenX < this.screen.renderWidth;
        this.registers.set(0xf, 0);

        for (let y = 0; yCondition(y); y++) {
          let pixel_row = this.memory.get(this.indexRegister + y);
          for (let x = 0; xCondition(x); x++) {
            this.registers.set(
              0xf,
              this.screen.setPixel(
                x + screenX,
                y + screenY,
                (pixel_row >> 7) & 0b1,
              ) || this.registers.get(0xf),
            );
            pixel_row <<= 1;
          }
        }

        return true;
      }

      case 0xe:
        switch (instruction.kk) {
          // EX9E
          case 0x9e:
            if (this.input.isKeyPressed(Vx)) {
              this.programCounter += 2;
            }
            return true;

          // EXA1
          case 0xa1:
            if (!this.input.isKeyPressed(Vx)) {
              this.programCounter += 2;
            }
            return true;
        }
        break;

      case 0xf:
        switch (instruction.kk) {
          // FX07
          case 0x07:
            this.registers.set(instruction.x, this.delayTimer);
            return true;

          // FX0A
          case 0x0a:
            this.waitForInput = true;
            this.input.onKeyPressed = (key: number) => {
              this.registers.set(instruction.x, key);
              this.waitForInput = false;
            };
            return true;

          // FX15
          case 0x15:
            this.delayTimer = Vx;
            return true;

          // FX18
          case 0x18:
            this.soundTimer = Vx;
            return true;

          // FX1E
          case 0x1e:
            this.indexRegister = (this.indexRegister + Vx) & 0xfff;
            return true;

          // FX29
          case 0x29:
            this.indexRegister = Vx * 5 + this.fontOffset;
            return true;

          // FX33
          case 0x33:
            this.memory.set(
              (this.indexRegister + 0) & 0xfff,
              (Vx % 1000) / 100,
            );
            this.memory.set((this.indexRegister + 1) & 0xfff, (Vx % 100) / 10);
            this.memory.set((this.indexRegister + 2) & 0xfff, (Vx % 10) / 1);
            return true;

          // FX55
          case 0x55:
            for (let i = 0; i <= instruction.x; i++) {
              this.memory.set(
                (this.indexRegister + i) & 0xfff,
                this.registers.get(i),
              );
            }
            this.indexRegister += i_increment;
            return true;

          // FX65
          case 0x65:
            for (let i = 0; i <= instruction.x; i++) {
              this.registers.set(
                i,
                this.memory.get((this.indexRegister + i) & 0xfff),
              );
            }
            this.indexRegister += i_increment;
            return true;
        }
        break;
    }
    return false;
  }
}

export default C8Cpu;
export { Instruction };
export type { Quirks, C8Font };
