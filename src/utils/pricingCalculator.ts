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

  const baseAed = Number(product.priceAED ?? product.priceAed ?? 0);
  const baseWeight = Number(product.weightKg ?? 0.8);
  const effectiveMargin = Number(product.profitMargin ?? product.marginPercent ?? settings?.profitMargin ?? 20);
  const currentSettings: PricingSettings = {
    ...settings,
    profitMargin: effectiveMargin
  };

  const defaultBaseToman = product.priceToman && product.priceToman > 0
    ? Number(product.priceToman)
    : (product.calculatedTomanOverride && product.calculatedTomanOverride > 0
        ? Number(product.calculatedTomanOverride)
        : autoCalcToman(baseAed, baseWeight, currentSettings));

  // 1. Check if selected size has custom pricing
  if (selectedSizeName && Array.isArray(product.sizes)) {
    const matchedSize = product.sizes.find((s: any) => {
      const name = typeof s === 'string' ? s : (s?.size || s?.name || '');
      return name.trim().toLowerCase() === selectedSizeName.trim().toLowerCase();
    });

    if (matchedSize && typeof matchedSize === 'object') {
      const hasCustom = matchedSize.hasCustomPrice === true || (matchedSize.priceAED !== undefined && matchedSize.priceAED > 0) || (matchedSize.priceToman !== undefined && matchedSize.priceToman > 0);
      if (hasCustom) {
        const vAed = Number(matchedSize.priceAED ?? matchedSize.priceAed ?? baseAed);
        const vWeight = Number(matchedSize.weightKg ?? baseWeight);
        const vToman = (matchedSize.priceToman !== undefined && matchedSize.priceToman > 0)
          ? Number(matchedSize.priceToman)
          : autoCalcToman(vAed, vWeight, currentSettings);

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

  // Also check product.variants if present
  if (selectedSizeName && Array.isArray(product.variants)) {
    const matchedV = product.variants.find((v: any) => {
      const sName = v?.size || v?.name || '';
      return sName.trim().toLowerCase() === selectedSizeName.trim().toLowerCase();
    });
    if (matchedV && (matchedV.priceAED || matchedV.priceAed || matchedV.priceToman)) {
      const vAed = Number(matchedV.priceAED ?? matchedV.priceAed ?? baseAed);
      const vWeight = Number(matchedV.weightKg ?? baseWeight);
      const vToman = matchedV.priceToman && matchedV.priceToman > 0
        ? Number(matchedV.priceToman)
        : autoCalcToman(vAed, vWeight, currentSettings);
      return {
        priceAED: vAed,
        priceToman: vToman,
        weightKg: vWeight,
        isCustomPrice: true,
        activeVariantName: matchedV.size || matchedV.name
      };
    }
  }

  // 2. Check if selected flavor has custom pricing
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
          : autoCalcToman(vAed, vWeight, currentSettings);

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

  // 3. Fallback to base product pricing
  return {
    priceAED: baseAed,
    priceToman: defaultBaseToman,
    weightKg: baseWeight,
    isCustomPrice: false
  };
}

