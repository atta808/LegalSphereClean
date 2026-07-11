import React from "react";
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import { useTheme } from "../theme/ThemeContext";
// screens/DocumentVaultScreen.js
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
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
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  insertDocument,
  getDocumentsByCaseId,
  getAllDocuments,
  updateDocument,
  deleteDocument,
  addCaseNote,
} from "../services/sqliteService";
import * as ImagePicker from "expo-image-picker";
import * as IntentLauncher from "expo-intent-launcher";
import * as IntentLauncherAndroid from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import Markdown from "react-native-markdown-display";
import { LegalSphereEngine } from "../services/ai/core/LegalSphereEngine";
import { DocumentVaultRequest } from "../services/ai/core/models/Requests";

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substring(2, 9);
// Utility: get file extension
const getFileExtension = (filename) => {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts[parts.length - 1].toLowerCase();
};

// Utility: get file type category
const getFileCategory = (filename) => {
  const ext = getFileExtension(filename);
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "bmp"].includes(ext)) return "image";
  if (["txt", "md", "rtf"].includes(ext)) return "text";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext))
    return "office";
  return "other";
};

// Utility: get human-readable file type
const getFileTypeLabel = (filename) => {
  const ext = getFileExtension(filename);
  if (ext === "pdf") return "PDF Document";
  if (["jpg", "jpeg", "png", "gif", "bmp"].includes(ext)) return "Image";
  if (["txt", "md", "rtf"].includes(ext)) return "Text File";
  if (["doc", "docx"].includes(ext)) return "Word Document";
  if (["xls", "xlsx"].includes(ext)) return "Excel Spreadsheet";
  if (["ppt", "pptx"].includes(ext)) return "PowerPoint";
  return `${ext.toUpperCase()} File`;
};

export default function DocumentVaultScreen() {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(
    () => createStyles(colors, resolvedTheme),
    [colors, resolvedTheme],
  );
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { caseId, caseTitle } = route.params || {};

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [aiInsightsVisible, setAiInsightsVisible] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const copyAIResponse = async () => {
    if (!aiInsights?.userFacing) return;

    await Clipboard.setStringAsync(aiInsights.userFacing);

    Alert.alert("Copied", "AI analysis copied to clipboard.");
  };

  const shareAIResponse = async () => {
    if (!aiInsights?.userFacing || !aiInsights?.documentName) return;

    try {
      const result = await Share.share({
        title: `AI Document Analysis – ${aiInsights.documentName}`,
        message: aiInsights.userFacing,
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const saveAIToNotes = () => {
    try {
      if (!aiInsights?.userFacing || !aiInsights?.documentName) return;

      const title = `AI Document Analysis – ${aiInsights.documentName}`;

      addCaseNote({
        caseId,
        text: `${title}\n\n${aiInsights.userFacing}`,
        image: null,
      });

      Alert.alert("Saved", "AI analysis saved to Notes.");
    } catch (error) {
      if (__DEV__) {
        console.log(error);
      }

      Alert.alert("Error", "Failed to save note.");
    }
  };
  // Load documents from AsyncStorage
  const loadDocuments = useCallback(() => {
    try {
      setLoading(true);

      let docs = [];

      if (caseId) {
        docs = getDocumentsByCaseId(caseId);
      } else {
        docs = getAllDocuments();
      }

      setDocuments(docs);
    } catch (e) {
      console.log("❌ loadDocuments error:", e);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments]),
  );
  // Document upload handlers
  const handlePickDocument = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const originalName = asset.name;
      const uri = asset.uri;
      const mimeType = asset.mimeType;

      // Determine destination path
      const fileExt = getFileExtension(originalName);
      const fileName = `${generateId()}.${fileExt}`;
      const destUri = `${FileSystem.documentDirectory}documents/${fileName}`;

      // Ensure directory exists
      const dirUri = `${FileSystem.documentDirectory}documents/`;
      const dirInfo = await FileSystem.getInfoAsync(dirUri);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
      }

      // Copy file to app's document directory
      await FileSystem.copyAsync({
        from: uri,
        to: destUri,
      });

      // Create document metadata
      const newDoc = {
        id: generateId(),
        name: originalName,
        description: "",
        category: "uncategorized",
        uri: destUri,
        originalUri: uri,
        mimeType,
        fileSize: asset.size,
        fileExt,
        fileCategory: getFileCategory(originalName),
        uploadDate: require('../utils/date').toISO(new Date()),
        caseId: caseId || null,
        caseTitle: caseTitle || null,
      };
      insertDocument(newDoc);
      loadDocuments();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Document uploaded successfully.");
    } catch (error) {
      console.error("Document pick error:", error);
      Alert.alert("Error", "Failed to pick document.");
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required.");
        return;
      }

      setUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const originalName = asset.fileName || `photo_${Date.now()}.jpg`;
      const uri = asset.uri;

      const fileExt = "jpg";
      const fileName = `${generateId()}.${fileExt}`;
      const destUri = `${FileSystem.documentDirectory}documents/${fileName}`;

      const dirUri = `${FileSystem.documentDirectory}documents/`;
      const dirInfo = await FileSystem.getInfoAsync(dirUri);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
      }

      await FileSystem.copyAsync({ from: uri, to: destUri });

      const newDoc = {
        id: generateId(),
        name: originalName,
        description: "",
        category: "uncategorized",
        uri: destUri,
        originalUri: uri,
        mimeType: "image/jpeg",
        fileSize: asset.fileSize,
        fileExt,
        fileCategory: "image",
        uploadDate: require('../utils/date').toISO(new Date()),
        caseId: caseId || null,
        caseTitle: caseTitle || null,
      };

      insertDocument(newDoc);
      loadDocuments();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Photo uploaded successfully.");
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to capture photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDocument = async (doc) => {
    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(doc.uri);
      if (!fileInfo.exists) {
        Alert.alert("File not found", "The document file is missing.");
        return;
      }

      // For images, show preview
      if (doc.fileCategory === "image") {
        setSelectedDoc(doc);
        setPreviewVisible(true);
        return;
      }

      // For PDF and other files, use sharing or external viewer
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(doc.uri);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1,
        });
      } else {
        await Sharing.shareAsync(doc.uri, {
          mimeType: doc.mimeType,
          dialogTitle: "Open document",
        });
      }
    } catch (error) {
      console.error("Open document error:", error);
      Alert.alert("Error", "Failed to open document.");
    }
  };

  const handleDeleteDocument = (doc) => {
    Alert.alert(
      "Delete Document",
      `Are you sure you want to delete "${doc.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete file from filesystem
              const fileInfo = await FileSystem.getInfoAsync(doc.uri);
              if (fileInfo.exists) {
                await FileSystem.deleteAsync(doc.uri);
              }

              // Remove from state and storage
              deleteDocument(doc.id);
              loadDocuments();

              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Alert.alert("Success", "Document deleted.");
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete document.");
            }
          },
        },
      ],
    );
  };

  const handleEditDocument = (doc) => {
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditDescription(doc.description || "");
    setEditCategory(doc.category || "uncategorized");
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updatedDoc = {
        ...editingDoc,
        name: editName.trim() || editingDoc.name,
        description: editDescription.trim(),
        category: editCategory,
      };

      updateDocument(editingDoc.id, updatedDoc);
      loadDocuments();

      setEditModalVisible(false);
      setEditingDoc(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Document updated.");
    } catch (error) {
      console.error("Save edit error:", error);
      Alert.alert("Error", "Failed to update document.");
    }
  };

  const handleShareDocument = async (doc) => {
    try {
      await Sharing.shareAsync(doc.uri, {
        mimeType: doc.mimeType,
        dialogTitle: `Share ${doc.name}`,
      });
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to share document.");
    }
  };

  const handleCopyDocumentInfo = async (doc) => {
    const info = `
Document: ${doc.name}
Type: ${getFileTypeLabel(doc.name)}
Size: ${(doc.fileSize / 1024).toFixed(1)} KB
Uploaded: ${new Date(doc.uploadDate).toLocaleString()}
Description: ${doc.description || "—"}
Category: ${doc.category}
Case: ${doc.caseTitle || "—"}
    `.trim();
    await Clipboard.setStringAsync(info);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Document info copied to clipboard.");
  };

  // Simulate AI insights for document
  const handleAiInsights = async (doc) => {
    try {
      setAiInsightsVisible(true);
      setInsightsLoading(true);
      setAiInsights(null);

      // Create structured request object for LegalSphereEngine
      const request = new DocumentVaultRequest({
        attachment: {
          uri: doc.uri,
          name: doc.name,
          type: doc.mimeType,
          size: doc.fileSize,
        },
      });

      const response = await LegalSphereEngine.processDocumentVault(request);

      setAiInsights({
        userFacing: response.userFacing,
        documentName: doc.name,
      });
    } catch (error) {
      console.log("❌ handleAiInsights error:", error);
      const errorMessage = error.userMessage || "Failed to analyze document.";

      setAiInsights({
        userFacing: errorMessage,
        documentName: doc.name,
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  // Filtering logic
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description &&
        doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: "all", label: "All" },
    { id: "uncategorized", label: "Uncategorized" },
    { id: "evidence", label: "Evidence" },
    { id: "pleading", label: "Pleading" },
    { id: "contract", label: "Contract" },
    { id: "correspondence", label: "Correspondence" },
    { id: "research", label: "Research" },
  ];

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primaryDark} />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Premium Header */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.glassBackButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.titleCenter}>
            <Text style={styles.headerTitleText}>Document Vault</Text>
            {caseTitle && <Text style={styles.caseContext}>{caseTitle}</Text>}
          </View>
          <TouchableOpacity accessibilityRole="button"
            style={styles.aiCopyButton}
            onPress={async () => {
              const docsInfo = documents
                .map((doc) => `- ${doc.name} (${getFileTypeLabel(doc.name)})`)
                .join("\n");
              const text = `Case: ${caseTitle || "All Documents"}\n\nDocuments:\n${docsInfo}`;
              await Clipboard.setStringAsync(text);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Alert.alert("Copied", "Document list copied to clipboard.");
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
        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.actionButton}
            onPress={handlePickDocument}
          >
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionLabel}>Pick File</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            style={styles.actionButton}
            onPress={handleTakePhoto}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionLabel}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity accessibilityRole="button" onPress={() => setSearchQuery("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity accessibilityRole="button"
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Document Count */}
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filteredDocuments.length} document
            {filteredDocuments.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Document List */}
        {filteredDocuments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Pick File" or "Take Photo" to add documents to this vault.
            </Text>
          </View>
        ) : (
          filteredDocuments.map((doc) => (
            <View key={doc.id} style={styles.documentCard}>
              <TouchableOpacity accessibilityRole="button"
                style={styles.documentContent}
                onPress={() => handleOpenDocument(doc)}
                activeOpacity={0.7}
              >
                <View style={styles.documentIcon}>
                  <Text style={styles.documentIconText}>
                    {doc.fileCategory === "pdf" && "📄"}
                    {doc.fileCategory === "image" && "🖼️"}
                    {doc.fileCategory === "text" && "📝"}
                    {doc.fileCategory === "office" && "📊"}
                    {doc.fileCategory === "other" && "📎"}
                  </Text>
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text style={styles.documentMeta}>
                    {getFileTypeLabel(doc.name)} •{" "}
                    {(doc.fileSize / 1024).toFixed(1)} KB
                  </Text>
                  {doc.description ? (
                    <Text style={styles.documentDescription} numberOfLines={1}>
                      {doc.description}
                    </Text>
                  ) : null}
                  {doc.category !== "uncategorized" && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {categories.find((c) => c.id === doc.category)?.label ||
                          doc.category}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.documentActions}>
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => handleEditDocument(doc)}
                  style={styles.actionIconBtn}
                >
                  <Text style={styles.actionIconSmall}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => handleShareDocument(doc)}
                  style={styles.actionIconBtn}
                >
                  <Text style={styles.actionIconSmall}>📤</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => handleAiInsights(doc)}
                  style={styles.actionIconBtn}
                >
                  <Text style={styles.actionIconSmall}>✨</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => handleDeleteDocument(doc)}
                  style={styles.actionIconBtn}
                >
                  <Text style={styles.actionIconSmall}>🗑️</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => handleCopyDocumentInfo(doc)}
                  style={styles.actionIconBtn}
                >
                  <Text style={styles.actionIconSmall}>📋</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={previewVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.previewContainer}>
            <TouchableOpacity accessibilityRole="button"
              style={styles.closePreviewBtn}
              onPress={() => setPreviewVisible(false)}
            >
              <Text style={styles.closePreviewText}>✕</Text>
            </TouchableOpacity>
            {selectedDoc && (
              <Image
                source={{ uri: selectedDoc.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Document Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Document</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Document name"
              placeholderTextColor={colors.placeholder}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description"
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalCategoryRow}>
              {categories.slice(1).map((cat) => (
                <TouchableOpacity accessibilityRole="button"
                  key={cat.id}
                  style={[
                    styles.modalCategoryChip,
                    editCategory === cat.id && styles.modalCategoryChipActive,
                  ]}
                  onPress={() => setEditCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.modalCategoryChipText,
                      editCategory === cat.id &&
                        styles.modalCategoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActionRow}>
              <TouchableOpacity accessibilityRole="button"
                style={styles.modalCancel}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                style={styles.modalSave}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Insights Modal */}
      <Modal visible={aiInsightsVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>AI Insights</Text>
            {insightsLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.primaryDark}
                style={{ marginVertical: 30 }}
              />
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={true}
                style={{ maxHeight: 450 }}
              >
                {aiInsights && (
                  <Markdown
                    style={{
                      body: { ...styles.aiText, color: colors.text },
                      heading2: {
                        ...styles.aiSectionTitle,
                        color: colors.primary,
                        marginTop: 16,
                        marginBottom: 8,
                        fontSize: 16,
                      },
                      heading3: {
                        ...styles.aiSectionTitle,
                        color: colors.primary,
                        marginTop: 12,
                        marginBottom: 6,
                        fontSize: 14,
                      },
                      paragraph: { marginTop: 0, marginBottom: 8 },
                      list_item: { marginBottom: 4 },
                    }}
                  >
                    {aiInsights.userFacing}
                  </Markdown>
                )}
              </ScrollView>
            )}
            <View style={styles.modalActionRow}>
              <TouchableOpacity accessibilityRole="button"
                style={styles.aiSecondaryButton}
                onPress={copyAIResponse}
              >
                <Text style={styles.aiSecondaryText}>📋 Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity accessibilityRole="button"
                style={styles.aiSecondaryButton}
                onPress={saveAIToNotes}
              >
                <Text style={styles.aiSecondaryText}>📝 Save</Text>
              </TouchableOpacity>

              <TouchableOpacity accessibilityRole="button"
                style={styles.aiSecondaryButton}
                onPress={shareAIResponse}
              >
                <Text style={styles.aiSecondaryText}>📤 Share</Text>
              </TouchableOpacity>

              <TouchableOpacity accessibilityRole="button"
                style={styles.aiPrimaryButton}
                onPress={() => setAiInsightsVisible(false)}
              >
                <Text style={styles.aiPrimaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) =>
  StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.surface },
    loaderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.surface,
    },

    // Header
    premiumHeader: {
      backgroundColor: colors.surface,
      paddingBottom: 16,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      shadowColor: colors.primary,
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
      backgroundColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    backIcon: {
      fontSize: 28,
      color: colors.primary,
      fontWeight: "300",
      marginTop: -4,
    },
    titleCenter: { flex: 1, alignItems: "center" },
    headerTitleText: { fontSize: 18, fontWeight: "800", color: colors.primary },
    caseContext: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 2,
      fontWeight: "500",
    },
    aiCopyButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    aiCopyIcon: { fontSize: 18, color: colors.primary, fontWeight: "900" },

    scrollContent: { paddingHorizontal: 20, paddingTop: 24 },

    // Action Buttons
    actionContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 24,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.text,
      borderRadius: 20,
      paddingVertical: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
    },
    actionIcon: { fontSize: 28, color: colors.text, fontWeight: "900" },
    actionLabel: {
      marginTop: 8,
      color: colors.surface,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.5,
    },

    // Search
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: { fontSize: 16, marginRight: 12, color: colors.placeholder },
    searchInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    clearIcon: { fontSize: 16, color: colors.placeholder, padding: 4 },

    // Category Filter
    categoryScroll: { flexDirection: "row", marginBottom: 20 },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.border,
      marginRight: 10,
    },
    categoryChipActive: { backgroundColor: colors.primary },
    categoryChipText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.secondaryText,
    },
    categoryChipTextActive: { color: colors.surface },

    // Count
    countContainer: { marginBottom: 16, paddingHorizontal: 4 },
    countText: { fontSize: 13, fontWeight: "600", color: colors.secondaryText },

    // Empty State
    emptyContainer: {
      alignItems: "center",
      paddingVertical: 60,
      backgroundColor: colors.surface,
      borderRadius: 24,
      marginTop: 20,
    },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: "center",
      paddingHorizontal: 40,
    },

    // Document Card
    documentCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      marginBottom: 16,
      padding: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    documentContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    documentIcon: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    documentIconText: { fontSize: 28 },
    documentInfo: { flex: 1 },
    documentName: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 2,
    },
    documentMeta: {
      fontSize: 12,
      color: colors.secondaryText,
      marginBottom: 2,
    },
    documentDescription: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    categoryBadge: {
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
      alignSelf: "flex-start",
      marginTop: 6,
    },
    categoryBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primary,
    },
    documentActions: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionIconBtn: { padding: 8 },
    actionIconSmall: { fontSize: 18, opacity: 0.7 },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.9)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    previewContainer: {
      width: "100%",
      height: "80%",
      backgroundColor: colors.shadow,
      borderRadius: 24,
      overflow: "hidden",
      position: "relative",
    },
    closePreviewBtn: {
      position: "absolute",
      top: 20,
      right: 20,
      zIndex: 10,
      backgroundColor: "rgba(0,0,0,0.5)",
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    closePreviewText: {
      color: colors.surface,
      fontSize: 18,
      fontWeight: "bold",
    },
    previewImage: { width: "100%", height: "100%" },

    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      padding: 24,
      width: "100%",
      maxHeight: "80%",
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: colors.text,
      marginBottom: 20,
    },
    modalInput: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 16,
      fontSize: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTextArea: { minHeight: 80, textAlignVertical: "top" },
    modalCategoryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 24,
    },
    modalCategoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.border,
    },
    modalCategoryChipActive: { backgroundColor: colors.primary },
    modalCategoryChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.secondaryText,
    },
    modalCategoryChipTextActive: { color: colors.surface },
    modalActionRow: { flexDirection: "row", gap: 12, marginTop: 8 },
    modalCancel: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.border,
      borderRadius: 16,
    },
    modalCancelText: { color: colors.secondaryText, fontWeight: "700" },
    modalSave: {
      flex: 2,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
    },
    modalSaveText: { color: colors.surface, fontWeight: "800" },

    // AI Insights
    aiSectionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.primary,
      marginTop: 16,
      marginBottom: 8,
    },
    aiText: { fontSize: 14, color: colors.secondaryText, lineHeight: 20 },
    aiKeywordsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    aiKeywordChip: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    aiKeywordText: { fontSize: 12, fontWeight: "600", color: colors.primary },
    aiPrimaryButton: {
      flex: 1.4,
      backgroundColor: colors.primary,
      height: 56,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },

    aiPrimaryText: {
      color: colors.surface,
      fontSize: 16,
      fontWeight: "800",
    },

    aiSecondaryButton: {
      flex: 1,
      backgroundColor: colors.border,
      height: 56,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },

    aiSecondaryText: {
      color: colors.secondaryText,
      fontSize: 14,
      fontWeight: "700",
    },
  });
