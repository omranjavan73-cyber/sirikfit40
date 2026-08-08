import { PricingRulesConfig, CommissionRule, ShippingIncrementRule } from '../types';

export const DEFAULT_PRICING_RULES: PricingRulesConfig = {
  baseCommission: {
    percentage: 20,
    isEnabled: true
  },
  commissionRules: [
    { id: 'def-1', minAmountAed: 0, maxAmountAed: 1000, commissionPercent: 15, isEnabled: true },
    { id: 'def-2', minAmountAed: 1001, maxAmountAed: 5000, commissionPercent: 12, isEnabled: true },
    { id: 'def-3', minAmountAed: 5001, maxAmountAed: null, commissionPercent: 10, isEnabled: true }
  ],
  shippingConfig: {
    baseShippingCostAed: 20,
    minShippingCostAed: 20,
    maxShippingCostAed: 40
  },
  shippingIncrementRules: [
    { id: 'ship-2', itemNumber: 2, additionalCostAed: 5, isEnabled: true },
    { id: 'ship-3', itemNumber: 3, additionalCostAed: 5, isEnabled: true }
  ]
};

export const loadPricingRulesFromStorage = (): PricingRulesConfig => {
  try {
    const saved = localStorage.getItem('sirikfit_pricing_rules');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        baseCommission: parsed.baseCommission || DEFAULT_PRICING_RULES.baseCommission,
        commissionRules: Array.isArray(parsed.commissionRules) ? parsed.commissionRules : DEFAULT_PRICING_RULES.commissionRules,
        shippingConfig: parsed.shippingConfig || DEFAULT_PRICING_RULES.shippingConfig,
        shippingIncrementRules: Array.isArray(parsed.shippingIncrementRules) ? parsed.shippingIncrementRules : DEFAULT_PRICING_RULES.shippingIncrementRules
      };
    }
  } catch (_e) {}
  return DEFAULT_PRICING_RULES;
};

export const savePricingRulesToStorage = (config: PricingRulesConfig) => {
  try {
    localStorage.setItem('sirikfit_pricing_rules', JSON.stringify(config));
  } catch (_e) {}
};

export const calculateOrderPricing = (
  orderAmountAed: number,
  productCount: number,
  aedRate: number,
  rulesConfig?: PricingRulesConfig | null
) => {
  const config = rulesConfig || loadPricingRulesFromStorage() || DEFAULT_PRICING_RULES;
  
  // Safe extraction with fallback arrays to prevent .filter crash
  const commissionRules = Array.isArray(config.commissionRules) ? config.commissionRules : DEFAULT_PRICING_RULES.commissionRules;
  const shippingIncrementRules = Array.isArray(config.shippingIncrementRules) ? config.shippingIncrementRules : DEFAULT_PRICING_RULES.shippingIncrementRules;
  
  const baseCommPercent = config.baseCommission?.isEnabled !== false ? (config.baseCommission?.percentage ?? 20) : 0;
  
  // Find matching commission rule safely using .filter
  const activeRules = commissionRules.filter(r => r && r.isEnabled !== false);
  let matchedRule: CommissionRule | null = null;
  
  for (const rule of activeRules) {
    const min = rule.minAmountAed || 0;
    const max = rule.maxAmountAed;
    if (orderAmountAed >= min && (max === null || max === undefined || orderAmountAed <= max)) {
      matchedRule = rule;
      break;
    }
  }

  const commissionPercent = matchedRule ? matchedRule.commissionPercent : baseCommPercent;
  const commissionAmountAed = (orderAmountAed * commissionPercent) / 100;

  // Shipping calculation safely
  const shippingConf = config.shippingConfig || DEFAULT_PRICING_RULES.shippingConfig;
  let shippingCostAed = shippingConf.baseShippingCostAed ?? 20;

  if (productCount > 1) {
    const activeIncRules = shippingIncrementRules.filter(r => r && r.isEnabled !== false);
    for (let i = 2; i <= productCount; i++) {
      const incRule = activeIncRules.find(r => r.itemNumber === i);
      if (incRule) {
        shippingCostAed += (incRule.additionalCostAed || 0);
      } else {
        shippingCostAed += 5; // Default increment fallback
      }
    }
  }

  // Apply min/max limits
  if (shippingConf.minShippingCostAed && shippingCostAed < shippingConf.minShippingCostAed) {
    shippingCostAed = shippingConf.minShippingCostAed;
  }
  if (shippingConf.maxShippingCostAed && shippingCostAed > shippingConf.maxShippingCostAed) {
    shippingConf.maxShippingCostAed = shippingCostAed; // correction if needed or cap it
    if (shippingCostAed > shippingConf.maxShippingCostAed) shippingCostAed = shippingConf.maxShippingCostAed;
  }

  const finalTotalAed = orderAmountAed + commissionAmountAed + shippingCostAed;
  const finalTotalToman = finalTotalAed * aedRate;

  return {
    commissionPercent,
    commissionAmountAed,
    shippingCostAed,
    finalTotalAed,
    finalTotalToman,
    ruleDescription: matchedRule ? `قانون ارزش سفارش (${matchedRule.minAmountAed} تا ${matchedRule.maxAmountAed ?? 'بالا'} درهم)` : `کارمزد پایه (${baseCommPercent}٪)`
  };
};