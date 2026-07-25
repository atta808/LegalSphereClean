/**
 * @file OfficeStatisticsBuilder.js
 * @description Computes aggregated statistics for the office, used by Lex AI.
 * Separated from OfficeContext to keep context focused on raw data.
 */

import {
  getCasesByStatus,
  getHearingsByDate,
  getTotalFeeBalance,
  getRecentActivity,
} from "../../sqliteService";

const DEFAULT_RECENT_LIMIT = 5;

export class OfficeStatisticsBuilder {
  /**
   * Builds a statistics object with computed aggregates.
   * @param {number} [recentLimit=5] - Number of recent activity items to fetch.
   * @returns {Promise<Object>} Statistics object.
   */
  static async build(recentLimit = DEFAULT_RECENT_LIMIT) {
    try {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      // Run queries in parallel
      const [
        activeCases,
        pendingCases,
        todayHearings,
        tomorrowHearings,
        outstandingFees,
        recentActivity,
      ] = await Promise.all([
        getCasesByStatus("active"),
        getCasesByStatus("pending"),
        getHearingsByDate(todayStr),
        getHearingsByDate(tomorrowStr),
        getTotalFeeBalance(),
        getRecentActivity(recentLimit),
      ]);

      const stats = {
        activeCasesCount: (activeCases || []).length,
        pendingCasesCount: (pendingCases || []).length,
        todayHearingsCount: (todayHearings || []).length,
        tomorrowHearingsCount: (tomorrowHearings || []).length,
        totalOutstandingFees: outstandingFees || 0,
        recentActivity: recentActivity || [],
      };

      // Safe __DEV__ check that works in Node, React Native, and bundled web apps
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log(
          `OfficeStatisticsBuilder: Active: ${stats.activeCasesCount}, ` +
            `Pending: ${stats.pendingCasesCount}, Today: ${stats.todayHearingsCount}, ` +
            `Tomorrow: ${stats.tomorrowHearingsCount}, Outstanding: ${stats.totalOutstandingFees}`,
        );
      }

      return stats;
    } catch (error) {
      console.error("OfficeStatisticsBuilder error:", error);
      // Return safe fallback
      return {
        activeCasesCount: 0,
        pendingCasesCount: 0,
        todayHearingsCount: 0,
        tomorrowHearingsCount: 0,
        totalOutstandingFees: 0,
        recentActivity: [],
      };
    }
  }
}
