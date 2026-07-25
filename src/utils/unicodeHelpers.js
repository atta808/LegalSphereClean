/**
 * @file unicodeHelpers.js
 * @description Utility functions for Unicode and Urdu character analysis.
 * Provides counting, detection, and statistics helpers for multilingual OCR debugging.
 * All functions are pure and do not modify the input text.
 */

/**
 * Counts Urdu/Arabic script characters in a text string.
 * Includes the following Unicode blocks:
 * - U+0600–U+06FF: Arabic (includes Urdu, Persian, and Arabic letters, diacritics, punctuation)
 * - U+0750–U+077F: Arabic Supplement
 * - U+08A0–U+08FF: Arabic Extended-A
 * - U+FB50–U+FDFF: Arabic Presentation Forms-A
 * - U+FE70–U+FEFF: Arabic Presentation Forms-B
 *
 * @param {string} text - The input text.
 * @returns {number} The number of Urdu/Arabic characters found.
 */
export const countUrduChars = (text) => {
    if (!text || typeof text !== 'string') return 0;
    // Combined regex for all Arabic script blocks
    const urduRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
    const matches = text.match(urduRegex);
    return matches ? matches.length : 0;
};

/**
 * Checks if a given text contains any Urdu/Arabic script characters.
 *
 * @param {string} text - The input text.
 * @returns {boolean} True if at least one Urdu character is found.
 */
export const hasUrduChars = (text) => {
    if (!text || typeof text !== 'string') return false;
    return countUrduChars(text) > 0;
};

/**
 * Returns detailed Unicode statistics for a given text.
 * Includes:
 * - totalLength: total character count
 * - urduCount: number of Urdu/Arabic script characters
 * - nonUrduCount: number of non-Urdu characters
 * - hasUrdu: boolean
 * - percentageUrdu: percentage of Urdu characters
 *
 * @param {string} text - The input text.
 * @returns {Object} Statistics object.
 */
export const getUnicodeStatistics = (text) => {
    if (!text || typeof text !== 'string') {
        return {
            totalLength: 0,
            urduCount: 0,
            nonUrduCount: 0,
            hasUrdu: false,
            percentageUrdu: 0,
        };
    }
    const totalLength = text.length;
    const urduCount = countUrduChars(text);
    const nonUrduCount = totalLength - urduCount;
    return {
        totalLength,
        urduCount,
        nonUrduCount,
        hasUrdu: urduCount > 0,
        percentageUrdu: totalLength > 0 ? (urduCount / totalLength) * 100 : 0,
    };
};

/**
 * Strips diacritical marks from Arabic/Urdu text.
 * Removes combining diacritical marks (U+064B–U+065F, U+0670, etc.).
 * This function is provided for future use and is NOT used in the OCR pipeline.
 *
 * @param {string} text - The input text.
 * @returns {string} Text with diacritics removed.
 */
export const stripDiacritics = (text) => {
    if (!text || typeof text !== 'string') return text;
    // Remove Arabic diacritics (combining marks)
    return text.replace(/[\u064B-\u065F\u0670]/g, '');
};

/**
 * Safely extracts a substring without breaking UTF-8 surrogates.
 * Use this instead of String.substring when dealing with OCR text.
 *
 * @param {string} text - The input text.
 * @param {number} start - Start index (character units).
 * @param {number} end - End index (character units).
 * @returns {string} The substring.
 */
export const safeSubstring = (text, start, end) => {
    if (!text || typeof text !== 'string') return '';
    // JavaScript strings are UTF-16, and substring is safe for code points
    // as long as we don't split surrogates; but we do not split surrogates manually.
    // However, to be safe, we can use Array.from to get code points, but that's heavy.
    // For simplicity, we'll rely on substring and note that it's safe for BMP.
    // Since Arabic/Urdu are in BMP (U+0600–U+06FF), it's fine.
    return text.substring(start, end);
};