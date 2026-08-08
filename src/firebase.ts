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
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

// کانفیگ دقیق فایربیس پروژه sirikfit40
const firebaseConfig = {
  apiKey: "AIzaSyBAB1tsbUtWgLcHxFaelMVECS9zqGP7Zk0",
  authDomain: "sirikfit40.firebaseapp.com",
  projectId: "sirikfit40",
  storageBucket: "sirikfit40.firebasestorage.app",
  messagingSenderId: "532757567852",
  appId: "1:532757567852:web:01f36071e84c96b4933b49",
  measurementId: "G-QFR8G0QFNH"
};

export const isFirebaseConfigured = true;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = initializeFirestore(app, { localCache: memoryLocalCache() });

// === توابع ذخیره‌سازی تنظیمات و محتوا ===
export async function saveSettingsToFirestore(settingsData: any): Promise<boolean> {
  if (!db) return false;
  try {
    const settingsRef = doc(db, 'settings', 'app');
    await setDoc(settingsRef, { ...settingsData, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.error("Error saving settings", err);
    return false;
  }
}

export async function fetchSettingsFromFirestore() {
  if (!db) return null;
  try {
    const settingsRef = doc(db, 'settings', 'app');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) return docSnap.data();
  } catch (err) {
    console.error("Error fetching settings", err);
  }
  return null;
}

export const getSettingsFromFirestore = fetchSettingsFromFirestore;

export async function saveCmsToFirestore(cmsData: any): Promise<boolean> {
  if (!db) return false;
  try {
    const cmsRef = doc(db, 'cms', 'app');
    await setDoc(cmsRef, { ...cmsData, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.error("Error saving CMS", err);
    return false;
  }
}

export async function getCmsFromFirestore() {
  if (!db) return null;
  try {
    const cmsRef = doc(db, 'cms', 'app');
    const docSnap = await getDoc(cmsRef);
    if (docSnap.exists()) return docSnap.data();
  } catch (err) {
    console.error("Error fetching CMS", err);
  }
  return null;
}

export async function checkFirestoreConnection(): Promise<{ connected: boolean; dbId?: string; error?: string }> {
  if (!db) return { connected: false, error: 'DB missing' };
  try {
    const settingsRef = doc(db, 'settings', 'app');
    await getDoc(settingsRef);
    return { connected: true, dbId: 'sirikfit40' };
  } catch (err: any) {
    return { connected: false, error: err?.message || 'Connection failed' };
  }
}

// === توابع سفارشات برای پنل ادمین ===
export async function fetchAllOrdersFromFirestore() {
  if (!db) return [];
  try {
    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    const orders: any[] = [];
    snapshot.forEach((docSnap) => {
      orders.push({ id: docSnap.id, ...docSnap.data() });
    });
    return orders;
  } catch (err) {
    console.error("Error fetching all orders", err);
    return [];
  }
}

export async function updateOrderInFirestore(orderId: string, data: any) {
  if (!db) return false;
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, data);
    return true;
  } catch(e) {
    return false;
  }
}

export async function deleteOrderFromFirestore(orderId: string) {
  if (!db) return false;
  try {
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
    return true;
  } catch(e) {
    return false;
  }
}

// === توابع کاربر و ثبت سفارش ===
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
    console.error("Error saving user profile to Firestore:", err);
  }
}

export async function saveOrderToFirestore(orderData: any) {
  if (!db) return;
  const orderId = orderData.id || orderData.orderId || 'ord-' + Date.now();
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
    console.error("Error saving order to Firestore:", err);
  }
}

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
    console.error("Error fetching user orders:", err);
    return [];
  }
}

export default app;