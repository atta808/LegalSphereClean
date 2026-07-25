/**
 * @file OfficeContext.js
 * @description Builds the global office context for Lex AI (Product 1).
 * Gathers data from the SQLite database to give the AI an overview of the entire office.
 */

import { getAllCases } from '../../sqliteService';
import sqliteService from '../../sqliteService';
import HearingClassificationService from '../../hearing/HearingClassificationService';
import { toISO } from '../../../utils/date';

/**
 * Office Context Builder
 */
export class OfficeContext {
    /**
     * Gathers a comprehensive snapshot of the entire legal office.
     *
     * @returns {Promise<Object>} The structured office context.
     */
    static async build() {
        try {
            const allCases = await getAllCases();

            const dashboardStats = await this._fetchDashboardStats();

            // Limit to 3 for context size management
            const recentCases = allCases ? allCases.slice(0, 3).map(c => ({
                id: c.id,
                caseNo: c.caseNo,
                title: c.title,
                status: c.status
            })) : [];

            // Classify hearings using the fixed service (now falls back to nextHearingDate)
            const {
                today,
                tomorrow,
                upcoming,
                overdue,
                pipeline
            } = HearingClassificationService.classifyHearings(allCases);

            // Helper to format a hearing for the AI with all relevant details
            const formatHearing = (c) => ({
                title: c.title || 'Untitled Case',
                court: c.court || 'Court not specified',
                caseNo: c.caseNo || 'N/A',
                judge: c.judge || 'Not assigned',
                date: c.nextHearingDate || c.nextHearingISO || 'No date',
                priority: c.priority || 'normal',
                feeBalance: c.feeBalance || 0
            });

            // Build a structured hearings object
            const hearings = {
                today: today.map(formatHearing),
                tomorrow: tomorrow.map(formatHearing),
                upcoming: upcoming.map(formatHearing),
                overdue: overdue.map(formatHearing),
                pipeline: pipeline.map(formatHearing)
            };

            // Legacy flat array for backward compatibility
            const upcomingHearings = [
                ...today.map(formatHearing),
                ...tomorrow.map(formatHearing),
                ...upcoming.map(formatHearing)
            ];

            return {
                contextType: 'Office',
                timestamp: toISO(new Date()),
                dashboard: dashboardStats,
                recentCases: recentCases,
                hearings,                // structured by category
                upcomingHearings         // legacy flat list
            };
        } catch (error) {
            if (__DEV__) {
                console.error('OfficeContext Error:', error.message);
            }
            // Return minimal context on failure
            return {
                contextType: 'Office',
                error: 'Failed to fully load office context.',
                timestamp: toISO(new Date()),
                hearings: {
                    today: [],
                    tomorrow: [],
                    upcoming: [],
                    overdue: [],
                    pipeline: []
                },
                upcomingHearings: []
            };
        }
    }

    static async _fetchDashboardStats() {
        try {
            const result = await sqliteService.getDashboardStats();
            return result || {};
        } catch (e) {
            return { error: 'Unavailable' };
        }
    }
}