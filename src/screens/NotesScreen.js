import { Feather } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ImageViewer from "react-native-image-zoom-viewer";
import { toDisplay } from "../utils/date";
import LegalInput from "../components/LegalInput";

import {
  addCaseNote,
  deleteCaseNote,
  getCaseNotes,
  updateCaseNote,
} from "../services/sqliteService";

export default function NotesScreen({ caseId, onBack }) {
  const { resolvedTheme: theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [imageUri, setImageUri] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const loadNotes = useCallback(() => {
    try {
      const result = getCaseNotes(caseId);
      setNotes(result);
    } catch (_) {
      Alert.alert("Error", "Failed to load notes.");
    }
  }, [caseId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const openImageViewer = (uri) => {
    setSelectedImage(uri);
    setViewerVisible(true);
  };

  const handleAddNote = () => {
    if (!note.trim() && !imageUri) return;

    try {
      if (editingNote) {
        updateCaseNote(editingNote.id, {
          text: note,
          image: imageUri || null,
        });
        setEditingNote(null);
      } else {
        addCaseNote({
          caseId,
          text: note,
          image: imageUri || null,
        });
      }

      setNote("");
      setImageUri(null);
      loadNotes();
    } catch {
      Alert.alert("Error", "Failed to save note.");
    }
  };

  const deleteNote = (noteId) => {
    Alert.alert("Delete Brief", "This action cannot be undone. Confirm?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteCaseNote(noteId);
          loadNotes();
        },
      },
    ]);
  };

  const editNote = (noteItem) => {
    setNote(noteItem.text || "");
    setImageUri(noteItem.image || null);
    setEditingNote(noteItem);
  };

  const pickImage = async () => {
    Alert.alert("Evidence Capture", "Select image source", [
      {
        text: "Camera",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
          if (!res.canceled) setImageUri(res.assets[0].uri);
        },
      },
      {
        text: "Media Gallery",
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return;
          const res = await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
          });
          if (!res.canceled) setImageUri(res.assets[0].uri);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={[styles.mainWrapper, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" translucent />

      {/* HEADER */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.glassBackButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleWrapper}>
            <Text style={styles.headerTitleText}>Digital briefcase</Text>
            <View style={styles.jurisdictionPill}>
              <Text style={styles.jurisdictionText}>
                Legal Notes & Evidence
              </Text>
            </View>
          </View>

          <View style={{ width: 44 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: theme.background }]}
          contentContainerStyle={{
            paddingBottom: 180,
            paddingTop: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {notes.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>✍️</Text>
              </View>
              <Text style={styles.emptyText}>No Briefs Recorded</Text>
              <Text style={styles.emptySub}>
                Capture case observations or evidence photos to build your file.
              </Text>
            </View>
          ) : (
            notes.map((n) => (
              <View key={n.id} style={styles.noteCard}>
                {n.image && (
                  <TouchableOpacity
                    onPress={() => openImageViewer(n.image)}
                    style={styles.imageContainer}
                  >
                    <Image source={{ uri: n.image }} style={styles.noteImage} />
                  </TouchableOpacity>
                )}
                {n.text ? <Text style={styles.noteText}>{n.text}</Text> : null}
                <Text style={styles.dateText}>
                  {n.createdAt ? toDisplay(n.createdAt) : "Now"}
                </Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity onPress={() => editNote(n)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteNote(n.id)}>
                    <Text style={styles.delText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* COMPOSER */}
        <View
          style={[
            styles.composer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.previewThumb} />
          )}

          <View style={styles.composerRow}>
            <TouchableOpacity onPress={pickImage} style={styles.cameraButton}>
              <Text style={{ fontSize: 22 }}>📷</Text>
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
              <LegalInput
                value={note}
                onChangeText={setNote}
                placeholder="Write note..."
                multiline
                style={styles.noteInput}
              />
            </View>

            <TouchableOpacity onPress={handleAddNote}>
              <LinearGradient
                colors={["#2A8FEA", "#1E73BE", "#155FA0"]}
                style={styles.sendBtn}
              >
                <Feather name="arrow-up" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* IMAGE VIEWER MODAL WITH ZOOM */}
      <Modal
        visible={viewerVisible}
        transparent={true}
        onRequestClose={() => setViewerVisible(false)}
      >
        <ImageViewer
          imageUrls={[{ url: selectedImage || "" }]}
          enableSwipeDown={true}
          onSwipeDown={() => setViewerVisible(false)}
          onCancel={() => setViewerVisible(false)}
          renderHeader={() => (
            <TouchableOpacity
              onPress={() => setViewerVisible(false)}
              style={{
                position: "absolute",
                top: 40,
                right: 20,
                zIndex: 10,
                padding: 10,
                backgroundColor: "rgba(0,0,0,0.5)",
                borderRadius: 20,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16 }}>✕ Close</Text>
            </TouchableOpacity>
          )}
          backgroundColor="rgba(0,0,0,0.95)"
          style={{ flex: 1 }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  premiumHeader: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    zIndex: 10,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  glassBackButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  backIcon: {
    fontSize: 28,
    color: "#1E3A8A",
    fontWeight: "300",
    marginTop: -4,
  },

  headerTitleWrapper: {
    flex: 1,
    alignItems: "center",
  },

  headerTitleText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E3A8A",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  jurisdictionPill: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },

  jurisdictionText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4338CA",
    textTransform: "uppercase",
  },

  emptyState: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 40,
  },

  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyIcon: {
    fontSize: 40,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },

  emptySub: {
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },

  noteCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  imageContainer: {
    marginBottom: 15,
  },

  noteImage: {
    width: "100%",
    height: 220,
    borderRadius: 18,
  },

  noteText: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 24,
    marginBottom: 15,
    fontWeight: "500",
  },

  dateText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "800",
    marginTop: 4,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },

  editText: {
    color: "#3B82F6",
    fontWeight: "800",
    fontSize: 12,
  },

  delText: {
    color: "#EF4444",
    fontWeight: "800",
    fontSize: 12,
  },

  composer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  cameraButton: {
    padding: 4,
  },

  inputWrapper: {
    flex: 1,
  },

  noteInput: {
    backgroundColor: "#0B0F19",
    color: "#F8FAFC",
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    maxHeight: 100,
    minHeight: 50,
  },

  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },

  previewThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 10,
  },

  // IMAGE VIEWER – full screen background
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },

  closeViewerBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },

  fullImage: {
    width: "95%",
    height: "80%",
  },
});
