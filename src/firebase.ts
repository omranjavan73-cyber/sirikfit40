import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs 
} from 'firebase/firestore';

// 1. Firebase Config Setup from Environment
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBAB1TsbUTwgLchxFAcIMVECS9zqGP7Zk0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sirikfit40.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sirikfit40",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sirikfit40.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "532757567852",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:532757567852:web:01f36071e84c96b4933b49",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QFR8G0QFNH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 2. Direct Firestore Handlers for Settings & Pricing Rules
export const saveSettingsToFirestore = async (settingsData: any) => {
  try {
    const docRef = doc(db, 'settings', 'financial');
    await setDoc(docRef, settingsData, { merge: true });
    console.log('✅ تنظیمات نرخ درهم و قوانین با موفقیت در Firestore ذخیره شد.');
    return { success: true };
  } catch (error) {
    console.error('❌ خطا در ذخیره تنظیمات در Firestore:', error);
    return { success: false, error };
  }
};

export const getSettingsFromFirestore = async () => {
  try {
    const docRef = doc(db, 'settings', 'financial');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error('❌ خطا در دریافت تنظیمات از Firestore:', error);
  }
  return null;
};

// 3. Direct Firestore Handlers for Orders
export const saveOrderToFirestore = async (orderData: any) => {
  try {
    const orderId = orderData.id || `order_${Date.now()}`;
    const docRef = doc(db, 'orders', orderId);
    await setDoc(docRef, { ...orderData, updatedAt: new Date().toISOString() }, { merge: true });
    console.log('✅ سفارش با موفقیت در Firestore ثبت شد.');
    return { success: true, id: orderId };
  } catch (error) {
    console.error('❌ خطا در ثبت سفارش در Firestore:', error);
    return { success: false, error };
  }
};

// 4. Direct Firestore Handlers for CMS
export const saveCmsToFirestore = async (cmsData: any) => {
  try {
    const docRef = doc(db, 'cms', 'config');
    await setDoc(docRef, cmsData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('❌ خطا در ذخیره CMS در Firestore:', error);
    return { success: false, error };
  }
};

export default app;