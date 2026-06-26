import LegalInput from "../components/LegalInput";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  deleteCase,
  getAllCases,
  updateCaseStatus,
  getProfile,
} from "../services/sqliteService";
import { formatMoney, getCurrency } from "../utils/currency";
import { toDisplay } from "../utils/date";

export default function ArchiveScreen({ profile, onBack, onOpenCaseDetail }) {
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const insets = useSafeAreaInsets();
  const currency = getCurrency(currentProfile);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigation = useNavigation();
  const loadArchivedCases = useCallback(() => {
    try {
      setLoading(true);
      const allCases = getAllCases();
      const archived = allCases.filter((c) => c.status === "archived");
      setCases(archived);
    } catch (_) {
      Alert.alert("Error", "Failed to load archived cases.");
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const fresh = await getProfile();
        if (fresh) setCurrentProfile(fresh);
      };
      load();
    }, []),
  );
  useEffect(() => {
    loadArchivedCases();
  }, [loadArchivedCases]);

  const handleRestore = (caseId, title) => {
    Alert.alert("Restore Case", `Restore "${title}" back to active cases?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Restore",
        onPress: () => {
          try {
            updateCaseStatus(caseId, "active");
            loadArchivedCases();
            Alert.alert("Success", "Case restored successfully.");
          } catch (_) {
            Alert.alert("Error", "Failed to restore case.");
          }
        },
      },
    ]);
  };

  const handleDeleteCase = (caseId, title) => {
    Alert.alert(
      "Delete Case",
      `Permanently delete "${title}"?\n\nThis action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            try {
              deleteCase(caseId);
              loadArchivedCases();
              Alert.alert("Deleted", "Case permanently deleted.");
            } catch (_) {
              Alert.alert("Error", "Failed to delete case.");
            }
          },
        },
      ],
    );
  };

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return cases;
    return cases.filter((item) => {
      const title = item.title?.toLowerCase() || "";
      const court = item.court?.toLowerCase() || "";
      const caseNo = item.caseNo?.toLowerCase() || "";
      return (
        title.includes(term) || court.includes(term) || caseNo.includes(term)
      );
    });
  }, [cases, search]);

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* HEADER: GLASS STYLE */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.glassBackButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.titleCenter}>
            <Text style={styles.headerTitleText}>Archive Vault</Text>
            <View style={styles.jurisdictionPill}>
              <Text style={styles.jurisdictionText}>Historical Records</Text>
            </View>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* INTEGRATED SEARCH */}
        <View style={styles.searchWrapper}>
          <LegalInput
            label="Archive Search"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by Title, Court or #No"
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
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.loaderText}>Decrypting Records...</Text>
          </View>
        ) : filteredCases.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyEmoji}>📜</Text>
            </View>
            <Text style={styles.emptyTitle}>Empty Vault</Text>
            <Text style={styles.emptySub}>
              Decided cases archived from your main diary will be securely
              stored here for your legal records.
            </Text>
          </View>
        ) : (
          filteredCases.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.caseCard}
              activeOpacity={0.9}
              onPress={() => onOpenCaseDetail?.(item.id)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.caseTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.caseCourt}>{item.court}</Text>
                </View>
                <View style={styles.statusPill}>
                  <View style={styles.dot} />
                  <Text style={styles.statusText}>CLOSED</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>CASE NUMBER</Text>
                  <Text style={styles.metaValue}>{item.caseNo || "N/A"}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>FINAL HEARING</Text>
                  <Text style={styles.metaValue}>
                    {toDisplay(item.nextHearingISO)}
                  </Text>
                </View>
              </View>

              <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>Final Settled Balance</Text>
                <Text style={styles.balanceValue}>
                  {formatMoney(item.feeBalance, currency)}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.restoreBtn}
                  onPress={() => handleRestore(item.id, item.title)}
                >
                  <Text style={styles.restoreBtnText}>Restore Case</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteCase(item.id, item.title)}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F1F5F9" },

  // Header & Search
  premiumHeader: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    zIndex: 100,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  glassBackButton: {
    width: 44,
    height: 44,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    color: "#1E3A8A",
    fontSize: 28,
    fontWeight: "300",
    marginTop: -4,
  },
  titleCenter: { flex: 1, alignItems: "center" },
  headerTitleText: { fontSize: 18, fontWeight: "800", color: "#1E3A8A" },
  jurisdictionPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  jurisdictionText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  searchWrapper: { paddingHorizontal: 20, marginTop: 20 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  // Empty State
  emptyBox: { alignItems: "center", marginTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  emptySub: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },

  // Case Cards
  caseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  caseTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 2,
  },
  caseCourt: { fontSize: 13, color: "#64748B", fontWeight: "500" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94A3B8",
    marginRight: 6,
  },
  statusText: { fontSize: 10, fontWeight: "800", color: "#64748B" },

  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 15 },

  metaGrid: { flexDirection: "row", justifyContent: "space-between" },
  metaItem: { flex: 1 },
  metaLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 3,
  },

  balanceContainer: {
    backgroundColor: "#F8FAFC",
    padding: 15,
    borderRadius: 16,
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  balanceValue: { fontSize: 15, fontWeight: "800", color: "#1E3A8A" },

  actionRow: { flexDirection: "row", marginTop: 20, gap: 10 },
  restoreBtn: {
    flex: 2,
    backgroundColor: "#1E3A8A",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  restoreBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  deleteBtnText: { color: "#DC2626", fontWeight: "800", fontSize: 13 },

  loaderWrap: { paddingVertical: 80, alignItems: "center" },
  loaderText: {
    marginTop: 15,
    color: "#1E3A8A",
    fontWeight: "700",
    fontSize: 13,
  },
});
