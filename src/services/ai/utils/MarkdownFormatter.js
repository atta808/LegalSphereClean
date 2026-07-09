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

            markdown += `### ${title}\n\n`;

            if (format === 'list' && Array.isArray(content)) {
                content.forEach(item => {
                    markdown += `- ${item}\n`;
                });
            } else if (format === 'text') {
                 markdown += `${content}\n`;
            } else {
                 // Fallback stringification
                 markdown += `${String(content)}\n`;
            }

            markdown += '\n';
        };

        // Title/Summary Section
        if (data.documentType) {
            markdown += `## Document Analysis: ${data.documentType}\n\n`;
        } else {
            markdown += `## Document Analysis Report\n\n`;
        }

        addSection('Summary', data.summary);

        // Key Metadata
        addSection('Parties Involved', data.parties, 'list');
        addSection('Important Dates', data.importantDates, 'list');
        addSection('Important Numbers', data.importantNumbers, 'list');

        // Detailed Analysis
        addSection('Key Facts', data.keyFacts, 'list');
        addSection('Legal Issues', data.legalIssues, 'list');
        addSection('Important Clauses', data.clauses, 'list');

        // Evaluation
        addSection('Evidence Value', data.evidenceValue);
        addSection('Identified Risks', data.risks, 'list');
        addSection('Missing Information', data.missingInformation, 'list');

        // Actions
        addSection('Recommended Actions', data.recommendations, 'list');

        // Metadata footer
        if (data.keywords && data.keywords.length > 0) {
            markdown += `**Keywords:** ${data.keywords.join(', ')}\n\n`;
        }

        if (data.confidence) {
             markdown += `*AI Confidence Level: ${data.confidence}*\n`;
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
        return cleaned.trim();
    }
}
