// screens/SettingsScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import PremiumPageHeader from '../components/PremiumPageHeader';
import LegalPicker from "../components/LegalPicker";
import LegalInput from "../components/LegalInput";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { countries } from "../constants/countries";
import { countryCurrencyMap } from "../constants/currencyMap";
import { CMS_SYSTEMS } from "../constants/cmsSystems";
import { deleteAccount } from "../services/authService";
import { auth } from "../services/firebaseConfig";
import { deleteUserFirestoreData } from "../services/firestoreDeleteService";
import { restoreAllData } from "../services/restoreService";
import {
  clearAllLocalData,
  getProfile,
  saveProfile,
} from "../services/sqliteService";
import { useTheme } from "../theme/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
export default function SettingsScreen({ navigation }) {

  const { currentTheme, setTheme, colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const insets = useSafeAreaInsets();
  const [profileReady, setProfileReady] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [clientCountryPickerVisible, setClientCountryPickerVisible] =
    useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [localePickerVisible, setLocalePickerVisible] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    jurisdiction: "",
    image: null,
    country: "PK",
    defaultClientCountry: "PK", // ✅ NEW
    currency: "PKR",
    locale: "en-PK",

    // ✅ MULTI CMS
    activeCMS: ["punjab"],
    defaultCountry: "PK",
  });
  const [customCMSName, setCustomCMSName] = useState("");
  const [customCMSUrl, setCustomCMSUrl] = useState("");
  const [researchSourceName, setResearchSourceName] = useState("");
  const [researchSourceUrl, setResearchSourceUrl] = useState("");
  // 🔹 LOAD PROFILE (WITH FIRST-RUN SAFETY)
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProfile();

        if (data) {
          setProfile(data);
        } else {
          const defaultProfile = {
            name: "",
            jurisdiction: "",
            image: null,
            country: "PK",
            defaultClientCountry: "PK",
            currency: "PKR",
            locale: "en-PK",

            // ✅ MULTI CMS
            activeCMS: ["punjab"],
            defaultCountry: "PK",
            customCMS: [],
            researchSources: [],
          };

          setProfile(defaultProfile);
          await saveProfile(defaultProfile);
        }

        setProfileReady(true); // ✅ CRITICAL
      } catch (e) {
        console.log("Profile load error", e);
      }
    };

    load();
  }, []);

  // 🔹 SAVE PROFILE
  const handleSave = async (updated) => {
    try {
      setProfile(updated);
      await saveProfile(updated);
    } catch (e) {
      console.log("Save error", e);
    }
  };

  // 🔹 IMAGE PICK
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
    });

    if (!res.canceled) {
      handleSave({ ...profile, image: res.assets[0].uri });
    }
  };

  // 🔹 COUNTRY CHANGE → AUTO CURRENCY + SAFE LOCALE
  const handleCountryChange = (countryCode) => {
    const currency = countryCurrencyMap[countryCode] || "USD";

    const localeMap = {
      PK: "en-PK",
      IN: "en-IN",
      US: "en-US",
      GB: "en-GB",
      AE: "en-AE",
    };

    const locale = localeMap[countryCode] || "en-US";

    handleSave({
      ...profile,
      country: countryCode,
      defaultCountry: countryCode,
      currency,
      locale,
    });
  };
  const availableCMS = CMS_SYSTEMS.filter(
    (cms) => cms.country === profile.country,
  );
  const toggleCMS = async (cmsId) => {
    try {
      const exists = profile.activeCMS?.includes(cmsId);

      let updatedCMS = [];

      if (exists) {
        if ((profile.activeCMS || []).length === 1) {
          Alert.alert(
            "Required",
            "At least one CMS system must remain enabled.",
          );
          return;
        }

        updatedCMS = profile.activeCMS.filter((id) => id !== cmsId);
      } else {
        updatedCMS = [...(profile.activeCMS || []), cmsId];
      }

      const updatedProfile = {
        ...profile,
        activeCMS: updatedCMS,
      };

      // ✅ UPDATE UI IMMEDIATELY
      setProfile(updatedProfile);

      // ✅ SAVE TO SQLITE
      await saveProfile(updatedProfile);

      console.log("✅ CMS Saved:", updatedProfile.activeCMS);
    } catch (e) {
      console.log("❌ CMS Toggle Error:", e);

      Alert.alert("Error", "Failed to update CMS settings.");
    }
  };
  const addCustomCMS = async () => {
    if (!customCMSName.trim() || !customCMSUrl.trim()) {
      Alert.alert("Missing Fields", "Please enter CMS name and URL.");
      return;
    }

    let cleanUrl = customCMSUrl.trim();

    if (!cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const newCMS = {
      id: `custom_${Date.now()}`,
      name: customCMSName.trim(),
      country: profile.country,
      courtType: "Custom CMS",
      url: cleanUrl,
      custom: true,
    };

    const updatedProfile = {
      ...profile,
      customCMS: [...(profile.customCMS || []), newCMS],
    };

    await handleSave(updatedProfile);

    setCustomCMSName("");
    setCustomCMSUrl("");

    Alert.alert("Success", "Custom CMS added successfully.");
  };
  const addResearchSource = async () => {
    if (!researchSourceName.trim() || !researchSourceUrl.trim()) {
      Alert.alert("Missing Fields", "Please enter source name and URL.");
      return;
    }

    let cleanUrl = researchSourceUrl.trim();

    if (!cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const newSource = {
      id: `research_${Date.now()}`,
      name: researchSourceName.trim(),
      url: cleanUrl,
    };

    const updatedProfile = {
      ...profile,
      researchSources: [...(profile.researchSources || []), newSource],
    };

    await handleSave(updatedProfile);

    setResearchSourceName("");
    setResearchSourceUrl("");

    Alert.alert("Success", "Research source added.");
  };
  return (
    <View style={styles.container}>
      <PremiumPageHeader title="Settings" subtitle="App Preferences" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={pickImage}>
            <Image
              source={
                profile.image
                  ? { uri: profile.image }
                  : require("../../assets/icon.png")
              }
              style={styles.avatar}
            />
          </TouchableOpacity>

          <Text style={styles.name}>{profile.name || "Your Name"}</Text>

          <Text style={styles.sub}>
            {profile.jurisdiction || "Add Jurisdiction"}
          </Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("LawyerProfile")}
          >
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* 🌍 GLOBAL SETTINGS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          {/* COUNTRY */}
          <View style={styles.item}>
            <Text style={styles.label}>Country</Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 6,
              }}
              onPress={() => setCountryPickerVisible(true)}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {countries.find((c) => c.code === profile.country)?.name ||
                  "Select Country"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Court CMS Systems</Text>
            <View style={{ marginTop: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 12,
                  color: colors.text,
                }}
              >
                Add Custom CMS
              </Text>

              <LegalInput
                label="CMS Name"
                value={customCMSName}
                onChangeText={setCustomCMSName}
                placeholder="Example: Dubai DIFC Courts"
              />

              <LegalInput
                label="CMS URL"
                value={customCMSUrl}
                onChangeText={setCustomCMSUrl}
                placeholder="https://examplecourt.gov"
              />

              <TouchableOpacity
                onPress={addCustomCMS}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    color: colors.surface,
                    fontWeight: "700",
                    fontSize: 15,
                  }}
                >
                  Add Custom CMS
                </Text>
              </TouchableOpacity>
            </View>
            {availableCMS.map((cms) => {
              const enabled = profile.activeCMS?.includes(cms.id);

              return (
                <TouchableOpacity
                  key={cms.id}
                  style={[
                    styles.item,
                    {
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 16,
                    },
                  ]}
                  onPress={() => toggleCMS(cms.id)}
                >
                  <Text>{cms.name}</Text>

                  <Text
                    style={{
                      color: enabled ? colors.success : colors.placeholder,
                      fontWeight: "700",
                    }}
                  >
                    {enabled ? "Enabled" : "Disabled"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal Research Sources</Text>

            <LegalInput
              label="Source Name"
              value={researchSourceName}
              onChangeText={setResearchSourceName}
              placeholder="Pakistan Law Site"
            />

            <LegalInput
              label="Source URL"
              value={researchSourceUrl}
              onChangeText={setResearchSourceUrl}
              placeholder="https://www.pakistanlawsite.com"
            />

            <TouchableOpacity
              onPress={addResearchSource}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  color: colors.surface,
                  fontWeight: "700",
                }}
              >
                Add Research Source
              </Text>
            </TouchableOpacity>

            {(profile.researchSources || []).map((source) => (
              <View key={source.id} style={styles.item}>
                <Text>{source.name}</Text>
                <Text
                  style={{
                    color: colors.secondaryText,
                    fontSize: 12,
                  }}
                >
                  {source.url}
                </Text>
              </View>
            ))}
          </View>
          {/* DEFAULT CLIENT COUNTRY */}
          <View style={styles.item}>
            <Text style={styles.label}>Default Client Country</Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 6,
              }}
              onPress={() => setClientCountryPickerVisible(true)}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {countries.find((c) => c.code === profile.defaultClientCountry)
                  ?.name || "Select Country"}
              </Text>
            </TouchableOpacity>
          </View>
          {/* CURRENCY */}
          <View style={styles.item}>
            <Text style={styles.label}>Currency</Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 6,
              }}
              onPress={() => setCurrencyPickerVisible(true)}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {profile.currency || "Select Currency"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* LOCALE */}
          <View style={styles.item}>
            <Text style={styles.label}>Date Format</Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 6,
              }}
              onPress={() => setLocalePickerVisible(true)}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {{
                  "en-PK": "Pakistan (DD/MM/YYYY)",
                  "en-IN": "India (DD/MM/YYYY)",
                  "en-GB": "UK (DD/MM/YYYY)",
                  "en-US": "USA (MM/DD/YYYY)",
                }[profile.locale] || "Select Date Format"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* APPEARANCE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.item}>
            <TouchableOpacity
              style={styles.themeRow}
              onPress={() => setTheme("light")}
            >
              <Text style={styles.themeRowText}>☀️ Light</Text>
              {currentTheme === "light" && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            <View style={styles.themeDivider} />

            <TouchableOpacity
              style={styles.themeRow}
              onPress={() => setTheme("dark")}
            >
              <Text style={styles.themeRowText}>🌙 Dark</Text>
              {currentTheme === "dark" && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            <View style={styles.themeDivider} />

            <TouchableOpacity
              style={styles.themeRow}
              onPress={() => setTheme("system")}
            >
              <Text style={styles.themeRowText}>📱 System (Recommended)</Text>
              {currentTheme === "system" && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* HELP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help</Text>

          <TouchableOpacity
            style={styles.item}
            onPress={() => Linking.openURL("mailto:support@technaam.com")}
          >
            <Text>Contact Us</Text>
          </TouchableOpacity>
        </View>
        {/* ☁️ CLOUD & BACKUP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cloud & Backup</Text>

          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              Alert.alert(
                "Restore Data",
                "This will sync your data from cloud. Continue?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Restore",
                    onPress: async () => {
                      try {
                        Alert.alert("Please wait", "Restoring data...");

                        await restoreAllData();

                        Alert.alert("Success", "Data restored successfully");
                      } catch (_e) {
                        Alert.alert("Error", "Restore failed");
                      }
                    },
                  },
                ],
              )
            }
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              🔄 Restore from Cloud
            </Text>
          </TouchableOpacity>
        </View>
        {/* DANGER */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              Alert.alert(
                "Delete Account",
                "This will permanently delete your account and all data.\n\nThis action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        console.log("🔥 FULL DELETE START");

                        const uid = auth.currentUser?.uid;

                        // 🔴 STOP SYNC
                        if (global) global.isSyncing = false;

                        // 🔥 1. DELETE FIRESTORE
                        if (uid) {
                          await deleteUserFirestoreData(uid);
                        }

                        // 🧹 2. CLEAR LOCAL SQLITE
                        await clearAllLocalData();

                        // 🧠 3. CLEAR CACHE
                        if (global?.remoteCache) {
                          Object.keys(global.remoteCache).forEach(
                            (k) => delete global.remoteCache[k],
                          );
                        }

                        // 🔐 4. DELETE AUTH USER
                        await deleteAccount();

                        // 🧠 5. CLEAR SESSION
                        await AsyncStorage.multiRemove([
                          "isLoggedIn",
                          "uid",
                          "isRestored",
                        ]);

                        console.log("✅ FULL DELETE COMPLETE");

                        Alert.alert("Deleted", "Account removed successfully");

                        // ❌ NO navigation.reset
                        // ✅ auto redirect via auth state
                      } catch (e) {
                        console.log("❌ Delete error:", e);

                        if (e.code === "auth/requires-recent-login") {
                          Alert.alert(
                            "Re-login required",
                            "Please login again and then delete account.",
                          );
                        } else {
                          Alert.alert("Error", "Failed to delete account.");
                        }
                      }
                    },
                  },
                ],
              )
            }
          >
            <Text style={{ color: "red" }}>Delete Account</Text>
          </TouchableOpacity>
        </View>
        {/* 🔐 SIGN OUT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() =>
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign Out",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await AsyncStorage.multiRemove([
                        "isLoggedIn",
                        "uid",
                        "isRestored",
                      ]);

                      // 🔐 Firebase sign out
                      await auth.signOut();

                      console.log("✅ User signed out");
                    } catch (e) {
                      console.log("❌ Logout error:", e);
                      Alert.alert("Error", "Failed to sign out.");
                    }
                  },
                },
              ])
            }
          >
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <LegalPicker
        visible={countryPickerVisible}
        title="Select Country"
        selectedValue={profile.country}
        options={countries.map((c) => ({
          label: c.name,
          value: c.code,
        }))}
        onSelect={(value) => {
          handleCountryChange(value);
        }}
        onClose={() => setCountryPickerVisible(false)}
      />
      <LegalPicker
        visible={clientCountryPickerVisible}
        title="Default Client Country"
        selectedValue={profile.defaultClientCountry}
        options={countries.map((c) => ({
          label: c.name,
          value: c.code,
        }))}
        onSelect={(value) => {
          handleSave({
            ...profile,
            defaultClientCountry: value,
          });
        }}
        onClose={() => setClientCountryPickerVisible(false)}
      />
      <LegalPicker
        visible={currencyPickerVisible}
        title="Select Currency"
        selectedValue={profile.currency}
        options={[
          { label: "PKR", value: "PKR" },
          { label: "USD", value: "USD" },
          { label: "AED", value: "AED" },
          { label: "GBP", value: "GBP" },
          { label: "INR", value: "INR" },
          { label: "EUR", value: "EUR" },
        ]}
        onSelect={(value) => {
          handleSave({
            ...profile,
            currency: value,
          });
        }}
        onClose={() => setCurrencyPickerVisible(false)}
      />
      <LegalPicker
        visible={localePickerVisible}
        title="Select Date Format"
        selectedValue={profile.locale}
        options={[
          {
            label: "Pakistan (DD/MM/YYYY)",
            value: "en-PK",
          },
          {
            label: "India (DD/MM/YYYY)",
            value: "en-IN",
          },
          {
            label: "UK (DD/MM/YYYY)",
            value: "en-GB",
          },
          {
            label: "USA (MM/DD/YYYY)",
            value: "en-US",
          },
        ]}
        onSelect={(value) => {
          handleSave({
            ...profile,
            locale: value,
          });
        }}
        onClose={() => setLocalePickerVisible(false)}
      />
    </View>
  );
}
const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  premiumHeader: {
    backgroundColor: colors.surface,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: colors.primary,
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
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  backIcon: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: "300",
    marginTop: -4,
  },

  titleCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerTitleText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },

  jurisdictionPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },

  jurisdictionText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
  },
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    alignItems: "center",
    paddingBottom: 20,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
  },

  name: {
    fontSize: 18,
    fontWeight: "600",
  },

  sub: {
    color: colors.secondaryText,
    marginBottom: 10,
  },

  editBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },

  editText: { color: colors.surface },

  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontWeight: "600",
    marginBottom: 10,
  },

  item: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 10,
  },

  label: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 10,
    marginLeft: 5,
  },
  themeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 5,
  },
  themeRowText: {
    fontSize: 15,
  },
  themeDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  logoutBtn: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  logoutBtnText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 15,
  },
});
