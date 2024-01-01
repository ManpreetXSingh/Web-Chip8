/**
 * Similar to the % (modulo) operator in python.\
 * It returns the remainder from the division of the first argument by the second. A zero right argument returns NaN.\
 * This always yields a result with the same sign as its second operand (or zero).\
 * The absolute value of the result is strictly smaller than the absolute value of the second operand.
 * e.g., 3.14%0.7 equals 0.34 (since 3.14 equals 4*0.7 + 0.34.)\
 */
export function pyModulo(a, b) {
    return ((a % b) + b) % b;
}

export function toHex(number, digits = 2) {
    return number.toString(16).padStart(digits, "0");
}

export function getBitness(num) {
    return Math.ceil(Math.log2(num));
}

export const generateId = (() => {
    let id = 0;
    return () => id++;
})();

export class DisplayTableOptions {
    #id;
    constructor() {
        this.numCols = 16;
        this.bitness = 8;
        this.hAddressVisible = true;
        this.vAddressVisible = true;
        this.tableName = null;
        this.vNames = null;
        this.hNames = null;
        this.#id = generateId();
    }

    get id() {
        return this.#id;
    }

    get hasVHeader() {
        return this.vAddressVisible || this.vNames !== null;
    }

    get hasHheader() {
        return this.hAddressVisible || this.hNames !== null;
    }
}

/**
 * Display an array of numbers as a table in hexadecimal format.
 * @param {HTMLElement} table
 * @param {Array} array
 * @param {DisplayTableOptions} displayTableOptions
 */
export function displayTable(table, array, displayTableOptions) {
    if (displayTableOptions.vNames != null) {
        displayTableOptions.vAddressVisible = false;
    }
    if (displayTableOptions.hNames != null) {
        displayTableOptions.hAddressVisible = false;
    }

    let tableHtml = "";

    const bitness = displayTableOptions.bitness;
    const numCols = displayTableOptions.numCols;

    const mem_amt = array.length;
    const VAddrBitness = getBitness(mem_amt) + 1;
    const HAddrBitness = getBitness(numCols) + 1;

    // Table Header
    if (displayTableOptions.hasHheader) {
        tableHtml += "<thead><tr>";
        if (displayTableOptions.hasVHeader) {
            tableHtml += `<th>${
                displayTableOptions.tableName ||
                (displayTableOptions.vAddressVisible ? "Address" : "Name")
            }</th>`;
        }

        // Memory Offset in header row
        for (let i = 0; i < numCols; i++) {
            tableHtml += `<th>${
                displayTableOptions.hAddressVisible
                    ? toHex(i, Math.ceil(HAddrBitness / 4))
                    : displayTableOptions.hNames[i]
            }</th>`;
        }
        tableHtml += "</tr></thead>";
    }

    // Table Body
    tableHtml += "<tbody>";
    for (let i = 0; i < mem_amt; i += numCols) {
        tableHtml += "<tr>";

        // Memory Address in first column
        if (displayTableOptions.hasVHeader) {
            tableHtml += `<td>${
                displayTableOptions.vAddressVisible
                    ? toHex(i, Math.ceil(VAddrBitness / 4))
                    : displayTableOptions.vNames[i]
            }</td>`;
        }

        // Memory Data
        for (let j = 0; j < numCols; j++) {
            tableHtml += `<td>${
                i + j < mem_amt ? toHex(array[i + j], bitness / 4) : ""
            }</td>`;
        }
        tableHtml += "</tr>";
    }
    tableHtml += "</tbody>";
    table.innerHTML = tableHtml;
}

/**
 * Update the changes in the array to an existing table.
 * @param {HTMLElement} table
 * @param {Array} array
 * @param {Array} changes
 * @param {DisplayTableOptions} displayTableOptions
 */
export function updateTable(table, array, changes, displayTableOptions) {
    if (changes.length === 0) {
        return;
    }
    if (changes[0] === -1 || changes.length > 100) {
        displayTable(table, array, displayTableOptions);
        return;
    }

    const tbody = table.querySelector("tbody");
    const bitness = displayTableOptions.bitness;
    const hasVHeader = displayTableOptions.hasVHeader;
    const numCols = tbody.children[0].children.length - 1 * hasVHeader;
    const tableColOffset = hasVHeader ? 1 : 0;

    let arrayIdx = 0,
        rowIdx = 0,
        colIdx = 0;
    for (let i = 0; i < changes.length; i++) {
        arrayIdx = changes[i];
        rowIdx = Math.floor(arrayIdx / numCols);
        colIdx = arrayIdx % numCols;
        tbody.children[rowIdx].children[colIdx + tableColOffset].textContent =
            toHex(array[arrayIdx], bitness / 4);
    }
}

export function addTableClasses(table, tableClassNames, displayTableOptions) {
    const tbody = table.querySelector("tbody");
    const hasVHeader = displayTableOptions.hasVHeader;
    const numCols = tbody.children[0].children.length - 1 * hasVHeader;
    const tableColIdxOffset = hasVHeader ? 1 : 0;

    for (const idx in tableClassNames) {
        row_idx = Math.floor(idx / numCols);
        col_idx = idx % numCols;
        tbody.children[row_idx].children[
            col_idx + tableColIdxOffset
        ].classList.add(tableClassNames[idx]);
    }
}

export function removeTableClasses(
    table,
    tableClassNames,
    displayTableOptions
) {
    const tbody = table.querySelector("tbody");
    const hasVHeader = displayTableOptions.hasVHeader;
    const numCols = tbody.children[0].children.length - 1 * hasVHeader;
    const tableColIdxOffset = hasVHeader ? 1 : 0;

    for (const idx in tableClassNames) {
        row_idx = Math.floor(idx / numCols);
        col_idx = idx % numCols;
        tbody.children[row_idx].children[
            col_idx + tableColIdxOffset
        ].classList.remove(tableClassNames[idx]);
    }
}

export function addTableAttributes(
    table,
    tableAttributes,
    displayTableOptions
) {
    const tbody = table.querySelector("tbody");
    const hasVHeader = displayTableOptions.hasVHeader;
    const numCols = tbody.children[0].children.length - 1 * hasVHeader;
    const tableColIdxOffset = hasVHeader ? 1 : 0;

    for (const idx in tableAttributes) {
        let row_idx = Math.floor(idx / numCols);
        let col_idx = idx % numCols;
        for (const attribute in tableAttributes[idx]) {
            tbody.children[row_idx].children[
                col_idx + tableColIdxOffset
            ].setAttribute(attribute, tableAttributes[idx][attribute]);
        }
    }
}

export function removeTableAttributes(
    table,
    tableAttributes,
    displayTableOptions
) {
    const tbody = table.querySelector("tbody");
    const hasVHeader = displayTableOptions.hasVHeader;
    const numCols = tbody.children[0].children.length - 1 * hasVHeader;
    const tableColIdxOffset = hasVHeader ? 1 : 0;

    for (const idx in tableAttributes) {
        let row_idx = Math.floor(idx / numCols);
        let col_idx = idx % numCols;
        for (const attrIdx in tableAttributes[idx]) {
            tbody.children[row_idx].children[
                col_idx + tableColIdxOffset
            ].removeAttribute(tableAttributes[idx][attrIdx]);
        }
    }
}
