import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import LegalPicker from "../components/LegalPicker";
import { CMS_SYSTEMS } from "../constants/cmsSystems";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  normalizeDateInput,
  toDatePickerDate,
  toDisplay,
  toISO,
} from "../utils/date";

// ✅ SQLite services ONLY

import {
  addCaseHearing,
  addTimelineEntry,
  getMasterItems,
  getCaseById,
  getProfile,
  recalculateNextHearing,
  updateCaseNextDate,
  updateCaseNumber,
  ensureMasterItemExists,
} from "../services/sqliteService";

export default function UpdateCaseHearingScreen({ profile }) {
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const locale = currentProfile?.locale || "en-PK";
  const navigation = useNavigation();
  const route = useRoute();

  const { caseId, caseData, mode } = route.params || {};
  const isEditMode = mode === "edit";
  const insets = useSafeAreaInsets();

  // LOGIC STATES (Untouched)

  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [hearingStage, setHearingStage] = useState("");

  const [hearingCourt, setHearingCourt] = useState("");
  const [hearingJudge, setHearingJudge] = useState("");
  const [hearingDescription, setHearingDescription] = useState("");

  const [hearingNotes, setHearingNotes] = useState("");
  const [aiRawMetadata, setAiRawMetadata] = useState(null);

  const [caseStatus, setCaseStatus] = useState("active");
  const [stageList, setStageList] = useState(
    () => getMasterItems("stage") || [],
  );
  const [courtList, setCourtList] = useState(
    () => getMasterItems("court") || [],
  );
  const [judgeList, setJudgeList] = useState(
    () => getMasterItems("judge") || [],
  );
  const [descriptionList, setDescriptionList] = useState(
    () => getMasterItems("description") || [],
  );
  const [stagePickerVisible, setStagePickerVisible] = useState(false);

  const [courtPickerVisible, setCourtPickerVisible] = useState(false);

  const [judgePickerVisible, setJudgePickerVisible] = useState(false);

  const [descriptionPickerVisible, setDescriptionPickerVisible] =
    useState(false);

  const [cmsPickerVisible, setCmsPickerVisible] = useState(false);

  const [selectedCMS, setSelectedCMS] = useState(null);
  const [editableCaseNo, setEditableCaseNo] = useState(caseData?.caseNo || "");

  // ✅ Refresh master lists on focus
  useFocusEffect(
    useCallback(() => {
      try {
        const stages = getMasterItems("stage") || [];
        const courts = getMasterItems("court") || [];
        const judges = getMasterItems("judge") || [];
        const desc = getMasterItems("description") || [];

        setStageList(stages);
        setCourtList(courts);
        setJudgeList(judges);
        setDescriptionList(desc);
      } catch (e) {
        console.log("❌ Master load error:", e);
      }
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const fresh = await getProfile();
        if (fresh) setCurrentProfile(fresh);
      };
      load();
    }, []),
  );

  useEffect(() => {
    try {
      // ✅ Always load master lists
      const stages = getMasterItems("stage") || [];
      const courts = getMasterItems("court") || [];
      const judges = getMasterItems("judge") || [];
      const desc = getMasterItems("description") || [];

      setStageList(stages);
      setCourtList(courts);
      setJudgeList(judges);
      setDescriptionList(desc);

      // ✅ HANDLE EXISTING CASE DATA PROPERLY
      if (isEditMode || caseData || caseId) {
        let data = caseData;

        // 🔥 FALLBACK: fetch from DB if not passed
        if (!data && caseId) {
          data = getCaseById(caseId);
        }

        if (data) {
          setHearingStage(data.stage || "");
          setHearingCourt(data.court || "");
          setHearingJudge(data.judge || "");
          setHearingDescription(data.description || "");
          setCaseStatus(
            data.status === "archived" ? "disposed" : data.status || "active",
          );
          if (data.nextHearingISO) {
            setSelectedDate(toDatePickerDate(data.nextHearingISO));
          }

          setHearingNotes(data.notes || "");
        }
      } else {
        // ✅ ONLY reset when NOT edit mode
        setHearingStage("");
        setHearingCourt("");
        setHearingDescription("");
        setHearingNotes("");
        setSelectedDate(new Date());
      }
    } catch (e) {
      console.log("❌ UpdateHearing useEffect error:", e);
      Alert.alert("Error", "Failed to load hearing data.");
    }
  }, [caseId, caseData, isEditMode]);

  useEffect(() => {
    const aiHearingData = route?.params?.aiHearingData;

    if (!aiHearingData) return;

    // ✅ Auto Populate Master Lists
    ensureMasterItemExists("stage", aiHearingData.stage);
    ensureMasterItemExists("court", aiHearingData.court);
    ensureMasterItemExists("judge", aiHearingData.judge);
    ensureMasterItemExists("description", aiHearingData.proceeding);

    // Refresh Pickers
    setStageList(getMasterItems("stage") || []);
    setCourtList(getMasterItems("court") || []);
    setJudgeList(getMasterItems("judge") || []);
    setDescriptionList(getMasterItems("description") || []);

    setHearingStage(aiHearingData.stage || "");
    setHearingCourt(aiHearingData.court || "");
    setHearingJudge(aiHearingData.judge || "");
    setHearingDescription(aiHearingData.proceeding || "");
    setAiRawMetadata(aiHearingData.aiRawMetadata || null);

    if (aiHearingData.caseNo) {
      setEditableCaseNo(aiHearingData.caseNo);
    }

    if (aiHearingData.nextHearingDate) {
      const normalized = normalizeDateInput(aiHearingData.nextHearingDate);
      if (normalized) setSelectedDate(toDatePickerDate(normalized));
    }

    navigation.setParams({
      aiHearingData: null,
    });
  }, [route?.params?.aiHearingData]);

  const builtInCMS = CMS_SYSTEMS.filter(
    (cms) =>
      cms.country === currentProfile?.country &&
      currentProfile?.activeCMS?.includes(cms.id),
  );

  const customCMS = currentProfile?.customCMS || [];

  const availableCMS = [...builtInCMS, ...customCMS];

  useEffect(() => {
    if (availableCMS.length > 0 && !selectedCMS) {
      const foundCMS = availableCMS.find((cms) => cms.id === caseData?.cmsType);
      setSelectedCMS(foundCMS || availableCMS[0]);
    }
  }, [availableCMS, caseData, selectedCMS]);

  // ✅ Auto-select judge from route params (like AddCaseScreen)
  useEffect(() => {
    if (route?.params?.newJudge) {
      setHearingJudge(route.params.newJudge);
      navigation.setParams({ newJudge: null });
    }
  }, [route?.params?.newJudge, navigation]);

  const handleSave = () => {
    try {
      if (!selectedDate) {
        Alert.alert("Date Required", "Please select a date from the calendar.");
        return;
      }

      if (!hearingStage) {
        Alert.alert("Missing Stage", "Please select hearing stage.");
        return;
      }

      if (!hearingCourt) {
        Alert.alert("Missing Court", "Please select court.");
        return;
      }

      // 🔥 FINAL DATE FIX (NO TIMEZONE BUG EVER)
      const safeDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        12, // 👈 VERY IMPORTANT (midday fix)
      );

      const iso = toISO(safeDate);

      // ✅ SAVE HEARING
      addCaseHearing({
        caseId,
        hearingDate: iso,
        stage: hearingStage,
        court: hearingCourt,
        judge: hearingJudge,
        description: hearingDescription,
        notes: hearingNotes,
      });
      addTimelineEntry({
        caseId: String(caseId), // 🔥 IMPORTANT
        hearingDate: iso,
        stage: hearingStage,
        court: hearingCourt,
        judge: hearingJudge,
        description: hearingDescription,
        proceedings: hearingNotes, // 🔥 MAIN CONTENT
      });
      // ✅ UPDATE CASE NEXT DATE
      const finalStatus = caseStatus === "disposed" ? "archived" : caseStatus;

      updateCaseNextDate(
        caseId,
        normalizeDateInput(safeDate),
        iso,
        hearingStage,
        hearingCourt, // 🔥 ADD
        hearingJudge,
        hearingDescription, // 🔥 ADD
        finalStatus,
        aiRawMetadata,
      );
      updateCaseNumber(caseId, editableCaseNo);
      // ✅ RECALCULATE (VERY IMPORTANT)
      recalculateNextHearing(caseId);

      if (caseStatus === "disposed") {
        Alert.alert(
          "Case Disposed",
          "This case has been disposed and moved to Archive.",
        );
      } else {
        Alert.alert("Success", "Hearing record synchronized.");
      }

      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* PREMIUM WHITE HEADER */}

      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.glassBackButton}
          >
            <Ionicons name="chevron-back" size={24} color="#1A73E8" />
          </TouchableOpacity>

          <View style={styles.titleCenter}>
            <Text style={styles.headerTitleText}>
              {isEditMode ? "Update Hearing" : "Record Proceedings"}
            </Text>

            <View style={styles.jurisdictionPill}>
              <Text style={styles.jurisdictionText}>Court Hearing Ledger</Text>
            </View>
          </View>

          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* OUTCOME SELECTION */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Matter Outcome</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[
                styles.statusBtn,
                caseStatus === "active" && styles.btnActive,
              ]}
              onPress={() => setCaseStatus("active")}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  caseStatus === "active" && { color: "#1A73E8" },
                ]}
              >
                Active Diary
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                caseStatus === "disposed" && styles.btnDisposed,
              ]}
              onPress={() => setCaseStatus("disposed")}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  caseStatus === "disposed" && { color: "#DC2626" },
                ]}
              >
                Disposed / Finalized
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>CMS Workspace</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.pickerContainer}
            activeOpacity={0.85}
            onPress={() => setCmsPickerVisible(true)}
          >
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}
            >
              <Text
                style={{
                  color: selectedCMS ? "#1E293B" : "#94A3B8",
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {selectedCMS?.name || "Select CMS"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.fieldLabel}>Case Number / Court Reference</Text>

          <TextInput
            value={editableCaseNo}
            onChangeText={setEditableCaseNo}
            placeholder="e.g. Crl Appeal 245/2026"
            placeholderTextColor="#94A3B8"
            style={styles.premiumInput}
          />
        </View>

        {/* DATE SECTION */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Scheduling</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>
            {caseStatus === "disposed"
              ? "Effective Disposal Date"
              : "Next Adjourned Date"}
          </Text>

          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.dateRow}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#1A73E8"
                style={{ marginRight: 10 }}
              />

              <Text
                style={[
                  styles.dateValue,
                  !selectedDate && {
                    color: "#94A3B8",
                  },
                ]}
              >
                {selectedDate
                  ? toDisplay(selectedDate, locale)
                  : "Tap to select from calendar"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* PROCEEDINGS DETAIL */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bench & Stage</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Hearing Stage</Text>

            <TouchableOpacity
              style={styles.pickerContainer}
              activeOpacity={0.85}
              onPress={() => setStagePickerVisible(true)}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                }}
              >
                <Text
                  style={{
                    color: hearingStage ? "#1E293B" : "#94A3B8",
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {hearingStage || "Identify Stage"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Proceeding</Text>

            <TouchableOpacity
              style={styles.pickerContainer}
              activeOpacity={0.85}
              onPress={() => setDescriptionPickerVisible(true)}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                }}
              >
                <Text
                  style={{
                    color: hearingDescription ? "#1E293B" : "#94A3B8",
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {hearingDescription || "Select Proceeding"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Adjudicating Court</Text>

            <TouchableOpacity
              style={styles.pickerContainer}
              activeOpacity={0.85}
              onPress={() => setCourtPickerVisible(true)}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                }}
              >
                <Text
                  style={{
                    color: hearingCourt ? "#1E293B" : "#94A3B8",
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {hearingCourt || "Confirm Court"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ✅ UPDATED JUDGE PICKER WITH "+ Add New" */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Judge</Text>

            <TouchableOpacity
              style={styles.pickerContainer}
              activeOpacity={0.85}
              onPress={() => setJudgePickerVisible(true)}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                }}
              >
                <Text
                  style={{
                    color: hearingJudge ? "#1E293B" : "#94A3B8",
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {hearingJudge || "Select Judge"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* RESULTS / NOTES */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Proceedings Record</Text>
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.premiumMultiline}
            placeholder="Record specific court directions or orders passed today..."
            placeholderTextColor="#94A3B8"
            value={hearingNotes}
            onChangeText={setHearingNotes}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={{ marginTop: 10 }}>
          <TouchableOpacity
            style={[
              styles.mainSaveBtn,
              (!hearingStage || !hearingCourt || !selectedDate) && {
                opacity: 0.5,
              },
            ]}
            onPress={handleSave}
            disabled={!hearingStage || !hearingCourt || !selectedDate}
          >
            <Text style={styles.saveBtnText}>
              {isEditMode ? "UPDATE PROCEEDINGS" : "SAVE PROCEEDINGS"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.discardBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.discardBtnText}>Discard Entries</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(e, d) => {
              setShowDatePicker(false);
              if (d && !isNaN(d.getTime())) {
                setSelectedDate(toDatePickerDate(d));
              }
            }}
          />
        )}

        {/* ✅ UPDATED STAGE PICKER WITH "+ Add New" */}
        <LegalPicker
          visible={stagePickerVisible}
          title="Select Hearing Stage"
          selectedValue={hearingStage}
          options={[
            ...stageList.map((i) => ({
              label: i.value,
              value: i.value,
            })),
            {
              label: "+ Add New Stage",
              value: "__add_stage__",
            },
          ]}
          onSelect={(value) => {
            if (value === "__add_stage__") {
              navigation.navigate("Masters", {
                type: "stage",
                returnTo: "UpdateCaseHearing",
              });
            } else {
              setHearingStage(String(value));
            }
          }}
          onClose={() => setStagePickerVisible(false)}
        />

        {/* ✅ UPDATED COURT PICKER WITH "+ Add New" */}
        <LegalPicker
          visible={courtPickerVisible}
          title="Select Court"
          selectedValue={hearingCourt}
          options={[
            ...courtList.map((i) => ({
              label: i.value,
              value: i.value,
            })),
            {
              label: "+ Add New Court",
              value: "__add_court__",
            },
          ]}
          onSelect={(value) => {
            if (value === "__add_court__") {
              navigation.navigate("Masters", {
                type: "court",
                returnTo: "UpdateCaseHearing",
              });
            } else {
              setHearingCourt(String(value));
            }
          }}
          onClose={() => setCourtPickerVisible(false)}
        />

        {/* ✅ ADDED JUDGE PICKER WITH "+ Add New" */}
        <LegalPicker
          visible={judgePickerVisible}
          title="Select Judge"
          selectedValue={hearingJudge}
          options={[
            ...judgeList.map((i) => ({
              label: i.value,
              value: i.value,
            })),
            {
              label: "+ Add New Judge",
              value: "__add_judge__",
            },
          ]}
          onSelect={(value) => {
            if (value === "__add_judge__") {
              navigation.navigate("Masters", {
                type: "judge",
                returnTo: "UpdateCaseHearing",
              });
            } else {
              setHearingJudge(String(value));
            }
          }}
          onClose={() => setJudgePickerVisible(false)}
        />

        {/* ✅ UPDATED DESCRIPTION PICKER WITH "+ Add New" */}
        <LegalPicker
          visible={descriptionPickerVisible}
          title="Select Proceeding"
          selectedValue={hearingDescription}
          options={[
            ...descriptionList.map((i) => ({
              label: i.value,
              value: i.value,
            })),
            {
              label: "+ Add New Proceeding",
              value: "__add_description__",
            },
          ]}
          onSelect={(value) => {
            if (value === "__add_description__") {
              navigation.navigate("Masters", {
                type: "description",
                returnTo: "UpdateCaseHearing",
              });
            } else {
              setHearingDescription(String(value));
            }
          }}
          onClose={() => setDescriptionPickerVisible(false)}
        />

        <LegalPicker
          visible={cmsPickerVisible}
          title="Select CMS System"
          selectedValue={selectedCMS?.id || ""}
          options={availableCMS.map((cms) => ({
            label: cms.name,
            value: cms.id,
          }))}
          onSelect={(value) => {
            const found = availableCMS.find((c) => c.id === value);
            setSelectedCMS(found);
          }}
          onClose={() => setCmsPickerVisible(false)}
        />
      </ScrollView>

      <Pressable
        onPress={() => {
          if (!selectedCMS?.url) {
            Alert.alert(
              "CMS Required",
              "Please select a CMS first to access the legal browser.",
            );
            return;
          }

          navigation.navigate("LegalBrowser", {
            url: selectedCMS.url,
            title: selectedCMS.name || "Legal Browser",
            aiMode: "syncHearing",
            caseId,
            caseData,
          });
        }}
        style={({ pressed }) => [
          styles.fabContainer,
          pressed && styles.fabPressed,
        ]}
      >
        <LinearGradient
          colors={["#1e3a8a", "#0f172a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiFab}
        >
          <View style={styles.innerBorder} />
          <Ionicons name="sparkles-outline" size={24} color="#e2e8f0" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#F1F5F9" },

  // Header

  premiumHeader: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#1A73E8",
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
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  backIcon: {
    fontSize: 28,
    color: "#1A73E8",
    fontWeight: "300",
    marginTop: -4,
  },

  titleCenter: { flex: 1, alignItems: "center" },

  headerTitleText: { fontSize: 18, fontWeight: "700", color: "#1A73E8" },

  jurisdictionPill: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },

  jurisdictionText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4338CA",
    textTransform: "uppercase",
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 25 },

  // Section Structure

  sectionHeader: { marginBottom: 12, paddingLeft: 5 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 0,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A73E8",
    marginBottom: 12,
    opacity: 0.6,
  },

  // Status Toggle

  statusRow: { flexDirection: "row", gap: 10 },

  statusBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  btnActive: {
    backgroundColor: "rgba(26, 115, 232, 0.1)",
    borderColor: "#1A73E8",
  },

  btnDisposed: {
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    borderColor: "#DC2626",
  },

  statusBtnText: { color: "#64748B", fontWeight: "700", fontSize: 13 },

  textWhite: { color: "#FFFFFF" },

  // Inputs & Selectors

  dateSelector: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  dateRow: { flexDirection: "row", alignItems: "center" },

  calendarEmoji: { fontSize: 18, marginRight: 10 },

  dateValue: { fontSize: 15, fontWeight: "600", color: "#1E293B" },

  inputGroup: { marginBottom: 18 },

  pickerContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  premiumMultiline: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    fontSize: 15,
    color: "#1E293B",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // Final Actions

  mainSaveBtn: {
    backgroundColor: "#1A73E8",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 40,
    shadowColor: "#1A73E8",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  saveBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },

  discardBtn: {
    marginTop: 15,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  discardBtnText: { color: "#94A3B8", fontSize: 14, fontWeight: "700" },

  premiumInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  fabContainer: {
    position: "absolute",
    right: 24,
    bottom: 110,
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  aiFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    margin: 1,
  },

  fabPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
});
