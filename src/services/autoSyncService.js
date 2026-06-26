import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { syncPendingData } from "./syncService";
import { getSyncStatus } from "./syncStatus";

let isInitialized = false;

export const startAutoSync = () => {
  if (isInitialized) return;
  isInitialized = true;

  console.log("🚀 Auto Sync Initialized");

  // 🔐 WAIT FOR LOGIN
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("✅ User logged in → starting sync");

      const status = getSyncStatus();

      if (status !== "syncing") {
        syncPendingData();
      } else {
        console.log("⛔ Sync already running → skip (auth trigger)");
      }
    }
  });
};
