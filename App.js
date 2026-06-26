import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS } from "./src/constants/colors";
import AppNavigator from "./src/navigation/AppNavigator";
import { startAutoSync } from "./src/services/autoSyncService";
import { auth } from "./src/services/firebaseConfig";
import { restoreAllData } from "./src/services/restoreService";
import { getUserProfile } from "./src/services/userService";
// ✅ REQUIRED SYSTEMS
import SyncIndicator from "./src/components/SyncIndicator";
import { startNetworkListener } from "./src/services/networkService";
import { initDB } from "./src/services/sqliteService";
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
  // 🗄 INIT SQLITE (ONCE)
  // =============================
  useEffect(() => {
    const init = async () => {
      try {
        initDB(); // ✅ ensure DB ready first
      } catch (e) {
        console.log("DB init error:", e);
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
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SyncIndicator />
      <AppNavigator user={user} profile={profile} onLogout={handleLogout} />
    </SafeAreaProvider>
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
    backgroundColor: COLORS.lightBg,
  },
});
