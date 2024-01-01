"use strict";


/**
 * Similar to the % (modulo) operator in python.\
 * It returns the remainder from the division of the first argument by the second. A zero right argument returns NaN.\
 * This always yields a result with the same sign as its second operand (or zero).\
 * The absolute value of the result is strictly smaller than the absolute value of the second operand.
 * e.g., 3.14%0.7 equals 0.34 (since 3.14 equals 4*0.7 + 0.34.)\
 */
function pyModulo(a, b) {
    return ((a % b) + b) % b;
}

function toHex(number, digits = 2) {
    return number.toString(16).padStart(digits, '0');
}

function getBitness(num) {
    return Math.ceil(Math.log2(num));
}

class DisplayTableOptions {
    constructor() {
        this.numCols = 16;
        this.bitness = 8;
        this.hAddressVisible = true;
        this.vAddressVisible = true;
        this.tableName = null;
        this.vNames = null;
        this.hNames = null
    }

    get hasVHeader() {
        return (this.vAddressVisible || this.vNames != null);
    }

    get hasHheader() {
        return (this.hAddressVisible || this.hNames != null);
    }
}


/**
 * Display an array of numbers as a table in hexadecimal format.
 * @param {HTMLElement} table 
 * @param {Array} array 
 * @param {DisplayTableOptions} displayTableOptions 
 */
function displayTable(table, array, displayTableOptions) {
    if (displayTableOptions.vNames != null) {
        displayTableOptions.vAddressVisible = false;
    }
    if (displayTableOptions.hNames != null) {
        displayTableOptions.hAddressVisible = false;
    }

    table.innerHTML = "";
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const bitness = displayTableOptions.bitness;
    const numCols = displayTableOptions.numCols;

    const mem_amt = array.length;
    const VAddrBitness = getBitness(mem_amt) + 1;
    const HAddrBitness = getBitness(numCols) + 1;

    thead.innerHTML = "";
    tbody.innerHTML = "";

    let row;
    let cell;

    // Table Header
    if (displayTableOptions.hasHheader) {
        const head_row = document.createElement("tr");
        if (displayTableOptions.hasVHeader) {
            cell = document.createElement("th");
            cell.textContent = displayTableOptions.tableName || (displayTableOptions.vAddressVisible ? "Address" : "Name");
            head_row.appendChild(cell);
        }

        // Memory Offset in header row
        for (let i = 0; i < numCols; i++) {
            cell = document.createElement("th");
            cell.textContent = displayTableOptions.hAddressVisible ? toHex(i, Math.ceil(HAddrBitness / 4)) : displayTableOptions.hNames[i];
            head_row.appendChild(cell);
        }
        thead.appendChild(head_row);
    }
    // Table Body
    for (let i = 0; i < mem_amt; i += numCols) {
        row = document.createElement("tr");

        // Memory Address in first column
        if (displayTableOptions.hasVHeader) {
            cell = document.createElement("td");
            cell.textContent = displayTableOptions.vAddressVisible ? toHex(i, Math.ceil(VAddrBitness / 4)) : displayTableOptions.vNames[i];
            row.appendChild(cell);
        }

        // Memory Data
        for (let j = 0; j < numCols; j++) {
            cell = document.createElement("td");
            cell.textContent = (i + j < mem_amt) ? toHex(array[i + j], bitness / 4) : "";
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }

    table.appendChild(thead);
    table.appendChild(tbody);
}


/**
 * Update the changes in the array to an existing table.
 * @param {HTMLElement} table 
 * @param {Array} array 
 * @param {Array} changes 
 * @param {DisplayTableOptions} displayTableOptions
 */
function updateTable(table, array, changes, displayTableOptions) {
    if (changes.length === 0) {
        return;
    }

    const tbody = table.querySelector("tbody");
    const mem_amt = array.length;
    const bitness = displayTableOptions.bitness;
    const hasVHeader = displayTableOptions.hasVHeader;
    const numCols = tbody.children[0].children.length - 1 * hasVHeader;
    const tableColIdxOffset = hasVHeader ? 1 : 0;

    if (changes[0] === -1) {
        for (let i = 0; i < Math.ceil(mem_amt / numCols); i++) {
            for (let j = 0; j < numCols; j++) {
                tbody.children[i].children[j + tableColIdxOffset].textContent = (i * numCols + j < mem_amt) ? toHex(array[i * numCols + j], bitness / 4) : "";
            }
        }
        return;
    }

    let update_idx = 0;
    let row_idx = 0;
    let col_idx = 0;
    for (let i = 0; i < changes.length; i++) {
        update_idx = changes[i];
        row_idx = Math.floor(update_idx / numCols);
        col_idx = update_idx % numCols;
        tbody.children[row_idx].children[col_idx + tableColIdxOffset].textContent = toHex(array[update_idx], bitness / 4);
    }
}


function addTableClasses(table, tableClassNames, displayTableOptions) {
    const tbody = table.querySelector("tbody");
    const hasVHeader = displayTableOptions.hasVHeader;
    const numCols = tbody.children[0].children.length - 1 * hasVHeader;
    const tableColIdxOffset = hasVHeader ? 1 : 0;

    for (const idx in tableClassNames) {
        row_idx = Math.floor(idx / numCols);
        col_idx = idx % numCols;
        tbody.children[row_idx].children[col_idx + tableColIdxOffset].classList.add(tableClassNames[idx]);
    }
}


function removeTableClasses(table, tableClassNames, displayTableOptions) {
    const tbody = table.querySelector("tbody");
    const hasVHeader = displayTableOptions.hasVHeader;
    const numCols = tbody.children[0].children.length - 1 * hasVHeader;
    const tableColIdxOffset = hasVHeader ? 1 : 0;

    for (const idx in tableClassNames) {
        row_idx = Math.floor(idx / numCols);
        col_idx = idx % numCols;
        tbody.children[row_idx].children[col_idx + tableColIdxOffset].classList.remove(tableClassNames[idx]);
    }
}


function addTableAttributes(table, tableAttributes, displayTableOptions) {
    const tbody = table.querySelector("tbody");
    const hasVHeader = displayTableOptions.hasVHeader;
    const numCols = tbody.children[0].children.length - 1 * hasVHeader;
    const tableColIdxOffset = hasVHeader ? 1 : 0;

    for (const idx in tableAttributes) {
        let row_idx = Math.floor(idx / numCols);
        let col_idx = idx % numCols;
        for (const attribute in tableAttributes[idx]) {
            tbody.children[row_idx].children[col_idx + tableColIdxOffset].setAttribute(attribute, tableAttributes[idx][attribute]);
        }
    }
}


function removeTableAttributes(table, tableAttributes, displayTableOptions) {
    const tbody = table.querySelector("tbody");
    const hasVHeader = displayTableOptions.hasVHeader;
    const numCols = tbody.children[0].children.length - 1 * hasVHeader;
    const tableColIdxOffset = hasVHeader ? 1 : 0;

    for (const idx in tableAttributes) {
        let row_idx = Math.floor(idx / numCols);
        let col_idx = idx % numCols;
        for (const attrIdx in tableAttributes[idx]) {
            tbody.children[row_idx].children[col_idx + tableColIdxOffset].removeAttribute(tableAttributes[idx][attrIdx]);
        }
    }
}