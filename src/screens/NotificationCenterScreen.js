import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import {
  getAllNotifications, markNotificationAsRead,
  markAllNotificationsAsRead, deleteNotificationRecord,
  clearNotificationHistory
} from '../services/notificationService';
import { toDisplay } from '../utils/date';

const FILTERS = ['All', 'Unread', 'Hearing', 'Fee', 'AI', 'Backup'];

export default function NotificationCenterScreen() {
  const { colors, resolvedTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(() => {
    try {
      const data = getAllNotifications();
      setNotifications(data);
    } catch (e) {
      console.log('Error loading notifications:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    loadNotifications();
    setRefreshing(false);
  };

  const handlePress = (item) => {
    if (item.isRead === 0) {
      markNotificationAsRead(item.id);
      loadNotifications();
    }

    if (item.caseId) {
      navigation.navigate("CaseDetail", { caseId: item.caseId });
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Notification', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        deleteNotificationRecord(item.id);
        if (item.notificationIdentifier) {
          const { cancelLocalNotification } = require('../services/notificationService');
          await cancelLocalNotification(item.notificationIdentifier);
        }
        loadNotifications();
      }}
    ]);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    loadNotifications();
  };

  const handleClearAll = () => {
    Alert.alert('Clear History', 'Are you sure you want to delete all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: async () => {
        clearNotificationHistory();
        const { dismissAllDeliveredNotifications } = require('../services/notificationService');
        await dismissAllDeliveredNotifications();
        loadNotifications();
      }}
    ]);
  };

  const getIconForType = (type) => {
    switch(type) {
      case 'hearing': return 'calendar-outline';
      case 'fee': return 'cash-outline';
      case 'ai': return 'sparkles-outline';
      case 'backup': return 'cloud-upload-outline';
      default: return 'notifications-outline';
    }
  };

  const filteredData = notifications.filter(item => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Unread') return item.isRead === 0;
    return item.type?.toLowerCase() === activeFilter.toLowerCase();
  });

  const renderItem = ({ item }) => (
    <TouchableOpacity accessibilityRole="button"
      style={[styles.notificationCard, item.isRead === 0 && styles.unreadCard]}
      onPress={() => handlePress(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getIconForType(item.type)} size={24} color={colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.titleText}>{item.title}</Text>
        <Text style={styles.bodyText} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.timeText}>{toDisplay(item.createdAt)}</Text>
      </View>
      {item.isRead === 0 && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.menuBtn} onPress={handleClearAll}>
          <Ionicons name="trash-outline" size={22} color={colors.danger || '#ef4444'} />
        </TouchableOpacity>
      </View>

      {/* FILTER BAR */}
      <View style={styles.filterWrapper}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity accessibilityRole="button"
              style={[styles.filterChip, activeFilter === item && styles.activeChip]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterText, activeFilter === item && styles.activeFilterText]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* LIST */}
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.border} />
            <Text style={styles.emptyText}>No notifications found.</Text>
          </View>
        }
      />

      {notifications.some(n => n.isRead === 0) && (
        <TouchableOpacity accessibilityRole="button" style={styles.markAllReadBtn} onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done" size={20} color="#fff" />
          <Text style={styles.markAllReadText}>Mark All as Read</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  menuBtn: { padding: 4 },
  filterWrapper: { paddingVertical: 8, backgroundColor: colors.surface },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    marginRight: 8, backgroundColor: colors.background
  },
  activeChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.text, fontWeight: '500', fontSize: 13 },
  activeFilterText: { color: '#fff' },
  listContent: { padding: 16, paddingBottom: 100 },
  notificationCard: {
    flexDirection: 'row', backgroundColor: colors.surface, padding: 16,
    borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center'
  },
  unreadCard: { backgroundColor: colors.primaryLight || `${colors.primary}10`, borderColor: colors.primary },
  iconContainer: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
    marginRight: 12
  },
  cardContent: { flex: 1 },
  titleText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  bodyText: { fontSize: 14, color: colors.secondaryText, marginBottom: 8, lineHeight: 20 },
  timeText: { fontSize: 12, color: colors.tertiaryText },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginLeft: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: colors.secondaryText },
  markAllReadBtn: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    flexDirection: 'row', backgroundColor: colors.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
    alignItems: 'center', elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4
  },
  markAllReadText: { color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 8 }
});
