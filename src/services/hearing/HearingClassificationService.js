import { isToday, isTomorrow, isPast, toISO } from '../../utils/date';

/**
 * HearingClassificationService
 *
 * Single source of truth for classifying case hearings.
 * No screen, AI module, notification service, or scheduler may independently classify hearings.
 */
class HearingClassificationService {
    /**
     * Categorizes cases based on their next hearing date and status.
     *
     * @param {Array} cases - Array of case objects from SQLite.
     * @returns {Object} Categorized cases: today, tomorrow, upcoming, overdue, pipeline, allActive.
     */
    static classifyHearings(cases) {
        if (!cases || !Array.isArray(cases)) {
            return {
                today: [],
                tomorrow: [],
                upcoming: [],
                overdue: [],
                pipeline: [],
                allActive: []
            };
        }

        const today = [];
        const tomorrow = [];
        const upcoming = [];
        const overdue = [];
        const pipeline = [];
        const allActive = [];

        for (const c of cases) {
            if (c.status === 'pipeline') {
                pipeline.push(c);
            } else if (c.status === 'active') {
                allActive.push(c);

                // FALLBACK: Use nextHearingDate if nextHearingISO is missing
                let hearingIso = c.nextHearingISO;
                if (!hearingIso && c.nextHearingDate) {
                    hearingIso = toISO(c.nextHearingDate);
                }

                if (hearingIso) {
                    if (isToday(hearingIso)) {
                        today.push(c);
                    } else if (isTomorrow(hearingIso)) {
                        tomorrow.push(c);
                    } else if (isPast(hearingIso)) {
                        overdue.push(c);
                    } else {
                        upcoming.push(c);
                    }
                } else {
                    // Active case with no hearing date at all.
                    upcoming.push(c);
                }
            }
        }

        return {
            today,
            tomorrow,
            upcoming,
            overdue,
            pipeline,
            allActive
        };
    }
}

export default HearingClassificationService;