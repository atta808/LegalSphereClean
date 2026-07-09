/**
 * @file GeneralPrompts.js
 * @description General formatting helpers for composing user input with context.
 */

export const GeneralPrompts = {
    formatUserQuery: (contextString, ocrText, userMessage) => {
        let finalMessage = '';

        if (contextString) {
            finalMessage += `--- Context Information ---\n${contextString}\n---------------------------\n\n`;
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
