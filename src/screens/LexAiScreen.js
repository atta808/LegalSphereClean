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
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.placeholder,
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
        type: [
          "image/*",
          "application/pdf",
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
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

      const docObj = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType, // Map to what engine expects
        size: asset.size,
      };

      setSelectedFile(docObj);
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
    if (!input.trim() || loading || isAttaching) return;

    const userRawText = input.trim();
    setInput("");
    setShowQuickActions(false);
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

      return (
        <Animated.View
          style={[
            styles.messageContainer,
            isUser ? styles.userAlign : styles.aiAlign,
            {
              opacity: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0.95],
                extrapolate: "clamp",
              }),
            },
          ]}
        >
          {!isUser && (
            <View style={styles.avatarContainer}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={14} color={colors.text} />
              </View>
            </View>
          )}

          <View
            style={[styles.bubbleWrapper, isUser && styles.userBubbleWrapper]}
          >
            <View
              style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.aiBubble,
              ]}
            >
              {isUser ? (
                <Text style={[styles.messageText, styles.userText]}>
                  {item.text}
                </Text>
              ) : (
                <Markdown
                  style={{
                    body: { ...styles.messageText, color: colors.text },
                    paragraph: { marginTop: 0, marginBottom: 8 },
                  }}
                >
                  {item.text}
                </Markdown>
              )}
            </View>

            <View
              style={[styles.messageFooter, isUser && styles.messageFooterUser]}
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
                    size={12}
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
    [copyFeedback, scrollY],
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
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
              size={16}
              color={colors.text}
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Clean Header */}
      <PremiumPageHeader
        title="Lex Workspace"
        rightComponent={
          <PremiumTouchable
            accessibilityRole="button"
            onPress={clearChatHistory}
            style={styles.iconButton}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={resolvedTheme === "dark" ? colors.danger : colors.surface}
            />
          </PremiumTouchable>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
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
            <View style={styles.typingBubble}>
              <TypingIndicator styles={styles} colors={colors} />
            </View>
          </View>
        )}

        {/* Fixed Input Wrapper - Now properly positioned */}
        <View
          style={[
            styles.bottomInputWrapper,
            {
              paddingBottom:
                Platform.OS === "ios" ? Math.max(insets.bottom, 20) : 20,
            },
          ]}
        >
          <View style={styles.inputGlass}>
            {selectedFile && (
              <View style={styles.selectedFileChip}>
                <Ionicons
                  name="document-text"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.selectedFileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setSelectedFile(null)}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.placeholder}
                  />
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
                  <Ionicons name="add" size={24} color={colors.secondaryText} />
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

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleSendMessage}
                disabled={!input.trim() || loading || isAttaching}
                style={[
                  styles.sendButton,
                  input.trim() && !loading && !isAttaching
                    ? styles.sendActive
                    : styles.sendDisabled,
                ]}
              >
                <Ionicons name="arrow-up" size={18} color={colors.surface} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Centered Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={colors.text} />
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
    header: {
      flexDirection: "row",
      height: 56,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      backgroundColor:
        resolvedTheme === "dark" ? colors.surface : colors.primary,
      borderBottomWidth: 1,
      borderBottomColor:
        resolvedTheme === "dark" ? colors.border : colors.primary,
      zIndex: 10,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        resolvedTheme === "dark" ? colors.card : "rgba(255,255,255,0.15)",
      borderWidth: 1,
      borderColor:
        resolvedTheme === "dark" ? colors.border : "rgba(255,255,255,0.1)",
    },
    headerTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: resolvedTheme === "dark" ? colors.primary : colors.surface,
      letterSpacing: -0.3,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.success,
    },
    messageContainer: {
      flexDirection: "row",
      width: "100%",
      marginBottom: 6,
    },
    userAlign: {
      justifyContent: "flex-end",
    },
    aiAlign: {
      justifyContent: "flex-start",
    },
    avatarContainer: {
      marginRight: 10,
      alignSelf: "flex-end",
      marginBottom: 20,
    },
    aiAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.border,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    bubbleWrapper: {
      maxWidth: "80%",
    },
    userBubbleWrapper: {
      maxWidth: "75%",
    },
    messageBubble: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    aiBubble: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
      ...(resolvedTheme === "light"
        ? {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }
        : {
            elevation: 0,
          }),
    },
    messageText: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "400",
    },
    userText: {
      color: colors.surface,
    },
    aiText: {
      color: colors.text,
    },
    messageFooter: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 6,
      paddingHorizontal: 4,
      gap: 12,
    },
    messageFooterUser: {
      justifyContent: "flex-end",
    },
    timestamp: {
      fontSize: 11,
      color: colors.placeholder,
      fontWeight: "500",
    },
    copyButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    copyText: {
      fontSize: 11,
      color: colors.placeholder,
      fontWeight: "600",
    },
    copyTextActive: {
      color: colors.success,
    },
    quickActionsContainer: {
      paddingBottom: 16,
      paddingTop: 8,
    },
    quickActionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    quickActionItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      ...(resolvedTheme === "light"
        ? {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 2,
          }
        : {
            elevation: 0,
          }),
    },
    quickActionLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.text,
    },
    typingWrapper: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    typingBubble: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 20,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: "flex-start",
    },
    typingContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    attachButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: colors.border,
      marginRight: 8,
    },
    textInputModifier: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      maxHeight: 100,
      minHeight: 40,
      paddingTop: 10,
      paddingBottom: 10,
      paddingHorizontal: 8,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },
    sendActive: {
      backgroundColor: colors.primary,
    },
    sendDisabled: {
      backgroundColor: colors.border,
    },
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
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 30,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...(resolvedTheme === "light"
        ? {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 5,
          }
        : {
            elevation: 0,
          }),
    },
    loadingText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    scrollWindow: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 140, // Increased significantly for keyboard space
      gap: 16,
      flexGrow: 1,
    },
    bottomInputWrapper: {
      paddingHorizontal: 16,
      paddingTop: 8,
      backgroundColor: colors.background,
      borderTopWidth: 0,
      // Removed absolute positioning
    },
    inputGlass: {
      borderRadius: 32,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...(resolvedTheme === "light"
        ? {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
          }
        : {
            elevation: 0,
          }),
    },
    inputInner: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    selectedFileChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginHorizontal: 12,
      marginTop: 8,
      gap: 6,
    },
    selectedFileName: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
      fontWeight: "500",
    },
  });
