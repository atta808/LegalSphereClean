import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function BottomBar({ currentScreen, setCurrentScreen }) {
  const { colors, resolvedTheme } = useTheme();

  const styles = useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  // ✨ FIX: Explicitly setting the exact active and inactive icon names
  const tabs = [
    {
      label: "Home",
      screen: "dashboard",
      activeIcon: "grid",
      inactiveIcon: "grid-outline",
    },
    {
      label: "Diary",
      screen: "diary",
      activeIcon: "journal",
      inactiveIcon: "journal-outline",
    },
    { label: "Add", screen: "addCase", activeIcon: "add", inactiveIcon: "add" },
    {
      label: "Plan",
      screen: "calendar",
      activeIcon: "calendar",
      inactiveIcon: "calendar-outline",
    },
    {
      label: "Browser",
      screen: "browser",
      activeIcon: "globe",
      inactiveIcon: "globe-outline",
    },
  ];

  // 🔥 ACTION BUTTON ANIMATION
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    setCurrentScreen("addCase");
  };

  return (
    <View style={styles.dockContainer}>
      {tabs.map((tab) => {
        if (tab.screen === "addCase") {
          return (
            <TouchableOpacity
              key="center"
              activeOpacity={0.8}
              onPress={handlePress}
              style={styles.actionTabWrapper}
            >
              <Animated.View
                style={[
                  styles.actionButton,
                  { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <Ionicons name="add" size={28} color={resolvedTheme === 'dark' ? '#FFFFFF' : '#FFFFFF'} />
              </Animated.View>
            </TouchableOpacity>
          );
        }

        const active = currentScreen === tab.screen;

        return (
          <TouchableOpacity
            key={tab.screen}
            style={[styles.tab, active && styles.activeTabPadding]}
            onPress={() => setCurrentScreen(tab.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, active && styles.activeIconBox]}>
              <Ionicons
                // ✨ FIX: Now it cleanly switches between the exact names we defined
                name={active ? tab.activeIcon : tab.inactiveIcon}
                size={22}
                color={active ? colors.primary : colors.placeholder}
              />
              {active && <Text style={styles.activeLabel}>{tab.label}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (colors, resolvedTheme) => StyleSheet.create({
  // ☁️ THE DOCK
  dockContainer: {
    position: "absolute",
    bottom: 30,
    left: 24,
    right: 24,
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 12,

    borderWidth: 1,
    borderColor: colors.border,

    // Soft, wide diffusion shadow
    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.shadow,
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 20,
      elevation: 2
    } : {
      elevation: 0
    }),
  },

  // 🟦 STANDARD TABS
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTabPadding: {
    flex: 1.5,
  },

  iconBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },

  activeIconBox: {
    backgroundColor: colors.primaryLight,
  },

  // 📝 DYNAMIC LABEL
  activeLabel: {
    marginLeft: 6,
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
  },

  // 🔥 THE NEW INLINE ADD BUTTON
  actionTabWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,

    justifyContent: "center",
    alignItems: "center",

    ...(resolvedTheme === 'light' ? {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6
    } : {
      elevation: 0,
      borderWidth: 1,
      borderColor: colors.border
    }),
  },
});
