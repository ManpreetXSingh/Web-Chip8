import { generateId, toHex, calcBitness } from "./util.js";

class TableOptions {
  #id;
  #vNames;
  #hNames;
  constructor() {
    this.tableName = null;
    this.numCols = 16;
    this.bitness = 8;
    this.hAddressVisible = true;
    this.vAddressVisible = true;

    this.#vNames = null;
    this.#hNames = null;
    this.#id = generateId();
  }

  get id() {
    return this.#id;
  }

  get vNames() {
    return this.#vNames;
  }

  get hNames() {
    return this.#hNames;
  }

  set vNames(names) {
    this.#vNames = names;
    this.vAddressVisible = names === null;
  }

  set hNames(names) {
    this.#hNames = names;
    this.hAddressVisible = names === null;
  }
}

class TableRenderer {
  #tbody;
  /**
   * Display an array of numbers as a table in hexadecimal format.
   * @param {HTMLElement} table
   * @param {TableOptions} displayOptions
   * @returns {TableRenderer}
   */
  constructor(table, displayOptions) {
    this.table = table;
    this.displayOptions = displayOptions;
  }

  get hasVheader() {
    return (
      this.displayOptions.vAddressVisible || this.displayOptions.vNames !== null
    );
  }

  get hasHheader() {
    return (
      this.displayOptions.hAddressVisible || this.displayOptions.hNames !== null
    );
  }

  get colIdxOffset() {
    return this.hasVheader ? 1 : 0;
  }

  /**
   * Get the `<td>` element at the specified index.
   * @param {number} idx
   * @returns {HTMLElement}
   */
  getElement(idx) {
    const row_idx = Math.floor(idx / this.displayOptions.numCols);
    const col_idx = idx % this.displayOptions.numCols;
    return this.#tbody.children[row_idx].children[col_idx + this.colIdxOffset];
  }

  /**
   * Display an array of numbers as a table in hexadecimal format.
   * @param {Array} array
   * @returns {void}
   */
  display(array) {
    let tableHtml = "";

    const memAmt = array.length;
    const numCols = this.displayOptions.numCols;
    const VAddrBitness = calcBitness(memAmt) + 1;
    const HAddrBitness = calcBitness(numCols) + 1;

    // Table Header
    if (this.hasHheader) {
      tableHtml += "<thead><tr>";
      if (this.hasVheader) {
        tableHtml += `<th>${
          this.displayOptions.tableName ||
          (this.displayOptions.vAddressVisible ? "Address" : "Name")
        }</th>`;
      }

      // Memory Offset in header row
      for (let i = 0; i < numCols; i++) {
        tableHtml += `<th>${
          this.displayOptions.hAddressVisible
            ? toHex(i, Math.ceil(HAddrBitness / 4))
            : this.displayOptions.hNames[i]
        }</th>`;
      }
      tableHtml += "</tr></thead>";
    }

    // Table Body
    tableHtml += "<tbody>";
    for (let i = 0; i < memAmt; i += numCols) {
      tableHtml += "<tr>";

      // Memory Address in first column
      if (this.hasVheader) {
        tableHtml += `<td>${
          this.displayOptions.vAddressVisible
            ? toHex(i, Math.ceil(VAddrBitness / 4))
            : this.displayOptions.vNames[i]
        }</td>`;
      }

      // Data
      for (let j = 0; j < numCols; j++) {
        tableHtml += `<td>${
          i + j < memAmt
            ? toHex(array[i + j], this.displayOptions.bitness / 4)
            : ""
        }</td>`;
      }
      tableHtml += "</tr>";
    }
    tableHtml += "</tbody>";
    this.table.innerHTML = tableHtml;
    this.#tbody = this.table.querySelector("tbody");
  }

  /**
   * Update the changes in the array to an existing table.
   * @param {Array} array
   * @param {number[]} changes
   * @returns {void}
   */
  update(array, changes) {
    if (changes.length === 0) {
      return;
    }
    if (changes[0] === -1 || changes.length > 100) {
      this.display(array);
      return;
    }

    for (let i = 0, length = changes.length; i < length; i++) {
      let arrayIdx = changes[i];
      this.getElement(arrayIdx).textContent = toHex(
        array[arrayIdx],
        this.displayOptions.bitness / 4,
      );
    }
  }

  /**
   * Add classes to the specified elements in the table.
   * @param {Object<number, string[]>} tableClassNames
   * @returns {void}
   */
  addClasses(tableClassNames) {
    for (const idx in tableClassNames) {
      this.getElement(idx).classList.add(tableClassNames[idx]);
    }
  }

  /**
   * Remove classes from the specified elements in the table.
   * @param {Object<number, string[]>} tableClassNames
   * @returns {void}
   */
  removeClasses(tableClassNames) {
    for (const idx in tableClassNames) {
      this.getElement(idx).classList.remove(tableClassNames[idx]);
    }
  }

  /**
   * Add attributes to the specified elements in the table.
   * @param {Object<number, Object<string, string>>} tableAttributes
   * @returns {void}
   */
  addAttributes(tableAttributes) {
    for (const idx in tableAttributes) {
      let ele = this.getElement(idx);
      for (const attribute in tableAttributes[idx]) {
        ele.setAttribute(attribute, tableAttributes[idx][attribute]);
      }
    }
  }

  /**
   * Remove attributes from the specified elements in the table.
   * @param {Object<number, string[]>} tableAttributes
   * @returns {void}
   */
  removeAttributes(tableAttributes) {
    for (const idx in tableAttributes) {
      let ele = this.getElement(idx);
      for (const attrIdx in tableAttributes[idx]) {
        ele.removeAttribute(tableAttributes[idx][attrIdx]);
      }
    }
  }
}

export default TableRenderer;
export { TableOptions };
