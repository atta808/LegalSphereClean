/**
 * @file DocumentRouter.js
 * @description Coordinates the specific workflow for Document Vault AI (Product 3).
 */

import { ContextManager } from '../core/ContextManager';
import { DocumentAnalyzer } from '../document/DocumentAnalyzer';
import { AIEvents } from '../core/AIEvents';
import { AIError } from '../core/models/AIError';

/**
 * Router for Document Vault AI (Structured Analysis)
 */
export class DocumentRouter {
    /**
     * Executes the Document Vault AI pipeline.
     * @param {import('../core/models/Requests').DocumentVaultRequest} request
     */
    static async route(request) {
        try {
            AIEvents.emitRequestStarted('DocumentVault');
            const { fileParams } = request;
            if (!fileParams) throw new Error('DocumentRouter requires file parameters.');

            // 1. Get Context (Metadata)
            const context = ContextManager.getDocumentContext(fileParams);

            // 2. Execute Document Analyzer (OCR -> Prompt -> LLM -> JSON Parse)
            // Returns structured JS object.
            const result = await DocumentAnalyzer.analyze(fileParams, context);

            AIEvents.emitAnalysisCompleted();
            return result;
        } catch (error) {
            throw new AIError({
                code: 'DOCUMENT_ROUTER_ERROR',
                userMessage: 'Document Vault AI encountered an error analyzing your document.',
                technicalMessage: error.message,
                source: 'DocumentRouter'
            });
        }
    }
}
