let listeners = [];
let currentStatus = "idle";

// 🔥 NEW: PROGRESS STATE
let progress = {
  current: 0,
  total: 0,
};

// =========================
// 🔄 SET STATUS
// =========================
export const setSyncStatus = (status) => {
  currentStatus = status;

  listeners.forEach((cb) => {
    try {
      cb(currentStatus, progress);
    } catch (e) {
      console.log("SyncStatus listener error:", e);
    }
  });
};

// =========================
// 📊 SET PROGRESS
// =========================
export const setSyncProgress = (current, total) => {
  progress = { current, total };

  listeners.forEach((cb) => {
    try {
      cb(currentStatus, progress);
    } catch (e) {
      console.log("Progress listener error:", e);
    }
  });
};

// =========================
// 📡 SUBSCRIBE
// =========================
export const subscribeSyncStatus = (cb) => {
  listeners.push(cb);

  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
};

// =========================
// 📊 GETTERS
// =========================
export const getSyncStatus = () => currentStatus;

export const getSyncProgress = () => progress;

// =========================
// 🎯 STATUS CONSTANTS
// =========================
export const SYNC_STATUS = {
  IDLE: "idle",
  SYNCING: "syncing",
  SUCCESS: "success",
  ERROR: "error",
  OFFLINE: "offline",
};
