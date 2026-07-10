import { NOTIFICATION_CONFIG, NOTIFICATION_FEATURES } from '../config/notificationConfig';
import {
  scheduleLocalNotification,
  insertNotificationRecord,
  updateNotificationRecordStatus
} from './notificationService';
import { db } from './sqliteService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_MAINTENANCE_KEY = 'last_maintenance_timestamp';
const LAST_BACKUP_KEY = 'last_backup_timestamp';

export const runDailyMaintenance = async () => {
  try {
    const now = Date.now();
    const lastRunStr = await AsyncStorage.getItem(LAST_MAINTENANCE_KEY);
    const lastRun = lastRunStr ? parseInt(lastRunStr, 10) : 0;

    // Only run once a day (roughly 24h)
    if (now - lastRun < 24 * 60 * 60 * 1000) {
      return;
    }

    if (__DEV__) console.log("🛠 Running daily maintenance task...");

    // 1. Mark expired notifications as delivered/expired based on scheduledFor
    db.runSync(
      `UPDATE notifications
       SET status='delivered', updatedAt=?
       WHERE status='pending'
         AND scheduledFor IS NOT NULL
         AND datetime(scheduledFor) <= datetime('now')`,
      [now]
    );


    // 2. Overdue Hearing Reminders (Daily Check)
    if (NOTIFICATION_FEATURES.overdueReminder) {
      // Find active cases where nextHearingISO is in the past
      // If proceedings are updated, nextHearingISO will be updated.
      // If the case is still stuck with a past nextHearingISO, it's overdue.
      const todayIso = new Date().toISOString().split('T')[0];

      const overdueCases = db.getAllSync(
        `SELECT id, title, caseNo FROM cases
         WHERE status='active' AND isDeleted=0 AND nextHearingISO < ?`,
        [todayIso] // Less than today's date means the hearing has passed
      );

      for (const c of overdueCases) {
        // Check if an overdue notification is already scheduled to prevent duplicates
        const existing = db.getFirstSync(
          `SELECT id FROM notifications WHERE caseId=? AND type='overdue' AND status='pending'`,
          [c.id]
        );

        if (!existing) {
          const reminderDate = new Date();
          const [hours, minutes] = NOTIFICATION_CONFIG.overdueReminderTime.split(':').map(Number);
          reminderDate.setHours(hours, minutes, 0, 0);

          // If it's already past 6:00 PM, schedule for next day (or schedule immediately, but user asked for 6:00 PM daily)
          if (reminderDate <= new Date()) {
            reminderDate.setDate(reminderDate.getDate() + 1);
          }

          const title = `Hearing Overdue: ${c.title || 'Case'}`;
          const body = `Please update proceedings for case ${c.caseNo || ''}.`;

          const identifier = await scheduleLocalNotification({
            title,
            body,
            date: reminderDate,
            data: { caseId: c.id, type: 'overdue' }
          });

          if (identifier) {
            insertNotificationRecord({
              caseId: c.id,
              hearingId: null,
              title,
              body,
              type: 'overdue',
              scheduledFor: reminderDate.toISOString(),
              notificationIdentifier: identifier
            });
          }
        }
      }
    }

    // 3. AI Follow-up Reminders
    if (NOTIFICATION_FEATURES.aiFollowUpReminders) {
      const aiInactivityDays = 45; // Hardcoded fallback for V1
      const cutoffDate = new Date(now - (aiInactivityDays * 24 * 60 * 60 * 1000)).toISOString();

      // Find cases with no activity (updatedAt) since cutoff and active
      const inactiveCases = db.getAllSync(
        `SELECT id, title, caseNo FROM cases
         WHERE status='active' AND isDeleted=0 AND updatedAt < ?`,
        [new Date(cutoffDate).getTime()]
      );

      for (const c of inactiveCases) {
        // Check if we already scheduled an AI reminder for this case recently
        const existing = db.getFirstSync(
          `SELECT id FROM notifications WHERE caseId=? AND type='ai' AND status='pending'`,
          [c.id]
        );

        if (!existing) {
          const reminderDate = new Date(); // Schedule immediately (or next suitable time)
          reminderDate.setHours(reminderDate.getHours() + 1);

          const title = "AI Follow-up Suggestion";
          const body = `Case ${c.title || c.caseNo || ''} has been inactive for ${aiInactivityDays} days. Would you like AI suggestions?`;

          const identifier = await scheduleLocalNotification({
            title,
            body,
            date: reminderDate,
            data: { caseId: c.id, type: 'ai' }
          });

          if (identifier) {
            insertNotificationRecord({
              caseId: c.id,
              hearingId: null,
              title,
              body,
              type: 'ai',
              scheduledFor: reminderDate.toISOString(),
              notificationIdentifier: identifier
            });
          }
        }
      }
    }

    // 4. Backup Reminders
    if (NOTIFICATION_FEATURES.backupReminders) {
      const backupIntervalDays = 7; // Hardcoded fallback for V1
      const lastBackupStr = await AsyncStorage.getItem(LAST_BACKUP_KEY);
      const lastBackup = lastBackupStr ? parseInt(lastBackupStr, 10) : 0;

      if (now - lastBackup > backupIntervalDays * 24 * 60 * 60 * 1000) {
        // Only schedule if not already pending
        const existingBackup = db.getFirstSync(
          `SELECT id FROM notifications WHERE type='backup' AND status='pending'`
        );

        if (!existingBackup) {
           const reminderDate = new Date();
           reminderDate.setHours(reminderDate.getHours() + 1);

           const title = "Backup Reminder";
           const body = `You haven't backed up your data in ${backupIntervalDays} days.`;

           const identifier = await scheduleLocalNotification({
             title,
             body,
             date: reminderDate,
             data: { type: 'backup' }
           });

           if (identifier) {
             insertNotificationRecord({
               caseId: null,
               hearingId: null,
               title,
               body,
               type: 'backup',
               scheduledFor: reminderDate.toISOString(),
               notificationIdentifier: identifier
             });
           }
        }
      }
    }
await AsyncStorage.setItem(LAST_MAINTENANCE_KEY, now.toString());
    if (__DEV__) console.log("✅ Daily maintenance completed.");
  } catch (e) {
    if (__DEV__) console.log("❌ Daily maintenance error:", e);
  }
};
