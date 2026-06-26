import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

// 🔐 REGISTER
export const registerUser = async (email, password) => {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  return res.user;
};

// 🔐 LOGIN
export const loginUser = async (email, password) => {
  const res = await signInWithEmailAndPassword(auth, email, password);
  return res.user;
};

// 🚪 LOGOUT
export const logoutUser = async () => {
  await signOut(auth);
};
// 🔑 RESET PASSWORD
export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

// ❌ DELETE ACCOUNT
export const deleteAccount = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  await deleteUser(user);
};
