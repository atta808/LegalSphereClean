/**
 * @file ResponseFormatter.js
 * @description Ensures all responses exiting the AI Core are clean and professional.
 * Prevents raw data, JSON blocks, or stack traces from reaching the UI.
 */

import { MarkdownFormatter } from '../utils/MarkdownFormatter';
import { ProviderRegistry } from './ProviderRegistry';

export class ResponseFormatter {
    /**
     * Generates standard metadata for all AI responses.
     */
    static _generateMetadata() {
        return {
            engineVersion: '4.0.0',
            promptVersion: '1.0.0',
            provider: ProviderRegistry.getLLMProvider().name || 'Unknown',
            ocrProvider: ProviderRegistry.getImageOCRProvider().name || 'Unknown',
            aiVersion: '1.0',
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Formats the raw text response from a chat-based AI (Lex / Case).
     * Returns an object containing the formatted UI markdown and internal metadata.
     */
    static formatChatResponse(rawText) {
        return {
            userFacing: MarkdownFormatter.sanitizeResponse(rawText),
            metadata: this._generateMetadata()
        };
    }

    /**
     * Converts the structured Document Vault output into a professional Markdown string.
     * Returns an object containing the structured data, markdown, and metadata.
     */
    static formatDocumentVaultResponse(structuredData) {
        return {
            structuredData,
            userFacing: MarkdownFormatter.formatDocumentReport(structuredData),
            metadata: this._generateMetadata()
        };
    }

    /**
     * Safely formats an error message.
     * @param {import('./models/AIError').AIError|Error} error
     */
    static formatError(error) {
        // If it's a standardized AIError, use its user-friendly message
        const userFacingMessage = error.userMessage
            || `I encountered an error processing your request. Please try again later.`;

        return {
            // We never expose raw stack traces to the UI
            userFacing: userFacingMessage,
            metadata: {
                error: true,
                errorCode: error.code || 'UNKNOWN_ERROR',
                generatedAt: new Date().toISOString()
            }
        };
    }
}
