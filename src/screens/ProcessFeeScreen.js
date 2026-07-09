import React from "react";
import { useTheme } from "../theme/ThemeContext";
import LegalInput from "../components/LegalInput";
import DateTimePicker from "@react-native-community/datetimepicker";
import LegalPicker from "../components/LegalPicker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
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
import {
  deleteProcessFee,
  getAllCases,
  getAllProcessFees,
  getProfile,
  insertProcessFee,
  markProcessFeePaid,
  updateProcessFee,
} from "../services/sqliteService";
import { toDisplay } from "../utils/date";

import { formatMoney, getCurrency } from "../utils/currency";

export default function ProcessFeeScreen({ profile, onBack }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const [caseName, setCaseName] = useState("");
  const [casePickerVisible, setCasePickerVisible] = useState(false);
  const [courtName, setCourtName] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [note, setNote] = useState("");
  const navigation = useNavigation();
  const [dateObject, setDateObject] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [fees, setFees] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showPaidModal, setShowPaidModal] = useState(false);
  const [paidTo, setPaidTo] = useState("");
  const [selectedFeeId, setSelectedFeeId] = useState(null);
  const [cases, setCases] = useState(() => []);
  const [casesReady, setCasesReady] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const currency = getCurrency(currentProfile);
  const locale = currentProfile?.locale || "en-PK";

  // LOAD FEES
  const loadFees = useCallback(async () => {
    try {
      setLoading(true);

      const list = await getAllProcessFees(); // ✅ now valid

      setFees(list || []);
    } catch (e) {
      console.log("❌ Load Fees Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const fresh = await getProfile();
        if (fresh) setCurrentProfile(fresh);

        await loadFees(); // ✅ reload data also
      };

      init();
    }, [loadFees]),
  );
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        await loadFees();

        const data = await getAllCases();

        setCases(data || []);
        setCasesReady(true); // ✅ IMPORTANT
      } catch (e) {
        console.log("❌ Load Cases Error:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [loadFees]);
  useEffect(() => {
    const selected = cases.find((c) => String(c.id) === String(selectedCaseId));

    if (selected) {
      setCaseName(selected.title || "");
      setCourtName(selected.court || "");
    }
  }, [selectedCaseId, cases]);

  // SAVE
  const handleSave = () => {
    if (!selectedCaseId || !amount) {
      Alert.alert("Missing Fields", "Please fill Case, Court, Amount.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        caseId: selectedCaseId,
        caseName,
        court: courtName,
        amount: Number(amount),
        purpose: purpose || "",
        date: dateObject,
        note: note || "",
      };

      if (editingId) {
        updateProcessFee(editingId, payload);
      } else {
        insertProcessFee({ ...payload, paid: 0 });
      }

      // RESET
      setSelectedCaseId(null);
      setCaseName("");
      setCourtName("");
      setAmount("");
      setPurpose("");
      setNote("");
      setEditingId(null);

      loadFees();
    } catch (_e) {
      Alert.alert("Error", "Failed to save record.");
    } finally {
      setLoading(false);
    }
  };

  // MARK PAID
  const confirmPaid = () => {
    if (!paidTo) {
      Alert.alert("Required", "Please enter Paid To.");
      return;
    }

    try {
      setLoading(true);
      if (!selectedFeeId) return;

      markProcessFeePaid(selectedFeeId, {
        paidTo,
        paidDate: new Date().toISOString(),
      });

      setShowPaidModal(false);
      setPaidTo("");
      setSelectedFeeId(null);

      loadFees();
    } catch (_e) {
      Alert.alert("Error", "Failed to mark as paid.");
    } finally {
      setLoading(false);
    }
  };

  const total = fees.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* LOADER */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
        </View>
      ) : null}

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.title}>Process Fee</Text>
            <Text style={styles.subTitle}>Manage Case Expenses</Text>
          </View>

          <View style={{ width: 42 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* CASE PICKER */}
        <TouchableOpacity
          style={styles.input}
          activeOpacity={0.85}
          onPress={() => setCasePickerVisible(true)}
        >
          <Text
            style={{
              color: selectedCaseId ? colors.shadow : colors.placeholder,
              fontSize: 15,
            }}
          >
            {cases.find((c) => String(c.id) === String(selectedCaseId))
              ?.title || "Select Case"}
          </Text>
        </TouchableOpacity>

        {/* AUTO COURT DISPLAY */}
        <View style={styles.input}>
          <Text style={{ color: courtName ? colors.shadow : colors.placeholder }}>
            {courtName || "Court will auto-fill"}
          </Text>
        </View>

        <LegalInput
          label="Amount"
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))}
          placeholder="Enter amount"
          keyboardType="numeric"
        />

        {/* DATE */}
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: dateObject ? colors.shadow : colors.placeholder }}>
            {dateObject ? toDisplay(dateObject, locale) : "Select Date"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dateObject}
            mode="date"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);

              if (selectedDate) {
                setDateObject(selectedDate);
              }
            }}
          />
        )}

        <LegalInput
          label="Purpose"
          value={purpose}
          onChangeText={setPurpose}
          placeholder="Enter purpose"
        />

        <LegalInput
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Write note"
          multiline
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>{editingId ? "UPDATE" : "SAVE"}</Text>
        </TouchableOpacity>

        <Text style={styles.total}>
          Total: {formatMoney(total, currency, locale)}
        </Text>

        {/* LIST */}
        {fees?.length > 0 &&
          fees.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.amount}>
                {formatMoney(item.amount, currency, locale)}
              </Text>

              <Text>{`📁 ${item.caseName || "-"}`}</Text>
              <Text>{`🏛 ${item.court || "-"}`}</Text>
              <Text>{`📅 ${toDisplay(item.date, locale)}`}</Text>
              <Text>{`📌 ${item.purpose || "-"}`}</Text>
              <Text>{`📝 ${item.note || "-"}`}</Text>

              <Text
                style={{
                  color: item.paid ? colors.success : colors.danger,
                  fontWeight: "800",
                  marginTop: 6,
                }}
              >
                {item.paid ? "PAID" : "UNPAID"}
              </Text>

              {item.paid ? (
                <Text style={{ fontSize: 12 }}>
                  {item.paidDate ? toDisplay(item.paidDate, locale) : "-"} |{" "}
                  {item.paidTo || "-"}
                </Text>
              ) : null}

              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => {
                    setSelectedCaseId(item.caseId || null);
                    setCaseName(item.caseName || "");
                    setCourtName(item.court || "");
                    setAmount(String(item.amount || ""));
                    setPurpose(item.purpose || "");
                    setDateObject(
                      item.date && !isNaN(new Date(item.date))
                        ? new Date(item.date)
                        : new Date(),
                    );
                    setNote(item.note || "");
                    setEditingId(item.id);
                  }}
                >
                  <Text>Edit</Text>
                </TouchableOpacity>

                {!item.paid ? (
                  <TouchableOpacity
                    style={styles.paidBtn}
                    onPress={() => {
                      setSelectedFeeId(item.id);
                      setShowPaidModal(true);
                    }}
                  >
                    <Text style={{ color: colors.surface }}>Paid</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    if (item?.id) {
                      deleteProcessFee(item.id);
                      loadFees();
                    }
                  }}
                >
                  <Text>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
      </ScrollView>

      {/* MODAL */}
      <Modal visible={showPaidModal} transparent animationType="fade">
        <View style={styles.modal}>
          <View style={styles.modalBox}>
            <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
              Paid To
            </Text>

            <LegalInput
              label="Paid To"
              value={paidTo}
              onChangeText={setPaidTo}
              placeholder="Client / Clerk / Court"
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowPaidModal(false);
                  setPaidTo("");
                }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={confirmPaid}>
                <Text style={{ color: colors.surface }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <LegalPicker
        visible={casePickerVisible}
        title="Select Case"
        selectedValue={selectedCaseId}
        options={cases.map((c) => ({
          label: c.title,
          value: c.id,
        }))}
        onSelect={(value) => {
          setSelectedCaseId(value);
        }}
        onClose={() => setCasePickerVisible(false)}
      />
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.border },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  subTitle: { fontSize: 11, color: colors.secondaryText, marginTop: 2 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: { fontSize: 24, color: colors.primary },
  title: { fontSize: 18, fontWeight: "800" },
  input: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    color: colors.shadow,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveText: { color: colors.surface, fontWeight: "800" },
  total: { marginTop: 20, fontWeight: "800", color: colors.shadow },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginTop: 14,
  },
  amount: { color: colors.danger, fontWeight: "900", fontSize: 16 },
  row: { flexDirection: "row", marginTop: 10 },
  btn: {
    flex: 1,
    backgroundColor: colors.border,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 5,
  },
  paidBtn: {
    flex: 1,
    backgroundColor: colors.success,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: colors.danger,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 5,
  },
  loader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 20,
    width: "85%",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.border,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 5,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 5,
  },
});
