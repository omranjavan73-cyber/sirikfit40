/**
 * Automated AED-to-Toman Store Pricing Policy Engine
 * 
 * Business Rule:
 * Supplements and vitamins share a standard handling profile.
 * Do NOT multiply product weight in KG by a per-kg shipping rate for single-item pricing.
 * 
 * Formula:
 * Base Cost (Toman) = Price AED * AED Rate
 * Item Shipping (Toman) = Base Item Shipping (e.g. 20 AED) * AED Rate
 * Final Toman = (Base Cost + Item Shipping) * (1 + (Profit Margin % / 100))
 * (Rounded to the nearest 1,000 Toman)
 */

export interface PricingPolicyParams {
  priceAed: number;
  profitMarginPercent?: number; // Default: 20 (%)
  aedToTomanRate?: number;     // From global settings (e.g. 51,400)
  baseShippingAed?: number;    // From global shipping rules (e.g. 20 AED base)
}

export const calculateProductTomanPrice = ({
  priceAed,
  profitMarginPercent = 20,
  aedToTomanRate = 51400,
  baseShippingAed = 20
}: PricingPolicyParams): number => {
  const pAed = Number(priceAed) || 0;
  if (!pAed || isNaN(pAed) || pAed <= 0) return 0;

  const rate = Number(aedToTomanRate) || 51400;
  const itemCostToman = pAed * rate;
  const shippingToman = (Number(baseShippingAed) || 20) * rate;
  const margin = profitMarginPercent !== undefined ? Number(profitMarginPercent) : 20;
  const marginMultiplier = 1 + (margin / 100);

  const finalToman = (itemCostToman + shippingToman) * marginMultiplier;
  return Math.round(finalToman / 1000) * 1000;
};

export const parseWeightKg = (sizeStr: string, fallbackWeight: number = 0.8): number => {
  if (!sizeStr) return fallbackWeight;
  const clean = String(sizeStr).toLowerCase().trim();

  // Match kg patterns (e.g., "2.45 kg", "6kg", "1 kg")
  const kgMatch = clean.match(/([\d.]+)\s*kg/);
  if (kgMatch) return parseFloat(kgMatch[1]);

  // Match lbs patterns (e.g., "5 lbs", "2 lbs", "10 lb")
  const lbMatch = clean.match(/([\d.]+)\s*lb/);
  if (lbMatch) return parseFloat((parseFloat(lbMatch[1]) * 0.453592).toFixed(2));

  // Match gram patterns (e.g., "500g", "500 gm", "500 gram")
  const gmMatch = clean.match(/([\d.]+)\s*g(?:m|ram)?/);
  if (gmMatch) return parseFloat((parseFloat(gmMatch[1]) / 1000).toFixed(2));

  // Specific packet/capsule patterns
  if (clean.includes('30 ساشه') || clean.includes('30 sachets')) return 0.5;
  if (clean.includes('60 کپسول') || clean.includes('60 caps')) return 0.25;
  if (clean.includes('120 کپسول') || clean.includes('120 caps')) return 0.4;

  // Numerical fallback
  const numMatch = clean.match(/[\d.]+/);
  if (numMatch) return parseFloat(numMatch[0]);

  return fallbackWeight;
};

export const computeVariantToman = (
  priceAed: number,
  _size?: string,
  _baseWeight: number = 0.8,
  rates?: { aedToToman?: number; aedRate?: number; shippingPerKg?: number; cargoRatePerKg?: number; profitMargin?: number; baseShippingAed?: number }
): number => {
  const pAed = Number(priceAed) || 0;
  if (pAed <= 0) return 0;
  const aedRate = Number(rates?.aedToToman || rates?.aedRate || 51400);
  const margin = Number(rates?.profitMargin !== undefined ? rates.profitMargin : 20);
  const baseShippingAed = Number(rates?.baseShippingAed || 20);

  return calculateProductTomanPrice({
    priceAed: pAed,
    profitMarginPercent: margin,
    aedToTomanRate: aedRate,
    baseShippingAed
  });
};

export interface PricingSettings {
  aedRate?: number;
  cargoRatePerKg?: number;
  profitMargin?: number;
  profitMarginPercent?: number;
  cargoPerKg?: number;
  cargoCostPerKgAed?: number;
  baseShippingAed?: number;
}

export function calculateTomanPrice(
  priceAED: number,
  _weightKg: number = 0.5,
  settings?: PricingSettings
): number {
  const aed = Number(priceAED) || 0;
  const aedRate = Number(settings?.aedRate) || 51400;
  const margin = Number(settings?.profitMarginPercent ?? settings?.profitMargin ?? 20);
  const baseShippingAed = Number(settings?.baseShippingAed ?? 20);

  return calculateProductTomanPrice({
    priceAed: aed,
    profitMarginPercent: margin,
    aedToTomanRate: aedRate,
    baseShippingAed
  });
}

export function calculateSellingPriceToman(
  priceAED: number,
  weightKg: number = 0.5,
  rates?: PricingSettings
): number {
  return calculateTomanPrice(priceAED, weightKg, rates);
}

export const autoCalcToman = (
  priceAED: number,
  weightKg: number = 0.8,
  settings?: PricingSettings
): number => {
  return calculateTomanPrice(priceAED, weightKg, settings);
};

/**
 * Resolves active price (AED & Toman) and weight according to variant selection hierarchy:
 * 1. Selected Size Variant with custom price enabled (or explicit priceAED/priceToman)
 * 2. Selected Flavor Variant with custom price enabled (or explicit priceAED/priceToman)
 * 3. Base product price and weight
 */
export function getActivePrices(params: {
  product: any;
  selectedFlavorName?: string;
  selectedSizeName?: string;
  settings?: PricingSettings;
}): {
  priceAED: number;
  priceToman: number;
  weightKg: number;
  isCustomPrice: boolean;
  activeVariantName?: string;
} {
  const { product, selectedFlavorName, selectedSizeName, settings } = params;
  if (!product) {
    return { priceAED: 0, priceToman: 0, weightKg: 0.8, isCustomPrice: false };
  }

  const baseAed = Number(product.priceAED ?? product.priceAed ?? product.basePriceAed ?? product.price ?? 0);
  const baseWeight = Number(product.weightKg ?? 0.8);
  const effectiveMargin = Number(product.profitMargin ?? product.marginPercent ?? settings?.profitMargin ?? 20);
  const activeAedRate = Number(settings?.aedRate) || 51400;
  const baseShipping = Number(settings?.baseShippingAed ?? 20);

  const defaultBaseToman = product.priceToman && product.priceToman > 0
    ? Number(product.priceToman)
    : (product.calculatedTomanOverride && product.calculatedTomanOverride > 0
        ? Number(product.calculatedTomanOverride)
        : calculateProductTomanPrice({
            priceAed: baseAed,
            profitMarginPercent: effectiveMargin,
            aedToTomanRate: activeAedRate,
            baseShippingAed: baseShipping
          }));

  // 1. Check if product.variants has a matching variant
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    // Exact match (flavor + size)
    let matchedV = null;
    if (selectedSizeName && selectedFlavorName) {
      matchedV = product.variants.find((v: any) => {
        const s = (v.size || '').trim().toLowerCase();
        const f = (v.flavor || '').trim().toLowerCase();
        return s === selectedSizeName.trim().toLowerCase() && f === selectedFlavorName.trim().toLowerCase();
      });
    }

    // Match size only
    if (!matchedV && selectedSizeName) {
      matchedV = product.variants.find((v: any) => {
        const s = (v.size || '').trim().toLowerCase();
        return s === selectedSizeName.trim().toLowerCase();
      });
    }

    // Match flavor only
    if (!matchedV && selectedFlavorName) {
      matchedV = product.variants.find((v: any) => {
        const f = (v.flavor || '').trim().toLowerCase();
        return f === selectedFlavorName.trim().toLowerCase();
      });
    }

    if (matchedV) {
      const vAed = Number(matchedV.priceAed ?? matchedV.priceAED ?? matchedV.price ?? baseAed);
      const vWeight = parseWeightKg(matchedV.size || selectedSizeName, matchedV.weightKg || baseWeight);
      const vToman = matchedV.priceToman && matchedV.priceToman > 0
        ? Number(matchedV.priceToman)
        : calculateProductTomanPrice({
            priceAed: vAed,
            profitMarginPercent: effectiveMargin,
            aedToTomanRate: activeAedRate,
            baseShippingAed: baseShipping
          });

      return {
        priceAED: vAed,
        priceToman: vToman,
        weightKg: vWeight,
        isCustomPrice: true,
        activeVariantName: [matchedV.flavor, matchedV.size].filter(Boolean).join(' - ') || matchedV.name
      };
    }
  }

  // 2. Check if selected size has custom pricing in product.sizes
  if (selectedSizeName && Array.isArray(product.sizes)) {
    const matchedSize = product.sizes.find((s: any) => {
      const name = typeof s === 'string' ? s : (s?.size || s?.name || '');
      return name.trim().toLowerCase() === selectedSizeName.trim().toLowerCase();
    });

    if (matchedSize && typeof matchedSize === 'object') {
      const hasCustom = matchedSize.hasCustomPrice === true || (matchedSize.priceAED !== undefined && matchedSize.priceAED > 0) || (matchedSize.priceToman !== undefined && matchedSize.priceToman > 0);
      if (hasCustom) {
        const vAed = Number(matchedSize.priceAED ?? matchedSize.priceAed ?? baseAed);
        const vWeight = parseWeightKg(matchedSize.size || matchedSize.name || selectedSizeName, matchedSize.weightKg ?? baseWeight);
        const vToman = (matchedSize.priceToman !== undefined && matchedSize.priceToman > 0)
          ? Number(matchedSize.priceToman)
          : calculateProductTomanPrice({
              priceAed: vAed,
              profitMarginPercent: effectiveMargin,
              aedToTomanRate: activeAedRate,
              baseShippingAed: baseShipping
            });

        return {
          priceAED: vAed,
          priceToman: vToman,
          weightKg: vWeight,
          isCustomPrice: true,
          activeVariantName: matchedSize.size || matchedSize.name
        };
      }
    }
  }

  // 3. Check if selected flavor has custom pricing in product.flavors
  if (selectedFlavorName && Array.isArray(product.flavors)) {
    const matchedFlavor = product.flavors.find((f: any) => {
      const name = typeof f === 'string' ? f : (f?.flavor || f?.name || '');
      return name.trim().toLowerCase() === selectedFlavorName.trim().toLowerCase();
    });

    if (matchedFlavor && typeof matchedFlavor === 'object') {
      const hasCustom = matchedFlavor.hasCustomPrice === true || (matchedFlavor.priceAED !== undefined && matchedFlavor.priceAED > 0) || (matchedFlavor.priceToman !== undefined && matchedFlavor.priceToman > 0);
      if (hasCustom) {
        const vAed = Number(matchedFlavor.priceAED ?? matchedFlavor.priceAed ?? baseAed);
        const vWeight = Number(matchedFlavor.weightKg ?? baseWeight);
        const vToman = (matchedFlavor.priceToman !== undefined && matchedFlavor.priceToman > 0)
          ? Number(matchedFlavor.priceToman)
          : calculateProductTomanPrice({
              priceAed: vAed,
              profitMarginPercent: effectiveMargin,
              aedToTomanRate: activeAedRate,
              baseShippingAed: baseShipping
            });

        return {
          priceAED: vAed,
          priceToman: vToman,
          weightKg: vWeight,
          isCustomPrice: true,
          activeVariantName: matchedFlavor.flavor || matchedFlavor.name
        };
      }
    }
  }

  // 4. Fallback to base product pricing
  return {
    priceAED: baseAed,
    priceToman: defaultBaseToman,
    weightKg: baseWeight,
    isCustomPrice: false
  };
}

