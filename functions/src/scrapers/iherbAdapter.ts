import { scrapeIherb, parseIherbHtml, resolveIherbHighResImage, normalizeIherbUrl, IherbScraperResult } from './iherbScraper';
import type { ScrapedProductResult } from './drNutritionAdapter';

export {
  scrapeIherb,
  parseIherbHtml,
  resolveIherbHighResImage,
  normalizeIherbUrl,
  type IherbScraperResult
};

/**
 * iHerb Dedicated Adapter for SirikFit Backend Scraper Router
 */
export async function iherbAdapter(
  targetUrl: string,
  cmsConfig?: any,
  customUserAgent?: string
): Promise<ScrapedProductResult> {
  const normalizedUrl = normalizeIherbUrl(targetUrl);
  const res = await scrapeIherb(normalizedUrl, {
    userAgent: customUserAgent
  });

  if (res && res.success && res.priceAed > 0) {
    return {
      ok: true,
      success: true,
      title: res.titleEn,
      titleFa: res.titleFa,
      price: res.priceAed,
      priceAED: res.priceAed,
      priceAed: res.priceAed,
      originalPriceAed: res.originalPriceAed,
      originalPriceAED: res.originalPriceAed,
      discountPercent: res.discountPercent,
      currency: 'AED',
      image: res.image,
      imageUrl: res.image,
      images: res.galleryImages,
      galleryImages: res.galleryImages,
      brand: res.brand,
      storeName: 'iHerb',
      store: 'iHerb',
      sourceUrl: normalizedUrl,
      selectedFlavor: res.selectedFlavor,
      selectedSize: res.selectedSize,
      flavors: res.flavors,
      sizes: res.sizes,
      variants: res.variants,
      variantMatrix: res.variantMatrix,
      variantGroups: res.variantGroups,
      weightKg: res.weightKg,
      inStock: res.inStock,
      description: res.description
    };
  }

  return {
    ok: false,
    success: false,
    title: '',
    price: 0,
    priceAED: 0,
    currency: 'AED',
    image: '',
    galleryImages: [],
    storeName: 'iHerb',
    sourceUrl: normalizedUrl
  };
}
