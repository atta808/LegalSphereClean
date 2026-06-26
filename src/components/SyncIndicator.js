import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getSyncStatus,
  setSyncStatus,
  subscribeSyncStatus,
} from "../services/syncStatus";

export default function SyncIndicator() {
  const insets = useSafeAreaInsets();

  // ✅ STATUS + PROGRESS
  const [status, setStatus] = useState(getSyncStatus());
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Mount control
  const [isMounted, setIsMounted] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // 🔥 SUBSCRIBE (UPDATED)
  useEffect(() => {
    const unsub = subscribeSyncStatus((status, progressData) => {
      setStatus(status);
      if (progressData) setProgress(progressData);
    });
    return unsub;
  }, []);
  // 🛑 AUTO HIDE OFFLINE AFTER 2s
  useEffect(() => {
    if (status === "offline") {
      const t = setTimeout(() => {
        setSyncStatus("idle");
      }, 2000);

      return () => clearTimeout(t);
    }
  }, [status]);
  useEffect(() => {
    if (status === "idle") {
      // Exit animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -150,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(() => setIsMounted(false));
    } else {
      // Entry animation
      setIsMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: insets.top + 12,
          damping: 16,
          stiffness: 120,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 16,
          stiffness: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Auto dismiss
    if (status === "success" || status === "error") {
      const t = setTimeout(() => {
        const current = getSyncStatus();

        if (current === "success" || current === "error") {
          setSyncStatus("idle");
        }
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [status, insets.top, slideAnim, opacityAnim, scaleAnim]);

  if (!isMounted) return null;

  // =========================
  // 🎨 UI STATES
  // =========================
  let message = "Processing...";
  let accentColor = "#60A5FA";

  if (status === "syncing") {
    message =
      progress.total > 0
        ? `Syncing ${progress.current} / ${progress.total}...`
        : "Syncing data...";
    accentColor = "#60A5FA";
  }

  if (status === "success") {
    message = "Synced successfully";
    accentColor = "#34D399";
  }

  if (status === "error") {
    message = "Sync failed";
    accentColor = "#F87171";
  }

  if (status === "offline") {
    message = "Offline mode";
    accentColor = "#FBBF24";
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: accentColor,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.pill}>
        {status === "syncing" ? (
          <ActivityIndicator
            size="small"
            color={accentColor}
            style={styles.iconSpacing}
          />
        ) : (
          <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
        )}
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 24, 27, 0.95)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  text: {
    color: "#FAFAFA",
    fontWeight: "500",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  iconSpacing: {
    marginRight: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});
