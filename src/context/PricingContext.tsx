import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { PricingRulesConfig } from '../types';
import { useSettings } from './SettingsContext';
import {
  DEFAULT_PRICING_RULES,
  subscribePricingRules,
  calculateLandedPrice,
  LandedPriceBreakdown,
  LandedPriceCalculationOptions
} from '../services/pricingService';

interface PricingContextType {
  pricingRules: PricingRulesConfig;
  isLoadingRules: boolean;
  aedRate: number;
  calculatePrice: (options: Omit<LandedPriceCalculationOptions, 'pricingRules' | 'aedRate'>) => LandedPriceBreakdown;
  getDynamicToman: (priceAed: number, weightKg?: number, marginPercent?: number) => number;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export const PricingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { aedRate, settings } = useSettings();
  const [pricingRules, setPricingRules] = useState<PricingRulesConfig>(DEFAULT_PRICING_RULES);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(true);

  // Active AED Rate resolved from SettingsContext or settings prop
  const effectiveAedRate = aedRate && aedRate > 0
    ? aedRate
    : (settings?.aedRate || settings?.manualAedRate || 0);

  useEffect(() => {
    setIsLoadingRules(true);
    const unsubscribe = subscribePricingRules((rules) => {
      setPricingRules(rules);
      setIsLoadingRules(false);
    });

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
