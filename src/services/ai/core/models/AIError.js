/**
 * @file AIError.js
 * @description Standardized error model for the entire AI Core.
 */

export class AIError extends Error {
    /**
     * @param {Object} params
     * @param {string} params.code - A unique error code (e.g., 'OCR_FAILED', 'LLM_TIMEOUT')
     * @param {string} params.userMessage - Safe message to display to the UI
     * @param {string} params.technicalMessage - Detailed developer message
     * @param {boolean} [params.recoverable=false] - Whether the system can retry or fallback
     * @param {string} params.source - Module where the error originated
     */
    constructor({ code, userMessage, technicalMessage, recoverable = false, source }) {
        super(technicalMessage);
        this.name = 'AIError';
        this.code = code;
        this.userMessage = userMessage;
        this.technicalMessage = technicalMessage;
        this.recoverable = recoverable;
        this.source = source;
        const { toISO } = require('../../../../utils/date');
        this.timestamp = toISO(new Date());
    }

    /**
     * Serializes the error for logging or structured output.
     */
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            userMessage: this.userMessage,
            technicalMessage: this.technicalMessage,
            recoverable: this.recoverable,
            source: this.source,
            timestamp: this.timestamp
        };
    }
}
