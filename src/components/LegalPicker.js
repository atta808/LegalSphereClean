import React, { useMemo } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../theme/ThemeContext";

export default function LegalPicker({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) {
  const { colors, resolvedTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      {/* Premium Glass Overlay */}
      <BlurView intensity={resolvedTheme === "dark" ? 60 : 35} tint={resolvedTheme === "dark" ? "dark" : "light"} style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Glass Bottom Sheet */}
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Options */}
          <FlatList
            data={options}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            initialNumToRender={15}
            windowSize={10}
            removeClippedSubviews
            renderItem={({ item }) => {
              const active = item.value === selectedValue;

              return (
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.item, active && styles.activeItem]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                >
                  <Text
                    style={[styles.itemText, active && styles.activeItemText]}
                  >
                    {item.label}
                  </Text>

                  {active && (
                    <View style={styles.activePillIndicator}>
                      <View style={styles.activeInnerDot} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.closeText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.18)",
  },

  sheet: {
    backgroundColor: resolvedTheme === "dark" ? "rgba(30, 41, 59, 0.95)" : "rgba(255,255,255,0.95)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: "80%",

    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,

    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 10,
    } : {
      elevation: 0,
    }),
  },

  handleContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
  },

  handle: {
    width: 44,
    height: 5,
    borderRadius: 10,
    backgroundColor: "rgba(148,163,184,0.45)",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginTop: 6,
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  listContainer: {
    paddingBottom: 16,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginBottom: 10,

    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,

    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    } : {
      elevation: 0,
    }),
  },

  activeItem: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,

    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.primary,
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    } : {
      elevation: 0,
    }),
  },

  itemText: {
    flex: 1,
    fontSize: 16,
    color: colors.secondaryText,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  activeItemText: {
    color: colors.primary,
    fontWeight: "700",
  },

  activePillIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },

  activeInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  closeButton: {
    marginTop: 10,

    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",

    borderWidth: 1,
    borderColor: colors.border,

    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    } : {
      elevation: 0,
    }),
  },

  closeText: {
    color: colors.secondaryText,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
