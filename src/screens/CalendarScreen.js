import React from "react";
import PremiumPageHeader from "../components/PremiumPageHeader";
import PremiumTouchable from "../components/PremiumTouchable";
import SkeletonLoader from "../components/SkeletonLoader";
import EmptyState from "../components/EmptyState";
import { useTheme } from "../theme/ThemeContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CalendarProvider, ExpandableCalendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllCases, getProfile } from "../services/sqliteService";
import { formatMoney, getCurrency } from "../utils/currency";
import { toYMD } from "../utils/date";

export default function CalendarScreen({ onBack, onOpenCaseDetail, profile }) {
  const { colors, resolvedTheme } = useTheme();
  const calendarTheme = React.useMemo(
    () => getCalendarTheme(colors, resolvedTheme),
    [colors, resolvedTheme],
  );
  const styles = React.useMemo(
    () => createStyles(colors, resolvedTheme),
    [colors, resolvedTheme],
  );
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const currency = getCurrency(currentProfile);
  const locale = currentProfile?.locale || "en-PK";
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const [allCases, setAllCases] = useState([]);

  const loadCases = useCallback(async () => {
    try {
      const data = await getAllCases();
      if (!Array.isArray(data)) return;
      setAllCases(data);
      const marks = {};
      data.forEach((c) => {
        if (!c.nextHearingISO || c.status === "archived") return;
        let color = colors.primary;
        if (c.priority === "urgent") color = colors.danger;
        else if (c.priority === "important") color = colors.warning;
        else if (c.priority === "normal") color = colors.success;

        const dateKey = toYMD(c.nextHearingISO);
        if (!dateKey) return;

        if (!marks[dateKey]) {
          marks[dateKey] = { dots: [] };
        }
        marks[dateKey].dots.push({ color, key: c.id });
      });
      setMarkedDates(marks);
    } catch (e) {
      console.log("Calendar error:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const fresh = await getProfile();
        if (fresh) setCurrentProfile(fresh);
        await loadCases();
      };
      init();
    }, [loadCases]),
  );

  const agendaList = allCases.filter((c) => {
    if (!c.nextHearingISO || c.status === "archived") return false;
    const localKey = toYMD(c.nextHearingISO);
    return localKey === selectedDate;
  });

  const goToToday = () => {
    setSelectedDate(toYMD(new Date()));
  };

  return (
    <View style={styles.container}>
      {/* HEADER - Migrated to PremiumPageHeader V5.1 */}
      <PremiumPageHeader
        title="Chamber Calendar"
        subtitle="OFFICIAL DIARY"
        headerVariant="large"
        showBackButton={true}
        onBack={() => {
          if (onBack) {
            onBack();
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("Dashboard");
          }
        }}
        actions={[
          {
            icon: "calendar-outline",
            onPress: goToToday,
            accessibilityLabel: "Today",
            accessibilityHint: "Jump to today's date",
          },
        ]}
      />

      <CalendarProvider
        date={selectedDate}
        onDateChanged={(date) => setSelectedDate(date)}
        showTodayButton={false}
      >
        <ExpandableCalendar
          initialPosition={ExpandableCalendar.positions.CLOSED}
          markingType="multi-dot"
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...(markedDates[selectedDate] || {}),
              selected: true,
              disableTouchEvent: true,
            },
          }}
          theme={calendarTheme}
          allowShadow={true}
          style={styles.calendarBorder}
        />

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        >
          <View style={styles.agendaHeader}>
            <Text style={styles.agendaTitle}>Hearings & Tasks</Text>
            <Text style={styles.caseCount}>{agendaList.length} Scheduled</Text>
          </View>

          {agendaList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={colors.placeholder}
                style={{ marginBottom: 16 }}
              />
              <EmptyState
                icon={
                  <Ionicons
                    name="calendar-outline"
                    size={64}
                    color={colors.placeholder}
                  />
                }
                title="No Hearings"
                description="Enjoy your free day."
                style={{ minHeight: 200 }}
              />
            </View>
          ) : (
            agendaList.map((item) => (
              <PremiumTouchable
                key={item.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("CaseDetail", { caseId: item.id })
                }
              >
                <View
                  style={[
                    styles.priorityIndicator,
                    {
                      backgroundColor: getPriorityColor(item.priority, colors),
                    },
                  ]}
                />
                <View style={styles.cardMain}>
                  <View style={styles.cardRow}>
                    <Text style={styles.caseTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.caseFee}>
                      {formatMoney(item.feeBalance, currency, locale)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 6,
                      marginBottom: 2,
                    }}
                  >
                    <Ionicons
                      name="business-outline"
                      size={14}
                      color={colors.secondaryText}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.caseCourt}>
                      {item.court || "District Court"}
                    </Text>
                  </View>

                  {item.judge ? (
                    <View style={styles.judgeRow}>
                      <Ionicons
                        name="person-outline"
                        size={14}
                        color={colors.secondaryText}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.caseJudge}>{item.judge}</Text>
                    </View>
                  ) : null}
                  <View style={styles.footerRow}>
                    <View
                      style={[
                        styles.tag,
                        {
                          backgroundColor: getPriorityBackgroundColor(
                            item.priority,
                          ),
                          borderColor: "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          { color: getPriorityColor(item.priority, colors) },
                        ]}
                      >
                        {item.priority?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </PremiumTouchable>
            ))
          )}
        </ScrollView>
      </CalendarProvider>
    </View>
  );
}

// Helper for UI colors
const getPriorityBackgroundColor = (p) => {
  if (p === "urgent") return "rgba(239, 68, 68, 0.1)";
  if (p === "important") return "rgba(245, 158, 11, 0.1)";
  return "rgba(16, 185, 129, 0.1)";
};

const getPriorityColor = (p, colors) => {
  if (p === "urgent") return colors.danger;
  if (p === "important") return colors.warning;
  return colors.success;
};

const getCalendarTheme = (colors, resolvedTheme) => ({
  backgroundColor: colors.surface,
  calendarBackground: colors.surface,
  textSectionTitlecolor: colors.secondaryText,
  selectedDaybackgroundColor: colors.primary,
  selectedDayTextColor: colors.surface,
  todayTextColor: colors.primary,
  dayTextColor: colors.text,
  textDisabledColor: colors.disabled,
  dotColor: colors.primary,
  selectedDotColor: colors.surface,
  arrowColor: colors.primary,
  monthTextColor: colors.primary,
  textDayFontWeight: "600",
  textMonthFontWeight: "700",
  textDayHeaderFontWeight: "700",
  textDayFontSize: 14,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 12,
});

const createStyles = (colors, resolvedTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.border },
    calendarBorder: {
      borderBottomLeftRadius: 25,
      borderBottomRightRadius: 25,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    content: { padding: 20, paddingBottom: 100 },
    agendaHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 15,
    },
    agendaTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
    caseCount: { fontSize: 12, color: colors.secondaryText, fontWeight: "600" },
    card: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    priorityIndicator: { width: 4 },
    cardMain: { flex: 1, padding: 16 },
    cardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    caseTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      marginRight: 10,
    },
    caseFee: { fontSize: 14, color: colors.success, fontWeight: "600" },
    caseCourt: {
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: "500",
    },
    judgeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },

    caseJudge: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "600",
    },
    footerRow: { marginTop: 10, flexDirection: "row" },
    tag: {
      backgroundColor: colors.background,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tagText: { fontSize: 9, fontWeight: "700", color: colors.secondaryText },
    emptyCard: {
      padding: 40,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 24,
      marginTop: 20,
    },
  });
