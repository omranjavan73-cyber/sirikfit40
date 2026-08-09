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
const apiKey = firebaseConfigJson?.apiKey || metaEnv.VITE_FIREBASE_API_KEY || 'AIzaSyBABlTabUVtwgLcHxFaeINVECS9zqGP7Zk8';
const authDomain = firebaseConfigJson?.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 'sirikfit40.firebaseapp.com';
const projectId = firebaseConfigJson?.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID || 'sirikfit40';
const storageBucket = firebaseConfigJson?.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 'sirikfit40.appfirebasestorage.app';
const messagingSenderId = firebaseConfigJson?.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '532757567852';
const appId = firebaseConfigJson?.appId || metaEnv.VITE_FIREBASE_APP_ID || '1:532757567852:web:01f3671e84c96b4933b49';
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
  return errInfo;
}

export async function saveSettingsToFirestore(settingsData: any): Promise<boolean> {
  if (!db) return true;
  try {
    const settingsRef = doc(db, 'settings', 'app');
    await setDoc(settingsRef, { ...settingsData, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    return true;
  }
}

export async function saveCmsToFirestore(cmsData: any): Promise<boolean> {
  if (!db) return true;
  try {
    const cmsRef = doc(db, 'cms', 'app');
    await setDoc(cmsRef, { ...cmsData, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    return true;
  }
}

export default app;