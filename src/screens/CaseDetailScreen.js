// CaseDetailScreen.js – Clean, Premium, Action-Ready

import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  deleteHearing,
  getCaseById,
  getCaseHearings,
  getProfile,
  recalculateNextHearing,
  updateCasePayment,
  updateCaseStatus,
  updateAiChatLink,
  addCaseNote,
} from "../services/sqliteService";
import { formatMoney, getCurrency } from "../utils/currency";
import { toDisplay } from "../utils/date";
import { getCallLink, getSMSLink, getWhatsAppLink } from "../utils/phone";
import CitationsScreen from "./CitationsScreen";
import NotesScreen from "./NotesScreen";

export default function CaseDetailScreen({ profile }) {
  const route = useRoute();
  const navigation = useNavigation();
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const currency = getCurrency(currentProfile);
  const locale = currentProfile?.locale || "en-PK";
  const { caseId } = route.params || {};
  const insets = useSafeAreaInsets();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotesScreen, setShowNotesScreen] = useState(false);
  const [showCitationsScreen, setShowCitationsScreen] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [hearings, setHearings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiLinkModalVisible, setAiLinkModalVisible] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [aiChatLink, setAiChatLink] = useState("");

  // LOAD CASE
  const loadCase = useCallback(() => {
    try {
      if (!caseId) return;

      setLoading(true);

      const result = getCaseById(caseId);

      if (result?.status === "archived") {
        navigation.goBack();
        return;
      }

      setCaseData(result);
      setAiChatLink(result?.aiChatLink || "");
      const hearingList = getCaseHearings(caseId) || [];

      hearingList.sort((a, b) => {
        if (!a.hearingDate) return 1;
        if (!b.hearingDate) return -1;
        return new Date(b.hearingDate || 0) - new Date(a.hearingDate || 0);
      });

      setHearings(hearingList);
    } catch (error) {
      console.log("❌ loadCase error:", error);
      Alert.alert("Error", "Failed to load case details.");
    } finally {
      setLoading(false);
    }
  }, [caseId, navigation]);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const fresh = await getProfile();
        if (fresh) setCurrentProfile(fresh);
        loadCase();
      };
      init();
    }, [loadCase]),
  );

  const handleArchive = () => {
    if (!caseData?.id) return;
    Alert.alert(
      "Archive Case",
      `Are you sure you want to archive "${caseData.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await updateCaseStatus(caseData.id, "archived");
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to archive case.");
            }
          },
        },
      ],
    );
  };

  const handleRestore = () => {
    if (!caseData?.id || saving) return;
    Alert.alert(
      "Restore Case",
      `Restore "${caseData?.title}" back to active cases?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            try {
              setSaving(true);
              updateCaseStatus(caseData.id, "active");
              loadCase();
              Alert.alert("Success", "Case restored successfully.");
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to restore case.");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleAddPayment = () => {
    if (saving) return;
    try {
      setSaving(true);
      if (!caseData?.id) {
        Alert.alert("Error", "Case not found.");
        return;
      }
      const amount = Number(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Invalid amount", "Enter a valid payment amount.");
        return;
      }
      if (amount > Number(caseData?.feeBalance)) {
        Alert.alert("Error", "Payment exceeds remaining balance.");
        return;
      }
      updateCasePayment(
        caseData.id,
        amount,
        caseData.feePaid,
        caseData.feeBalance,
      );
      loadCase();
      setPaymentModalVisible(false);
      setPaymentAmount("");
      Alert.alert("Success", "Payment added successfully.");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update payment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHearing = (hearingId) => {
    Alert.alert(
      "Delete Hearing",
      "Are you sure you want to delete this hearing record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            try {
              deleteHearing(hearingId);
              recalculateNextHearing(caseData.id);
              loadCase();
            } catch (error) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ],
    );
  };

  if (showNotesScreen) {
    return (
      <NotesScreen caseId={caseId} onBack={() => setShowNotesScreen(false)} />
    );
  }
  if (showCitationsScreen) {
    return (
      <CitationsScreen
        caseId={caseId}
        onBack={() => setShowCitationsScreen(false)}
      />
    );
  }
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }
  if (!caseData) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Case not found</Text>
      </View>
    );
  }

  const handleCallClient = () => {
    if (!caseData?.clientMobile) {
      Alert.alert("Missing number", "Client mobile number is not available.");
      return;
    }
    const url = getCallLink(caseData?.clientMobile);
    Linking.openURL(url);
  };

  const handleWhatsAppClient = () => {
    if (!caseData?.clientMobile) {
      Alert.alert("Missing number", "Client mobile number is not available.");
      return;
    }
    const message = `Dear ${caseData?.clientName || "Client"}, 
This is regarding your case "${caseData?.title || ""}". 

Next hearing date: ${toDisplay(caseData?.nextHearingISO, locale)}

Regards,  
${currentProfile?.name || "Advocate"}`;
    const url =
      getWhatsAppLink(caseData?.clientMobile) +
      `?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const handleSendReminder = async () => {
    if (!caseData?.clientMobile) {
      Alert.alert("Missing number", "Client mobile number is not available.");
      return;
    }
    const message = `Dear ${caseData?.clientName || "Client"}, 
This is regarding your case "${caseData?.title || ""}". 

Next hearing date: ${toDisplay(caseData?.nextHearingISO, locale)}

Regards,  
${profile?.name || "Advocate"}`;
    const url = getSMSLink(caseData?.clientMobile, message);
    Linking.openURL(url);
  };

  const isArchived = caseData?.status === "archived";
  const healthScore = (() => {
    let score = 100;
    if (Number(caseData?.feeBalance || 0) > 0) score -= 20;
    if (hearings.length === 0) score -= 25;
    if (caseData?.urgent) score -= 10;
    if (isArchived) score -= 30;
    if (!aiChatLink) score -= 8;
    return Math.max(score, 5);
  })();
  const healthColor =
    healthScore >= 75 ? "#22C55E" : healthScore >= 45 ? "#F59E0B" : "#EF4444";
  const healthLabel =
    healthScore >= 75
      ? "LOW RISK"
      : healthScore >= 45
        ? "MODERATE RISK"
        : "HIGH RISK";

  const recentHearings = hearings.slice(0, 2);

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* HEADER */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.glassBackButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.titleCenter}>
            <Text style={styles.headerTitleText}>Case Details</Text>
            <TouchableOpacity
              style={styles.caseNoButton}
              activeOpacity={0.85}
              onPress={() => {
                Clipboard.setString(String(caseData?.caseNo || ""));
                Alert.alert("Copied", "Case No copied");
              }}
            >
              <Text style={styles.caseNoLabel}>
                CASE NO: {caseData?.caseNo || "N/A"}
              </Text>
              <Text style={styles.caseNoSub}>Tap to copy</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.aiCopyButton}
            activeOpacity={0.85}
            onPress={async () => {
              try {
                const aiCaseText = `
Case Title: ${caseData?.title || "-"}
Case No: ${caseData?.caseNo || "-"}
Court: ${caseData?.court || "-"}
Client: ${caseData?.clientName || "-"}
Through: ${caseData?.opponent || "-"}
Stage: ${caseData?.stage || "-"}
Priority: ${caseData?.priority || "-"}
Status: ${caseData?.status || "-"}
Next Hearing: ${toDisplay(caseData?.nextHearingISO, locale) || "-"}
Fee Balance: ${formatMoney(caseData?.feeBalance, currency, locale) || "-"}
Description: ${caseData?.description || "-"}
Notes: ${caseData?.notes || "-"}`;
                await Clipboard.setStringAsync(aiCaseText);
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                Alert.alert(
                  "AI Copy Ready",
                  "Case details copied for AI Litigation Room.",
                );
              } catch {
                Alert.alert("Error", "Failed to copy case details.");
              }
            }}
          >
            <Text style={styles.aiCopyIcon}>✦</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* HERO BANNER */}
        <View style={styles.caseHeroBanner}>
          <LinearGradient
            colors={["#0F172A", "#1E3A8A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.caseHeroGradient}
          >
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroCountry}>
                  {(caseData?.country || "Pakistan").toUpperCase()}
                </Text>
              </View>
              <View style={styles.liveStatusBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveStatusText}>
                  {isArchived ? "ARCHIVED" : "ACTIVE"}
                </Text>
              </View>
            </View>
            <Text style={styles.heroCaseTitle}>
              {caseData?.title || "Untitled Case"}
            </Text>
            <Text style={styles.heroCourtText}>
              🏛 {caseData?.court || "Unknown Court"}
            </Text>
          </LinearGradient>
        </View>

        {/* SUMMARY CARD */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.caseTitle}>{caseData.title}</Text>
                <View
                  style={[
                    styles.priorityBadge,
                    caseData.priority === "urgent" && {
                      backgroundColor: "#FEE2E2",
                    },
                    caseData.priority === "important" && {
                      backgroundColor: "#FEF9C3",
                    },
                    caseData.priority === "normal" && {
                      backgroundColor: "#E2E8F0",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      caseData.priority === "urgent" && { color: "#DC2626" },
                      caseData.priority === "important" && { color: "#CA8A04" },
                      caseData.priority === "normal" && { color: "#475569" },
                    ]}
                  >
                    {caseData.priority?.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.caseCourt}>🏛 {caseData.court}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <Row label="Current Stage" value={caseData.stage} />
          <Row label="Proceeding" value={caseData.description} />
          <Row
            label="Next Hearing"
            value={toDisplay(caseData.nextHearingISO, locale)}
            highlight
          />
          <View style={styles.statusRow}>
            <Text style={styles.rowLabel}>File Status</Text>
            <View
              style={[
                styles.statusTag,
                isArchived && { backgroundColor: "#FEE2E2" },
              ]}
            >
              <Text
                style={[
                  styles.statusTagText,
                  isArchived && { color: "#DC2626" },
                ]}
              >
                {caseData.status?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* CASE INFORMATION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Case Information</Text>
        </View>
        <View style={styles.card}>
          {!!caseData?.judge && <Row label="Judge" value={caseData.judge} />}
          {!!caseData?.caseType && (
            <Row label="Case Type" value={caseData.caseType} />
          )}
          {!!caseData?.litigationDomain && (
            <Row label="Litigation Domain" value={caseData.litigationDomain} />
          )}
          {!!caseData?.representingSide && (
            <Row label="Representing Side" value={caseData.representingSide} />
          )}
          {!!caseData?.opposingCounsel && (
            <Row label="Opposing Counsel" value={caseData.opposingCounsel} />
          )}
          {!!caseData?.opponent && (
            <Row label="Opponent" value={caseData.opponent} />
          )}
          {!!caseData?.firNo && <Row label="FIR No" value={caseData.firNo} />}
          {!!caseData?.firDate && (
            <Row label="FIR Date" value={caseData.firDate} />
          )}
        </View>

        {/* ========================== */}
        {/* NEW ACTION BUTTONS (3 ROWS) */}
        {/* ========================== */}
        <View style={styles.actionSection}>
          {/* Row 1: Add Hearing (full width) */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnFull]}
              onPress={() =>
                navigation.navigate("UpdateCaseHearing", {
                  caseId: caseData.id,
                  caseData,
                  mode: "edit",
                })
              }
            >
              <Text style={styles.actionBtnIcon}>📅</Text>
              <Text style={styles.actionBtnLabel}>Add Hearing</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: AI Room | Lex AI | Timeline */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() => {
                if (aiChatLink) {
                  Linking.openURL(aiChatLink);
                } else {
                  setAiLinkModalVisible(true);
                }
              }}
            >
              <Text style={styles.actionBtnIcon}>✦</Text>
              <Text style={styles.actionBtnLabel}>AI Room</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() =>
                navigation.navigate("AIChatRoom", {
                  caseId: caseData?.id,
                })
              }
            >
              <Text style={styles.actionBtnIcon}>✨</Text>
              <Text style={styles.actionBtnLabel}>Lex AI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate("Timeline", { caseId: caseData.id });
              }}
            >
              <Text style={styles.actionBtnIcon}>📜</Text>
              <Text style={styles.actionBtnLabel}>Timeline</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3: Documents | Notes | Citations */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() =>
                navigation.navigate("DocumentVault", {
                  caseId: caseData.id,
                  caseTitle: caseData.title,
                })
              }
            >
              <Text style={styles.actionBtnIcon}>📁</Text>
              <Text style={styles.actionBtnLabel}>Documents</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() => setShowNotesScreen(true)}
            >
              <Text style={styles.actionBtnIcon}>📓</Text>
              <Text style={styles.actionBtnLabel}>Notes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() => setShowCitationsScreen(true)}
            >
              <Text style={styles.actionBtnIcon}>⚖️</Text>
              <Text style={styles.actionBtnLabel}>Citations</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI LITIGATION INSIGHTS */}
        <View style={styles.aiInsightsCard}>
          <View style={styles.aiInsightsHeader}>
            <Text style={styles.aiInsightsTitle}>AI Litigation Insights</Text>
            <Text style={styles.aiInsightsBadge}>LIVE</Text>
          </View>
          {Number(caseData?.feeBalance || 0) > 0 && (
            <Text style={styles.aiInsightItem}>
              ⚠ Outstanding balance detected
            </Text>
          )}
          {hearings.length === 0 && (
            <Text style={styles.aiInsightItem}>⚠ No hearings recorded</Text>
          )}
          {!!aiChatLink && (
            <Text style={styles.aiInsightItem}>
              ✦ AI Litigation Room connected
            </Text>
          )}
          {!isArchived && (
            <Text style={styles.aiInsightItem}>
              🟢 Active litigation workflow detected
            </Text>
          )}
        </View>

        {/* CASE HEALTH ENGINE */}
        <View style={styles.healthCard}>
          <Text style={styles.healthTitle}>Case Health Score</Text>
          <View style={[styles.healthCircle, { borderColor: healthColor }]}>
            <Text style={[styles.healthPercent, { color: healthColor }]}>
              {healthScore}%
            </Text>
          </View>
          <Text style={[styles.healthRisk, { color: healthColor }]}>
            {healthLabel}
          </Text>
        </View>

        {/* CLIENT RELATIONS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Client Relations</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.clientProfileRow}>
            <View style={styles.clientAvatar}>
              <Text style={styles.avatarText}>C</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.clientNameText}>
                {caseData.clientName || "Unknown"}
              </Text>
              <Text style={styles.clientSubText}>
                {caseData.clientMobile || "No Contact"}
              </Text>
            </View>
          </View>
          <View style={styles.actionGrid}>
            <ActionIconButton
              color="#3B82F6"
              icon="📞"
              onPress={handleCallClient}
            />
            <ActionIconButton
              color="#22C55E"
              icon="💬"
              onPress={handleWhatsAppClient}
            />
            <ActionIconButton
              color="#F59E0B"
              icon="🔔"
              onPress={handleSendReminder}
            />
          </View>
        </View>

        {/* FINANCIAL SUMMARY */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <TouchableOpacity onPress={() => setPaymentModalVisible(true)}>
            <Text style={styles.addPaymentLink}>+ Add Payment</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.feeGrid}>
            <FeeBox
              label="Decided"
              val={formatMoney(caseData.feeDecided, currency, locale)}
            />
            <FeeBox
              label="Paid"
              val={formatMoney(caseData.feePaid, currency, locale)}
              color="#10B981"
            />
          </View>
          <View style={styles.balanceRibbon}>
            <Text style={styles.balanceLabel}>OUTSTANDING BALANCE</Text>
            <Text style={styles.balanceValue}>
              {formatMoney(caseData.feeBalance, currency, locale)}
            </Text>
          </View>
        </View>

        {/* HEARING TIMELINE PREVIEW */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Hearings</Text>
          {hearings.length > 2 && (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Timeline", { caseId: caseData.id })
              }
            >
              <Text style={styles.viewAllLink}>View all →</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.card}>
          {recentHearings.length === 0 ? (
            <Text style={styles.emptyText}>No hearing records found.</Text>
          ) : (
            recentHearings.map((item, idx) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={styles.timelineDot} />
                  {idx !== recentHearings.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
                <View style={styles.timelineModernCard}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineDate}>
                      {toDisplay(item.hearingDate, locale)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteHearing(item.id)}
                    >
                      <Text style={styles.delText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.timelineStage}>
                    Stage: {item.stage || "-"}
                  </Text>
                  {item.notes && (
                    <Text style={styles.timelineNotes}>{item.notes}</Text>
                  )}
                </View>
              </View>
            ))
          )}
          {hearings.length > 2 && (
            <TouchableOpacity
              style={styles.viewFullButton}
              onPress={() =>
                navigation.navigate("Timeline", { caseId: caseData.id })
              }
            >
              <Text style={styles.viewFullButtonText}>View Full Timeline</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* DESCRIPTION */}
        {caseData.description && (
          <View style={[styles.card, { marginTop: 8 }]}>
            <Text style={styles.cardSubtitle}>Matter Description</Text>
            <Text style={styles.descriptionText}>{caseData.description}</Text>
          </View>
        )}

        {/* ARCHIVE / RESTORE BUTTON */}
        <View style={{ marginTop: 10, marginBottom: 20 }}>
          {isArchived ? (
            <TouchableOpacity
              style={[styles.mainActionBtn, { backgroundColor: "#10B981" }]}
              onPress={handleRestore}
            >
              <Text style={styles.mainActionBtnText}>
                RESTORE TO ACTIVE DIARY
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.mainActionBtn, { backgroundColor: "#EF4444" }]}
              onPress={handleArchive}
            >
              <Text style={styles.mainActionBtnText}>
                MOVE TO ARCHIVE VAULT
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* AI ASSISTANT MODAL */}
      <Modal visible={showAiAssistant} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>AI Case Assistant</Text>
            <Text style={styles.modalSub}>Choose an AI workflow</Text>

            <TouchableOpacity
              style={styles.aiActionBtn}
              onPress={() => {
                const summary = `
AI CASE SUMMARY

Case Title:
${caseData?.title || "-"}

Court:
${caseData?.court || "-"}

Case Number:
${caseData?.caseNo || "-"}

Current Stage:
${caseData?.stage || "-"}

Client:
${caseData?.clientName || "-"}

Next Hearing:
${toDisplay(caseData?.nextHearingISO, locale)}

Case Description:
${caseData?.description || "No description available"}

Status:
${caseData?.status || "-"}
`;

                setGeneratedSummary(summary);
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
              }}
            >
              <Text style={styles.aiActionText}>📄 Summarize Case</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiActionBtn}
              onPress={() => {
                Alert.alert("Coming Next", "Prepare Arguments AI");
              }}
            >
              <Text style={styles.aiActionText}>⚖ Prepare Arguments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiActionBtn}
              onPress={() => {
                Alert.alert("Coming Next", "Cross Examination AI");
              }}
            >
              <Text style={styles.aiActionText}>❓ Cross Examination</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiActionBtn}
              onPress={() => {
                Alert.alert("Coming Next", "Next Hearing Strategy AI");
              }}
            >
              <Text style={styles.aiActionText}>📅 Next Hearing Strategy</Text>
            </TouchableOpacity>

            {generatedSummary ? (
              <View
                style={{
                  backgroundColor: "#F8FAFC",
                  padding: 14,
                  borderRadius: 14,
                  marginBottom: 12,
                  maxHeight: 220,
                }}
              >
                <ScrollView>
                  <Text
                    style={{
                      color: "#1E293B",
                      fontSize: 14,
                      lineHeight: 22,
                    }}
                  >
                    {generatedSummary}
                  </Text>
                </ScrollView>
              </View>
            ) : null}

            {generatedSummary ? (
              <>
                <TouchableOpacity
                  style={styles.aiActionBtn}
                  onPress={() => {
                    addCaseNote({
                      caseId,
                      text: generatedSummary,
                      image: null,
                    });
                    Alert.alert("Saved", "AI summary saved to Notes.");
                    setShowAiAssistant(false);
                  }}
                >
                  <Text style={styles.aiActionText}>
                    💾 Save Summary To Notes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.aiActionBtn}
                  onPress={async () => {
                    await Clipboard.setStringAsync(generatedSummary);
                    Alert.alert("Copied", "Summary copied.");
                  }}
                >
                  <Text style={styles.aiActionText}>📋 Copy Summary</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowAiAssistant(false)}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI LINK MODAL */}
      <Modal visible={aiLinkModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>AI Litigation Room</Text>
            <Text style={styles.modalSub}>
              Paste ChatGPT share link for this case
            </Text>
            <View style={{ flex: 0, marginBottom: 40 }}>
              <LegalInput
                label="AI Litigation Room"
                value={aiChatLink}
                onChangeText={setAiChatLink}
                placeholder="https://chatgpt.com/..."
              />
            </View>
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setAiLinkModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={async () => {
                  try {
                    if (!aiChatLink?.trim()) {
                      Alert.alert("Missing Link", "Please paste AI room link.");
                      return;
                    }
                    await updateAiChatLink(caseData.id, aiChatLink);
                    Alert.alert("Success", "AI room linked successfully.");
                    setAiLinkModalVisible(false);
                  } catch {
                    Alert.alert("Error", "Failed to save AI room.");
                  }
                }}
              >
                <Text style={styles.modalSaveText}>Save Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PAYMENT MODAL */}
      <Modal visible={paymentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <Text style={styles.modalSub}>{caseData.title}</Text>
            <LegalInput
              label="Payment Amount"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="0.00"
              keyboardType="numeric"
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setPaymentModalVisible(false);
                  setPaymentAmount("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleAddPayment}
              >
                <Text style={styles.modalSaveText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ======================== HELPERS ========================
const Row = ({ label, value, highlight }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text
      style={[
        styles.rowValue,
        highlight && { color: "#1E3A8A", fontWeight: "900" },
      ]}
    >
      {value || "-"}
    </Text>
  </View>
);

const ActionIconButton = ({ color, icon, onPress }) => (
  <TouchableOpacity
    style={[styles.actionIconBtn, { backgroundColor: color }]}
    onPress={onPress}
  >
    <Text style={styles.actionIconText}>{icon}</Text>
  </TouchableOpacity>
);

const FeeBox = ({ label, val, color }) => (
  <View style={styles.feeBox}>
    <Text style={styles.feeBoxLabel}>{label}</Text>
    <Text style={[styles.feeBoxVal, color && { color }]}>{val}</Text>
  </View>
);

// ======================== STYLES ========================
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#0A0F1E" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  premiumHeader: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  glassBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 28,
    color: "#1E3A8A",
    fontWeight: "300",
    marginTop: -4,
  },
  titleCenter: { flex: 1, alignItems: "center" },
  headerTitleText: { fontSize: 18, fontWeight: "800", color: "#1E3A8A" },
  caseNoButton: {
    marginTop: 6,
    backgroundColor: "#E0E7FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  caseNoLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#1E3A8A",
    letterSpacing: 0.5,
  },
  caseNoSub: { fontSize: 9, color: "#475569", marginTop: 2, fontWeight: "600" },
  aiCopyButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  aiCopyIcon: { fontSize: 18, color: "#1E3A8A", fontWeight: "900" },

  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },

  caseHeroBanner: { marginBottom: 24 },
  caseHeroGradient: { borderRadius: 28, padding: 22 },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroCountry: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  liveStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 8,
  },
  liveStatusText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  heroCaseTitle: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 20,
    lineHeight: 32,
  },
  heroCourtText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    marginTop: 8,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  caseTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A", flex: 1 },
  caseCourt: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    fontWeight: "600",
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  priorityText: { fontSize: 9, fontWeight: "900" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 14 },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8 },
  rowLabel: { width: "42%", fontSize: 13, color: "#64748B", fontWeight: "600" },
  rowValue: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "800",
    textAlign: "right",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  statusTag: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: { fontSize: 11, fontWeight: "800", color: "#0369A1" },

  // ==================== NEW ACTION BUTTONS ====================
  actionSection: {
    marginBottom: 24,
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    gap: 6,
  },
  actionBtnFull: {
    flex: 1,
  },
  actionBtnThird: {
    flex: 1,
  },
  actionBtnIcon: {
    fontSize: 18,
    color: "#38BDF8",
    fontWeight: "900",
  },
  actionBtnLabel: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  aiInsightsCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  aiInsightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  aiInsightsTitle: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  aiInsightsBadge: {
    color: "#22C55E",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  aiInsightItem: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 12,
    fontWeight: "600",
    lineHeight: 20,
  },

  healthCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  healthTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  healthCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
  },
  healthPercent: { fontSize: 28, fontWeight: "900" },
  healthRisk: { fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },

  clientProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFF", fontSize: 20, fontWeight: "800" },
  clientNameText: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  clientSubText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  actionGrid: { flexDirection: "row", gap: 12 },
  actionIconBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionIconText: { fontSize: 20 },

  feeGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
  feeBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  feeBoxLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  feeBoxVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1E293B",
    marginTop: 4,
  },
  balanceRibbon: {
    backgroundColor: "#F1F5F9",
    padding: 16,
    borderRadius: 20,
    borderLeftWidth: 6,
    borderLeftColor: "#EF4444",
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E3A8A",
    marginTop: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  addPaymentLink: { fontSize: 13, fontWeight: "700", color: "#d3e4cf" },
  viewAllLink: { fontSize: 12, fontWeight: "700", color: "#1E3A8A" },

  timelineItem: { flexDirection: "row", marginBottom: 16 },
  timelineLeft: { alignItems: "center", marginRight: 12 },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#1E3A8A",
    borderWidth: 3,
    borderColor: "#DBEAFE",
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#CBD5F5", marginTop: 4 },
  timelineModernCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineDate: { fontSize: 14, fontWeight: "800", color: "#1E3A8A" },
  delText: { fontSize: 11, color: "#EF4444", fontWeight: "700" },
  timelineStage: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginTop: 4,
  },
  timelineNotes: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    fontStyle: "italic",
  },
  viewFullButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
  },
  viewFullButtonText: { fontSize: 13, fontWeight: "800", color: "#1E3A8A" },

  cardSubtitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E3A8A",
    marginBottom: 8,
  },
  descriptionText: { fontSize: 14, color: "#475569", lineHeight: 22 },

  mainActionBtn: {
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  mainActionBtnText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1.2,
  },

  aiActionBtn: {
    backgroundColor: "#EEF2FF",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  aiActionText: {
    color: "#1E3A8A",
    fontSize: 15,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.8)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    minHeight: 220,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#1E293B" },
  modalSub: { color: "#64748B", marginTop: 4, marginBottom: 20 },
  modalActionRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
  },
  modalCancelText: { color: "#64748B", fontWeight: "700" },
  modalSave: {
    flex: 1,
    backgroundColor: "#1E3A8A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalSaveText: { color: "#FFF", fontWeight: "800" },
  emptyText: {
    color: "#94A3B8",
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
});
