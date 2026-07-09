import LegalInput from "../components/LegalInput";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
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
import {
  archiveClient,
  getAllClients,
  getCasesByClientId,
} from "../services/sqliteService";

export default function ClientsScreen({ profile }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [caseCounts, setCaseCounts] = useState({});

  const loadClients = useCallback(() => {
    try {
      setLoading(true);
      const result = getAllClients();
      setClients(result);

      const counts = {};
      result.forEach((c) => {
        counts[c.id] = (getCasesByClientId(c.id) || []).length;
      });
      setCaseCounts(counts);
    } catch (_e) {
      Alert.alert("Error", "Failed to load clients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients]),
  );

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (item) =>
        item.name?.toLowerCase().includes(term) || item.mobile?.includes(term),
    );
  }, [clients, search]);

  const handleArchive = (item) => {
    Alert.alert("Archive Client", `Move ${item.name} to vault?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: () => {
          archiveClient(item.id);
          loadClients();
        },
      },
    ]);
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" translucent />

      {/* PREMIUM HEADER WITH BACK BUTTON */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          {/* BACK BUTTON */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.glassBackButton}
          >
            <Ionicons name="chevron-back" size={24} color="#1A73E8" />
          </TouchableOpacity>

          {/* TITLE */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Client Directory</Text>
            <Text style={styles.subTitle}>
              {clients.length} Total Verified Clients
            </Text>
          </View>

          {/* RIGHT ACTIONS */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* 🔥 ARCHIVE BUTTON */}
            <TouchableOpacity
              style={styles.archiveBtn}
              onPress={() => navigation.navigate("ClientArchive")}
            >
              <Ionicons name="archive-outline" size={20} color="#1A73E8" />
            </TouchableOpacity>

            {/* ADD BUTTON */}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate("AddClient")}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* INTEGRATED SEARCH */}
        <LegalInput
          label="Client Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or phone..."
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1A73E8"
            style={{ marginTop: 50 }}
          />
        ) : filteredClients.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="people-outline"
              size={48}
              color="#94A3B8"
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.emptyTitle}>No Clients Found</Text>
          </View>
        ) : (
          filteredClients.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() =>
                navigation.navigate("ClientProfile", { client: item })
              }
            >
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleArchive(item)}
                      style={{ padding: 10, margin: -10 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <Ionicons
                      name="briefcase-outline"
                      size={12}
                      color="#64748B"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.caseCountText}>
                      {caseCounts[item.id] || 0} Active Matters
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => Linking.openURL(`tel:${item.mobile}`)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="call"
                      size={16}
                      color="#475569"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.actionBtnText}>Call</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.waBtn]}
                  onPress={() =>
                    Linking.openURL(
                      `https://wa.me/${item.mobile.replace("+", "")}`,
                    )
                  }
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="logo-whatsapp"
                      size={16}
                      color="#FFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.actionBtnText, { color: "#FFF" }]}>
                      WhatsApp
                    </Text>
                  </View>
                </TouchableOpacity>
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
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#1A73E8",
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  // ✅ PRECISE BACK BUTTON STYLING
  glassBackButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    color: "#1A73E8",
    fontSize: 28,
    fontWeight: "300",
    marginTop: -4,
  },

  titleContainer: { flex: 1, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#1A73E8" },
  subTitle: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
  },

  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#1A73E8",
    justifyContent: "center",
    alignItems: "center",
  },
  addText: { color: "#FFF", fontSize: 22, fontWeight: "bold" },

  scrollContent: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: "rgba(26, 115, 232, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: { fontWeight: "700", color: "#1A73E8", fontSize: 20 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontWeight: "700", fontSize: 17, color: "#0F172A" },
  archiveIcon: { fontSize: 16, opacity: 0.5 },
  caseCountText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
  },

  cardDivider: { height: 1, backgroundColor: "#F8FAFC", marginVertical: 15 },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  waBtn: { backgroundColor: "#25D366", borderColor: "#25D366" },
  actionBtnText: { fontSize: 13, fontWeight: "600", color: "#475569" },

  center: { alignItems: "center", marginTop: 100 },
  emptyTitle: { fontWeight: "600", color: "#94A3B8" },
  archiveBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#1A73E8",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  archiveBtnIcon: {
    fontSize: 18,
  },
});
