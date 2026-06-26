import NetInfo from "@react-native-community/netinfo";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db as firebaseDB } from "./firebaseConfig";
import { db } from "./sqliteService";
import { setSyncStatus } from "./syncStatus";
// 🔥 PREVENT MULTIPLE SYNC RUNS
let isSyncing = false;
// =========================
// 🧠 STEP 3: MEMORY CACHE (NEW)
// =========================
const remoteCache = {};

const getCachedDoc = async (collectionName, docId) => {
  const key = `${collectionName}_${docId}`;

  // ✅ RETURN FROM CACHE
  if (remoteCache[key]) {
    return remoteCache[key];
  }

  // 🔥 FETCH FROM FIREBASE
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const ref = doc(firebaseDB, "users", uid, collectionName, docId);
  const snap = await getDoc(ref);

  const data = snap.exists() ? snap.data() : null;

  // ✅ SAVE TO CACHE
  remoteCache[key] = data;

  return data;
};
export const syncPendingData = async () => {
  if (!auth.currentUser) {
    console.log("⏳ User not ready → aborting sync");
    return;
  }
  const uid = auth.currentUser.uid;
  // 🚫 BLOCK if already syncing
  // 🔥 REMOVE navigator check (handled by networkService)
  if (isSyncing) {
    console.log("⏳ Sync already in progress, skipping...");
    return;
  }
  const state = await NetInfo.fetch();
  const isOnline = state.isConnected && state.isInternetReachable !== false;

  // 🛑 STOP SYNC IF OFFLINE
  if (!isOnline) {
    console.log("📴 Abort sync → offline");

    setSyncStatus("offline");
    isSyncing = false;

    return;
  }
  isSyncing = true;

  try {
    setSyncStatus("syncing");
    console.log("🚀 Sync started...");

    // =========================
    // 🔁 1. CLEAN SYNC CASES (STABLE)
    // =========================
    const cases = db.getAllSync(
      "SELECT * FROM cases WHERE syncStatus IN ('pending','failed')",
    );

    console.log("📦 CASES TO SYNC:", cases);

    for (let item of cases) {
      try {
        console.log("📤 Syncing case:", item.id);

        const docId = item.remoteId || String(item.id);
        const ref = doc(firebaseDB, "users", uid, "cases", docId);

        // 🔥 GET REMOTE
        const remote = item.remoteId
          ? await getCachedDoc("cases", docId)
          : null;

        // =========================
        // 🧠 SIMPLE RULE (FINAL)
        // =========================
        if (remote && (remote.updatedAt || 0) >= (item.updatedAt || 0)) {
          console.log("⏭️ Skip (remote same/newer):", item.id);

          db.runSync("UPDATE cases SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        }

        // =========================
        // 🔁 LOCAL → FIREBASE
        // =========================
        if (item.isDeleted) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            ...item,
            ownerId: uid,
            updatedAt: item.updatedAt,
          });
        }

        // 🔥 SAVE remoteId
        if (!item.remoteId) {
          db.runSync("UPDATE cases SET remoteId=? WHERE id=?", [
            docId,
            item.id,
          ]);
        }

        // ✅ MARK SYNCED
        db.runSync("UPDATE cases SET syncStatus='synced' WHERE id=?", [
          item.id,
        ]);
      } catch (e) {
        console.log("❌ Case sync failed:", e);

        db.runSync("UPDATE cases SET syncStatus='failed' WHERE id=?", [
          item.id,
        ]);
      }
    }

    // =========================
    // 🔁 2. CLEAN SYNC CLIENTS
    // =========================
    const clients = db.getAllSync(
      "SELECT * FROM clients WHERE syncStatus IN ('pending','failed')",
    );

    console.log("📦 CLIENTS TO SYNC:", clients);

    for (let item of clients) {
      try {
        console.log("📤 Syncing client:", item.id);

        const docId = item.remoteId || String(item.id);
        const ref = doc(firebaseDB, "users", uid, "clients", docId);

        // 🔥 GET REMOTE
        const remote = item.remoteId
          ? await getCachedDoc("clients", docId)
          : null;

        // 🔥 OPTIONAL SAFETY FIX
        if (remote && !remote.ownerId) {
          console.log("⚠️ Fixing missing ownerId for client:", item.id);

          await setDoc(ref, {
            ...remote,
            ownerId: uid,
          });
        }

        // =========================
        // 🧠 SIMPLE RULE
        // =========================
        if (remote && (remote.updatedAt || 0) >= (item.updatedAt || 0)) {
          console.log("⏭️ Skip (remote same/newer):", item.id);

          db.runSync("UPDATE clients SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        }

        // =========================
        // 🔁 LOCAL → FIREBASE
        // =========================
        if (item.isDeleted) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            ...item,
            ownerId: uid,
            updatedAt: item.updatedAt,
          });
        }

        // 🔥 SAVE remoteId
        if (!item.remoteId) {
          db.runSync("UPDATE clients SET remoteId=? WHERE id=?", [
            docId,
            item.id,
          ]);
        }

        // ✅ MARK SYNCED
        db.runSync("UPDATE clients SET syncStatus='synced' WHERE id=?", [
          item.id,
        ]);
      } catch (e) {
        console.log("❌ client sync failed:", e);

        db.runSync("UPDATE clients SET syncStatus='failed' WHERE id=?", [
          item.id,
        ]);
      }
    }

    // =========================
    // 🔁 3. CLEAN SYNC HEARINGS
    // =========================
    const hearings = db.getAllSync(
      "SELECT * FROM hearings WHERE syncStatus IN ('pending','failed')",
    );

    console.log("📦 HEARINGS TO SYNC:", hearings);

    for (let item of hearings) {
      try {
        console.log("📤 Syncing hearing:", item.id);

        const docId = item.remoteId || String(item.id);
        const ref = doc(firebaseDB, "users", uid, "hearings", docId);

        // 🔥 GET REMOTE
        // 🔥 GET REMOTE
        const remote = item.remoteId
          ? await getCachedDoc("hearings", docId)
          : null;

        // 🔥 FIX MISSING ownerId (CRITICAL)
        if (remote && !remote.ownerId) {
          console.log("⚠️ Fixing missing ownerId for hearing:", item.id);

          await setDoc(ref, {
            ...remote,
            ownerId: uid,
          });
        }

        // =========================
        // 🧠 SIMPLE RULE (FINAL)
        // =========================
        if (remote && (remote.updatedAt || 0) >= (item.updatedAt || 0)) {
          console.log("⏭️ Skip (remote same/newer):", item.id);

          db.runSync("UPDATE hearings SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        }

        // =========================
        // 🔁 LOCAL → FIREBASE
        // =========================
        if (item.isDeleted) {
          try {
            await deleteDoc(ref);
          } catch (error) {
            console.log(
              "⚠️ Delete skipped (permission issue):",
              item.id,
              error,
            );
          }

          db.runSync("UPDATE hearings SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        } else {
          await setDoc(ref, {
            ...item,
            ownerId: uid,
            updatedAt: item.updatedAt,
          });
        }

        // 🔥 SAVE remoteId
        if (!item.remoteId) {
          try {
            db.runSync(
              "UPDATE hearings SET remoteId=? WHERE id=? AND remoteId IS NULL",
              [docId, item.id],
            );
          } catch (_) {
            console.log("⚠️ Duplicate remoteId prevented:", item.id);
          }
        }

        // ✅ MARK SYNCED
        db.runSync("UPDATE hearings SET syncStatus='synced' WHERE id=?", [
          item.id,
        ]);
      } catch (e) {
        console.log("❌ hearing sync failed:", e);

        db.runSync("UPDATE hearings SET syncStatus='failed' WHERE id=?", [
          item.id,
        ]);
      }
    }

    // =========================
    // 🔁 4. CLEAN SYNC PROCESS FEES
    // =========================
    const fees = db.getAllSync(
      "SELECT * FROM processFees WHERE syncStatus IN ('pending','failed')",
    );

    console.log("📦 PROCESS FEES TO SYNC:", fees);

    for (let item of fees) {
      try {
        console.log("📤 Syncing process fee:", item.id);

        const docId = item.remoteId || String(item.id);
        const ref = doc(firebaseDB, "users", uid, "processFees", docId);

        // 🔥 GET REMOTE
        const remote = item.remoteId
          ? await getCachedDoc("processFees", docId)
          : null;

        // =========================
        // 🧠 SIMPLE RULE (FINAL)
        // =========================
        if (remote && (remote.updatedAt || 0) >= (item.updatedAt || 0)) {
          console.log("⏭️ Skip (remote same/newer):", item.id);

          db.runSync("UPDATE processFees SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        }

        // =========================
        // 🔁 LOCAL → FIREBASE
        // =========================
        if (item.isDeleted) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            ...item,
            ownerId: uid,
            updatedAt: item.updatedAt,
          });
        }

        // 🔥 SAVE remoteId
        if (!item.remoteId) {
          db.runSync("UPDATE processFees SET remoteId=? WHERE id=?", [
            docId,
            item.id,
          ]);
        }

        // ✅ MARK SYNCED
        db.runSync("UPDATE processFees SET syncStatus='synced' WHERE id=?", [
          item.id,
        ]);
      } catch (e) {
        console.log("❌ process fee sync failed:", e);

        db.runSync("UPDATE processFees SET syncStatus='failed' WHERE id=?", [
          item.id,
        ]);
      }
    }

    // =========================
    // 🔁 5. CLEAN SYNC CITATIONS
    // =========================
    const citations = db.getAllSync(
      "SELECT * FROM citations WHERE syncStatus IN ('pending','failed')",
    );

    console.log("📦 CITATIONS TO SYNC:", citations);

    for (let item of citations) {
      try {
        console.log("📤 Syncing citation:", item.id);

        const docId = item.remoteId || String(item.id);
        const ref = doc(firebaseDB, "users", uid, "citations", docId);

        // 🔥 GET REMOTE
        const remote = item.remoteId
          ? await getCachedDoc("citations", docId)
          : null;

        // =========================
        // 🧠 SIMPLE RULE (FINAL)
        // =========================
        if (remote && (remote.updatedAt || 0) >= (item.updatedAt || 0)) {
          console.log("⏭️ Skip (remote same/newer):", item.id);

          db.runSync("UPDATE citations SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        }

        // =========================
        // 🔁 LOCAL → FIREBASE
        // =========================
        if (item.isDeleted) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            ...item,
            ownerId: uid,
            updatedAt: item.updatedAt,
          });
        }

        // 🔥 SAVE remoteId
        if (!item.remoteId) {
          db.runSync("UPDATE citations SET remoteId=? WHERE id=?", [
            docId,
            item.id,
          ]);
        }

        // ✅ MARK SYNCED
        db.runSync("UPDATE citations SET syncStatus='synced' WHERE id=?", [
          item.id,
        ]);
      } catch (e) {
        console.log("❌ citation sync failed:", e);

        db.runSync("UPDATE citations SET syncStatus='failed' WHERE id=?", [
          item.id,
        ]);
      }
    }

    // =========================
    // 🔁 6. CLEAN SYNC QUICK LINKS
    // =========================
    const links = db.getAllSync(
      "SELECT * FROM quick_links WHERE syncStatus IN ('pending','failed')",
    );

    console.log("📦 QUICK LINKS TO SYNC:", links);

    for (let item of links) {
      try {
        console.log("📤 Syncing link:", item.id);

        const docId = item.remoteId || String(item.id);
        const ref = doc(firebaseDB, "users", uid, "quick_links", docId);

        // 🔥 GET REMOTE
        const remote = item.remoteId
          ? await getCachedDoc("quick_links", docId)
          : null;

        // =========================
        // 🧠 SIMPLE RULE (FINAL)
        // =========================
        if (remote && (remote.updatedAt || 0) >= (item.updatedAt || 0)) {
          console.log("⏭️ Skip (remote same/newer):", item.id);

          db.runSync("UPDATE quick_links SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        }

        // =========================
        // 🔁 LOCAL → FIREBASE
        // =========================
        if (item.isDeleted) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            ...item,
            ownerId: uid,
            updatedAt: item.updatedAt,
          });
        }

        // 🔥 SAVE remoteId
        if (!item.remoteId) {
          db.runSync("UPDATE quick_links SET remoteId=? WHERE id=?", [
            docId,
            item.id,
          ]);
        }

        // ✅ MARK SYNCED
        db.runSync("UPDATE quick_links SET syncStatus='synced' WHERE id=?", [
          item.id,
        ]);
      } catch (e) {
        console.log("❌ quick link sync failed:", e);

        db.runSync("UPDATE quick_links SET syncStatus='failed' WHERE id=?", [
          item.id,
        ]);
      }
    }

    // =========================
    // 🔁 7. CLEAN SYNC NOTES
    // =========================
    const notes = db.getAllSync(
      "SELECT * FROM case_notes WHERE syncStatus IN ('pending','failed')",
    );

    console.log("📦 NOTES TO SYNC:", notes);

    for (let item of notes) {
      try {
        console.log("📤 Syncing note:", item.id);

        console.log(
          "NOTE:",
          item.id,
          "DELETED:",
          item.isDeleted,
          "REMOTE:",
          item.remoteId,
        );

        const docId = item.remoteId || String(item.id);
        const ref = doc(firebaseDB, "users", uid, "case_notes", docId);

        // 🔥 GET REMOTE
        const remote = item.remoteId
          ? await getCachedDoc("case_notes", docId)
          : null;

        // =========================
        // 🧠 SIMPLE RULE (FINAL)
        // =========================
        if (remote && (remote.updatedAt || 0) >= (item.updatedAt || 0)) {
          console.log("⏭️ Skip (remote same/newer):", item.id);

          db.runSync("UPDATE case_notes SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        }

        // =========================
        // 🔁 LOCAL → FIREBASE
        // =========================
        if (item.isDeleted) {
          try {
            await deleteDoc(ref);
          } catch (error) {
            console.log("⚠️ Note delete skipped:", item.id, error);
          }

          db.runSync("UPDATE case_notes SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        } else {
          await setDoc(ref, {
            ...item,
            ownerId: uid,
            updatedAt: item.updatedAt,
          });
        }

        // 🔥 SAVE remoteId
        if (!item.remoteId) {
          db.runSync("UPDATE case_notes SET remoteId=? WHERE id=?", [
            docId,
            item.id,
          ]);
        }

        // ✅ MARK SYNCED
        db.runSync("UPDATE case_notes SET syncStatus='synced' WHERE id=?", [
          item.id,
        ]);

        const check = db.getFirstSync(
          "SELECT id, remoteId, syncStatus FROM case_notes WHERE id=?",
          [item.id],
        );

        console.log("AFTER UPDATE:", check);
      } catch (e) {
        console.log("❌ note sync failed:", e);

        db.runSync("UPDATE case_notes SET syncStatus='failed' WHERE id=?", [
          item.id,
        ]);
      }
    }
    // =========================
    // 🔁 CLEAN SYNC MASTER ITEMS
    // =========================
    const masterItems = db.getAllSync(
      "SELECT * FROM master_items WHERE syncStatus IN ('pending','failed')",
    );

    console.log("📦 MASTER ITEMS TO SYNC:", masterItems);

    for (let item of masterItems) {
      try {
        console.log("📤 Syncing master item:", item.id);

        const docId = item.remoteId || String(item.id);
        const ref = doc(firebaseDB, "users", uid, "master_items", docId);

        // 🔥 GET REMOTE
        const remote = item.remoteId
          ? await getCachedDoc("master_items", docId)
          : null;

        // =========================
        // 🧠 SIMPLE RULE (FINAL)
        // =========================
        if (remote && (remote.updatedAt || 0) >= (item.updatedAt || 0)) {
          console.log("⏭️ Skip (remote same/newer):", item.id);

          db.runSync("UPDATE master_items SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        }

        // =========================
        // 🔁 LOCAL → FIREBASE
        // =========================
        if (item.isDeleted) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            ...item,
            ownerId: uid,
            updatedAt: item.updatedAt,
          });
        }

        // 🔥 SAVE remoteId
        if (!item.remoteId) {
          db.runSync("UPDATE master_items SET remoteId=? WHERE id=?", [
            docId,
            item.id,
          ]);
        }

        // ✅ MARK SYNCED
        db.runSync("UPDATE master_items SET syncStatus='synced' WHERE id=?", [
          item.id,
        ]);
      } catch (e) {
        console.log("❌ master item sync failed:", e);

        db.runSync("UPDATE master_items SET syncStatus='failed' WHERE id=?", [
          item.id,
        ]);
      }
    }
    // =========================
    // 🔁 CLEAN SYNC TIMELINE
    // =========================
    const timeline = db.getAllSync(
      "SELECT * FROM timeline WHERE syncStatus IN ('pending','failed')",
    );

    console.log("📦 TIMELINE TO SYNC:", timeline);

    for (let item of timeline) {
      try {
        console.log("📤 Syncing timeline:", item.id);

        const docId = item.remoteId || String(item.id);
        const ref = doc(firebaseDB, "users", uid, "timeline", docId);

        // 🔥 GET REMOTE
        const remote = item.remoteId
          ? await getCachedDoc("timeline", docId)
          : null;

        // =========================
        // 🧠 SAME RULE
        // =========================
        if (remote && (remote.updatedAt || 0) >= (item.updatedAt || 0)) {
          console.log("⏭️ Skip (remote same/newer):", item.id);

          db.runSync("UPDATE timeline SET syncStatus='synced' WHERE id=?", [
            item.id,
          ]);

          continue;
        }

        // =========================
        // 🔁 LOCAL → FIREBASE
        // =========================
        if (item.isDeleted) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            ...item,
            ownerId: uid,
            updatedAt: item.updatedAt,
          });
        }

        // 🔥 SAVE remoteId
        if (!item.remoteId) {
          db.runSync("UPDATE timeline SET remoteId=? WHERE id=?", [
            docId,
            item.id,
          ]);
        }

        // ✅ MARK SYNCED
        db.runSync("UPDATE timeline SET syncStatus='synced' WHERE id=?", [
          item.id,
        ]);
      } catch (e) {
        console.log("❌ timeline sync failed:", e);

        db.runSync("UPDATE timeline SET syncStatus='failed' WHERE id=?", [
          item.id,
        ]);
      }
    }

    // =========================
    // ✅ SUCCESS
    // =========================
    const state = await NetInfo.fetch();
    const isOnline = state.isConnected && state.isInternetReachable !== false;

    if (!isOnline) {
      console.log("⚠️ Went offline during sync");

      setSyncStatus("offline");

      setTimeout(() => setSyncStatus("idle"), 1500);
    } else {
      setSyncStatus("success");

      setTimeout(() => setSyncStatus("idle"), 1500);

      console.log("✅ Sync completed successfully");
    }
  } catch (error) {
    setSyncStatus("error");
    console.log("❌ Sync error:", error);
  } finally {
    // 🔥 RESET LOCK
    isSyncing = false;

    // 🧠 CLEAR CACHE AFTER SYNC
    Object.keys(remoteCache).forEach((key) => delete remoteCache[key]);

    console.log("🧹 Cache cleared");
  }
};
