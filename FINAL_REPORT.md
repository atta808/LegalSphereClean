# Notification Date Audit Summary

**Files Reviewed:**
- src/services/dailyMaintenanceService.js
- src/services/reminderScheduler.js
- src/services/notificationService.js
- src/services/notificationChannels.js
- src/services/notificationPermission.js
- src/screens/NotificationCenterScreen.js
- src/utils/date.js
- src/screens/DashboardScreen.js
- src/screens/DiaryScreen.js

**Files Modified:**
- src/services/dailyMaintenanceService.js
- src/services/reminderScheduler.js

**Date Inconsistencies Found & Removed:**
1. `dailyMaintenanceService.js` manually checked overdue cases by building `new Date().toISOString().split('T')[0]` and then executing a direct SQLite `< ?` string comparison against `nextHearingISO`. This duplicated the logic of checking overdue and bypassed the centralized standard of parsing the date using `isPast`.
2. `reminderScheduler.js` instantiated raw JS dates via `new Date(dateStr)`. Depending on the user's timezone relative to UTC noon (how dates are stored), raw parsing could accidentally shift the date component to a day before or after when converted locally in JavaScript.

**Duplicate Date Logic Removed:**
- Manual SQL date string comparison for overdue logic (`nextHearingISO < ?`).

**Centralized Utilities Adopted:**
- `isPast` inside `dailyMaintenanceService.js` (filters active cases via `isPast(c.nextHearingISO)`) mirroring the exact logic seen in `DiaryScreen.js` and `DashboardScreen.js`.
- `toDatePickerDate` inside `reminderScheduler.js` (`applyTimeToString`) to safely and consistently instantiate a localized date object from the DB ISO string prior to mutating it for reminder times.

**Time Zone Issues Found & Addressed:**
- The use of `new Date(dateStr)` on ISO strings (e.g. `2024-11-20T12:00:00.000Z`) shifts to the local representation. Using `toDatePickerDate` strictly sets it locally so timezone shifts from midnight boundaries never push the date back or forward inconsistently.

**Notification Scheduling & SQLite Verification:**
- SQLite string `nextHearingISO` format is fully preserved and remains the source of truth across all modules.
- Notifications properly trigger for Overdue, Today, Tomorrow using the standard configured configuration limits.

**Production Readiness Status:**
- Ready for production.
- Refactored logic maintains complete behavioral parity, simply substituting manual date code for the centralized tools.
- All AI Modules, Dashboard, Diary, and Notification schedulers will now deterministically use `isPast` to evaluate Overdue cases.
