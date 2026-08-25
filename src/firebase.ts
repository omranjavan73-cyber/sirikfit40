import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { safeFetchJson } from './utils/apiHelper';
import { dispatchOrderToGoogleSheets } from './utils/googleSheetsSync';
import firebaseConfigJson from '../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyARiTsbTwglCwXPaoIMVFCG9zqGPG77X0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sirikfit40.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sirikfit40",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sirikfit40.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "632765767852",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:632765767852:web:01f36071ea0c94b4933b49",
  measurementId: "G-QFR8GQOFNK"
};

// Suppress internal gRPC stream disconnect debug/info messages
try {
  setLogLevel('silent');
} catch (_e) {}

export const isFirestoreGrpcNoise = (arg: any): boolean => {
  if (!arg) return false;
  let str = '';
  try {
    if (typeof arg === 'string') {
      str = arg;
    } else if (arg instanceof Error) {
      str = `${arg.message || ''} ${arg.stack || ''} ${String((arg as any).code || '')}`;
    } else if (typeof arg === 'object') {
      str = `${JSON.stringify(arg)} ${String(arg.message || '')} ${String(arg.reason || '')} ${String(arg.code || '')}`;
    } else {
      str = String(arg);
    }
  } catch (_e) {
    str = String(arg);
  }

  return (
    str.includes('Disconnecting idle stream') ||
    str.includes('Timed out waiting for new targets') ||
    str.includes('GrpcConnection') ||
    str.includes('RPC \'Listen\' stream') ||
    str.includes('Listen\' stream') ||
    str.includes('Listen stream') ||
    str.includes('client is offline') ||
    str.includes('Failed to get document because the client is offline') ||
    str.includes('unavailable') ||
    str.includes('ERR_BLOCKED_BY_CLIENT') ||
    str.includes('Backend didn\'t respond') ||
    (str.includes('CANCELLED') && str.includes('stream')) ||
    (str.includes('CANCELLED') && str.includes('Listen')) ||
    (str.includes('Code: 1') && str.includes('CANCELLED'))
  );
};

if (typeof window !== 'undefined') {
  const checkArgsNoise = (args: any[]): boolean => {
    if (args.some(isFirestoreGrpcNoise)) return true;
    try {
      const combined = args.map(a => {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return `${a.message || ''} ${a.stack || ''}`;
        try { return JSON.stringify(a); } catch (_e) { return String(a); }
      }).join(' ');
      if (isFirestoreGrpcNoise(combined)) return true;
    } catch (_e) {}
    return false;
  };

  const origError = console.error;
  console.error = (...args: any[]) => {
    if (checkArgsNoise(args)) return;
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (checkArgsNoise(args)) return;
    origWarn.apply(console, args);
  };

  const origLog = console.log;
  console.log = (...args: any[]) => {
    if (checkArgsNoise(args)) return;
    origLog.apply(console, args);
  };

  const origInfo = console.info;
  console.info = (...args: any[]) => {
    if (checkArgsNoise(args)) return;
    origInfo.apply(console, args);
  };

  const origDebug = console.debug;
  console.debug = (...args: any[]) => {
    if (checkArgsNoise(args)) return;
    origDebug.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isFirestoreGrpcNoise(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isFirestoreGrpcNoise(event.error) || isFirestoreGrpcNoise(event.message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

// Initialize Firebase App & Firestore with long polling for proxy & Cloud Run resilience
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const targetDbId = (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)')
  ? firebaseConfigJson.firestoreDatabaseId
  : undefined;

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, targetDbId);
} catch (_e) {
  firestoreDb = targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const isFirebaseConfigured = true;

export {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
};

export function sanitizePayloadForFirestore<T = any>(obj: T): T {
  if (obj === undefined || obj === null) return null as unknown as T;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizePayloadForFirestore(item)) as unknown as T;
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object') {
      clean[key] = sanitizePayloadForFirestore(value);
    } else {
      clean[key] = value;
    }
  }
  return clean as T;
}

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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// ----------------------------------------------------
// USER PROFILE PERSISTENCE
// ----------------------------------------------------
export async function saveUserProfileToFirestore(userData: {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  createdAt?: string;
}) {
  try {
    const userRef = doc(db, 'users', userData.id);
    await setDoc(userRef, sanitizePayloadForFirestore({ ...userData, updatedAt: new Date().toISOString() }), { merge: true });
    
    if (typeof window !== 'undefined') {
      const key = `sirikfit_user_${userData.id}`;
      localStorage.setItem(key, JSON.stringify(userData));
      localStorage.setItem('omex_current_user', JSON.stringify(userData));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userData.id}`);
  }
}

// ----------------------------------------------------
// ORDERS PERSISTENCE
// ----------------------------------------------------
export async function saveOrderToFirestore(orderData: any) {
  const orderId = orderData.id || orderData.orderId || 'ord-' + Date.now();
  const payload = sanitizePayloadForFirestore({ ...orderData, id: orderId, orderId, updatedAt: new Date().toISOString() });
  
  try {
    // 1. Direct write to Firestore
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, payload, { merge: true });

    // 2. LocalStorage sync
    if (typeof window !== 'undefined') {
      const existingStr = localStorage.getItem('sirikfit_orders') || '[]';
      const existing: any[] = JSON.parse(existingStr);
      const idx = existing.findIndex((o) => o.id === orderId || o.orderId === orderId);
      if (idx > -1) {
        existing[idx] = payload;
      } else {
        existing.unshift(payload);
      }
      localStorage.setItem('sirikfit_orders', JSON.stringify(existing));
    }

    // 3. REST API background POST using safeFetchJson
    safeFetchJson('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});

    // 4. Background non-blocking sync to Google Sheets Webhook
    dispatchOrderToGoogleSheets(payload).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
  }
  return orderId;
}

export async function fetchUserOrdersFromFirestore(userId: string, userPhone?: string) {
  try {
    // Query Firestore
    const ordersRef = collection(db, 'orders');
    const snap = await getDocs(ordersRef);
    if (!snap.empty) {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const userOrders = orders.filter((o: any) => o.userId === userId || (userPhone && (o.userPhone === userPhone || o.phoneNumber === userPhone)));
      if (typeof window !== 'undefined') {
        localStorage.setItem('sirikfit_orders', JSON.stringify(orders));
      }
      return userOrders;
    }
  } catch (err) {
    console.warn('Firestore orders fetch warning:', err);
  }

  // Fallback to LocalStorage
  try {
    if (typeof window !== 'undefined') {
      const existingStr = localStorage.getItem('sirikfit_orders') || '[]';
      const existing: any[] = JSON.parse(existingStr);
      return existing.filter((o) => o.userId === userId || (userPhone && (o.userPhone === userPhone || o.phoneNumber === userPhone)));
    }
  } catch (_e) {}
  return [];
}

export async function fetchAllOrdersFromFirestore(): Promise<any[]> {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (typeof window !== 'undefined') {
        localStorage.setItem('sirikfit_orders', JSON.stringify(orders));
      }
      return orders;
    }
  } catch (err) {
    console.warn('Firestore all orders fetch warning:', err);
  }

  // Fallback to REST API / LocalStorage
  const res = await safeFetchJson('/api/orders');
  if (res.ok && Array.isArray(res.data)) {
    return res.data;
  }

  try {
    if (typeof window !== 'undefined') {
      const existingStr = localStorage.getItem('sirikfit_orders') || '[]';
      return JSON.parse(existingStr);
    }
  } catch (_e) {}
  return [];
}

export function subscribeToOrders(callback: (orders: any[]) => void): () => void {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (typeof window !== 'undefined') {
        localStorage.setItem('sirikfit_orders', JSON.stringify(orders));
      }
      callback(orders);
    }, (error) => {
      console.warn('Orders onSnapshot error, falling back to fetchAllOrdersFromFirestore:', error);
      fetchAllOrdersFromFirestore().then(callback);
    });
  } catch (err) {
    console.warn('subscribeToOrders setup error:', err);
    fetchAllOrdersFromFirestore().then(callback);
    return () => {};
  }
}

export function subscribeToTransactions(callback: (txs: any[]) => void): () => void {
  try {
    const txRef = collection(db, 'transactions');
    const q = query(txRef, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(txs);
    }, (error) => {
      console.warn('Transactions onSnapshot warning:', error);
    });
  } catch (err) {
    console.warn('subscribeToTransactions setup error:', err);
    return () => {};
  }
}

export async function deleteOrderFromFirestore(orderId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (err) {
    console.warn('Firestore order delete warning:', err);
  }

  try {
    if (typeof window !== 'undefined') {
      const existingStr = localStorage.getItem('sirikfit_orders') || '[]';
      const existing: any[] = JSON.parse(existingStr);
      const filtered = existing.filter((o) => o.id !== orderId && o.orderId !== orderId);
      localStorage.setItem('sirikfit_orders', JSON.stringify(filtered));
    }
  } catch (_e) {}

  await safeFetchJson(`/api/orders/${orderId}`, { method: 'DELETE' });
  return true;
}

// ----------------------------------------------------
// FINANCIAL & GENERAL SETTINGS PERSISTENCE
// ----------------------------------------------------
export async function saveSettingsToFirestore(settingsData: any): Promise<boolean> {
  try {
    const cleanSettings = sanitizePayloadForFirestore(settingsData);
    // 1. Write to Firestore 'settings/app' and 'settings/financial'
    await setDoc(doc(db, 'settings', 'app'), cleanSettings, { merge: true });
    await setDoc(doc(db, 'settings', 'financial'), cleanSettings, { merge: true });

    // 2. LocalStorage sync
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = { ...parsed, ...cleanSettings };
      localStorage.setItem('sirikfit_financial_settings', JSON.stringify(updated));
      localStorage.setItem('omex_financial_settings', JSON.stringify(updated));

      if (settingsData?.aedRate) {
        localStorage.setItem('sirikfit_aed_rate', String(settingsData.aedRate));
      }
    }

    // 3. REST API POST via safeFetchJson
    await safeFetchJson('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanSettings)
    });

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/app');
    return true;
  }
}

export async function fetchSettingsFromFirestore(): Promise<any> {
  // 1. Direct Firestore read
  try {
    const snap = await getDoc(doc(db, 'settings', 'app'));
    if (snap.exists()) {
      const data = snap.data();
      if (typeof window !== 'undefined') {
        localStorage.setItem('sirikfit_financial_settings', JSON.stringify(data));
        if (data.aedRate) {
          localStorage.setItem('sirikfit_aed_rate', String(data.aedRate));
        }
      }
      return data;
    }
  } catch (err) {
    console.warn('Firestore settings read notice:', err);
  }

  // 2. REST API fallback via safeFetchJson
  const res = await safeFetchJson('/api/settings');
  if (res.ok && res.data && typeof res.data === 'object') {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sirikfit_financial_settings', JSON.stringify(res.data));
      if (res.data.aedRate) {
        localStorage.setItem('sirikfit_aed_rate', String(res.data.aedRate));
      }
    }
    return res.data;
  }

  // 3. LocalStorage fallback
  try {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
      if (local) {
        return JSON.parse(local);
      }
    }
  } catch (_lsErr) {}

  return null;
}

export const getSettingsFromFirestore = fetchSettingsFromFirestore;

// ----------------------------------------------------
// CMS CONFIG PERSISTENCE
// ----------------------------------------------------
export async function saveCmsToFirestore(cmsData: any): Promise<boolean> {
  try {
    const cleanCms = sanitizePayloadForFirestore(cmsData);
    // 1. Save to Firestore
    await setDoc(doc(db, 'settings', 'cms'), cleanCms, { merge: true });

    // 2. LocalStorage sync
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('sirikfit_cms_config');
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = { ...parsed, ...cleanCms };
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(updated));
    }

    // 3. REST POST
    await safeFetchJson('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanCms)
    });

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/cms');
    return true;
  }
}

export async function getCmsFromFirestore(): Promise<any> {
  // 1. Read from Firestore
  try {
    const snap = await getDoc(doc(db, 'settings', 'cms'));
    if (snap.exists()) {
      const data = snap.data();
      if (typeof window !== 'undefined') {
        localStorage.setItem('sirikfit_cms_config', JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.warn('Firestore CMS read notice:', err);
  }

  // 2. REST API fallback
  const res = await safeFetchJson('/api/cms');
  if (res.ok && res.data) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(res.data));
    }
    return res.data;
  }

  // 3. LocalStorage fallback
  try {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('sirikfit_cms_config');
      if (local) {
        return JSON.parse(local);
      }
    }
  } catch (_lsErr) {}
  return null;
}

export async function loadSettings(): Promise<any> {
  const [financial, cms] = await Promise.all([
    fetchSettingsFromFirestore(),
    getCmsFromFirestore()
  ]);
  return {
    ...financial,
    ...cms
  };
}

export async function saveSettings(settingsPayload: any): Promise<boolean> {
  const res1 = await saveSettingsToFirestore(settingsPayload);
  const res2 = await saveCmsToFirestore(settingsPayload);
  return res1 && res2;
}

export async function updateSetting(key: string, value: any): Promise<boolean> {
  const payload = { [key]: value };
  return await saveSettings(payload);
}

// ----------------------------------------------------
// VISITOR STATS & ANALYTICS PERSISTENCE
// ----------------------------------------------------
export async function trackVisitInFirestore(visitData: any) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const statsRef = doc(db, 'analytics', 'visitor_stats');
    const snap = await getDoc(statsRef);
    let current = snap.exists() ? snap.data() : { totalViews: 0, todayViews: 0, lastDate: today, visits: [] };

    if (current.lastDate !== today) {
      current.todayViews = 0;
      current.lastDate = today;
    }

    current.totalViews = (current.totalViews || 0) + 1;
    current.todayViews = (current.todayViews || 0) + 1;
    current.updatedAt = new Date().toISOString();

    await setDoc(statsRef, current, { merge: true });
  } catch (err) {
    console.warn('Firestore analytics track notice:', err);
  }

  safeFetchJson('/api/analytics/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visitData)
  }).catch(() => {});
}

export async function fetchVisitorStatsFromFirestore(): Promise<any> {
  try {
    const snap = await getDoc(doc(db, 'analytics', 'visitor_stats'));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('Firestore visitor stats read notice:', err);
  }

  const res = await safeFetchJson('/api/admin/visitor-stats');
  if (res.ok && res.data) {
    return res.data;
  }

  return {
    totalOrders: 0,
    paidOrders: 0,
    totalRevenueToman: 0,
    todayOrdersCount: 0,
    visitorCountToday: 1,
    visitorCountTotal: 1,
    weeklyOrdersCount: 0,
    monthlyOrdersCount: 0,
    conversionRate: 0
  };
}

// ----------------------------------------------------
// TICKETS PERSISTENCE
// ----------------------------------------------------
export async function saveTicketToFirestore(ticketData: any) {
  const ticketId = ticketData.id || 'tck-' + Date.now();
  const payload = { ...ticketData, id: ticketId, updatedAt: new Date().toISOString() };
  try {
    await setDoc(doc(db, 'tickets', ticketId), payload, { merge: true });
  } catch (err) {
    console.warn('Firestore ticket write notice:', err);
  }
  return ticketId;
}

export async function fetchTicketsFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'tickets'));
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn('Firestore tickets read notice:', err);
  }
  return [];
}

// ----------------------------------------------------
// ADMIN AUXILIARIES & SECURITY SETTINGS
// ----------------------------------------------------
export async function saveAdminPasswordToFirestore(password: string, backupEmail: string = 'omran.javan73@gmail.com') {
  try {
    const payload = {
      adminPasswordHash: password,
      adminPassword: password, // For backward compatibility
      backupEmail: backupEmail,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'settings', 'security'), payload, { merge: true });
    // Also sync adminSecurity doc for legacy listeners if any
    await setDoc(doc(db, 'settings', 'adminSecurity'), {
      passwordHash: password,
      recoveryEmail: backupEmail,
      lastPasswordChange: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not save admin password directly to Firestore (client-side):', err);
  }
}

export async function getAdminSecurityFromFirestore(): Promise<{
  adminPasswordHash?: string;
  adminPassword?: string;
  backupEmail?: string;
  updatedAt?: string;
} | null> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'security'));
    if (snap.exists()) {
      const d = snap.data();
      return {
        adminPasswordHash: d.adminPasswordHash || d.adminPassword || d.passwordHash,
        adminPassword: d.adminPassword || d.adminPasswordHash,
        backupEmail: d.backupEmail || d.recoveryEmail || 'omran.javan73@gmail.com',
        updatedAt: d.updatedAt || d.lastPasswordChange
      };
    }
    const legacySnap = await getDoc(doc(db, 'settings', 'adminSecurity'));
    if (legacySnap.exists()) {
      const d = legacySnap.data();
      return {
        adminPasswordHash: d.passwordHash,
        adminPassword: d.passwordHash,
        backupEmail: d.recoveryEmail || 'omran.javan73@gmail.com',
        updatedAt: d.lastPasswordChange
      };
    }
  } catch (_e) {}
  return null;
}

export async function getAdminPasswordFromFirestore(): Promise<string | null> {
  const sec = await getAdminSecurityFromFirestore();
  return sec?.adminPasswordHash || sec?.adminPassword || null;
}

export async function checkFirestoreConnection(): Promise<{
  connected: boolean;
  dbId?: string;
  error?: string;
}> {
  try {
    await getDoc(doc(db, 'settings', 'app'));
    return { connected: true, dbId: '(default)' };
  } catch (err: any) {
    return { connected: false, error: err?.message || String(err) };
  }
}

export default app;
