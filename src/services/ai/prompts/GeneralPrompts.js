/**
 * @file GeneralPrompts.js
 * @description General formatting helpers for composing user input with context.
 */

export const GeneralPrompts = {
    formatUserQuery: (contextString, ocrText, userMessage, history = []) => {
        let finalMessage = '';

        if (contextString) {
            finalMessage += `--- Context Information ---\n${contextString}\n---------------------------\n\n`;
        }

        if (history && Array.isArray(history) && history.length > 0) {
            finalMessage += `--- Conversation History ---\n`;
            // Take the last 10 messages for token budget
            const recentHistory = history.slice(-10);
            recentHistory.forEach(msg => {
                finalMessage += `${msg.role === 'user' ? 'User' : 'Lex'}: ${msg.text}\n`;
            });
            finalMessage += `----------------------------\n\n`;
        }

        if (ocrText) {
             finalMessage += `--- Attached Document Text ---\n${ocrText}\n------------------------------\n\n`;
        }

        if (userMessage) {
            finalMessage += `User Query: ${userMessage}`;
        }

        return finalMessage;
    }
};
