import React from "react";
import SkeletonLoader from '../components/SkeletonLoader';
import PremiumPageHeader from '../components/PremiumPageHeader';
import { useTheme } from "../theme/ThemeContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  createMasterItem,
  deleteMasterItem,
  getMasterItems,
  updateMasterItem,
} from "../services/sqliteService";

const TYPES = [
  { key: "court", label: "Courts" },

  { key: "judge", label: "Judges" },

  { key: "stage", label: "Stages" },

  { key: "caseType", label: "Case Types" },

  { key: "description", label: "Proceedings" },
];

export default function MasterListScreen({ onBack }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const [selectedType, setSelectedType] = useState("court");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // LOGIC: Load Items (Untouched)
  const loadItems = useCallback(() => {
    try {
      setLoading(true);

      const result = getMasterItems(selectedType);

      setItems(result);
    } catch (_) {
      Alert.alert("Error", "Failed to load master list items.");
    } finally {
      setLoading(false);
    }
  }, [selectedType]);
  useEffect(() => {
    if (route?.params?.type) {
      setSelectedType(route.params.type);
    }
  }, [route?.params?.type]);
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openAddModal = () => {
    setEditingItem(null);
    setInputValue("");
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setInputValue(item.value || "");
    setModalVisible(true);
  };

  const closeModal = () => {
    setEditingItem(null);
    setInputValue("");
    setModalVisible(false);
  };

  const handleSave = () => {
    try {
      if (saving) return;

      if (!inputValue.trim()) {
        Alert.alert("Required", "Please enter a value.");
        return;
      }

      // ✅ Duplicate protection
      const exists = items.some(
        (i) => i.value.toLowerCase() === inputValue.trim().toLowerCase(),
      );

      if (exists) {
        Alert.alert("Duplicate", "This entry already exists.");
        return;
      }

      setSaving(true);

      if (editingItem?.id) {
        updateMasterItem(editingItem.id, inputValue.trim());
      } else {
        createMasterItem({
          type: selectedType,
          value: inputValue.trim(),
        });
      }

      closeModal();
      loadItems();

      Alert.alert("Success", "Saved successfully.");

      const parent = navigation.getParent();
      const value = inputValue.trim();

      if (selectedType === "court") {
        parent?.setParams({
          newCourt: value,
          refreshCourts: true,
        });
      }

      if (selectedType === "stage") {
        parent?.setParams({
          newStage: value,
          refreshStages: true,
        });
      }

      if (selectedType === "description") {
        parent?.setParams({
          newDescription: value,
          refreshDescriptions: true,
        });
      }
      if (selectedType === "judge") {
        parent?.setParams({
          newJudge: value,
          refreshJudges: true,
        });
      }

      if (selectedType === "caseType") {
        parent?.setParams({
          newCaseType: value,
          refreshCaseTypes: true,
        });
      }
      const returnTo = route?.params?.returnTo;

      // ✅ If coming from AddCase → go back
      if (returnTo === "AddCase") {
        navigation.goBack();
      }

      // ❌ If from Dashboard → do nothing (stay here)
    } catch (_) {
      Alert.alert("Error", "Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Item", `Delete "${item.value}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          try {
            deleteMasterItem(item.id);
            loadItems();
          } catch (error) {
            Alert.alert("Error", error.message || "Failed to delete item.");
          }
        },
      },
    ]);
  };

  const getPlaceholder = () => {
    if (selectedType === "court") return "e.g. Senior Civil Judge";

    if (selectedType === "judge") return "e.g. Malik Azmat Ullah Awan";

    if (selectedType === "stage") return "e.g. Final Arguments";

    if (selectedType === "caseType") return "e.g. Suit for Recovery";

    return "Enter proceeding";
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* PREMIUM MINIMAL HEADER */}
      <PremiumPageHeader title="Configurations" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{selectedType} Registry</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.addBtn} onPress={openAddModal}>
            <Text style={styles.addBtnText}>+ Add New</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <SkeletonLoader variant="list" count={4} />
            <Text style={styles.loaderText}>Syncing Master Data...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyEmoji}>⚙️</Text>
            </View>
            <Text style={styles.emptyTitle}>Empty Registry</Text>
            <Text style={styles.emptySub}>
              Define your {selectedType}s here to enable rapid case registration
              later.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemValueText}>{item.value}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity accessibilityRole="button"
                  style={styles.editAction}
                  onPress={() => openEditModal(item)}
                >
                  <Text style={styles.editActionText}>Modify</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button"
                  style={styles.deleteAction}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.deleteActionText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* MODAL: PREMIUM BOTTOM SHEET ENTRY */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={60}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalCard, { paddingBottom: insets.bottom + 30 }]}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingItem
                      ? "Update Configuration"
                      : `Add ${selectedType}`}
                  </Text>
                  <TouchableOpacity accessibilityRole="button"
                    onPress={closeModal}
                    style={styles.closeBtn}
                  >
                    <Text style={styles.closeX}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Entry Name / Value</Text>

                  <LegalInput
                    label="Entry Name / Value"
                    value={inputValue}
                    onChangeText={setInputValue}
                    placeholder={getPlaceholder()}
                    multiline={selectedType === "description"}
                  />
                </View>

                <TouchableOpacity accessibilityRole="button"
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? "SAVING..." : "CONFIRM CONFIGURATION"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.border },

  // Header & Tab System
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
    fontSize: 28,
    color: colors.primary,
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

  tabContainer: { paddingHorizontal: 20, marginTop: 25 },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: colors.border,
    borderRadius: 18,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tabLabel: { fontSize: 12, fontWeight: "700", color: colors.placeholder },
  tabLabelActive: { color: colors.primary },

  scrollContent: { paddingHorizontal: 20, paddingTop: 25 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.secondaryText,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { color: colors.surface, fontSize: 12, fontWeight: "900" },

  // List Cards
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  itemValueText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 22,
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.background,
    marginTop: 15,
    paddingTop: 12,
    gap: 15,
  },
  editAction: { paddingVertical: 4 },
  editActionText: { fontSize: 13, fontWeight: "800", color: colors.primary },
  deleteAction: { paddingVertical: 4 },
  deleteActionText: { fontSize: 13, fontWeight: "800", color: colors.danger },

  // Empty & Loader
  emptyBox: { alignItems: "center", marginTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  emptySub: {
    fontSize: 14,
    color: colors.placeholder,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  loaderWrap: { paddingVertical: 80, alignItems: "center" },
  loaderText: { marginTop: 15, color: colors.primary, fontWeight: "700" },

  // Modal (Bottom Sheet Style)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 15,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: colors.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  closeX: { fontSize: 12, color: colors.placeholder, fontWeight: "900" },
  inputGroup: { marginBottom: 30 },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondaryText,
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 18,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multilineInput: { minHeight: 120, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    borderRadius: 22,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  saveBtnText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 1.5,
  },
});
