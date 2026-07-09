/**
 * @file UnicodeDetector.js
 * @description Analyzes the character set of raw text.
 */

export class UnicodeDetector {
    /**
     * Checks if the text contains Arabic/Urdu script.
     */
    static hasUrduScript(text) {
        if (!text) return false;
        const urduRegex = /[\u0600-\u06FF]/;
        return urduRegex.test(text);
    }
}
