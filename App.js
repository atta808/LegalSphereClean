import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  StatusBar,
  AppState,
  InteractionManager,
} from "react-native";
import * as Notifications from "expo-notifications";
import { useNavigationContainerRef } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { startAutoSync } from "./src/services/autoSyncService";
import { auth } from "./src/services/firebaseConfig";
import { restoreAllData } from "./src/services/restoreService";
import { getUserProfile } from "./src/services/userService";
import SyncIndicator from "./src/components/SyncIndicator";
import { startNetworkListener } from "./src/services/networkService";
import { initDB } from "./src/services/sqliteService";
import { requestNotificationPermission } from "./src/services/notificationPermission";
import { configureNotificationChannels } from "./src/services/notificationChannels";
import { runDailyMaintenance } from "./src/services/dailyMaintenanceService";
import { cancelAllLocalNotifications } from "./src/services/notificationService";

// ✅ Global error handler for debugging
if (typeof ErrorUtils !== "undefined") {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log("🔥 GLOBAL ERROR:", error);
    defaultHandler(error, isFatal);
  });
}

export default function App() {
  const appState = useRef(AppState.currentState);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const loggedIn = await AsyncStorage.getItem("isLoggedIn");
        if (loggedIn !== "true") {
          setLoading(false);
        }
      } catch (e) {
        console.log("Session restore error:", e);
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const handleLogout = async () => {
    try {
      await cancelAllLocalNotifications();
      Notifications.removeAllNotificationListeners();
      await signOut(auth);
      await AsyncStorage.multiRemove(["isLoggedIn", "uid", "isRestored"]);
      setUser(null);
      setProfile(null);
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setUser(u);
          const p = await getUserProfile(u.uid);
          if (p) {
            setProfile({ ...p, uid: u.uid });
            await AsyncStorage.setItem("isLoggedIn", "true");
            await AsyncStorage.setItem("uid", u.uid);

            const restored = await AsyncStorage.getItem("isRestored");
            if (!restored && !restoring) {
              setRestoring(true);
              console.log("🔄 First time login → restoring data...");
              await restoreAllData();
              await AsyncStorage.setItem("isRestored", "true");
              setRestoring(false);
            }

            InteractionManager.runAfterInteractions(() => {
              startAutoSync();
            });
          } else {
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.log("Auth restore error:", e);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        // ✅ Safe DB init with error handling
        try {
          initDB();
        } catch (dbError) {
          console.log("⚠️ DB Init error (non-critical):", dbError);
        }

        await requestNotificationPermission();
        await configureNotificationChannels();

        InteractionManager.runAfterInteractions(() => {
          runDailyMaintenance().catch((e) =>
            console.log("Deferred maintenance error:", e),
          );
        });
      } catch (e) {
        console.log("Init error:", e);
      }
    };

    init();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log(
          "🔄 App has come to the foreground! Running maintenance...",
        );
        runDailyMaintenance().catch((e) =>
          console.log("Foreground maintenance error:", e),
        );
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    try {
      InteractionManager.runAfterInteractions(() => {
        startNetworkListener();
      });
    } catch (e) {
      console.log("Network listener error:", e);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent
          loading={loading}
          user={user}
          profile={profile}
          handleLogout={handleLogout}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent({ loading, user, profile, handleLogout }) {
  const { colors, resolvedTheme } = useTheme();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        setTimeout(() => {
          if (navigationRef.isReady()) {
            if (data?.caseId) {
              navigationRef.navigate("CaseDetail", { caseId: data.caseId });
            } else {
              navigationRef.navigate("NotificationCenter");
            }
          }
        }, 500);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [navigationRef]);

  if (loading) {
    return (
      <View
        style={[styles.loaderContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <SyncIndicator />
      <AppNavigator
        user={user}
        profile={profile}
        onLogout={handleLogout}
        ref={navigationRef}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
