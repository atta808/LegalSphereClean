import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from './sqliteService';
import { NOTIFICATION_CHANNELS, configureNotificationChannels } from './notificationChannels';

// Tell expo-notifications how to handle incoming notifications when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const scheduleLocalNotification = async ({ title, body, date, data }) => {
  try {
    const channelId = data?.type === 'hearing' || data?.type === 'overdue'
      ? NOTIFICATION_CHANNELS.REMINDERS
      : NOTIFICATION_CHANNELS.DEFAULT;

    let trigger;
    if (Platform.OS === 'android') {
      // Ensure channel is created before scheduling
      await configureNotificationChannels();

      trigger = {
        channelId,
        date,
      };
    } else {
      trigger = date;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger,
    });
    return identifier;
  } catch (error) {
    if (__DEV__) console.log("Error scheduling local notification:", error);
    return null;
  }
};

export const cancelLocalNotification = async (identifier) => {
  if (!identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    if (__DEV__) console.log("Error canceling local notification:", error);
  }
};

export const cancelAllLocalNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    if (__DEV__) console.log("Error canceling all notifications:", error);
  }
};

// Database interactions
export const insertNotificationRecord = (data) => {
  try {
    const now = Date.now();
    db.runSync(
      `INSERT INTO notifications (caseId, hearingId, title, body, type, scheduledFor, notificationIdentifier, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        data.caseId || null,
        data.hearingId || null,
        data.title,
        data.body,
        data.type,
        data.scheduledFor,
        data.notificationIdentifier,
        now,
        now
      ]
    );
  } catch (e) {
    if (__DEV__) console.log("Error inserting notification record:", e);
  }
};

export const updateNotificationRecordStatus = (identifier, status) => {
  try {
    const now = Date.now();
    db.runSync(
      `UPDATE notifications SET status=?, updatedAt=? WHERE notificationIdentifier=?`,
      [status, now, identifier]
    );
  } catch (e) {
    if (__DEV__) console.log("Error updating notification status:", e);
  }
};

export const markNotificationAsRead = (id) => {
  try {
    const now = Date.now();
    db.runSync(`UPDATE notifications SET isRead=1, updatedAt=? WHERE id=?`, [now, id]);
  } catch (e) {
    if (__DEV__) console.log("Error marking notification as read:", e);
  }
};

export const markAllNotificationsAsRead = () => {
  try {
    const now = Date.now();
    db.runSync(
      `UPDATE notifications SET isRead=1, updatedAt=?
       WHERE (scheduledFor IS NULL OR datetime(scheduledFor) <= datetime('now'))`,
      [now]
    );
  } catch (e) {
    if (__DEV__) console.log("Error marking all notifications as read:", e);
  }
};

export const deleteNotificationRecord = (id) => {
  try {
    db.runSync(`DELETE FROM notifications WHERE id=?`, [id]);
  } catch (e) {
    if (__DEV__) console.log("Error deleting notification:", e);
  }
};

export const clearNotificationHistory = () => {
  try {
    db.runSync(
      `DELETE FROM notifications
       WHERE (scheduledFor IS NULL OR datetime(scheduledFor) <= datetime('now'))`
    );
  } catch (e) {
    if (__DEV__) console.log("Error clearing notification history:", e);
  }
};

export const dismissAllDeliveredNotifications = async () => {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    if (__DEV__) console.log("Error dismissing delivered notifications:", error);
  }
};

export const getUnreadNotificationCount = () => {
  try {
    const result = db.getFirstSync(
      `SELECT COUNT(*) as count FROM notifications
       WHERE isRead=0
         AND status != 'cancelled'
         AND (scheduledFor IS NULL OR datetime(scheduledFor) <= datetime('now'))`
    );
    return result?.count || 0;
  } catch (e) {
    if (__DEV__) console.log("Error getting unread count:", e);
    return 0;
  }
};

export const getRecentNotifications = (limit = 3) => {
  try {
    return db.getAllSync(
      `SELECT * FROM notifications
       WHERE status != 'cancelled'
         AND (scheduledFor IS NULL OR datetime(scheduledFor) <= datetime('now'))
       ORDER BY scheduledFor DESC LIMIT ?`,
      [limit]
    );
  } catch (e) {
    if (__DEV__) console.log("Error getting recent notifications:", e);
    return [];
  }
};

export const getAllNotifications = () => {
  try {
    return db.getAllSync(
      `SELECT * FROM notifications
       WHERE status != 'cancelled'
         AND (scheduledFor IS NULL OR datetime(scheduledFor) <= datetime('now'))
       ORDER BY scheduledFor DESC`
    );
  } catch (e) {
    if (__DEV__) console.log("Error getting all notifications:", e);
    return [];
  }
};

export const getPendingNotificationsForCase = (caseId) => {
  try {
    return db.getAllSync(`SELECT * FROM notifications WHERE caseId=? AND status='pending'`, [caseId]);
  } catch (e) {
    if (__DEV__) console.log("Error getting pending case notifications:", e);
    return [];
  }
};

export const getPendingNotificationsForHearing = (hearingId) => {
  try {
    return db.getAllSync(`SELECT * FROM notifications WHERE hearingId=? AND status='pending'`, [hearingId]);
  } catch (e) {
    if (__DEV__) console.log("Error getting pending hearing notifications:", e);
    return [];
  }
};
