import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  getDocs
} from 'firebase/firestore';

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

// Check Firestore Connection Status
export const checkFirestoreConnection = async (): Promise<boolean> => {
  try {
    const testDoc = doc(db, 'settings', 'financial');
    await getDoc(testDoc);
    return true;
  } catch (e) {
    console.error('Firestore connection error:', e);
    return false;
  }
};

// Save Financial Settings
export const saveSettingsToFirestore = async (settingsData: any): Promise<{ success: boolean; error?: any }> => {
  try {
    const docRef = doc(db, 'settings', 'financial');
    await setDoc(docRef, settingsData, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

// Fetch Financial Settings (Both alias names supported)
export const getSettingsFromFirestore = async (): Promise<any> => {
  try {
    const docRef = doc(db, 'settings', 'financial');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error(error);
  }
  return null;
};

export const fetchSettingsFromFirestore = getSettingsFromFirestore;

// Save Order
export const saveOrderToFirestore = async (orderData: any): Promise<{ success: boolean; id?: string; error?: any }> => {
  try {
    const orderId = orderData.id || `order_${Date.now()}`;
    const docRef = doc(db, 'orders', orderId);
    await setDoc(docRef, { ...orderData, updatedAt: new Date().toISOString() }, { merge: true });
    return { success: true, id: orderId };
  } catch (error) {
    return { success: false, error };
  }
};

// Save CMS
export const saveCmsToFirestore = async (cmsData: any): Promise<{ success: boolean; error?: any }> => {
  try {
    const docRef = doc(db, 'cms', 'config');
    await setDoc(docRef, cmsData, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export default app;