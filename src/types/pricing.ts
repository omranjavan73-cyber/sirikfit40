import type { CommissionRule, ShippingIncrementRule, PricingRulesConfig } from '../types';

export interface PricingRulesDoc {
  dirhamRate?: number;
  aedRate?: number;
  profitMargin?: number;
  fixedShippingAed?: number;
  minOrderAmountToman?: number;
  minOrderLimitEnabled?: boolean;
  baseCommission?: {
    percentage: number;
    isEnabled: boolean;
  };
  commissionRules?: CommissionRule[];
  shippingConfig?: {
    baseShippingCostAed: number;
    minShippingCostAed: number;
    maxShippingCostAed: number;
  };
  shippingIncrementRules?: ShippingIncrementRule[];
  updatedAt?: string | any;
}

export type { CommissionRule, ShippingIncrementRule, PricingRulesConfig };
