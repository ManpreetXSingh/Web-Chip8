"use strict";

const C8FONT = {
    "0": [0xF0, 0x90, 0x90, 0x90, 0xF0],
    "1": [0x20, 0x60, 0x20, 0x20, 0x70],
    "2": [0xF0, 0x10, 0xF0, 0x80, 0xF0],
    "3": [0xF0, 0x10, 0xF0, 0x10, 0xF0],
    "4": [0x90, 0x90, 0xF0, 0x10, 0x10],
    "5": [0xF0, 0x80, 0xF0, 0x10, 0xF0],
    "6": [0xF0, 0x80, 0xF0, 0x90, 0xF0],
    "7": [0xF0, 0x10, 0x20, 0x40, 0x40],
    "8": [0xF0, 0x90, 0xF0, 0x90, 0xF0],
    "9": [0xF0, 0x90, 0xF0, 0x10, 0xF0],
    "A": [0xF0, 0x90, 0xF0, 0x90, 0x90],
    "B": [0xE0, 0x90, 0xE0, 0x90, 0xE0],
    "C": [0xF0, 0x80, 0x80, 0x80, 0xF0],
    "D": [0xE0, 0x90, 0x90, 0x90, 0xE0],
    "E": [0xF0, 0x80, 0xF0, 0x80, 0xF0],
    "F": [0xF0, 0x80, 0x80, 0xF0, 0x80]
};

// Load JSON
function loadJson(file_path, on_load) {
    if (!file_path || !on_load) {
        return;
    }

    var request = new XMLHttpRequest();
    request.onload = function () {
        if (!request.response) {
            console.log("Error loading JSON");
            return;
        }
        on_load(JSON.parse(request.response));
    }
    request.open('GET', file_path, true);
    request.responseType = 'text';
    request.send();
}

// Load a file as a Uint8Array
function loadFileU8(file_path, on_load) {
    if (!file_path || !on_load) {
        return;
    }

    var request = new XMLHttpRequest();
    request.onload = function () {
        if (!request.response) {
            console.log("Error loading rom");
            return;
        }
        var rom = new Uint8Array(request.response);
        on_load(rom);
    }
    request.open('GET', file_path, true);
    request.responseType = 'arraybuffer';
    request.send();
}


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
        var speaker = new Chip8Speaker();
        var screen = new Chip8Screen(document.getElementById("screen"), 5);
        var input = new Chip8Input();
        var memory = new Chip8Array(4096, 8);
        var stack = new Chip8Array(16, 16);
        var registers = new Chip8Array(16, 8);

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

    pressKey(key) {
        this.input.pressKey(key);
    }

    releaseKey(key) {
        this.input.releaseKey(key);
    }

    loadRom(rom) {
        if (rom.length > this.memory.length - 0x200) {
            console.error(`Rom is too large. ${rom.length} > ${this.memory.length - 0x200}`);
            return false;
        }
        this.#loadedRom = rom;
        this.cpu.loadRom(rom);

        return true;
    }

    pause() {
        if (this.#processId) {
            cancelAnimationFrame(this.#processId);
            this.speaker.stop();
            this.#processId = null;
        }
    }

    resume() {
        if (this.#processId == null) {
            this.displayDebugInfo();

            this.#oneSecTimer = 0;
            this.#time_previous = performance.now();

            this.#processId = requestAnimationFrame(this.process.bind(this));
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
        if (time - this.#time_previous > this.targetFrameInterval) {
            this.#oneSecTimer += time - this.#time_previous;
            this.stepFrame();
            this.#time_previous = time;
        }

        this.#processId = requestAnimationFrame(this.process.bind(this));
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
            var fps = this.FPSCounter * 1000 / this.#oneSecTimer;
            fpsDisplay.textContent = fps.toFixed(1);
            ipsDisplay.textContent = (fps * this.instructionsPerFrame).toFixed(1);
            this.#oneSecTimer = 0;
            this.FPSCounter = 0;

            // Adjust Target Fps
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

// Controls

function resume() {
    playPauseBtn.textContent = 'pause';
    chip8.resume();
}

function pause() {
    playPauseBtn.textContent = 'play_arrow';
    chip8.pause();
}

function playPause() {
    if (chip8.paused) {
        resume();
    } else {
        pause();
    }
}

function replay() {
    playPauseBtn.textContent = 'play_arrow';
    chip8.killProcess();
    chip8.displayDebugInfo();
}

function step() {
    if (chip8.paused) {
        chip8.step();
    }
}

function stepFrame() {
    if (chip8.paused) {
        chip8.stepFrame();
    }
}

// Pause/Resume based on page visibility

function handleVisibilityChange() {
    if (document.hidden) {
        pause();
    }
    // resume();
}

document.addEventListener("visibilitychange", handleVisibilityChange);


// Load Rom List

let romList = document.getElementById("rom-list");
let loadRomWindow = document.getElementById("load-rom-window");
let uploadRomWindow = document.getElementById("upload-rom-window");
let romsJSON;

function runRomByName(name) {
    let romsrc = `./chip8Archive/roms/${name}.ch8`;

    chip8.screen.fillColor = romsJSON[name]["options"]["fillColor"] ? romsJSON[name]["options"]["fillColor"] : "#FFFFFF";
    chip8.screen.backgroundColor = romsJSON[name]["options"]["backgroundColor"] ? romsJSON[name]["options"]["backgroundColor"] : "#000000";
    chip8.instructionsPerFrame = romsJSON[name]["options"]["tickrate"];

    chip8.cpu.resetQuirks();
    chip8.cpu.quirkshift = romsJSON[name]["options"]["shiftQuirks"] ? romsJSON[name]["options"]["shiftQuirks"] : chip8.cpu.quirkshift;
    chip8.cpu.quirkmemoryLeaveIUnchanged = romsJSON[name]["options"]["loadStoreQuirks"] ? romsJSON[name]["options"]["loadStoreQuirks"] : chip8.cpu.quirkmemoryLeaveIUnchanged;
    chip8.cpu.quirkjump = romsJSON[name]["options"]["jumpQuirks"] ? romsJSON[name]["options"]["jumpQuirks"] : chip8.cpu.quirkjump;
    chip8.cpu.quirkwrap = romsJSON[name]["options"]["clipQuirks"] ? !(romsJSON[name]["options"]["clipQuirks"]) : chip8.cpu.quirkwrap;
    chip8.cpu.quirklogic = romsJSON[name]["options"]["logicQuirks"] ? romsJSON[name]["options"]["logicQuirks"] : chip8.cpu.quirklogic;

    loadFileU8(romsrc, (rom) => {
        hideLoadRomWindow();
        runRom(rom);
    });
}

function romCard(name, imgsrc, romAuthors, description, event) {
    var authorLinks = "";
    for (const author in romAuthors) {
        if (romAuthors.hasOwnProperty(author)) {
            if (romAuthors[author].url) {
                authorLinks += `<a href="${romAuthors[author].url}" target="_blank" rel="noopener noreferrer">${author}</a>`;
            } else {
                authorLinks += author;
            }
        }
    }

    return (
        `<div class="rom-card" title="${description}" onclick="runRomByName('${name}')">
            <img src="${imgsrc}" alt="${name}">
            <div class="rom-card-title">${name}</div>
            <div class="rom-card-author-event">
                ${authorLinks}
                ${((event) ? ` • ${event}` : "")}
            </div>
        </div>`
    )
}

// Load a list of roms from a json file
function loadRomsList() {
    loadJson("./chip8Archive/authors.json", (authors) => {
        loadJson("./chip8Archive/programs.json", (roms) => {
            romsJSON = roms;
            for (const key in roms) {
                if (roms.hasOwnProperty(key)) {
                    if (roms[key].platform != "chip8") {
                        continue;
                    }

                    var romAuthors = {};
                    for (const i in roms[key].authors) {
                        var author = (roms[key].authors[i] != "your name here") ? roms[key].authors[i] : "Unknown";
                        romAuthors[author] = authors[roms[key].authors[i]];
                    }

                    romList.innerHTML += romCard(
                        key,                                                // rom name
                        `./chip8Archive/src/${key}/${roms[key].images[0]}`, // image url
                        romAuthors,                                         // authors
                        roms[key].desc,                                     // description
                        roms[key].event                                     // event
                    );
                }
            }
            romList.querySelectorAll("a").forEach((a) => {
                a.onclick = (e) => {
                    e.stopPropagation();
                }
            })
        });
    });
}


// Show Hide Windows

function showWindow(windowElement) {
    windowElement.classList.add("window-active");
}

function hideWindow(windowElement) {
    windowElement.classList.remove("window-active");
}

function showLoadRomWindow() {
    showWindow(loadRomWindow);
}

function hideLoadRomWindow() {
    hideWindow(loadRomWindow);
}

function showUploadRomWindow() {
    showWindow(uploadRomWindow);
}

function hideUploadRomWindow() {
    hideWindow(uploadRomWindow);
}


loadRomWindow.addEventListener("click", hideLoadRomWindow);
loadRomWindow.firstChild.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
});

uploadRomWindow.addEventListener("click", hideUploadRomWindow);


// Drag and drop rom

var dragLeaveTimeout;

document.querySelector("body").addEventListener("dragenter", dragEnterHandler);
document.querySelector("body").addEventListener("dragleave", dragLeaveHandler);
document.querySelector("body").addEventListener("drop", dropCancelHandler);
document.querySelector("body").addEventListener("dragover", dragOverHandler);

function dropHandler(ev) {
    function onLoad(e2) {
        uploadRomWindow.classList.remove("window-active");
        var rom = new Uint8Array(e2.target.result);
        runRom(rom);
    }

    // Prevent default behavior
    ev.preventDefault();
    ev.stopPropagation();

    if (ev.dataTransfer.items) {
        for (const fileIdx in ev.dataTransfer.items) {
            var item = ev.dataTransfer.items[fileIdx];

            if (!(item.kind === "file")) {
                continue;
            }

            const file = item.getAsFile();
            var reader = new FileReader();

            reader.onload = onLoad;
            reader.readAsArrayBuffer(file);
            return;
        }
    } else {
        const file = ev.dataTransfer.files[0]
        var reader = new FileReader();

        reader.onload = onLoad;
        reader.readAsArrayBuffer(file);
    }
}

function dropCancelHandler(ev) {
    uploadRomWindow.classList.remove("window-active");
}

function dragEnterHandler(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    uploadRomWindow.classList.add("window-active");
}

function dragOverHandler(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    if (dragLeaveTimeout != null) {
        clearTimeout(dragLeaveTimeout);
        dragLeaveTimeout = null;
    }
}

function dragLeaveHandler(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    if (!dragLeaveTimeout) {
        dragLeaveTimeout = setTimeout(() => {
            uploadRomWindow.classList.remove("window-active");
        }, 500)
    }
}


// Main

let stackTable = document.getElementById("stack-table");
let memoryTable = document.getElementById("memory-table");
let registersTable = document.getElementById("registers-table");
let pointersTable = document.getElementById("pointers-table");
let timersTable = document.getElementById("timers-table");
let fpsDisplay = document.getElementById("fps");
let ipsDisplay = document.getElementById("ips");

let playPauseBtn = document.getElementById("play-pause");

let chip8 = new Chip8Emulator();
function runRom(rom) {
    playPauseBtn.textContent = 'pause';
    chip8.killProcess();
    if (!chip8.loadRom(rom)) {
        return;
    }
    chip8.beginProcess();
}

window.onload = function () {
    chip8.displayDebugInfo();

    // Virtual Keyboard Events

    let virtualKeyboard = document.getElementById("keyboard");
    let virtualKeys = virtualKeyboard.querySelectorAll('button');

    for (let btnIdx = 0; virtualKeys[btnIdx]; btnIdx++) {
        virtualKeys[btnIdx].addEventListener('mousedown', function (e) {
            console.log("Pressed: " + this.attributes.key.value);
            chip8.pressKey(this.attributes.key.value);
        });
        virtualKeys[btnIdx].addEventListener('touchstart', function (e) {
            // e.preventDefault();
            console.log("Pressed: " + this.attributes.key.value);
            chip8.pressKey(this.attributes.key.value);
        });

        virtualKeys[btnIdx].addEventListener('mouseup', function (e) {
            console.log("Released: " + this.attributes.key.value);
            chip8.releaseKey(this.attributes.key.value);
        })
        virtualKeys[btnIdx].addEventListener('touchend', function (e) {
            // e.preventDefault();
            console.log("Released: " + this.attributes.key.value);
            chip8.releaseKey(this.attributes.key.value);
        })
    }

    loadRomsList();
}
