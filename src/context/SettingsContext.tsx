import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchSettingsFromFirestore, saveSettingsToFirestore } from '../firebase';
import { safeFetchJson } from '../utils/apiHelper';
import { getSafeItem, setSafeItem } from '../utils/safeStorage';

export interface SiteSettings {
  // مالی
  aedRate: number | null;
  manualAedRate?: number | null;
  cargoRatePerKg: number;
  profitMargin: number;
  autoUpdateRates?: boolean;
  currencyApiUrl?: string;
  minOrderAed?: number;
  minOrderAmountToman?: number;

  // تنظیمات عمومی و ظاهری (اضافه شده)
  enableComments?: boolean;
  showPriceDetails?: boolean;
  isStoreActive?: boolean;
  showContactNumber?: boolean;
  slogans?: string[];
  logoUrl?: string;
  mobileBannerUrl?: string;
  desktopBannerUrl?: string;
  showTrustBadges?: boolean;
  enamadHtml?: string;
  samandehiHtml?: string;
  customBadgeImg?: string;
  customBadgeLink?: string;
}

export type FinancialSettings = SiteSettings; // جهت حفظ پشتیبانی کدهای قبلی

interface SettingsContextType {
  aedRate: number | null;
  settings: SiteSettings;
  isLoading: boolean;
  setAedRate: (rate: number) => void;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aedRate, setAedRateState] = useState<number | null>(() => {
    const cached = getSafeItem<string>('sirikfit_aed_rate', '');
    if (cached) {
      const num = parseFloat(cached);
      if (!isNaN(num) && num > 0) return num;
    }
    return null;
  });

  const [settings, setSettingsState] = useState<SiteSettings>(() => {
    let initialRate: number | null = null;
    let cargo = 35;
    let margin = 15;
    let minOrderToman = 0;
    let savedData: Partial<SiteSettings> = {};

    const cachedDirect = getSafeItem<string>('sirikfit_aed_rate', '');
    if (cachedDirect) {
      const num = parseFloat(cachedDirect);
      if (!isNaN(num) && num > 0) initialRate = num;
    }

    const savedFin = getSafeItem<any>('sirikfit_financial_settings', null);
    if (savedFin && typeof savedFin === 'object') {
      savedData = savedFin;
      if (typeof savedFin.cargoRatePerKg === 'number') cargo = savedFin.cargoRatePerKg;
      if (typeof savedFin.profitMargin === 'number') margin = savedFin.profitMargin;
      if (typeof savedFin.minOrderAmountToman === 'number') minOrderToman = savedFin.minOrderAmountToman;
      if (!initialRate) {
        const r = Number(savedFin.aedRate || savedFin.manualAedRate || savedFin.exchangeRate);
        if (!isNaN(r) && r > 0) initialRate = r;
      }
    }

    const savedApp = getSafeItem<any>('sirikfit_app_settings', null);
    if (savedApp && typeof savedApp === 'object' && typeof savedApp.minOrderAmountToman === 'number') {
      minOrderToman = savedApp.minOrderAmountToman;
    }

    return {
      enableComments: true,
      showPriceDetails: true,
      isStoreActive: true,
      showContactNumber: true,
      slogans: [],
      minOrderAmountToman: minOrderToman,
      ...savedData,
      aedRate: initialRate,
      manualAedRate: initialRate,
      cargoRatePerKg: cargo,
      profitMargin: margin
    };
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setAedRate = (rate: number) => {
    setSafeItem('sirikfit_aed_rate', String(rate));
    setAedRateState(rate);
    setSettingsState(prev => ({
      ...prev,
      aedRate: rate,
      manualAedRate: rate
    }));
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { aedRate: rate } }));
  };

  const refreshSettings = async () => {
    setIsLoading(true);
    let fetchedRate: number | null = null;
    let fetchedData: any = null;

    // ۱. دریافت مستقیم از دیتابیس
    try {
      fetchedData = await fetchSettingsFromFirestore();
      if (fetchedData) {
        const r = Number(fetchedData.aedRate || fetchedData.manualAedRate || fetchedData.exchangeRate);
        if (!isNaN(r) && r > 0) {
          fetchedRate = r;
        }
      }
    } catch (_e) {}

    // ۲. دریافت از REST API در صورت عدم پاسخ دیتابیس
    if (!fetchedData) {
      try {
        const apiRes = await safeFetchJson('/api/settings');
        const resData = apiRes?.data || apiRes;
        if (resData) {
          fetchedData = resData;
          const r = Number(resData.aedRate || resData.manualAedRate);
          if (!isNaN(r) && r > 0) fetchedRate = r;
        }
      } catch (_e) {}
    }

    if (fetchedData) {
      if (fetchedRate && fetchedRate > 0) {
        setAedRateState(fetchedRate);
        setSafeItem('sirikfit_aed_rate', String(fetchedRate));
      }

      setSafeItem('sirikfit_financial_settings', fetchedData);

      // به‌روزرسانی کامل استیت شامل مقادیر مالی و تمامی تیک‌ها و تنظیمات عمومی
      setSettingsState(prev => ({
        ...prev,
        ...fetchedData,
        aedRate: fetchedRate || prev.aedRate,
        manualAedRate: fetchedRate || prev.manualAedRate,
        minOrderAmountToman: fetchedData.minOrderAmountToman !== undefined ? Number(fetchedData.minOrderAmountToman) : (prev.minOrderAmountToman ?? 0),
        cargoRatePerKg: fetchedData.cargoRatePerKg ?? prev.cargoRatePerKg ?? 35,
        profitMargin: fetchedData.profitMargin ?? prev.profitMargin ?? 15,
        enableComments: fetchedData.enableComments ?? fetchedData.showComments ?? prev.enableComments ?? true,
        showPriceDetails: fetchedData.showPriceDetails ?? prev.showPriceDetails ?? true,
        isStoreActive: fetchedData.isStoreActive ?? prev.isStoreActive ?? true,
        showContactNumber: fetchedData.showContactNumber ?? prev.showContactNumber ?? true,
        slogans: Array.isArray(fetchedData.slogans) ? fetchedData.slogans : prev.slogans
      }));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    refreshSettings();

    const handleUpdate = (e?: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        setSettingsState(prev => ({ ...prev, ...detail }));
        if (detail.aedRate && !isNaN(Number(detail.aedRate)) && Number(detail.aedRate) > 0) {
          setAedRateState(Number(detail.aedRate));
        }
      }
    };

    window.addEventListener('settingsUpdated', handleUpdate as EventListener);
    window.addEventListener('storage', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('settingsUpdated', handleUpdate as EventListener);
      window.removeEventListener('storage', handleUpdate as EventListener);
    };
  }, []);

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    if (newSettings.aedRate && !isNaN(Number(newSettings.aedRate)) && Number(newSettings.aedRate) > 0) {
      setAedRate(Number(newSettings.aedRate));
    }
    
    const updated = { ...settings, ...newSettings };
    setSettingsState(updated);

    setSafeItem('sirikfit_financial_settings', updated);

    try {
      await saveSettingsToFirestore(updated);
    } catch (_e) {}

    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updated }));
  };

  return (
    <SettingsContext.Provider
      value={{
        aedRate,
        settings,
        isLoading,
        setAedRate,
        updateSettings,
        refreshSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};