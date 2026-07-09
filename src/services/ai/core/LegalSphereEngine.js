/**
 * @file LegalSphereEngine.js
 * @description The main public API for LegalSphere AI v4.
 * The UI must only interact with this engine, never internal modules directly.
 */

import { AIRouter } from './AIRouter';
import { ResponseFormatter } from './ResponseFormatter';
import { LexAIRequest, CaseAIRequest, DocumentVaultRequest } from './models/Requests';
import { AIEvents } from './AIEvents';

/**
 * LegalSphere AI Engine
 */
export class LegalSphereEngine {

    /**
     * PRODUCT 1: Lex AI (Universal Assistant)
     * Processes a query for the office-wide universal assistant.
     *
     * @param {string} query - The user's message.
     * @param {Object} [fileParams=null] - Optional file attachment (uri, type, name, base64).
     * @returns {Promise<import('./models/Responses').AIResponse>} An object with `userFacing` (Markdown) and `metadata`.
     */
    static async processLexAI(query, fileParams = null) {
        try {
            const request = new LexAIRequest({ query, fileParams });
            const rawResponse = await AIRouter.routeLexAI(request);
            return ResponseFormatter.formatChatResponse(rawResponse);
        } catch (error) {
            if (__DEV__) console.error('Engine processLexAI Error:', error);
            AIEvents.emitError(error);
            return ResponseFormatter.formatError(error);
        }
    }

    /**
     * PRODUCT 2: AI ChatRoom (Single-Case Intelligence)
     * Processes a query specifically bound to a single legal case.
     *
     * @param {number|string} caseId - The ID of the current case.
     * @param {string} query - The user's message.
     * @param {Object} [fileParams=null] - Optional file attachment.
     * @returns {Promise<import('./models/Responses').AIResponse>} An object with `userFacing` (Markdown) and `metadata`.
     */
    static async processAIChatRoom(caseId, query, fileParams = null) {
        try {
            const request = new CaseAIRequest({ caseId, query, fileParams });
            const rawResponse = await AIRouter.routeCaseAI(request);
            return ResponseFormatter.formatChatResponse(rawResponse);
        } catch (error) {
            if (__DEV__) console.error('Engine processAIChatRoom Error:', error);
            AIEvents.emitError(error);
            return ResponseFormatter.formatError(error);
        }
    }

    /**
     * PRODUCT 3: Document Vault AI
     * Automatically analyzes a document and returns structured metadata.
     *
     * @param {Object} fileParams - The document to analyze (must contain uri, type).
     * @returns {Promise<import('./models/Responses').AIResponse>} An object containing `structuredData`, `userFacing` (Markdown), and `metadata`.
     */
    static async processDocumentVault(fileParams) {
        try {
            const request = new DocumentVaultRequest({ fileParams });
            const structuredData = await AIRouter.routeDocumentVault(request);

            return ResponseFormatter.formatDocumentVaultResponse(structuredData);
        } catch (error) {
            if (__DEV__) console.error('Engine processDocumentVault Error:', error);
            AIEvents.emitError(error);
            throw error; // Let the UI handle document errors directly (e.g. showing an alert)
        }
    }
}
