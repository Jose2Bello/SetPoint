/* js/utils/validators.js */

/**
 * Validates if a string is non-empty after trimming.
 * @param {string} val 
 * @returns {boolean}
 */
export function isRequired(val) {
    if (val === undefined || val === null) return false;
    return val.toString().trim().length > 0;
}

/**
 * Validates if a number is within a given range (inclusive).
 * @param {number|string} val 
 * @param {number} min 
 * @param {number} max 
 * @returns {boolean}
 */
export function isNumberInRange(val, min, max) {
    const num = Number(val);
    if (isNaN(num)) return false;
    return num >= min && num <= max;
}

/**
 * Validates if a string is a valid URL.
 * Supports http, https or base64. Returns true for empty since it is usually optional.
 * @param {string} val 
 * @returns {boolean}
 */
export function isValidURL(val) {
    if (!val || val.trim() === '') return true;
    try {
        new URL(val);
        return true;
    } catch (_) {
        // Simple regex for relative path or data URIs
        return val.startsWith('data:') || val.startsWith('/') || val.startsWith('./') || val.startsWith('../');
    }
}

/**
 * Checks if a player jersey number is valid (e.g. integer between 0 and 99).
 * @param {number|string} val 
 * @returns {boolean}
 */
export function isValidJerseyNumber(val) {
    const num = Number(val);
    if (!Number.isInteger(num)) return false;
    return isNumberInRange(num, 0, 99);
}
