import React from "react";
import EmptyState from '../components/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';
import PremiumCard from '../components/PremiumCard';
import { useTheme } from "../theme/ThemeContext";
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
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
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
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
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
              <Ionicons name="archive-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            {/* ADD BUTTON */}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate("AddClient")}
            >
              <Ionicons name="add" size={24} color={colors.surface} />
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        {loading ? (
          <SkeletonLoader variant="list" count={4} />
        ) : filteredClients.length === 0 ? (
          <EmptyState icon={<Ionicons name="people-outline" size={64} color={colors.placeholder} />} title="No Clients Found" description="Add your first client to start organizing their cases and documents." primaryActionTitle="Add Client" onPrimaryAction={() => navigation.navigate("AddClient")} />
        ) : (
          filteredClients.map((item) => (
            <PremiumCard key={item.id} style={{ marginBottom: 20 }} onPress={() =>
                navigation.navigate("ClientProfile", { client: item })
              } elevationLevel={1}>
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
                        color={colors.danger}
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
                      color={colors.secondaryText}
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
                      color={colors.secondaryText}
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
                      color={colors.surface}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.actionBtnText, { color: colors.surface }]}>
                      WhatsApp
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </PremiumCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: resolvedTheme === 'dark' ? colors.surface : colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...(resolvedTheme === 'dark' ? {
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 0,
    } : {
      shadowColor: colors.shadow,
      shadowOpacity: 0.03,
      shadowRadius: 15,
      elevation: 2,
    }),
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
    backgroundColor: resolvedTheme === 'dark' ? colors.card : "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: resolvedTheme === 'dark' ? colors.border : "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    color: resolvedTheme === 'dark' ? colors.primary : colors.surface,
    fontSize: 28,
    fontWeight: "300",
    marginTop: -4,
  },

  titleContainer: { flex: 1, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: resolvedTheme === 'dark' ? colors.primary : colors.surface },
  subTitle: {
    fontSize: 10,
    color: resolvedTheme === 'dark' ? colors.placeholder : "rgba(255,255,255,0.7)",
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
  },

  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: resolvedTheme === 'dark' ? colors.primary : colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  addText: { color: resolvedTheme === 'dark' ? colors.surface : colors.primary, fontSize: 22, fontWeight: "bold" },

  scrollContent: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    } : {
      elevation: 0,
    }),
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: { fontWeight: "700", color: colors.primary, fontSize: 20 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontWeight: "700", fontSize: 17, color: colors.text },
  archiveIcon: { fontSize: 16, opacity: 0.5 },
  caseCountText: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: "500",
  },

  cardDivider: { height: 1, backgroundColor: colors.background, marginVertical: 15 },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  waBtn: { backgroundColor: colors.success, borderColor: colors.success },
  actionBtnText: { fontSize: 13, fontWeight: "600", color: colors.secondaryText },

  center: { alignItems: "center", marginTop: 100 },
  emptyTitle: { fontWeight: "600", color: colors.placeholder },
  archiveBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: resolvedTheme === 'dark' ? colors.card : colors.surface,
    justifyContent: "center",
    alignItems: "center",

    borderWidth: 1,
    borderColor: resolvedTheme === 'dark' ? colors.border : colors.surface,

    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    } : {
      elevation: 0,
    }),
  },

  archiveBtnIcon: {
    fontSize: 18,
  },
});
