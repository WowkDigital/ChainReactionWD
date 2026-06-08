/**
 * Utility functions for math, colors, and generators
 */

/**
 * Pads a number with leading zeros up to the specified size.
 * @param {number|string} num 
 * @param {number} size 
 * @returns {string}
 */
export function padNumber(num, size) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

/**
 * Parses a hex color string into RGB values.
 * @param {string} hex 
 * @returns {{r: number, g: number, b: number}}
 */
export function parseHexColor(hex) {
    if (!hex || hex.length < 7) return { r: 128, g: 128, b: 128 };
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

/**
 * Smoothly interpolates a hex color towards its full vibrant color, starting from grayscale.
 * Used for transitioning newly combined molecules into their colorful state.
 * @param {string} hex 
 * @param {number} factor 
 * @returns {string}
 */
export function lerpColorToFull(hex, factor) {
    const { r, g, b } = parseHexColor(hex);
    // Standard luminance weights for grayscale conversion
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const newR = Math.round(gray + (r - gray) * factor);
    const newG = Math.round(gray + (g - gray) * factor);
    const newB = Math.round(gray + (b - gray) * factor);
    return `rgb(${newR}, ${newG}, ${newB})`;
}

/**
 * Quad-ease in-out transition formula.
 * @param {number} t Progress from 0 to 1
 * @returns {number} Eased progress
 */
export function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Box-Muller transform for generating normally-distributed random numbers.
 * @param {number} mean 
 * @param {number} stdDev 
 * @returns {number}
 */
export function getRandomNormal(mean, stdDev) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Prevent log(0)
    while(v === 0) v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
}

/**
 * Returns a molecule size based on custom weights (higher probability of smaller sizes).
 * @returns {number}
 */
export function getWeightedRandomSize() {
    const rand = Math.random();
    if (rand < 0.5) return 2;
    if (rand < 0.75) return 4;
    if (rand < 0.875) return 8;
    return 16;
}

/**
 * Calculates slow-motion time dilation based on electron count.
 * @param {number} electronCount 
 * @returns {number} Timescale multiplier between 0.1 and 1.0
 */
export function calculateAutoTimeScale(electronCount) {
    if (electronCount < 5) return 1.0;
    const sFactor = Math.min(1.0, Math.sqrt(electronCount - 4) / 15);
    const tScale = 1.0 - sFactor * 0.9;
    return Math.max(0.1, tScale);
}
