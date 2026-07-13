/**
 * @file MarkdownFormatter.js
 * @description Responsible for formatting structured analysis objects into professional Markdown.
 * Separates presentation logic from AI business logic.
 */

/**
 * Markdown Formatter Utility
 */
export class MarkdownFormatter {
    /**
     * Formats a DocumentAnalyzer response object into Markdown.
     *
     * @param {Object} data - The structured object from DocumentAnalyzer.
     * @returns {string} The formatted Markdown string.
     */
    static formatDocumentReport(data) {
        if (!data || typeof data !== 'object') {
            return 'Error: Invalid report data provided.';
        }

        let markdown = '';

        // Helper to add sections if they exist and aren't empty
        const addSection = (title, content, format = 'text') => {
            if (!content) return;
            if (Array.isArray(content) && content.length === 0) return;
            if (typeof content === 'object' && !Array.isArray(content) && Object.keys(content).length === 0) return;

            markdown += `${title}\n\n━━━━━━━━━━━━━━━━━━\n\n`;

            if (format === 'list' && Array.isArray(content)) {
                content.forEach(item => {
                    markdown += `• ${item}\n`;
                });
            } else if (format === 'text') {
                 markdown += `${content}\n`;
            } else {
                 // Fallback stringification
                 markdown += `${String(content)}\n`;
            }

            markdown += '\n';
        };

        markdown += `### Document Analysis\n\n━━━━━━━━━━━━━━━━━━\n\n`;

        addSection('Executive Summary', data.executiveSummary);
        addSection('Document Type', data.documentType);
        addSection('Parties', data.parties, 'list');
        addSection('Important Dates', data.importantDates, 'list');
        addSection('Legal Issues', data.legalIssues, 'list');
        addSection('Risks', data.risks, 'list');
        addSection('Recommendations', data.recommendations, 'list');

        if (data.confidence) {
             markdown += `Confidence\n\n━━━━━━━━━━━━━━━━━━\n\n*${data.confidence}*\n`;
        }

        return markdown.trim();
    }

    /**
     * Ensures any text is wrapped cleanly without exposing internal raw structures.
     *
     * @param {string} text - Raw text to sanitize/format.
     * @returns {string} Sanitized string.
     */
    static sanitizeResponse(text) {
        if (!text) return '';

        // If the entire response is wrapped in a generic JSON code block by accident
        // (which sometimes happens if LLM gets confused about format instructions)
        let cleaned = text;
        if (cleaned.startsWith('```json') && cleaned.endsWith('```')) {
            cleaned = cleaned.replace(/^```json/i, '').replace(/```$/, '');
        }

        // Do NOT blindly replace all ``` as Lex AI handles programming questions

        // Strip markdown tables, since they are forbidden in this context.
        // Identify table rows (starting and ending with pipe, or containing multiple pipes)
        // and table separator rows (like |---|---|). We avoid stripping standard dashes `-` used in bullets.
        cleaned = cleaned.replace(/^\|.*\|$/gm, '').replace(/^\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/gm, '').trim();

        // Also clean up multiple blank lines left by removing tables
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

        return cleaned.trim();
    }
}
