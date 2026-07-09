/**
 * @file LanguagePipeline.js
 * @description Coordinates the entire language processing workflow.
 */

import { TextCleaner } from './TextCleaner';
import { TextNormalizer } from './TextNormalizer';
import { LanguageDetector } from './LanguageDetector';

export class LanguagePipeline {
    /**
     * Processes raw OCR text through the pipeline.
     * @param {string} rawText
     * @returns {Object} { language, normalizedText }
     */
    static process(rawText) {
        if (!rawText) return { language: 'unknown', normalizedText: '' };

        // 1. Clean artifacts
        const cleanedText = TextCleaner.clean(rawText);

        // 2. Normalize formatting
        const normalizedText = TextNormalizer.normalize(cleanedText);

        // 3. Detect Language
        const language = LanguageDetector.detectLanguage(normalizedText);

        return { language, normalizedText };
    }
}
