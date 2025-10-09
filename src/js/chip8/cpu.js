import C8Array from "./array.js";
import C8Screen from "./screen.js";
import C8Input from "./input.js";
import C8Speaker from "./speaker.js";

class Instruction {
    /**
     * Create a chip8 instruction
     * @param {number} instruction
     * @returns {Instruction}
     */
    constructor(instruction) {
        this.set(instruction);
    }

    set(instruction) {
        this.type = (instruction >> 12) & 0x000f;
        this.x = (instruction >> 8) & 0x000f;
        this.y = (instruction >> 4) & 0x000f;
        this.n = instruction & 0x000f;
        this.kk = instruction & 0x00ff;
        this.nnn = instruction & 0x0fff;
    }
}

class C8Cpu {
    /**
     *
     * @param {HTMLCanvasElement} screen
     * @param {Object.<string, number[]>} font
     */
    constructor(screen, font) {
        this.screen = new C8Screen(screen, 5);
        this.input = new C8Input();
        this.speaker = new C8Speaker();
        this.font = font;
        this.currentInstruction = new Instruction(0);

        // Font Location in memory
        this.fontOffset = 0x0050;

        // Memory and Registers //

        // Allocate 4 kilobytes of memory
        this.memory = new C8Array(4096, 8);

        // Stack for 16 bit addresses
        this.stack = new C8Array(16, 16);

        // 16 8 bit general purpose registers
        this.registers = new C8Array(16, 8);

        // 16 bit index register
        this.indexRegister = 0;

        // Load font into memory
        this.loadFont(this.font);

        // Pointers //

        // Pointer to the current instruction in memory
        this.programCounter = 0x200;

        // 8 bit stack pointer
        this.stackPointer = 0;

        // Timers and Delays //

        // 8 bit delay timer
        this.delayTimer = 0;

        // 8 bit sound timer
        this.soundTimer = 0;

        // Wait for a key press
        this.waitForInput = false;

        // Events //

        // Terminates the execution until reset
        this.interrupted = false;

        // Quirks //

        this.resetQuirks();
    }

    /**
     * Get the next instruction to be executed
     * @returns {Instruction}
     */
    get nextInstruction() {
        return new Instruction(this._fetch());
    }

    /**
     * Load a rom into memory
     * @param {Uint8Array} rom
     */
    loadRom(rom) {
        this.memory.setArray(0x200, rom);
    }

    /**
     * Load a font into memory
     * @param {{Object.<string, number[]>}} font
     */
    loadFont(font) {
        let fontHeight = font[0].length;
        let i = 0;

        // Insert built in font in memory 0x050–0x09F
        for (const key in font) {
            this.memory.setArray(i++ * fontHeight + this.fontOffset, font[key]);
        }
    }

    resetCPU() {
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

    /**
     * Reset quirks
     * @param {string} mode
     * @returns {void}
     */
    resetQuirks(mode) {
        switch (mode) {
            case "chip8":
                this.quirkShift = false; // Shift Vy into Vx
                this.quirkMemoryLeaveIUnchanged = false; // Leave I unchanged (in save/load instructions)
                this.quirkMemoryIncrementByX = false; // Increment I by X (in save/load instructions)
                this.quirkWrap = false; // Sprite wrap
                this.quirkJump = false; // Jump to <address+vx> instead of <address+v0>
                this.quirkLogic = true; // Reset vf to 0
                this.quirkVBlank = false; // Wait for VBlank
                break;
            default:
            case "octo":
                this.quirkShift = false; // Shift Vy into Vx
                this.quirkMemoryLeaveIUnchanged = false; // Leave I unchanged (in save/load instructions)
                this.quirkMemoryIncrementByX = false; // Increment I by X (in save/load instructions)
                this.quirkWrap = true; // Sprite wrap
                this.quirkJump = false; // Jump to <address+vx> instead of <address+v0>
                this.quirkLogic = true; // Reset vf to 0
                this.quirkVBlank = false; // Wait for VBlank
                break;
        }
    }

    updateTimers() {
        this.delayTimer -= (this.delayTimer > 0) * 1;
        this.soundTimer -= (this.soundTimer > 0) * 1;
    }

    updateScreen() {
        this.screen.refresh();
    }

    /**
     * Process the next instruction
     * @returns {void}
     */
    processNext() {
        if (this.interrupted || this.waitForInput) {
            return;
        }

        // Fetch 16 bit instruction
        let instruction = this._fetch();
        this.programCounter += 2;

        let executed = this._execute(this._decode(instruction));
        if (!executed) {
            this.interrupted = true;
            console.warn(`Unknown instruction ${instruction}`);
        }
        this.input.update();
    }

    /**
     * Set a register then update the carry into the VF register
     * @param {Number} register
     * @param {Number} value
     * @param {Boolean} carry
     * @returns {void}
     */
    _set_carry(register, value, carry) {
        this.registers.set(register, value & 0xff);
        this.registers.set(0xf, carry ? 1 : 0);
    }

    /**
     * Fetch the next instruction from memory
     * @returns {Number}
     */
    _fetch() {
        return (
            (this.memory.get(this.programCounter) << 8) |
            this.memory.get(this.programCounter + 1)
        );
    }

    /**
     * Decode an instruction and return an Instruction object
     * @param {Instruction} instruction
     */
    _decode(instruction) {
        this.currentInstruction.set(instruction);
        return this.currentInstruction;
    }

    /**
     * Execute an instruction
     * @param {Instruction} instruction
     */
    _execute(instruction) {
        let Vx = this.registers.get(instruction.x);
        let Vy = this.registers.get(instruction.y);

        // Original CHIP-8 incremented index register by X+1
        let i_increment =
            (this.quirkMemoryLeaveIUnchanged
                ? 0
                : this.quirkMemoryIncrementByX
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
                if (instruction.kk == Vx) {
                    this.programCounter += 2;
                }
                return true;

            // 4XKK
            case 0x4:
                if (instruction.kk != Vx) {
                    this.programCounter += 2;
                }
                return true;

            // 5XY0
            case 0x5:
                if (Vx == Vy) {
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
                        if (this.quirkLogic) {
                            this.registers.set(0xf, 0);
                        }
                        return true;

                    // 8XY2
                    case 0x2:
                        this.registers.set(instruction.x, Vx & Vy);
                        if (this.quirkLogic) {
                            this.registers.set(0xf, 0);
                        }
                        return true;

                    // 8XY3
                    case 0x3:
                        this.registers.set(instruction.x, Vx ^ Vy);
                        if (this.quirkLogic) {
                            this.registers.set(0xf, 0);
                        }
                        return true;

                    // 8XY4
                    case 0x4:
                        var result = Vx + Vy;
                        this._set_carry(instruction.x, result, result > 0xff);
                        return true;

                    // 8XY5
                    case 0x5:
                        var result = Vx - Vy;
                        this._set_carry(instruction.x, result, Vx >= Vy);
                        return true;

                    // 8XY6
                    case 0x6:
                        if (!this.quirkShift) {
                            Vx = Vy;
                        }
                        var result = Vx >> 1;
                        this._set_carry(instruction.x, result, Vy & 0x1);
                        return true;

                    // 8XY7
                    case 0x7:
                        var result = Vy - Vx;
                        this._set_carry(instruction.x, result, Vy >= Vx);
                        return true;

                    // 8XYE
                    case 0xe:
                        if (!this.quirkShift) {
                            Vx = Vy;
                        }
                        var result = Vx << 1;
                        this._set_carry(instruction.x, result, (Vy >> 7) & 0x1);
                        return true;
                }
                break;

            // 9XY0
            case 0x9:
                if (Vx != Vy) {
                    this.programCounter += 2;
                }
                return true;

            // ANNN
            case 0xa:
                this.indexRegister = instruction.nnn;
                return true;

            // BNNN
            case 0xb:
                if (this.quirkJump) {
                    this.programCounter = instruction.nnn + Vx;
                } else {
                    this.programCounter =
                        instruction.nnn + this.registers.get(0);
                }
                return true;

            // CXKK
            case 0xc:
                this.registers.set(
                    instruction.x,
                    Math.floor(Math.random() * 0xff) & instruction.kk
                );
                return true;

            // DXYN
            case 0xd:
                let screenX = Vx % this.screen.renderWidth; // Both Vx and renderWidth are positive, so no need to use pymodulo
                let screenY = Vy % this.screen.renderHeight; // Both Vy and renderHeight are also positive
                let spriteHeight = instruction.n;
                let spriteWidth = 8;
                let yCondition = this.quirkWrap
                    ? (y) => y < spriteHeight
                    : (y) =>
                          y < spriteHeight &&
                          y + screenY < this.screen.renderHeight;
                let xCondition = this.quirkWrap
                    ? (x) => x < spriteWidth
                    : (x) =>
                          x < spriteWidth &&
                          x + screenX < this.screen.renderWidth;
                this.registers.set(0xf, 0);

                for (let y = 0; yCondition(y); y++) {
                    let pixel_row = this.memory.get(this.indexRegister + y);
                    for (let x = 0; xCondition(x); x++) {
                        this.registers.set(
                            0xf,
                            this.screen.setPixel(
                                x + screenX,
                                y + screenY,
                                (pixel_row >> 7) & 0b1
                            ) || this.registers.get(0xf)
                        );
                        pixel_row <<= 1;
                    }
                }

                return true;

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
                        this.input.onKeyPressed = (key) => {
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
                        // this.registers.set(0xF, (this.indexRegister + Vx) > 0xFFF);
                        // this.indexRegister += Vx;
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
                            (Vx % 1000) / 100
                        );
                        this.memory.set(
                            (this.indexRegister + 1) & 0xfff,
                            (Vx % 100) / 10
                        );
                        this.memory.set(
                            (this.indexRegister + 2) & 0xfff,
                            (Vx % 10) / 1
                        );
                        return true;

                    // FX55
                    case 0x55:
                        for (let i = 0; i <= instruction.x; i++) {
                            this.memory.set(
                                (this.indexRegister + i) & 0xfff,
                                this.registers.get(i)
                            );
                        }

                        this.indexRegister += i_increment;
                        return true;

                    // FX65
                    case 0x65:
                        for (let i = 0; i <= instruction.x; i++) {
                            this.registers.set(
                                i,
                                this.memory.get(
                                    (this.indexRegister + i) & 0xfff
                                )
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
