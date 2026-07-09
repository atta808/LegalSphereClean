/**
 * @file LanguageDetector.js
 * @description Provides local language detection and text normalization.
 * Supports English, Urdu, and Roman Urdu. Prepares text for the Prompt Builder.
 */

/**
 * Language Detector & Normalizer Utility
 */
export class LanguageDetector {
    /**
     * Detects the language and normalizes the text.
     * Note: In a production environment, this might use a lightweight local model or regex heuristics.
     * Here, we implement the architectural skeleton with basic heuristics.
     *
     * @param {string} rawText - The raw OCR text.
     * @returns {Object} An object containing the detected language and normalized text.
     */
    static process(rawText) {
        if (!rawText) return { language: 'unknown', normalizedText: '' };

        const normalizedText = this._normalize(rawText);
        const language = this._detect(normalizedText);

        return { language, normalizedText };
    }

    /**
     * Cleans OCR artifacts and normalizes spacing.
     */
    static _normalize(text) {
        // Remove excessive newlines, strange Unicode chars, etc.
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
            .trim();
    }

    /**
     * Very basic heuristic detection for demonstration.
     * Checks for Arabic/Urdu script ranges.
     */
    static _detect(text) {
        // Urdu/Arabic script Unicode range check
        const urduRegex = /[\u0600-\u06FF]/;
        if (urduRegex.test(text)) {
            return 'ur'; // Urdu
        }

        // Roman Urdu is hard to distinguish purely by regex without a dictionary,
        // but it consists of Latin characters forming Urdu words (hai, kya, etc.)
        // For the sake of this framework, we default to English/Roman Urdu if Latin.

        return 'en'; // English / Roman Urdu
    }
}
