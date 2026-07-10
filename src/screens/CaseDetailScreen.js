import React from "react";
import { useTheme } from "../theme/ThemeContext";
// CaseDetailScreen.js – Clean, Premium, Action-Ready

import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { updateCaseNotifications } from "../services/reminderScheduler";
import { formatMoney, getCurrency } from "../utils/currency";
import { toDisplay } from "../utils/date";
import { getCallLink, getSMSLink, getWhatsAppLink } from "../utils/phone";
import CitationsScreen from "./CitationsScreen";
import NotesScreen from "./NotesScreen";

export default function CaseDetailScreen({ profile }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
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

      if (!result || result.isDeleted === 1) {
        Alert.alert("Case Not Found", "This case may have been deleted.");
        navigation.replace("NotificationCenter");
        return;
      }

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
        <ActivityIndicator size="large" color={colors.primaryDark} />
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
    healthScore >= 75 ? "#22C55E" : healthScore >= 45 ? "#F59E0B" : colors.danger;
  const healthLabel =
    healthScore >= 75
      ? "LOW RISK"
      : healthScore >= 45
        ? "MODERATE RISK"
        : "HIGH RISK";

  const recentHearings = hearings.slice(0, 2);

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* HEADER */}
      <View style={[styles.newHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.newHeaderRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={styles.newBackButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.surface} />
          </TouchableOpacity>

          <View style={styles.newHeaderCenter}>
            <Text style={styles.newHeaderTitle}>Case Details</Text>
            {caseData?.caseNo && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Clipboard.setString(String(caseData.caseNo));
                  Alert.alert("Copied", "Case No copied");
                }}
              >
                <Text style={styles.newHeaderSubtitle}>#{caseData.caseNo}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.newAiCopyBtn}
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
            <Ionicons name="sparkles-outline" size={20} color={colors.surface} />
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
                      backgroundColor: colors.surface,
                    },
                    caseData.priority === "important" && {
                      backgroundColor: colors.surface,
                    },
                    caseData.priority === "normal" && {
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      caseData.priority === "urgent" && { color: colors.danger },
                      caseData.priority === "important" && { color: colors.text },
                      caseData.priority === "normal" && { color: colors.primary },
                    ]}
                  >
                    {caseData.priority?.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.caseCourt}>
                <Ionicons name="business" size={12} color={colors.secondaryText} style={{ marginRight: 4 }} /> {caseData.court}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />

          <Row styles={styles} colors={colors} label="Current Stage" value={caseData.stage} />
          <Row styles={styles} colors={colors} label="Proceeding" value={caseData.description} />
          <Row styles={styles} colors={colors}
            label="Next Hearing"
            value={toDisplay(caseData.nextHearingISO, locale)}
            highlight
          />
          <View style={styles.statusRow}>
            <Text style={styles.rowLabel}>File Status</Text>
            <View
              style={[
                styles.statusTag,
                isArchived
                  ? { backgroundColor: colors.surface }
                  : { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.statusTagText,
                  isArchived ? { color: colors.danger } : { color: colors.text },
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
          {!!caseData?.judge && <Row styles={styles} colors={colors} label="Judge" value={caseData.judge} />}
          {!!caseData?.caseType && (
            <Row styles={styles} colors={colors} label="Case Type" value={caseData.caseType} />
          )}
          {!!caseData?.litigationDomain && (
            <Row styles={styles} colors={colors} label="Litigation Domain" value={caseData.litigationDomain} />
          )}
          {!!caseData?.representingSide && (
            <Row styles={styles} colors={colors} label="Representing Side" value={caseData.representingSide} />
          )}
          {!!caseData?.opposingCounsel && (
            <Row styles={styles} colors={colors} label="Opposing Counsel" value={caseData.opposingCounsel} />
          )}
          {!!caseData?.opponent && (
            <Row styles={styles} colors={colors} label="Opponent" value={caseData.opponent} />
          )}
          {!!caseData?.firNo && <Row styles={styles} colors={colors} label="FIR No" value={caseData.firNo} />}
          {!!caseData?.firDate && (
            <Row styles={styles} colors={colors} label="FIR Date" value={caseData.firDate} />
          )}
        </View>

        {/* ========================== */}
        {/* NEW ACTION BUTTONS (3 ROWS) */}
        {/* ========================== */}
        <View style={styles.actionSection}>
          {/* Row 1: Add Hearing (full width) */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.actionBtnFull]}
              onPress={() =>
                navigation.navigate("UpdateCaseHearing", {
                  caseId: caseData.id,
                  caseData,
                  mode: "edit",
                })
              }
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.actionBtnLabel}>Add Hearing</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: AI Room | Lex AI | Timeline */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() => {
                if (aiChatLink) {
                  Linking.openURL(aiChatLink);
                } else {
                  setAiLinkModalVisible(true);
                }
              }}
            >
              <Ionicons name="sparkles-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.actionBtnLabel}>AI Room</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() =>
                navigation.navigate("AIChatRoom", {
                  caseId: caseData?.id,
                })
              }
            >
              <Ionicons name="flash-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.actionBtnLabel}>Lex AI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate("Timeline", { caseId: caseData.id });
              }}
            >
              <Ionicons name="time-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.actionBtnLabel}>Timeline</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3: Documents | Notes | Citations */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() =>
                navigation.navigate("DocumentVault", {
                  caseId: caseData.id,
                  caseTitle: caseData.title,
                })
              }
            >
              <Ionicons name="folder-open-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.actionBtnLabel}>Documents</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() => setShowNotesScreen(true)}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={colors.primaryDark}
              />
              <Text style={styles.actionBtnLabel}>Notes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.actionBtnThird]}
              onPress={() => setShowCitationsScreen(true)}
            >
              <MaterialCommunityIcons
                name="scale-balance"
                size={18}
                color={colors.primaryDark}
              />
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
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.actionBtn}
              onPress={handleCallClient}
            >
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={styles.actionBtnLabel}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.actionBtn, styles.waBtn]}
              onPress={handleWhatsAppClient}
            >
              <Ionicons name="logo-whatsapp" size={16} color={colors.success} />
              <Text style={[styles.actionBtnLabel, styles.waText]}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.actionBtn}
              onPress={handleSendReminder}
            >
              <Ionicons
                name="notifications-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.actionBtnLabel}>Remind</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FINANCIAL SUMMARY */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setPaymentModalVisible(true)}
          >
            <Text style={styles.addPaymentLink}>+ Add Payment</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.feeGrid}>
            <FeeBox styles={styles}
              label="Decided"
              val={formatMoney(caseData.feeDecided, currency, locale)}
            />
            <FeeBox styles={styles}
              label="Paid"
              val={formatMoney(caseData.feePaid, currency, locale)}
              color={colors.success}
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
              activeOpacity={0.7}
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
                      activeOpacity={0.7}
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
              activeOpacity={0.7}
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
              activeOpacity={0.7}
              style={[styles.mainActionBtn, { backgroundColor: colors.success }]}
              onPress={handleRestore}
            >
              <Text style={styles.mainActionBtnText}>
                RESTORE TO ACTIVE DIARY
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.mainActionBtn, { backgroundColor: colors.danger }]}
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
              activeOpacity={0.7}
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
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={colors.primaryDark}
                />
                <Text style={styles.aiActionText}>Summarize Case</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.aiActionBtn}
              onPress={() => {
                Alert.alert("Coming Next", "Prepare Arguments AI");
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <MaterialCommunityIcons
                  name="scale-balance"
                  size={16}
                  color={colors.primaryDark}
                />
                <Text style={styles.aiActionText}>Prepare Arguments</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.aiActionBtn}
              onPress={() => {
                Alert.alert("Coming Next", "Cross Examination AI");
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={16}
                  color={colors.primaryDark}
                />
                <Text style={styles.aiActionText}>Cross Examination</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.aiActionBtn}
              onPress={() => {
                Alert.alert("Coming Next", "Next Hearing Strategy AI");
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.aiActionText}>Next Hearing Strategy</Text>
              </View>
            </TouchableOpacity>

            {generatedSummary ? (
              <View
                style={{
                  backgroundColor: colors.background,
                  padding: 14,
                  borderRadius: 14,
                  marginBottom: 12,
                  maxHeight: 220,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <ScrollView>
                  <Text
                    style={{
                      color: colors.text,
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
                  activeOpacity={0.7}
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
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons name="save-outline" size={16} color={colors.primaryDark} />
                    <Text style={styles.aiActionText}>
                      Save Summary To Notes
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.aiActionBtn}
                  onPress={async () => {
                    await Clipboard.setStringAsync(generatedSummary);
                    Alert.alert("Copied", "Summary copied.");
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color={colors.primaryDark} />
                    <Text style={styles.aiActionText}>Copy Summary</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.7}
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
            <LegalInput
              label="AI Litigation Room"
              value={aiChatLink}
              onChangeText={setAiChatLink}
              placeholder="https://chatgpt.com/..."
              style={{ marginBottom: 40 }}
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.modalCancel}
                onPress={() => setAiLinkModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
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
              style={{ marginBottom: 20 }}
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.modalCancel}
                onPress={() => {
                  setPaymentModalVisible(false);
                  setPaymentAmount("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.modalSave}
                onPress={handleAddPayment}
              >
                <Text style={styles.modalSaveText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ======================== HELPERS ========================
const Row = ({ label, value, highlight, styles, colors }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text
      style={[
        styles.rowValue,
        highlight && { color: colors.primary, fontWeight: "900" },
      ]}
    >
      {value || "-"}
    </Text>
  </View>
);

const ActionIconButton = ({ color, icon, onPress, styles }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    style={[styles.actionIconBtn, { backgroundColor: color }]}
    onPress={onPress}
  >
    {icon}
  </TouchableOpacity>
);

const FeeBox = ({ label, val, color, styles, colors }) => (
  <View style={styles.feeBox}>
    <Text style={styles.feeBoxLabel}>{label}</Text>
    <Text style={[styles.feeBoxVal, color && { color }]}>{val}</Text>
  </View>
);

// ======================== STYLES ========================
const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  newHeader: {
    backgroundColor: colors.primary,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },
  newHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  newBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  newHeaderCenter: {
    flex: 1,
    alignItems: "center",
  },
  newHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.surface,
    letterSpacing: 0.5,
  },
  newHeaderSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    fontWeight: "500",
  },
  newAiCopyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    } : {
      elevation: 0,
    }),
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
  caseTitle: { fontSize: 18, fontWeight: "700", color: colors.text, flex: 1 },
  caseCourt: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 4,
    fontWeight: "500",
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
    overflow: "hidden",
  },
  priorityText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8 },
  rowLabel: { width: "42%", fontSize: 13, color: colors.secondaryText, fontWeight: "500" },
  rowValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
    textAlign: "right",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  statusTagText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },

  // ==================== NEW ACTION BUTTONS ====================
  actionSection: {
    marginBottom: 16,
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 15,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor:
      resolvedTheme === "dark"
        ? colors.border
        : "transparent",
  },
  actionBtnFull: {
    flex: 1,
  },
  actionBtnThird: {
    flex: 1,
  },
  actionBtnLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 6,
    color: colors.primary,
  },
  waBtn: {
    backgroundColor:
      resolvedTheme === "dark"
        ? "rgba(16,185,129,0.15)"
        : "rgba(5,150,105,0.10)",
    borderWidth: 1,
    borderColor:
      resolvedTheme === "dark"
        ? "rgba(16,185,129,0.30)"
        : "transparent",
  },
  waText: {
    color: colors.success,
  },
  dangerBtn: {
    backgroundColor:
      resolvedTheme === "dark"
        ? "rgba(239,68,68,0.15)"
        : "rgba(220,38,38,0.10)",
    borderWidth: 1,
    borderColor:
      resolvedTheme === "dark"
        ? "rgba(239,68,68,0.30)"
        : "transparent",
  },
  dangerText: {
    color: colors.danger,
  },

  aiInsightsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    } : {
      elevation: 0,
    }),
  },
  aiInsightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  aiInsightsTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  aiInsightsBadge: {
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "600",
    fontSize: 10,
    letterSpacing: 0.5,
    overflow: "hidden",
  },
  aiInsightItem: {
    color: colors.secondaryText,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: "500",
    lineHeight: 20,
  },

  healthCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    } : {
      elevation: 0,
    }),
  },
  healthTitle: { fontSize: 18, fontWeight: "900", color: colors.text },
  healthCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
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
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: colors.primary, fontSize: 20, fontWeight: "700" },
  clientNameText: { fontSize: 18, fontWeight: "700", color: colors.text },
  clientSubText: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: "500",
    marginTop: 4,
  },
  actionGrid: { flexDirection: "row", gap: 12 },
  actionIconBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  feeGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
  feeBox: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feeBoxLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.placeholder,
    textTransform: "uppercase",
  },
  feeBoxVal: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
    marginTop: 4,
  },
  balanceRibbon: {
    backgroundColor: colors.border,
    padding: 16,
    borderRadius: 20,
    borderLeftWidth: 6,
    borderLeftColor: colors.danger,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.secondaryText,
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondaryText,
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },
  addPaymentLink: { fontSize: 13, fontWeight: "600", color: colors.primary },
  viewAllLink: { fontSize: 12, fontWeight: "600", color: colors.primary },

  timelineItem: { flexDirection: "row", marginBottom: 16 },
  timelineLeft: { alignItems: "center", marginRight: 16 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  timelineLine: { width: 1, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  timelineModernCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    } : {
      elevation: 0,
    }),
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineDate: { fontSize: 14, fontWeight: "600", color: colors.text },
  delText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: "600",
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  timelineStage: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.secondaryText,
    marginTop: 6,
  },
  timelineNotes: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 6,
    lineHeight: 20,
  },
  viewFullButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  viewFullButtonText: { fontSize: 13, fontWeight: "600", color: colors.primary },

  cardSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  descriptionText: { fontSize: 14, color: colors.secondaryText, lineHeight: 22 },

  mainActionBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    } : {
      elevation: 0,
    }),
  },
  mainActionBtnText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },

  aiActionBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    } : {
      elevation: 0,
    }),
  },
  aiActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    minHeight: 220,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalSub: {
    color: colors.secondaryText,
    marginTop: 4,
    marginBottom: 20,
    fontSize: 13,
    fontWeight: "500",
  },
  modalActionRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.border,
    borderRadius: 12,
  },
  modalCancelText: { color: colors.secondaryText, fontWeight: "600" },
  modalSave: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalSaveText: { color: colors.surface, fontWeight: "600" },
  emptyText: {
    color: colors.placeholder,
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
});
