/**
 * @file IntentDetector.js
 * @description Deterministic rule-based intent detection.
 * Used internally by routers to categorize queries without hitting an LLM.
 * (e.g. distinguishing a general greeting from a statistical query).
 */

/**
 * Intent Detector
 */
export class IntentDetector {
    /**
     * Analyzes a text query to determine its primary intent using heuristics.
     *
     * @param {string} text - The user query.
     * @returns {string} The detected intent (e.g., 'statistics', 'greeting', 'general').
     */
    static detect(text) {
        if (!text) return 'general';

        const lowerText = text.toLowerCase();

        // Greetings
        const greetings = ['hi', 'hello', 'hey', 'salam', 'assalam', 'good morning', 'good evening'];
        if (greetings.some(g => lowerText.startsWith(g) && lowerText.length < 20)) {
            return 'greeting';
        }

        // Statistical / Office Queries
        const statsKeywords = ['how many', 'total', 'stats', 'statistics', 'dashboard', 'cases do i have', 'hearings today'];
        if (statsKeywords.some(k => lowerText.includes(k))) {
             return 'statistics';
        }

        // Drafting
        const draftKeywords = ['draft', 'write a', 'create a document', 'prepare a'];
        if (draftKeywords.some(k => lowerText.includes(k))) {
             return 'drafting';
        }

        return 'general';
    }
}
