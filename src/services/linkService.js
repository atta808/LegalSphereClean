import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// =============================
// 🔗 CREATE LINK
// =============================
export const createLink = async (lawyerUid, memberUid, role) => {
  try {
    await addDoc(collection(db, "links"), {
      lawyerUid,
      memberUid,
      role,
      permissions: getDefaultPermissions(role),
      createdAt: serverTimestamp(),
    });
  } catch (_e) {
    throw new Error("Failed to create link");
  }
};

// =============================
// 🔍 GET LINKS FOR LAWYER
// =============================
export const getMyTeam = async (lawyerUid) => {
  const q = query(collection(db, "links"), where("lawyerUid", "==", lawyerUid));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// =============================
// 🔍 GET MY LAWYER (for clerk/client)
// =============================
export const getMyLawyer = async (uid) => {
  const q = query(collection(db, "links"), where("memberUid", "==", uid));

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return snapshot.docs[0].data().lawyerUid;
  }

  return null;
};

// =============================
// 🎯 DEFAULT PERMISSIONS
// =============================
const getDefaultPermissions = (role) => {
  if (role === "associate") {
    return {
      canViewCases: true,
      canEditCases: true,
      canDeleteCases: false,
      canViewFinance: false,
      canEditFinance: false,
    };
  }

  if (role === "clerk") {
    return {
      canViewCases: true,
      canEditCases: true,
      canDeleteCases: false,
      canViewFinance: false,
      canEditFinance: false,
    };
  }

  if (role === "client") {
    return {
      canViewCases: true,
      canEditCases: false,
      canViewFinance: false,
    };
  }

  return {};
};
