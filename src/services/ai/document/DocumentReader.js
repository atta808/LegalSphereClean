/**
 * @file DocumentReader.js
 * @description Coordinates the reading of documents (OCR + Language Detection).
 * Used primarily by Lex AI and ChatRoom when a user attaches a document to a chat.
 */

import { OCRPipeline } from './OCRPipeline';
import { LanguagePipeline } from './language/LanguagePipeline';

/**
 * Document Reader
 */
export class DocumentReader {
    /**
     * Reads a document, extracts its text, and normalizes it.
     *
     * @param {Object} fileParams - The file to process (must contain uri, type, base64 if image).
     * @returns {Promise<Object>} Object containing the extracted text and detected language.
     */
    static async read(fileParams) {
        if (!fileParams) return null;

        try {
            // 1. Execute OCR Pipeline
            const rawText = await OCRPipeline.execute(fileParams);

            if (!rawText || !rawText.trim()) {
                 return {
                     language: 'unknown',
                     text: "No readable text was detected.\n\nPossible reasons\n\n• Low quality scan\n• Handwritten document\n• Protected PDF\n• Empty document\n\nPlease upload a clearer copy for better analysis."
                 };
            }

            // 2. Process Text through Language Pipeline
            const { language, normalizedText } = LanguagePipeline.process(rawText);

            if (!normalizedText || !normalizedText.trim()) {
                 return {
                     language: 'unknown',
                     text: "No readable text was detected after processing.\n\nPossible reasons\n\n• Low quality scan\n• Handwritten document\n• Protected PDF\n• Empty document\n\nPlease upload a clearer copy for better analysis."
                 };
            }

            return {
                language,
                text: normalizedText
            };
        } catch (error) {
            if (__DEV__) {
                console.error('DocumentReader Error:', error.message);
            }

            // Handle OCR Failures gracefully without throwing to LLM processing errors if possible
            if (error.code && error.code.startsWith('OCR_')) {
                 return {
                     language: 'unknown',
                     text: "No readable text was detected.\n\nPossible reasons\n\n• Low quality scan\n• Handwritten document\n• Protected PDF\n• Empty document\n\nPlease upload a clearer copy for better analysis."
                 };
            }

            throw new Error(`Failed to read document: ${error.message}`);
        }
    }
}
