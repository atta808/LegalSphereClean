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
            // Take the last 6 messages for tighter token budget and relevance
            const recentHistory = history.slice(-6);
            recentHistory.forEach(msg => {
                // Ensure we don't duplicate context if the previous response was long
                let msgText = msg.text;
                if (msgText.length > 1000) {
                    msgText = msgText.substring(0, 1000) + "... [truncated for length]";
                }
                finalMessage += `${msg.role === 'user' ? 'User' : 'Lex'}: ${msgText}\n`;
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
