import { isToday, isTomorrow, isPast, toDisplay } from "../../utils/date";

/**
 * Shared service for classifying cases into hearing categories.
 * Ensures identical classification logic across Diary, Calendar, Dashboard, and AI.
 */
export const getHearingCategories = (allCases) => {
  const pending = [];
  const todayHearings = [];
  const tomorrowHearings = [];
  const upcomingHearings = [];
  const overdueHearings = [];
  const pipeline = [];

  // Default empty object if nothing passed
  if (!allCases || !Array.isArray(allCases)) {
    return {
      pendingHearings: pending,
      todayHearings: todayHearings,
      tomorrowHearings: tomorrowHearings,
      upcomingHearings: upcomingHearings,
      overdueHearings: overdueHearings,
      pipelineCases: pipeline
    };
  }

  allCases.forEach((c) => {
    // Inject pre-formatted display dates for UI and AI consistency
    if (c.nextHearingISO) {
        c.nextHearingDisplay = toDisplay(c.nextHearingISO);
    }

    if (c.status === "archived") return;
    if (c.status === "pipeline") {
      pipeline.push(c);
    } else if (!c.nextHearingISO) {
      pending.push(c);
    } else if (isToday(c.nextHearingISO)) {
      todayHearings.push(c);
    } else if (isTomorrow(c.nextHearingISO)) {
      tomorrowHearings.push(c);
    } else if (isPast(c.nextHearingISO)) {
      pending.push(c);
      overdueHearings.push(c); // Past dates are overdue
    } else {
      upcomingHearings.push(c);
    }
  });

  const sortByDate = (a, b) => {
    if (!a.nextHearingISO) return 1;
    if (!b.nextHearingISO) return -1;
    return a.nextHearingISO.localeCompare(b.nextHearingISO);
  };

  pending.sort(sortByDate);
  todayHearings.sort(sortByDate);
  tomorrowHearings.sort(sortByDate);
  upcomingHearings.sort(sortByDate);
  overdueHearings.sort(sortByDate);
  pipeline.sort(sortByDate);

  return {
    pendingHearings: pending,       // Overdue + No dates
    todayHearings: todayHearings,
    tomorrowHearings: tomorrowHearings,
    upcomingHearings: upcomingHearings,
    overdueHearings: overdueHearings, // Specifically past dates
    pipelineCases: pipeline
  };
};
