/**
 * @file OfficeRouter.js
 * @description Coordinates the specific workflow for Lex AI (Product 1).
 */

import { ContextManager } from '../core/ContextManager';
import { PromptManager } from '../core/PromptManager';
import { ProviderRegistry } from '../core/ProviderRegistry';
import { AIEvents } from '../core/AIEvents';
import { DocumentReader } from '../document/DocumentReader';
import { IntentDetector } from './IntentDetector';
import { AIError } from '../core/models/AIError';

/**
 * Router for Lex AI (Universal Assistant)
 */
export class OfficeRouter {
    /**
     * Executes the Lex AI pipeline.
     * @param {import('../core/models/Requests').LexAIRequest} request
     */
    static async route(request) {
        try {
            AIEvents.emitRequestStarted('LexAI');
            const { query, attachment, history } = request;

            // 1. Detect Intent
            const intent = IntentDetector.detect(query);

            // 2. Get Context
            const context = await ContextManager.getOfficeContext();

            // 3. Handle Attachments
            let ocrText = '';
            if (attachment) {
                 const docResult = await DocumentReader.read(attachment);
                 if (docResult) ocrText = docResult.text;
            }

            // 4. Build Prompt
            const prompt = PromptManager.buildLexAI(query, context, ocrText, history);

            // 5. Execute LLM via Registry
            const llm = ProviderRegistry.getLLMProvider();
            AIEvents.emitAIRequestStarted();

            const response = await llm.execute(prompt);

            ProviderRegistry.reportSuccess(llm);
            AIEvents.emitAIRequestCompleted();

            return response;
        } catch (error) {
            const llm = ProviderRegistry.getLLMProvider();
            ProviderRegistry.reportFailure(llm);

            throw new AIError({
                code: 'LEX_AI_ROUTER_ERROR',
                userMessage: 'Lex AI encountered an unexpected issue processing your request.',
                technicalMessage: error.message,
                source: 'OfficeRouter'
            });
        }
    }
}
