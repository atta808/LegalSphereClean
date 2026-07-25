/**
 * @file LegalSphereEngine.js
 * @description The main public API for LegalSphere AI v4.
 * The UI must only interact with this engine, never internal modules directly.
 */

import { AIRouter } from './AIRouter';
import { ResponseFormatter } from './ResponseFormatter';
import { LexAIRequest, CaseAIRequest, DocumentVaultRequest } from './models/Requests';
import { AIEvents } from './AIEvents';
import { FileIngestionService } from '../document/FileIngestionService';
import { AIError } from './models/AIError';

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
            this._validateChatRequest(request, 'Lex AI');
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
            this._validateChatRequest(request, 'AI ChatRoom', true);
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
            this._validateDocumentRequest(request);
            const structuredData = await AIRouter.routeDocumentVault(request);

            return ResponseFormatter.formatDocumentVaultResponse(structuredData);
        } catch (error) {
            if (__DEV__) console.error('Engine processDocumentVault Error:', error);
            AIEvents.emitError(error);
            throw error; // Let the UI handle document errors directly (e.g. showing an alert)
        }
    }

    static _validateChatRequest(request, productName, requiresCaseId = false) {
        if (!request || typeof request !== 'object') {
            throw this._validationError('AI_REQUEST_INVALID', `${productName} request must be an object.`);
        }
        if (typeof request.query !== 'string' || !request.query.trim()) {
            throw this._validationError('AI_QUERY_MISSING', `${productName} request requires a non-empty query.`);
        }
        if (requiresCaseId && (request.caseId === null || request.caseId === undefined || !String(request.caseId).trim())) {
            throw this._validationError('CASE_ID_MISSING', 'AI ChatRoom requires a valid caseId.');
        }
        if (request.attachment) {
            FileIngestionService.validate(request.attachment);
        }
    }

    static _validateDocumentRequest(request) {
        if (!request || typeof request !== 'object' || !request.attachment) {
            throw this._validationError('ATTACHMENT_MISSING', 'Document Vault requires an attachment.');
        }
        FileIngestionService.validate(request.attachment);
    }

    static _validationError(code, technicalMessage) {
        return new AIError({
            code,
            userMessage: code === 'CASE_ID_MISSING'
                ? 'Open AI ChatRoom from a case before starting a conversation.'
                : 'The AI request is incomplete. Please try again.',
            technicalMessage,
            source: 'LegalSphereEngine',
        });
    }
}
