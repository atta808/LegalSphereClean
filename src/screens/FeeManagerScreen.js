import LegalInput from "../components/LegalInput";
import { useTheme } from "../contexts/ThemeContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getAllCases,
  getProfile,
  updateCasePayment,
} from "../services/sqliteService";

import { formatMoney, getCurrency } from "../utils/currency";
export default function FeeManagerScreen({ profile, onBack }) {
  const { resolvedTheme: theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [saving, setSaving] = useState(false);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const navigation = useNavigation();
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const currency = getCurrency(currentProfile);
  const locale = currentProfile?.locale || "en-PK";

  // LOAD CASES
  const loadCases = useCallback(async () => {
    try {
      setLoading(true);

      const result = await getAllCases();

      result.sort((a, b) => {
        if ((b.priorityLevel || 1) !== (a.priorityLevel || 1)) {
          return (b.priorityLevel || 1) - (a.priorityLevel || 1);
        }
        return (a.title || "").localeCompare(b.title || "");
      });

      setCases(result);
    } catch (_) {
      Alert.alert("Error", "Failed to load fee records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);
  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        const fresh = await getProfile();
        if (fresh) setCurrentProfile(fresh);
      };
      loadProfile();
    }, []),
  );
  // STATS
  const totalOutstanding = useMemo(() => {
    return cases.reduce((sum, item) => sum + Number(item.feeBalance || 0), 0);
  }, [cases]);

  const totalReceived = useMemo(() => {
    return cases.reduce((sum, item) => sum + Number(item.feePaid || 0), 0);
  }, [cases]);

  const openPaymentModal = (item) => {
    setSelectedCase(item);
    setPaymentAmount("");
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    setSelectedCase(null);
    setPaymentAmount("");
    setPaymentModalVisible(false);
  };

  // ✅ 🔥 FIXED PAYMENT HANDLER
  const handleAddPayment = async () => {
    if (saving) return;

    try {
      setSaving(true);

      if (!selectedCase?.id) {
        Alert.alert("Error", "No case selected.");
        return;
      }

      const amount = Number(paymentAmount);

      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Invalid amount", "Enter a valid payment amount.");
        return;
      }

      if (amount > Number(selectedCase.feeBalance)) {
        Alert.alert("Error", "Payment exceeds remaining balance.");
        return;
      }

      await updateCasePayment(
        selectedCase.id,
        amount,
        selectedCase.feePaid,
        selectedCase.feeBalance,
      );

      await loadCases();

      closePaymentModal();

      Alert.alert("Success", "Payment recorded successfully.");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.glassBackButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.titleCenter}>
            <Text style={styles.headerTitleText}>Fee Manager</Text>
            <View style={styles.jurisdictionPill}>
              <Text style={styles.jurisdictionText}>
                Financial Ledger • {profile?.name || "Advocate"}
              </Text>
            </View>
          </View>

          <View style={{ width: 44 }} />
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL RECOVERY</Text>
            <Text style={[styles.summaryValue, { color: "#10B981" }]}>
              {formatMoney(totalReceived, currency, locale)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.outstandingBg]}>
            <Text style={styles.summaryLabelLight}>OUTSTANDING</Text>
            <Text style={styles.summaryValueLight}>
              {formatMoney(totalOutstanding, currency, locale)}
            </Text>
          </View>
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
          <ActivityIndicator size="large" color="#1E3A8A" />
        ) : (
          cases.map((item) => (
            <View key={item.id} style={styles.caseCard}>
              <Text style={styles.caseTitleText}>{item.title}</Text>

              <Text style={styles.clientEmailText}>
                📧 {item.clientEmail || "No contact"}
              </Text>
              <View
                style={[
                  styles.priorityBadge,
                  item.priority === "urgent" && { backgroundColor: "#FEE2E2" },
                  item.priority === "important" && {
                    backgroundColor: "#FEF9C3",
                  },
                  item.priority === "normal" && { backgroundColor: "#E2E8F0" },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    item.priority === "urgent" && { color: "#DC2626" },
                    item.priority === "important" && { color: "#CA8A04" },
                    item.priority === "normal" && { color: "#475569" },
                  ]}
                >
                  {item.priority?.toUpperCase()}
                </Text>
              </View>
              <Text>
                Balance: {formatMoney(item.feeBalance, currency, locale)}
              </Text>

              <TouchableOpacity
                style={styles.recordPaymentBtn}
                onPress={() => openPaymentModal(item)}
              >
                <Text style={styles.recordBtnText}>RECORD NEW PAYMENT</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={paymentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Ledger</Text>

            <LegalInput
              label="Payment Amount"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="0.00"
              keyboardType="numeric"
            />

            <View style={styles.modalButtonsRow}>
              {/* ❌ DISCARD BUTTON */}
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closePaymentModal}
              >
                <Text style={styles.modalCancelText}>Discard</Text>
              </TouchableOpacity>

              {/* ✅ SAVE BUTTON */}
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAddPayment}
                disabled={saving}
              >
                <Text style={styles.modalSaveText}>
                  {saving ? "Processing..." : "Save Payment"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F1F5F9" },

  // Header
  premiumHeader: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    zIndex: 10,
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
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  jurisdictionText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4338CA",
    textTransform: "uppercase",
  },

  // Summary Grid
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 25,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  outstandingBg: { backgroundColor: "#1E3A8A", borderColor: "#1E3A8A" },
  summaryLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  summaryLabelLight: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
  },
  summaryValue: { fontSize: 20, fontWeight: "900", marginTop: 4 },
  summaryValueLight: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 4,
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 25 },

  // Case Cards
  caseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  caseTitleText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 2,
  },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 9, fontWeight: "900" },
  clientEmailText: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  cardDivider: { height: 1, backgroundColor: "#F8FAFC", marginVertical: 18 },

  feeGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  feeItem: { flex: 1 },
  feeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
  },
  feeValue: { fontSize: 15, fontWeight: "900", color: "#1E293B", marginTop: 4 },

  recordPaymentBtn: {
    backgroundColor: "#1E3A8A",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  recordBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    padding: 25,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    padding: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1E293B" },
  modalCaseSub: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 30,
  },
  modalInputGroup: { marginBottom: 30 },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 1,
  },

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

  loaderWrap: { paddingVertical: 100, alignItems: "center" },
  loaderText: { marginTop: 15, color: "#1E3A8A", fontWeight: "700" },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },

  priorityText: {
    fontSize: 9,
    fontWeight: "900",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },

  modalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },

  modalCancelText: {
    color: "#64748B",
    fontWeight: "800",
    fontSize: 13,
  },

  modalSaveBtn: {
    flex: 2,
    backgroundColor: "#1E3A8A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  modalSaveText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 13,
  },
});
