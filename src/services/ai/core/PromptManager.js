/**
 * @file PromptManager.js
 * @description Provides a centralized access point for prompt generation.
 */

import { PromptBuilder } from '../prompts/PromptBuilder';

export class PromptManager {
    static buildLexAI(query, context, ocrText, history = []) {
        return PromptBuilder.buildLexAIPrompt(query, context, ocrText, history);
    }

    static buildCaseAI(query, context, ocrText, history = []) {
        return PromptBuilder.buildChatRoomPrompt(query, context, ocrText, history);
    }

    static buildDocumentVault(ocrText, context) {
        return PromptBuilder.buildDocumentAnalysisPrompt(ocrText, context);
    }
}
