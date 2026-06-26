// services/firestoreDeleteService.js

import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db as firebaseDB } from "./firebaseConfig";

export const deleteUserFirestoreData = async (uid) => {
  const collections = [
    "cases",
    "clients",
    "hearings",
    "processFees",
    "case_notes",
    "quick_links",
    "master_items",
    "citations",
    "timeline",
  ];

  for (const col of collections) {
    try {
      console.log(`🗑️ Deleting collection: ${col}`);

      const snap = await getDocs(collection(firebaseDB, "users", uid, col));

      for (const d of snap.docs) {
        try {
          await deleteDoc(doc(firebaseDB, "users", uid, col, d.id));
        } catch (err) {
          console.log(`❌ Failed doc ${d.id} in ${col}`, err);
        }
      }

      console.log(`✅ Deleted collection: ${col}`);
    } catch (e) {
      console.log(`❌ Failed collection: ${col}`, e);
    }
  }

  // 🔥 DELETE ROOT USER PROFILE (FINAL FIX)
  try {
    await deleteDoc(doc(firebaseDB, "users", uid));
    console.log("🧹 Root user profile deleted");
  } catch (e) {
    console.log("❌ Failed to delete root user profile", e);
  }

  console.log("🔥 Firestore delete completed");
};
