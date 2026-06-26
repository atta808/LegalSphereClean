import { getProfile, saveProfile } from "../services/sqliteService";
import { getLegalSystemByCountry } from "../constants/legalSystems";
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
// Lightweight Animated Scale Button Component for Premium Haptic Feedback
const PremiumPressable = ({ onPress, children, style }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.timing(scaleValue, {
      toValue: 0.97,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.timing(scaleValue, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function BrowserHomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  useFocusEffect(
    React.useCallback(() => {
      const loadProfile = async () => {
        try {
          const profile = await getProfile();

          if (profile?.country) {
            setSelectedCountry(profile.country);
          }

          if (profile?.activeCMS) {
            setActiveCMS(profile.activeCMS);
          }

          if (profile?.favoriteTools) {
            setFavoriteTools(profile.favoriteTools);
          }
        } catch (e) {
          console.log("Country load error:", e);
        }
      };

      loadProfile();
    }, []),
  );
  const [selectedCountry, setSelectedCountry] = useState("PK");
  const [activeCMS, setActiveCMS] = useState([]);
  const [favoriteTools, setFavoriteTools] = useState([]);
  const legalSystem = getLegalSystemByCountry(selectedCountry);

  const workspaceData = [
    {
      id: "ai",
      title: "AI Workspaces",
      icon: "sparkles-outline",
      tools: legalSystem.ai || [],
    },

    {
      id: "cms",
      title: "Court Case Management Systems",
      icon: "layers-outline",
      tools: legalSystem.cms || [],
    },

    {
      id: "research",
      title: "Legal Research Engines",
      icon: "library-outline",
      tools: legalSystem.research || [],
    },

    {
      id: "courts",
      title: "Courts & Judiciary",
      icon: "shield-checkmark-outline",
      tools: legalSystem.courts || [],
    },

    {
      id: "legislation",
      title: "Legislation & Acts",
      icon: "document-text-outline",
      tools: legalSystem.legislation || [],
    },

    {
      id: "barCouncils",
      title: "Bar Councils",
      icon: "people-outline",
      tools: legalSystem.barCouncils || [],
    },
  ].filter((section) => section.tools.length > 0);
  const allTools = workspaceData.flatMap((section) => section.tools);

  const favoriteItems = allTools.filter((tool) =>
    favoriteTools.includes(tool.id),
  );
  const openBrowser = (title, url) => {
    navigation.navigate("LegalBrowser", { title, url });
  };
  const toggleFavorite = async (toolId) => {
    try {
      let updatedFavorites = [];

      if (favoriteTools.includes(toolId)) {
        updatedFavorites = favoriteTools.filter((id) => id !== toolId);
      } else {
        updatedFavorites = [...favoriteTools, toolId];
      }

      setFavoriteTools(updatedFavorites);

      const profile = await getProfile();

      await saveProfile({
        ...profile,
        favoriteTools: updatedFavorites,
      });
    } catch (e) {
      console.log("Favorite toggle error:", e);
    }
  };

  const renderCard = (item) => (
    <PremiumPressable
      key={item.title}
      onPress={() => openBrowser(item.title, item.url)}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: item.color + "0C" },
            ]}
          >
            <Ionicons
              name={item.icon || "globe-outline"}
              size={22}
              color={item.color || "#2563EB"}
            />
          </View>
          <View style={styles.cardActions}>
            {item.tag && (
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => toggleFavorite(item.id)}
              style={styles.favoriteButton}
            >
              <Ionicons
                name={favoriteTools.includes(item.id) ? "star" : "star-outline"}
                size={18}
                color={favoriteTools.includes(item.id) ? "#F59E0B" : "#94A3B8"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardUrl} numberOfLines={1}>
            {item.url?.replace("https://", "") || ""}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.openText}>Launch Workspace</Text>
          <Ionicons name="arrow-forward" size={14} color="#2563EB" />
        </View>
      </View>
    </PremiumPressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* SYSTEM HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>LegalSphere</Text>
            <Text style={styles.headerSubtitle}>
              {legalSystem.countryName} Legal Workspace
            </Text>
          </View>
          <View style={styles.statusIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusText}>SECURE NODE</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {favoriteItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="star"
                size={18}
                color="#F59E0B"
                style={{ marginRight: 6 }}
              />

              <Text style={styles.sectionTitle}>Favorites</Text>
            </View>

            <View style={styles.grid}>
              {favoriteItems.map((tool) => (
                <View key={tool.id} style={styles.cardWrapper}>
                  {renderCard(tool)}
                </View>
              ))}
            </View>
          </View>
        )}

        {workspaceData.map((section) => (
          <View key={section.id} style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={section.icon}
                size={18}
                color="#64748B"
                style={{ marginRight: 6 }}
              />

              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {section.id === "ai" ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.aiScrollRow}
              >
                {section.tools.map((tool) => (
                  <View key={tool.id} style={styles.aiCardWrap}>
                    {renderCard(tool)}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.grid}>
                {section.tools.map((tool) => (
                  <View key={tool.id} style={styles.cardWrapper}>
                    {renderCard(tool)}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* QUICK LINKS ANCHOR */}
        <PremiumPressable
          style={styles.quickLinksWrapper}
          onPress={() => navigation.navigate("QuickLinks")}
        >
          <View style={styles.quickLinksCard}>
            <View style={styles.quickLinksLeft}>
              <View style={styles.quickLinksIconContainer}>
                <Ionicons name="apps-outline" size={20} color="#2563EB" />
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.quickLinksTitle}>Saved Extensions</Text>
                <Text style={styles.quickLinksSub}>
                  Quick link resources & bookmarks
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>
        </PremiumPressable>

        {/* Bottom padding to offset structural Bottom Bar navigation */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: "48.5%",
    marginBottom: 12,
  },
  card: {
    minHeight: 165,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    // Premium soft micro-shadowing
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  tagBadge: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  cardBody: {
    marginTop: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  cardUrl: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "400",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  openText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
  },
  quickLinksWrapper: {
    width: "100%",
    marginTop: 4,
  },
  quickLinksCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickLinksLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  quickLinksIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2563EB0A",
    justifyContent: "center",
    alignItems: "center",
  },
  quickLinksTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  quickLinksSub: {
    marginTop: 1,
    fontSize: 12,
    color: "#64748B",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  favoriteButton: {
    marginLeft: 8,
  },
  aiScrollRow: {
    paddingHorizontal: 2,
  },

  aiCardWrap: {
    width: 165,
    marginRight: 12,
  },
});
