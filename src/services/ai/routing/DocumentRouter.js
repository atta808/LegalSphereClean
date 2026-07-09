/**
 * @file DocumentRouter.js
 * @description Coordinates the specific workflow for Document Vault AI (Product 3).
 */

import { ContextManager } from '../core/ContextManager';
import { DocumentAnalyzer } from '../document/DocumentAnalyzer';

/**
 * Router for Document Vault AI (Structured Analysis)
 */
export class DocumentRouter {
    /**
     * Executes the Document Vault AI pipeline.
     */
    static async route(fileParams) {
        if (!fileParams) throw new Error('DocumentRouter requires file parameters.');

        // 1. Get Context (Metadata)
        const context = ContextManager.getDocumentContext(fileParams);

        // 2. Execute Document Analyzer (OCR -> Prompt -> LLM -> JSON Parse)
        // Returns structured JS object.
        return await DocumentAnalyzer.analyze(fileParams, context);
    }
}
