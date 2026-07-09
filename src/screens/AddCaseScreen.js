import LegalInput from "../components/LegalInput";
import { useTheme } from "../contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import LegalPicker from "../components/LegalPicker";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";
import { CMS_SYSTEMS } from "../constants/cmsSystems";
import {
  getAllClients,
  getMasterItems,
  insertCase,
  getProfile,
  ensureMasterItemExists,
} from "../services/sqliteService";
import { formatMoney, getCurrency, getLocale } from "../utils/currency";
import { normalizeDateInput, toDatePickerDate, toISO } from "../utils/date";
export default function AddCaseScreen({ route, profile }) {
  const { resolvedTheme: theme } = useTheme();
  const [court, setCourt] = useState("");
  const [courtPickerVisible, setCourtPickerVisible] = useState(false);
  const [judgePickerVisible, setJudgePickerVisible] = useState(false);
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [stagePickerVisible, setStagePickerVisible] = useState(false);
  const [descriptionPickerVisible, setDescriptionPickerVisible] =
    useState(false);
  const [caseTypePickerVisible, setCaseTypePickerVisible] = useState(false);
  const [domainPickerVisible, setDomainPickerVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [caseNo, setCaseNo] = useState("");
  const [nextHearingDate, setNextHearingDate] = useState("");
  const [stage, setStage] = useState("");
  const [feeDecided, setFeeDecided] = useState("");
  const [feePaid, setFeePaid] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const navigation = useNavigation();
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const [cmsPickerVisible, setCmsPickerVisible] = useState(false);
  const [selectedCMS, setSelectedCMS] = useState(null);
  useEffect(() => {
    const loadProfile = async () => {
      const fresh = await getProfile();

      if (fresh) {
        setCurrentProfile(fresh);
      }
    };

    loadProfile();
  }, []);
  // 🔹 Load clients

  useEffect(() => {
    if (route?.params?.newClientId) {
      setSelectedClient(String(route.params.newClientId));

      // 🔥 CLEAR PARAM AFTER USE (IMPORTANT)
      navigation.setParams({ newClientId: null });
    }
  }, [route?.params?.newClientId, navigation]);
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      const data = getAllClients();
      setClients(data);
    });

    return unsubscribe;
  }, [navigation]);
  useEffect(() => {
    const data = getAllClients();
    setClients(data);
  }, [route?.params?.refresh]);
  // 🔹 Auto-fill selected client (FINAL FIX)
  useEffect(() => {
    const selected = clients.find(
      (c) => String(c.id) === String(selectedClient),
    );

    if (selected) {
      setClientName(selected.name || "");
      setClientMobile(selected.mobile || "");
      setClientEmail(selected.email || "");
    }
  }, [selectedClient, clients]); // ✅ FIXED
  const passedClient = route?.params?.client;
  useEffect(() => {
    if (passedClient) {
      setSelectedClient(String(passedClient.id));
      setClientName(passedClient.name || "");
      setClientMobile(passedClient.mobile || "");
      setClientEmail(passedClient.email || "");
    }
  }, [passedClient]);
  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [status, setStatus] = useState("active");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");
  const [judge, setJudge] = useState("");
  const [aiRawMetadata, setAiRawMetadata] = useState(null);
  const [caseType, setCaseType] = useState("");
  const [representingSide, setRepresentingSide] = useState("");
  const [opposingCounsel, setOpposingCounsel] = useState("");
  const [institutionDate, setInstitutionDate] = useState("");
  const [sourceSystem, setSourceSystem] = useState("");
  const [location, setLocation] = useState("");
  const [firNo, setFirNo] = useState("");
  const [firDate, setFirDate] = useState("");
  const [litigationDomain, setLitigationDomain] = useState("civil");
  const [courts, setCourts] = useState(() => getMasterItems("court") || []);

  const [judges, setJudges] = useState(() => getMasterItems("judge") || []);

  const [stages, setStages] = useState(() => getMasterItems("stage") || []);

  const [caseTypes, setCaseTypes] = useState(
    () => getMasterItems("caseType") || [],
  );

  const [descriptions, setDescriptions] = useState(
    () => getMasterItems("description") || [],
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObject, setDateObject] = useState(new Date());

  const currency = getCurrency(profile);
  const locale = getLocale(profile);
  const builtInCMS = CMS_SYSTEMS.filter(
    (cms) =>
      cms.country === currentProfile?.country &&
      currentProfile?.activeCMS?.includes(cms.id),
  );

  const customCMS = currentProfile?.customCMS || [];

  const availableCMS = [...builtInCMS, ...customCMS];
  const parseCurrency = (value) => {
    return parseInt(value || "0", 10) || 0;
  };
  const feeBalance = useMemo(() => {
    if (!feeDecided && !feePaid) return 0;
    const decided = parseCurrency(feeDecided);
    const paid = parseCurrency(feePaid);
    return decided - paid;
  }, [feeDecided, feePaid]);
  useEffect(() => {
    if (availableCMS.length > 0 && !selectedCMS) {
      setSelectedCMS(availableCMS[0]);
    }
  }, [availableCMS]);
  const validateDate = (value) => {
    const regex = /^(0[1-9]|[12][0-9]|3[01])[\/-](0[1-9]|1[0-2])[\/-]\d{4}$/;

    return regex.test(value);
  };
  const normalizeDate = (dateString) => {
    return normalizeDateInput(dateString);
  };
  const resetForm = () => {
    setCourt("");
    setTitle("");
    setOpponent("");
    setCaseNo("");
    setDescription("");
    setJudge("");
    setAiRawMetadata(null);
    setCaseType("");
    setRepresentingSide("");
    setOpposingCounsel("");
    setInstitutionDate("");
    setSourceSystem("");
    setLocation("");
    setNextHearingDate("");
    setStage("");
    setFeeDecided("");
    setFeePaid("");

    setSelectedClient(null); // ✅ ADD THIS

    setClientName("");
    setClientMobile("");
    setClientEmail("");

    setUrgent(false);
    setStatus("active");
    setFirNo("");
    setFirDate("");
    setLitigationDomain("civil");
    setPriority("normal");
  };
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);

    if (selectedDate) {
      setDateObject(toDatePickerDate(selectedDate));
      setNextHearingDate(normalizeDateInput(selectedDate));
    }
  };
  const handleSave = async () => {
    if (!court || !title || !nextHearingDate || !stage) {
      Alert.alert(
        "Missing fields",
        "Please fill Court, Title, Case No, Hearing Date, and Stage.",
      );
      return;
    }

    if (!validateDate(nextHearingDate)) {
      Alert.alert(
        "Invalid date",
        "Please enter hearing date in DD/MM/YYYY format.",
      );
      return;
    }
    if (!selectedClient) {
      Alert.alert("Client Required", "Please select a client.");
      return;
    }
    if (litigationDomain === "criminal" && firDate && !validateDate(firDate)) {
      Alert.alert(
        "Invalid FIR Date",
        "Please enter FIR date in DD/MM/YYYY format.",
      );
      return;
    }
    try {
      setSaving(true);

      const nextHearingISO = toISO(dateObject);

      const parsedFeeDecided = parseCurrency(feeDecided);
      const parsedFeePaid = parseCurrency(feePaid);
      if (parsedFeePaid > parsedFeeDecided) {
        Alert.alert("Invalid Amount", "Paid fee cannot exceed decided fee.");
        setSaving(false);
        return;
      }
      const caseData = {
        clientName,
        clientMobile,
        clientEmail,

        title,
        opponent,
        court,
        judge,
        caseNo,

        caseType,
        stage,
        description,

        representingSide,
        opposingCounsel,

        notes,

        nextHearingDate,
        nextHearingISO,

        institutionDate,
        sourceSystem,
        location,

        urgent,
        clientId: selectedClient,
        priority,
        status,

        feeDecided: parsedFeeDecided,
        feePaid: parsedFeePaid,
        feeBalance: parsedFeeDecided - parsedFeePaid,

        litigationDomain,
        firNo,
        firDate,

        country: profile?.country || "Unknown",

        cmsType: selectedCMS?.id || null,
        cmsRawData: aiRawMetadata ? JSON.stringify(aiRawMetadata) : null,
      };

      // ✅ ALWAYS save locally
      await insertCase(caseData);

      Alert.alert("Success", "Case saved locally.");

      resetForm();
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "MainTabs",
            params: { screen: "Dashboard" },
          },
        ],
      });
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to save case.");
    } finally {
      setTimeout(() => {}, 100);
    }
  };
  useEffect(() => {
    if (route?.params?.newCourt) {
      setCourt(route.params.newCourt);
      // 🔥 VERY IMPORTANT
      navigation.setParams({ newCourt: null });
    }
  }, [route?.params?.newCourt, navigation]);
  // ✅ STAGE AUTO SELECT
  useEffect(() => {
    if (route?.params?.newJudge) {
      setJudge(route.params.newJudge);

      navigation.setParams({
        newJudge: null,
      });
    }
  }, [route?.params?.newJudge, navigation]);
  useEffect(() => {
    if (route?.params?.newStage) {
      setStage(route.params.newStage);
      navigation.setParams({ newStage: null });
    }
  }, [route?.params?.newStage, navigation]);

  // ✅ DESCRIPTION AUTO SELECT
  useEffect(() => {
    if (route?.params?.newDescription) {
      setDescription(route.params.newDescription);
      navigation.setParams({ newDescription: null });
    }
  }, [route?.params?.newDescription, navigation]);
  useEffect(() => {
    if (route?.params?.newCaseType) {
      setCaseType(route.params.newCaseType);

      navigation.setParams({
        newCaseType: null,
      });
    }
  }, [route?.params?.newCaseType, navigation]);
  useEffect(() => {
    const aiCaseData = route?.params?.aiCaseData;

    if (!aiCaseData) return;
    // 🤖 Auto Populate Master Lists

    ensureMasterItemExists("court", aiCaseData.court);

    ensureMasterItemExists("judge", aiCaseData.judge);

    ensureMasterItemExists("stage", aiCaseData.stage);

    ensureMasterItemExists("caseType", aiCaseData.caseType);

    ensureMasterItemExists("description", aiCaseData.description);
    // Refresh Pickers

    setCourts(getMasterItems("court") || []);

    setJudges(getMasterItems("judge") || []);

    setStages(getMasterItems("stage") || []);

    setCaseTypes(getMasterItems("caseType") || []);

    setDescriptions(getMasterItems("description") || []);

    setTitle(aiCaseData.title || "");

    setAiRawMetadata(aiCaseData.aiRawMetadata || null);

    setCaseNo(aiCaseData.caseNumber || aiCaseData.caseNo || "");

    setCourt(aiCaseData.court || "");

    setJudge(aiCaseData.judge || "");

    setCaseType(aiCaseData.caseType || "");

    setStage(aiCaseData.stage || "");

    setDescription(aiCaseData.description || "");

    setInstitutionDate(aiCaseData.institutionDate || "");

    setSourceSystem(aiCaseData.sourceSystem || "");

    setLocation(aiCaseData.location || "");

    if (aiCaseData.nextHearingDate) {
      const normalized = normalizeDate(aiCaseData.nextHearingDate);

      setNextHearingDate(normalized);
      setDateObject(toDatePickerDate(normalized));
    }

    navigation.setParams({
      aiCaseData: null,
    });
  }, [route?.params?.aiCaseData]);
  // reload descriptions
  useEffect(() => {
    try {
      setCourts(getMasterItems("court") || []);

      setJudges(getMasterItems("judge") || []);

      setStages(getMasterItems("stage") || []);

      setCaseTypes(getMasterItems("caseType") || []);

      setDescriptions(getMasterItems("description") || []);
    } catch (e) {
      console.log("❌ Master load error:", e);
    }
  }, []);
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setCourts(getMasterItems("court") || []);

      setJudges(getMasterItems("judge") || []);

      setStages(getMasterItems("stage") || []);

      setCaseTypes(getMasterItems("caseType") || []);

      setDescriptions(getMasterItems("description") || []);
    });

    return unsubscribe;
  }, [navigation]);
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backIconWrap}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Add Case</Text>
            <Text style={styles.headerSub}>Create a new legal matter</Text>
          </View>

          {/* Empty box to balance layout */}
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ✅ CLIENT PICKER (SEPARATE BLOCK) */}
          <TouchableOpacity
            style={styles.input}
            activeOpacity={0.85}
            onPress={() => setClientPickerVisible(true)}
          >
            <Text
              style={{
                color: selectedClient ? COLORS.text : COLORS.muted,
                fontSize: 15,
              }}
            >
              {selectedClient
                ? clients.find((c) => String(c.id) === String(selectedClient))
                    ?.name || "Select Client (Required)"
                : "Select Client (Required)"}
            </Text>
          </TouchableOpacity>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Case Information
            </Text>
            <View style={styles.aiCard}>
              <Text style={styles.aiTitle}>Import Case From CMS</Text>

              <Text style={styles.aiText}>
                Import case information directly from court CMS systems.
              </Text>

              <TouchableOpacity
                style={styles.aiButton}
                onPress={() => {
                  if (!selectedCMS?.url) {
                    Alert.alert("CMS Required", "Please select a CMS first.");
                    return;
                  }

                  navigation.navigate("LegalBrowser", {
                    url: selectedCMS.url,
                    title: selectedCMS.name || "CMS",
                    aiMode: "autofillCase",
                  });
                }}
              >
                <Text style={styles.aiButtonText}>✨ Import From CMS</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>CMS System</Text>
            <TouchableOpacity
              style={styles.input}
              activeOpacity={0.85}
              onPress={() => setCmsPickerVisible(true)}
            >
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 15,
                }}
              >
                {selectedCMS?.name || "Select CMS"}
              </Text>
            </TouchableOpacity>
            {sourceSystem ? (
              <>
                <LegalInput
                  label="Source System"
                  value={sourceSystem}
                  editable={false}
                />

                <LegalInput
                  label="Location"
                  value={location}
                  editable={false}
                />

                <LegalInput
                  label="Institution Date"
                  value={institutionDate}
                  editable={false}
                />
              </>
            ) : null}
            <Text style={styles.inputLabel}>Litigation Domain</Text>
            <TouchableOpacity
              style={styles.input}
              activeOpacity={0.85}
              onPress={() => setDomainPickerVisible(true)}
            >
              <Text
                style={{
                  color: litigationDomain ? COLORS.text : COLORS.muted,
                  fontSize: 15,
                  textTransform: "capitalize",
                }}
              >
                {litigationDomain || "Select Litigation Domain"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.inputLabel}>Court</Text>

            <TouchableOpacity
              style={styles.input}
              activeOpacity={0.85}
              onPress={() => setCourtPickerVisible(true)}
            >
              <Text
                style={{
                  color: court ? COLORS.text : COLORS.muted,
                  fontSize: 15,
                }}
              >
                {court || "Select Court"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.inputLabel}>Judge</Text>

            <TouchableOpacity
              style={styles.input}
              activeOpacity={0.85}
              onPress={() => setJudgePickerVisible(true)}
            >
              <Text
                style={{
                  color: judge ? COLORS.text : COLORS.muted,
                  fontSize: 15,
                }}
              >
                {judge || "Select Judge"}
              </Text>
            </TouchableOpacity>
            <LegalPicker
              visible={judgePickerVisible}
              title="Select Judge"
              selectedValue={judge}
              options={[
                ...judges.map((item) => ({
                  label: item.value,
                  value: item.value,
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
                    returnTo: "AddCase",
                  });
                } else {
                  setJudge(value);
                }
              }}
              onClose={() => setJudgePickerVisible(false)}
            />
            <LegalInput
              label="Parties Name (Vs)"
              value={title}
              onChangeText={setTitle}
              placeholder="Enter parties name"
            />
            <LegalInput
              label="Case Number"
              value={caseNo}
              onChangeText={setCaseNo}
              placeholder="Enter case number (optional)"
            />
            <LegalInput
              label="Representing Side"
              value={representingSide}
              onChangeText={setRepresentingSide}
              placeholder="e.g. Plaintiff, Defendant, Petitioner"
            />
            <LegalInput
              label="Opposing Counsel"
              value={opposingCounsel}
              onChangeText={setOpposingCounsel}
              placeholder="Enter opposing counsel name"
            />

            {litigationDomain === "criminal" && (
              <>
                <LegalInput
                  label="FIR Number"
                  value={firNo}
                  onChangeText={setFirNo}
                  placeholder="Enter FIR number"
                />

                <LegalInput
                  label="FIR Date"
                  value={firDate}
                  onChangeText={setFirDate}
                  placeholder="DD/MM/YYYY"
                />
              </>
            )}
            <LegalInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Write notes"
              multiline
            />

            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={{
                  color: nextHearingDate ? COLORS.text : COLORS.muted,
                }}
              >
                {nextHearingDate || "Select Next Hearing Date"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.input}
              activeOpacity={0.85}
              onPress={() => setStagePickerVisible(true)}
            >
              <Text
                style={{
                  color: stage ? COLORS.text : COLORS.muted,
                  fontSize: 15,
                }}
              >
                {stage || "Select Stage"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.inputLabel}>Proceeding</Text>

            <TouchableOpacity
              style={styles.input}
              activeOpacity={0.85}
              onPress={() => setDescriptionPickerVisible(true)}
            >
              <Text
                style={{
                  color: description ? COLORS.text : COLORS.muted,
                  fontSize: 15,
                }}
              >
                {description || "Select Proceeding"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.input}
              activeOpacity={0.85}
              onPress={() => setCaseTypePickerVisible(true)}
            >
              <Text
                style={{
                  color: caseType ? COLORS.text : COLORS.muted,
                  fontSize: 15,
                }}
              >
                {caseType || "Select Case Type"}
              </Text>
            </TouchableOpacity>

            {/* ✅ DESCRIPTION PICKER */}
          </View>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Case Priority
            </Text>

            <View style={styles.statusRow}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  priority === "normal" && styles.statusButtonActive,
                ]}
                onPress={() => setPriority("normal")}
              >
                <Text style={styles.statusButtonText}>Normal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  priority === "important" && styles.statusButtonActive,
                ]}
                onPress={() => setPriority("important")}
              >
                <Text style={styles.statusButtonText}>Important</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  priority === "urgent" && styles.statusButtonActive,
                ]}
                onPress={() => setPriority("urgent")}
              >
                <Text style={styles.statusButtonText}>Urgent</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Fee Details
            </Text>
            <LegalInput
              label="Fee Decided"
              value={feeDecided}
              onChangeText={setFeeDecided}
              placeholder="Enter fee decided"
              keyboardType="numeric"
            />

            <LegalInput
              label="Fee Paid"
              value={feePaid}
              onChangeText={setFeePaid}
              placeholder="Enter fee paid"
              keyboardType="numeric"
            />
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Fee Balance</Text>
              <Text style={styles.balanceValue}>
                {formatMoney(feeBalance, currency, locale)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Case Controls
            </Text>
            <View style={styles.rowBetween}></View>
            <Text style={styles.statusLabel}>Status</Text>
            {/* ERROR WAS HERE: Changed <div> to <View> */}
            <View style={styles.statusRow}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  status === "active" && styles.statusButtonActive,
                ]}
                onPress={() => setStatus("active")}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    status === "active" && styles.statusButtonTextActive,
                  ]}
                >
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  status === "pipeline" && styles.statusButtonActive,
                ]}
                onPress={() => setStatus("pipeline")}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    status === "pipeline" && styles.statusButtonTextActive,
                  ]}
                >
                  Pipeline
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Saving..." : "💾 Save Case"}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateObject}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
          <LegalPicker
            visible={courtPickerVisible}
            title="Select Court"
            selectedValue={court}
            options={[
              ...courts.map((item) => ({
                label: item.value,
                value: item.value,
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
                  returnTo: "AddCase",
                });
              } else {
                setCourt(value);
              }
            }}
            onClose={() => setCourtPickerVisible(false)}
          />
          <LegalPicker
            visible={clientPickerVisible}
            title="Select Client"
            selectedValue={selectedClient}
            options={[
              ...clients.map((c) => ({
                label: c.name,
                value: String(c.id),
              })),
              {
                label: "+ Add New Client",
                value: "__add_new__",
              },
            ]}
            onSelect={(value) => {
              if (value === "__add_new__") {
                setSelectedClient(null);

                navigation.navigate("AddClient", {
                  from: "AddCase",
                });
              } else {
                setSelectedClient(value);
              }
            }}
            onClose={() => setClientPickerVisible(false)}
          />
          <LegalPicker
            visible={stagePickerVisible}
            title="Select Stage"
            selectedValue={stage}
            options={[
              ...stages.map((item) => ({
                label: item.value,
                value: item.value,
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
                  returnTo: "AddCase",
                });
              } else {
                setStage(value);
              }
            }}
            onClose={() => setStagePickerVisible(false)}
          />
          <LegalPicker
            visible={descriptionPickerVisible}
            title="Select Description"
            selectedValue={description}
            options={[
              ...descriptions.map((item) => ({
                label: item.value,
                value: item.value,
              })),
              {
                label: "+ Add New Description",
                value: "__add_description__",
              },
            ]}
            onSelect={(value) => {
              if (value === "__add_description__") {
                navigation.navigate("Masters", {
                  type: "description",
                  returnTo: "AddCase",
                });
              } else {
                setDescription(value);
              }
            }}
            onClose={() => setDescriptionPickerVisible(false)}
          />
          <LegalPicker
            visible={caseTypePickerVisible}
            title="Select Case Type"
            selectedValue={caseType}
            options={[
              ...caseTypes.map((item) => ({
                label: item.value,
                value: item.value,
              })),
              {
                label: "+ Add New Case Type",
                value: "__add_caseType__",
              },
            ]}
            onSelect={(value) => {
              if (value === "__add_caseType__") {
                navigation.navigate("Masters", {
                  type: "caseType",
                  returnTo: "AddCase",
                });
              } else {
                setCaseType(value);
              }
            }}
            onClose={() => setCaseTypePickerVisible(false)}
          />
          <LegalPicker
            visible={cmsPickerVisible}
            title="Select CMS"
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
          <LegalPicker
            visible={domainPickerVisible}
            title="Select Litigation Domain"
            selectedValue={litigationDomain}
            options={[
              {
                label: "Civil",
                value: "civil",
              },
              {
                label: "Criminal",
                value: "criminal",
              },
              {
                label: "Family",
                value: "family",
              },
            ]}
            onSelect={(value) => {
              setLitigationDomain(value);

              if (value === "criminal") {
                setPriority("important");
                setStatus("active");
              }
            }}
            onClose={() => setDomainPickerVisible(false)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  keyboardWrap: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    backgroundColor: "#1E3A8A",
    borderRadius: 18,
    paddingVertical: 18, // 🔥 was 18 → smaller header height
    paddingHorizontal: 0, // 🔥 was 18 → smaller header height
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    paddingTop: 50,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  backIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16, // ⭐ ADD THIS
    marginTop: 4, // ⭐ THIS FIX
  },

  headerTextWrap: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 18, // 🔥 was 22
    fontWeight: "800",
  },

  headerSub: {
    color: COLORS.white,
    marginTop: 2,
    fontSize: 12, // 🔥 was 13
    opacity: 0.9,
  },
  card: {
    marginHorizontal: 16, // ← add this
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: "600",
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4, // 👈 FIXED (was 12)
    marginBottom: 12,
    color: COLORS.text,
  },
  multilineInput: {
    minHeight: 96,
  },
  balanceCard: {
    backgroundColor: "#F8FAFD",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  balanceLabel: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 6,
  },
  balanceValue: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "800",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  rowLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  statusLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
  },
  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  statusButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  statusButtonText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  statusButtonTextActive: {
    color: COLORS.white,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },
  aiCard: {
    backgroundColor: "#EEF4FF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D6E4FF",
  },

  aiTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E3A8A",
  },

  aiText: {
    marginTop: 4,
    color: "#475569",
    marginBottom: 12,
  },

  aiButton: {
    backgroundColor: "#1E3A8A",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#1E3A8A",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,

    elevation: 5,
  },

  aiButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
  },
});
