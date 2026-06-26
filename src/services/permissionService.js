import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";

// 🔐 GET CURRENT USER PERMISSIONS
export const getMyPermissions = async (uid) => {
  const q = query(collection(db, "links"), where("memberUid", "==", uid));

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return snapshot.docs[0].data().permissions || {};
  }

  return null; // lawyer will not have link
};
