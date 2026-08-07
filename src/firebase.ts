import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';

// تنظیمات فایربیس اختصاصی پروژه Sirik Fit
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBAB1TsbUTwgLchxFAcIMVECS9zqGP7Zk0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sirikfit40.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sirikfit40",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sirikfit40.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "532757567852",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:532757567852:web:01f36071e84c96b4933b49",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QFR8G0QFNH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ورود با جیمیل / اکانت گوگل
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    return { success: false, error: error.message };
  }
};

// خروج از جیمیل
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// بررسی سلامت اتصال به دیتابیس Firestore
export const checkFirestoreConnection = async (): Promise<{ connected: boolean; dbId?: string }> => {
  try {
    const testDoc = doc(db, 'settings', 'financial');
    await getDoc(testDoc);
    return { connected: true, dbId: firebaseConfig.projectId };
  } catch (e) {
    console.error('Firestore connection error:', e);
    return { connected: false, dbId: firebaseConfig.projectId };
  }
};

// ذخیره‌سازی و خواندن تنظیمات
export const saveSettingsToFirestore = async (settingsData: any): Promise<{ success: boolean; error?: any }> => {
  try {
    const docRef = doc(db, 'settings', 'financial');
    await setDoc(docRef, settingsData, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const fetchSettingsFromFirestore = async (): Promise<any> => {
  try {
    const docRef = doc(db, 'settings', 'financial');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
  } catch (error) {
    console.error('Error fetching settings:', error);
  }
  return null;
};

// ذخیره‌سازی و خواندن CMS
export const saveCmsToFirestore = async (cmsData: any): Promise<{ success: boolean; error?: any }> => {
  try {
    const docRef = doc(db, 'cms', 'config');
    await setDoc(docRef, cmsData, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const getCmsFromFirestore = async (): Promise<any> => {
  try {
    const docRef = doc(db, 'cms', 'config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
  } catch (error) {
    console.error('Error fetching CMS:', error);
  }
  return null;
};

// ذخیره و خواندن رمز ادمین در فایربیس
export const saveAdminPasswordToFirestore = async (newPassword: string): Promise<{ success: boolean; error?: any }> => {
  try {
    const docRef = doc(db, 'settings', 'security');
    await setDoc(docRef, { adminPassword: newPassword, updatedAt: new Date().toISOString() }, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const getAdminPasswordFromFirestore = async (): Promise<string | null> => {
  try {
    const docRef = doc(db, 'settings', 'security');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().adminPassword) {
      return docSnap.data().adminPassword;
    }
  } catch (error) {
    console.error('Error fetching admin password:', error);
  }
  return null;
};

export default app;