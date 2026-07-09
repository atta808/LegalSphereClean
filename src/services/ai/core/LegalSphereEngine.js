/**
 * @file LegalSphereEngine.js
 * @description The main public API for LegalSphere AI v4.
 * The UI must only interact with this engine, never internal modules directly.
 */

import { AIRouter } from './AIRouter';
import { ResponseFormatter } from './ResponseFormatter';

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
     * @returns {Promise<Object>} An object with `userFacing` (Markdown) and `metadata`.
     */
    static async processLexAI(query, fileParams = null) {
        try {
            const rawResponse = await AIRouter.routeLexAI(query, fileParams);
            return ResponseFormatter.formatChatResponse(rawResponse);
        } catch (error) {
            if (__DEV__) console.error('Engine processLexAI Error:', error);
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
     * @returns {Promise<Object>} An object with `userFacing` (Markdown) and `metadata`.
     */
    static async processAIChatRoom(caseId, query, fileParams = null) {
        try {
            if (!caseId) throw new Error('caseId is required for AI ChatRoom.');
            const rawResponse = await AIRouter.routeCaseAI(caseId, query, fileParams);
            return ResponseFormatter.formatChatResponse(rawResponse);
        } catch (error) {
            if (__DEV__) console.error('Engine processAIChatRoom Error:', error);
            return ResponseFormatter.formatError(error);
        }
    }

    /**
     * PRODUCT 3: Document Vault AI
     * Automatically analyzes a document and returns structured metadata.
     *
     * @param {Object} fileParams - The document to analyze (must contain uri, type).
     * @returns {Promise<Object>} An object containing `structuredData`, `userFacing` (Markdown), and `metadata`.
     */
    static async processDocumentVault(fileParams) {
        try {
            if (!fileParams) throw new Error('fileParams are required for Document Vault.');
            const structuredData = await AIRouter.routeDocumentVault(fileParams);

            return ResponseFormatter.formatDocumentVaultResponse(structuredData);
        } catch (error) {
            if (__DEV__) console.error('Engine processDocumentVault Error:', error);
            throw error; // Let the UI handle document errors directly (e.g. showing an alert)
        }
    }
}
