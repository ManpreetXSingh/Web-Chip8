import Chip8Emulator from "./js/emulator.js";
import Keyboard from "./js/keyboard.js";
import TableRenderer, { TableOptions } from "./js/table_renderer.js";
let chip8 = new Chip8Emulator(60, 20);

// Display Chip8 internal data

var InfoRenderer = (() => {
    let stackTable;
    let memoryTable;
    let registersTable;
    let pointersTable;
    let timersTable;

    let fpsDisplay = document.getElementById("fps");
    let ipsDisplay = document.getElementById("ips");

    let prevStackPointer;
    let prevProgramCounter;

    function displayInfo(emulator) {
        prevStackPointer = emulator.stackPointer;
        prevProgramCounter = emulator.programCounter;

        let pointerOp = new TableOptions();
        pointerOp.tableName = "Pointers";
        pointerOp.vNames = ["PC", "I", "SP"];
        pointerOp.hNames = ["Value"];
        pointerOp.numCols = 1;
        pointerOp.bitness = 16;
        pointersTable = new TableRenderer(
            document.getElementById("pointers-table"),
            pointerOp
        );
        pointersTable.display([
            emulator.programCounter,
            emulator.indexRegister,
            emulator.stackPointer,
        ]);

        let timerOp = new TableOptions();
        timerOp.tableName = "Timers";
        timerOp.vNames = ["DT", "ST"];
        timerOp.hNames = ["Value"];
        timerOp.numCols = 1;
        timerOp.bitness = 16;
        timersTable = new TableRenderer(
            document.getElementById("timers-table"),
            timerOp
        );
        timersTable.display([emulator.delayTimer, emulator.soundTimer]);

        let memoryOp = new TableOptions();
        memoryOp.tableName = "Memory";
        memoryOp.numCols = 16;
        memoryOp.bitness = emulator.memory.bitness;
        memoryTable = new TableRenderer(
            document.getElementById("memory-table"),
            memoryOp
        );
        memoryTable.display(emulator.memory.underlyingArray);

        let stackOp = new TableOptions();
        stackOp.tableName = "Stack";
        stackOp.numCols = 16;
        stackOp.bitness = emulator.stack.bitness;
        stackOp.vNames = ["Value"];
        stackTable = new TableRenderer(
            document.getElementById("stack-table"),
            stackOp
        );
        stackTable.display(emulator.stack.underlyingArray);

        let registerOp = new TableOptions();
        registerOp.tableName = "Registers";
        registerOp.numCols = 16;
        registerOp.bitness = emulator.registers.bitness;
        registerOp.vNames = ["Value"];
        registerOp.hNames = [
            "V0",
            "V1",
            "V2",
            "V3",
            "V4",
            "V5",
            "V6",
            "V7",
            "V8",
            "V9",
            "VA",
            "VB",
            "VC",
            "VD",
            "VE",
            "VF",
        ];
        registersTable = new TableRenderer(
            document.getElementById("registers-table"),
            registerOp
        );
        registersTable.display(emulator.registers.underlyingArray);
    }

    function updateInfo(emulator) {
        fpsDisplay.textContent = emulator.fps.toFixed(1);
        ipsDisplay.textContent = emulator.ips.toFixed(1);

        // Display tables
        pointersTable.update(
            [
                emulator.programCounter,
                emulator.indexRegister,
                emulator.stackPointer,
            ],
            [-1]
        );
        timersTable.update([emulator.delayTimer, emulator.soundTimer], [-1]);
        memoryTable.update(
            emulator.memory.underlyingArray,
            emulator.memory.updates
        );
        stackTable.update(
            emulator.stack.underlyingArray,
            emulator.stack.updates
        );
        registersTable.update(
            emulator.registers.underlyingArray,
            emulator.registers.updates
        );

        // Display stack pointer highlight
        stackTable.removeAttributes({
            [prevStackPointer]: ["stack-pointer", "title"],
        });
        stackTable.addAttributes({
            [emulator.stackPointer]: {
                "stack-pointer": null,
                title: `Stack Pointer: {${emulator.stackPointer}}`,
            },
        });
        prevStackPointer = emulator.stackPointer;

        // Display program counter highlight
        memoryTable.removeAttributes({
            [prevProgramCounter]: ["program-counter", "title"],
            [prevProgramCounter + 1]: ["program-counter", "title"],
        });
        memoryTable.addAttributes({
            [emulator.programCounter]: {
                "program-counter": null,
                title: `Program Counter: {${emulator.programCounter}}`,
            },
            [emulator.programCounter + 1]: {
                "program-counter": null,
                title: `Program Counter: {${emulator.programCounter}}`,
            },
        });
        prevProgramCounter = emulator.programCounter;
    }

    return {
        displayInfo: displayInfo,
        updateInfo: updateInfo,
    };
})();

InfoRenderer.displayInfo(chip8);
chip8.updateDisplay = InfoRenderer.updateInfo.bind(null, chip8);

// Load JSON
function loadJson(filePath, onLoad) {
    if (!filePath || !onLoad) {
        return;
    }

    let request = new XMLHttpRequest();
    request.onload = function () {
        if (!request.response) {
            console.log("Error loading JSON");
            return;
        }
        onLoad(JSON.parse(request.response));
    };
    request.open("GET", filePath, true);
    request.responseType = "text";
    request.send();
}

// Load a file as a Uint8Array
function loadFileU8(filePath, onLoad) {
    if (!filePath || !onLoad) {
        return;
    }

    let request = new XMLHttpRequest();
    request.onload = function () {
        if (!request.response) {
            console.log("Error loading rom");
            return;
        }
        let rom = new Uint8Array(request.response);
        onLoad(rom);
    };
    request.open("GET", filePath, true);
    request.responseType = "arraybuffer";
    request.send();
}

// Controls

let playPauseBtn = document.getElementById("play-pause-btn");

function resume() {
    playPauseBtn.textContent = "pause";
    chip8.resume();
}

function pause() {
    playPauseBtn.textContent = "play_arrow";
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
    playPauseBtn.textContent = "play_arrow";
    chip8.killProcess();
    chip8.updateDisplay();
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

function runRom(rom) {
    playPauseBtn.textContent = "pause";
    chip8.killProcess();
    if (!chip8.loadRom(rom)) {
        return;
    }
    chip8.beginProcess();
}

// Pause/Resume based on page visibility
function handleVisibilityChange() {
    if (document.hidden) {
        pause();
    }
    // resume();
}

playPauseBtn.addEventListener("click", playPause);
document.addEventListener("visibilitychange", handleVisibilityChange);
document.getElementById("replay-btn").addEventListener("click", replay);
document.getElementById("step-btn").addEventListener("click", step);
document.getElementById("step-frame-btn").addEventListener("click", stepFrame);

// Load Rom List

let romList = document.getElementById("rom-list");
let loadRomWindow = document.getElementById("load-rom-window");
let uploadRomWindow = document.getElementById("upload-rom-window");
let romsJSON;

function runRomByName(name) {
    let romsrc = `./chip8Archive/roms/${name}.ch8`;

    chip8.screen.fillColor = romsJSON[name]["options"]["fillColor"]
        ? romsJSON[name]["options"]["fillColor"]
        : "#FFFFFF";
    chip8.screen.backgroundColor = romsJSON[name]["options"]["backgroundColor"]
        ? romsJSON[name]["options"]["backgroundColor"]
        : "#000000";
    chip8.instructionsPerFrame = romsJSON[name]["options"]["tickrate"];
    updateSettingsUI();

    chip8.cpu.resetQuirks();
    chip8.cpu.quirkmemoryLeaveIUnchanged =
        "loadStoreQuirks" in romsJSON[name]["options"]
            ? romsJSON[name]["options"]["loadStoreQuirks"]
            : chip8.cpu.quirkmemoryLeaveIUnchanged;
    chip8.cpu.quirkmemoryIncrementByX = chip8.cpu.quirkmemoryLeaveIUnchanged
        ? false
        : chip8.cpu.quirkmemoryIncrementByX;
    chip8.cpu.quirkshift =
        "shiftQuirks" in romsJSON[name]["options"]
            ? romsJSON[name]["options"]["shiftQuirks"]
            : chip8.cpu.quirkshift;
    chip8.cpu.quirkjump =
        "jumpQuirks" in romsJSON[name]["options"]
            ? romsJSON[name]["options"]["jumpQuirks"]
            : chip8.cpu.quirkjump;
    chip8.cpu.quirkwrap =
        "clipQuirks" in romsJSON[name]["options"]
            ? !romsJSON[name]["options"]["clipQuirks"]
            : chip8.cpu.quirkwrap;
    chip8.cpu.quirklogic =
        "logicQuirks" in romsJSON[name]["options"]
            ? romsJSON[name]["options"]["logicQuirks"]
            : chip8.cpu.quirklogic;
    updateQuirksUI();

    loadFileU8(romsrc, (rom) => {
        hideLoadRomWindow();
        runRom(rom);
    });
}

function romCard(name, imgsrc, romAuthors, description, event) {
    let authorLinks = "";
    for (const author in romAuthors) {
        if (romAuthors.hasOwnProperty(author)) {
            if (romAuthors[author].url) {
                authorLinks += `<a href="${romAuthors[author].url}" target="_blank" rel="noopener noreferrer">${author}</a>`;
            } else {
                authorLinks += author;
            }
        }
    }

    return `<div class="rom-card" title="${description}" card-name="${name}">
                <img src="${imgsrc}" alt="${name}">
                <div class="rom-card-title">${name}</div>
                <div class="rom-card-author-event">
                    ${authorLinks}
                    ${event ? ` • ${event}` : ""}
                </div>
            </div>`;
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

                    let romAuthors = {};
                    for (const i in roms[key].authors) {
                        let author =
                            roms[key].authors[i] != "your name here"
                                ? roms[key].authors[i]
                                : "Unknown";
                        romAuthors[author] = authors[roms[key].authors[i]];
                    }

                    romList.innerHTML += romCard(
                        key, // rom name
                        `./chip8Archive/src/${key}/${roms[key].images[0]}`, // image url
                        romAuthors, // authors
                        roms[key].desc, // description
                        roms[key].event // event
                    );
                }
            }
            romList.querySelectorAll(".rom-card").forEach((card) => {
                card.onclick = (e) => {
                    let romName = card.getAttribute("card-name");
                    runRomByName(romName);
                    e.stopPropagation();
                };
            });
            romList.querySelectorAll("a").forEach((a) => {
                a.onclick = (e) => {
                    e.stopPropagation();
                };
            });
        });
    });
}

loadRomsList();

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
document
    .getElementById("load-rom-btn")
    .addEventListener("click", showLoadRomWindow);
document
    .getElementById("close-load-rom-window-btn")
    .addEventListener("click", hideLoadRomWindow);
loadRomWindow.addEventListener("click", hideLoadRomWindow);
loadRomWindow.firstChild.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document
    .getElementById("upload-rom-btn")
    .addEventListener("click", showUploadRomWindow);
uploadRomWindow.addEventListener("click", hideUploadRomWindow);

// Drag and drop rom file

let dragLeaveTimeout;

document.querySelector("body").addEventListener("dragenter", dragEnterHandler);
document.querySelector("body").addEventListener("dragleave", dragLeaveHandler);
document.querySelector("body").addEventListener("drop", dropCancelHandler);
document.querySelector("body").addEventListener("dragover", dragOverHandler);
document
    .getElementById("upload-rom-window")
    .addEventListener("drop", dropHandler);

function dropHandler(ev) {
    function onLoad(e2) {
        uploadRomWindow.classList.remove("window-active");
        let rom = new Uint8Array(e2.target.result);
        runRom(rom);
    }

    // Prevent default behavior
    ev.preventDefault();
    ev.stopPropagation();

    if (ev.dataTransfer.items) {
        for (const fileIdx in ev.dataTransfer.items) {
            let item = ev.dataTransfer.items[fileIdx];

            if (!(item.kind === "file")) {
                continue;
            }

            const file = item.getAsFile();
            let reader = new FileReader();

            reader.onload = onLoad;
            reader.readAsArrayBuffer(file);
            return;
        }
    } else {
        const file = ev.dataTransfer.files[0];
        let reader = new FileReader();

        reader.onload = onLoad;
        reader.readAsArrayBuffer(file);
    }
}

function dropCancelHandler(ev) {
    uploadRomWindow.classList.remove("window-active");
}

function dragEnterHandler(ev) {
    if (![...ev.dataTransfer.types].includes("Files")) {
        return;
    }
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
        }, 500);
    }
}

// Quirks & Settings

let quirkCheckboxes = document
    .getElementById("quirk-checkboxes")
    .querySelectorAll('input[type="checkbox"]');

function updateQuirksUI() {
    for (let i = 0; i < quirkCheckboxes.length; i++) {
        let quirkName = quirkCheckboxes[i].name;
        let quirkValue;

        switch (quirkName) {
            case "quirkshift":
                quirkValue = chip8.cpu.quirkshift;
                break;
            case "quirkmemoryLeaveIUnchanged":
                quirkValue = chip8.cpu.quirkmemoryLeaveIUnchanged;
                break;
            case "quirkmemoryIncrementByX":
                quirkValue = chip8.cpu.quirkmemoryIncrementByX;
                break;
            case "quirkjump":
                quirkValue = chip8.cpu.quirkjump;
                break;
            case "quirkwrap":
                quirkValue = chip8.cpu.quirkwrap;
                break;
            case "quirklogic":
                quirkValue = chip8.cpu.quirklogic;
                break;
        }
        quirkCheckboxes[i].checked = quirkValue;
    }
}

let settingsInputs = document
    .getElementById("settings-inputs")
    .querySelectorAll("input");

function updateSettingsUI() {
    for (let i = 0; i < settingsInputs.length; i++) {
        let settingName = settingsInputs[i].name;
        let settingValue;

        switch (settingName) {
            case "screen-scale":
                settingValue = chip8.screen.resScale;
                break;
            case "target-fps":
                settingValue = chip8.targetFps;
                break;
            case "target-ipf":
                settingValue = chip8.instructionsPerFrame;
                break;
            case "bg-color":
                settingValue = chip8.screen.backgroundColor;
                break;
            case "fg-color":
                settingValue = chip8.screen.fillColor;
                break;
        }
        settingsInputs[i].value = settingValue;
    }
}

for (let checkbox of quirkCheckboxes) {
    checkbox.addEventListener("change", function (e) {
        let quirkName = this.name;
        let quirkValue = this.checked;

        switch (quirkName) {
            case "quirkshift":
                chip8.cpu.quirkshift = quirkValue;
                break;
            case "quirkmemoryLeaveIUnchanged":
                chip8.cpu.quirkmemoryLeaveIUnchanged = quirkValue;
                chip8.cpu.quirkmemoryIncrementByX = quirkValue
                    ? false
                    : chip8.cpu.quirkmemoryIncrementByX;
                break;
            case "quirkmemoryIncrementByX":
                chip8.cpu.quirkmemoryIncrementByX = quirkValue;
                chip8.cpu.quirkmemoryLeaveIUnchanged = quirkValue
                    ? false
                    : chip8.cpu.quirkmemoryLeaveIUnchanged;
                break;
            case "quirkjump":
                chip8.cpu.quirkjump = quirkValue;
                break;
            case "quirkwrap":
                chip8.cpu.quirkwrap = quirkValue;
                break;
            case "quirklogic":
                chip8.cpu.quirklogic = quirkValue;
                break;
        }
        updateQuirksUI();
    });
}

for (let setting of settingsInputs) {
    setting.addEventListener("input", function (e) {
        let settingName = this.name;
        let settingValue = this.value;

        switch (settingName) {
            case "screen-scale":
                chip8.screen.updateResScale(settingValue);
                chip8.screen.forceRefresh();
                break;
            case "target-fps":
                chip8.targetFps = settingValue;
                break;
            case "target-ipf":
                chip8.instructionsPerFrame = settingValue;
                break;
            case "bg-color":
                chip8.screen.backgroundColor = settingValue;
                chip8.screen.forceRefresh();
                break;
            case "fg-color":
                chip8.screen.fillColor = settingValue;
                chip8.screen.forceRefresh();
                break;
        }
        updateSettingsUI();
    });
}

updateSettingsUI();
updateQuirksUI();

// Keyboard

let keyboard = new Keyboard(
    [
        "1",
        "2",
        "3",
        "C",
        "4",
        "5",
        "6",
        "D",
        "7",
        "8",
        "9",
        "E",
        "A",
        "0",
        "B",
        "F",
    ],
    {
        1: ["1"],
        2: ["2"],
        3: ["3"],
        C: ["4"],
        4: ["q"],
        5: ["w"],
        6: ["e"],
        D: ["r"],
        7: ["a"],
        8: ["s"],
        9: ["d"],
        E: ["f"],
        A: ["z"],
        0: ["x"],
        B: ["c"],
        F: ["v"],
    },
    4
);

// Virtual keyboard events
let keyboardContainer = document.getElementById("keyboard-container");
let showHideKeyboardButton = document.getElementById("show-hide-keyboard-btn");
let main = document.querySelector("main");
keyboard.draw(keyboardContainer);

showHideKeyboardButton.addEventListener("click", () => {
    if (!keyboardContainer.classList.contains("keyboard-active")) {
        keyboardContainer.classList.add("keyboard-active");
        main.classList.add("keyboard-active");
        showHideKeyboardButton.textContent = "Hide Keyboard";
    } else {
        keyboardContainer.classList.remove("keyboard-active");
        main.classList.remove("keyboard-active");
        showHideKeyboardButton.textContent = "Show Keyboard";
    }
});

keyboard.onkeydown = chip8.pressKey.bind(chip8);
keyboard.onkeyup = chip8.releaseKey.bind(chip8);
