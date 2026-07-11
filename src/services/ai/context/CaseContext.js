/**
 * @file CaseContext.js
 * @description Builds the specific context for AI ChatRoom (Product 2).
 * Focuses entirely on a single case to provide deep, narrow intelligence.
 */

import sqliteService from '../../sqliteService';
import { toDisplay } from '../../../utils/date';

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
                timeline,
                citations,
                notes,
                documents
            ] = await Promise.all([
                sqliteService.getCaseById(caseId),
                sqliteService.getHearingsByCase ? sqliteService.getHearingsByCase(caseId) : sqliteService.getCaseHearings ? sqliteService.getCaseHearings(caseId) : [],
                sqliteService.getTimelineByCaseId ? sqliteService.getTimelineByCaseId(caseId) : [],
                sqliteService.getCitationsByCaseId ? sqliteService.getCitationsByCaseId(caseId) : [],

                sqliteService.getCaseNotes(caseId),
                sqliteService.getDocumentsByCaseId ? sqliteService.getDocumentsByCaseId(caseId) : []
            ]);

            if (!caseDetails) {
                 throw new Error(`Case with ID ${caseId} not found.`);
            }

            // Inject human-readable display dates to prevent duplicate date math and ensure accuracy
            if (caseDetails.nextHearingISO) {
                caseDetails.nextHearingDisplay = toDisplay(caseDetails.nextHearingISO);
            }

            const formattedHearings = (hearings || []).map(h => ({
                ...h,
                dateDisplay: h.date ? toDisplay(h.date) : (h.hearingDateISO ? toDisplay(h.hearingDateISO) : null)
            }));

            const formattedTimeline = (timeline || []).map(t => ({
                ...t,
                dateDisplay: t.date ? toDisplay(t.date) : (t.hearingDate ? toDisplay(t.hearingDate) : null)
            }));

            const { toISO } = require('../../../utils/date');
            return {
                contextType: 'SingleCase',
                caseId: caseId,
                timestamp: toISO(new Date()),
                details: caseDetails,
                hearings: formattedHearings,
                timeline: formattedTimeline,
                citations: citations || [],
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
