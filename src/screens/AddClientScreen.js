import React from "react";
import { useTheme } from "../theme/ThemeContext";
import LegalInput from "../components/LegalInput";
import LegalPicker from "../components/LegalPicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import * as Contacts from "expo-contacts";
import {
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { countries } from "../constants/countries";
import { phoneCodeMap } from "../constants/phoneCodeMap";
import { getProfile, insertClient } from "../services/sqliteService";
import { getWhatsAppLink } from "../utils/phone";

export default function AddClientScreen({ onBack, onSaved }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("PK");
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  useEffect(() => {
    const loadDefaultCountry = async () => {
      try {
        const profile = await getProfile();

        let finalCountry = "PK";

        if (profile?.defaultClientCountry) {
          finalCountry = profile.defaultClientCountry;
        } else if (profile?.country) {
          finalCountry = profile.country;
        }

        setCountry(finalCountry);
        setIsReady(true); // ✅ CRITICAL
      } catch (e) {
        console.log("Load country error", e);
        setIsReady(true);
      }
    };

    loadDefaultCountry();
  }, []);
  // 🔹 IMPORT FROM CONTACTS
  const handlePickContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow contacts permission.");
        return;
      }

      const contact = await Contacts.presentContactPickerAsync();

      if (!contact) return;

      // ✅ NAME
      setName(contact.name || "");

      // ✅ MOBILE
      if (contact.phoneNumbers?.length > 0) {
        let phone = contact.phoneNumbers[0].number || "";

        // remove spaces/symbols
        phone = phone.replace(/[^\d]/g, "");

        // remove country code if duplicated
        const code = (phoneCodeMap[country] || "+1").replace("+", "");

        if (phone.startsWith(code)) {
          phone = phone.slice(code.length);
        }

        // remove leading zeros
        phone = phone.replace(/^0+/, "");

        setMobile(phone);
      }

      // ✅ EMAIL
      if (contact.emails?.length > 0) {
        setEmail(contact.emails[0].email || "");
      }
    } catch (e) {
      console.log("❌ Contact picker error:", e);

      Alert.alert("Error", "Failed to import contact.");
    }
  };
  // 🔹 SAVE CLIENT
  const handleSaveOnly = () => {
    if (!name.trim() || !mobile.trim()) {
      Alert.alert("Missing Fields", "Name and mobile number are required.");
      return;
    }

    try {
      const code = phoneCodeMap[country] || "+1";

      // clean input (remove spaces etc.)
      let clean = mobile.replace(/[^\d]/g, "");

      // remove leading zero (PK, IN etc.)
      clean = clean.replace(/^0+/, "");

      const fullNumber = code + clean;

      const newId = insertClient({
        name: name.trim(),
        mobile: fullNumber, // ✅ FIXED
        email: email.trim(),
        country: country,
      });

      Alert.alert("Success", "Client added successfully.");

      const from = route?.params?.from;

      if (from === "AddCase") {
        navigation.replace("AddCase", {
          newClientId: newId,
          refresh: true,
        });
      } else {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };
  // 🔹 WHATSAPP
  const handleWhatsApp = () => {
    if (!mobile) return;

    const code = phoneCodeMap[country] || "+1";
    let clean = mobile.replace(/[^\d]/g, "");
    clean = clean.replace(/^0+/, "");

    const fullNumber = code + clean;

    const url = getWhatsAppLink(fullNumber);
    Linking.openURL(url);
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" translucent />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => {
            if (onBack) {
              onBack();
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.title}>Add Client</Text>
          <Text style={styles.subtitle}>Client Registration</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity
              onPress={handlePickContact}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 8,
                margin: -8,
              }}
            >
              <Ionicons
                name="person-add"
                size={14}
                color={colors.primary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.contactImportText}>Import</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <LegalInput
              label="Client Name *"
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          {/* COUNTRY */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <TouchableOpacity
              style={[styles.input, !isReady && { opacity: 0.5 }]}
              activeOpacity={0.85}
              disabled={!isReady}
              onPress={() => setCountryPickerVisible(true)}
            >
              <Text
                style={{ color: country ? colors.text : colors.secondaryText, fontSize: 15 }}
              >
                {countries.find((c) => c.code === country)?.name ||
                  "Select Country"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* MOBILE */}
          <View style={styles.inputGroup}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                marginBottom: 8,
              }}
            >
              <Text style={[styles.label, { marginBottom: 0 }]}>
                Mobile Number *{" "}
              </Text>
              <Text style={styles.codeText}>
                ({phoneCodeMap[country] || "+1"})
              </Text>
            </View>
            <LegalInput
              label="Mobile Number"
              value={mobile}
              placeholder="Enter mobile number"
              keyboardType="phone-pad"
              onChangeText={(text) => {
                let clean = text.replace(/[^\d]/g, "");
                if (clean.length > 15) return;
                setMobile(clean);
              }}
            />
            <Text
              style={{
                fontSize: 12,
                color: colors.secondaryText,
                marginTop: 6,
                fontStyle: "italic",
              }}
            >
              Used for WhatsApp & Call. Country code added automatically.
            </Text>
          </View>

          {/* EMAIL */}
          <View style={styles.inputGroup}>
            <LegalInput
              label="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Communication</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.waBtn} onPress={handleWhatsApp}>
              <Ionicons
                name="logo-whatsapp"
                size={18}
                color={colors.surface}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.waText}>WhatsApp Ready</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SAVE */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveOnly}>
          <Ionicons
            name="save"
            size={18}
            color={colors.surface}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.saveText}>Save Client</Text>
        </TouchableOpacity>

        <LegalPicker
          visible={countryPickerVisible}
          title="Select Country"
          selectedValue={country}
          options={countries.map((c) => ({
            label: c.name,
            value: c.code,
          }))}
          onSelect={(value) => {
            setCountry(value);
          }}
          onClose={() => setCountryPickerVisible(false)}
        />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.border,
  },

  header: {
    backgroundColor: colors.surface,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    fontSize: 26,
    color: colors.primary,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },

  subtitle: {
    fontSize: 10,
    color: colors.secondaryText,
    marginTop: 2,
    fontWeight: "500",
  },

  container: {
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },

  inputGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  contactImportText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondaryText,
    marginBottom: 8,
  },

  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },

  codeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },

  quickActions: {
    marginTop: 10,
    marginBottom: 25,
  },

  waBtn: {
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minHeight: 48,
  },

  waText: {
    color: colors.surface,
    fontWeight: "700",
  },

  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 40,
  },

  saveText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 16,
  },
});
