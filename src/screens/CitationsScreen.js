import { exportCitationPdf } from "../utils/citationPdf";
import { askDeepSeek } from "../services/deepseekService";
import LegalInput from "../components/LegalInput";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeContext";
import { Share2, Copy, FileText } from "lucide-react-native";
import {
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  deleteCitation as deleteCitationDB,
  getCitationsByCaseId,
  insertCitation,
  getProfile,
} from "../services/sqliteService";
import { toDisplay } from "../utils/date";
import { useNavigation, useRoute } from "@react-navigation/native";
const PremiumExportButton = ({ item, openExportOptions, styles, colors }) => {
  return (
    <TouchableOpacity
      onPress={() => openExportOptions(item)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={["#434343", "#1a1a1a", "#000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumExportBtn}
      >
        <Share2 color={colors.text} size={14} strokeWidth={2.5} />

        <Text style={styles.premiumExportText}>EXPORT</Text>

        <View style={styles.glossHighlight} />
      </LinearGradient>
    </TouchableOpacity>
  );
};
export default function CitationsScreen({
  caseId,
  onBack,
  citation: incomingCitation,
  description: incomingDescription,
  route,
}) {
  const navigation = useNavigation();
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);

  console.log("PROP CASE ID:", caseId);
  console.log("ROUTE CASE ID:", route?.params?.caseId);
  console.log("ROUTE PARAMS:", route?.params);
  const activeCaseId = caseId ?? route?.params?.caseId;

  console.log("ACTIVE CASE ID:", activeCaseId);
  const insets = useSafeAreaInsets();

  console.log("FINAL CASE ID =", activeCaseId);
  const [citation, setCitation] = useState(incomingCitation || "");

  const [description, setDescription] = useState(incomingDescription || "");
  const [citations, setCitations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [showInputPanel, setShowInputPanel] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [editingId, setEditingId] = useState(null);
  useEffect(() => {
    console.log("CITATION CASE ID:", activeCaseId);
  }, []);
  const loadCitations = useCallback(() => {
    try {
      const data = getCitationsByCaseId(activeCaseId);
      setCitations(data);
    } catch (_) {
      Alert.alert("Error", "Failed to load citations.");
    }
  }, [activeCaseId]);

  useEffect(() => {
    loadCitations();
  }, [loadCitations]);
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (e) {
        console.log("Profile load error", e);
      }
    };

    loadProfile();
  }, []);
  useEffect(() => {
    if (route?.params?.citation) {
      setCitation(route.params.citation);
    }

    if (route?.params?.description) {
      setDescription(route.params.description);
    }

    setShowInputPanel(true);
  }, [route?.params]);
  const handleCopy = (text) => {
    Clipboard.setString(text);
    // Optional: You could add a Toast here for "Copied!"
  };
  const handleAddCitation = () => {
    if (!citation.trim()) return;
    const newCitation = {
      caseId: activeCaseId,
      citation: citation.trim(),
      description: description.trim(),
      date: new Date().toISOString(),
    };

    try {
      insertCitation(newCitation);
      loadCitations();
      setCitation("");
      setDescription("");
      setShowInputPanel(false);
    } catch {
      Alert.alert("Error", "Failed to save citation.");
    }
  };
  const openResearchSource = async () => {
    const sources = profile?.researchSources || [];

    if (sources.length === 0) {
      Alert.alert(
        "No Research Source",
        "Please add a research source in Settings.",
      );
      return;
    }

    if (sources.length === 1) {
      navigation.navigate("LegalBrowser", {
        url: sources[0].url,
        title: sources[0].name,
        caseId: activeCaseId,
        mode: "citation",
      });
      return;
    }

    Alert.alert(
      "Choose Research Source",
      "Multiple sources detected. Picker coming next.",
    );
  };
  const handleAnalyzeCitation = async () => {
    if (!citation.trim() && !description.trim()) {
      Alert.alert(
        "No Text",
        "Please enter citation text or paste legal content first.",
      );
      return;
    }

    try {
      const result = await askDeepSeek(`
You are a legal citation analyzer.

Analyze the legal citation and notes provided below.

Return ONLY a valid JSON object.

Do not use markdown.
Do not use code blocks.
Do not explain anything.

Citation:
${citation}

Notes:
${description}

Format:
{
  "citation":"",
  "caseName":"",
  "legalPoint":"",
  "keywords":""
}
`);
      if (__DEV__) {
        console.log("RAW AI RESPONSE:");
        console.log(result);
      }
      const cleaned = result
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const data = JSON.parse(cleaned);

      if (data.type === "SEARCH_RESULTS") {
        Alert.alert(
          "Open Full Judgment",
          "Search results detected. Please open a specific case law in Print Case mode before importing into LegalSphere.",
        );

        return;
      }

      if (__DEV__) {
        console.log("AI Result:", data);
      }

      setCitation(data.citation || citation);

      setDescription(
        `${data.caseName || ""}

${data.legalPoint || ""}

Keywords: ${data.keywords || ""}`,
      );

      Alert.alert("Success", "Citation analyzed successfully.");
    } catch (e) {
      console.log("Citation AI Error:", e);

      Alert.alert("AI Error", "Failed to analyze citation.");
    }
  };
  const openExportOptions = (item) => {
    setSelectedCitation(item);
    setExportModalVisible(true);
  };

  const handleCopyFullCitation = () => {
    Clipboard.setString(
      `${selectedCitation?.citation || ""}

${selectedCitation?.description || ""}`,
    );

    Alert.alert("Copied", "Full citation copied.");

    setExportModalVisible(false);
  };

  const handleShareCitation = async () => {
    await Share.share({
      message: `${selectedCitation?.citation || ""}

${selectedCitation?.description || ""}`,
    });

    setExportModalVisible(false);
  };

  const handleEditCitation = () => {
    setCitation(selectedCitation?.citation || "");
    setDescription(selectedCitation?.description || "");

    setEditingId(selectedCitation?.id);

    setShowInputPanel(true);

    setExportModalVisible(false);
  };
  const handleDeleteCitation = (id) => {
    try {
      deleteCitationDB(id);
      loadCitations();
    } catch {
      Alert.alert("Error", "Failed to delete citation.");
    }
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="dark-content" />

      {/* ULTRA PREMIUM HEADER */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.glassBackButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleWrapper}>
            <Text style={styles.headerTitleText}>Legal Vault</Text>
            <View style={styles.jurisdictionPill}>
              <View style={styles.liveDot} />
              <Text style={styles.jurisdictionText}>PRECEDENTS</Text>
            </View>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.list}
          contentContainerStyle={{
            paddingVertical: 25,
            paddingBottom: 220, // Extra space for the floating panel
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {citations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>📚</Text>
              </View>
              <Text style={styles.emptyText}>No Research Yet</Text>
              <Text style={styles.emptySub}>
                Your legal library is empty. Start adding case laws and
                citations below.
              </Text>
            </View>
          ) : (
            citations.map((c) => (
              <View key={c.id} style={styles.citationCard}>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.citationTitle}>{c.citation}</Text>
                    <PremiumExportButton styles={styles} colors={colors}
                      item={c}
                      openExportOptions={openExportOptions}
                    />
                  </View>

                  {c.description ? (
                    <Text style={styles.descriptionText}>{c.description}</Text>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>
                      Added {toDisplay(c.date)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteCitation(c.id)}
                    >
                      <Text style={styles.deleteLink}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* FLOATING INPUT PANEL */}

        {showInputPanel && (
          <View
            style={[styles.inputPanel, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.panelHandle} />
            <Text style={styles.inputLabel}>New Legal Reference</Text>
            <View style={styles.inputGroup}>
              <LegalInput
                label="Citation"
                value={citation}
                onChangeText={setCitation}
                placeholder="2024 SCMR 102"
              />

              <LegalInput
                label="Private Notes / Summary"
                value={description}
                onChangeText={setDescription}
                placeholder="Write summary or notes"
                multiline
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: colors.text,
                paddingVertical: 16,
                borderRadius: 18,
                alignItems: "center",
                marginBottom: 12,
              }}
              onPress={handleAnalyzeCitation}
            >
              <Text
                style={{
                  color: colors.surface,
                  fontWeight: "800",
                  fontSize: 15,
                }}
              >
                🤖 Analyze Citation
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addCitationBtn}
              onPress={handleAddCitation}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>Secure to Library</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.researchFab}
          onPress={openResearchSource}
        >
          <Ionicons name="globe-outline" size={28} color={colors.surface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.panelToggle,
            showInputPanel
              ? styles.panelToggleActive
              : styles.panelToggleInactive,
          ]}
          onPress={() => setShowInputPanel(!showInputPanel)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={showInputPanel ? "chevron-down" : "chevron-up"}
            size={22}
            color={showInputPanel ? colors.danger : "#C5A880"}
          />
        </TouchableOpacity>
        <Modal visible={exportModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.exportModalCard}>
              <Text style={styles.modalTitle}>Citation Actions</Text>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={async () => {
                  await exportCitationPdf(selectedCitation);
                  setExportModalVisible(false);
                }}
              >
                <FileText color={colors.primaryDark} size={20} />
                <Text style={styles.exportText}>Export PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={handleCopyFullCitation}
              >
                <Copy color={colors.primaryDark} size={20} />
                <Text style={styles.exportText}>Copy Full Citation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={handleShareCitation}
              >
                <Share2 color={colors.primaryDark} size={20} />
                <Text style={styles.exportText}>Share Citation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={handleEditCitation}
              >
                <FileText color={colors.primaryDark} size={20} />
                <Text style={styles.exportText}>Edit Citation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={() => {
                  handleDeleteCitation(selectedCitation?.id);

                  setExportModalVisible(false);
                }}
              >
                <Text
                  style={{
                    color: colors.danger,
                    fontWeight: "800",
                  }}
                >
                  Delete Citation
                </Text>
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
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.background },

  // HEADER
  premiumHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  glassBackButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.border,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backIconText: { fontSize: 22, color: colors.primary, fontWeight: "600" },
  headerTitleWrapper: { flex: 1, alignItems: "center" },
  headerTitleText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  jurisdictionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    marginRight: 6,
  },
  jurisdictionText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // LIST & CARDS
  list: { flex: 1, paddingHorizontal: 18 },
  citationCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardContent: { padding: 24 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  citationTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
    lineHeight: 24,
  },
  copyActionBtn: {
    backgroundColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 12,
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.secondaryText,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.secondaryText,
    lineHeight: 22,
    marginBottom: 18,
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: 14,
  },
  dateText: { fontSize: 12, color: colors.placeholder, fontWeight: "600" },
  deleteLink: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },

  // INPUT PANEL
  inputPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 20,
  },
  panelHandle: {
    width: 36,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.placeholder,
    textTransform: "uppercase",
    marginBottom: 16,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  inputGroup: { gap: 12, marginBottom: 20 },
  premiumInput: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
  },
  multilineInput: { minHeight: 80, textAlignVertical: "top" },
  addCitationBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    borderRadius: 22,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  addBtnText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  emptyState: { alignItems: "center", marginTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 20, fontWeight: "900", color: colors.text },
  emptySub: {
    fontSize: 15,
    color: colors.placeholder,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 22,
  },
  backIcon: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "300",
    marginTop: -4,
  },
  researchFab: {
    position: "absolute",
    right: 24,
    bottom: 170, // Above your floating citation panel
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  panelToggle: {
    position: "absolute",
    right: 34,
    bottom: 245,

    width: 44,
    height: 44,
    borderRadius: 22,

    alignItems: "center",
    justifyContent: "center",

    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,

    borderWidth: 1,
    zIndex: 99,
  },
  panelToggleInactive: {
    backgroundColor: colors.text, // Deep slate background to match your premium UI
    borderColor: "rgba(197, 168, 128, 0.3)", // Subtle gold border
  },
  panelToggleActive: {
    backgroundColor: colors.surface,
    borderColor: "rgba(239, 68, 68, 0.2)", // Subtle red border when active/closing
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  exportModalCard: {
    width: "85%",
    backgroundColor: colors.surface,
    borderRadius: 30,
    padding: 25,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 20,
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

  cancelBtn: {
    marginTop: 20,
  },

  cancelText: {
    textAlign: "center",
    color: colors.danger,
    fontWeight: "900",
  },

  premiumExportBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    overflow: "hidden",
  },

  premiumExportText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 6,
  },

  glossHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
});
