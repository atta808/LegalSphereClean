import NetInfo from "@react-native-community/netinfo";
import { syncPendingData } from "./syncService";
import { getSyncStatus, setSyncStatus } from "./syncStatus";

let unsubscribe = null;
let lastNetworkState = null;
let lastSyncTime = 0;

export const startNetworkListener = () => {
  if (unsubscribe) return;

  unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline =
      state.isConnected === true && state.isInternetReachable === true;

    if (lastNetworkState !== null && lastNetworkState === isOnline) return;

    console.log("🔁 Network changed:", lastNetworkState, "→", isOnline);

    lastNetworkState = isOnline;

    console.log("🌐 Network status:", isOnline ? "ONLINE" : "OFFLINE");

    // 🔴 OFFLINE
    if (!isOnline) {
      console.log("📴 Offline mode");
      setSyncStatus("offline");
      return;
    }

    // 🟢 ONLINE
    const now = Date.now();

    if (now - lastSyncTime < 3000) {
      console.log("⏳ Sync throttled");
      return;
    }

    lastSyncTime = now;

    const currentStatus = getSyncStatus();

    if (currentStatus === "syncing") {
      console.log("⛔ Already syncing → skip trigger");
      return;
    }

    console.log("🚀 Internet restored → triggering sync...");

    if (typeof syncPendingData === "function") {
      syncPendingData().catch((e) => {
        if (__DEV__) {
          console.error("❌ Sync crash:", e);
        }
      });
    }
  });
};

export const stopNetworkListener = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};
