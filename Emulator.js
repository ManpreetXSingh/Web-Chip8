"use strict";

class Chip8Emulator {
    #processId;
    #time_previous;
    #loadedRom;
    #instructionIdx;
    #oneSecTimer;
    #adjustedTargetFPS;
    #pointersDisplayOptions;
    #timersDisplayOptions;

    #prevStackPointer;
    #prevProgramCounter;

    constructor(fps = 60, ipf = 7) {
        this.targetFps = fps;
        this.#adjustedTargetFPS = fps + 3;
        this.targetFrameInterval = 1000 / this.#adjustedTargetFPS;
        this.FPSCounter = 0;
        this.instructionsPerFrame = ipf;

        this.#processId = null;
        this.#time_previous = 0;
        this.#loadedRom = null;
        this.#instructionIdx = 0;
        this.#oneSecTimer = 0;

        this.createHardware();
    }

    createHardware() {
        let speaker = new Chip8Speaker();
        let screen = new Chip8Screen(document.getElementById("screen"), 5);
        let input = new Chip8Input();
        let memory = new Chip8Array(4096, 8);
        let stack = new Chip8Array(16, 16);
        let registers = new Chip8Array(16, 8);

        this.cpu = new Chip8CPU(screen, input, speaker, C8FONT, memory, stack, registers);
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

    get paused() {
        return this.#processId == null;
    }

    loadRom(rom) {
        if (rom.length > this.memory.length - 0x200) {
            console.error(`Rom is too large. ${rom.length} > ${this.memory.length - 0x200}`);
            return false;
        }
        this.#loadedRom = rom;
        this.cpu.loadRom(rom);
        this.speaker.initialize();

        return true;
    }

    pressKey(key) {
        this.input.pressKey(key);
    }

    releaseKey(key) {
        this.input.releaseKey(key);
    }

    pause() {
        if (this.#processId) {
            clearTimeout(this.#processId);
            // cancelAnimationFrame(this.#processId);
            this.speaker.stop();
            this.#processId = null;
        }
    }

    resume() {
        if (this.#processId == null) {
            this.displayDebugInfo();

            this.#oneSecTimer = 0;
            this.#time_previous = performance.now();

            this.#processId = setTimeout(() => { this.process(window.performance.now()) }, this.targetFrameInterval)
            //requestAnimationFrame(this.process.bind(this));
        }
    }

    killProcess() {
        this.pause();
        this.cpu.resetCPU();
        this.#instructionIdx = 0;
        this.#oneSecTimer = 0;
        if (this.#loadedRom != null) {
            this.cpu.loadRom(this.#loadedRom);
        }
    }

    beginProcess() {
        this.resume();
    }

    step() {
        if (this.#instructionIdx == this.instructionsPerFrame) {
            this.#instructionIdx = 0;
            this.stepFrame();
        } else {
            this.#instructionIdx++;
            this.cpu.processNext();
            this.cpu.updateScreen();
            this.updateDebugInfo();
        }
    }

    stepFrame() {
        this.FPSCounter++;
        for (let i = this.#instructionIdx; i < this.instructionsPerFrame; i++) {
            this.#instructionIdx++;
            this.cpu.processNext();
            // if ((new Instruction(this.cpu._fetch())).type == 0xD) {
            //     i = this.instructionsPerFrame;
            // }
        }
        this.#instructionIdx = 0;
        if (this.cpu.soundTimer <= 0) {
            this.speaker.stop();
        } else {
            this.speaker.start();
        }

        this.cpu.updateScreen();
        this.cpu.updateTimers();
        this.updateDebugInfo();
    }

    process(time) {
        // if (time - this.#time_previous > this.targetFrameInterval) {
        this.#oneSecTimer += time - this.#time_previous;
        this.stepFrame();
        this.#time_previous = time;
        // }
        // console.log("Frame")

        this.#processId = setTimeout(() => { this.process(window.performance.now()) }, this.targetFrameInterval)
        // requestAnimationFrame(this.process.bind(this));
    }

    displayDebugInfo() {
        this.#prevStackPointer = this.stackPointer;
        this.#prevProgramCounter = this.programCounter;

        this.#pointersDisplayOptions = new DisplayTableOptions();
        this.#pointersDisplayOptions.tableName = "Pointers";
        this.#pointersDisplayOptions.vNames = ['PC', 'I', 'SP'];
        this.#pointersDisplayOptions.hNames = ['Value'];
        this.#pointersDisplayOptions.numCols = 1;
        this.#pointersDisplayOptions.bitness = 16;
        this.#pointersDisplayOptions.hAddressVisible = false;
        this.#pointersDisplayOptions.vAddressVisible = false;
        displayTable(pointersTable, [this.programCounter, this.indexRegister, this.stackPointer], this.#pointersDisplayOptions);

        this.#timersDisplayOptions = new DisplayTableOptions();
        this.#timersDisplayOptions.tableName = "Timers";
        this.#timersDisplayOptions.vNames = ['DT', 'ST'];
        this.#timersDisplayOptions.hNames = ['Value'];
        this.#timersDisplayOptions.numCols = 1;
        this.#timersDisplayOptions.bitness = 16;
        this.#timersDisplayOptions.hAddressVisible = false;
        this.#timersDisplayOptions.vAddressVisible = false;
        displayTable(timersTable, [this.delayTimer, this.soundTimer], this.#timersDisplayOptions);

        this.memory.display(memoryTable, 16, "Memory");
        this.stack.display(stackTable, 16, "Stack", ['Value']);
        this.registers.display(registersTable, 16, "Registers", ['Value'], ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'VA', 'VB', 'VC', 'VD', 'VE', 'VF']);

    }

    updateDebugInfo() {
        if (this.#oneSecTimer >= 1000) {
            // Display real FPS and IPS
            let fps = this.FPSCounter * 1000 / this.#oneSecTimer;
            fpsDisplay.textContent = fps.toFixed(1);
            ipsDisplay.textContent = (fps * this.instructionsPerFrame).toFixed(1);
            this.#oneSecTimer = 0;
            this.FPSCounter = 0;

            // Adjust Target Fps
            if (fps - 5 > this.targetFps) {
                this.#adjustedTargetFPS -= 5;
            }
            if (fps + 5 < this.targetFps) {
                this.#adjustedTargetFPS += 5;
            }
            if (Math.abs(fps - this.targetFps) > 1) {
                this.#adjustedTargetFPS = this.#adjustedTargetFPS + (Number(fps < this.targetFps) - Number(fps > this.targetFps));
                this.targetFrameInterval = 1000 / this.#adjustedTargetFPS;
                console.log(`Target Fps Updated: ${this.#adjustedTargetFPS}`);
            }
        }

        updataTable(pointersTable, [this.programCounter, this.indexRegister, this.stackPointer], [0, 1, 2], this.#pointersDisplayOptions);
        updataTable(timersTable, [this.delayTimer, this.soundTimer], [0, 1], this.#timersDisplayOptions);

        // Display Tables
        this.memory.updateDisplay(memoryTable);
        this.stack.updateDisplay(stackTable);
        this.registers.updateDisplay(registersTable);

        // Display Stack Pointer Highlight
        this.stack.removeDisplayAttributes(stackTable, { [this.#prevStackPointer]: ['stack-pointer', 'title'] });
        this.stack.addDisplayAttributes(stackTable, { [this.stackPointer]: { 'stack-pointer': null, "title": `Stack Pointer: {${this.stackPointer}}` } });
        this.#prevStackPointer = this.stackPointer;

        // Display Program Counter Highlight
        this.memory.removeDisplayAttributes(memoryTable, {
            [this.#prevProgramCounter]: ['program-counter', "title"],
            [this.#prevProgramCounter + 1]: ['program-counter', "title"]
        });
        this.memory.addDisplayAttributes(memoryTable, {
            [this.programCounter]: { 'program-counter': null, "title": `Program Counter: {${this.programCounter}}` },
            [this.programCounter + 1]: { 'program-counter': null, "title": `Program Counter: {${this.programCounter}}` }
        });
        this.#prevProgramCounter = this.programCounter;
    }
}
