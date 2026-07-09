/**
 * @file OfficeContext.js
 * @description Builds the global office context for Lex AI (Product 1).
 * Gathers data from the SQLite database to give the AI an overview of the entire office.
 */

import sqliteService from '../../sqliteService';

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

            const [
                dashboardStats,
                recentCases,
                upcomingHearings
            ] = await Promise.all([
                this._fetchDashboardStats(),
                this._fetchRecentCases(),
                this._fetchUpcomingHearings()
            ]);

            return {
                contextType: 'Office',
                timestamp: new Date().toISOString(),
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
                timestamp: new Date().toISOString(),
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

    static async _fetchRecentCases() {
         try {
             // Limit to 5 for context size management
             const cases = await sqliteService.getCases();
             return cases ? cases.slice(0, 5) : [];
         } catch (e) {
             return [];
         }
    }

    static async _fetchUpcomingHearings() {
        try {
             // Fetch today/tomorrow as an example
             const hearings = await sqliteService.getHearingsByDate(
                 new Date().toISOString().split('T')[0]
             );
             return hearings || [];
        } catch (e) {
             return [];
        }
    }
}
