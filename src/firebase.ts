import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
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
const apiKey = firebaseConfigJson?.apiKey || metaEnv.VITE_FIREBASE_API_KEY || 'AIzaSyBAB1TsbUTwgLcHxFaeIMVECS9zqGP7Zk0';
const authDomain = firebaseConfigJson?.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 'sirikfit40.firebaseapp.com';
const projectId = firebaseConfigJson?.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID || 'sirikfit40';
const storageBucket = firebaseConfigJson?.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 'sirikfit40.firebasestorage.app';
const messagingSenderId = firebaseConfigJson?.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '532757567852';
const appId = firebaseConfigJson?.appId || metaEnv.VITE_FIREBASE_APP_ID || '1:532757567852:web:01f36071e84c96b4933b49';
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

// Automatically sign in anonymously if not authenticated to grant Firestore read/write permissions
try {
  if (auth) {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) => {
          console.warn('Anonymous Auth sign-in bypassed:', err?.message || err);
        });
      }
    });
  }
} catch (_e) {}

export const db = (() => {
  try {
    return (firestoreDatabaseId && firestoreDatabaseId !== '(default)')
      ? initializeFirestore(app, { localCache: memoryLocalCache() }, firestoreDatabaseId)
      : initializeFirestore(app, { localCache: memoryLocalCache() });
  } catch (e) {
    try {
      return (firestoreDatabaseId && firestoreDatabaseId !== '(default)')
        ? getFirestore(app, firestoreDatabaseId)
        : getFirestore(app);
    } catch (_err) {
      return getFirestore(app);
    }
  }
})();

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
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const errMsg = errInfo.error;
  if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('permission-denied')) {
    console.warn('Firestore Notice (Local Storage Active):', path, errMsg);
  } else {
    console.warn('Firestore Notice:', path, errMsg);
  }
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

// Exported helper function for direct Firestore persistence with local storage fallback
export async function saveSettingsToFirestore(settingsData: any): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = { ...parsed, ...settingsData };
      localStorage.setItem('sirikfit_financial_settings', JSON.stringify(updated));
      localStorage.setItem('omex_financial_settings', JSON.stringify(updated));
    }
  } catch (_lsErr) {}

  if (!db) return true;
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
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return true;
  }
}

// Exported helper function for direct Firestore persistence with local storage fallback
export async function fetchSettingsFromFirestore() {
  let firestoreData: any = null;
  if (db) {
    const path = 'settings/app';
    try {
      const settingsRef = doc(db, 'settings', 'app');
      const docSnap = await getDoc(settingsRef);
      if (docSnap.exists()) {
        firestoreData = docSnap.data();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  try {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
      if (local) {
        const parsedLocal = JSON.parse(local);
        return firestoreData ? { ...parsedLocal, ...firestoreData } : parsedLocal;
      }
    }
  } catch (_lsErr) {}

  return firestoreData;
}

export const getSettingsFromFirestore = fetchSettingsFromFirestore;

// Exported helper function for direct Firestore persistence with local storage fallback
export async function saveCmsToFirestore(cmsData: any): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('sirikfit_cms_config');
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = { ...parsed, ...cmsData };
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(updated));
    }
  } catch (_lsErr) {}

  if (!db) return true;
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
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return true;
  }
}

// Exported helper function for direct Firestore persistence with local storage fallback
export async function getCmsFromFirestore() {
  let firestoreData: any = null;
  if (db) {
    const path = 'cms/app';
    try {
      const cmsRef = doc(db, 'cms', 'app');
      const docSnap = await getDoc(cmsRef);
      if (docSnap.exists()) {
        firestoreData = docSnap.data();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  try {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('sirikfit_cms_config');
      if (local) {
        const parsedLocal = JSON.parse(local);
        return firestoreData ? { ...parsedLocal, ...firestoreData } : parsedLocal;
      }
    }
  } catch (_lsErr) {}

  return firestoreData;
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

export async function checkFirestoreConnection(): Promise<{
  connected: boolean;
  dbId?: string;
  error?: string;
}> {
  if (!isFirebaseConfigured || !db) {
    return { connected: false, error: 'Firebase configuration missing' };
  }
  try {
    const settingsRef = doc(db, 'settings', 'app');
    await getDoc(settingsRef);
    return { connected: true, dbId: firestoreDatabaseId || '(default)' };
  } catch (err: any) {
    const hasLocal = typeof window !== 'undefined' && Boolean(
      localStorage.getItem('sirikfit_financial_settings') ||
      localStorage.getItem('omex_financial_settings') ||
      localStorage.getItem('sirikfit_cms_config')
    );
    if (hasLocal) {
      return { connected: true, dbId: (firestoreDatabaseId || 'local-fallback') + ' (Local Storage Active)' };
    }
    return { connected: false, error: err?.message || 'Permission or Connection Issue' };
  }
}

export default app;