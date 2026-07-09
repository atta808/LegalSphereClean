// screens/LawyerProfileScreen.js
import LegalInput from "../components/LegalInput";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { useTheme } from '../theme/ThemeContext';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getProfile, saveProfile } from "../services/sqliteService";

export default function LawyerProfileScreen({ navigation }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState({
    name: "",
    court: "",
    phone: "",
    email: "",
    image: null,
    links: {},
  });

  // ✅ LOAD PROFILE
  useEffect(() => {
    const loadProfile = async () => {
      const savedData = await getProfile();
      if (savedData) {
        setProfile({
          name: savedData.name || "",
          court: savedData.jurisdiction || "",
          phone: savedData.phone || "",
          email: savedData.email || "",
          image: savedData.image || null,
          links: savedData.links || {},
        });
      }
    };
    loadProfile();
  }, []);

  // ✅ IMAGE PICK
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfile({ ...profile, image: result.assets[0].uri });
    }
  };

  // ✅ SAVE PROFILE
  const save = async () => {
    try {
      const existing = await getProfile();

      const updatedProfile = {
        ...existing,
        name: profile.name,
        jurisdiction: profile.court,
        phone: profile.phone,
        email: profile.email,
        image: profile.image,
        links: profile.links,
        updatedAt: Date.now(),
      };

      await saveProfile(updatedProfile);

      Alert.alert("Success", "Profile updated successfully!");
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to save profile.");
    }
  };

  // ✅ SOCIAL INPUT COMPONENT
  const SocialInput = ({ icon, label, value, keyName, color }) => (
    <View style={styles.inputWrapper}>
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={color}
        style={styles.fieldIcon}
      />
      <LegalInput
        label={label}
        value={value || ""}
        onChangeText={(t) =>
          setProfile({
            ...profile,
            links: { ...profile.links, [keyName]: t },
          })
        }
        placeholder={`Enter ${label} URL`}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.mainWrapper}>
        {/* HEADER */}
        <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.glassBackButton}
            >
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>

            <View style={styles.titleCenter}>
              <Text style={styles.headerTitleText}>Professional Profile</Text>

              <View style={styles.jurisdictionPill}>
                <Text style={styles.jurisdictionText}>Advocate Identity</Text>
              </View>
            </View>

            <View style={{ width: 44 }} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* IMAGE */}
          <View style={styles.imageSection}>
            <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
              {profile.image ? (
                <Image
                  source={{ uri: profile.image }}
                  style={styles.profileImg}
                />
              ) : (
                <View style={styles.placeholderImg}>
                  <Ionicons name="person" size={50} color={colors.disabled} />
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={18} color={colors.surface} />
              </View>
            </TouchableOpacity>
          </View>

          {/* PERSONAL DETAILS */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Personal Details</Text>

            <LegalInput
              label="Name"
              value={profile.name}
              onChangeText={(t) => setProfile({ ...profile, name: t })}
              placeholder="Enter name"
            />

            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={20} color={colors.secondaryText} />
              <LegalInput
                label="Legal Title"
                value={profile.court}
                onChangeText={(t) => setProfile({ ...profile, court: t })}
                placeholder="Enter legal title"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color={colors.secondaryText} />
              <LegalInput
                label="Phone Number"
                value={profile.phone}
                onChangeText={(t) => setProfile({ ...profile, phone: t })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={colors.secondaryText} />
              <LegalInput
                label="Email Address"
                value={profile.email}
                onChangeText={(t) => setProfile({ ...profile, email: t })}
                placeholder="Enter email"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* SOCIAL LINKS */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Professional Links</Text>

            <SocialInput
              icon="google-maps"
              label="Google Map Location"
              keyName="map"
              value={profile.links?.map}
              color={colors.danger}
            />

            <SocialInput
              icon="web"
              label="Website"
              keyName="website"
              value={profile.links?.website}
              color={colors.primary}
            />

            <SocialInput
              icon="facebook"
              label="Facebook"
              keyName="facebook"
              value={profile.links?.facebook}
              color={colors.text}
            />

            <SocialInput
              icon="instagram"
              label="Instagram"
              keyName="instagram"
              value={profile.links?.instagram}
              color={colors.text}
            />

            <SocialInput
              icon="linkedin"
              label="LinkedIn"
              keyName="linkedin"
              value={profile.links?.linkedin}
              color={colors.text}
            />

            <SocialInput
              icon="whatsapp"
              label="WhatsApp"
              keyName="whatsapp"
              value={profile.links?.whatsapp}
              color={colors.success}
            />
          </View>

          {/* SAVE BUTTON */}
          <TouchableOpacity onPress={save}>
            <LinearGradient
              colors={[colors.primaryDark, "#1E40AF"]}
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: colors.border },

  premiumHeader: {
    backgroundColor: colors.surface,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    marginTop: -4,
  },

  titleCenter: { flex: 1, alignItems: "center" },

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
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  imageSection: {
    alignItems: "center",
    marginBottom: 20,
  },

  imageContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    elevation: 10,
  },

  profileImg: {
    width: "100%",
    height: "100%",
    borderRadius: 55,
  },

  placeholderImg: {
    width: "100%",
    height: "100%",
    borderRadius: 55,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
  },

  cardLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 15,
  },
  saveBtn: {
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 40,
  },

  saveBtnText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: "700",
  },
});
