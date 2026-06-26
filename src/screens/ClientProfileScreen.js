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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllCases, getProfile } from "../services/sqliteService";
import { formatMoney, getCurrency } from "../utils/currency";
import { toDisplay } from "../utils/date";

export default function ClientProfileScreen({ profile, onBack }) {
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
          <Text style={{ color: "#1E3A8A", marginTop: 10 }}>Go Back</Text>
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
          <Text style={styles.backIcon}>‹</Text>
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
          <Text style={styles.clientName}>{client?.name}</Text>
          <Text style={styles.clientSub}>
            {client?.email || "No Email Provided"}
          </Text>

          <View style={styles.actionHub}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${client.mobile}`)}
            >
              <Text style={styles.btnText}>📞 Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.waBtn}
              onPress={() =>
                Linking.openURL(
                  `https://wa.me/${client.mobile.replace("+", "")}`,
                )
              }
            >
              <Text style={styles.btnText}>💬 WhatsApp</Text>
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
              { borderLeftWidth: 1, borderColor: "#F1F5F9" },
            ]}
          >
            <Text style={styles.statLabel}>Urgent</Text>
            <Text style={[styles.statVal, { color: "#EF4444" }]}>
              {cases.filter((c) => c.priority === "urgent").length}
            </Text>
          </View>
        </View>

        {/* CASE LIST */}
        <Text style={styles.sectionTitle}>Matter History</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#1E3A8A" />
        ) : cases.length === 0 ? (
          <View style={styles.emptyCard}>
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

              <Text style={styles.caseCourt}>
                🏛 {item.court || "Pending Court"}
              </Text>

              <View style={styles.divider} />

              <View style={styles.rowBetween}>
                <Text style={styles.metaLabel}>
                  📅 {toDisplay(item.nextHearingISO)}
                </Text>
                <Text
                  style={[
                    styles.metaValue,
                    {
                      color:
                        Number(item.feeBalance) > 0 ? "#EF4444" : "#10B981",
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

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  premiumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  glassBackButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: { fontSize: 30, color: "#1E3A8A", marginTop: -4 },
  headerTitleText: { fontSize: 18, fontWeight: "900", color: "#1E3A8A" },
  scrollContent: { padding: 20 },
  identityCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 25,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFF", fontSize: 28, fontWeight: "800" },
  clientName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E293B",
    marginTop: 12,
  },
  clientSub: { fontSize: 13, color: "#64748B", marginTop: 4 },
  actionHub: { flexDirection: "row", gap: 12, marginTop: 20 },
  callBtn: {
    flex: 1,
    backgroundColor: "#1E3A8A",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  waBtn: {
    flex: 1,
    backgroundColor: "#10B981",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { color: "#FFF", fontWeight: "800" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 15,
    marginBottom: 25,
  },
  statBox: { flex: 1, alignItems: "center" },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  statVal: { fontSize: 20, fontWeight: "900", color: "#1E3A8A", marginTop: 2 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1E293B",
    marginBottom: 15,
    marginLeft: 5,
  },
  caseCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  caseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  caseTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: { fontSize: 9, fontWeight: "900", color: "#0369A1" },
  caseCourt: { fontSize: 13, color: "#64748B", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#F8FAFC", marginVertical: 12 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  metaValue: { fontSize: 14, fontWeight: "800" },
  emptyCard: {
    padding: 30,
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 20,
  },
  emptyText: { color: "#94A3B8", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
