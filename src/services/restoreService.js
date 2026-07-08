import { collection, getDocs } from "firebase/firestore";
import { auth, db as firebaseDB } from "./firebaseConfig";
import { db } from "./sqliteService";
import { recalculateNextHearing } from "./sqliteService";

export const restoreAllData = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    console.log("🚀 FORCE RESTORE STARTED");
    console.log("🔄 Fetching FULL data from Firebase...");

    // Phase 1: Download ALL collections from Firebase first (No SQLite transactions yet)
    const [
      casesSnap,
      clientsSnap,
      hearingsSnap,
      notesSnap,
      feesSnap,
      linksSnap,
      masterSnap,
      citationsSnap,
      timelineSnap,
    ] = await Promise.all([
      getDocs(collection(firebaseDB, "users", uid, "cases")),
      getDocs(collection(firebaseDB, "users", uid, "clients")),
      getDocs(collection(firebaseDB, "users", uid, "hearings")),
      getDocs(collection(firebaseDB, "users", uid, "case_notes")),
      getDocs(collection(firebaseDB, "users", uid, "processFees")),
      getDocs(collection(firebaseDB, "users", uid, "quick_links")),
      getDocs(collection(firebaseDB, "users", uid, "master_items")),
      getDocs(collection(firebaseDB, "users", uid, "citations")),
      getDocs(collection(firebaseDB, "users", uid, "timeline")),
    ]);

    console.log("📥 All collections downloaded. Starting local database transaction...");

    // Phase 2: Open SQLite Transaction and execute deletes & inserts
    db.execSync("BEGIN TRANSACTION;");

    try {
      db.runSync("DELETE FROM cases");
      db.runSync("DELETE FROM clients");
      db.runSync("DELETE FROM hearings");
      db.runSync("DELETE FROM processFees");
      db.runSync("DELETE FROM case_notes");
      db.runSync("DELETE FROM quick_links");
      db.runSync("DELETE FROM master_items");
      db.runSync("DELETE FROM citations");
      db.runSync("DELETE FROM timeline");

      // =========================
      // 📁 CASES
      // =========================
      casesSnap.forEach((doc) => {
        const item = doc.data();
        const remoteId = doc.id;
        const idNum = Number(remoteId);

        if (isNaN(idNum)) {
          console.warn("⚠️ Architectural inconsistency: Firebase case doc.id is not numeric.", remoteId);
          return;
        }

        db.runSync(
          `INSERT OR REPLACE INTO cases
(id, remoteId, title, court, caseNo, opponent, clientId, clientName, clientMobile, clientEmail,
 status, priority, nextHearingDate, nextHearingISO, stage, judge, representingSide, opposingCounsel,
 institutionDate, sourceSystem, location, feeDecided, feePaid, feeBalance, description,
 cmsType, districtId, tehsilId, tehsilName, caseYear, courtType, caseCategory, caseType,
 cmsCaseId, cmsRawData, courtGroup, litigationDomain, firNo, firDate, aiChatLink,
 workflowType, normalizedCategory, procedureFamily, cmsLastVerified, cmsAutoSync,
 createdAt, isDeleted, syncStatus, updatedAt)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idNum,
            remoteId,
            item.title || "",
            item.court || "",
            item.caseNo || "",
            item.opponent || "",
            item.clientId ? Number(item.clientId) : null,
            item.clientName || "",
            item.clientMobile || "",
            item.clientEmail || "",
            item.status || "active",
            item.priority || "normal",
            item.nextHearingDate || "",
            item.nextHearingISO || "",
            item.stage || "",
            item.judge || "",
            item.representingSide || "",
            item.opposingCounsel || "",
            item.institutionDate || "",
            item.sourceSystem || "",
            item.location || "",
            item.feeDecided || 0,
            item.feePaid || 0,
            item.feeBalance || 0,
            item.description || "",
            item.cmsType || null,
            item.districtId || null,
            item.tehsilId || null,
            item.tehsilName || null,
            item.caseYear || null,
            item.courtType || null,
            item.caseCategory || null,
            item.caseType || "civil",
            item.cmsCaseId || null,
            item.cmsRawData || null,
            item.courtGroup || null,
            item.litigationDomain || null,
            item.firNo || null,
            item.firDate || null,
            item.aiChatLink || null,
            item.workflowType || null,
            item.normalizedCategory || null,
            item.procedureFamily || null,
            item.cmsLastVerified || null,
            item.cmsAutoSync !== undefined ? item.cmsAutoSync : 1,
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
      clientsSnap.forEach((doc) => {
        const item = doc.data();
        const remoteId = doc.id;
        const idNum = Number(remoteId);

        if (isNaN(idNum)) {
          console.warn("⚠️ Architectural inconsistency: Firebase client doc.id is not numeric.", remoteId);
          return;
        }

        db.runSync(
          `INSERT OR REPLACE INTO clients
          (id, remoteId, name, mobile, email, address, createdAt, isArchived, isDeleted, syncStatus, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idNum,
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
      hearingsSnap.forEach((doc) => {
        const item = doc.data();
        const remoteId = doc.id;
        const idNum = Number(remoteId);

        if (isNaN(idNum)) {
          console.warn("⚠️ Architectural inconsistency: Firebase hearing doc.id is not numeric.", remoteId);
          return;
        }

        db.runSync(
          `INSERT OR REPLACE INTO hearings
    (id, remoteId, caseId, hearingDate, stage, court, judge, description, notes, createdAt, isDeleted, syncStatus, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idNum,
            remoteId,
            item.caseId ? Number(item.caseId) : null,
            item.hearingDate || "",
            item.stage || "",
            item.court || "",
            item.judge || "",
            item.description || "",
            item.notes || "",
            item.createdAt || Date.now(),
            item.isDeleted || 0,
            "synced",
            item.updatedAt || Date.now(),
          ],
        );
      });

      // =========================
      // 📝 NOTES
      // =========================
      notesSnap.forEach((doc) => {
        const item = doc.data();
        const remoteId = doc.id;
        const idNum = Number(remoteId);

        if (isNaN(idNum)) {
          console.warn("⚠️ Architectural inconsistency: Firebase case_note doc.id is not numeric.", remoteId);
          return;
        }

        db.runSync(
          `INSERT OR REPLACE INTO case_notes
          (id, remoteId, caseId, text, image, createdAt, isDeleted, syncStatus, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idNum,
            remoteId,
            item.caseId ? Number(item.caseId) : null,
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
      // 💰 PROCESS FEES
      // =========================
      feesSnap.forEach((doc) => {
        const item = doc.data();
        const remoteId = doc.id;
        const idNum = Number(remoteId);

        if (isNaN(idNum)) {
          console.warn("⚠️ Architectural inconsistency: Firebase processFee doc.id is not numeric.", remoteId);
          return;
        }

        db.runSync(
          `INSERT OR REPLACE INTO processFees
          (id, remoteId, caseId, caseName, court, amount, purpose, date, note, paid, paidTo, paidDate, isDeleted, syncStatus, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idNum,
            remoteId,
            item.caseId ? Number(item.caseId) : null,
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
      linksSnap.forEach((doc) => {
        const item = doc.data();
        const remoteId = doc.id;
        const idNum = Number(remoteId);

        if (isNaN(idNum)) {
          console.warn("⚠️ Architectural inconsistency: Firebase quick_link doc.id is not numeric.", remoteId);
          return;
        }

        db.runSync(
          `INSERT OR REPLACE INTO quick_links
          (id, remoteId, title, url, category, isFavorite, isPinned, isDeleted, syncStatus, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idNum,
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
      masterSnap.forEach((doc) => {
        const item = doc.data();
        const remoteId = doc.id;
        const idNum = Number(remoteId);

        if (isNaN(idNum)) {
          console.warn("⚠️ Architectural inconsistency: Firebase master_item doc.id is not numeric.", remoteId);
          return;
        }

        db.runSync(
          `INSERT OR REPLACE INTO master_items
          (id, remoteId, type, groupName, value, isDeleted, syncStatus, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idNum,
            remoteId,
            item.type || "",
            item.groupName || null,
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
      citationsSnap.forEach((doc) => {
        const item = doc.data();
        const remoteId = doc.id;
        const idNum = Number(remoteId);

        if (isNaN(idNum)) {
          console.warn("⚠️ Architectural inconsistency: Firebase citation doc.id is not numeric.", remoteId);
          return;
        }

        db.runSync(
          `INSERT OR REPLACE INTO citations
          (id, remoteId, caseId, citation, description, date, isDeleted, syncStatus, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idNum,
            remoteId,
            item.caseId ? String(item.caseId) : null,
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
      // 📜 TIMELINE
      // =========================
      timelineSnap.forEach((doc) => {
        const item = doc.data();
        const remoteId = doc.id;
        const idNum = Number(remoteId);

        if (isNaN(idNum)) {
          console.warn("⚠️ Architectural inconsistency: Firebase timeline doc.id is not numeric.", remoteId);
          return;
        }

        db.runSync(
          `INSERT OR REPLACE INTO timeline
      (id, remoteId, caseId, hearingDate, stage, court, judge, description, proceedings, remarks, createdAt, isDeleted, syncStatus, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idNum,
            remoteId,
            item.caseId ? String(item.caseId) : null, // 🔥 ALWAYS STRING in schema
            item.hearingDate || "",
            item.stage || "",
            item.court || "",
            item.judge || "",
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

      console.log("🔄 Restored all data, recalculating next hearing dates...");

      const cases = db.getAllSync("SELECT id FROM cases WHERE isDeleted=0");

      cases.forEach((c) => {
        recalculateNextHearing(c.id);
      });

      db.execSync("COMMIT;");
      console.log("✅ FULL restore complete and committed.");
    } catch (dbError) {
      db.execSync("ROLLBACK;");
      console.log("❌ Restore database transaction failed, rolled back changes:", dbError);
      throw dbError;
    }
  } catch (e) {
    console.log("❌ Restore error during fetch or initialization:", e);
  }
};
