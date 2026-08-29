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
 * Helper to safely extract non-empty image url from variant object
 */
export const getVariantImageUrl = (v: any): string | null => {
  if (!v || typeof v !== 'object') return null;
  const candidate = v.imageLink || v.image || v.imageUrl || v.imageThumbnail || (Array.isArray(v.images) ? v.images[0] : null);
  if (typeof candidate === 'string' && candidate.trim() !== '') {
    return candidate.trim();
  }
  return null;
};

/**
 * Deterministic image resolution pipeline:
 * Priority 1: Exact Variant Image Link (matching both flavor + size)
 * Priority 2: Flavor-level Variant Image Link (any variant matching the selected flavor)
 * Priority 3: Size-level Variant Image Link (any variant matching the selected size)
 * Priority 4: Product Main Image
 * Priority 5: Default Placeholder
 */
export const resolveVariantHeroImage = (
  variants: any[] = [],
  selectedFlavor?: string | null,
  selectedSize?: string | null,
  productFallbackImage?: string | null
): string => {
  if (Array.isArray(variants) && variants.length > 0) {
    // 1. Exact Match: Variant matching both selected flavor AND size with an image link
    const exactVariant = variants.find(
      (v) => matchVariantAttr(v.flavor, selectedFlavor) && matchVariantAttr(v.size || v.name, selectedSize)
    );
    const exactImg = getVariantImageUrl(exactVariant);
    if (exactImg) return exactImg;

    // 2. Flavor Match: Any variant matching flavor containing an image link
    if (selectedFlavor && selectedFlavor.trim() !== '') {
      const flavorVariant = variants.find(
        (v) => matchVariantAttr(v.flavor, selectedFlavor) && Boolean(getVariantImageUrl(v))
      );
      const flavorImg = getVariantImageUrl(flavorVariant);
      if (flavorImg) return flavorImg;
    }

    // 3. Size Match: Any variant matching size containing an image link
    if (selectedSize && selectedSize.trim() !== '') {
      const sizeVariant = variants.find(
        (v) => matchVariantAttr(v.size || v.name, selectedSize) && Boolean(getVariantImageUrl(v))
      );
      const sizeImg = getVariantImageUrl(sizeVariant);
      if (sizeImg) return sizeImg;
    }
  }

  // 4. Product Main Image or placeholder
  if (productFallbackImage && typeof productFallbackImage === 'string' && productFallbackImage.trim() !== '') {
    return productFallbackImage.trim();
  }
  return '/placeholder-supplement.png';
};
