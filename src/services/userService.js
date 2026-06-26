import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

import {
  DEFAULT_ASSOCIATE_PERMISSIONS,
  DEFAULT_CLERK_PERMISSIONS,
  DEFAULT_CLIENT_PERMISSIONS,
} from "../constants/permissions";

// 🔐 CREATE PROFILE
export const createUserProfile = async (uid, data) => {
  const role = data.role || "lawyer";

  let permissions = {};

  if (role === "associate") {
    permissions = DEFAULT_ASSOCIATE_PERMISSIONS;
  } else if (role === "clerk") {
    permissions = DEFAULT_CLERK_PERMISSIONS;
  } else if (role === "client") {
    permissions = DEFAULT_CLIENT_PERMISSIONS;
  } else {
    permissions = { fullAccess: true };
  }

  const userData = {
    uid,
    email: data.email,
    role,
    permissions,
    seniorUid: role === "lawyer" ? uid : null,
    createdAt: Date.now(),
    ...data,
  };

  await setDoc(doc(db, "users", uid), userData);
};

// 🔐 GET PROFILE
export const getUserProfile = async (uid) => {
  const docRef = doc(db, "users", uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  return snap.data();
};
