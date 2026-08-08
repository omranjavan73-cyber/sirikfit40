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
const apiKey = firebaseConfigJson?.apiKey || metaEnv.VITE_FIREBASE_API_KEY || 'AIzaSyDDT03m1Qxzzdk9drEMF-R9L1Y_VzhkyCY';
const authDomain = firebaseConfigJson?.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 'sirik-fit-db.firebaseapp.com';
const projectId = firebaseConfigJson?.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID || 'sirik-fit-db';
const storageBucket = firebaseConfigJson?.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 'sirik-fit-db.firebasestorage.app';
const messagingSenderId = firebaseConfigJson?.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '647943404812';
const appId = firebaseConfigJson?.appId || metaEnv.VITE_FIREBASE_APP_ID || '1:647943404812:web:2aac3fab6cdfab690f1d29';
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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error Context: ', JSON.stringify(errInfo));
  return errInfo;
}

// Helper: Save/Update User Profile in Firestore "users" collection
export async function saveUserProfileToFirestore(userData: {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  createdAt?: string;
}) {
  if (!db) return;
  const path = `users/${userData.id}`;
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
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Helper: Save Order in Firestore "orders" collection
export async function saveOrderToFirestore(orderData: any) {
  if (!db) return;
  const orderId = orderData.id || orderData.orderId || 'ord-' + Date.now();
  const path = `orders/${orderId}`;
  try {
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
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Helper: Fetch User Orders from Firestore
export async function fetchUserOrdersFromFirestore(userId: string, userPhone?: string) {
  if (!db) return [];
  const path = 'orders';
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
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

// Helper: Sync Admin Panel settings with Firestore "settings/app" document
export async function saveSettingsToFirestore(settingsData: any) {
  if (!db) return;
  const path = 'settings/app';
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
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Helper: Fetch Admin Panel settings from Firestore (Alias)
export async function fetchSettingsFromFirestore() {
  if (!db) return null;
  const path = 'settings/app';
  try {
    const settingsRef = doc(db, 'settings', 'app');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
}

export const getSettingsFromFirestore = fetchSettingsFromFirestore;

// Helper: Save CMS Config in Firestore "cms/app" document
export async function saveCmsToFirestore(cmsData: any) {
  if (!db) return;
  const path = 'cms/app';
  try {
    const cmsRef = doc(db, 'cms', 'app');
    await setDoc(
      cmsRef,
      {
        ...cmsData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Helper: Fetch CMS Config from Firestore
export async function getCmsFromFirestore() {
  if (!db) return null;
  const path = 'cms/app';
  try {
    const cmsRef = doc(db, 'cms', 'app');
    const docSnap = await getDoc(cmsRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
}

// Helper: Save Admin Password in Firestore "settings/admin" document
export async function saveAdminPasswordToFirestore(password: string) {
  if (!db) return;
  const path = 'settings/admin';
  try {
    const adminRef = doc(db, 'settings', 'admin');
    await setDoc(
      adminRef,
      {
        password,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Helper: Fetch Admin Password from Firestore
export async function getAdminPasswordFromFirestore() {
  if (!db) return null;
  const path = 'settings/admin';
  try {
    const adminRef = doc(db, 'settings', 'admin');
    const docSnap = await getDoc(adminRef);
    if (docSnap.exists()) {
      return docSnap.data()?.password || null;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
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
  const path = 'settings/healthcheck';
  try {
    const pingRef = doc(db, 'settings', 'healthcheck');
    await setDoc(pingRef, { lastPing: new Date().toISOString() }, { merge: true });
    return { connected: true, dbId: firestoreDatabaseId || '(default)' };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return { connected: false, error: err?.message || 'Connection failed' };
  }
}

export default app;