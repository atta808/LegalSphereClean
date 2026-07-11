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
            // Note: We use the existing sqliteService for data fetching.
            // A production implementation would optimize these queries.

            const allCases = await getAllCases();

            const dashboardStats = await this._fetchDashboardStats();

            // Limit to 5 for context size management
            const recentCases = allCases ? allCases.slice(0, 5) : [];

            const { today, tomorrow } = HearingClassificationService.classifyHearings(allCases);
            const upcomingHearings = [...today, ...tomorrow];

            return {
                contextType: 'Office',
                timestamp: toISO(new Date()),
                dashboard: dashboardStats,
                recentCases: recentCases,
                upcomingHearings: upcomingHearings,
                // Additional global data can be appended here (e.g. process fees, notes)
            };
        } catch (error) {
            if (__DEV__) {
                console.error('OfficeContext Error:', error.message);
            }
            // Return minimal context on failure rather than crashing the AI
            return {
                contextType: 'Office',
                error: 'Failed to fully load office context.',
                timestamp: toISO(new Date()),
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
