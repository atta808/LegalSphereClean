import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function BottomBar({ currentScreen, setCurrentScreen }) {
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
                <Ionicons name="add" size={28} color="#FFFFFF" />
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
                color={active ? "#0F172A" : "#94A3B8"}
              />
              {active && <Text style={styles.activeLabel}>{tab.label}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#E6F0FA",
    borderRadius: 24,
    paddingHorizontal: 12,

    // Soft, wide diffusion shadow
    shadowColor: "#8F9BB3",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
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
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  // 📝 DYNAMIC LABEL
  activeLabel: {
    marginLeft: 6,
    fontSize: 12,
    color: "#0F172A",
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
    backgroundColor: "#0F172A",

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
