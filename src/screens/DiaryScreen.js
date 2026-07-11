import React from "react";
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import PremiumPageHeader from '../components/PremiumPageHeader';
import { useTheme } from "../theme/ThemeContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";

import { Copy, FileText, Fingerprint, Share2 } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LegalInput from "../components/LegalInput";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getAllCases,
  getProfile,
  updateCaseStatus,
} from "../services/sqliteService";
import { exportCauseListPdf } from "../utils/causeListPdf";
import { formatMoney, getCurrency } from "../utils/currency";
import { isPast, isToday, toDisplay } from "../utils/date";

// --- PREMIUM GLOSSY COMPONENT ---
const PremiumExportButton = ({ item, openExportOptions, styles, colors }) => (
  <TouchableOpacity
    style={styles.premiumExportBtn}
    activeOpacity={0.7}
    onPress={(e) => {
      e.stopPropagation();
      openExportOptions(item);
    }}
  >
    <Share2 color={colors.primary} size={14} strokeWidth={2.5} />
    <Text style={styles.premiumExportText}>Export</Text>
  </TouchableOpacity>
);

export default function DiaryScreen({ profile }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const currency = getCurrency(currentProfile);
  const locale = currentProfile?.locale || "en-PK";
  const [cases, setCases] = useState([]);
  const [pipelineCases, setPipelineCases] = useState([]);
  const [pendingCases, setPendingCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);

  const handleFullDiaryPDF = async () => {
    try {
      const allCases = await getAllCases();
      const diaryCases = allCases.filter((c) => c.status !== "archived");
      if (diaryCases.length === 0) {
        Alert.alert("Empty", "No cases available");
        return;
      }
      exportCauseListPdf(diaryCases, "Full Diary Report");
    } catch (_) {
      Alert.alert("Error", "Failed to generate PDF");
    }
  };

  const loadCases = useCallback(async () => {
    try {
      setLoading(true);
      const allCases = await getAllCases(); // ✅ Logic Fixed

      const pending = [];
      const todayCases = [];
      const upcoming = [];
      const pipeline = [];

      allCases.forEach((c) => {
        if (c.status === "archived") return;
        if (c.status === "pipeline") {
          pipeline.push(c);
        } else if (!c.nextHearingISO) {
          pending.push(c);
        } else if (isToday(c.nextHearingISO)) {
          todayCases.push(c);
        } else if (isPast(c.nextHearingISO)) {
          pending.push(c);
        } else {
          upcoming.push(c);
        }
      });

      const sortByDate = (a, b) => {
        if (!a.nextHearingISO) return 1;
        if (!b.nextHearingISO) return -1;
        return a.nextHearingISO.localeCompare(b.nextHearingISO);
      };

      pending.sort(sortByDate);
      todayCases.sort(sortByDate);
      upcoming.sort(sortByDate);
      pipeline.sort(sortByDate);

      setPendingCases(pending);
      setCases([...todayCases, ...upcoming]);
      setPipelineCases(pipeline);
    } catch (_) {
      Alert.alert("Error", "Failed to load diary cases.");
    } finally {
      setLoading(false);
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

  const handleArchive = (caseId, title) => {
    Alert.alert("Archive Case", `Archive "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: async () => {
          try {
            await updateCaseStatus(caseId, "archived");
            await loadCases();
          } catch (_) {
            Alert.alert("Error", "Failed to archive.");
          }
        },
      },
    ]);
  };

  const openExportOptions = (item) => {
    setSelectedCase(item);
    setExportModalVisible(true);
  };

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return { active: cases, pipeline: pipelineCases };
    const filter = (list) =>
      list.filter((item) => {
        const title = item.title?.toLowerCase() || "";
        const court = item.court?.toLowerCase() || "";
        const caseNo = item.caseNo?.toLowerCase() || "";
        return (
          title.includes(term) || court.includes(term) || caseNo.includes(term)
        );
      });
    return { active: filter(cases), pipeline: filter(pipelineCases) };
  }, [cases, pipelineCases, search]);

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* HEADER SECTION */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.glassBackButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.titleCenter}>
            <Text style={styles.headerTitleText}>Chamber Diary</Text>
            <View style={styles.jurisdictionPill}>
              <Text style={styles.jurisdictionText}>
                {profile?.name || "Advocate"} • Practice Workflow
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.glassButton}
            onPress={handleFullDiaryPDF}
          >
            <FileText color={colors.primaryDark} size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <LegalInput
            label="Diary Search"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by Title, Court, or Case No"
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {loading ? (
          <SkeletonLoader variant="card" count={3} />
        ) : (
          <>
            {/* PENDING UPDATES */}
            {pendingCases.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.danger }]}>
                    Pending Updates
                  </Text>
                  <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                    <Text style={[styles.badgeText, { color: colors.danger }]}>
                      {pendingCases.length}
                    </Text>
                  </View>
                </View>
                {pendingCases.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.caseCard, styles.pendingBorder]}
                    onPress={() =>
                      navigation.navigate("CaseDetail", { caseId: item.id })
                    }
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={styles.caseTitleText}>{item.title}</Text>
                      {item.nextHearingISO && isPast(item.nextHearingISO) && (
                        <View style={styles.overdueBadge}>
                          <Text style={styles.overdueText}>OVERDUE</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* PIPELINE (GHOST STYLE) */}
            {filteredCases.pipeline.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pipeline</Text>
                </View>
                {filteredCases.pipeline.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.caseCard, styles.pipelineBorder]}
                  >
                    <Text style={styles.caseTitleText}>{item.title}</Text>
                    <Text style={styles.caseCourtText}>🏛 {item.court}</Text>
                    <TouchableOpacity
                      style={styles.activateBtn}
                      onPress={async () => {
                        try {
                          await updateCaseStatus(item.id, "active");
                          await loadCases();
                        } catch (_) {
                          Alert.alert("Error", "Failed to activate.");
                        }
                      }}
                    >
                      <Text style={styles.activateBtnText}>
                        ACTIVATE TO DIARY
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ACTIVE DIARY */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Diary</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {filteredCases.active.length}
                  </Text>
                </View>
              </View>

              {filteredCases.active.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.caseCard, styles.activeBorder]}
                  onPress={() =>
                    navigation.navigate("CaseDetail", { caseId: item.id })
                  }
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.caseTitleText} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View
                        style={[
                          styles.priorityBadge,
                          item.priority === "urgent" && styles.priorityUrgent,
                        ]}
                      >
                        <Text style={styles.priorityText}>
                          {item.priority?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <PremiumExportButton styles={styles} colors={colors}
                      item={item}
                      openExportOptions={openExportOptions}
                    />
                  </View>

                  <Text style={styles.caseCourtText}>🏛 {item.court}</Text>

                  <View style={styles.hearingModule}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <View>
                        <Text style={styles.hLabel}>NEXT HEARING</Text>
                        <Text style={styles.hDate}>
                          {toDisplay(item.nextHearingISO, locale)}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.hLabel}>BALANCE</Text>
                        <Text style={[styles.hDate, { color: colors.danger }]}>
                          {formatMoney(item.feeBalance, currency, locale)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      onPress={() => handleArchive(item.id, item.title)}
                    >
                      <Text style={styles.archiveLink}>Move to Archive</Text>
                    </TouchableOpacity>
                    <Text style={styles.tapHint}>Case Details ›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* EXPORT MODAL */}
      <Modal visible={exportModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalCard}>
            <Text style={styles.modalTitle}>Export Case</Text>

            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => {
                exportCauseListPdf([selectedCase], selectedCase.title);
                setExportModalVisible(false);
              }}
            >
              <FileText color={colors.primaryDark} size={20} />
              <Text style={styles.exportText}>Export as PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportOption}
              onPress={async () => {
                const text = `Title: ${selectedCase?.title}\nCourt: ${selectedCase?.court}\nNext Hearing: ${toDisplay(selectedCase?.nextHearingISO, locale)}\nBalance: ${formatMoney(selectedCase?.feeBalance, currency, locale)}`;
                await Clipboard.setStringAsync(text);
                Alert.alert("Copied", "Case details copied to clipboard");
                setExportModalVisible(false);
              }}
            >
              <Copy color={colors.primaryDark} size={20} />
              <Text style={styles.exportText}>Copy Full Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportOption}
              onPress={async () => {
                await Clipboard.setStringAsync(
                  String(selectedCase?.caseNo || "N/A"),
                );
                Alert.alert("Copied", "Case Number copied");
                setExportModalVisible(false);
              }}
            >
              <Fingerprint color={colors.primaryDark} size={20} />
              <Text style={styles.exportText}>Copy Case No</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setExportModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.border },
  premiumHeader: {
    backgroundColor: resolvedTheme === 'dark' ? colors.surface : colors.primary,
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    ...(resolvedTheme === 'dark' ? {
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 0,
    } : {
      elevation: 5,
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  glassBackButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: resolvedTheme === 'dark' ? colors.card : "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: resolvedTheme === 'dark' ? colors.border : "rgba(255,255,255,0.1)",
  },
  backIcon: { color: resolvedTheme === 'dark' ? colors.primary : colors.surface, fontSize: 28, marginTop: -4 },
  titleCenter: { flex: 1, alignItems: "center" },
  headerTitleText: { fontSize: 18, fontWeight: "700", color: resolvedTheme === 'dark' ? colors.primary : colors.surface },
  jurisdictionPill: {
    backgroundColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  jurisdictionText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.secondaryText,
    textTransform: "uppercase",
  },
  searchWrapper: { paddingHorizontal: 20, marginTop: 20 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 25 },
  sectionContainer: { marginBottom: 30 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.secondaryText,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: colors.surface },
  caseCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === "light"
      ? {
          shadowColor: colors.shadow,
          shadowOpacity: 0.04,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }
      : {
          shadowOpacity: 0,
          elevation: 0,
        }),
  },
  activeBorder: { borderLeftColor: colors.primary },
  pendingBorder: { borderLeftColor: colors.danger },
  pipelineBorder: { borderLeftColor: colors.border },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  caseTitleText: { fontSize: 17, fontWeight: "800", color: colors.text, flex: 1 },
  caseCourtText: { fontSize: 13, color: colors.secondaryText, marginBottom: 10 },
  hearingModule: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  hLabel: { fontSize: 9, fontWeight: "900", color: colors.placeholder },
  hDate: { fontSize: 15, fontWeight: "800", color: colors.primary },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 5,
  },
  archiveLink: { color: colors.placeholder, fontSize: 12, fontWeight: "600" },
  tapHint: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  overdueBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
  },
  overdueText: { color: colors.danger, fontSize: 9, fontWeight: "900" },
  activateBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  activateBtnText: { color: colors.surface, fontSize: 11, fontWeight: "900" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  exportModalCard: {
    width: "85%",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 30,
    padding: 25,
    ...(resolvedTheme === 'light' ? {
      elevation: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
    } : {
      elevation: 0,
      borderWidth: 1,
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  exportOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exportText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 15,
  },
  cancelBtn: { marginTop: 20, paddingVertical: 12 },
  cancelText: {
    color: colors.danger,
    textAlign: "center",
    fontWeight: "900",
    fontSize: 14,
  },
  premiumExportBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor:
      resolvedTheme === "dark" ? colors.border : "transparent",
  },
  premiumExportText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  glossHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  priorityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  priorityUrgent: { backgroundColor: colors.danger },
  priorityText: { fontSize: 9, fontWeight: "900", color: colors.secondaryText },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  loaderText: { marginTop: 15, color: colors.secondaryText, fontWeight: "700" },
  glassButton: { padding: 5 },
});
