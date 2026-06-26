import LegalInput from "../components/LegalInput";
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
            <Text style={styles.backIcon}>‹</Text>
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
              <Text style={styles.archiveBtnIcon}>🗂️</Text>
            </TouchableOpacity>

            {/* ADD BUTTON */}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate("AddClient")}
            >
              <Text style={styles.addText}>＋</Text>
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
            color="#1E3A8A"
            style={{ marginTop: 50 }}
          />
        ) : filteredClients.length === 0 ? (
          <View style={styles.center}>
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
                    <Text style={styles.name}>{item.name}</Text>
                    <TouchableOpacity onPress={() => handleArchive(item)}>
                      <Text style={styles.archiveIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.caseCountText}>
                    {caseCounts[item.id] || 0} Active Matters
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => Linking.openURL(`tel:${item.mobile}`)}
                >
                  <Text style={styles.actionBtnText}>📞 Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.waBtn]}
                  onPress={() =>
                    Linking.openURL(
                      `https://wa.me/${item.mobile.replace("+", "")}`,
                    )
                  }
                >
                  <Text style={[styles.actionBtnText, { color: "#FFF" }]}>
                    💬 WhatsApp
                  </Text>
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
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 8,
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
    color: "#1E3A8A",
    fontSize: 28,
    fontWeight: "300",
    marginTop: -4,
  },

  titleContainer: { flex: 1, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "900", color: "#1E3A8A" },
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
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
  },
  addText: { color: "#FFF", fontSize: 22, fontWeight: "bold" },

  scrollContent: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: { fontWeight: "900", color: "#1E3A8A", fontSize: 20 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontWeight: "900", fontSize: 17, color: "#1E293B" },
  archiveIcon: { fontSize: 16, opacity: 0.5 },
  caseCountText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  cardDivider: { height: 1, backgroundColor: "#F8FAFC", marginVertical: 15 },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  waBtn: { backgroundColor: "#10B981", borderColor: "#10B981" },
  actionBtnText: { fontSize: 13, fontWeight: "800", color: "#475569" },

  center: { alignItems: "center", marginTop: 100 },
  emptyTitle: { fontWeight: "800", color: "#94A3B8" },
  archiveBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E2E8F0",

    shadowColor: "#1E3A8A",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  archiveBtnIcon: {
    fontSize: 18,
  },
});
