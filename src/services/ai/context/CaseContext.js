/**
 * @file CaseContext.js
 * @description Builds the specific context for AI ChatRoom (Product 2).
 * Focuses entirely on a single case to provide deep, narrow intelligence.
 */

import sqliteService from '../../sqliteService';

/**
 * Case Context Builder
 */
export class CaseContext {
    /**
     * Gathers all relevant information for a specific legal case.
     *
     * @param {number|string} caseId - The identifier of the case.
     * @returns {Promise<Object>} The structured case context.
     */
    static async build(caseId) {
        if (!caseId) {
            throw new Error('CaseContext requires a valid caseId.');
        }

        try {
            // Fetch case details in parallel
            const [
                caseDetails,
                hearings,
                notes,
                documents
            ] = await Promise.all([
                sqliteService.getCaseById(caseId),
                sqliteService.getHearingsByCase(caseId),
                sqliteService.getNotesByCase(caseId),
                sqliteService.getDocumentsByCase(caseId)
            ]);

            if (!caseDetails) {
                 throw new Error(`Case with ID ${caseId} not found.`);
            }

            return {
                contextType: 'SingleCase',
                caseId: caseId,
                timestamp: new Date().toISOString(),
                details: caseDetails,
                hearings: hearings || [],
                notes: notes || [],
                documentsSummary: documents ? documents.map(d => ({ id: d.id, title: d.title, type: d.type })) : []
            };
        } catch (error) {
            if (__DEV__) {
                console.error('CaseContext Error:', error.message);
            }
            throw new Error(`Failed to build CaseContext: ${error.message}`);
        }
    }
}
