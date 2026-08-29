import { areVariantsMatching } from './variantMatrixEngine';

/**
 * Resilient comparator that strips punctuation, parenthetical text,
 * zero-width & non-breaking spaces, and whitespace.
 */
export const cleanVariantKey = (str?: string | null): string => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // remove parenthetical content e.g. (Banana)
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // strip zero-width & non-breaking spaces
    .replace(/\s+/g, '')
    .trim();
};

/**
 * Robust matcher for flavors and sizes that handles raw strings,
 * bilingual parenthesized text, and localized variations.
 */
export const matchVariantAttr = (a?: string | null, b?: string | null): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const rawA = String(a).trim();
  const rawB = String(b).trim();
  if (rawA === rawB) return true;

  const cleanA = cleanVariantKey(a);
  const cleanB = cleanVariantKey(b);
  if (cleanA && cleanB && cleanA === cleanB) return true;
  if (cleanA && cleanB && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) return true;

  return areVariantsMatching(a, b);
};

export const isMatchVariant = matchVariantAttr;
export const normalizeVariantString = cleanVariantKey;

/**
 * Resolves the exact active variant matching both selected flavor and size.
 * Fallback chain:
 * 1. Exact match for both flavor AND size
 * 2. Match flavor alone
 * 3. Match size alone
 * 4. Default to first variant
 */
export const resolveCompoundVariant = (
  variants: any[] = [],
  selectedFlavor?: string | null,
  selectedSize?: string | null
): any | null => {
  if (!Array.isArray(variants) || variants.length === 0) return null;

  // 1. Exact match for both flavor AND size
  const exact = variants.find(
    (v) => matchVariantAttr(v.flavor, selectedFlavor) && matchVariantAttr(v.size, selectedSize)
  );
  if (exact) return exact;

  // 2. Match flavor alone
  const byFlavor = variants.find((v) => matchVariantAttr(v.flavor, selectedFlavor));
  if (byFlavor) return byFlavor;

  // 3. Match size alone
  const bySize = variants.find((v) => matchVariantAttr(v.size, selectedSize));
  if (bySize) return bySize;

  // 4. Default to first
  return variants[0] || null;
};

/**
 * Deterministic image resolution pipeline:
 * Priority 1: Exact Variant Image (flavor + size)
 * Priority 2: Flavor-level Variant Image (any image for this flavor)
 * Priority 3: Product Main Image
 * Priority 4: Default Placeholder
 */
export const resolveVariantHeroImage = (
  variants: any[] = [],
  selectedFlavor?: string | null,
  selectedSize?: string | null,
  productFallbackImage?: string | null
): string => {
  if (Array.isArray(variants) && variants.length > 0) {
    // 1. Exact Match: Variant matching both selected flavor AND size with an image
    const exactVariant = variants.find(
      (v) => matchVariantAttr(v.flavor, selectedFlavor) && matchVariantAttr(v.size, selectedSize)
    );
    const exactImg = exactVariant?.image?.trim() || exactVariant?.imageUrl?.trim();
    if (exactImg) return exactImg;

    // 2. Flavor Match: Any variant with matching flavor containing an image
    const flavorVariant = variants.find(
      (v) => matchVariantAttr(v.flavor, selectedFlavor) && ((v.image && v.image.trim() !== '') || (v.imageUrl && v.imageUrl.trim() !== ''))
    );
    const flavorImg = flavorVariant?.image?.trim() || flavorVariant?.imageUrl?.trim();
    if (flavorImg) return flavorImg;
  }

  // 3. Product Main Image or placeholder
  if (productFallbackImage && productFallbackImage.trim() !== '') {
    return productFallbackImage.trim();
  }
  return '/placeholder-supplement.png';
};
