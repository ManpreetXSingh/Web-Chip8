// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/svc_worker.js").then(function () {
    console.log("Service Worker Registered");
  });
}

// Main
import Chip8Emulator from "./js/emulator.js";
import Keyboard from "./js/keyboard.js";
import Popup from "./js/popup.js";
import TableRenderer, { TableOptions } from "./js/table_renderer.js";
let chip8 = new Chip8Emulator(document.getElementById("screen"), 60, 20);

// Display Chip8 internal data

let InfoRenderer = (() => {
  let pointersTable = new TableRenderer(
    document.getElementById("pointers-table"),
    new TableOptions(),
  );
  let timersTable = new TableRenderer(
    document.getElementById("timers-table"),
    new TableOptions(),
  );
  let memoryTable = new TableRenderer(
    document.getElementById("memory-table"),
    new TableOptions(),
  );
  let stackTable = new TableRenderer(
    document.getElementById("stack-table"),
    new TableOptions(),
  );
  let registersTable = new TableRenderer(
    document.getElementById("registers-table"),
    new TableOptions(),
  );

  let fpsDisplay = document.getElementById("fps");
  let ipsDisplay = document.getElementById("ips");

  let prevStackPointer;
  let prevProgramCounter;

  function displayInfo(emulator) {
    prevStackPointer = emulator.stackPointer;
    prevProgramCounter = emulator.programCounter;

    pointersTable.displayOptions.tableName = "Pointers";
    pointersTable.displayOptions.vNames = ["PC", "I", "SP"];
    pointersTable.displayOptions.hNames = ["Value"];
    pointersTable.displayOptions.numCols = 1;
    pointersTable.displayOptions.bitness = 16;
    pointersTable.display([
      emulator.programCounter,
      emulator.indexRegister,
      emulator.stackPointer,
    ]);

    timersTable.displayOptions.tableName = "Timers";
    timersTable.displayOptions.vNames = ["DT", "ST"];
    timersTable.displayOptions.hNames = ["Value"];
    timersTable.displayOptions.numCols = 1;
    timersTable.displayOptions.bitness = 16;
    timersTable.display([emulator.delayTimer, emulator.soundTimer]);

    memoryTable.displayOptions.tableName = "Memory";
    memoryTable.displayOptions.numCols = 16;
    memoryTable.displayOptions.bitness = emulator.memory.bitness;
    memoryTable.display(emulator.memory.underlyingArray);

    stackTable.displayOptions.tableName = "Stack";
    stackTable.displayOptions.numCols = 16;
    stackTable.displayOptions.bitness = emulator.stack.bitness;
    stackTable.displayOptions.vNames = ["Value"];
    stackTable.display(emulator.stack.underlyingArray);

    registersTable.displayOptions.tableName = "Registers";
    registersTable.displayOptions.numCols = 16;
    registersTable.displayOptions.bitness = emulator.registers.bitness;
    registersTable.displayOptions.vNames = ["Value"];
    registersTable.displayOptions.hNames = [
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
    registersTable.display(emulator.registers.underlyingArray);
  }

  function updateInfo(emulator) {
    fpsDisplay.textContent = emulator.fps.toFixed(1);
    ipsDisplay.textContent = emulator.ips.toFixed(1);

    // Display tables
    pointersTable.update(
      [emulator.programCounter, emulator.indexRegister, emulator.stackPointer],
      [-1],
    );
    timersTable.update([emulator.delayTimer, emulator.soundTimer], [-1]);
    memoryTable.update(
      emulator.memory.underlyingArray,
      emulator.memory.updates,
    );
    stackTable.update(emulator.stack.underlyingArray, emulator.stack.updates);
    registersTable.update(
      emulator.registers.underlyingArray,
      emulator.registers.updates,
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

async function loadJson(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    console.log("Error loading JSON");
    return null;
  }
  return response.json();
}

async function loadFileU8(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    console.log("Error loading rom");
    return null;
  }
  return new Uint8Array(await response.arrayBuffer());
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
let romsJSON;

async function runRomByName(name) {
  const romsrc = `./chip8Archive/roms/${name}.ch8`;
  pause();
  loadRomWindow.hide();

  const rom = await loadFileU8(romsrc);
  if (!rom) return;

  const cpu = chip8.cpu;
  const options = romsJSON[name]["options"];
  chip8.screen.fillColor = options["fillColor"]
    ? options["fillColor"]
    : "#FFFFFF";
  chip8.screen.backgroundColor = options["backgroundColor"]
    ? options["backgroundColor"]
    : "#000000";
  chip8.instructionsPerFrame = options["tickrate"];
  updateSettingsUI();

  const OPTION_TO_QUIRK = {
    loadStoreQuirks: "quirkMemoryLeaveIUnchanged",
    shiftQuirks: "quirkShift",
    jumpQuirks: "quirkJump",
    logicQuirks: "quirkLogic",
    vBlankQuirks: "quirkVBlank",
  };

  cpu.resetQuirks();
  for (const [optKey, quirkKey] of Object.entries(OPTION_TO_QUIRK)) {
    if (optKey in options) cpu.quirks[quirkKey] = options[optKey];
  }
  if ("clipQuirks" in options) cpu.quirks.quirkWrap = !options["clipQuirks"];
  if (cpu.quirks.quirkMemoryLeaveIUnchanged)
    cpu.quirks.quirkMemoryIncrementByX = false;
  updateQuirksUI();
  runRom(rom);
}

function romCard(name, imgsrc, romAuthors, description, event) {
  let authorLinks = "";
  for (const author in romAuthors) {
    if (romAuthors.hasOwnProperty(author)) {
      if (romAuthors[author].url) {
        authorLinks += `<a href="${romAuthors[author].url}" target="_blank" rel="noopener noreferrer">${author}</a> `;
      } else {
        authorLinks += `${author} `;
      }
    }
  }

  return `<div class="rom-card" title="${description}" card-name="${name}" tabindex="0">
                <img loading="lazy" src="${imgsrc}" alt="${name}">
                <div class="rom-card-title">${name}</div>
                <div class="rom-card-author-event">
                    ${authorLinks}
                    ${event ? ` • ${event}` : ""}
                </div>
            </div>`;
}

// Load a list of roms from a json file
async function loadRomsList() {
  const authors = await loadJson("./chip8Archive/authors.json");
  const roms = await loadJson("./chip8Archive/programs.json");
  if (!authors || !roms) return;

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
        key,
        `./chip8Archive/src/${key}/${roms[key].images[0]}`,
        romAuthors,
        roms[key].desc,
        roms[key].event,
      );
    }
  }
  romList.querySelectorAll(".rom-card").forEach((card) => {
    let onCardClicked = (e) => {
      let romName = card.getAttribute("card-name");
      runRomByName(romName);
      e.stopPropagation();
    };
    card.onclick = onCardClicked;
    card.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        e.target.click();
      }
    };
  });
  romList.querySelectorAll("a").forEach((a) => {
    // prevent loading rom when a link is clicked
    a.onclick = (e) => {
      e.stopPropagation();
    };
  });
}

loadRomsList();

// Show Hide Windows

let loadRomWindow = new Popup(document.getElementById("load-rom-window"));
let uploadRomWindow = new Popup(document.getElementById("upload-rom-window"));

document.getElementById("load-rom-btn").addEventListener("click", () => {
  loadRomWindow.show();
});
document
  .getElementById("close-load-rom-window-btn")
  .addEventListener("click", () => {
    loadRomWindow.hide();
  });
loadRomWindow.htmlElement.addEventListener("click", () => {
  loadRomWindow.hide();
});
loadRomWindow.htmlElement.firstChild.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.getElementById("upload-rom-btn").addEventListener("click", () => {
  uploadRomWindow.show();
});
uploadRomWindow.htmlElement.addEventListener("click", () => {
  uploadRomWindow.hide();
});

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
    uploadRomWindow.hide();
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
  uploadRomWindow.hide();
}

function dragEnterHandler(ev) {
  if (![...ev.dataTransfer.types].includes("Files")) {
    return;
  }
  ev.preventDefault();
  ev.stopPropagation();

  uploadRomWindow.show();
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
      uploadRomWindow.hide();
    }, 500);
  }
}

// Quirks & Settings

let quirkCheckboxes = document
  .getElementById("quirk-checkboxes")
  .querySelectorAll('input[type="checkbox"]');

function updateQuirksUI() {
  for (const cb of quirkCheckboxes) {
    cb.checked = chip8.cpu.quirks[cb.name];
  }
}

let settingsInputs = document
  .getElementById("settings-inputs")
  .querySelectorAll("input");

const SETTINGS = {
  "screen-scale": {
    get: () => chip8.screen.resScale,
    set: (v) => {
      chip8.screen.updateResScale(v);
      chip8.screen.forceRefresh();
    },
  },
  "target-fps": {
    get: () => chip8.targetFps,
    set: (v) => {
      chip8.targetFps = v;
    },
  },
  "target-ipf": {
    get: () => chip8.instructionsPerFrame,
    set: (v) => {
      chip8.instructionsPerFrame = v;
    },
  },
  "bg-color": {
    get: () => chip8.screen.backgroundColor,
    set: (v) => {
      chip8.screen.backgroundColor = v;
      chip8.screen.forceRefresh();
    },
  },
  "fg-color": {
    get: () => chip8.screen.fillColor,
    set: (v) => {
      chip8.screen.fillColor = v;
      chip8.screen.forceRefresh();
    },
  },
};

function updateSettingsUI() {
  for (const input of settingsInputs) {
    input.value = SETTINGS[input.name].get();
  }
}

for (const checkbox of quirkCheckboxes) {
  checkbox.addEventListener("change", function () {
    chip8.cpu.quirks[this.name] = this.checked;

    if (this.name === "quirkMemoryLeaveIUnchanged" && this.checked) {
      chip8.cpu.quirks.quirkMemoryIncrementByX = false;
    } else if (this.name === "quirkMemoryIncrementByX" && this.checked) {
      chip8.cpu.quirks.quirkMemoryLeaveIUnchanged = false;
    }
    updateQuirksUI();
  });
}

for (const setting of settingsInputs) {
  let onInput = function () {
    SETTINGS[this.name].set(this.value);
    updateSettingsUI();
  };

  if (setting.type === "range") {
    setting.addEventListener("change", onInput);
  } else {
    setting.addEventListener("input", onInput);
  }
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
  4,
);

let keyboardContainer = document.getElementById("keyboard-container");
let showHideKeyboardButton = document.getElementById("show-hide-keyboard-btn");
keyboard.draw(keyboardContainer);

showHideKeyboardButton.addEventListener("click", () => {
  if (!keyboardContainer.classList.contains("keyboard-active")) {
    keyboardContainer.classList.add("keyboard-active");
    showHideKeyboardButton.textContent = "Hide Keyboard";
  } else {
    keyboardContainer.classList.remove("keyboard-active");
    showHideKeyboardButton.textContent = "Show Keyboard";
  }
});

keyboard.onkeydown = chip8.pressKey.bind(chip8);
keyboard.onkeyup = chip8.releaseKey.bind(chip8);
