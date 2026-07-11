import React from "react";
import { useTheme } from "../theme/ThemeContext";
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
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
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
          <TouchableOpacity accessibilityRole="button"
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
                <TouchableOpacity accessibilityRole="button"
                  style={styles.restoreBtn}
                  onPress={() => {
                    restoreClient(item.id);
                    load();
                  }}
                >
                  <Text style={styles.restoreText}>Restore</Text>
                </TouchableOpacity>

                {/* ❌ DELETE FOREVER */}
                <TouchableOpacity accessibilityRole="button"
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

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.border,
  },

  // 🔹 HEADER
  header: {
    backgroundColor: colors.surface,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: colors.primary,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  backIcon: {
    fontSize: 26,
    color: colors.primary,
    fontWeight: "300",
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.primary,
  },

  subTitle: {
    fontSize: 11,
    color: colors.placeholder,
    marginTop: 2,
    fontWeight: "600",
  },

  // 🧾 CARD
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    fontWeight: "900",
    color: colors.primary,
    fontSize: 18,
  },

  name: {
    fontWeight: "900",
    fontSize: 16,
    color: colors.text,
  },

  email: {
    color: colors.placeholder,
    fontSize: 12,
    marginTop: 2,
  },

  phone: {
    marginTop: 10,
    color: colors.secondaryText,
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
    color: colors.text,
  },

  emptySub: {
    color: colors.placeholder,
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
    backgroundColor: colors.success,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  restoreText: {
    color: colors.surface,
    fontWeight: "800",
  },

  deleteBtn: {
    flex: 1,
    backgroundColor: colors.danger,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  deleteText: {
    color: colors.surface,
    fontWeight: "800",
  },
});
