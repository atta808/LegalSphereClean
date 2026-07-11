import React from "react";
import EmptyState from '../components/EmptyState';
import PremiumCard from '../components/PremiumCard';
import { useTheme } from "../theme/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getAllCases,
  getProfile,
  getDashboardStats,
  getLitigationStats,
  getWorkflowStats,
} from "../services/sqliteService";
import { exportCauseListPdf } from "../utils/causeListPdf";
import { formatMoney, getCurrency } from "../utils/currency";
import { isPast, isToday } from "../utils/date";

const quickActions = [
  { label: "Add Case", icon: "add-circle-outline", action: "addCase" },
  { label: "Diary", icon: "journal-outline", action: "diary" },
  { label: "Calendar", icon: "calendar-outline", action: "calendar" },
  { label: "Fees", icon: "cash-outline", action: "fees" },
  { label: "Process Fee", icon: "scale-outline", action: "processFee" },
  { label: "Clients", icon: "people-outline", action: "clients" },
  { label: "Masters", icon: "build-outline", action: "masters" },
  { label: "Archive", icon: "archive-outline", action: "archive" },
  { label: "Quick Links", icon: "link-outline", action: "quickLinks" },
  { label: "Settings", icon: "settings-outline", action: "settings" },
];

export default function DashboardScreen({ profile, onLogout }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({
    activeCases: 0,
    urgentCases: 0,
    pipelineCases: 0,
    outstandingFees: 0,
  });
  const [litigationStats, setLitigationStats] = useState({
    civil: 0,
    criminal: 0,
    family: 0,
  });
  const [workflowStats, setWorkflowStats] = useState([]);
  const [todayHearings, setTodayHearings] = useState([]);
  const [pendingHearings, setPendingHearings] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [totalCases, setTotalCases] = useState(0);
  const [imageKey, setImageKey] = useState(Date.now());
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const locale = currentProfile?.locale || "en-PK";
  const currency = getCurrency(currentProfile);
  const navigation = useNavigation();
  const loadStats = useCallback(async () => {
    try {
      const allCases = await getAllCases();

      if (!Array.isArray(allCases)) {
        setTodayHearings([]);
        setPendingHearings([]);
        return;
      }
      const dashboardStats = getDashboardStats();

      const litigation = getLitigationStats();

      const workflows = getWorkflowStats();

      setStats(dashboardStats);

      setLitigationStats(litigation);

      setWorkflowStats(workflows.map((w) => [w.workflowType, w.total]));

      setTotalCases(dashboardStats.totalCases);

      const { getUnreadNotificationCount, getRecentNotifications } = require('../services/notificationService');
      setUnreadNotificationsCount(getUnreadNotificationCount());
      setRecentNotifications(getRecentNotifications(3));

      const todayList = [];
      const pendingList = [];

      allCases.forEach((c) => {
        if (c.status === "archived" || c.status === "pipeline") return;

        if (!c.nextHearingISO) {
          pendingList.push(c);
        } else if (isToday(c.nextHearingISO)) {
          todayList.push(c);
        } else if (isPast(c.nextHearingISO)) {
          pendingList.push(c);
        }
      });

      const safeSort = (a, b) =>
        (a.nextHearingISO || "9999").localeCompare(b.nextHearingISO || "9999");
      pendingList.sort(safeSort);
      todayList.sort(safeSort);

      setTodayHearings(todayList);
      setPendingHearings(pendingList);
    } catch (err) {
      console.log("Dashboard stats error:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();

      const loadProfile = async () => {
        try {
          const freshData = await getProfile();
          if (freshData) {
            setCurrentProfile(freshData);
            setImageKey(Date.now()); // ✅ refresh only when profile updates
          }
        } catch (e) {
          console.log("Profile reload error:", e);
        }
      };

      loadProfile();

      return () => {}; // ensures refresh cycle
    }, [loadStats]),
  );

  useEffect(() => {
    if (pendingHearings.length > 0) setActiveSection("pending");
    else if (todayHearings.length > 0) setActiveSection("today");
  }, [pendingHearings, todayHearings]);

  const completedTasks = 0;
  const totalTasks = pendingHearings.length + todayHearings.length;

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `⚖️ ${currentProfile?.name || "Advocate"}\n📍 ${currentProfile?.jurisdiction || ""}\n📞 ${currentProfile?.phone || ""}\n\nShared via technaam.com`,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const handleTodayPDF = async () => {
    try {
      const allCases = await getAllCases();
      const todayCases = allCases.filter(
        (c) =>
          c.status !== "archived" &&
          c.status !== "pipeline" &&
          c.nextHearingISO &&
          isToday(c.nextHearingISO),
      );
      if (todayCases.length === 0)
        return Alert.alert("No Hearings", "No hearings today");
      exportCauseListPdf(todayCases, "Today's Cause List");
    } catch {
      Alert.alert("Error", "Failed to generate PDF");
    }
  };

  const handleQuickAction = (action) => {
    const routes = {
      addCase: "AddCase",
      calendar: "Calendar",
      fees: "FeeManager",
      processFee: "ProcessFee",
      masters: "Masters",
      archive: "Archive",
      quickLinks: "QuickLinks",
      settings: "Settings",
    };

    if (routes[action]) {
      if (action === "masters") {
        return navigation.navigate("Masters", { returnTo: "Dashboard" });
      }

      return navigation.navigate(routes[action]);
    }
    if (action === "diary")
      return navigation.navigate("MainTabs", { screen: "Diary" });
    if (action === "clients")
      return navigation.navigate("MainTabs", { screen: "Clients" });
    Alert.alert("Coming soon", "Feature update in progress.");
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* HEADER */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View style={styles.profileSection}>
            <View style={styles.avatarGlow}>
              <Text style={styles.avatarText}>
                {currentProfile?.name?.charAt(0) || "A"}
              </Text>
            </View>
            <View>
              <Text style={styles.welcomeLabel}>LegalSphere Diary</Text>
              <Text style={styles.lawyerName}>
                {currentProfile?.name || "Advocate"}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity accessibilityRole="button"
              style={styles.glassButton}
              onPress={() => navigation.navigate("NotificationCenter")}
            >
              <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
              {unreadNotificationsCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity accessibilityRole="button"
              style={styles.glassButton}
              onPress={handleTodayPDF}
            >
              <Text style={styles.iconText}>📄</Text>
            </TouchableOpacity>
            {/* NEW LEX AI BUTTON */}
            <TouchableOpacity accessibilityRole="button"
              style={styles.glassButton}
              onPress={() => navigation.navigate("LexAi")}
            >
              <Text style={styles.iconText}>⚡</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.jurisdictionContainer}>
          <Text style={styles.jurisdictionText}>
            📍 {currentProfile?.jurisdiction || "High Court"} •{" "}
            {currentProfile?.country || "Pakistan"}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        {/* RECENT NOTIFICATIONS PREVIEW */}
        {recentNotifications.length > 0 && (
          <View style={styles.notificationsPreviewContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Notifications</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate("NotificationCenter")}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.notificationsList}>
              {recentNotifications.map((notif, index) => (
                <TouchableOpacity accessibilityRole="button"
                  key={notif.id || index.toString()}
                  style={[styles.notificationMiniCard, notif.isRead === 0 && styles.notificationMiniUnread]}
                  onPress={() => {
                    const { markNotificationAsRead } = require('../services/notificationService');
                    if (notif.isRead === 0) {
                      markNotificationAsRead(notif.id);
                    }
                    if (notif.caseId) {
                      navigation.navigate("CaseDetail", { caseId: notif.caseId });
                    } else {
                      navigation.navigate("NotificationCenter");
                    }
                  }}
                >
                  <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                    <Text style={styles.notifBody} numberOfLines={1}>{notif.body}</Text>
                  </View>
                  {notif.isRead === 0 && <View style={styles.unreadDotMini} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* FLOATING STATS */}
        <View style={styles.floatingStats}>
          <View style={styles.statMini}>
            <Text style={styles.statMiniVal}>{stats.activeCases}</Text>
            <Text style={styles.statMiniLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statMini}>
            <Text style={[styles.statMiniVal, { color: colors.text }]}>
              {stats.urgentCases}
            </Text>
            <Text style={styles.statMiniLabel}>Urgent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statMini}>
            <Text style={styles.statMiniVal}>{todayHearings.length}</Text>
            <Text style={styles.statMiniLabel}>Today</Text>
          </View>
        </View>

        <Text style={{ marginBottom: 10, color: colors.secondaryText, fontWeight: "600" }}>
          Total Cases: {totalCases}
        </Text>
        <View style={styles.litigationCard}>
          <Text style={styles.litigationTitle}>Litigation Intelligence</Text>

          <View style={styles.litigationRow}>
            <View style={styles.litigationItem}>
              <Text style={styles.litigationValue}>
                {litigationStats.civil}
              </Text>

              <Text style={styles.litigationLabel}>Civil</Text>
            </View>

            <View style={styles.litigationDivider} />

            <View style={styles.litigationItem}>
              <Text style={[styles.litigationValue, { color: colors.danger }]}>
                {litigationStats.criminal}
              </Text>

              <Text style={styles.litigationLabel}>Criminal</Text>
            </View>

            <View style={styles.litigationDivider} />

            <View style={styles.litigationItem}>
              <Text style={[styles.litigationValue, { color: colors.text }]}>
                {litigationStats.family}
              </Text>

              <Text style={styles.litigationLabel}>Family</Text>
            </View>
          </View>
        </View>
        <View style={styles.workflowCard}>
          <Text style={styles.workflowTitle}>Top Litigation Workflows</Text>

          {workflowStats.length === 0 ? (
            <Text style={styles.workflowEmpty}>
              No workflow intelligence yet
            </Text>
          ) : (
            workflowStats.map(([name, count]) => (
              <View key={name} style={styles.workflowRow}>
                <Text style={styles.workflowName}>{name}</Text>

                <View style={styles.workflowCount}>
                  <Text style={styles.workflowCountText}>{count}</Text>
                </View>
              </View>
            ))
          )}
        </View>
        {/* DAILY CARD */}
        <View style={styles.dailyTaskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>Daily Completion</Text>
            <Text style={styles.taskCount}>
              {completedTasks}/{totalTasks}
            </Text>
          </View>
          <Text style={styles.statValue}>
            {formatMoney(stats.outstandingFees, currency, locale)}
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width:
                    totalTasks > 0
                      ? `${(completedTasks / totalTasks) * 100}%`
                      : "0%",
                },
              ]}
            />
          </View>
          <Text style={styles.taskHint}>
            {totalTasks === 0
              ? "Chamber is clear ✅"
              : `${totalTasks} hearings pending`}
          </Text>
        </View>

        {/* ALERTS SECTION */}
        {pendingHearings.length > 0 && (
          <View style={[styles.alertRibbon, styles.pendingBox]}>
            <TouchableOpacity accessibilityRole="button"
              style={styles.alertHeader}
              onPress={() =>
                setActiveSection(activeSection === "pending" ? null : "pending")
              }
            >
              <Text style={[styles.alertTitle, { color: colors.text }]}>
                ⚠️ Pending ({pendingHearings.length})
              </Text>
              <Text style={{ fontWeight: "900" }}>
                {activeSection === "pending" ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>
            {activeSection === "pending" &&
              pendingHearings.map((item) => (
                <View key={item.id} style={styles.alertItemRow}>
                  {/* LEFT → Case Info */}
                  <TouchableOpacity accessibilityRole="button"
                    style={{ flex: 1 }}
                    onPress={() =>
                      navigation.navigate("CaseDetail", { caseId: item.id })
                    }
                  >
                    <Text style={styles.caseName}>{item.title}</Text>
                    <Text style={styles.caseCourt}>
                      {item.court || "No Court"}
                    </Text>
                    {!!item.litigationDomain && (
                      <View
                        style={[
                          styles.domainBadge,

                          item.litigationDomain === "criminal" &&
                            styles.criminalBadge,

                          item.litigationDomain === "family" &&
                            styles.familyBadge,

                          item.litigationDomain === "civil" &&
                            styles.civilBadge,
                        ]}
                      >
                        <Text style={styles.domainBadgeText}>
                          {item.litigationDomain.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* RIGHT → UPDATE BUTTON */}
                  <TouchableOpacity accessibilityRole="button"
                    style={styles.updateBtn}
                    onPress={() =>
                      navigation.navigate("UpdateCaseHearing", {
                        caseId: item.id,
                        caseData: item,
                        mode: "edit",
                      })
                    }
                  >
                    <Text style={styles.updateBtnText}>⚡ Update</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}

        {todayHearings.length > 0 && (
          <View style={[styles.alertRibbon, styles.todayBox]}>
            <TouchableOpacity accessibilityRole="button"
              style={styles.alertHeader}
              onPress={() =>
                setActiveSection(activeSection === "today" ? null : "today")
              }
            >
              <Text style={[styles.alertTitle, { color: colors.text }]}>
                🔔 Today ({todayHearings.length})
              </Text>
              <Text style={{ fontWeight: "900" }}>
                {activeSection === "today" ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>
            {activeSection === "today" &&
              todayHearings.map((item) => (
                <View key={item.id} style={styles.alertItemRow}>
                  {/* LEFT → Case Info */}
                  <TouchableOpacity accessibilityRole="button"
                    style={{ flex: 1 }}
                    onPress={() =>
                      navigation.navigate("CaseDetail", { caseId: item.id })
                    }
                  >
                    <Text style={styles.caseName}>{item.title}</Text>
                    <Text style={styles.caseCourt}>
                      {item.court || "No Court"}
                    </Text>
                    {!!item.litigationDomain && (
                      <View
                        style={[
                          styles.domainBadge,

                          item.litigationDomain === "criminal" &&
                            styles.criminalBadge,

                          item.litigationDomain === "family" &&
                            styles.familyBadge,

                          item.litigationDomain === "civil" &&
                            styles.civilBadge,
                        ]}
                      >
                        <Text style={styles.domainBadgeText}>
                          {item.litigationDomain.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* RIGHT → UPDATE BUTTON */}
                  <TouchableOpacity accessibilityRole="button"
                    style={styles.updateBtn}
                    onPress={() =>
                      navigation.navigate("UpdateCaseHearing", {
                        caseId: item.id,
                        caseData: item,
                        mode: "edit",
                      })
                    }
                  >
                    <Text style={styles.updateBtnText}>⚡ Update</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}

        {/* LAWYER PROFILE CARD */}
        <View style={styles.profileCard}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.profileLeft}
            onPress={() => navigation.navigate("LawyerProfile")}
          >
            {currentProfile?.image ? (
              <Image
                source={{ uri: currentProfile.image + "?t=" + imageKey }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {currentProfile?.name?.charAt(0) || "A"}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.profileName}>
                {currentProfile?.name || "Advocate"}
              </Text>
              <Text style={styles.profileSub}>
                {currentProfile?.jurisdiction || "High Court"}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            style={styles.shareBtn}
            onPress={handleShareProfile}
          >
            <Text style={{ color: colors.surface, fontWeight: "700" }}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* ACTION GRID */}
        <Text style={styles.sectionHeading}>Practice Management</Text>
        <View style={styles.actionGrid}>
          {quickActions.map((item) => (
            <PremiumCard key={item.label} style={styles.actionCard} onPress={() => handleQuickAction(item.action)} elevationLevel={1}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </PremiumCard>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },
  premiumHeader: {
    backgroundColor: resolvedTheme === 'dark' ? colors.surface : colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 50,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    ...(resolvedTheme === 'dark' ? {
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 0,
    } : {}),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: resolvedTheme === 'dark' ? colors.surface : colors.primary,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileSection: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarGlow: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: resolvedTheme === 'dark' ? colors.primaryLight : "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: resolvedTheme === 'dark' ? colors.primary : colors.surface, fontSize: 20, fontWeight: "800" },
  welcomeLabel: { color: resolvedTheme === 'dark' ? colors.secondaryText : "rgba(255,255,255,0.8)", fontSize: 11 },
  lawyerName: { color: resolvedTheme === 'dark' ? colors.primary : colors.surface, fontSize: 17, fontWeight: "700" },
  glassLogout: {
    backgroundColor: resolvedTheme === 'dark' ? colors.card : "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    ...(resolvedTheme === 'dark' ? {
      borderWidth: 1,
      borderColor: colors.border,
    } : {}),
  },
  logoutText: { color: resolvedTheme === 'dark' ? colors.primary : colors.surface, fontSize: 12, fontWeight: "600" },
  jurisdictionContainer: {
    marginTop: 15,
    backgroundColor: resolvedTheme === 'dark' ? colors.card : "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 10,
    ...(resolvedTheme === 'dark' ? {
      borderWidth: 1,
      borderColor: colors.border,
    } : {}),
  },
  jurisdictionText: { color: resolvedTheme === 'dark' ? colors.text : colors.surface, fontSize: 12 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
  notificationsPreviewContainer: {
    marginTop: -20,
    marginBottom: 20,
    zIndex: 10,
  },
  notificationsList: {
    marginTop: 10,
  },
  notificationMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationMiniUnread: {
    backgroundColor: colors.primaryLight || `${colors.primary}10`,
    borderColor: colors.primary,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  notifBody: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  unreadDotMini: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  floatingStats: {
    flexDirection: "row",
    backgroundColor: resolvedTheme === 'dark' ? colors.card : colors.text,
    borderRadius: 24,
    padding: 20,
    justifyContent: "space-between",
    marginTop: -35,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    } : {
      elevation: 0,
    }),
  },
  statMini: { flex: 1, alignItems: "center" },
  statMiniVal: { color: resolvedTheme === 'dark' ? colors.text : colors.surface, fontSize: 20, fontWeight: "700" },
  statMiniLabel: { color: colors.placeholder, fontSize: 11, marginTop: 2, fontWeight: "500" },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    height: "70%",
    alignSelf: "center",
  },
  litigationCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    } : {
      elevation: 0,
    }),
  },

  litigationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 18,
  },

  litigationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  litigationItem: {
    flex: 1,
    alignItems: "center",
  },

  litigationValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },

  litigationLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: colors.secondaryText,
  },

  litigationDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  workflowCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    } : {
      elevation: 0,
    }),
  },

  workflowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 15,
  },

  workflowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  workflowName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },

  workflowCount: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },

  workflowCountText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },

  workflowEmpty: {
    color: colors.placeholder,
    fontSize: 13,
    fontWeight: "500",
  },
  dailyTaskCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    } : {
      elevation: 0,
    }),
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskTitle: { fontWeight: "700", fontSize: 15, color: colors.text },
  taskCount: { color: colors.secondaryText, fontWeight: "500" },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 10,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  taskHint: { marginTop: 10, fontSize: 13, color: colors.secondaryText, fontWeight: "500" },
  alertRibbon: { padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  pendingBox: { backgroundColor: colors.surface },
  todayBox: { backgroundColor: colors.surface },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertTitle: { fontWeight: "700", fontSize: 15 },
  alertItem: {
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },
  caseName: { fontSize: 15, fontWeight: "700", color: colors.text },
  caseCourt: { fontSize: 13, color: colors.secondaryText, marginTop: 2, fontWeight: "500" },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 15,
    color: colors.text,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48.5%",
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
    } : {
      elevation: 0,
    }),
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionLabel: { fontWeight: "700", fontSize: 15, color: colors.primary, flex: 1 },

  glassButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: { fontSize: 18, color: colors.surface },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    } : {
      elevation: 0,
    }),
  },
  profileLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileImage: { width: 54, height: 54, borderRadius: 27 },
  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  profileAvatarText: { color: colors.primary, fontWeight: "700", fontSize: 20 },
  profileName: { fontSize: 17, fontWeight: "700", color: colors.text },
  profileSub: { fontSize: 13, color: colors.secondaryText, fontWeight: "500" },
  shareBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  domainBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },

  civilBadge: {
    backgroundColor: colors.surface,
  },

  criminalBadge: {
    backgroundColor: colors.danger,
  },

  familyBadge: {
    backgroundColor: colors.surface,
  },

  domainBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: colors.text,
  },
  alertItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },

  updateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10,
  },

  updateBtnText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 12,
  },
});
