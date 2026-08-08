import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  collection,
  addDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBAB1TsbUTwgLcHxFAeIMVECS9zqGP7Zk0",
  authDomain: "sirikfit40.firebaseapp.com",
  projectId: "sirikfit40",
  storageBucket: "sirikfit40.firebasestorage.app",
  messagingSenderId: "532757567852",
  appId: "1:532757567852:web:01f36071e84c96b4933b49",
  measurementId: "G-QFR8G0QFNH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const SETTINGS_DOC_REF = doc(db, 'site_config', 'global_settings');
const CMS_DOC_REF = doc(db, 'site_config', 'cms_data');

export const saveSettingsToFirestore = async (settingsData: any) => {
  try {
    await setDoc(SETTINGS_DOC_REF, settingsData, { merge: true });
    localStorage.setItem('omex_settings_cache', JSON.stringify(settingsData));
    return true;
  } catch (error) {
    console.error("Error saving settings to Firestore:", error);
    return false;
  }
};

export const getSettingsFromFirestore = async () => {
  try {
    const snap = await getDoc(SETTINGS_DOC_REF);
    if (snap.exists()) return snap.data();
  } catch (error) {
    console.warn("Error fetching settings:", error);
  }
  const cached = localStorage.getItem('omex_settings_cache');
  return cached ? JSON.parse(cached) : null;
};
export const fetchSettingsFromFirestore = getSettingsFromFirestore;

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

export const getCmsFromFirestore = async () => {
  try {
    const snap = await getDoc(CMS_DOC_REF);
    if (snap.exists()) return snap.data();
  } catch (error) {
    console.warn("Error fetching CMS:", error);
  }
  const cached = localStorage.getItem('omex_cms_cache');
  return cached ? JSON.parse(cached) : null;
};
export const fetchCmsFromFirestore = getCmsFromFirestore;

export const subscribeToCmsChanges = (callback: (data: any) => void) => {
  return onSnapshot(CMS_DOC_REF, (docSnap) => {
    if (docSnap.exists()) callback(docSnap.data());
  });
};

export const saveOrderToFirestore = async (orderData: any) => {
  try {
    const ordersCol = collection(db, 'orders');
    const docRef = await addDoc(ordersCol, {
      ...orderData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving order:", error);
    return null;
  }
};

export const saveUserProfileToFirestore = async (userId: string, profileData: any) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, profileData, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving user profile:", error);
    return false;
  }
};