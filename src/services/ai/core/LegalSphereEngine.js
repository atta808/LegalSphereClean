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
     * @returns {Promise<string>} The formatted markdown response.
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
     * @returns {Promise<string>} The formatted markdown response.
     */
    static async processCaseAI(caseId, query, fileParams = null) {
        try {
            if (!caseId) throw new Error('caseId is required for Case AI.');
            const rawResponse = await AIRouter.routeCaseAI(caseId, query, fileParams);
            return ResponseFormatter.formatChatResponse(rawResponse);
        } catch (error) {
            if (__DEV__) console.error('Engine processCaseAI Error:', error);
            return ResponseFormatter.formatError(error);
        }
    }

    /**
     * PRODUCT 3: Document Vault AI
     * Automatically analyzes a document and returns structured metadata.
     *
     * @param {Object} fileParams - The document to analyze (must contain uri, type).
     * @param {boolean} [returnMarkdown=false] - Whether to return raw JSON or formatted markdown.
     * @returns {Promise<Object|string>} Structured JS object, or Markdown string if requested.
     */
    static async processDocumentAnalysis(fileParams, returnMarkdown = false) {
        try {
            if (!fileParams) throw new Error('fileParams are required for Document Analysis.');
            const structuredData = await AIRouter.routeDocumentVault(fileParams);

            if (returnMarkdown) {
                return ResponseFormatter.formatDocumentVaultResponse(structuredData);
            }
            return structuredData;
        } catch (error) {
            if (__DEV__) console.error('Engine processDocumentAnalysis Error:', error);
            throw error; // Let the UI handle document errors directly (e.g. showing an alert)
        }
    }
}
