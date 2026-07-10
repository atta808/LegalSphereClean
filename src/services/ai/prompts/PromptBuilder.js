/**
 * @file PromptBuilder.js
 * @description Constructs final prompts from templates, context, and user inputs.
 * Ensures the generated strings are optimized and standardized for the AI provider.
 */

import { SystemPrompts } from './SystemPrompts';
import { OfficePrompts } from './OfficePrompts';
import { CasePrompts } from './CasePrompts';
import { DocumentPrompts } from './DocumentPrompts';
import { GeneralPrompts } from './GeneralPrompts';

/**
 * Prompt Builder Utility
 */
export class PromptBuilder {
    /**
     * Builds the final prompt for Lex AI.
     *
     * @param {string} userMessage - The query from the user.
     * @param {Object} context - The structured office context.
     * @param {string} [ocrText=''] - Optional text extracted from an attached document.
     * @param {Array} [history=[]] - Structured conversation history.
     * @returns {string} The fully constructed prompt ready for the LLM.
     */
    static buildLexAIPrompt(userMessage, context, ocrText = '', history = []) {
        // Stringify context safely
        let contextString = '';
        if (context && typeof context === 'object') {
            try {
                contextString = JSON.stringify(context, null, 2);
            } catch (e) {
                contextString = 'Context formatting error.';
            }
        } else if (context) {
            contextString = String(context);
        }

        const systemInstruction = `${OfficePrompts.ROLE}\n\n${SystemPrompts.BASE_GUIDELINES}`;
        const userInstruction = GeneralPrompts.formatUserQuery(contextString, ocrText, userMessage, history);

        // Combine into a single string for standard DeepSeek input
        return `${systemInstruction}\n\n${userInstruction}`;
    }

    /**
     * Builds the final prompt for AI ChatRoom (Case-specific).
     *
     * @param {string} userMessage - The query from the user.
     * @param {Object} caseContext - The structured context for the specific case.
     * @param {string} [ocrText=''] - Optional text extracted from an attached document.
     * @param {Array} [history=[]] - Structured conversation history.
     * @returns {string} The fully constructed prompt ready for the LLM.
     */
    static buildChatRoomPrompt(userMessage, caseContext, ocrText = '', history = []) {
        let contextString = '';
        if (caseContext && typeof caseContext === 'object') {
            try {
                contextString = JSON.stringify(caseContext, null, 2);
            } catch (e) {
                 contextString = 'Context formatting error.';
            }
        }

        const systemInstruction = `${CasePrompts.ROLE}\n\n${CasePrompts.RESTRICTIONS}`;
        const userInstruction = GeneralPrompts.formatUserQuery(contextString, ocrText, userMessage, history);

        return `${systemInstruction}\n\n${userInstruction}`;
    }

    /**
     * Builds the final prompt for Document Vault AI analysis.
     * Note: This does not take a user message as it is fully automated.
     *
     * @param {string} ocrText - The text extracted from the document.
     * @param {Object} [documentContext={}] - Optional metadata about the document itself.
     * @returns {string} The fully constructed prompt ready for the LLM.
     */
    static buildDocumentAnalysisPrompt(ocrText, documentContext = {}) {
        let metaString = '';
        if (documentContext && Object.keys(documentContext).length > 0) {
            try {
                metaString = `Document Metadata:\n${JSON.stringify(documentContext, null, 2)}\n\n`;
            } catch (e) {
                 // ignore
            }
        }

        const systemInstruction = `${DocumentPrompts.ROLE}\n\n${DocumentPrompts.JSON_STRUCTURE}\n\n${SystemPrompts.JSON_OUTPUT_RULES}`;
        const userInstruction = `Analyze the following document and extract the required information in the exact JSON format specified.\n\n${metaString}--- Document Text ---\n${ocrText}\n---------------------\n`;

        return `${systemInstruction}\n\n${userInstruction}`;
    }
}
