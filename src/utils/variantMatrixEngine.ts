/**
 * Variant Matrix Engine - Primary Flavor & Dependent Size Architecture
 * 
 * Core Principles:
 * 1. Admin Variant Matrix is the SINGLE SOURCE OF TRUTH.
 * 2. Relationship is unidirectional: Flavor → Available Sizes (NOT two-way, NOT Size → Flavor).
 * 3. FLAVORS ARE NEVER DISABLED by Size. All configured flavors remain enabled and selectable at all times.
 * 4. SIZES ARE DEPENDENT ON FLAVOR: When a Flavor is selected, only the sizes configured
 *    for that Flavor in the active Variant Matrix are enabled. Sizes not configured for that Flavor are disabled.
 * 5. If the user changes Flavor and the previously selected Size is not supported by the new Flavor,
 *    the Size is reset or updated to the first valid Size of that Flavor.
 * 6. Price & weight are resolved from the EXACT active (Flavor + Size) variant match.
 */

import { sanitizeVariantLabel, isArtificialFallback } from './formatters';

export interface ProductVariantLike {
  id?: string;
  name?: string;
  flavor?: string;
  size?: string;
  priceAed?: number;
  priceAED?: number;
  priceToman?: number;
  weightKg?: number;
  image?: string;
  imageUrl?: string;
  imageLink?: string;
  imageThumbnail?: string;
  inStock?: boolean;
  isAvailable?: boolean;
  active?: boolean;
  status?: string;
  url?: string;
  [key: string]: any;
}

/**
 * Standardize string tokens:
 * - Converts Persian and Arabic digits to Latin numbers
 * - Converts to lowercase and trims
 * - Standardizes weight units (kg, lb, serv)
 */
export const normalizeVariantToken = (val: any): string => {
  if (val === undefined || val === null) return '';
  let str = String(val).trim().toLowerCase();

  // Convert Persian & Arabic numbers to English 0-9
  str = str.replace(/[۰-۹]/g, (d) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
  str = str.replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);

  // Normalize separators and collapse spaces
  str = str.replace(/[\s\-_]+/g, ' ');

  // Standardize weight & size formats with exact boundary matches
  str = str.replace(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|کیلو|کیلوگرم)\b/gi, '$1 kg');
  str = str.replace(/\b(?:kg|kgs|کیلو|کیلوگرم)\s*(\d+(?:\.\d+)?)/gi, '$1 kg');
  str = str.replace(/(\d+(?:\.\d+)?)\s*(?:lbs?|پوند)\b/gi, '$1 lb');
  str = str.replace(/\b(?:lbs?|پوند)\s*(\d+(?:\.\d+)?)/gi, '$1 lb');
  str = str.replace(/(\d+(?:\.\d+)?)\s*(?:servings?|سروینگ|سرو|حصه)\b/gi, '$1 serv');
  str = str.replace(/\b(?:servings?|سروینگ|سرو|حصه)\s*(\d+(?:\.\d+)?)/gi, '$1 serv');

  return str.trim();
};

/**
 * Exact token matching between two variant attributes.
 */
export const areVariantsMatching = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  const rawA = String(a).trim();
  const rawB = String(b).trim();
  if (rawA === rawB) return true;

  const normA = normalizeVariantToken(rawA);
  const normB = normalizeVariantToken(rawB);
  if (normA === normB) return true;

  // Handle parenthesized bilingual descriptions e.g. "شکلات (Chocolate)" vs "Chocolate" or "شکلات"
  const extractTokens = (raw: string, norm: string): string[] => {
    const tokens = new Set<string>();
    if (norm) tokens.add(norm);

    // Inside parenthesis
    const parens = raw.match(/\((.*?)\)/g);
    if (parens) {
      parens.forEach(p => {
        const cleaned = normalizeVariantToken(p.replace(/[()]/g, ''));
        if (cleaned) tokens.add(cleaned);
      });
    }

    // Outside parenthesis
    const without = normalizeVariantToken(raw.replace(/\(.*?\)/g, ''));
    if (without) tokens.add(without);

    return Array.from(tokens);
  };

  const tokensA = extractTokens(rawA, normA);
  const tokensB = extractTokens(rawB, normB);

  for (const tA of tokensA) {
    for (const tB of tokensB) {
      if (tA === tB) return true;
    }
  }

  return false;
};

/** Alias for backward compatibility */
export const matchVariantValues = areVariantsMatching;

/**
 * Filter product variants to ONLY active, in-stock combinations.
 */
export const getActiveVariants = (variants?: ProductVariantLike[]): ProductVariantLike[] => {
  if (!variants || !Array.isArray(variants)) return [];
  return variants.filter((v) => {
    if (!v || typeof v !== 'object') return false;
    if (v.active === false) return false;
    if (v.status === 'inactive') return false;
    if (v.inStock === false) return false;
    if (v.isAvailable === false) return false;
    return true;
  });
};

/**
 * Get ALL unique flavors defined in active variants.
 * Flavor selector always shows these and never disables other flavors.
 */
export const getAllFlavors = (variants: ProductVariantLike[] = []): string[] => {
  const activeList = getActiveVariants(variants);
  const list = activeList.length > 0 ? activeList : variants;
  const uniqueFlavors: string[] = [];

  list.forEach((v) => {
    if (v.flavor && String(v.flavor).trim() !== '' && !isArtificialFallback(v.flavor)) {
      const flv = sanitizeVariantLabel(v.flavor);
      if (flv && !isArtificialFallback(flv) && !uniqueFlavors.some((f) => areVariantsMatching(f, flv))) {
        uniqueFlavors.push(flv);
      }
    }
  });

  return uniqueFlavors;
};

/**
 * Get ALL unique sizes defined across active variants.
 */
export const getAllSizes = (variants: ProductVariantLike[] = []): string[] => {
  const activeList = getActiveVariants(variants);
  const list = activeList.length > 0 ? activeList : variants;
  const uniqueSizes: string[] = [];

  list.forEach((v) => {
    const rawSize = v.size || v.name || '';
    if (rawSize && !isArtificialFallback(rawSize)) {
      const vSize = sanitizeVariantLabel(rawSize);
      if (vSize !== '' && !isArtificialFallback(vSize)) {
        if (!uniqueSizes.some((s) => areVariantsMatching(s, vSize))) {
          uniqueSizes.push(vSize);
        }
      }
    }
  });

  return uniqueSizes;
};

/**
 * Get available sizes specifically for a given selected Flavor:
 * 
 * Formula:
 * availableSizes = activeVariants
 *   .filter(variant => match(variant.flavor, selectedFlavor))
 *   .map(variant => variant.size)
 */
export const getAvailableSizesForFlavor = (
  variants: ProductVariantLike[] = [],
  selectedFlavor?: string
): string[] => {
  const activeList = getActiveVariants(variants);
  if (activeList.length === 0) return [];

  let pool = activeList;
  if (selectedFlavor && selectedFlavor.trim() !== '') {
    pool = activeList.filter((v) => areVariantsMatching(v.flavor, selectedFlavor));
  }

  const uniqueSizes: string[] = [];
  pool.forEach((v) => {
    const rawSize = v.size || v.name || '';
    const vSize = sanitizeVariantLabel(rawSize);
    if (vSize !== '') {
      if (!uniqueSizes.some((s) => areVariantsMatching(s, vSize))) {
        uniqueSizes.push(vSize);
      }
    }
  });

  return uniqueSizes;
};

/**
 * Compatibility helper: returns all flavors for the product.
 * (Flavors are never filtered or disabled by size)
 */
export const getAvailableFlavors = (variants: ProductVariantLike[] = []): string[] => {
  return getAllFlavors(variants);
};

/**
 * Compatibility helper: returns available sizes for the selected flavor.
 */
export const getAvailableSizes = (
  variants: ProductVariantLike[] = [],
  selectedFlavor?: string
): string[] => {
  return getAvailableSizesForFlavor(variants, selectedFlavor);
};

/**
 * Flavors are the primary controller and are NEVER disabled by size.
 * Always returns true for any valid flavor defined in the product.
 */
export const isFlavorAvailable = (
  variants: ProductVariantLike[] = [],
  flavor: string
): boolean => {
  if (!flavor) return false;
  const allFlv = getAllFlavors(variants);
  return allFlv.length === 0 || allFlv.some((f) => areVariantsMatching(f, flavor));
};

export const isFlavorAvailableForSize = (
  variants: ProductVariantLike[] = [],
  flavor: string,
  _selectedSize?: string
): boolean => {
  return isFlavorAvailable(variants, flavor);
};

/**
 * Sizes depend strictly on the currently selected Flavor:
 * Enabled if size exists for selectedFlavor in active variants.
 * If no flavor is selected yet, enabled if size exists anywhere in active variants.
 */
export const isSizeAvailableForFlavor = (
  variants: ProductVariantLike[] = [],
  size: string,
  selectedFlavor?: string
): boolean => {
  if (!size) return false;
  const available = getAvailableSizesForFlavor(variants, selectedFlavor);
  return available.some((s) => areVariantsMatching(s, size));
};

/**
 * Find the EXACT matching active variant for the chosen Flavor and Size.
 * Returns null if no active variant matches this exact combination.
 */
export const findExactVariant = (
  variants: ProductVariantLike[] = [],
  selectedFlavor?: string,
  selectedSize?: string
): ProductVariantLike | null => {
  const activeList = getActiveVariants(variants);
  if (activeList.length === 0) return null;

  const hasFlavorProp = activeList.some((v) => Boolean(v.flavor));
  const hasSizeProp = activeList.some((v) => Boolean(v.size || (v.name && !v.flavor)));

  // Both Flavor and Size exist in product
  if (hasFlavorProp && hasSizeProp) {
    if (!selectedFlavor || !selectedSize) return null;
    return (
      activeList.find((v) => {
        const matchFlv = areVariantsMatching(v.flavor, selectedFlavor);
        const matchSz = areVariantsMatching(v.size || v.name, selectedSize);
        return matchFlv && matchSz;
      }) || null
    );
  }

  // Only Flavor exists
  if (hasFlavorProp) {
    if (!selectedFlavor) return null;
    return activeList.find((v) => areVariantsMatching(v.flavor, selectedFlavor)) || null;
  }

  // Only Size exists
  if (hasSizeProp) {
    if (!selectedSize) return null;
    return activeList.find((v) => areVariantsMatching(v.size || v.name, selectedSize)) || null;
  }

  // Single option / default
  return activeList[0] || null;
};

/**
 * Primary Flavor Selection Handler:
 * When user selects a new flavor, recalculates available sizes for that flavor.
 * If the current size is no longer valid for the new flavor, automatically updates/resets
 * to the first valid size for that flavor.
 */
export const handleFlavorChange = (
  variants: ProductVariantLike[] = [],
  newFlavor: string,
  currentSize: string
): { flavor: string; size: string; exactVariant: ProductVariantLike | null } => {
  const activeList = getActiveVariants(variants);
  const availableSizes = getAvailableSizesForFlavor(activeList, newFlavor);

  let newSize = currentSize;
  const isCurrentSizeValid = availableSizes.some((s) => areVariantsMatching(s, currentSize));

  if (!isCurrentSizeValid) {
    newSize = availableSizes.length > 0 ? availableSizes[0] : '';
  }

  const exact = findExactVariant(activeList, newFlavor, newSize);
  return { flavor: newFlavor, size: newSize, exactVariant: exact };
};

/**
 * Size Selection Handler:
 * Size does NOT change or filter flavor. Simply sets size and resolves exact variant.
 */
export const handleSizeChange = (
  variants: ProductVariantLike[] = [],
  newSize: string,
  currentFlavor: string
): { flavor: string; size: string; exactVariant: ProductVariantLike | null } => {
  const activeList = getActiveVariants(variants);
  const exact = findExactVariant(activeList, currentFlavor, newSize);
  return { flavor: currentFlavor, size: newSize, exactVariant: exact };
};

/**
 * General router for option click
 */
export const resolveNextSelection = (
  variants: ProductVariantLike[] = [],
  clickedType: 'flavor' | 'size',
  clickedValue: string,
  currentOtherValue: string
): { flavor: string; size: string; exactVariant: ProductVariantLike | null } => {
  if (clickedType === 'flavor') {
    return handleFlavorChange(variants, clickedValue, currentOtherValue);
  } else {
    return handleSizeChange(variants, clickedValue, currentOtherValue);
  }
};
