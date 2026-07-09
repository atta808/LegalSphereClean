// screens/DocumentVaultScreen.js
import { extractDocumentText } from "../services/ai/documentReaders";
import { useTheme } from "../contexts/ThemeContext";
import { askLegalSphereAI } from "../services/ai/legalSphereAI";
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
import { askDeepSeek } from "../services/deepseekService";
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
  const { resolvedTheme: theme } = useTheme();
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
    if (!aiInsights?.summary) return;

    await Clipboard.setStringAsync(aiInsights.summary);

    Alert.alert("Copied", "AI analysis copied to clipboard.");
  };
  const saveAIToNotes = () => {
    try {
      if (!aiInsights?.summary) return;

      addCaseNote({
        caseId,
        text: aiInsights.summary,
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
        uploadDate: new Date().toISOString(),
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
        uploadDate: new Date().toISOString(),
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

      const documentText = await extractDocumentText(doc);

      if (__DEV__) {
        console.log("📄 Extracted Text:", documentText);
      }

      const result = await askLegalSphereAI({
        mode: "document",
        question:
          "Analyze this legal document and provide summary, issues, facts and category.",
        documentText,
      });

      setAiInsights({
        summary: result || "No response",
        keywords: [],
        recommendation: "",
        relatedCases: [],
      });
    } catch (error) {
      console.log("❌ handleAiInsights error:", error);

      setAiInsights({
        summary: "Failed to analyze document.",
        keywords: [],
        recommendation: "",
        relatedCases: [],
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
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Premium Header */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.glassBackButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.titleCenter}>
            <Text style={styles.headerTitleText}>Document Vault</Text>
            {caseTitle && <Text style={styles.caseContext}>{caseTitle}</Text>}
          </View>
          <TouchableOpacity
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
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePickDocument}
          >
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionLabel}>Pick File</Text>
          </TouchableOpacity>
          <TouchableOpacity
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
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
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
            <TouchableOpacity
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
              <TouchableOpacity
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
                <TouchableOpacity
                  onPress={() => handleEditDocument(doc)}
                  style={styles.actionIconBtn}
                >
                  <Text style={styles.actionIconSmall}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShareDocument(doc)}
                  style={styles.actionIconBtn}
                >
                  <Text style={styles.actionIconSmall}>📤</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAiInsights(doc)}
                  style={styles.actionIconBtn}
                >
                  <Text style={styles.actionIconSmall}>✨</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteDocument(doc)}
                  style={styles.actionIconBtn}
                >
                  <Text style={styles.actionIconSmall}>🗑️</Text>
                </TouchableOpacity>
                <TouchableOpacity
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
            <TouchableOpacity
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
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalCategoryRow}>
              {categories.slice(1).map((cat) => (
                <TouchableOpacity
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
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
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
                color="#1E3A8A"
                style={{ marginVertical: 30 }}
              />
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={true}
                style={{ maxHeight: 450 }}
              >
                {aiInsights && (
                  <>
                    <Text style={styles.aiText}>{aiInsights.summary}</Text>

                    {aiInsights.relatedCases.length > 0 && (
                      <>
                        <Text style={styles.aiSectionTitle}>Related Cases</Text>

                        {aiInsights.relatedCases.map((c, idx) => (
                          <Text key={idx} style={styles.aiText}>
                            • {c}
                          </Text>
                        ))}
                      </>
                    )}
                  </>
                )}
              </ScrollView>
            )}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.aiSecondaryButton}
                onPress={copyAIResponse}
              >
                <Text style={styles.aiSecondaryText}>📋 Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aiSecondaryButton}
                onPress={saveAIToNotes}
              >
                <Text style={styles.aiSecondaryText}>📝 Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
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

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#0A0F1E" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0F1E",
  },

  // Header
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
  caseContext: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
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

  // Action Buttons
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  actionIcon: { fontSize: 28, color: "#38BDF8", fontWeight: "900" },
  actionLabel: {
    marginTop: 8,
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: { fontSize: 16, marginRight: 12, color: "#94A3B8" },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#1E293B" },
  clearIcon: { fontSize: 16, color: "#94A3B8", padding: 4 },

  // Category Filter
  categoryScroll: { flexDirection: "row", marginBottom: 20 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 10,
  },
  categoryChipActive: { backgroundColor: "#1E3A8A" },
  categoryChipText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  categoryChipTextActive: { color: "#FFFFFF" },

  // Count
  countContainer: { marginBottom: 16, paddingHorizontal: 4 },
  countText: { fontSize: 13, fontWeight: "600", color: "#64748B" },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginTop: 20,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // Document Card
  documentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
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
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  documentIconText: { fontSize: 28 },
  documentInfo: { flex: 1 },
  documentName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 2,
  },
  documentMeta: { fontSize: 12, color: "#64748B", marginBottom: 2 },
  documentDescription: { fontSize: 13, color: "#475569", marginTop: 2 },
  categoryBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: "700", color: "#1E3A8A" },
  documentActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
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
    backgroundColor: "#000",
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
  closePreviewText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  previewImage: { width: "100%", height: "100%" },

  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E293B",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#F1F5F9",
  },
  modalCategoryChipActive: { backgroundColor: "#1E3A8A" },
  modalCategoryChipText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  modalCategoryChipTextActive: { color: "#FFF" },
  modalActionRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
  },
  modalCancelText: { color: "#64748B", fontWeight: "700" },
  modalSave: {
    flex: 2,
    backgroundColor: "#1E3A8A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  modalSaveText: { color: "#FFF", fontWeight: "800" },

  // AI Insights
  aiSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E3A8A",
    marginTop: 16,
    marginBottom: 8,
  },
  aiText: { fontSize: 14, color: "#475569", lineHeight: 20 },
  aiKeywordsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  aiKeywordChip: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiKeywordText: { fontSize: 12, fontWeight: "600", color: "#1E3A8A" },
  aiPrimaryButton: {
    flex: 1.4,
    backgroundColor: "#1E3A8A",
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  aiPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  aiSecondaryButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  aiSecondaryText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
});
