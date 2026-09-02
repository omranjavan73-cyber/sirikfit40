import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { SupportConfig, DEFAULT_SUPPORT_CONFIG } from '../types/support';
import { saveSupportConfigToFirestore, fetchSupportConfigFromFirestore } from '../services/adminService';

interface SupportContextType {
  supportConfig: SupportConfig;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  updateSupportConfig: (newConfig: Partial<SupportConfig>) => Promise<boolean>;
  isLoading: boolean;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export const SupportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supportConfig, setSupportConfig] = useState<SupportConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_support_config');
        if (cached) {
          return { ...DEFAULT_SUPPORT_CONFIG, ...JSON.parse(cached) };
        }
      } catch (_e) {}
    }
    return DEFAULT_SUPPORT_CONFIG;
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initial load & real-time onSnapshot listener
  useEffect(() => {
    // 1. Initial async fetch
    fetchSupportConfigFromFirestore().then((cfg) => {
      setSupportConfig((prev) => ({ ...prev, ...cfg }));
    });

    // 2. Real-time listener on settings/support (Primary) and settings/support_config
    let unsubscribeSupport: (() => void) | null = null;
    let unsubscribeConfig: (() => void) | null = null;
    try {
      if (db) {
        // Primary: settings/support
        const supportRef = doc(db, 'settings', 'support');
        unsubscribeSupport = onSnapshot(
          supportRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as Partial<SupportConfig>;
              if (data) {
                setSupportConfig((prev) => {
                  const merged: SupportConfig = {
                    ...prev,
                    ...data,
                    whatsappNumber: data.whatsappNumber || prev.whatsappNumber,
                    whatsappDefaultMessage: data.whatsappDefaultMessage || prev.whatsappDefaultMessage
                  };
                  try {
                    localStorage.setItem('sirikfit_support_config', JSON.stringify(merged));
                    localStorage.setItem('sirikfit_support_settings', JSON.stringify(merged));
                  } catch (_e) {}
                  return merged;
                });
              }
            }
          },
          (err) => {
            console.warn('[SupportContext] support snapshot notice:', err);
          }
        );

        // Fallback: settings/support_config
        const docRef = doc(db, 'settings', 'support_config');
        unsubscribeConfig = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as SupportConfig;
              const merged = { ...DEFAULT_SUPPORT_CONFIG, ...data };
              setSupportConfig(merged);
              try {
                localStorage.setItem('sirikfit_support_config', JSON.stringify(merged));
                localStorage.setItem('sirikfit_support_settings', JSON.stringify(merged));
              } catch (_e) {}
            }
          },
          (error) => {
            console.warn('[SupportContext] onSnapshot notice:', error?.message || error);
          }
        );
      }
    } catch (e) {
      console.warn('[SupportContext] onSnapshot setup error:', e);
    }

    // 3. Custom event listeners (instant cross-component communication)
    const handleConfigUpdate = (e: any) => {
      if (e.detail) {
        setSupportConfig((prev) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('supportConfigUpdated', handleConfigUpdate);
    window.addEventListener('supportSettingsUpdated', handleConfigUpdate);

    return () => {
      if (unsubscribeSupport) unsubscribeSupport();
      if (unsubscribeConfig) unsubscribeConfig();
      window.removeEventListener('supportConfigUpdated', handleConfigUpdate);
      window.removeEventListener('supportSettingsUpdated', handleConfigUpdate);
    };
  }, []);

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  const updateSupportConfig = async (newConfig: Partial<SupportConfig>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await saveSupportConfigToFirestore(newConfig);
      if (res.success && res.data) {
        setSupportConfig(res.data);
      }
      return res.success;
    } catch (err) {
      console.error('[SupportContext] Failed to update support config:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SupportContext.Provider
      value={{
        supportConfig,
        isDrawerOpen,
        setIsDrawerOpen,
        toggleDrawer,
        updateSupportConfig,
        isLoading
      }}
    >
      {children}
    </SupportContext.Provider>
  );
};

export const useSupport = (): SupportContextType => {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error('useSupport must be used within a SupportProvider');
  }
  return context;
};
