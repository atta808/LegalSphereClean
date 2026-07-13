/**
 * @file DocumentAnalyzer.js
 * @description Coordinates the structured analysis of documents for Document Vault AI.
 * No UI code. Outputs a structured JavaScript object.
 */

import { OCRPipeline } from './OCRPipeline';
import { LanguagePipeline } from './language/LanguagePipeline';
import { PromptManager } from '../core/PromptManager';
import { ProviderRegistry } from '../core/ProviderRegistry';

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

            if (!rawText || !rawText.trim()) {
                 // Return empty state directly for MarkdownFormatter to render
                 return {
                     executiveSummary: "No readable text was detected.\n\nPossible reasons\n\n• Low quality scan\n• Handwritten document\n• Protected PDF\n• Empty document\n\nPlease upload a clearer copy for better analysis.",
                     documentType: "Unreadable",
                     parties: [],
                     importantDates: [],
                     legalIssues: [],
                     risks: [],
                     recommendations: ["Upload a clearer image or PDF for analysis."],
                     confidence: "Low"
                 };
            }

            // 2. Process Text through Language Pipeline
            const { normalizedText } = LanguagePipeline.process(rawText);

            if (!normalizedText || !normalizedText.trim()) {
                return {
                     executiveSummary: "No readable text was detected after processing.\n\nPossible reasons\n\n• Low quality scan\n• Handwritten document\n• Protected PDF\n• Empty document\n\nPlease upload a clearer copy for better analysis.",
                     documentType: "Unreadable",
                     parties: [],
                     importantDates: [],
                     legalIssues: [],
                     risks: [],
                     recommendations: ["Upload a clearer image or PDF for analysis."],
                     confidence: "Low"
                 };
            }

            // 3. Prompt Building
            const prompt = PromptManager.buildDocumentVault(normalizedText, documentContext);

            // 4. Execution (force temperature 0 for strictly structured output) via Registry
            const llm = ProviderRegistry.getLLMProvider();
            const rawResponse = await llm.execute(prompt, { temperature: 0.1 });

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
