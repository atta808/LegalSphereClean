import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Updated imports for the premium expandable features
import { CalendarProvider, ExpandableCalendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllCases, getProfile } from "../services/sqliteService";
import { formatMoney, getCurrency } from "../utils/currency";
import { toYMD } from "../utils/date";
export default function CalendarScreen({ onBack, onOpenCaseDetail, profile }) {
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const currency = getCurrency(currentProfile);
  const locale = currentProfile?.locale || "en-PK";
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const [allCases, setAllCases] = useState([]);

  // Logic remains untouched as requested
  const loadCases = useCallback(async () => {
    try {
      const data = await getAllCases();
      if (!Array.isArray(data)) return;
      setAllCases(data);
      const marks = {};
      data.forEach((c) => {
        if (!c.nextHearingISO || c.status === "archived") return;
        let color = "#3B82F6";
        if (c.priority === "urgent") color = "#EF4444";
        else if (c.priority === "important") color = "#F59E0B";
        else if (c.priority === "normal") color = "#10B981";

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

        await loadCases(); // keep your existing logic
      };

      init();
    }, [loadCases]),
  );

  const agendaList = allCases.filter((c) => {
    if (!c.nextHearingISO || c.status === "archived") return false;
    const localKey = toYMD(c.nextHearingISO);
    return localKey === selectedDate;
  });

  return (
    <View style={styles.container}>
      {/* PREMIUM HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.glassBackButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Dashboard"); // or MainTabs
            }
          }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.title}>Chamber Calendar</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>OFFICIAL DIARY</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.todayBtn}
          onPress={() => setSelectedDate(toYMD(new Date()))}
        >
          <Text style={styles.todayText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* EXPANDABLE CALENDAR SECTION */}
      <CalendarProvider
        date={selectedDate}
        onDateChanged={(date) => setSelectedDate(date)}
        showTodayButton={false}
      >
        <ExpandableCalendar
          initialPosition={ExpandableCalendar.positions.CLOSED} // Starts in Weekly view for premium feel
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

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.agendaHeader}>
            <Text style={styles.agendaTitle}>Hearings & Tasks</Text>
            <Text style={styles.caseCount}>{agendaList.length} Scheduled</Text>
          </View>

          {agendaList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No hearings for this day</Text>
            </View>
          ) : (
            agendaList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("CaseDetail", { caseId: item.id })
                }
              >
                <View
                  style={[
                    styles.priorityIndicator,
                    { backgroundColor: getPriorityColor(item.priority) },
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
                  <Text style={styles.caseCourt}>
                    🏛 {item.court || "District Court"}
                  </Text>
                  <View style={styles.footerRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        {item.priority?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </CalendarProvider>
    </View>
  );
}

// Helper for UI colors
const getPriorityColor = (p) => {
  if (p === "urgent") return "#EF4444";
  if (p === "important") return "#F59E0B";
  return "#10B981";
};

const calendarTheme = {
  backgroundColor: "#FFFFFF",
  calendarBackground: "#FFFFFF",
  textSectionTitleColor: "#64748B",
  selectedDayBackgroundColor: "#1E3A8A",
  selectedDayTextColor: "#ffffff",
  todayTextColor: "#3B82F6",
  dayTextColor: "#1E293B",
  textDisabledColor: "#CBD5E1",
  dotColor: "#3B82F6",
  selectedDotColor: "#ffffff",
  arrowColor: "#1E3A8A",
  monthTextColor: "#1E3A8A",
  textDayFontWeight: "600",
  textMonthFontWeight: "900",
  textDayHeaderFontWeight: "700",
  textDayFontSize: 14,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 12,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  glassBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: { color: "#1E3A8A", fontSize: 24, fontWeight: "300" },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E3A8A",
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  badgeText: { fontSize: 8, fontWeight: "800", color: "#1E40AF" },
  todayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  todayText: { color: "#1E3A8A", fontSize: 12, fontWeight: "700" },

  calendarBorder: {
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },

  content: { padding: 20, paddingBottom: 100 },
  agendaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 15,
  },
  agendaTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  caseCount: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  priorityIndicator: { width: 6 },
  cardMain: { flex: 1, padding: 16 },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  caseTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
    marginRight: 10,
  },
  caseFee: { fontSize: 14, color: "#10B981", fontWeight: "800" },
  caseCourt: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "500",
  },
  footerRow: { marginTop: 10, flexDirection: "row" },
  tag: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tagText: { fontSize: 9, fontWeight: "700", color: "#64748B" },

  emptyCard: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 24,
    marginTop: 20,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: "#94A3B8", fontWeight: "600" },
});
