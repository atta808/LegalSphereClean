export const NOTIFICATION_CONFIG = {
  hearingOffsets: [
    { label: "7 days before", value: 7 * 24 * 60 * 60 * 1000 },
    { label: "3 days before", value: 3 * 24 * 60 * 60 * 1000 },
    { label: "1 day before", value: 1 * 24 * 60 * 60 * 1000 },
    { label: "2 hours before", value: 2 * 60 * 60 * 1000 },
  ],
  feeReminderIntervalDays: 30,
  backupReminderIntervalDays: 7,
  aiFollowUpInactivityDays: 45,
};
