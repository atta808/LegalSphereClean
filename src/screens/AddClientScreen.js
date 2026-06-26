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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { countries } from "../constants/countries";
import { phoneCodeMap } from "../constants/phoneCodeMap";
import { getProfile, insertClient } from "../services/sqliteService";
import { getWhatsAppLink } from "../utils/phone";

export default function AddClientScreen({ onBack, onSaved }) {
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
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.title}>Add Client</Text>
          <Text style={styles.subtitle}>Client Registration</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* NAME */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Client Name</Text>

            <TouchableOpacity onPress={handlePickContact} activeOpacity={0.7}>
              <Text style={styles.contactImportText}>Import from Contacts</Text>
            </TouchableOpacity>
          </View>
          <LegalInput
            label="Client Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
          />
        </View>

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
              style={{
                color: country ? "#0F172A" : "#64748B",
                fontSize: 15,
              }}
            >
              {countries.find((c) => c.code === country)?.name ||
                "Select Country"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* MOBILE */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Mobile Number *{"\n"}(Used for WhatsApp & Call)
          </Text>

          {/* Show country code */}
          <Text style={styles.codeText}>{phoneCodeMap[country] || "+1"}</Text>

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
        </View>
        <Text style={{ fontSize: 13, color: "#ab130e", marginTop: 4 }}>
          Country code is added automatically
        </Text>
        {/* EMAIL */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email (Optional)</Text>
          <LegalInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
          />
        </View>

        {/* WHATSAPP */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.waBtn} onPress={handleWhatsApp}>
            <Text style={styles.waText}>💬 WhatsApp Ready</Text>
          </TouchableOpacity>
        </View>

        {/* SAVE */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveOnly}>
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

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  header: {
    backgroundColor: "#FFF",
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    fontSize: 26,
    color: "#1E3A8A",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E3A8A",
  },

  subtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },

  container: {
    padding: 20,
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
    fontWeight: "800",
    color: "#1E3A8A",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  codeText: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 5,
    color: "#1E3A8A",
  },

  quickActions: {
    marginTop: 10,
    marginBottom: 25,
  },

  waBtn: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  waText: {
    color: "#FFF",
    fontWeight: "700",
  },

  saveBtn: {
    backgroundColor: "#1E3A8A",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },

  saveText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 14,
  },
});
