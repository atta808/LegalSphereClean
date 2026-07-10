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
     * @param {LexAIRequest} request - The Lex AI request object containing query, optional history, and optional fileParams.
     * @returns {Promise<import('./models/Responses').AIResponse>} An object with `userFacing` (Markdown) and `metadata`.
     */
    static async processLexAI(request) {
        try {
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
     * @param {CaseAIRequest} request - The Case AI request object.
     * @returns {Promise<import('./models/Responses').AIResponse>} An object with `userFacing` (Markdown) and `metadata`.
     */
    static async processAIChatRoom(request) {
        try {
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
     * @param {DocumentVaultRequest} request - The Document Vault request object.
     * @returns {Promise<import('./models/Responses').AIResponse>} An object containing `structuredData`, `userFacing` (Markdown), and `metadata`.
     */
    static async processDocumentVault(request) {
        try {
            const structuredData = await AIRouter.routeDocumentVault(request);

            return ResponseFormatter.formatDocumentVaultResponse(structuredData);
        } catch (error) {
            if (__DEV__) console.error('Engine processDocumentVault Error:', error);
            AIEvents.emitError(error);
            throw error; // Let the UI handle document errors directly (e.g. showing an alert)
        }
    }
}
