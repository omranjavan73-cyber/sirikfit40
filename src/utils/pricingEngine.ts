import { PricingRulesConfig, CommissionRule, ShippingIncrementRule } from '../types';

export const DEFAULT_PRICING_RULES: PricingRulesConfig = {
  baseCommission: {
    percentage: 20,
    isEnabled: true
  },
  commissionRules: [
    {
      id: 'rule-1',
      minAmountAed: 0,
      maxAmountAed: 500,
      commissionPercent: 20,
      isEnabled: true
    },
    {
      id: 'rule-2',
      minAmountAed: 500,
      maxAmountAed: 1000,
      commissionPercent: 18,
      isEnabled: true
    },
    {
      id: 'rule-3',
      minAmountAed: 1000,
      maxAmountAed: 2000,
      commissionPercent: 16,
      isEnabled: true
    },
    {
      id: 'rule-4',
      minAmountAed: 2000,
      maxAmountAed: null, // Above 2000 AED
      commissionPercent: 14,
      isEnabled: true
    }
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

const LOCAL_STORAGE_KEY = 'omex_pricing_rules';

export function loadPricingRulesFromStorage(): PricingRulesConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.baseCommission && parsed.commissionRules) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load pricing rules from localStorage:', e);
  }
  return DEFAULT_PRICING_RULES;
}

export function savePricingRulesToStorage(rules: PricingRulesConfig): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save pricing rules to localStorage:', e);
  }
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
  aedRate: number = 53000,
  rulesConfig?: PricingRulesConfig,
  totalWeightKg?: number,
  cargoRatePerKg?: number
): CalculationResult {
  const rules = rulesConfig || loadPricingRulesFromStorage();

  const validAmount = Math.max(0, isNaN(orderAmountAed) ? 0 : orderAmountAed);
  const validCount = Math.max(1, isNaN(productCount) ? 1 : productCount);

  // 1. Calculate subtotal
  const subtotalAed = validAmount;

  // 2. Select correct commission rule based on subtotal
  const enabledCommissionRules = rules.commissionRules.filter(r => r.isEnabled);
  
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
    ruleDescription = `قانون سفارش ${appliedRule.minAmountAed} تا ${maxText} (کارمزد ${appliedRule.commissionPercent}٪)`;
  } else if (rules.baseCommission.isEnabled) {
    commissionPercent = rules.baseCommission.percentage;
    ruleDescription = `کارمزد پایه سیستم (${rules.baseCommission.percentage}٪)`;
  } else {
    commissionPercent = 0;
    ruleDescription = 'بدون کارمزد فعال';
  }

  // 3. Calculate commission amount
  const commissionAmountAed = subtotalAed * (commissionPercent / 100);

  // 4. Calculate shipping cost + increments or weight-based cargo
  const baseShippingAed = rules.shippingConfig.baseShippingCostAed;
  let shippingIncrementsAed = 0;

  for (let i = 2; i <= validCount; i++) {
    const incRule = rules.shippingIncrementRules.find(r => r.itemNumber === i && r.isEnabled);
    if (incRule) {
      shippingIncrementsAed += incRule.additionalCostAed;
    } else if (rules.shippingIncrementRules.length > 0) {
      // Fallback increment for higher item counts (e.g. +5 AED per extra item if unspecified)
      const lastRule = rules.shippingIncrementRules[rules.shippingIncrementRules.length - 1];
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

  // 5 & 6. Apply Minimum and Maximum Shipping
  let shippingCostAed = rawShippingAed;
  let isMinShippingApplied = false;
  let isMaxShippingApplied = false;

  const minShipping = rules.shippingConfig.minShippingCostAed;
  const maxShipping = rules.shippingConfig.maxShippingCostAed;

  if (minShipping > 0 && shippingCostAed < minShipping) {
    shippingCostAed = minShipping;
    isMinShippingApplied = true;
  }

  if (maxShipping > 0 && shippingCostAed > maxShipping) {
    shippingCostAed = maxShipping;
    isMaxShippingApplied = true;
  }

  // 7. Display Final Total
  const finalTotalAed = subtotalAed + commissionAmountAed + shippingCostAed;
  const finalTotalToman = Math.round(finalTotalAed * aedRate);

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
