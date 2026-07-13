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

        // 1. Remove Zero-width characters
        let cleaned = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

        // 2. Remove multiple blank lines (3 or more down to 2)
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

        // 3. Remove repeated punctuation (e.g. ..... or ,,,,,)
        cleaned = cleaned.replace(/\.{4,}/g, '...'); // keep ellipses
        cleaned = cleaned.replace(/,{2,}/g, ',');

        // 4. Normalize spaces (multiple spaces to single)
        cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

        // 5. Clean up weird page separators common in OCR
        cleaned = cleaned.replace(/---+\s*page\s*\d+\s*---+/gi, '\n\n[PAGE BREAK]\n\n');

        return cleaned.trim();
    }
}
