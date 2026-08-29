import { getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { scrapeSporter } from '../scrapers/sporterScraper';
import { scrapeDrNutrition } from '../scrapers/drNutritionScraper';
import { scrapeGnc } from '../scrapers/gncScraper';
import { lifePharmacyAdapter } from '../scrapers/lifePharmacyAdapter';
import { scrapeIherb } from '../scrapers/iherbScraper';
import { cleanAndNormalizeUrl, hashUrl, USER_AGENT_ROTATION_POOL, getRandomUserAgent } from '../scrapers/utils';

// Lazy Firebase Admin initialization
function getAdminDb() {
  try {
    const apps = getApps();
    const app = apps.length === 0 ? initializeApp({ projectId: 'sirikfit40' }) : getApp();
    return getFirestore(app);
  } catch (err) {
    console.warn('[BackendScraperService] Firebase admin getFirestore failed:', err);
    return null;
  }
}

export type SupportedRetailer = 'Sporter' | 'DrNutrition' | 'GNC' | 'LifePharmacy' | 'iHerb';

export interface StandardizedProductData {
  titleFa: string;
  titleEn: string;
  brand: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  image: string;
  galleryImages?: string[];
  inStock: boolean;
  retailer: SupportedRetailer;
  sourceUrl: string;
  selectedFlavor?: string | null;
  selectedSize?: string | null;
  flavors: string[];
  sizes: string[];
  variants?: any[];
  description?: string;
  lastSyncedAt?: string;
  cached?: boolean;
}

export interface ExtractionResponse {
  success: boolean;
  data?: StandardizedProductData;
  error?: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours Cache TTL

export class BackendScraperService {
  private static instance: BackendScraperService;

  public static getInstance(): BackendScraperService {
    if (!BackendScraperService.instance) {
      BackendScraperService.instance = new BackendScraperService();
    }
    return BackendScraperService.instance;
  }

  /**
   * Determine retailer identifier from URL hostname
   */
  public detectRetailer(url: string): SupportedRetailer {
    const lower = url.toLowerCase();
    if (lower.includes('iherb.com') || lower.includes('ae.iherb.com')) return 'iHerb';
    if (lower.includes('sporter.com')) return 'Sporter';
    if (lower.includes('drnutrition.com')) return 'DrNutrition';
    if (lower.includes('gnc-mena.com') || lower.includes('gnc.ae') || lower.includes('gnc.com')) return 'GNC';
    if (lower.includes('lifepharmacy.com') || lower.includes('drpharmacy.ae')) return 'LifePharmacy';
    return 'DrNutrition'; // Fallback generic
  }

  /**
   * Extract product metadata with 24-hour Firestore `scraped_cache` smart persistence
   */
  public async extractProduct(rawUrl: string, forceRefresh: boolean = false): Promise<ExtractionResponse> {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { success: false, error: 'لینک محصول نامعتبر است.' };
    }

    const normalizedUrl = cleanAndNormalizeUrl(rawUrl);
    if (!normalizedUrl || !normalizedUrl.startsWith('http')) {
      return { success: false, error: 'آدرس وارد شده یک URL معتبر نمی‌باشد.' };
    }

    const urlHash = hashUrl(normalizedUrl);
    const db = getAdminDb();
    const cacheDocRef = db ? db.collection('scraped_cache').doc(urlHash) : null;

    // 1. SMART CACHE CHECK (24-Hour TTL Strategy)
    if (!forceRefresh && cacheDocRef) {
      try {
        const cacheSnap = await cacheDocRef.get();
        if (cacheSnap.exists) {
          const cachedData = cacheSnap.data();
          const lastSyncedAt = cachedData?.lastSyncedAt ? new Date(cachedData.lastSyncedAt).getTime() : 0;
          const isFresh = Date.now() - lastSyncedAt < CACHE_TTL_MS;

          if (isFresh && cachedData?.priceAed && cachedData.priceAed > 0) {
            console.log(`[BackendScraperService] Cache HIT for ${normalizedUrl} (${urlHash})`);
            const cachedFlavors = Array.isArray(cachedData.flavors) ? cachedData.flavors : [];
            const cachedSizes = Array.isArray(cachedData.sizes) ? cachedData.sizes : [];
            return {
              success: true,
              data: {
                titleFa: cachedData.titleFa || '',
                titleEn: cachedData.titleEn || cachedData.title || '',
                brand: cachedData.brand || '',
                priceAed: cachedData.priceAed,
                originalPriceAed: cachedData.originalPriceAed,
                discountPercent: cachedData.discountPercent,
                image: cachedData.image || '',
                galleryImages: cachedData.galleryImages || (cachedData.image ? [cachedData.image] : []),
                inStock: cachedData.inStock !== false,
                retailer: cachedData.retailer || this.detectRetailer(normalizedUrl),
                sourceUrl: normalizedUrl,
                selectedFlavor: cachedData.selectedFlavor !== undefined ? cachedData.selectedFlavor : (cachedFlavors.length > 0 ? cachedFlavors[0] : null),
                selectedSize: cachedData.selectedSize !== undefined ? cachedData.selectedSize : (cachedSizes.length > 0 ? cachedSizes[0] : null),
                flavors: cachedFlavors,
                sizes: cachedSizes,
                variants: cachedData.variants || [],
                description: cachedData.description || '',
                lastSyncedAt: cachedData.lastSyncedAt,
                cached: true
              }
            };
          }
        }
      } catch (cacheErr) {
        console.warn(`[BackendScraperService] Cache read bypassed for ${urlHash}:`, cacheErr);
      }
    }

    // 2. LIVE MULTI-TIER EXTRACTION WITH 2-STAGE RESILIENT AUTO-RETRY
    const retailer = this.detectRetailer(normalizedUrl);
    console.log(`[BackendScraperService] Scraping live ${retailer} for ${normalizedUrl} (forceRefresh=${forceRefresh})`);

    let extracted: any = null;

    const runExtraction = async (ua: string, timeoutMs: number) => {
      if (retailer === 'iHerb') {
        return await scrapeIherb(normalizedUrl, { userAgent: ua, timeoutMs });
      } else if (retailer === 'Sporter') {
        return await scrapeSporter(normalizedUrl, { userAgent: ua, timeoutMs });
      } else if (retailer === 'DrNutrition') {
        return await scrapeDrNutrition(normalizedUrl, { userAgent: ua, timeoutMs });
      } else if (retailer === 'GNC') {
        return await scrapeGnc(normalizedUrl);
      } else if (retailer === 'LifePharmacy') {
        const lifeRes = await lifePharmacyAdapter(normalizedUrl);
        if (lifeRes && lifeRes.ok) {
          return {
            success: true,
            titleFa: lifeRes.titleFa || lifeRes.title,
            titleEn: lifeRes.title,
            brand: lifeRes.brand || 'Life Pharmacy',
            priceAed: lifeRes.priceAED || lifeRes.price,
            originalPriceAed: lifeRes.originalPriceAED,
            image: lifeRes.image || lifeRes.imageUrl,
            galleryImages: lifeRes.galleryImages || lifeRes.images || [],
            inStock: true,
            retailer: 'LifePharmacy',
            sourceUrl: normalizedUrl,
            flavors: lifeRes.flavors || [],
            sizes: lifeRes.sizes || [],
            variants: lifeRes.variants || [],
            description: lifeRes.description
          };
        }
      }
      return null;
    };

    const primaryUa = USER_AGENT_ROTATION_POOL[0];
    try {
      extracted = await runExtraction(primaryUa, 6000);
      if (!extracted || !extracted.success || !extracted.priceAed || extracted.priceAed <= 0) {
        console.warn(`[BackendScraperService] Attempt 1 returned empty/failure for ${normalizedUrl}. Waiting 1000ms for auto-retry...`);
        await new Promise(r => setTimeout(r, 1000));
        const retryUa = getRandomUserAgent(primaryUa);
        extracted = await runExtraction(retryUa, 10000);
      }
    } catch (scrapeErr: any) {
      console.warn(`[BackendScraperService] Attempt 1 error for ${normalizedUrl} (${scrapeErr?.message || scrapeErr}). Waiting 1000ms for auto-retry...`);
      try {
        await new Promise(r => setTimeout(r, 1000));
        const retryUa = getRandomUserAgent(primaryUa);
        extracted = await runExtraction(retryUa, 10000);
      } catch (retryErr: any) {
        console.error(`[BackendScraperService] Auto-retry attempt 2 also failed for ${normalizedUrl}:`, retryErr?.message || retryErr);
      }
    }

    if (!extracted || !extracted.success || !extracted.priceAed || extracted.priceAed <= 0) {
      return {
        success: false,
        error: extracted?.error || 'امکان استخراج مشخصات و قیمت از این لینک وجود ندارد. لطفاً از صحت لینک اطمینان حاصل کنید.'
      };
    }

    const lastSyncedAtStr = new Date().toISOString();
    const cleanFlavors = Array.isArray(extracted.flavors) ? extracted.flavors : [];
    const cleanSizes = Array.isArray(extracted.sizes) ? extracted.sizes : [];
    const productPayload: StandardizedProductData = {
      titleFa: extracted.titleFa || '',
      titleEn: extracted.titleEn || extracted.title || '',
      brand: extracted.brand || '',
      priceAed: extracted.priceAed,
      originalPriceAed: extracted.originalPriceAed,
      discountPercent: extracted.discountPercent,
      image: extracted.image || extracted.imageUrl || '',
      galleryImages: extracted.galleryImages || (extracted.image ? [extracted.image] : []),
      inStock: extracted.inStock !== false,
      retailer,
      sourceUrl: normalizedUrl,
      selectedFlavor: extracted.selectedFlavor !== undefined ? extracted.selectedFlavor : (cleanFlavors.length > 0 ? cleanFlavors[0] : null),
      selectedSize: extracted.selectedSize !== undefined ? extracted.selectedSize : (cleanSizes.length > 0 ? cleanSizes[0] : null),
      flavors: cleanFlavors,
      sizes: cleanSizes,
      variants: extracted.variants || [],
      description: extracted.description || '',
      lastSyncedAt: lastSyncedAtStr,
      cached: false
    };

    // 3. PERSIST TO FIRESTORE `scraped_cache`
    if (cacheDocRef) {
      try {
        await cacheDocRef.set({
          ...productPayload,
          urlHash,
          normalizedUrl,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString()
        }, { merge: true });
        console.log(`[BackendScraperService] Cached scraped product to scraped_cache/${urlHash}`);
      } catch (saveErr) {
        console.warn(`[BackendScraperService] Error writing to scraped_cache:`, saveErr);
      }
    }

    return {
      success: true,
      data: productPayload
    };
  }

  /**
   * Backward-compatible helper for legacy functions
   */
  public async scrapeProduct(url: string, _cmsConfig?: any): Promise<any> {
    const res = await this.extractProduct(url, false);
    if (!res.success || !res.data) return null;
    const d = res.data;
    return {
      ok: true,
      success: true,
      title: d.titleEn,
      titleFa: d.titleFa,
      price: d.priceAed,
      priceAED: d.priceAed,
      priceAed: d.priceAed,
      originalPriceAed: d.originalPriceAed,
      originalPriceAED: d.originalPriceAed,
      discountPercent: d.discountPercent,
      currency: 'AED',
      image: d.image,
      imageUrl: d.image,
      images: d.galleryImages,
      galleryImages: d.galleryImages,
      brand: d.brand,
      storeName: d.retailer,
      store: d.retailer,
      sourceUrl: d.sourceUrl,
      selectedFlavor: d.selectedFlavor,
      selectedSize: d.selectedSize,
      flavors: d.flavors,
      sizes: d.sizes,
      variants: d.variants,
      inStock: d.inStock,
      description: d.description
    };
  }
}

export const backendScraperService = BackendScraperService.getInstance();
