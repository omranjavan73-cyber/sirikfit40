import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { PricingRulesConfig } from '../types';
import { useSettings } from './SettingsContext';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  DEFAULT_PRICING_RULES,
  calculateLandedPrice,
  LandedPriceBreakdown,
  LandedPriceCalculationOptions
} from '../services/pricingService';

interface PricingContextType {
  pricingRules: PricingRulesConfig;
  isLoadingRules: boolean;
  dirhamRate: number;
  aedRate: number;
  calculatePrice: (options: Omit<LandedPriceCalculationOptions, 'pricingRules' | 'aedRate'>) => LandedPriceBreakdown;
  getDynamicToman: (priceAed: number, weightKg?: number, marginPercent?: number) => number;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export const PricingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { aedRate: settingsAedRate, settings } = useSettings();
  const [pricingRules, setPricingRules] = useState<PricingRulesConfig>(DEFAULT_PRICING_RULES);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(true);

  // Initial fallback rate from local cache or settings, purging legacy rates < 54000
  const initialFallback = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sirikfit_aed_rate') || localStorage.getItem('dirhamRate');
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= 54000) return val;
        // Purge obsolete cached rates
        localStorage.removeItem('sirikfit_aed_rate');
        localStorage.removeItem('dirhamRate');
      }
    }
    const fromSettings = Number(settingsAedRate || settings?.aedRate || settings?.manualAedRate || 0);
    return fromSettings >= 54000 ? fromSettings : 54500;
  };

  const [dirhamRate, setDirhamRate] = useState<number>(initialFallback);

  // Active AED Rate resolved from live dirhamRate, SettingsContext, or settings prop
  const effectiveAedRate = dirhamRate > 0
    ? dirhamRate
    : (settingsAedRate && settingsAedRate > 0 ? settingsAedRate : (settings?.aedRate || settings?.manualAedRate || 0));

  useEffect(() => {
    setIsLoadingRules(true);
    console.info('[Firebase] Connected to project: sirikfit40 (PricingRules)');

    // Real-time listener directly on settings/pricing_rules
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'pricing_rules'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const rate = Number(data.dirhamRate || data.aedRate || 0);
          if (rate > 0) {
            setDirhamRate(rate);
            if (typeof window !== 'undefined') {
              localStorage.setItem('sirikfit_aed_rate', String(rate));
            }
          }
          setPricingRules((prev) => ({
            ...prev,
            ...data
          } as PricingRulesConfig));
        }
        setIsLoadingRules(false);
      },
      (err) => {
        console.error('[PricingContext] Firestore subscription error:', err);
        setIsLoadingRules(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const calculatePrice = (options: Omit<LandedPriceCalculationOptions, 'pricingRules' | 'aedRate'>): LandedPriceBreakdown => {
    return calculateLandedPrice({
      ...options,
      pricingRules,
      aedRate: effectiveAedRate
    });
  };

  const getDynamicToman = (priceAed: number, weightKg: number = 0.8, marginPercent?: number): number => {
    if (!priceAed || priceAed <= 0) return 0;
    const breakdown = calculatePrice({
      priceAed,
      weightKg,
      customMarginPercent: marginPercent
    });
    return breakdown.finalToman;
  };

  return (
    <PricingContext.Provider
      value={{
        pricingRules,
        isLoadingRules,
        dirhamRate: effectiveAedRate,
        aedRate: effectiveAedRate,
        calculatePrice,
        getDynamicToman
      }}
    >
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = (): PricingContextType => {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
};
