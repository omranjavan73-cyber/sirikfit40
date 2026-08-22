import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirestoreGrpcNoise } from '../firebase';
import type { LandingSettings } from '../types';
import { defaultLandingSettings } from '../types';

export const getLandingSettings = async (): Promise<LandingSettings> => {
  try {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('sirikfit_landing_settings');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') {
            return { ...defaultLandingSettings, ...parsed };
          }
        } catch (_) {}
      }
    }

    if (db) {
      const docRef = doc(db, 'settings', 'landing');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<LandingSettings>;
        const merged: LandingSettings = { ...defaultLandingSettings, ...data };
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_landing_settings', JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch (error) {
    if (!isFirestoreGrpcNoise(error)) {
      console.error('Error fetching landing settings:', error);
    }
  }
  return defaultLandingSettings;
};

export const saveLandingSettings = async (settings: Partial<LandingSettings>): Promise<boolean> => {
  try {
    const merged: LandingSettings = {
      ...defaultLandingSettings,
      ...settings
    };

    // 1. Keep localStorage in sync for instant zero-lag reload
    if (typeof window !== 'undefined') {
      localStorage.setItem('sirikfit_landing_settings', JSON.stringify(merged));
      // Dispatch custom event for real-time app update
      window.dispatchEvent(new CustomEvent('landingSettingsUpdated', { detail: merged }));
    }

    // 2. Persist to Firestore `settings/landing`
    if (db) {
      const docRef = doc(db, 'settings', 'landing');
      await setDoc(docRef, { ...merged, updatedAt: new Date().toISOString() }, { merge: true });
    }

    return true;
  } catch (error) {
    console.error('Error saving landing settings:', error);
    return false;
  }
};
