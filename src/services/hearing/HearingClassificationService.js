import { isToday, isTomorrow, isPast } from '../../utils/date';

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

                if (c.nextHearingISO) {
                    if (isToday(c.nextHearingISO)) {
                        today.push(c);
                    } else if (isTomorrow(c.nextHearingISO)) {
                        tomorrow.push(c);
                    } else if (isPast(c.nextHearingISO)) {
                        overdue.push(c);
                    } else {
                        upcoming.push(c);
                    }
                } else {
                    // Active case with no hearing date yet goes to upcoming or pipeline depending on your business rules,
                    // but commonly treated as upcoming or just left in allActive. Let's put in upcoming for now, or ignore.
                    // If no hearing date, it cannot be today, tomorrow, or overdue. We'll add it to upcoming.
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
