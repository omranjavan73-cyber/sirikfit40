/**
 * Automated AED-to-Toman Formula Pricing with Admin Manual Override Support
 * 
 * Formula:
 * Base Cost = (Price AED + (Weight Kg * Cargo Rate per Kg)) * AED Rate
 * Final Toman = Base Cost * (1 + (Profit Margin % / 100))
 * Rounded up to the nearest 1,000 Tomans: Math.ceil(withProfit / 1000) * 1000
 */

export interface PricingSettings {
  aedRate?: number;
  cargoRatePerKg?: number;
  profitMargin?: number;
  profitMarginPercent?: number;
  cargoPerKg?: number;
  cargoCostPerKgAed?: number;
}

export function calculateTomanPrice(
  priceAED: number,
  weightKg: number = 0.5,
  settings?: PricingSettings
): number {
  const aed = Number(priceAED) || 0;
  const weight = Number(weightKg) || 0.5;
  const cargoRate = Number(settings?.cargoRatePerKg ?? settings?.cargoCostPerKgAed ?? settings?.cargoPerKg ?? 35);
  const totalAed = aed + (weight * cargoRate);
  const aedRate = Number(settings?.aedRate) || 51400;
  const baseToman = totalAed * aedRate;
  const margin = Number(settings?.profitMarginPercent ?? settings?.profitMargin ?? 15);
  const withProfit = baseToman * (1 + (margin / 100));
  return Math.ceil(withProfit / 1000) * 1000;
}

export function calculateSellingPriceToman(
  priceAED: number,
  weightKg: number = 0.5,
  rates?: PricingSettings
): number {
  return calculateTomanPrice(priceAED, weightKg, rates);
}

