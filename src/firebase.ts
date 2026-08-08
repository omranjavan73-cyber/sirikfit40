import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

// تنظیمات فایربیس مربوط به پروژه جدید شما (sirikfit40)
const firebaseConfig = {
  apiKey: "AIzaSyBAB1tsbUtWgLcHxFaelMVECS9zqGP7Zk0",
  authDomain: "sirikfit40.firebaseapp.com",
  projectId: "sirikfit40",
  storageBucket: "sirikfit40.firebasestorage.app",
  messagingSenderId: "532757567852",
  appId: "1:532757567852:web:01f36071e84c96b4933b49",
  measurementId: "G-QFR8G0QFNH"
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// مقداردهی اولیه اپلیکیشن
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// اتصال به دیتابیس Firestore با کش حافظه
export const db = (() => {
  try {
    return initializeFirestore(app, { localCache: memoryLocalCache() });
  } catch (e) {
    return getFirestore(app);
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    },
    operationType,
    path
  };
}

// ذخیره پروفایل کاربر
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

// ذخیره سفارش
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

// دریافت سفارشات کاربر
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

// ذخیره تنظیمات مالی پنل ادمین
export async function saveSettingsToFirestore(settingsData: any): Promise<boolean> {
  if (!db) return false;
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
    return false;
  }
}

// خواندن تنظیمات مالی پنل ادمین
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

// ذخیره تنظیمات CMS و ظاهر سایت
export async function saveCmsToFirestore(cmsData: any): Promise<boolean> {
  if (!db) return false;
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
    return false;
  }
}

// خواندن تنظیمات CMS از فایربیس
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

// بررسی وضعیت اتصال فایربیس
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
    return { connected: true, dbId: 'sirikfit40' };
  } catch (err: any) {
    return { connected: false, error: err?.message || 'Connection failed' };
  }
}

export default app;