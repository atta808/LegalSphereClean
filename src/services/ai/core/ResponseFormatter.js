/**
 * @file ResponseFormatter.js
 * @description Ensures all responses exiting the AI Core are clean and professional.
 * Prevents raw data, JSON blocks, or stack traces from reaching the UI.
 */

import { MarkdownFormatter } from '../utils/MarkdownFormatter';

export class ResponseFormatter {
    /**
     * Formats the raw text response from a chat-based AI (Lex / Case).
     */
    static formatChatResponse(rawText) {
        return MarkdownFormatter.sanitizeResponse(rawText);
    }

    /**
     * Converts the structured Document Vault output into a professional Markdown string.
     */
    static formatDocumentVaultResponse(structuredData) {
        return MarkdownFormatter.formatDocumentReport(structuredData);
    }

    /**
     * Safely formats an error message.
     */
    static formatError(error) {
        // We never expose raw stack traces to the UI
        return `I encountered an error processing your request: ${error.message || 'Unknown error'}. Please try again later.`;
    }
}
