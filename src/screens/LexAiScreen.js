// screens/LexAiScreen.js
import { useTheme } from "../contexts/ThemeContext";
import React, { useRef, useState, useEffect, useCallback } from "react";
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

import { askDeepSeek } from "../services/deepseekService";
import { db } from "../services/sqliteService";
import LegalInput from "../components/LegalInput";
import {
  generateSQL,
  summarizeSQLResults,
} from "../services/ai/promptTemplates";
import { extractDocumentText } from "../services/ai/documentReaders";

// Sleek typing animation component
const TypingIndicator = () => {
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
    backgroundColor: "#94A3B8",
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
  const { resolvedTheme: theme } = useTheme();
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
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    loadMessages();
    StatusBar.setBarStyle("dark-content");

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

  const getSystemDateString = () => {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // UPDATED: Dynamic Language Policy
  const enforceLanguagePolicy = (prompt) => {
    return `
LANGUAGE INSTRUCTION:
- You are a highly professional legal AI.
- Default to formal legal English for precision.
- IMPORTANT: If the user writes in Urdu (or any other native language), or explicitly asks for an Urdu translation, you MUST respond in that requested language. 
- When speaking in Urdu or another language, ensure legal concepts remain accurate (you may bracket the English legal terms for clarity).

USER QUERY: ${prompt}
`;
  };

  const handleAttachDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
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
        mimeType: asset.mimeType,
        size: asset.size,
      };
      const extractedText = await extractDocumentText(docObj, "eng");

      if (extractedText && extractedText.trim().length > 0) {
        setInput(
          `📄 Analyzing document: "${asset.name}"\n\n${extractedText.substring(0, 10000)}\n\nPlease analyze this document and provide key legal insights.`,
        );
        inputRef.current?.focus();
      } else {
        Alert.alert(
          "Extraction Failed",
          "Unable to extract readable text. Please ensure the document contains selectable text.",
        );
      }
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
    setLoadingMessage("Analyzing query...");

    try {
      const dynamicLanguagePrompt = enforceLanguagePolicy(userRawText);
      const systemDate = getSystemDateString();

      const initialPrompt = generateSQL(
        dynamicLanguagePrompt,
        caseId,
        systemDate,
      );
      const initialResponse = await askDeepSeek(initialPrompt);

      let intentObject;
      try {
        const firstBrace = initialResponse.indexOf("{");
        const lastBrace = initialResponse.lastIndexOf("}");

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const pureJson = initialResponse.substring(firstBrace, lastBrace + 1);
          intentObject = JSON.parse(pureJson);
        } else {
          intentObject = { type: "answer", text: initialResponse };
        }
      } catch (e) {
        intentObject = {
          type: "answer",
          text: initialResponse.replace(/```json|```/g, "").trim(),
        };
      }

      let ultimateAiResponseText = "";

      if (intentObject.type === "sql" && intentObject.sql) {
        setLoadingMessage("Querying database...");
        try {
          const dataset = db.getAllSync(intentObject.sql);
          setLoadingMessage("Synthesizing findings...");

          const summaryPrompt = summarizeSQLResults(
            dynamicLanguagePrompt,
            JSON.stringify(dataset),
            systemDate,
            "Match User's Language (English Default, Urdu if requested)",
          );

          ultimateAiResponseText = await askDeepSeek(summaryPrompt);
        } catch (dbError) {
          ultimateAiResponseText =
            "⚠️ I encountered an error querying the database. Please refine your query criteria.";
        }
      } else {
        ultimateAiResponseText = intentObject.text || initialResponse;
      }

      const aiMessage = {
        id: `ai_${Date.now()}`,
        role: "ai",
        text: ultimateAiResponseText,
        timestamp: Date.now(),
      };
      const finalHistory = [...currentHistory, aiMessage];

      setMessages(finalHistory);
      await saveMessages(finalHistory);
      scrollToBottom();
    } catch (coreError) {
      Alert.alert("Connection Issue", "Unable to reach the AI service.");
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
                <Ionicons name="sparkles" size={14} color="#0F172A" />
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
              <Text
                style={[
                  styles.messageText,
                  isUser ? styles.userText : styles.aiText,
                ]}
              >
                {item.text}
              </Text>
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
                  style={styles.copyButton}
                  onPress={() => handleCopyMessage(item.text, item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isCopied ? "checkmark" : "copy-outline"}
                    size={12}
                    color={isCopied ? "#10B981" : "#94A3B8"}
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
            key={index}
            style={styles.quickActionItem}
            onPress={() => handleQuickAction(`${action.prompt} `)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={action.icon}
              size={16}
              color="#0F172A"
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Clean Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Lex Workspace</Text>
            <View style={styles.statusDot} />
          </View>
        </View>
        <TouchableOpacity
          onPress={clearChatHistory}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

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
              <TypingIndicator />
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
            <View style={styles.inputInner}>
              <TouchableOpacity
                onPress={handleAttachDocument}
                style={styles.attachButton}
                disabled={loading || isAttaching}
              >
                {isAttaching ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Ionicons name="add" size={24} color="#64748B" />
                )}
              </TouchableOpacity>

              <LegalInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                placeholder="Ask Lex anything..."
                placeholderTextColor="#94A3B8"
                multiline
                style={styles.textInputModifier}
                returnKeyType="default"
              />

              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!input.trim() || loading || isAttaching}
                style={[
                  styles.sendButton,
                  input.trim() && !loading && !isAttaching
                    ? styles.sendActive
                    : styles.sendDisabled,
                ]}
              >
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
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
            <ActivityIndicator size="small" color="#0F172A" />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    height: 56,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
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
    backgroundColor: "#F1F5F9",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
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
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#0A0A0A",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  userText: {
    color: "#FFFFFF",
  },
  aiText: {
    color: "#1E293B",
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
    color: "#94A3B8",
    fontWeight: "500",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  copyText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  copyTextActive: {
    color: "#10B981",
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0F172A",
  },
  typingWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  textInputModifier: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
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
    backgroundColor: "#0A0A0A",
  },
  sendDisabled: {
    backgroundColor: "#E2E8F0",
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  loadingText: {
    fontSize: 14,
    color: "#0F172A",
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
    backgroundColor: "#FAFAFA",
    borderTopWidth: 0,
    // Removed absolute positioning
  },
  inputGlass: {
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  inputInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});
