/**
 * @file TextNormalizer.js
 * @description Standardizes spacing and line breaks for LLM consumption.
 */

export class TextNormalizer {
    /**
     * Normalizes newlines and spaces.
     */
    static normalize(text) {
        if (!text) return '';
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}
