import React from "react";
import { useTheme } from "../theme/ThemeContext";
import LegalInput from "../components/LegalInput";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  deleteQuickLink,
  getAllQuickLinks,
  insertQuickLink,
  toggleFavorite,
  togglePinned,
} from "../services/sqliteService";

// 🌍 CATEGORIES
const CATEGORIES = [
  "court",
  "government",
  "legal",
  "research",
  "international",
  "personal",
];

// 🎯 ICONS
const categoryIcons = {
  court: "⚖️",
  government: "🏛️",
  legal: "📜",
  research: "🔍",
  international: "🌍",
  personal: "⭐",
};

// 🌍 GLOBAL DEFAULT LINKS
const defaultLinks = [
  ["Pakistan Law Site", "https://pakistanlawsite.com", "legal"],
  ["Supreme Court PK", "https://www.supremecourt.gov.pk", "court"],
  ["LHC", "https://lhc.gov.pk", "court"],
  ["Sindh High Court", "https://www.sindhhighcourt.gov.pk", "court"],
  ["Islamabad High Court", "https://ihc.gov.pk", "court"],
  ["NADRA", "https://nadra.gov.pk", "government"],
  [
    "High Court Lahore Biometric",
    "https://biosystid.lhc.gov.pk/biosystno",
    "court",
  ],
  ["FBR", "https://fbr.gov.pk", "government"],
  ["Punjab Police", "https://punjabpolice.gov.pk", "government"],

  ["Indian Kanoon", "https://indiankanoon.org", "legal"],
  ["eCourts India", "https://ecourts.gov.in", "court"],
  ["Supreme Court India", "https://main.sci.gov.in", "court"],
  ["Delhi High Court", "https://delhihighcourt.nic.in", "court"],

  ["Bangladesh Supreme Court", "http://www.supremecourt.gov.bd", "court"],

  ["UAE MOJ", "https://www.moj.gov.ae", "government"],
  ["Dubai Courts", "https://www.dc.gov.ae", "court"],
  ["Abu Dhabi Judiciary", "https://www.adjd.gov.ae", "court"],

  ["Saudi MOJ", "https://www.moj.gov.sa", "government"],
  ["Qatar Courts", "https://www.sjc.gov.qa", "court"],

  ["UK Legislation", "https://www.legislation.gov.uk", "legal"],
  ["UK Supreme Court", "https://www.supremecourt.uk", "court"],
  ["BAILII", "https://www.bailii.org", "international"],

  ["EUR-Lex", "https://eur-lex.europa.eu", "international"],
  ["European Court of Justice", "https://curia.europa.eu", "court"],
  ["European Court HR", "https://www.echr.coe.int", "court"],

  ["US Supreme Court", "https://www.supremecourt.gov", "court"],
  ["Cornell Law", "https://www.law.cornell.edu", "legal"],
  ["Justia", "https://www.justia.com", "legal"],

  ["Google Scholar", "https://scholar.google.com", "research"],
  ["WorldLII", "http://www.worldlii.org", "international"],
  ["ICJ", "https://www.icj-cij.org", "international"],
  ["UN Treaty", "https://treaties.un.org", "international"],
  ["WIPO", "https://www.wipo.int", "international"],
  ["ICC Court", "https://www.icc-cpi.int", "international"],
];

export default function QuickLinksScreen({ onBack }) {
  const { colors, resolvedTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("personal");
  const [links, setLinks] = useState([]);
  const [linksReady, setLinksReady] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");

  // LOAD
  const loadLinks = useCallback(async () => {
    try {
      const data = await Promise.resolve(getAllQuickLinks());

      setLinks(data || []);
    } catch {
      Alert.alert("Error", "Failed to load links.");
    }
  }, []);

  // SEED
  const seedLinks = useCallback(() => {
    try {
      const existing = getAllQuickLinks();
      if (existing.length > 0) return;

      defaultLinks.forEach(([title, url, category]) => {
        insertQuickLink({ title, url, category });
      });
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      await seedLinks();
      await loadLinks();
      setLinksReady(true);
    };

    init();
  }, [seedLinks, loadLinks]);

  // FILTER + SEARCH + PIN
  const filteredLinks = useMemo(() => {
    if (!linksReady) return [];

    let data = links;

    if (selectedFilter !== "all") {
      data = data.filter((l) => l.category === selectedFilter);
    }

    if (search.trim()) {
      data = data.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.url.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return data.sort((a, b) => {
      if (b.isPinned !== a.isPinned) return b.isPinned - a.isPinned;
      if (b.isFavorite !== a.isFavorite) return b.isFavorite - a.isFavorite;
      return 0;
    });
  }, [links, selectedFilter, search]);

  // ADD
  const handleAdd = () => {
    if (!url.trim()) {
      Alert.alert("Required", "Enter URL.");
      return;
    }

    let formatted = url.trim();
    if (!formatted.startsWith("http")) {
      formatted = "https://" + formatted;
    }

    insertQuickLink({
      title: title.trim() || "Quick Link",
      url: formatted,
      category,
    });

    setTitle("");
    setUrl("");
    setCategory("personal");
    loadLinks();
  };

  const openLink = async (link) => {
    const supported = await Linking.canOpenURL(link);
    if (supported) Linking.openURL(link);
  };

  const handleDelete = (id) => {
    deleteQuickLink(id);
    loadLinks();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent />

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
            <Text style={styles.headerTitleText}>Quick Links</Text>
            <View style={styles.jurisdictionPill}>
              <Text style={styles.jurisdictionText}>
                Legal Resources & Tools
              </Text>
            </View>
          </View>

          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* SEARCH */}
        <LegalInput
          label="Search Links"
          value={search}
          onChangeText={setSearch}
          placeholder="Search links..."
        />

        {/* FILTER */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["all", ...CATEGORIES].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterBtn,
                selectedFilter === f && styles.filterActive,
              ]}
              onPress={() => setSelectedFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === f && styles.filterTextActive,
                ]}
              >
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ADD FORM */}
        <View style={styles.card}>
          <LegalInput
            label="Link Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter title"
          />

          <LegalInput
            label="Website URL"
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            keyboardType="url"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.catBtn, category === c && styles.catActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={styles.catText}>
                  {categoryIcons[c]} {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addText}>+ ADD LINK</Text>
          </TouchableOpacity>
        </View>

        {/* LIST */}
        {linksReady &&
          filteredLinks.map((item) => (
            <View key={item.id} style={styles.linkCard}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => openLink(item.url)}
              >
                <Text style={styles.linkTitle}>{item.title}</Text>
                <Text style={styles.linkUrl}>{item.url}</Text>
                <Text style={styles.category}>
                  {categoryIcons[item.category]} {item.category}
                </Text>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => {
                    togglePinned(item.id, !item.isPinned);
                    loadLinks();
                  }}
                >
                  <Text style={styles.pin}>{item.isPinned ? "📌" : "📍"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    toggleFavorite(item.id, !item.isFavorite);
                    loadLinks();
                  }}
                >
                  <Text style={styles.star}>
                    {item.isFavorite ? "⭐" : "☆"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.delete}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

// 🎨 STYLES
const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ================= HEADER =================
  premiumHeader: {
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

  glassBackButton: {
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
    fontSize: 28,
    color: colors.primary,
    fontWeight: "300",
    marginTop: -4,
  },

  titleCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerTitleText: {
    fontSize: 18,
    fontWeight: "900",
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
    textTransform: "uppercase",
  },
  content: {
    padding: 18,
    paddingBottom: 120,
  },


  // ================= FILTER =================
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.border,
    borderRadius: 12,
    marginRight: 8,
  },

  filterActive: {
    backgroundColor: colors.primary,
  },

  filterText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },

  filterTextActive: {
    color: colors.surface,
  },

  // ================= FORM =================
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginTop: 16,

    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  // CATEGORY BUTTONS
  catBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.border,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 8,
  },

  catActive: {
    backgroundColor: colors.primary,
  },

  catText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },

  catActiveText: {
    color: colors.surface,
  },

  // ADD BUTTON
  addBtn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 14,

    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  addText: {
    color: colors.surface,
    fontWeight: "900",
    fontSize: 13,
  },

  // ================= LINK CARD =================
  linkCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 18,
    marginTop: 12,

    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  linkTitle: {
    fontWeight: "900",
    fontSize: 14,
    color: colors.text,
  },

  linkUrl: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },

  category: {
    fontSize: 10,
    color: colors.primary,
    marginTop: 6,
    fontWeight: "700",
  },

  // ================= ACTIONS =================
  actions: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },

  pin: {
    fontSize: 20,
    marginBottom: 10,
  },

  star: {
    fontSize: 20,
    marginBottom: 10,
  },

  delete: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 12,
  },

  // ================= EMPTY =================
  empty: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 13,
    color: colors.secondaryText,
  },
});
