import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDzIBu0TjwmGnOrNiHQ4o7pU-8mqZH05LE",
  authDomain: "legalsphereultimate.firebaseapp.com",
  projectId: "legalsphereultimate",
  storageBucket: "legalsphereultimate.firebasestorage.app",
  messagingSenderId: "90650929264",
  appId: "1:90650929264:web:23b77b9fda2f6a76dc6cb5",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 🔥 FIXED AUTH (IMPORTANT)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export default app;
