/**
 * @file LanguageDetector.js
 * @description Determines the primary language of the text.
 */

import { UnicodeDetector } from './UnicodeDetector';

export class LanguageDetector {
    /**
     * Determines language based on Unicode or future dictionary heuristics.
     */
    static detectLanguage(text) {
        if (!text) return 'unknown';

        if (UnicodeDetector.hasUrduScript(text)) {
            return 'ur'; // Urdu
        }

        // Default to English (or Roman Urdu, which uses Latin characters)
        return 'en';
    }
}
