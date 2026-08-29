import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { sanitizeForFirestore } from "../utils/sanitizePayload";

export const firebaseConfig = {
  apiKey: "AIzaSyB4BiTsbUtWgLcHxFAqImYEC59Zq6P7Zk0",
  authDomain: "sirikfit40.firebaseapp.com",
  projectId: "sirikfit40",
  storageBucket: "sirikfit40.firebasestorage.app",
  messagingSenderId: "532757567852",
  appId: "1:532757567852:web:01f36071a84c96b4933b49",
  measurementId: "G-QFR8G0QFNH"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const initAnalytics = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

export { sanitizeForFirestore };
export default firebaseConfig;
