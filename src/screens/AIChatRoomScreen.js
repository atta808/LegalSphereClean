import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  LayoutAnimation,
  UIManager,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Markdown from "react-native-markdown-display"; // ✅ Added Markdown support

// Services
import { askDeepSeek } from "../services/deepseekService";
import { extractDocumentText } from "../services/ai/documentReaders";
import {
  getCaseNotes,
  getCitationsByCaseId,
  getTimelineByCaseId,
  getDocumentsByCaseId,
  addCaseNote,
} from "../services/sqliteService";

// Components
import LegalInput from "../components/LegalInput";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME = {
  bg: "#FCFCFD",
  surface: "#FFFFFF",
  border: "#F3F4F6",
  userBubble: "#0F172A",
  aiBubble: "#FFFFFF",
  textUser: "#FFFFFF",
  textAI: "#111827",
  muted: "#6B7280",
  accent: "#2563EB",
};

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AIChatRoomScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [stats, setStats] = useState({ documents: 0, citations: 0, notes: 0 });

  const {
    caseId,
    caseTitle,
    caseNumber,
    clientName,
    courtName,
    litigationDomain,
    caseStatus,
    stage,
    representingSide,
  } = route?.params || {};

  const STORAGE_KEY = `@LexAI_v3_${caseId || "global"}`;

  // Initialize animations & data
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    loadMessages();
    loadCaseStats();
  }, []);

  // Save messages
  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(
        console.log,
      );
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        const greeting = `### Welcome to Lex AI\n\nI have securely loaded the file for **${caseTitle || "this matter"}**. I am ready to assist with:\n\n* **Drafting** structured pleadings\n* **Analyzing** evidence and vaults\n* **Formulating** cross-examination strategy\n\nHow shall we proceed, Counsel?`;
        setMessages([
          {
            id: generateId(),
            sender: "ai",
            text: greeting,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (e) {
      console.log("Load chat error", e);
    }
  };

  const loadCaseStats = () => {
    try {
      setStats({
        documents: getDocumentsByCaseId(caseId)?.length || 0,
        citations: getCitationsByCaseId(caseId)?.length || 0,
        notes: getCaseNotes(caseId)?.length || 0,
      });
    } catch (error) {
      console.log("Stats Error:", error);
    }
  };

  const handleAttachDocument = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: "*/*",
      });

      if (result.canceled) return;
      const asset = result.assets[0];

      setLoading(true);
      const extractedText = await extractDocumentText(asset);
      setLoading(false);

      if (!extractedText?.trim()) {
        Alert.alert(
          "Extraction Failed",
          "No readable text found in this document.",
        );
        return;
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAttachedFile({ name: asset.name, text: extractedText });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Failed to process the document.");
    }
  };

  const sendMessage = async (presetText = null) => {
    const text = presetText || inputText.trim();
    if (!text && !attachedFile) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    const userPrompt = text || "Please review the attached document.";
    const userMessage = {
      id: generateId(),
      sender: "user",
      text: userPrompt,
      timestamp: Date.now(),
      file: attachedFile ? { name: attachedFile.name } : null,
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setAttachedFile(null);
    setLoading(true);

    try {
      const context = {
        notes: getCaseNotes(caseId) || [],
        citations: getCitationsByCaseId(caseId) || [],
        timeline: getTimelineByCaseId(caseId) || [],
        documents: getDocumentsByCaseId(caseId) || [],
      };

      let fullPrompt = `
YOU ARE LEX AI, A HIGHLY ADVANCED LEGAL ASSISTANT.
Act strictly in the best interest of the ${representingSide || "client"}. 
Provide highly structured, professional, and precise legal analysis. ALWAYS use Markdown for formatting (bolding, lists, headings) to ensure high readability.

[CASE METADATA]
Title: ${caseTitle} | No: ${caseNumber} | Client: ${clientName} | Court: ${courtName}
Domain: ${litigationDomain} | Stage: ${stage} | Status: ${caseStatus}

[CASE CONTEXT]
Notes: ${context.notes.map((n) => n.text).join(" | ")}
Citations: ${context.citations.map((c) => c.citation).join(" | ")}
Timeline: ${context.timeline.map((t) => t.stage).join(" -> ")}
Documents Vault: ${context.documents.map((d) => d.name).join(", ")}
`;
      if (userMessage.file) {
        fullPrompt += `\n[ATTACHED DOCUMENT: ${userMessage.file.name}]\n${userMessage.file.text}\n`;
      }
      fullPrompt += `\n[COUNSEL REQUEST]\n${userPrompt}`;

      const aiReply = await askDeepSeek(fullPrompt);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          sender: "ai",
          text: aiReply,
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Network Error",
        "Lex AI failed to respond. Check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, text) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action === "copy") {
      await Clipboard.setStringAsync(text);
      Alert.alert("Copied", "Text copied to clipboard.");
    } else if (action === "save") {
      if (!caseId) {
        Alert.alert("Error", "No case context to save notes to.");
        return;
      }
      addCaseNote({ caseId, text, image: null });
      Alert.alert("Saved", "Insight saved to Case Notes.");
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === "user";
    return (
      <Animated.View
        style={[
          styles.messageWrapper,
          isUser ? styles.messageWrapperUser : styles.messageWrapperAI,
          { opacity: fadeAnim },
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Feather name="layers" size={12} color="#FFFFFF" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
          ]}
        >
          {item.file && (
            <View style={styles.attachmentPill}>
              <Feather
                name="file-text"
                size={12}
                color={isUser ? "#94A3B8" : "#64748B"}
              />
              <Text
                style={[
                  styles.attachmentPillText,
                  isUser && { color: "#CBD5E1" },
                ]}
                numberOfLines={1}
              >
                {item.file.name}
              </Text>
            </View>
          )}

          {/* Markdown Integration for AI / Regular Text for User */}
          {isUser ? (
            <Text style={styles.userText}>{item.text}</Text>
          ) : (
            <Markdown style={markdownStyles}>{item.text}</Markdown>
          )}

          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.timestamp,
                isUser && { color: "rgba(255,255,255,0.5)" },
              ]}
            >
              {formatTime(item.timestamp)}
            </Text>
            {!isUser && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => handleAction("copy", item.text)}
                  style={styles.actionIcon}
                >
                  <Feather name="copy" size={14} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction("save", item.text)}
                  style={styles.actionIcon}
                >
                  <Feather name="bookmark" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const quickReplies = [
    {
      icon: "file-text",
      label: "Summarize Case",
      action: "Provide a comprehensive executive summary of this case.",
    },
    {
      icon: "book-open",
      label: "Find Precedents",
      action:
        "Identify relevant Pakistani case law and precedents for this specific matter.",
    },
    {
      icon: "crosshair",
      label: "Draft Cross-Exam",
      action:
        "Draft strategic cross-examination questions based on the current evidence.",
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* FROSTED HEADER */}
        <BlurView
          intensity={90}
          tint="light"
          style={[styles.header, { paddingTop: insets.top }]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          >
            <Feather name="chevron-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Lex AI</Text>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Secure Workspace</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setMessages([])}
            style={styles.iconButton}
          >
            <Feather name="trash-2" size={18} color="#64748B" />
          </TouchableOpacity>
        </BlurView>

        {/* CHAT AREA */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListHeaderComponent={
            <View style={styles.contextBanner}>
              <Text style={styles.contextBannerText}>
                Injecting{" "}
                <Text style={{ fontWeight: "700" }}>
                  {stats.documents} Docs
                </Text>{" "}
                & <Text style={{ fontWeight: "700" }}>{stats.notes} Notes</Text>{" "}
                into AI context
              </Text>
            </View>
          }
          ListFooterComponent={
            loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Lex is analyzing...</Text>
              </View>
            )
          }
        />

        {/* QUICK REPLIES */}
        {messages.length < 3 && !loading && (
          <View style={styles.quickReplyContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickReplyScroll}
            >
              {quickReplies.map((qr, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.qrPill}
                  onPress={() => sendMessage(qr.action)}
                >
                  <Feather name={qr.icon} size={14} color="#2563EB" />
                  <Text style={styles.qrText}>{qr.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* FLOATING INPUT BAR */}
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {attachedFile && (
            <Animated.View style={styles.attachedFileToast}>
              <Feather name="paperclip" size={14} color="#0F172A" />
              <Text style={styles.attachedFileToastText} numberOfLines={1}>
                {attachedFile.name}
              </Text>
              <TouchableOpacity onPress={() => setAttachedFile(null)}>
                <Feather name="x-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </Animated.View>
          )}

          <View style={styles.floatingInputWrapper}>
            <TouchableOpacity
              onPress={handleAttachDocument}
              style={styles.attachBtn}
            >
              <Ionicons name="add-circle-outline" size={24} color="#64748B" />
            </TouchableOpacity>

            <LegalInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message Lex AI..."
              placeholderTextColor="#94A3B8"
              multiline
              style={styles.textInput}
            />

            <TouchableOpacity
              disabled={loading || (!inputText.trim() && !attachedFile)}
              onPress={() => sendMessage()}
              style={[
                styles.sendBtn,
                !inputText.trim() && !attachedFile && { opacity: 0.5 },
              ]}
            >
              <LinearGradient
                colors={["#2563EB", "#1D4ED8"]}
                style={styles.sendGradient}
              >
                <Feather name="arrow-up" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ------------------------------
// STYLES
// ------------------------------

// SaaS-Grade Custom Markdown Styles
const markdownStyles = StyleSheet.create({
  body: {
    color: THEME.textAI,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  heading1: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.userBubble,
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heading2: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.userBubble,
    marginTop: 10,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.userBubble,
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
  },
  strong: {
    fontWeight: "800",
    color: THEME.userBubble,
  },
  em: {
    fontStyle: "italic",
    color: THEME.muted,
  },
  bullet_list: {
    marginBottom: 10,
  },
  ordered_list: {
    marginBottom: 10,
  },
  list_item: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 6,
    lineHeight: 24,
  },
  code_inline: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    color: "#0F172A",
    overflow: "hidden",
  },
  code_block: {
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    color: "#E2E8F0",
  },
  fence: {
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  hr: {
    backgroundColor: THEME.border,
    height: 1,
    marginVertical: 12,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.accent,
    paddingLeft: 12,
    marginLeft: 0,
    marginVertical: 10,
    opacity: 0.9,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: "rgba(252, 252, 253, 0.8)",
    position: "absolute",
    top: 0,
    width: "100%",
    zIndex: 10,
  },
  iconButton: { padding: 8, borderRadius: 12, backgroundColor: "#F8FAFC" },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.userBubble,
    letterSpacing: -0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 4,
  },
  statusText: { fontSize: 10, fontWeight: "700", color: "#065F46" },

  chatScroll: { paddingHorizontal: 16, paddingTop: 100, paddingBottom: 24 },
  contextBanner: {
    alignSelf: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  contextBannerText: { fontSize: 11, color: "#64748B", fontWeight: "500" },

  messageWrapper: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-end",
  },
  messageWrapperUser: { justifyContent: "flex-end" },
  messageWrapperAI: { justifyContent: "flex-start" },

  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: THEME.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 4,
  },

  messageBubble: {
    maxWidth: "85%",
    padding: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  userBubble: { backgroundColor: THEME.userBubble, borderBottomRightRadius: 4 },
  aiBubble: {
    backgroundColor: THEME.aiBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  userText: { color: THEME.textUser, fontSize: 15, lineHeight: 24 },

  attachmentPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  attachmentPillText: {
    fontSize: 12,
    color: THEME.muted,
    marginLeft: 6,
    fontWeight: "600",
    maxWidth: 180,
  },

  messageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  timestamp: { fontSize: 10, color: THEME.muted, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 14 },
  actionIcon: { padding: 2 },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    alignSelf: "flex-start",
    marginLeft: 34,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#1E3A8A",
    fontWeight: "600",
  },

  quickReplyContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  quickReplyScroll: { gap: 10, paddingVertical: 4 },
  qrPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  qrText: {
    color: THEME.userBubble,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },

  inputContainer: {
    paddingHorizontal: 16,
    backgroundColor: THEME.bg,
    paddingTop: 8,
  },
  attachedFileToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  attachedFileToastText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.userBubble,
    flexShrink: 1,
    marginHorizontal: 8,
  },

  floatingInputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: THEME.surface,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  attachBtn: { padding: 10, marginBottom: 2 },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 15,
    color: THEME.textAI,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  sendBtn: { padding: 4 },
  sendGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
});
