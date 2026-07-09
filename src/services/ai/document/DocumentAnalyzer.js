/**
 * @file DocumentAnalyzer.js
 * @description Coordinates the structured analysis of documents for Document Vault AI.
 * No UI code. Outputs a structured JavaScript object.
 */

import { OCRPipeline } from './OCRPipeline';
import { LanguageDetector } from './LanguageDetector';
import { PromptManager } from '../core/PromptManager';
import { DeepSeekProvider } from '../providers/DeepSeekProvider';

/**
 * Document Analyzer
 */
export class DocumentAnalyzer {
    /**
     * Performs a complete automated analysis of a document.
     *
     * @param {Object} fileParams - The file to analyze.
     * @param {Object} [documentContext={}] - Optional metadata context.
     * @returns {Promise<Object>} The structured analysis object.
     */
    static async analyze(fileParams, documentContext = {}) {
        try {
            // 1. OCR Extraction
            const rawText = await OCRPipeline.execute(fileParams);

            if (!rawText) {
                 throw new Error('Analysis failed: No text extracted.');
            }

            // 2. Normalization
            const { normalizedText } = LanguageDetector.process(rawText);

            // 3. Prompt Building
            const prompt = PromptManager.buildDocumentVault(normalizedText, documentContext);

            // 4. Execution (force temperature 0 for strictly structured output)
            const rawResponse = await DeepSeekProvider.execute(prompt, { temperature: 0.1 });

            // 5. Parse JSON (Removing potential markdown wrappers)
            return this._parseJsonResponse(rawResponse);
        } catch (error) {
             if (__DEV__) {
                 console.error('DocumentAnalyzer Error:', error.message);
             }
             throw new Error(`Document analysis failed: ${error.message}`);
        }
    }

    /**
     * Safely parses the AI response expecting JSON.
     * Strips Markdown formatting if the AI ignores instructions.
     */
    static _parseJsonResponse(response) {
        try {
            // Strip code block markers
            let cleaned = response.replace(/```json/gi, '').replace(/```/g, '').trim();

            // Find first { and last } to avoid leading/trailing text
            const startIndex = cleaned.indexOf('{');
            const endIndex = cleaned.lastIndexOf('}');

            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                cleaned = cleaned.substring(startIndex, endIndex + 1);
            }

            const parsed = JSON.parse(cleaned);
            return parsed;
        } catch (error) {
             if (__DEV__) {
                 console.error('DocumentAnalyzer parsing error:', error.message, '\nRaw Response:', response);
             }
             throw new Error('Failed to parse AI response into structured data.');
        }
    }
}
