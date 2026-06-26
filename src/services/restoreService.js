import { collection, getDocs } from "firebase/firestore";
import { auth, db as firebaseDB } from "./firebaseConfig";
import { db } from "./sqliteService";
export const restoreAllData = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (__DEV__) console.log("🚀 FORCE RESTORE STARTED");
    if (__DEV__) console.log("🔄 Restoring FULL data from Firebase...");

    try {
      db.runSync("BEGIN TRANSACTION");
      db.runSync("DELETE FROM cases");
      db.runSync("DELETE FROM clients");
      db.runSync("DELETE FROM hearings");
      db.runSync("DELETE FROM processFees");
      db.runSync("DELETE FROM case_notes");
      db.runSync("DELETE FROM quick_links");
      db.runSync("DELETE FROM master_items");
      db.runSync("DELETE FROM citations");
      db.runSync("DELETE FROM timeline");
      db.runSync("COMMIT");
    } catch (e) {
      db.runSync("ROLLBACK");
      if (__DEV__) console.log("❌ Restore local wipe error:", e);
      return; // Stop if wipe fails
    }
    // =========================
    // 📁 CASES (FULL FIX)
    // =========================
    const casesSnap = await getDocs(
      collection(firebaseDB, "users", uid, "cases"),
    );

    casesSnap.forEach((doc) => {
      const item = doc.data();
      const remoteId = doc.id;

      db.runSync(
        `INSERT OR REPLACE INTO cases 
(id, remoteId, title, court, caseNo, opponent, description, clientId, clientName, clientMobile, clientEmail,
 status, priority, nextHearingDate, nextHearingISO, stage,
 feeDecided, feePaid, feeBalance, createdAt,
 isDeleted, syncStatus, updatedAt)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          remoteId,
          remoteId,
          item.title || "",
          item.court || "",
          item.caseNo || "",
          item.opponent || "",
          item.description || "", // 🔥 THIS FIXES YOUR PDF ISSUE
          item.clientId || null,
          item.clientName || "",
          item.clientMobile || "",
          item.clientEmail || "",
          item.status || "active",
          item.priority || "normal",
          item.nextHearingDate || "",
          item.nextHearingISO || "",
          item.stage || "",
          item.feeDecided || 0,
          item.feePaid || 0,
          item.feeBalance || 0,
          item.createdAt || Date.now(),
          item.isDeleted || 0,
          "synced",
          item.updatedAt || Date.now(),
        ],
      );
    });

    // =========================
    // 👤 CLIENTS
    // =========================
    const clientsSnap = await getDocs(
      collection(firebaseDB, "users", uid, "clients"),
    );

    clientsSnap.forEach((doc) => {
      const item = doc.data();
      const remoteId = doc.id;

      db.runSync(
        `INSERT OR REPLACE INTO clients 
        (id, remoteId, name, mobile, email, address, createdAt, isArchived, isDeleted, syncStatus, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          remoteId,
          remoteId,
          item.name || "",
          item.mobile || "",
          item.email || "",
          item.address || "",
          item.createdAt || Date.now(),
          item.isArchived || 0,
          item.isDeleted || 0,
          "synced",
          item.updatedAt || Date.now(),
        ],
      );
    });

    // =========================
    // 📅 HEARINGS
    // =========================
    const hearingsSnap = await getDocs(
      collection(firebaseDB, "users", uid, "hearings"),
    );

    hearingsSnap.forEach((doc) => {
      const item = doc.data();
      const remoteId = doc.id;

      db.runSync(
        `INSERT OR REPLACE INTO hearings 
  (remoteId, caseId, hearingDate, stage, court, description, notes, createdAt, isDeleted, syncStatus, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          remoteId,
          item.caseId || null,
          item.hearingDate || "",
          item.stage || "",
          item.court || "",
          item.description || "",
          item.notes || "",
          item.createdAt || Date.now(),
          item.isDeleted || 0,
          "synced",
          item.updatedAt || Date.now(),
        ],
      );
    });
    console.log("🔄 Recalculating next hearing dates...");

    const cases = db.getAllSync("SELECT id FROM cases");

    cases.forEach((c) => {
      const next = db.getFirstSync(
        `SELECT hearingDate 
     FROM hearings 
     WHERE caseId=? AND isDeleted=0 
     ORDER BY hearingDate ASC 
     LIMIT 1`,
        [c.id],
      );

      if (next?.hearingDate) {
        db.runSync(
          `UPDATE cases 
       SET nextHearingDate=?, nextHearingISO=? 
       WHERE id=?`,
          [next.hearingDate, next.hearingDate, c.id],
        );
      }
    });
    // =========================
    // 📝 NOTES
    // =========================
    const notesSnap = await getDocs(
      collection(firebaseDB, "users", uid, "case_notes"),
    );

    notesSnap.forEach((doc) => {
      const item = doc.data();
      const remoteId = doc.id;

      db.runSync(
        `INSERT OR REPLACE INTO case_notes 
        (id, caseId, text, image, createdAt, isDeleted, syncStatus, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          remoteId,
          item.caseId || null,
          item.text || "",
          item.image || "",
          item.createdAt || Date.now(),
          item.isDeleted || 0,
          "synced",
          item.updatedAt || Date.now(),
        ],
      );
    });

    // =========================
    // 💰 PROCESS FEES (FIXED WITH remoteId)
    // =========================
    const feesSnap = await getDocs(
      collection(firebaseDB, "users", uid, "processFees"),
    );

    feesSnap.forEach((doc) => {
      const item = doc.data();
      const remoteId = doc.id;

      db.runSync(
        `INSERT OR REPLACE INTO processFees 
        (id, remoteId, caseId, caseName, court, amount, purpose, date, note, paid, paidTo, paidDate, isDeleted, syncStatus, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          remoteId,
          remoteId,
          item.caseId || null,
          item.caseName || "",
          item.court || "",
          item.amount || 0,
          item.purpose || "",
          item.date || "",
          item.note || "",
          item.paid || 0,
          item.paidTo || "",
          item.paidDate || "",
          item.isDeleted || 0,
          "synced",
          item.updatedAt || Date.now(),
        ],
      );
    });

    // =========================
    // 🔗 QUICK LINKS
    // =========================
    const linksSnap = await getDocs(
      collection(firebaseDB, "users", uid, "quick_links"),
    );

    linksSnap.forEach((doc) => {
      const item = doc.data();
      const remoteId = doc.id;

      db.runSync(
        `INSERT OR REPLACE INTO quick_links 
        (id, remoteId, title, url, category, isFavorite, isPinned, isDeleted, syncStatus, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          remoteId,
          remoteId,
          item.title || "",
          item.url || "",
          item.category || "personal",
          item.isFavorite || 0,
          item.isPinned || 0,
          item.isDeleted || 0,
          "synced",
          item.updatedAt || Date.now(),
        ],
      );
    });

    // =========================
    // ⚙️ MASTER ITEMS
    // =========================
    const masterSnap = await getDocs(
      collection(firebaseDB, "users", uid, "master_items"),
    );

    masterSnap.forEach((doc) => {
      const item = doc.data();
      const remoteId = doc.id;

      db.runSync(
        `INSERT OR REPLACE INTO master_items 
        (id, remoteId, type, value, isDeleted, syncStatus, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          remoteId,
          remoteId,
          item.type || "",
          item.value || "",
          item.isDeleted || 0,
          "synced",
          item.updatedAt || Date.now(),
        ],
      );
    });

    // =========================
    // 📚 CITATIONS
    // =========================
    const citationsSnap = await getDocs(
      collection(firebaseDB, "users", uid, "citations"),
    );

    citationsSnap.forEach((doc) => {
      const item = doc.data();
      const remoteId = doc.id;

      db.runSync(
        `INSERT OR REPLACE INTO citations 
        (id, remoteId, caseId, citation, description, date, isDeleted, syncStatus, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          remoteId,
          remoteId,
          item.caseId || "",
          item.citation || "",
          item.description || "",
          item.date || "",
          item.isDeleted || 0,
          "synced",
          item.updatedAt || Date.now(),
        ],
      );
    });
    // =========================
    // 📜 TIMELINE (NEW)
    // =========================
    const timelineSnap = await getDocs(
      collection(firebaseDB, "users", uid, "timeline"),
    );

    timelineSnap.forEach((doc) => {
      const item = doc.data();
      const remoteId = doc.id;

      db.runSync(
        `INSERT OR REPLACE INTO timeline 
    (id, remoteId, caseId, hearingDate, stage, court, description, proceedings, remarks, createdAt, isDeleted, syncStatus, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          remoteId,
          remoteId,
          item.caseId ? String(item.caseId) : null, // 🔥 FORCE STRING
          item.hearingDate || "",
          item.stage || "",
          item.court || "",
          item.description || "",
          item.proceedings || "",
          item.remarks || "",
          item.createdAt || Date.now(),
          item.isDeleted || 0,
          "synced",
          item.updatedAt || Date.now(),
        ],
      );
    });

    console.log("✅ FULL restore complete");
  } catch (e) {
    console.log("❌ Restore error:", e);
  }
};
