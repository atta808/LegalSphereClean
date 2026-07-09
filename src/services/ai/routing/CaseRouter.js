/**
 * @file CaseRouter.js
 * @description Coordinates the specific workflow for AI ChatRoom (Product 2).
 */

import { ContextManager } from '../core/ContextManager';
import { PromptManager } from '../core/PromptManager';
import { ProviderRegistry } from '../core/ProviderRegistry';
import { AIEvents } from '../core/AIEvents';
import { DocumentReader } from '../document/DocumentReader';
import { AIError } from '../core/models/AIError';

/**
 * Router for AI ChatRoom (Case Intelligence)
 */
export class CaseRouter {
    /**
     * Executes the Case AI pipeline.
     * @param {import('../core/models/Requests').CaseAIRequest} request
     */
    static async route(request) {
        try {
            AIEvents.emitRequestStarted('CaseAI');
            const { caseId, query, fileParams } = request;

            if (!caseId) throw new Error('CaseRouter requires a caseId.');

            // 1. Get Context
            const context = await ContextManager.getCaseContext(caseId);

            // 2. Handle Attachments
            let ocrText = '';
            if (fileParams) {
                 const docResult = await DocumentReader.read(fileParams);
                 if (docResult) ocrText = docResult.text;
            }

            // 3. Build Prompt
            const prompt = PromptManager.buildCaseAI(query, context, ocrText);

            // 4. Execute LLM via Registry
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
                code: 'CASE_AI_ROUTER_ERROR',
                userMessage: 'AI ChatRoom encountered an unexpected issue processing your case query.',
                technicalMessage: error.message,
                source: 'CaseRouter'
            });
        }
    }
}
