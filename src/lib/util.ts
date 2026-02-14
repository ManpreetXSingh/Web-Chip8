/**
 * Similar to the % (modulo) operator in python.\
 * It returns the remainder from the division of the first argument by the second. A zero right argument returns NaN.\
 * This always yields a result with the same sign as its second operand (or zero).\
 * The absolute value of the result is strictly smaller than the absolute value of the second operand.\
 * e.g., 3.14%0.7 equals 0.34 (since 3.14 equals 4*0.7 + 0.34.)
 */
export function pyModulo(a: number, b: number): number {
  return ((a % b) + b) % b;
}

/**
 * Converts a number to a hex string with the given number of digits.
 */
export function toHex(number: number, digits = 2): string {
  return number.toString(16).padStart(digits, "0");
}

/**
 * Returns the number of bits needed to represent the given number.
 */
export function calcBitness(num: number): number {
  return Math.ceil(Math.log2(num));
}

/**
 * Generates a non-random unique id.
 * id[x] = id[x-1] + 1
 */
export const generateId = (() => {
  let id = 0;
  return () => id++;
})();
