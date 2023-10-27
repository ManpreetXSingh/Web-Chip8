
class Instruction {
    constructor(instruction) {
        this.set(instruction);
    }

    set(instruction) {
        this.type = (instruction >> 12) & 0x000F;
        this.x = (instruction >> 8) & 0x000F;
        this.y = (instruction >> 4) & 0x000F;
        this.n = instruction & 0x000F;
        this.kk = instruction & 0x00FF;
        this.nnn = instruction & 0x0FFF;
    }

}


class Chip8CPU {
    /**
     * 
     * @param {Chip8Screen} screen 
     * @param {Chip8Input} input 
     * @param {Chip8Speaker} speaker 
     * @param {Object.<string, number[]>} font 
     * @param {Chip8Array} memory 
     * @param {Chip8Array} stack 
     * @param {Chip8Array} registers 
     */
    constructor(screen, input, speaker, font, memory, stack, registers) {
        if (memory.length != 4096 && memory.bitness != 8) {
            throw new Error("Memory length must be 4096 and bitness must be 8");
        }
        if (stack.length != 16 && stack.bitness != 16) {
            throw new Error("Stack length must be 16 and bitness must be 16");
        }
        if (registers.length != 16 && registers.bitness != 8) {
            throw new Error("Registers length must be 16");
        }

        this.screen = screen;
        this.input = input;
        this.speaker = speaker;
        this._font = font;

        // Font Location in memory
        this.fontOffset = 0x0050;

        // Memory and Registers //

        // Allocate 4 kilobytes of memory
        this.memory = memory;   //new Chip8Array(memAmt);

        // Stack for 16 bit addresses
        this.stack = stack      //new Chip8Array(stackAmt, 16);

        // 16 8 bit general purpose registers
        this.registers = registers; //new Uint8Array(16);

        // 16 bit index register
        this.indexRegister = 0;

        // Load font into memory
        this.loadFont(this._font);

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

        // Wait for the next frame
        this.waitForVBlank = false;

        // Events //

        // If the screem was just updated
        this.VBlank = false;

        // Quirks //
        this.resetQuirks();
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
        this.waitForVBlank = true;
        this.loadFont(this._font);
    }

    resetQuirks() {
        this.quirkshift = false;                    // Shift Vy into Vx
        this.quirkmemoryLeaveIUnchanged = false;    // Leave I unchanged (in save/load instructions)
        this.quirkmemoryIncrementByX = false;       // Increment I by X (in save/load instructions)
        this.quirkwrap = false;                     // sprite wrap
        this.quirkjump = false;                     // jump to <address+vx> instead of <address+v0>
        this.quirklogic = true;                     // reset vf to 0
    }

    updateTimers() {
        this.delayTimer -= (this.delayTimer > 0) * 1;
        this.soundTimer -= (this.soundTimer > 0) * 1;
    }

    updateScreen() {
        this.screen.refresh();
        this.VBlank = true;
        this.waitForVBlank = false;
    }

    /**
     * Process the next instruction
     * @returns {void}
     */
    processNext() {
        if (this.waitForInput) {
            return;
        }
        // if (this.waitForVBlank) {
        //     return;
        // }

        // Fetch 16 bit instruction
        let instruction = this._fetch();
        this.programCounter += 2;

        let executed = this._execute(this._decode(instruction));
        if (!executed) {
            console.warn(`Unknown instruction ${instruction}`);
        }
        this.input.update();
        this.VBlank = false;
    }

    /**
     * Fetch the next instruction from memory
     * @returns {Number}
     */
    _fetch() {
        return this.memory.get(this.programCounter) << 8 | this.memory.get(this.programCounter + 1);
    }

    /**
     * Decode an instruction and return an Instruction object
     * @param {Instruction} instruction 
     */
    _decode(instruction) {
        return new Instruction(instruction);
    }

    /**
     * Execute an instruction
     * @param {Instruction} instruction 
     */
    _execute(instruction) {
        let Vx = this.registers.get(instruction.x);
        let Vy = this.registers.get(instruction.y);
        let i_increment = (this.quirkmemoryLeaveIUnchanged ? 0 : this.quirkmemoryIncrementByX ? (instruction.x) : (instruction.x + 1)) & 0xFFF;
        switch (instruction.type) {
            case 0x0:
                switch (instruction.nnn) {
                    // 00E0
                    case 0x0E0:
                        this.screen.clear();
                        return true;
                    // 00EE
                    case 0x0EE:
                        this.stackPointer = pyModulo((this.stackPointer - 1), 16);
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
                this.stackPointer = pyModulo((this.stackPointer + 1), 16);
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
                this.registers.set(instruction.x, this.registers.get(instruction.x) + instruction.kk);
                return true;

            case 0x8:
                switch (instruction.n) {
                    // 8XY0
                    case 0x0:
                        this.registers.set(instruction.x, Vy);
                        return true;

                    // 8XY1
                    case 0x1:
                        this.registers.set(instruction.x, this.registers.get(instruction.x) | Vy);
                        if (this.quirklogic) {
                            this.registers.set(0xF, 0);
                        }
                        return true;

                    // 8XY2
                    case 0x2:
                        this.registers.set(instruction.x, this.registers.get(instruction.x) & Vy);
                        if (this.quirklogic) {
                            this.registers.set(0xF, 0);
                        }
                        return true;

                    // 8XY3
                    case 0x3:
                        this.registers.set(instruction.x, this.registers.get(instruction.x) ^ Vy);
                        if (this.quirklogic) {
                            this.registers.set(0xF, 0);
                        }
                        return true;

                    // 8XY4
                    case 0x4:
                        this.registers.set(instruction.x, this.registers.get(instruction.x) + Vy);
                        this.registers.set(0xF, (Vx + Vy > 0xFF));
                        return true;

                    // 8XY5
                    case 0x5:
                        this.registers.set(instruction.x, Vx - Vy);
                        this.registers.set(0xF, (Vx > Vy));
                        return true;

                    // 8XY6
                    case 0x6:
                        if (!this.quirkshift) {
                            this.registers.set(instruction.x, this.registers.get(instruction.y));
                        }
                        this.registers.set(instruction.x, this.registers.get(instruction.x) >> 1);
                        this.registers.set(0xF, Vy & 0x1);
                        return true;

                    // 8XY7
                    case 0x7:
                        this.registers.set(instruction.x, Vy - Vx);
                        this.registers.set(0xF, (Vy > Vx));
                        return true;

                    // 8XYE
                    case 0xE:
                        if (!this.quirkshift) {
                            this.registers.set(instruction.x, this.registers.get(instruction.y));
                        }
                        this.registers.set(instruction.x, this.registers.get(instruction.x) << 1);
                        this.registers.set(0xF, (Vy >> 7) & 0x1);
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
            case 0xA:
                this.indexRegister = instruction.nnn;
                return true;

            // BNNN
            case 0xB:
                if (this.quirkjump) {
                    this.programCounter = instruction.nnn + this.registers.get(instruction.x);
                } else {
                    this.programCounter = instruction.nnn + this.registers.get(0);
                }
                return true;

            // CXKK
            case 0xC:
                this.registers.set(instruction.x, Math.floor(Math.random() * 0xFF) & instruction.kk);
                return true;

            // DXYN
            case 0xD:
                // if (!this.VBlank) {
                //     this.waitForVBlank = true;
                //     this.programCounter -= 2;
                //     return true;
                // }
                // this.waitForVBlank = false;
                let screenX = Vx % this.screen.renderWidth;     // Both Vx and renderWidth are positive, so no need to use pymodulo
                let screenY = Vy % this.screen.renderHeight;    // Both Vy and renderHeight are also positive
                let spriteHeight = instruction.n;
                let spriteWidth = 8;
                let yCondition = (this.quirkwrap) ? ((y) => (y < spriteHeight)) : ((y) => (y < spriteHeight && y + screenY < this.screen.renderHeight));
                let xCondition = (this.quirkwrap) ? ((x) => (x < spriteWidth )) : ((x) => (x < spriteWidth  && x + screenX < this.screen.renderWidth ));
                this.registers.set(0xF, 0);

                for (let y = 0; yCondition(y); y++) {
                    let pixel_row = this.memory.get(this.indexRegister + y);
                    for (let x = 0; xCondition(x); x++) {
                        this.registers.set(0xF, this.screen.setPixel((x + screenX), (y + screenY), (pixel_row >> 7) & 0b1) || this.registers.get(0xF));
                        pixel_row <<= 1;
                    }
                }

                return true;

            case 0xE:
                switch (instruction.kk) {
                    // EX9E
                    case 0x9E:
                        if (this.input.isKeyPressed(Vx)) {
                            this.programCounter += 2;
                        }
                        return true;

                    // EXA1
                    case 0xA1:
                        if (!this.input.isKeyPressed(Vx)) {
                            this.programCounter += 2;
                        }
                        return true;
                }
                break;

            case 0xF:
                switch (instruction.kk) {
                    // FX07
                    case 0x07:
                        this.registers.set(instruction.x, this.delayTimer);
                        return true;

                    // FX0A
                    case 0x0A:
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
                    case 0x1E:
                        this.registers.set(0xF, (this.indexRegister + Vx > 0xFFF));
                        this.indexRegister += Vx;
                        return true;

                    // FX29
                    case 0x29:
                        this.indexRegister = Vx * 5 + this.fontOffset;
                        return true;

                    // FX33
                    case 0x33:
                        this.memory.set((this.indexRegister + 0) & 0xFFF, (Vx % 1000) / 100);
                        this.memory.set((this.indexRegister + 1) & 0xFFF, (Vx % 100) / 10);
                        this.memory.set((this.indexRegister + 2) & 0xFFF, (Vx % 10) / 1);
                        return true;

                    // FX55
                    case 0x55:
                        for (let i = 0; i <= instruction.x; i++) {
                            this.memory.set((this.indexRegister + i) & 0xFFF, this.registers.get(i));
                        }

                        // Original CHIP-8 incremented index register by X+1
                        this.indexRegister += i_increment;
                        return true;

                    // FX65
                    case 0x65:
                        for (let i = 0; i <= instruction.x; i++) {
                            this.registers.set(i, this.memory.get((this.indexRegister + i) & 0xFFF));
                        }

                        // Original CHIP-8 incremented index register by X+1
                        this.indexRegister += i_increment;
                        return true;
                }
                break;
        }
        return false;
    }
}
