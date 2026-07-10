import { NOTIFICATION_CONFIG } from '../config/notificationConfig';
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

    // 2. AI Follow-up Reminders
    const cutoffDate = new Date(now - (NOTIFICATION_CONFIG.aiFollowUpInactivityDays * 24 * 60 * 60 * 1000)).toISOString();

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
        const body = `Case ${c.title || c.caseNo || ''} has been inactive for ${NOTIFICATION_CONFIG.aiFollowUpInactivityDays} days. Would you like AI suggestions?`;

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

    // 3. Backup Reminders
    const lastBackupStr = await AsyncStorage.getItem(LAST_BACKUP_KEY);
    const lastBackup = lastBackupStr ? parseInt(lastBackupStr, 10) : 0;

    if (now - lastBackup > NOTIFICATION_CONFIG.backupReminderIntervalDays * 24 * 60 * 60 * 1000) {
      // Only schedule if not already pending
      const existingBackup = db.getFirstSync(
        `SELECT id FROM notifications WHERE type='backup' AND status='pending'`
      );

      if (!existingBackup) {
         const reminderDate = new Date();
         reminderDate.setHours(reminderDate.getHours() + 1);

         const title = "Backup Reminder";
         const body = `You haven't backed up your data in ${NOTIFICATION_CONFIG.backupReminderIntervalDays} days.`;

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

    await AsyncStorage.setItem(LAST_MAINTENANCE_KEY, now.toString());
    if (__DEV__) console.log("✅ Daily maintenance completed.");
  } catch (e) {
    if (__DEV__) console.log("❌ Daily maintenance error:", e);
  }
};
