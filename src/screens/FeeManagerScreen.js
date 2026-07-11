import React from "react";
import EmptyState from '../components/EmptyState';
import PremiumPageHeader from '../components/PremiumPageHeader';
import { useTheme } from "../theme/ThemeContext";
import LegalInput from "../components/LegalInput";
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
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
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
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <PremiumPageHeader title="Fee Manager" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {loading ? (
          <SkeletonLoader variant="list" count={4} />
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
                  item.priority === "urgent" && { backgroundColor: colors.danger },
                  item.priority === "important" && {
                    backgroundColor: colors.surface,
                  },
                  item.priority === "normal" && { backgroundColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    item.priority === "urgent" && { color: colors.danger },
                    item.priority === "important" && { color: colors.text },
                    item.priority === "normal" && { color: colors.secondaryText },
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

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.border },

  // Header
  premiumHeader: {
    backgroundColor: colors.surface,
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: colors.primary,
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
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backIcon: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "300",
    marginTop: -4,
  },
  titleCenter: { flex: 1, alignItems: "center" },
  headerTitleText: { fontSize: 18, fontWeight: "800", color: colors.primary },
  jurisdictionPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  jurisdictionText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
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
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  outstandingBg: { backgroundColor: colors.primary, borderColor: colors.primary },
  summaryLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.placeholder,
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
    color: colors.surface,
    marginTop: 4,
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 25 },

  // Case Cards
  caseCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
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
    color: colors.text,
    marginBottom: 2,
  },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 9, fontWeight: "900" },
  clientEmailText: { fontSize: 13, color: colors.placeholder, fontWeight: "500" },
  cardDivider: { height: 1, backgroundColor: colors.background, marginVertical: 18 },

  feeGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  feeItem: { flex: 1 },
  feeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.placeholder,
    letterSpacing: 0.8,
  },
  feeValue: { fontSize: 15, fontWeight: "900", color: colors.text, marginTop: 4 },

  recordPaymentBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  recordBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.surface,
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
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: 30,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: colors.text },
  modalCaseSub: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 4,
    marginBottom: 30,
  },
  modalInputGroup: { marginBottom: 30 },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondaryText,
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 1,
  },

  emptyBox: { alignItems: "center", marginTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  emptySub: {
    fontSize: 14,
    color: colors.placeholder,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },

  loaderWrap: { paddingVertical: 100, alignItems: "center" },
  loaderText: { marginTop: 15, color: colors.primary, fontWeight: "700" },
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
    backgroundColor: colors.border,
  },

  modalCancelText: {
    color: colors.secondaryText,
    fontWeight: "800",
    fontSize: 13,
  },

  modalSaveBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  modalSaveText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 13,
  },
});
