/**
 * @file TextCleaner.js
 * @description Removes raw OCR artifacts and control characters.
 */

export class TextCleaner {
    /**
     * Cleans OCR garbage and zero-width characters.
     */
    static clean(text) {
        if (!text) return '';
        return text.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width characters
    }
}
