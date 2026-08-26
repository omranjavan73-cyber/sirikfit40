import { db } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { PricingRulesConfig, CommissionRule, ShippingIncrementRule } from '../types';

export interface LandedPriceCalculationOptions {
  priceAed: number;
  weightKg?: number;
  quantity?: number;
  itemIndex?: number; // 1-indexed item number for shipping increment
  customMarginPercent?: number;
  pricingRules?: Partial<PricingRulesConfig> | null;
  aedRate?: number | null;
}

export interface LandedPriceBreakdown {
  priceAed: number;
  effectiveAedRate: number;
  commissionPercent: number;
  commissionAed: number;
  shippingCostAed: number;
  subtotalAed: number;
  totalAed: number;
  rawToman: number;
  finalToman: number;
  isMinOrderApplied: boolean;
  minOrderAmountToman: number;
}

/**
 * Default standard pricing rules configuration
 */
export const DEFAULT_PRICING_RULES: PricingRulesConfig = {
  minOrderAmountToman: 0,
  minOrderLimitEnabled: false,
  baseCommission: {
    percentage: 15,
    isEnabled: true
  },
  commissionRules: [
    { id: 'comm-1', minAmountAed: 0, maxAmountAed: 100, commissionPercent: 20, isEnabled: true },
    { id: 'comm-2', minAmountAed: 101, maxAmountAed: 300, commissionPercent: 15, isEnabled: true },
    { id: 'comm-3', minAmountAed: 301, maxAmountAed: null, commissionPercent: 12, isEnabled: true }
  ],
  shippingConfig: {
    baseShippingCostAed: 35,
    minShippingCostAed: 25,
    maxShippingCostAed: 150
  },
  shippingIncrementRules: [
    { id: 'ship-1', itemNumber: 2, additionalCostAed: 20, isEnabled: true },
    { id: 'ship-2', itemNumber: 3, additionalCostAed: 15, isEnabled: true }
  ]
};

/**
 * Find applicable commission percentage for given AED price
 */
export function getApplicableCommission(priceAed: number, rules?: Partial<PricingRulesConfig> | null): number {
  if (!rules) return 15;
  
  if (rules.commissionRules && Array.isArray(rules.commissionRules) && rules.commissionRules.length > 0) {
    const activeRules = rules.commissionRules.filter(r => r.isEnabled);
    const matched = activeRules.find(r => {
      if (priceAed < r.minAmountAed) return false;
      if (r.maxAmountAed !== null && r.maxAmountAed !== undefined && priceAed > r.maxAmountAed) return false;
      return true;
    });
    if (matched) return matched.commissionPercent;
  }

  if (rules.baseCommission?.isEnabled && typeof rules.baseCommission.percentage === 'number') {
    return rules.baseCommission.percentage;
  }

  return 15;
}

/**
 * Calculate shipping cost in AED based on rules and item count
 */
export function calculateShippingCostAed(
  weightKg: number = 0.8,
  itemIndex: number = 1,
  rules?: Partial<PricingRulesConfig> | null
): number {
  const baseRate = rules?.shippingConfig?.baseShippingCostAed ?? 35;
  const minCost = rules?.shippingConfig?.minShippingCostAed ?? 0;
  const maxCost = rules?.shippingConfig?.maxShippingCostAed ?? 999999;

  let calculatedShipping = weightKg * baseRate;

  if (itemIndex > 1 && rules?.shippingIncrementRules) {
    const increment = rules.shippingIncrementRules.find(r => r.isEnabled && r.itemNumber === itemIndex);
    if (increment) {
      calculatedShipping += increment.additionalCostAed;
    }
  }

  return Math.min(Math.max(calculatedShipping, minCost), maxCost);
}

/**
 * Main Centralized Calculation Engine:
 * Converts AED product price to landed Iranian Toman price
 */
export function calculateLandedPrice(options: LandedPriceCalculationOptions): LandedPriceBreakdown {
  const {
    priceAed = 0,
    weightKg = 0.8,
    quantity = 1,
    itemIndex = 1,
    customMarginPercent,
    pricingRules,
    aedRate = 0
  } = options;

  const effectiveRate = aedRate && aedRate > 0 ? aedRate : 0;
  const commissionPercent = customMarginPercent !== undefined && !isNaN(customMarginPercent)
    ? customMarginPercent
    : getApplicableCommission(priceAed, pricingRules);

  const shippingCostAed = calculateShippingCostAed(weightKg, itemIndex, pricingRules);
  const commissionAed = (priceAed * commissionPercent) / 100;
  const subtotalAed = priceAed + commissionAed + shippingCostAed;
  const totalAed = subtotalAed * quantity;

  const rawToman = totalAed * effectiveRate;
  let finalToman = Math.round(rawToman / 1000) * 1000;

  const minOrderAmountToman = pricingRules?.minOrderAmountToman || 0;
  const isMinOrderLimitEnabled = !!pricingRules?.minOrderLimitEnabled;
  let isMinOrderApplied = false;

  if (isMinOrderLimitEnabled && minOrderAmountToman > 0 && finalToman > 0 && finalToman < minOrderAmountToman) {
    finalToman = minOrderAmountToman;
    isMinOrderApplied = true;
  }

  return {
    priceAed,
    effectiveAedRate: effectiveRate,
    commissionPercent,
    commissionAed,
    shippingCostAed,
    subtotalAed,
    totalAed,
    rawToman,
    finalToman,
    isMinOrderApplied,
    minOrderAmountToman
  };
}

/**
 * Fetch Pricing Rules once from Firestore
 */
export async function getPricingRulesFromFirestore(): Promise<PricingRulesConfig> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'pricing_rules'));
    if (snap.exists()) {
      return { ...DEFAULT_PRICING_RULES, ...snap.data() } as PricingRulesConfig;
    }
  } catch (err) {
    console.warn('Error fetching pricing rules from Firestore:', err);
  }
  return DEFAULT_PRICING_RULES;
}

/**
 * Subscribe to realtime Firestore changes for pricing rules
 */
export function subscribePricingRules(callback: (rules: PricingRulesConfig) => void): () => void {
  return onSnapshot(
    doc(db, 'settings', 'pricing_rules'),
    (snap) => {
      if (snap.exists()) {
        callback({ ...DEFAULT_PRICING_RULES, ...snap.data() } as PricingRulesConfig);
      } else {
        callback(DEFAULT_PRICING_RULES);
      }
    },
    (err) => {
      console.warn('Error in pricing rules snapshot listener:', err);
      callback(DEFAULT_PRICING_RULES);
    }
  );
}
