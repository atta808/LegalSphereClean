/**
 * @file OfficeRouter.js
 * @description Coordinates the specific workflow for Lex AI (Product 1).
 */

import { ContextManager } from '../core/ContextManager';
import { PromptManager } from '../core/PromptManager';
import { ProviderRegistry } from '../core/ProviderRegistry';
import { DocumentReader } from '../document/DocumentReader';
import { IntentDetector } from './IntentDetector';

/**
 * Router for Lex AI (Universal Assistant)
 */
export class OfficeRouter {
    /**
     * Executes the Lex AI pipeline.
     */
    static async route(query, fileParams = null) {
        // 1. Detect Intent
        const intent = IntentDetector.detect(query);

        // 2. Get Context
        // For simple greetings or general conversational queries without attachments,
        // we could potentially skip fetching heavy context. For now, we fetch it.
        const context = await ContextManager.getOfficeContext();

        // 3. Handle Attachments
        let ocrText = '';
        if (fileParams) {
             const docResult = await DocumentReader.read(fileParams);
             if (docResult) ocrText = docResult.text;
        }

        // 4. Build Prompt
        // Note: We can pass the intent down if we want different prompt builders
        // based on the intent in the future.
        const prompt = PromptManager.buildLexAI(query, context, ocrText);

        // 5. Execute LLM via Registry
        const llm = ProviderRegistry.getLLMProvider();
        return await llm.execute(prompt);
    }
}
