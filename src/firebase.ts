import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot 
} from 'firebase/firestore';

// تنظیمات مستقیم پروژه sirikfit40
const firebaseConfig = {
  apiKey: "AIzaSy...", // کلید API شما در کنسول فایربیس
  authDomain: "sirikfit40.firebaseapp.com",
  projectId: "sirikfit40",
  storageBucket: "sirikfit40.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123def456"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// سند ثابت برای ذخیره‌سازی تنظیمات کلی
const SETTINGS_DOC_REF = doc(db, 'site_config', 'global_settings');
const CMS_DOC_REF = doc(db, 'site_config', 'cms_data');

// ۱. بررسی سلامت اتصال
export const checkFirestoreConnection = async () => {
  try {
    const snap = await getDoc(SETTINGS_DOC_REF);
    return { connected: true, dbId: 'sirikfit40' };
  } catch (error) {
    console.error("Firestore connection error:", error);
    return { connected: false };
  }
};

// ۲. ذخیره یکپارچه تنظیمات مالی
export const saveSettingsToFirestore = async (settingsData: any) => {
  try {
    await setDoc(SETTINGS_DOC_REF, settingsData, { merge: true });
    // ذخیره همزمان در localStorage جهت پشتیبان محلی
    localStorage.setItem('omex_settings_cache', JSON.stringify(settingsData));
    return true;
  } catch (error) {
    console.error("Error saving settings to Firestore:", error);
    return false;
  }
};

// ۳. خواندن یکپارچه تنظیمات مالی
export const fetchSettingsFromFirestore = async () => {
  try {
    const snap = await getDoc(SETTINGS_DOC_REF);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    console.warn("Error fetching settings from Firestore, loading local cache:", error);
  }
  const cached = localStorage.getItem('omex_settings_cache');
  return cached ? JSON.parse(cached) : null;
};

// ۴. ذخیره یکپارچه CMS (فروشگاه‌ها، انبار ایران، بنرها)
export const saveCmsToFirestore = async (cmsData: any) => {
  try {
    await setDoc(CMS_DOC_REF, cmsData, { merge: true });
    localStorage.setItem('omex_cms_cache', JSON.stringify(cmsData));
    return true;
  } catch (error) {
    console.error("Error saving CMS to Firestore:", error);
    return false;
  }
};

// ۵. خواندن یکپارچه CMS
export const fetchCmsFromFirestore = async () => {
  try {
    const snap = await getDoc(CMS_DOC_REF);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    console.warn("Error fetching CMS from Firestore, loading local cache:", error);
  }
  const cached = localStorage.getItem('omex_cms_cache');
  return cached ? JSON.parse(cached) : null;
};

// ۶. همگام‌سازی زنده (Real-time Listener)
export const subscribeToCmsChanges = (callback: (data: any) => void) => {
  return onSnapshot(CMS_DOC_REF, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  });
};