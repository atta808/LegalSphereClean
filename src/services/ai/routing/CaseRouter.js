/**
 * @file CaseRouter.js
 * @description Coordinates the specific workflow for AI ChatRoom (Product 2).
 */

import { ContextManager } from '../core/ContextManager';
import { PromptManager } from '../core/PromptManager';
import { ProviderRegistry } from '../core/ProviderRegistry';
import { DocumentReader } from '../document/DocumentReader';

/**
 * Router for AI ChatRoom (Case Intelligence)
 */
export class CaseRouter {
    /**
     * Executes the Case AI pipeline.
     */
    static async route(caseId, query, fileParams = null) {
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
        return await llm.execute(prompt);
    }
}
