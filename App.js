import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View, StatusBar } from "react-native";
import * as Notifications from "expo-notifications";
import { useNavigationContainerRef } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { startAutoSync } from "./src/services/autoSyncService";
import { auth } from "./src/services/firebaseConfig";
import { restoreAllData } from "./src/services/restoreService";
import { getUserProfile } from "./src/services/userService";
// ✅ REQUIRED SYSTEMS
import SyncIndicator from "./src/components/SyncIndicator";
import { startNetworkListener } from "./src/services/networkService";
import { initDB } from "./src/services/sqliteService";

// 🔔 NOTIFICATIONS
import { requestNotificationPermission } from "./src/services/notificationPermission";
import { configureNotificationChannels } from "./src/services/notificationChannels";
import { runDailyMaintenance } from "./src/services/dailyMaintenanceService";

export default function App() {
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
      await signOut(auth); // Firebase logout
      await AsyncStorage.multiRemove(["isLoggedIn", "uid", "isRestored"]); // clear local session

      setUser(null);
      setProfile(null);
    } catch (e) {
      console.log("Logout error:", e);
    }
  };
 // =============================
// 🔐 AUTH STATE LISTENER
  // =============================

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

          // 🔥 RESTORE (FIRST TIME ONLY)
          if (!restored && !restoring) {
            setRestoring(true);

            console.log("🔄 First time login → restoring data...");

            await restoreAllData();

            await AsyncStorage.setItem("isRestored", "true");

            setRestoring(false);
          }

          // 🔥 START AUTO SYNC (CORRECT PLACE)
          startAutoSync();

        } else {
          setProfile(null);
        }
      } else {
        // 🔥 VERY IMPORTANT
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
   // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // =============================
  // 🗄 INIT SQLITE & NOTIFICATIONS (ONCE)
  // =============================
  useEffect(() => {
    const init = async () => {
      try {
        initDB(); // ✅ ensure DB ready first

        // 🔔 NOTIFICATIONS INITIALIZATION AFTER DB
        await requestNotificationPermission();
        await configureNotificationChannels();
        await runDailyMaintenance();
      } catch (e) {
        console.log("Init error:", e);
      }
    };

    init();
  }, []);
  // =============================
  // 🌐 NETWORK LISTENER (SYNC ENGINE)
  // =============================
  useEffect(() => {
    try {
      startNetworkListener();
    } catch (e) {
      console.log("Network listener error:", e);
    }
  }, []);

  // =============================
  // ⏳ GLOBAL LOADER
  // =============================
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
    let isMounted = true;

    // Listen to notification taps when app is background/foreground
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      // Give navigation ref a moment to mount if app is just cold starting
      setTimeout(() => {
        if (navigationRef.isReady()) {
          if (data?.caseId) {
            // Check if case exists logic would be nice, but navigation will fail safely
            // if we just try. For exact requirements: "If the related case no longer exists: Open Notification Center"
            // We pass it to CaseDetail, and CaseDetail can handle missing case by popping and replacing with NotificationCenter.
            // Or we do it gracefully here by trusting the db via a direct query. Since we can't await DB here easily without a separate async call:

            // Note: Since CaseDetail reads case by ID, it can show an alert or redirect.
            navigationRef.navigate("CaseDetail", { caseId: data.caseId });
          } else {
            navigationRef.navigate("NotificationCenter");
          }
        }
      }, 500);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [navigationRef]);

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
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
      <AppNavigator user={user} profile={profile} onLogout={handleLogout} ref={navigationRef} />
    </>
  );
}

// =============================
// 🎨 STYLES
// =============================
const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",

  },
});
