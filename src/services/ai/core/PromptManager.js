/**
 * @file PromptManager.js
 * @description Provides a centralized access point for prompt generation.
 */

import { PromptBuilder } from '../prompts/PromptBuilder';

export class PromptManager {
    static buildLexAI(query, context, ocrText) {
        return PromptBuilder.buildLexAIPrompt(query, context, ocrText);
    }

    static buildCaseAI(query, context, ocrText) {
        return PromptBuilder.buildChatRoomPrompt(query, context, ocrText);
    }

    static buildDocumentVault(ocrText, context) {
        return PromptBuilder.buildDocumentAnalysisPrompt(ocrText, context);
    }
}
