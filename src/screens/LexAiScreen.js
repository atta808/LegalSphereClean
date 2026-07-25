// screens/LexAiScreen.js
import React, { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "../theme/ThemeContext";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
  Animated,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";

import Markdown from "react-native-markdown-display";

import LegalInput from "../components/LegalInput";
import { LegalSphereEngine } from "../services/ai/core/LegalSphereEngine";
import { AIEvents } from "../services/ai/core/AIEvents";
import { LexAIRequest } from "../services/ai/core/models/Requests";
import { FileIngestionService } from "../services/ai/document/FileIngestionService";

// Sleek typing animation component
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

const QUICK_ACTIONS = [
  {
    icon: "scale-balance",
    label: "Case Law",
    prompt: "Find relevant case law about",
  },
  {
    icon: "file-document",
    label: "Review Doc",
    prompt: "Review this legal document:",
  },
  {
    icon: "gavel",
    label: "Precedents",
    prompt: "Research legal precedent for",
  },
  {
    icon: "clock-time",
    label: "Limitations",
    prompt: "What's the statute of limitations for",
  },
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function LexAiScreen() {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(
    () => createStyles(colors, resolvedTheme),
    [colors, resolvedTheme],
  );
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { caseId } = route.params || {};

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Animation value for send button
  const sendButtonScale = useRef(new Animated.Value(0.9)).current;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Derive active state for the send button to trigger animations
  const isReadyToSend = input.trim().length > 0 && !loading && !isAttaching;

  useEffect(() => {
    Animated.spring(sendButtonScale, {
      toValue: isReadyToSend ? 1 : 0.9,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [isReadyToSend, sendButtonScale]);

  useEffect(() => {
    loadMessages();
    StatusBar.setBarStyle("dark-content");

    const unsubscribeEvents = AIEvents.subscribe((event) => {
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

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(scrollToBottom, 200);
      },
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      unsubscribeEvents();
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const loadMessages = async () => {
    try {
      const storageKey = caseId
        ? `chat_history_${caseId}`
        : "chat_history_global";
      const cached = await AsyncStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setMessages(parsed);
        if (parsed.length > 1) setShowQuickActions(false);
      } else {
        setMessages([
          {
            id: "welcome",
            role: "ai",
            text: "Welcome to your AI Workspace. I am Lex, your intelligent legal assistant.\n\nI operate in English by default for optimal legal precision, but feel free to ask questions in Urdu or any other language if you prefer.",
            timestamp: Date.now(),
            isWelcome: true, // Tag added for specific UI rendering
          },
        ]);
      }
    } catch (e) {
      if (__DEV__)
        console.log("❌ Failed to resolve message cache storage:", e);
    }
  };

  const saveMessages = async (updatedList) => {
    try {
      const storageKey = caseId
        ? `chat_history_${caseId}`
        : "chat_history_global";
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));
    } catch (e) {
      if (__DEV__)
        console.log("❌ Error synchronizing local state persistence cache:", e);
    }
  };

  const clearChatHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Clear Workspace",
      "This will permanently delete all messages in this conversation.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            const storageKey = caseId
              ? `chat_history_${caseId}`
              : "chat_history_global";
            await AsyncStorage.removeItem(storageKey);
            const defaultMsg = [
              {
                id: "welcome",
                role: "ai",
                text: "✨ Workspace cleared. Ready for a new conversation.",
                timestamp: Date.now(),
                isWelcome: true,
              },
            ];
            setMessages(defaultMsg);
            setShowQuickActions(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const handleCopyMessage = async (text, messageId) => {
    await Clipboard.setStringAsync(text);
    setCopyFeedback(messageId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleAttachDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsAttaching(true);
      const asset = result.assets[0];

      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert(
          "File Too Large",
          "Please upload documents smaller than 10MB.",
        );
        setIsAttaching(false);
        return;
      }

      setSelectedFile(FileIngestionService.fromPickerAsset(asset));
      inputRef.current?.focus();
    } catch (error) {
      Alert.alert("Error", "Failed to process the document. Please try again.");
    } finally {
      setIsAttaching(false);
    }
  };

  const handleQuickAction = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSendMessage = async () => {
    if (!isReadyToSend) return;

    const userRawText = input.trim();
    setInput("");
    setShowQuickActions(false);

    // Don't forcefully dismiss keyboard to keep interaction fluid if user wants to keep typing
    // Keyboard.dismiss();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      text: userRawText,
      timestamp: Date.now(),
    };
    const currentHistory = [...messages, userMessage];

    setMessages(currentHistory);
    await saveMessages(currentHistory);
    scrollToBottom();

    setLoading(true);
    setIsTyping(true);
    setLoadingMessage("Processing...");

    try {
      const request = new LexAIRequest({
        message: userRawText,
        history: currentHistory,
        attachment: selectedFile,
        sessionId: caseId || "global",
        timestamp: Date.now(),
      });

      const response = await LegalSphereEngine.processLexAI(request);

      const aiMessage = {
        id: `ai_${Date.now()}`,
        role: "ai",
        text: response.userFacing,
        timestamp: Date.now(),
      };
      const finalHistory = [...currentHistory, aiMessage];

      setMessages(finalHistory);
      await saveMessages(finalHistory);
      setSelectedFile(null); // Clear selected file after successful send
      scrollToBottom();
    } catch (coreError) {
      const errorMsg =
        coreError.userMessage || "Unable to reach the AI service.";
      Alert.alert("Analysis Error", errorMsg);
    } finally {
      setLoading(false);
      setIsTyping(false);
      setLoadingMessage("");
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const renderMessageItem = useCallback(
    ({ item }) => {
      const isUser = item.role === "user";
      const isCopied = copyFeedback === item.id;
      const isWelcome = item.isWelcome;

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

              {isUser ? (
                <Text style={[styles.messageText, styles.userText]}>
                  {item.text}
                </Text>
              ) : (
                <Markdown
                  style={{
                    body: {
                      ...styles.messageText,
                      color: isWelcome ? colors.text : colors.text,
                      lineHeight: 24,
                    },
                    paragraph: { marginTop: 0, marginBottom: 8 },
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
              <Text style={styles.timestamp}>
                {new Date(item.timestamp).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>

              {!isUser && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.copyButton}
                  onPress={() => handleCopyMessage(item.text, item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isCopied ? "checkmark" : "copy-outline"}
                    size={14}
                    color={isCopied ? colors.success : colors.placeholder}
                  />
                  <Text
                    style={[styles.copyText, isCopied && styles.copyTextActive]}
                  >
                    {isCopied ? "Copied" : "Copy"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      );
    },
    [copyFeedback, scrollY, colors],
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.quickActionHeader}>SUGGESTED ACTIONS</Text>
      <View style={styles.quickActionsGrid}>
        {QUICK_ACTIONS.map((action, index) => (
          <TouchableOpacity
            accessibilityRole="button"
            key={index}
            style={styles.quickActionItem}
            onPress={() => handleQuickAction(`${action.prompt} `)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={action.icon}
              size={18}
              color={colors.primary}
            />
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* COMPACT AI HEADER */}
      <View style={styles.compactHeader}>
        <View style={styles.compactHeaderLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.compactHeaderIconBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.compactHeaderTitleContainer}>
            <Text style={styles.compactHeaderTitle}>Lex Workspace</Text>
            <View style={styles.compactHeaderSubtitleRow}>
              <View style={styles.statusDot} />
              <Text style={styles.compactHeaderSubtitle}>
                AI Legal Assistant
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={clearChatHistory}
          style={styles.compactHeaderIconBtn}
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
        <AnimatedFlatList
          ref={flatListRef}
          data={messages}
          style={{ flex: 1 }}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.scrollWindow}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            messages.length === 1 ? renderQuickActions : null
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          automaticallyAdjustKeyboardInsets={true}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
        />

        {isTyping && (
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
            {selectedFile && (
              <View style={styles.selectedFileChip}>
                <Ionicons
                  name="document-text"
                  size={16}
                  color={colors.surface}
                />
                <Text style={styles.selectedFileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setSelectedFile(null)}
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
                disabled={loading || isAttaching}
              >
                {isAttaching ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="add" size={28} color={colors.secondaryText} />
                )}
              </TouchableOpacity>

              <LegalInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
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
                  onPress={handleSendMessage}
                  disabled={!isReadyToSend}
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

      {/* Centered Loading Overlay */}
      {loading && (
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

const createStyles = (colors, resolvedTheme) =>
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
      paddingTop: 24,
      paddingBottom: 24,
      gap: 20,
      flexGrow: 1,
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
    messageText: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "400",
    },
    userText: {
      color: "#FFFFFF",
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
    copyButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    copyText: {
      fontSize: 12,
      color: colors.placeholder,
      fontWeight: "600",
    },
    copyTextActive: {
      color: colors.success,
    },

    // Quick Actions
    quickActionsContainer: {
      paddingBottom: 24,
      paddingTop: 12,
      paddingHorizontal: 4,
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
      flexWrap: "wrap",
      gap: 10,
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
      alignItems: "flex-end", // Aligns buttons to the bottom as the input grows
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
      paddingTop: 12, // Keeps text vertically centered when single line
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
      backgroundColor: colors.primary, // Using primary color to ensure deep contrast
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

    // Document Chip
    selectedFileChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary, // Changed to primary for better file visibility
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
