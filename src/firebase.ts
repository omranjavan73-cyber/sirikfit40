import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};
const apiKey = metaEnv.VITE_FIREBASE_API_KEY || firebaseConfigJson?.apiKey || 'AIzaSyDDT03m1Qxzzdk9drEMF-R9L1Y_VzhkyCY';
const authDomain = metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson?.authDomain || 'sirik-fit-db.firebaseapp.com';
const projectId = metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson?.projectId || 'sirik-fit-db';
const storageBucket = metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson?.storageBucket || 'sirik-fit-db.firebasestorage.app';
const messagingSenderId = metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson?.messagingSenderId || '647943404812';
const appId = metaEnv.VITE_FIREBASE_APP_ID || firebaseConfigJson?.appId || '1:647943404812:web:2aac3fab6cdfab690f1d29';
const firestoreDatabaseId = firebaseConfigJson?.firestoreDatabaseId;

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

export const isFirebaseConfigured = Boolean(apiKey && projectId && apiKey !== '');

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = (firestoreDatabaseId && firestoreDatabaseId !== '(default)') ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);

// Helper: Save/Update User Profile in Firestore "users" collection
export async function saveUserProfileToFirestore(userData: {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  createdAt?: string;
}) {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', userData.id);
    await setDoc(
      userRef,
      {
        uid: userData.id,
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        email: userData.email || '',
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error saving user profile to Firestore:', err);
  }
}

// Helper: Save Order in Firestore "orders" collection
export async function saveOrderToFirestore(orderData: any) {
  if (!db) return;
  try {
    const orderId = orderData.id || orderData.orderId || 'ord-' + Date.now();
    const orderRef = doc(db, 'orders', orderId);
    const dataToSave = {
      ...orderData,
      orderId,
      createdAt: orderData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(orderRef, dataToSave, { merge: true });
    return orderId;
  } catch (err) {
    console.warn('Error saving order to Firestore:', err);
  }
}

// Helper: Fetch User Orders from Firestore
export async function fetchUserOrdersFromFirestore(userId: string, userPhone?: string) {
  if (!db) return [];
  try {
    const ordersRef = collection(db, 'orders');
    let q = query(ordersRef, where('userId', '==', userId));
    let snapshot = await getDocs(q);

    if (snapshot.empty && userPhone) {
      q = query(ordersRef, where('userPhone', '==', userPhone));
      snapshot = await getDocs(q);
    }

    const orders: any[] = [];
    snapshot.forEach((docSnap) => {
      orders.push({ id: docSnap.id, ...docSnap.data() });
    });
    return orders;
  } catch (err) {
    console.warn('Error fetching user orders from Firestore:', err);
    return [];
  }
}

// Helper: Sync Admin Panel settings with Firestore "settings/app" document
export async function saveSettingsToFirestore(settingsData: any) {
  if (!db) return;
  try {
    const settingsRef = doc(db, 'settings', 'app');
    await setDoc(
      settingsRef,
      {
        ...settingsData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error saving settings to Firestore:', err);
  }
}

// Helper: Fetch Admin Panel settings from Firestore
export async function fetchSettingsFromFirestore() {
  if (!db) return null;
  try {
    const settingsRef = doc(db, 'settings', 'app');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.warn('Error fetching settings from Firestore:', err);
  }
  return null;
}

// Helper: Check Database Connection Status
export async function checkFirestoreConnection(): Promise<{
  connected: boolean;
  dbId?: string;
  error?: string;
}> {
  if (!isFirebaseConfigured || !db) {
    return { connected: false, error: 'Firebase configuration missing' };
  }
  try {
    const pingRef = doc(db, 'settings', 'healthcheck');
    await setDoc(pingRef, { lastPing: new Date().toISOString() }, { merge: true });
    return { connected: true, dbId: firestoreDatabaseId || '(default)' };
  } catch (err: any) {
    console.warn('Firestore connection check error:', err);
    return { connected: false, error: err?.message || 'Connection failed' };
  }
}

export default app;