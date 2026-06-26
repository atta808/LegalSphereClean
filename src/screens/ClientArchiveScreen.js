import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  deleteClientPermanently,
  getArchivedClients,
  restoreClient,
} from "../services/sqliteService";

export default function ClientArchiveScreen() {
  const insets = useSafeAreaInsets();
  const [clients, setClients] = useState([]);
  const navigation = useNavigation();
  const load = () => {
    const data = getArchivedClients();
    setClients(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 🔹 HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.title}>Archived Clients</Text>
            <Text style={styles.subTitle}>Restore deleted clients</Text>
          </View>

          <View style={{ width: 42 }} />
        </View>
      </View>

      {/* 🔹 CONTENT */}
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {clients.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 40 }}>🗂</Text>
            <Text style={styles.emptyTitle}>No Archived Clients</Text>
            <Text style={styles.emptySub}>
              Deleted clients will appear here
            </Text>
          </View>
        ) : (
          clients.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name?.charAt(0)?.toUpperCase() || "C"}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.email}>{item.email || "No email"}</Text>
                </View>
              </View>

              <Text style={styles.phone}>📞 {item.mobile || "No phone"}</Text>

              <View style={styles.row}>
                {/* ✅ RESTORE */}
                <TouchableOpacity
                  style={styles.restoreBtn}
                  onPress={() => {
                    restoreClient(item.id);
                    load();
                  }}
                >
                  <Text style={styles.restoreText}>Restore</Text>
                </TouchableOpacity>

                {/* ❌ DELETE FOREVER */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    Alert.alert(
                      "Permanent Delete",
                      "This will permanently delete the client. This action cannot be undone.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete Forever",
                          style: "destructive",
                          onPress: () => {
                            deleteClientPermanently(item.id);
                            load();
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Text style={styles.deleteText}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  // 🔹 HEADER
  header: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  backIcon: {
    fontSize: 26,
    color: "#1E3A8A",
    fontWeight: "300",
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E3A8A",
  },

  subTitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "600",
  },

  // 🧾 CARD
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    fontWeight: "900",
    color: "#1E3A8A",
    fontSize: 18,
  },

  name: {
    fontWeight: "900",
    fontSize: 16,
    color: "#1E293B",
  },

  email: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },

  phone: {
    marginTop: 10,
    color: "#475569",
    fontWeight: "600",
  },

  // 🌀 EMPTY STATE
  center: {
    alignItems: "center",
    marginTop: 80,
  },

  emptyTitle: {
    fontWeight: "800",
    fontSize: 18,
    marginTop: 10,
    color: "#1E293B",
  },

  emptySub: {
    color: "#94A3B8",
    marginTop: 6,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },

  restoreBtn: {
    flex: 1,
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  restoreText: {
    color: "#fff",
    fontWeight: "800",
  },

  deleteBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  deleteText: {
    color: "#fff",
    fontWeight: "800",
  },
});
