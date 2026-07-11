import React from "react";
import { useTheme } from "../theme/ThemeContext";
import LegalInput from "../components/LegalInput";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { countryCurrencyMap } from "../constants/currencyMap";
import LegalPicker from "../components/LegalPicker";
import { countries } from "../constants/countries";
import {
  loginUser,
  registerUser,
  resetPassword,
} from "../services/authService";
import { createUserProfile, getUserProfile } from "../services/userService";

export default function LoginScreen({ onLoginSuccess }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const insets = useSafeAreaInsets();

  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");

  const [countryCode, setCountryCode] = useState("PK");
  const [country, setCountry] = useState(null);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const handleForgotPassword = async () => {
    if (!email || !email.includes("@")) {
      Alert.alert("Invalid Email", "Enter your registered email first.");
      return;
    }

    try {
      setLoading(true);

      await resetPassword(email.trim());

      Alert.alert(
        "Reset Email Sent",
        "Check your email (and spam folder) to reset your password.",
      );
    } catch (e) {
      console.log("Reset error:", e);
      Alert.alert("Error", e.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };
  // =============================
  // 🔐 HANDLE LOGIN / REGISTER
  // =============================
  const handleSubmit = async () => {
    if (!email.includes("@")) {
      Alert.alert("Invalid Email", "Enter a valid email address.");
      return;
    }

    if (password.length < 4) {
      Alert.alert("Weak Password", "Password must be at least 4 characters.");
      return;
    }

    try {
      setLoading(true);

      // =============================
      // 🟢 REGISTER (LAWYER ONLY)
      // =============================
      if (isRegister) {
        const user = await registerUser(email, password);

        await AsyncStorage.setItem("isLoggedIn", "true");
        await AsyncStorage.setItem("uid", user.uid);

        await createUserProfile(user.uid, {
          name,
          email,
          mobile,
          role: "lawyer", // 🔥 FIXED
          country: country?.name || "Pakistan",
          currency: countryCurrencyMap[country?.code] || "PKR",
          jurisdiction: country?.name || "Pakistan",
        });

        Alert.alert("Success", "Advocate account created successfully");

        onLoginSuccess && onLoginSuccess(user, { role: "lawyer" });

        setName("");
        setEmail("");
        setPassword("");
        setMobile("");
        setIsRegister(false);
      }

      // =============================
      // 🔵 LOGIN
      // =============================
      else {
        const user = await loginUser(email.trim(), password.trim());

        let profile = await getUserProfile(user.uid);

        if (!profile) {
          const newProfile = {
            name: user.email?.split("@")[0] || "Advocate",
            email: user.email,
            role: "lawyer",
            createdAt: new Date(),
          };

          await createUserProfile(user.uid, newProfile);
          profile = newProfile;
        }

        onLoginSuccess && onLoginSuccess(user, profile);
      }
    } catch (e) {
      console.log("Auth error:", e);
      Alert.alert("Error", e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* HEADER */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.brandIcon}>⚖️</Text>
        <Text style={styles.mainTitle}>LegalSphere</Text>
        <Text style={styles.subTitleText}>ADVOCATE PORTAL</Text>
      </View>

      <SafeAreaView style={styles.contentArea}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}>
          <View style={styles.glassCard}>
            <Text style={styles.formHeader}>
              {isRegister ? "Register Advocate" : "Login"}
            </Text>

            {/* NAME */}
            {isRegister && (
              <LegalInput
                label="Advocate Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter advocate name"
              />
            )}

            {/* COUNTRY */}
            {isRegister && (
              <View>
                <TouchableOpacity
                  style={styles.pickerWrapper}
                  activeOpacity={0.85}
                  onPress={() => setCountryPickerVisible(true)}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {countries.find((c) => c.code === countryCode)?.name ||
                      "Select Country"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {isRegister && (
              <LegalInput
                label="Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
              />
            )}
            {/* EMAIL */}
            <LegalInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email"
              keyboardType="email-address"
            />

            {/* PASSWORD */}
            <LegalInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
            />
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text
                style={{
                  color: colors.text,
                  marginTop: 10,
                  textAlign: "right",
                  fontWeight: "600",
                }}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>
            {/* BUTTON */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSubmit}
            >
              {loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.actionButtonText}>
                  {isRegister ? "REGISTER" : "LOGIN"}
                </Text>
              )}
            </TouchableOpacity>

            {/* TOGGLE */}
            <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
              <Text style={styles.toggleText}>
                {isRegister ? "Already have account? Login" : "Create Account"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <LegalPicker
          visible={countryPickerVisible}
          title="Select Country"
          selectedValue={countryCode}
          options={countries.map((c) => ({
            label: c.name,
            value: c.code,
          }))}
          onSelect={(value) => {
            setCountryCode(value);

            const selected = countries.find((c) => c.code === value);

            setCountry(selected || null);
          }}
          onClose={() => setCountryPickerVisible(false)}
        />
        <View style={styles.footer}>
          <Text style={styles.footerText}>LegalSphere ✦ AI LINKED</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.border },
  premiumHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 70,
    alignItems: "center",
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  brandBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 12,
    borderRadius: 20,
    marginBottom: 15,
  },
  brandIcon: { fontSize: 32 },
  mainTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.surface,
    letterSpacing: -0.5,
  },
  subTitleText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 2.5,
    marginTop: 4,
  },
  contentArea: { flex: 1, marginTop: -50 },
  scrollContent: { paddingBottom: 40 },
  glassCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 35,
    padding: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  formHeader: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center",
  },
  formSubHeader: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 30,
    lineHeight: 18,
  },
  inputGroup: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  pickerRow: { flexDirection: "row", alignItems: "center" },
  pickerWrapper: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,

    paddingHorizontal: 18,
    paddingVertical: Platform.OS === "ios" ? 16 : 14,

    justifyContent: "center",

    marginBottom: 15,
  },
  locationBadge: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "700",
    marginTop: 8,
    marginLeft: 6,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 15,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },
  toggleLink: { marginTop: 25, paddingVertical: 5 },
  toggleText: {
    textAlign: "center",
    color: colors.secondaryText,
    fontSize: 14,
    fontWeight: "500",
  },
  toggleBold: { color: colors.text, fontWeight: "800" },
  securityFooter: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 10,
    color: colors.placeholder,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  roleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: "center",
  },

  roleActive: {
    backgroundColor: colors.primary,
  },

  roleText: {
    fontWeight: "700",
    color: colors.text,
  },

  roleTextActive: {
    color: colors.surface,
  },
  footer: {
    marginTop: 18,
    alignItems: "center",
  },

  footerText: {
    fontSize: 11,
    color: colors.placeholder,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
});
