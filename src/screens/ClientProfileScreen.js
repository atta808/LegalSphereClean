import React from "react";
import { useTheme } from "../theme/ThemeContext";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native"; // ✅ Added useRoute
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { getAllCases, getProfile } from "../services/sqliteService";
import { formatMoney, getCurrency } from "../utils/currency";
import { toDisplay } from "../utils/date";

export default function ClientProfileScreen({ profile, onBack }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  // ✅ Extract client from route params if passed via navigation
  // This prevents the "undefined" errors when coming from ClientsScreen
  const client = route.params?.client;

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const currency = getCurrency(currentProfile);

  const loadCases = useCallback(() => {
    try {
      if (!client?.id) return;
      setLoading(true);

      // Filter cases for this specific client
      const allCases = getAllCases();
      const clientCases = allCases.filter((c) => c.clientId === client.id);
      setCases(clientCases);
    } catch (e) {
      console.log("❌ loadCases error:", e);
      Alert.alert("Error", "Failed to load cases.");
    } finally {
      setLoading(false);
    }
  }, [client?.id]);
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
    loadCases();
  }, [loadCases]);

  // If no client is found (safety check)
  if (!client) {
    return (
      <View style={styles.center}>
        <Text>Client data not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary, marginTop: 10 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" translucent />

      {/* PREMIUM HEADER */}
      <View style={[styles.premiumHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => (onBack ? onBack() : navigation.goBack())}
          style={styles.glassBackButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Client Profile</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* IDENTITY CARD */}
        <View style={styles.identityCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {client?.name?.charAt(0) || "C"}
            </Text>
          </View>
          <Text style={styles.clientName} numberOfLines={1}>
            {client?.name}
          </Text>
          <Text style={styles.clientSub} numberOfLines={1}>
            {client?.email || "No Email Provided"}
          </Text>

          <View style={styles.actionHub}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${client.mobile}`)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="call"
                  size={18}
                  color={colors.surface}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.btnText}>Call</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.waBtn}
              onPress={() =>
                Linking.openURL(
                  `https://wa.me/${client.mobile.replace("+", "")}`,
                )
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="logo-whatsapp"
                  size={18}
                  color={colors.surface}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.btnText}>WhatsApp</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* QUICK STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Cases</Text>
            <Text style={styles.statVal}>{cases.length}</Text>
          </View>
          <View
            style={[
              styles.statBox,
              { borderLeftWidth: 1, borderColor: colors.border },
            ]}
          >
            <Text style={styles.statLabel}>Urgent</Text>
            <Text style={[styles.statVal, { color: colors.danger }]}>
              {cases.filter((c) => c.priority === "urgent").length}
            </Text>
          </View>
        </View>

        {/* CASE LIST */}
        <Text style={styles.sectionTitle}>Matter History</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : cases.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="folder-open-outline"
              size={48}
              color={colors.placeholder}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.emptyText}>
              No cases recorded for this client.
            </Text>
          </View>
        ) : (
          cases.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.caseCard}
              // ✅ Navigates directly to CaseDetail using the app stack
              onPress={() =>
                navigation.navigate("CaseDetail", { caseId: item.id })
              }
            >
              <View style={styles.caseHeader}>
                <Text style={styles.caseTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {item.status?.toUpperCase() || "ACTIVE"}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 6,
                }}
              >
                <Ionicons
                  name="business-outline"
                  size={14}
                  color={colors.secondaryText}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.caseCourt}>
                  {item.court || "Pending Court"}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.rowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={colors.secondaryText}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.metaLabel}>
                    {toDisplay(item.nextHearingISO)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.metaValue,
                    {
                      color:
                        Number(item.feeBalance) > 0 ? colors.danger : colors.success,
                    },
                  ]}
                >
                  {formatMoney(item.feeBalance, currency)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.background },
  premiumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  glassBackButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: { fontSize: 30, color: colors.primary, marginTop: -4 },
  headerTitleText: { fontSize: 18, fontWeight: "700", color: colors.primary },
  scrollContent: { padding: 20 },
  identityCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(26, 115, 232, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { color: colors.primary, fontSize: 28, fontWeight: "600" },
  clientName: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  clientSub: { fontSize: 13, color: colors.secondaryText, marginTop: 4 },
  actionHub: { flexDirection: "row", gap: 12, marginTop: 20 },
  callBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
  },
  waBtn: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { color: colors.surface, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: { flex: 1, alignItems: "center" },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.placeholder,
    textTransform: "uppercase",
  },
  statVal: { fontSize: 20, fontWeight: "700", color: colors.primary, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
    marginLeft: 4,
  },
  caseCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  caseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  caseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: "rgba(26, 115, 232, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: "600", color: colors.primary },
  caseCourt: { fontSize: 13, color: colors.secondaryText },
  divider: { height: 1, backgroundColor: colors.background, marginVertical: 12 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: { fontSize: 12, color: colors.secondaryText, fontWeight: "600" },
  metaValue: { fontSize: 14, fontWeight: "600" },
  emptyCard: {
    padding: 40,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.placeholder, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
