// screens/AIChatRoomScreen.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../theme/ThemeContext";
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
import { BlurView } from "expo-blur";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Markdown from "react-native-markdown-display";

// Services
import { addCaseNote } from "../services/sqliteService";

// Components
import { LegalSphereEngine } from "../services/ai/core/LegalSphereEngine";
import { AIEvents } from "../services/ai/core/AIEvents";
import { CaseAIRequest } from "../services/ai/core/models/Requests";
import { FileIngestionService } from "../services/ai/document/FileIngestionService";

import LegalInput from "../components/LegalInput";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Sleek typing animation component matching Lex Workspace
const TypingIndicator = ({ styles, colors }) => {
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    const animateDots = () => {
      Animated.sequence([
        Animated.stagger(150, [
          Animated.timing(dot1, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.stagger(150, [
          Animated.timing(dot1, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animateDots());
    };
    animateDots();
  }, []);

  const dotStyle = (anim) => ({
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginHorizontal: 3,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
};

const getThemeConfig = (colors) => ({
  bg: colors.background,
  surface: colors.surface,
  border: colors.border,
  userBubble: colors.primary,
  aiBubble: colors.surface,
  textUser: "#FFFFFF",
  textAI: colors.text,
  muted: colors.placeholder,
  accent: colors.primary,
});

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function AIChatRoomScreen({ route, navigation }) {
  const { colors, resolvedTheme } = useTheme();
  const themeConfig = React.useMemo(() => getThemeConfig(colors), [colors]);
  const markdownStyles = React.useMemo(
    () => getMarkdownStyles(themeConfig, colors),
    [themeConfig, colors],
  );
  const styles = React.useMemo(
    () => createStyles(colors, resolvedTheme, themeConfig),
    [colors, resolvedTheme, themeConfig],
  );
  const insets = useSafeAreaInsets();

  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const sendButtonScale = useRef(new Animated.Value(0.9)).current;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [stats, setStats] = useState({ documents: 0, citations: 0, notes: 0 });
  const [copyFeedback, setCopyFeedback] = useState(null);

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

  const hasCaseContext =
    caseId !== null && caseId !== undefined && String(caseId).trim() !== "";
  const STORAGE_KEY = hasCaseContext ? `@LexAI_v3_${caseId}` : null;

  // Derive active state for send button animation
  const isReadyToSend =
    (inputText.trim().length > 0 || !!attachedFile) && !loading;

  useEffect(() => {
    Animated.spring(sendButtonScale, {
      toValue: isReadyToSend ? 1 : 0.9,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [isReadyToSend, sendButtonScale]);

  // Initialize animations & data
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    if (hasCaseContext) loadMessages();
    loadCaseStats();
  }, []);

  // Save messages
  useEffect(() => {
    if (STORAGE_KEY && messages.length > 0) {
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
        const greeting = `Welcome to Lex AI\n\nI have securely loaded the file for **${caseTitle || "this matter"}**. I am ready to assist with:\n\n* **Drafting** structured pleadings\n* **Analyzing** evidence and vaults\n* **Formulating** cross-examination strategy\n\nHow shall we proceed, Counsel?`;
        setMessages([
          {
            id: generateId(),
            sender: "ai",
            text: greeting,
            timestamp: Date.now(),
            isWelcome: true,
          },
        ]);
      }
    } catch (e) {
      console.log("Load chat error", e);
    }
  };

  const loadCaseStats = () => {
    /* Managed by engine */
  };

  // Listen for AI progress events
  useEffect(() => {
    const unsubscribe = AIEvents.subscribe((event) => {
      if (event.type === "OCR_STARTED") {
        setLoadingMessage("Analyzing document...");
      } else if (event.type === "AI_REQUEST_STARTED") {
        setLoadingMessage("Thinking...");
      } else if (event.type === "ANALYSIS_COMPLETED") {
        setLoadingMessage("Synthesizing findings...");
      } else if (event.type === "REQUEST_STARTED") {
        setLoadingMessage("Processing...");
      }
    });

    return () => unsubscribe();
  }, []);

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

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAttachedFile(FileIngestionService.fromPickerAsset(asset));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Error", "Failed to process the document.");
    }
  };

  const sendMessage = async (presetText = null) => {
    if (!hasCaseContext) {
      Alert.alert(
        "Case Required",
        "Open AI ChatRoom from a case before starting a conversation.",
      );
      return;
    }

    const text = presetText || inputText.trim();
    if (!text && !attachedFile) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userPrompt = text || "Please review the attached document.";
    const userMessage = {
      id: generateId(),
      sender: "user",
      role: "user",
      text: userPrompt,
      timestamp: Date.now(),
      file: attachedFile,
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText("");
    setAttachedFile(null); // Clear attachment immediately visually
    scrollToBottom();

    // Convert to AI core history format
    const coreHistory = newHistory.map((m) => ({
      id: m.id,
      role: m.sender === "user" ? "user" : "ai",
      text: m.text,
      timestamp: m.timestamp,
      attachment: m.file,
    }));

    setLoading(true);
    setLoadingMessage("Processing...");

    try {
      const request = new CaseAIRequest({
        caseId: caseId,
        message: userPrompt,
        history: coreHistory,
        attachment: userMessage.file, // Pass the captured file
        sessionId: caseId,
        timestamp: Date.now(),
      });

      const response = await LegalSphereEngine.processAIChatRoom(request);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          sender: "ai",
          role: "ai",
          text: response.userFacing,
          timestamp: Date.now(),
        },
      ]);
      scrollToBottom();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "AI Analysis Error",
        error.userMessage || "Lex AI encountered an issue.",
      );
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const clearChatHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Clear Secure Workspace",
      "This will permanently delete all AI conversation history for this specific case context.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            if (STORAGE_KEY) {
              await AsyncStorage.removeItem(STORAGE_KEY);
            }
            const defaultMsg = [
              {
                id: generateId(),
                sender: "ai",
                text: `Welcome to Lex AI\n\nI have securely loaded the file for **${caseTitle || "this matter"}**. I am ready to assist with:\n\n* **Drafting** structured pleadings\n* **Analyzing** evidence and vaults\n* **Formulating** cross-examination strategy\n\nHow shall we proceed, Counsel?`,
                timestamp: Date.now(),
                isWelcome: true,
              },
            ];
            setMessages(defaultMsg);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleAction = async (action, text, messageId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action === "copy") {
      await Clipboard.setStringAsync(text);
      setCopyFeedback(messageId);
      setTimeout(() => setCopyFeedback(null), 2000);
    } else if (action === "save") {
      if (!caseId) {
        Alert.alert("Error", "No case context to save notes to.");
        return;
      }
      addCaseNote({ caseId, text, image: null });
      Alert.alert("Saved", "Insight saved to Case Notes.");
    }
  };

  const renderMessage = useCallback(
    ({ item }) => {
      const isUser = item.role === "user" || item.sender === "user";
      const isWelcome = item.isWelcome;
      const isCopied = copyFeedback === item.id;

      return (
        <Animated.View
          style={[
            styles.messageContainer,
            isUser ? styles.userAlign : styles.aiAlign,
            isWelcome && styles.welcomeAlign,
            {
              opacity: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0.95],
                extrapolate: "clamp",
              }),
            },
          ]}
        >
          {!isUser && !isWelcome && (
            <View style={styles.avatarContainer}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
              </View>
            </View>
          )}

          <View
            style={[
              styles.bubbleWrapper,
              isUser && styles.userBubbleWrapper,
              isWelcome && styles.welcomeBubbleWrapper,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.aiBubble,
                isWelcome && styles.welcomeBubble,
              ]}
            >
              {isWelcome && (
                <View style={styles.welcomeHeader}>
                  <View style={styles.welcomeIconContainer}>
                    <Ionicons
                      name="sparkles"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.welcomeTitle}>Lex AI</Text>
                </View>
              )}

              {item.file && (
                <View style={styles.attachmentPill}>
                  <Feather
                    name="file-text"
                    size={14}
                    color={isUser ? "#FFFFFF" : colors.primary}
                  />
                  <Text
                    style={[
                      styles.attachmentPillText,
                      isUser && { color: "#FFFFFF" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.file.name}
                  </Text>
                </View>
              )}

              {isUser ? (
                <Text style={styles.userText}>{item.text}</Text>
              ) : (
                <Markdown
                  style={{
                    ...markdownStyles,
                    body: {
                      ...markdownStyles.body,
                      color: isWelcome ? colors.text : colors.text,
                    },
                  }}
                >
                  {item.text}
                </Markdown>
              )}
            </View>

            <View
              style={[
                styles.messageFooter,
                isUser && styles.messageFooterUser,
                isWelcome && styles.welcomeFooter,
              ]}
            >
              <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>

              {!isUser && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => handleAction("copy", item.text, item.id)}
                    style={styles.actionButton}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={isCopied ? "check" : "copy"}
                      size={14}
                      color={isCopied ? colors.success : colors.placeholder}
                    />
                    <Text
                      style={[
                        styles.actionText,
                        isCopied && { color: colors.success },
                      ]}
                    >
                      {isCopied ? "Copied" : "Copy"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => handleAction("save", item.text, item.id)}
                    style={styles.actionButton}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="bookmark"
                      size={14}
                      color={colors.placeholder}
                    />
                    <Text style={styles.actionText}>Save Note</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      );
    },
    [copyFeedback, scrollY, colors, markdownStyles],
  );

  const quickReplies = [
    {
      icon: "file-document-outline",
      label: "Summarize Case",
      action: "Provide a comprehensive executive summary of this case.",
    },
    {
      icon: "scale-balance",
      label: "Find Precedents",
      action:
        "Identify relevant Pakistani case law and precedents for this specific matter.",
    },
    {
      icon: "crosshairs",
      label: "Draft Cross-Exam",
      action:
        "Draft strategic cross-examination questions based on the current evidence.",
    },
  ];

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* COMPACT AI HEADER WITH DELETE BUTTON */}
      <View style={styles.compactHeader}>
        <View style={styles.compactHeaderLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.compactHeaderIconBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.compactHeaderTitleContainer}>
            <Text style={styles.compactHeaderTitle} numberOfLines={1}>
              {caseTitle || "Lex Workspace"}
            </Text>
            <View style={styles.compactHeaderSubtitleRow}>
              <View style={styles.statusDot} />
              <Text style={styles.compactHeaderSubtitle}>
                Secure Context Active
              </Text>
            </View>
          </View>
        </View>

        {/* Delete Chat Button matching LexAiScreen */}
        <TouchableOpacity
          onPress={clearChatHistory}
          style={styles.compactHeaderIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={colors.secondaryText}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* CHAT AREA */}
        <AnimatedFlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollWindow}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          automaticallyAdjustKeyboardInsets={true}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          ListHeaderComponent={
            <View style={styles.contextBanner}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={colors.success}
                style={{ marginRight: 6 }}
              />
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
        />

        {/* QUICK REPLIES */}
        {messages.length < 3 && !loading && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionHeader}>SUGGESTED ACTIONS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsGrid}
            >
              {quickReplies.map((qr, idx) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={idx}
                  style={styles.quickActionItem}
                  onPress={() => sendMessage(qr.action)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={qr.icon}
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.quickActionLabel}>{qr.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* INLINE TYPING INDICATOR */}
        {loading && (
          <View style={styles.typingWrapper}>
            <View style={styles.avatarContainerTyping}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
              </View>
            </View>
            <View style={styles.typingBubble}>
              <TypingIndicator styles={styles} colors={colors} />
            </View>
          </View>
        )}

        {/* FLOATING INPUT BAR */}
        <View
          style={[
            styles.bottomInputWrapper,
            {
              paddingBottom:
                Platform.OS === "ios" ? Math.max(insets.bottom, 12) : 16,
            },
          ]}
        >
          <View style={styles.inputGlass}>
            {attachedFile && (
              <View style={styles.selectedFileChip}>
                <Ionicons
                  name="document-text"
                  size={16}
                  color={colors.surface}
                />
                <Text style={styles.selectedFileName} numberOfLines={1}>
                  {attachedFile.name}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setAttachedFile(null)}
                  style={styles.clearFileBtn}
                >
                  <Ionicons name="close" size={16} color={colors.surface} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputInner}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleAttachDocument}
                style={styles.attachButton}
                disabled={loading}
              >
                <Ionicons name="add" size={28} color={colors.secondaryText} />
              </TouchableOpacity>

              <LegalInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask Lex anything..."
                placeholderTextColor={colors.placeholder}
                multiline
                style={styles.textInputModifier}
                returnKeyType="default"
              />

              <Animated.View
                style={{ transform: [{ scale: sendButtonScale }] }}
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={!isReadyToSend}
                  onPress={() => sendMessage()}
                  style={[
                    styles.sendButton,
                    isReadyToSend ? styles.sendActive : styles.sendDisabled,
                  ]}
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={isReadyToSend ? "#FFFFFF" : colors.placeholder}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* OVERLAY LOADING EXPERIENCE (For heavier case operations) */}
      {loading && loadingMessage.includes("Synthesizing") && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <BlurView
            intensity={30}
            tint={resolvedTheme === "dark" ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ------------------------------
// STYLES
// ------------------------------

const getMarkdownStyles = (themeConfig, colors) =>
  StyleSheet.create({
    body: {
      color: themeConfig.textAI,
      fontSize: 16,
      lineHeight: 24,
      fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    },
    heading1: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    heading2: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginTop: 14,
      marginBottom: 6,
    },
    heading3: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginTop: 12,
      marginBottom: 4,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 12,
    },
    strong: {
      fontWeight: "700",
      color: colors.text,
    },
    em: {
      fontStyle: "italic",
      color: colors.secondaryText,
    },
    bullet_list: {
      marginBottom: 12,
    },
    ordered_list: {
      marginBottom: 12,
    },
    list_item: {
      flexDirection: "row",
      justifyContent: "flex-start",
      marginBottom: 8,
      lineHeight: 24,
    },
    code_inline: {
      backgroundColor: colors.border,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      fontSize: 14,
      color: colors.text,
      overflow: "hidden",
    },
    code_block: {
      backgroundColor: colors.border,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      fontSize: 13,
      color: colors.text,
    },
    fence: {
      backgroundColor: colors.border,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: 16,
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      paddingLeft: 16,
      marginLeft: 0,
      marginVertical: 12,
      opacity: 0.9,
      backgroundColor: "rgba(26, 115, 232, 0.05)",
      paddingVertical: 8,
      borderRadius: 4,
    },
  });

const createStyles = (colors, resolvedTheme, themeConfig) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Compact Standardized AI Header
    compactHeader: {
      flexDirection: "row",
      height: 60,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      backgroundColor:
        resolvedTheme === "dark" ? colors.surface : colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      zIndex: 10,
    },
    compactHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    compactHeaderIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    compactHeaderTitleContainer: {
      justifyContent: "center",
      maxWidth: "80%",
    },
    compactHeaderTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.4,
    },
    compactHeaderSubtitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 2,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
      borderWidth: 1,
      borderColor: colors.background,
    },
    compactHeaderSubtitle: {
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: "500",
    },

    // Message List Styling
    scrollWindow: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
      gap: 20,
      flexGrow: 1,
    },

    contextBanner: {
      flexDirection: "row",
      alignSelf: "center",
      alignItems: "center",
      backgroundColor: resolvedTheme === "dark" ? colors.surface : "#F0F4F8",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contextBannerText: {
      fontSize: 12,
      color: colors.secondaryText,
      fontWeight: "500",
    },

    messageContainer: {
      flexDirection: "row",
      width: "100%",
      marginBottom: 8,
    },
    userAlign: {
      justifyContent: "flex-end",
    },
    aiAlign: {
      justifyContent: "flex-start",
    },
    welcomeAlign: {
      justifyContent: "center",
      marginTop: 10,
      marginBottom: 20,
    },
    avatarContainer: {
      marginRight: 12,
      alignSelf: "flex-end",
      marginBottom: 24,
    },
    avatarContainerTyping: {
      marginRight: 12,
      alignSelf: "center",
    },
    aiAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: resolvedTheme === "dark" ? "#2A2A2A" : "#F0F4F8",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    bubbleWrapper: {
      maxWidth: "85%",
    },
    userBubbleWrapper: {
      maxWidth: "80%",
    },
    welcomeBubbleWrapper: {
      maxWidth: "95%",
      width: "100%",
    },
    messageBubble: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 24,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 6,
    },
    aiBubble: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      ...(resolvedTheme === "light"
        ? {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }
        : {
            elevation: 0,
          }),
    },
    welcomeBubble: {
      backgroundColor: resolvedTheme === "dark" ? colors.surface : "#F8FAFC",
      borderRadius: 24,
      borderBottomLeftRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
    },
    welcomeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    welcomeIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: resolvedTheme === "dark" ? "#2A2A2A" : "#E2E8F0",
      alignItems: "center",
      justifyContent: "center",
    },
    welcomeTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.5,
    },
    userText: {
      color: "#FFFFFF",
      fontSize: 16,
      lineHeight: 24,
    },

    attachmentPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.1)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      marginBottom: 12,
      alignSelf: "flex-start",
    },
    attachmentPillText: {
      fontSize: 13,
      color: colors.primary,
      marginLeft: 8,
      fontWeight: "600",
      maxWidth: 200,
    },

    messageFooter: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      paddingHorizontal: 6,
      gap: 16,
    },
    messageFooterUser: {
      justifyContent: "flex-end",
    },
    welcomeFooter: {
      justifyContent: "flex-start",
      marginTop: 12,
    },
    timestamp: {
      fontSize: 12,
      color: colors.placeholder,
      fontWeight: "500",
    },
    actionRow: {
      flexDirection: "row",
      gap: 16,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    actionText: {
      fontSize: 12,
      color: colors.placeholder,
      fontWeight: "600",
    },

    // Quick Actions
    quickActionsContainer: {
      paddingBottom: 24,
      paddingTop: 12,
      paddingHorizontal: 16,
    },
    quickActionHeader: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.placeholder,
      marginBottom: 12,
      letterSpacing: 0.5,
    },
    quickActionsGrid: {
      flexDirection: "row",
      gap: 10,
      paddingRight: 32, // Allow scrolling bleed
    },
    quickActionItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      ...(resolvedTheme === "light"
        ? {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
          }
        : {
            elevation: 0,
          }),
    },
    quickActionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },

    // Typing Indicator
    typingWrapper: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingBottom: 16,
      alignItems: "flex-end",
    },
    typingBubble: {
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 24,
      borderBottomLeftRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 10,
    },

    // Bottom Input
    bottomInputWrapper: {
      paddingHorizontal: 16,
      paddingTop: 8,
      backgroundColor: colors.background,
      borderTopWidth: 0,
    },
    inputGlass: {
      borderRadius: 28,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...(resolvedTheme === "light"
        ? {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
          }
        : {
            elevation: 0,
          }),
    },
    inputInner: {
      flexDirection: "row",
      alignItems: "flex-end", // Anchors buttons to the bottom as text wraps
      paddingHorizontal: 6,
      paddingVertical: 6,
    },
    attachButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      marginRight: 4,
    },
    textInputModifier: {
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
      maxHeight: 120,
      minHeight: 44,
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 8,
    },

    // Refined Send Button
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 4,
    },
    sendActive: {
      backgroundColor: colors.primary, // Resolves visibility issues
      ...(resolvedTheme === "light"
        ? {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }
        : {
            elevation: 0,
          }),
    },
    sendDisabled: {
      backgroundColor: colors.border,
      opacity: 0.6,
    },

    // Document Chip (Match Lex Workspace)
    selectedFileChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      marginHorizontal: 12,
      marginTop: 12,
      gap: 8,
      alignSelf: "flex-start",
    },
    selectedFileName: {
      fontSize: 13,
      color: "#FFFFFF",
      fontWeight: "600",
      maxWidth: 200,
    },
    clearFileBtn: {
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 10,
      padding: 2,
    },

    // Loading Overlay
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 999,
    },
    loadingPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 32,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...(resolvedTheme === "light"
        ? {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 8,
          }
        : {
            elevation: 0,
          }),
    },
    loadingText: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "600",
    },
  });
