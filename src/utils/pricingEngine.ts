import { PricingRulesConfig, CommissionRule, ShippingIncrementRule } from '../types';

export interface PricingRules {
  exchangeRate: number;        // e.g., 54500
  defaultProfitMargin: number; // e.g., 20 (%)
  baseShippingAED: number;     // e.g., 20 AED (1st item)
  extraItemShippingAED: number;// e.g., 5 AED (per additional item)
  maxShippingCapAED: number;   // e.g., 40 AED
}

// 1. Incremental Shipping Calculator
export function calculateShippingAED(totalItemsCount: number, rules: PricingRules): number {
  if (totalItemsCount <= 0) return 0;
  if (totalItemsCount === 1) return rules.baseShippingAED;
  const calculatedShipping = rules.baseShippingAED + (totalItemsCount - 1) * rules.extraItemShippingAED;
  return Math.min(calculatedShipping, rules.maxShippingCapAED);
}

// 2. Exact Floor Rounding (Zero out the last 3 digits)
export function applyFloorRoundingToman(rawToman: number): number {
  if (!rawToman || rawToman <= 0) return 0;
  // Example: 19599360 -> 19599.36 -> 19599 -> 19599000
  return Math.floor(rawToman / 1000) * 1000;
}

// 3. Single Product Price Calculator (for Card / Modal display)
export function calculateSingleProductPriceToman(
  priceAED: number,
  customProfitMargin: number | undefined,
  rules: PricingRules
): number {
  const margin = customProfitMargin !== undefined ? customProfitMargin : rules.defaultProfitMargin;
  const costWithProfit = priceAED * (1 + margin / 100);
  const rawToman = (costWithProfit + rules.baseShippingAED) * rules.exchangeRate;
  return applyFloorRoundingToman(rawToman);
}

// 4. Cart & Checkout Summary Calculator
export function calculateCartSummary(
  items: Array<{ priceAED: number; quantity: number; profitMargin?: number }>,
  rules: PricingRules
) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const itemsSubtotalAED = items.reduce((sum, item) => {
    const margin = item.profitMargin !== undefined ? item.profitMargin : rules.defaultProfitMargin;
    return sum + (item.priceAED * (1 + margin / 100) * item.quantity);
  }, 0);

  const shippingAED = calculateShippingAED(totalQuantity, rules);
  const grandTotalAED = itemsSubtotalAED + shippingAED;

  return {
    totalQuantity,
    itemsSubtotalAED,
    shippingAED,
    grandTotalAED,
    itemsSubtotalToman: applyFloorRoundingToman(itemsSubtotalAED * rules.exchangeRate),
    shippingToman: applyFloorRoundingToman(shippingAED * rules.exchangeRate),
    grandTotalToman: applyFloorRoundingToman(grandTotalAED * rules.exchangeRate)
  };
}

export interface AppSettings {
  aedRate: number;
  minOrderAmountToman?: number;
  baseCommission: { enabled: boolean; percentage: number };
  shippingConfig: { baseCostAed: number; minCostAed: number; maxCostAed: number };
  commissionRules: Array<{
    id: string;
    active: boolean;
    minAmountAed: number;
    maxAmountAed: number | null;
    percentage: number;
  }>;
  shippingIncrementRules: Array<{
    id: string;
    active: boolean;
    itemIndex: number;
    additionalCostAed: number;
  }>;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  aedRate: 52000,
  minOrderAmountToman: 0,
  baseCommission: {
    enabled: true,
    percentage: 20
  },
  shippingConfig: {
    baseCostAed: 20,
    minCostAed: 20,
    maxCostAed: 40
  },
  commissionRules: [
    { id: 'rule-1', active: true, minAmountAed: 0, maxAmountAed: 500, percentage: 20 },
    { id: 'rule-2', active: true, minAmountAed: 500, maxAmountAed: 1000, percentage: 18 },
    { id: 'rule-3', active: true, minAmountAed: 1000, maxAmountAed: 2000, percentage: 16 },
    { id: 'rule-4', active: true, minAmountAed: 2000, maxAmountAed: null, percentage: 14 }
  ],
  shippingIncrementRules: [
    { id: 'ship-inc-2', active: true, itemIndex: 2, additionalCostAed: 5 },
    { id: 'ship-inc-3', active: true, itemIndex: 3, additionalCostAed: 5 },
    { id: 'ship-inc-4', active: true, itemIndex: 4, additionalCostAed: 5 }
  ]
};

export const DEFAULT_PRICING_RULES: PricingRulesConfig = {
  minOrderAmountToman: 0,
  baseCommission: {
    percentage: 20,
    isEnabled: true
  },
  commissionRules: [
    { id: 'rule-1', minAmountAed: 0, maxAmountAed: 500, commissionPercent: 20, isEnabled: true },
    { id: 'rule-2', minAmountAed: 500, maxAmountAed: 1000, commissionPercent: 18, isEnabled: true },
    { id: 'rule-3', minAmountAed: 1000, maxAmountAed: 2000, commissionPercent: 16, isEnabled: true },
    { id: 'rule-4', minAmountAed: 2000, maxAmountAed: null, commissionPercent: 14, isEnabled: true }
  ],
  shippingConfig: {
    baseShippingCostAed: 20,
    minShippingCostAed: 20,
    maxShippingCostAed: 40
  },
  shippingIncrementRules: [
    { id: 'ship-inc-2', itemNumber: 2, additionalCostAed: 5, isEnabled: true },
    { id: 'ship-inc-3', itemNumber: 3, additionalCostAed: 5, isEnabled: true },
    { id: 'ship-inc-4', itemNumber: 4, additionalCostAed: 5, isEnabled: true }
  ]
};

const LOCAL_STORAGE_KEY = 'sirikfit_app_settings';
const LEGACY_STORAGE_KEY = 'omex_pricing_rules';

export function loadPricingRulesFromStorage(): PricingRulesConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return normalizeToPricingRulesConfig(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to load pricing rules from localStorage:', e);
  }
  return DEFAULT_PRICING_RULES;
}

export function savePricingRulesToStorage(rules: PricingRulesConfig | AppSettings): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rules));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save pricing rules to localStorage:', e);
  }
}

export function normalizeToPricingRulesConfig(input: any): PricingRulesConfig {
  if (!input || typeof input !== 'object') return DEFAULT_PRICING_RULES;

  const baseCommission = {
    percentage: Number(input.baseCommission?.percentage ?? input.baseCommission?.percent ?? 20),
    isEnabled: Boolean(input.baseCommission?.enabled ?? input.baseCommission?.isEnabled ?? true)
  };

  const shippingConfig = {
    baseShippingCostAed: Number(input.shippingConfig?.baseCostAed ?? input.shippingConfig?.baseShippingCostAed ?? 20),
    minShippingCostAed: Number(input.shippingConfig?.minCostAed ?? input.shippingConfig?.minShippingCostAed ?? 20),
    maxShippingCostAed: Number(input.shippingConfig?.maxCostAed ?? input.shippingConfig?.maxShippingCostAed ?? 40)
  };

  const commissionRules: CommissionRule[] = Array.isArray(input.commissionRules)
    ? input.commissionRules.map((r: any, idx: number) => ({
        id: String(r.id || `rule-${idx + 1}`),
        minAmountAed: Number(r.minAmountAed ?? 0),
        maxAmountAed: r.maxAmountAed === null || r.maxAmountAed === undefined || Number(r.maxAmountAed) === 0 ? null : Number(r.maxAmountAed),
        commissionPercent: Number(r.percentage ?? r.commissionPercent ?? 20),
        isEnabled: Boolean(r.active ?? r.isEnabled ?? true)
      }))
    : DEFAULT_PRICING_RULES.commissionRules;

  const shippingIncrementRules: ShippingIncrementRule[] = Array.isArray(input.shippingIncrementRules)
    ? input.shippingIncrementRules.map((r: any, idx: number) => ({
        id: String(r.id || `inc-${idx + 2}`),
        itemNumber: Number(r.itemIndex ?? r.itemNumber ?? idx + 2),
        additionalCostAed: Number(r.additionalCostAed ?? 5),
        isEnabled: Boolean(r.active ?? r.isEnabled ?? true)
      }))
    : DEFAULT_PRICING_RULES.shippingIncrementRules;

  const minOrderAmountToman = input.minOrderAmountToman !== undefined && !isNaN(Number(input.minOrderAmountToman))
    ? Math.max(0, Number(input.minOrderAmountToman))
    : (input.minOrderToman !== undefined && !isNaN(Number(input.minOrderToman)) ? Math.max(0, Number(input.minOrderToman)) : (DEFAULT_PRICING_RULES.minOrderAmountToman ?? 0));

  return {
    minOrderAmountToman,
    baseCommission,
    shippingConfig,
    commissionRules,
    shippingIncrementRules
  };
}

export interface CalculationResult {
  orderAmountAed: number;
  productCount: number;
  subtotalAed: number;
  appliedRule: CommissionRule | null;
  commissionPercent: number;
  commissionAmountAed: number;
  baseShippingAed: number;
  shippingIncrementsAed: number;
  rawShippingAed: number;
  shippingCostAed: number;
  isMinShippingApplied: boolean;
  isMaxShippingApplied: boolean;
  finalTotalAed: number;
  finalTotalToman: number;
  ruleDescription: string;
  breakdownSteps: Array<{ step: number; label: string; value: string }>;
}

export function calculateOrderPricing(
  orderAmountAed: number,
  productCount: number,
  aedRate: number = 0,
  rulesConfig?: any,
  totalWeightKg?: number,
  cargoRatePerKg?: number
): CalculationResult {
  const fallback = loadPricingRulesFromStorage();
  const rules = normalizeToPricingRulesConfig(rulesConfig || fallback);

  const validAmount = Math.max(0, isNaN(orderAmountAed) ? 0 : orderAmountAed);
  const validCount = Math.max(1, isNaN(productCount) ? 1 : productCount);

  // 1. Calculate subtotal
  const subtotalAed = validAmount;

  // 2. Select correct commission rule based on subtotal
  const enabledCommissionRules = (rules.commissionRules || []).filter(r => r && r.isEnabled);
  
  let appliedRule: CommissionRule | null = null;
  for (const rule of enabledCommissionRules) {
    const min = rule.minAmountAed;
    const max = rule.maxAmountAed;
    if (subtotalAed >= min && (max === null || subtotalAed <= max)) {
      appliedRule = rule;
      break;
    }
  }

  let commissionPercent = 0;
  let ruleDescription = '';

  if (appliedRule) {
    commissionPercent = appliedRule.commissionPercent;
    const maxText = appliedRule.maxAmountAed !== null ? `${appliedRule.maxAmountAed} درهم` : 'به بالا';
    ruleDescription = `قانون سفارش ${appliedRule.minAmountAed} تا ${maxText} (${appliedRule.commissionPercent}٪ کارمزد)`;
  } else if (rules.baseCommission?.isEnabled) {
    commissionPercent = rules.baseCommission.percentage;
    ruleDescription = `کارمزد پایه سیستم (${rules.baseCommission.percentage}٪)`;
  } else {
    commissionPercent = 0;
    ruleDescription = 'بدون کارمزد فعال';
  }

  // 3. Calculate commission amount
  const commissionAmountAed = subtotalAed * (commissionPercent / 100);

  // 4. Calculate shipping cost + increments
  const baseShippingAed = rules.shippingConfig?.baseShippingCostAed ?? 20;
  let shippingIncrementsAed = 0;

  const incRules = rules.shippingIncrementRules || [];
  for (let i = 2; i <= validCount; i++) {
    const incRule = incRules.find(r => r && r.itemNumber === i && r.isEnabled);
    if (incRule) {
      shippingIncrementsAed += incRule.additionalCostAed;
    } else if (incRules.length > 0) {
      const lastRule = incRules[incRules.length - 1];
      if (lastRule && lastRule.isEnabled) {
        shippingIncrementsAed += lastRule.additionalCostAed;
      }
    }
  }

  let rawShippingAed = baseShippingAed + shippingIncrementsAed;
  if (totalWeightKg !== undefined && totalWeightKg > 0) {
    const rate = (cargoRatePerKg !== undefined && cargoRatePerKg > 0) ? cargoRatePerKg : baseShippingAed;
    const weightCargo = Math.round(totalWeightKg * rate * 10) / 10;
    if (weightCargo > 0) {
      rawShippingAed = weightCargo;
    }
  }

  // 5. Apply Minimum and Maximum Shipping
  let shippingCostAed = rawShippingAed;
  let isMinShippingApplied = false;
  let isMaxShippingApplied = false;

  const minShipping = rules.shippingConfig?.minShippingCostAed ?? 0;
  const maxShipping = rules.shippingConfig?.maxShippingCostAed ?? 0;

  if (minShipping > 0 && shippingCostAed < minShipping) {
    shippingCostAed = minShipping;
    isMinShippingApplied = true;
  }

  if (maxShipping > 0 && shippingCostAed > maxShipping) {
    shippingCostAed = maxShipping;
    isMaxShippingApplied = true;
  }

  // Resolve effective AED Rate dynamically from argument or LocalStorage
  let effectiveRate = aedRate;
  if (!effectiveRate || effectiveRate <= 0) {
    if (typeof window !== 'undefined') {
      try {
        const directLocal = localStorage.getItem('sirikfit_aed_rate');
        if (directLocal) {
          const parsed = parseFloat(directLocal);
          if (!isNaN(parsed) && parsed > 0) effectiveRate = parsed;
        }
        if (!effectiveRate) {
          const savedFin = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
          if (savedFin) {
            const parsed = JSON.parse(savedFin);
            const rate = parseFloat(parsed.aedRate || parsed.manualAedRate || parsed.exchangeRate);
            if (!isNaN(rate) && rate > 0) effectiveRate = rate;
          }
        }
      } catch (_e) {}
    }
  }

  // 6 & 7. Display Final Total
  const finalTotalAed = subtotalAed + commissionAmountAed + shippingCostAed;
  const finalTotalToman = applyFloorRoundingToman(finalTotalAed * effectiveRate);

  const breakdownSteps = [
    { step: 1, label: 'مجموع سفارش (Subtotal)', value: `${subtotalAed.toLocaleString('fa-IR')} درهم` },
    { step: 2, label: 'قانون کارمزد شناسایی‌شده', value: ruleDescription },
    { step: 3, label: 'مبلغ کارمزد', value: `${commissionAmountAed.toFixed(1)} درهم (${commissionPercent}٪)` },
    { step: 4, label: 'هزینه ارسال پایه', value: `${baseShippingAed} درهم ${shippingIncrementsAed > 0 ? `(+${shippingIncrementsAed} درهم برای ${validCount - 1} کالا اضافی)` : ''}` },
    { step: 5, label: 'اعمال سقف و کف هزینه ارسال', value: `${shippingCostAed} درهم ${isMaxShippingApplied ? '(اعمال حداکثر سقف)' : isMinShippingApplied ? '(اعمال حداقل کف)' : ''}` },
    { step: 6, label: 'مجموع نهایی سفارش (AED)', value: `${finalTotalAed.toFixed(1)} درهم` },
    { step: 7, label: 'مجموع نهایی به تومان', value: `${finalTotalToman.toLocaleString('fa-IR')} تومان` }
  ];

  return {
    orderAmountAed: validAmount,
    productCount: validCount,
    subtotalAed,
    appliedRule,
    commissionPercent,
    commissionAmountAed,
    baseShippingAed,
    shippingIncrementsAed,
    rawShippingAed,
    shippingCostAed,
    isMinShippingApplied,
    isMaxShippingApplied,
    finalTotalAed,
    finalTotalToman,
    ruleDescription,
    breakdownSteps
  };
}
