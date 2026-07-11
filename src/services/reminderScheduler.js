import { NOTIFICATION_CONFIG, NOTIFICATION_FEATURES } from '../config/notificationConfig';
import {
  scheduleLocalNotification,
  cancelLocalNotification,
  insertNotificationRecord,
  getPendingNotificationsForCase,
  updateNotificationRecordStatus
} from './notificationService';
import { db } from './sqliteService';
import { toDatePickerDate } from '../utils/date';


const applyTimeToString = (dateStr, timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Use centralized parsing utility (toDatePickerDate) to consistently parse hearing ISO dates into stable local objects without UTC offset shift
  const date = toDatePickerDate(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Helper to calculate reminder dates
const calculateReminderDates = (hearingDateISO) => {
  if (!hearingDateISO) return [];

  const now = new Date();
  const reminders = [];

  // Tomorrow's Hearing Reminder
  const tomorrowReminder = applyTimeToString(hearingDateISO, NOTIFICATION_CONFIG.tomorrowReminderTime);
  tomorrowReminder.setDate(tomorrowReminder.getDate() - 1);
  if (tomorrowReminder > now) {
    reminders.push({
      date: tomorrowReminder,
      label: 'tomorrow'
    });
  }

  // Today's Hearing Reminder
  const todayReminder = applyTimeToString(hearingDateISO, NOTIFICATION_CONFIG.todayReminderTime);
  if (todayReminder > now) {
    reminders.push({
      date: todayReminder,
      label: 'today'
    });
  }

  return reminders;
};

export const cancelCaseNotifications = async (caseId) => {
  const pending = getPendingNotificationsForCase(caseId);
  for (const notif of pending) {
    if (notif.notificationIdentifier) {
      await cancelLocalNotification(notif.notificationIdentifier);
      updateNotificationRecordStatus(notif.notificationIdentifier, 'cancelled');
    }
  }
};

export const cancelHearingNotifications = async (hearingId) => {
  try {
    const pending = db.getAllSync(`SELECT * FROM notifications WHERE hearingId=? AND status='pending'`, [hearingId]);
    for (const notif of pending) {
      if (notif.notificationIdentifier) {
        await cancelLocalNotification(notif.notificationIdentifier);
        updateNotificationRecordStatus(notif.notificationIdentifier, 'cancelled');
      }
    }
  } catch (e) {
    if (__DEV__) console.log("Error canceling hearing notifications:", e);
  }
};

export const scheduleCaseNotifications = async (caseData, options = {}) => {
  if (!caseData || !caseData.id) return;

  // First, cancel existing to prevent duplicates
  const pending = getPendingNotificationsForCase(caseData.id);

  for (const notif of pending) {
    if (options.preserveFeeReminder && notif.type === 'fee') {
      continue;
    }
    if (notif.notificationIdentifier) {
      await cancelLocalNotification(notif.notificationIdentifier);
      updateNotificationRecordStatus(notif.notificationIdentifier, 'cancelled');
    }
  }

  // 1. Hearing Reminders
  if (NOTIFICATION_FEATURES.hearingReminders && caseData.nextHearingISO) {
    const reminders = calculateReminderDates(caseData.nextHearingISO);
    for (const reminder of reminders) {
      const title = `Hearing Reminder: ${caseData.title || 'Case'}`;
      const body = `Hearing scheduled ${reminder.label} for case ${caseData.caseNo || ''}.`;

      const identifier = await scheduleLocalNotification({
        title,
        body,
        date: reminder.date,
        data: { caseId: caseData.id, type: 'hearing' }
      });

      if (identifier) {
        insertNotificationRecord({
          caseId: caseData.id,
          hearingId: null, // If we don't have the specific hearing ID at case creation
          title,
          body,
          type: 'hearing',
          scheduledFor: reminder.date.toISOString(),
          notificationIdentifier: identifier
        });
      }
    }
  }

  // 2. Overdue Hearing Reminder
  if (NOTIFICATION_FEATURES.overdueReminder && caseData.nextHearingISO) {
    const now = new Date();
    const overdueReminder = applyTimeToString(caseData.nextHearingISO, NOTIFICATION_CONFIG.overdueReminderTime);

    // Only schedule if it's in the future
    if (overdueReminder > now) {
      const title = `Hearing Overdue: ${caseData.title || 'Case'}`;
      const body = `Please update proceedings for case ${caseData.caseNo || ''}.`;

      const identifier = await scheduleLocalNotification({
        title,
        body,
        date: overdueReminder,
        data: { caseId: caseData.id, type: 'overdue' }
      });

      if (identifier) {
        insertNotificationRecord({
          caseId: caseData.id,
          hearingId: null,
          title,
          body,
          type: 'overdue',
          scheduledFor: overdueReminder.toISOString(),
          notificationIdentifier: identifier
        });
      }
    }
  }

  // 3. Fee Reminders
  if (NOTIFICATION_FEATURES.feeReminders) {
    const existingFeeNotif = options.preserveFeeReminder
      ? pending.find(n => n.type === 'fee' && n.status === 'pending')
      : null;

    if (!existingFeeNotif && caseData.feeBalance && Number(caseData.feeBalance) > 0) {
      const feeReminderDate = new Date();
      // Hardcoded fallback since feeReminderIntervalDays is removed from NOTIFICATION_CONFIG for V1
      feeReminderDate.setDate(feeReminderDate.getDate() + 30);

      const title = `Fee Reminder: ${caseData.title || 'Case'}`;
      const body = `You have an outstanding fee balance of ${caseData.feeBalance}.`;

      const identifier = await scheduleLocalNotification({
        title,
        body,
        date: feeReminderDate,
        data: { caseId: caseData.id, type: 'fee' }
      });

      if (identifier) {
        insertNotificationRecord({
          caseId: caseData.id,
          hearingId: null,
          title,
          body,
          type: 'fee',
          scheduledFor: feeReminderDate.toISOString(),
          notificationIdentifier: identifier
        });
      }
    }
  }
};

export const updateCaseNotifications = async (caseId, options = {}) => {
  try {
    const caseData = db.getFirstSync("SELECT * FROM cases WHERE id = ?", [caseId]);
    if (caseData) {
      // If case is archived or deleted, just cancel everything and return
      if (caseData.status === 'archived' || caseData.isDeleted === 1) {
        await cancelCaseNotifications(caseId);
        return;
      }
      await scheduleCaseNotifications(caseData, options);
    }
  } catch (e) {
    if (__DEV__) console.log("Error updating case notifications:", e);
  }
};
