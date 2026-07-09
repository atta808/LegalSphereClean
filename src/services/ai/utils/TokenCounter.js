/**
 * @file TokenCounter.js
 * @description Provides a lightweight heuristic for estimating token usage in the application.
 * Prevents prompt bloat without requiring heavy dependency libraries like tiktoken on mobile.
 */

/**
 * Token Counter Utility
 */
export class TokenCounter {
    /**
     * Estimates the number of tokens in a given string.
     * Uses a common heuristic of ~4 characters per token for English text.
     *
     * @param {string} text - The text to evaluate.
     * @returns {number} The estimated token count.
     */
    static estimate(text) {
        if (!text || typeof text !== 'string') return 0;

        // A simple heuristic: 1 token ~= 4 chars in English
        // This is safe for basic limits checking.
        return Math.ceil(text.length / 4);
    }

    /**
     * Truncates text to a maximum estimated token count.
     *
     * @param {string} text - The text to truncate.
     * @param {number} maxTokens - The maximum allowed tokens.
     * @returns {string} The truncated text.
     */
    static truncate(text, maxTokens) {
        if (!text || typeof text !== 'string') return '';

        const currentTokens = this.estimate(text);
        if (currentTokens <= maxTokens) {
            return text;
        }

        // Calculate max characters based on the heuristic
        const maxChars = maxTokens * 4;

        // Truncate and add ellipsis to indicate omission
        let truncated = text.substring(0, maxChars);

        // Try to snap to the last space to avoid breaking words
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 0) {
            truncated = truncated.substring(0, lastSpace);
        }

        return truncated + '... [Content truncated due to length]';
    }
}
