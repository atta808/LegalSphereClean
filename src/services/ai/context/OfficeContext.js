/**
 * @file OfficeContext.js
 * @description Builds the global office context for Lex AI (Product 1).
 * Gathers data from the SQLite database to give the AI an overview of the entire office.
 */

import { getAllCases, getDashboardStats } from '../../sqliteService';
import { getHearingCategories } from '../../hearing/HearingClassificationService';

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
            const [
                dashboardStats,
                allCases
            ] = await Promise.all([
                this._fetchDashboardStats(),
                this._fetchAllCases()
            ]);

            const {
                todayHearings,
                tomorrowHearings,
                upcomingHearings,
                overdueHearings
            } = getHearingCategories(allCases);

            // Keep recentCases logic but use the loaded cases to avoid a duplicate DB call
            const recentCases = allCases ? allCases.slice(0, 5) : [];

            const { toISO } = require('../../../utils/date');
            return {
                contextType: 'Office',
                timestamp: toISO(new Date()),
                dashboard: dashboardStats,
                recentCases: recentCases,
                todayHearings: todayHearings,
                tomorrowHearings: tomorrowHearings,
                upcomingHearings: upcomingHearings,
                overdueHearings: overdueHearings,
            };
        } catch (error) {
            if (__DEV__) {
                console.error('OfficeContext Error:', error.message);
            }
            // Return minimal context on failure rather than crashing the AI
            const { toISO } = require('../../../utils/date');
            return {
                contextType: 'Office',
                error: 'Failed to fully load office context.',
                timestamp: toISO(new Date()),
            };
        }
    }

    static async _fetchDashboardStats() {
        try {
            const result = await getDashboardStats();
            return result || {};
        } catch (e) {
            return { error: 'Unavailable' };
        }
    }

    static async _fetchAllCases() {
         try {
             const cases = await getAllCases();
             return cases || [];
         } catch (e) {
             return [];
         }
    }
}
