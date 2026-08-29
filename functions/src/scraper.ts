import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { backendScraperService, StandardizedProductData } from './services/scraperService';
import { scrapeDrNutrition } from './scrapers/drNutritionScraper';
import { scrapeSporter } from './scrapers/sporterScraper';
import { cleanAndNormalizeUrl } from './scrapers/utils';

export interface ExtractProductMetadataRequest {
  url: string;
  forceRefresh?: boolean;
}

export interface ExtractProductMetadataResponse {
  success: boolean;
  data?: StandardizedProductData;
  error?: string;
}

export const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1'
};

/**
 * Core handler for product URL scraping
 */
async function handleScrapeProduct(url: string, forceRefresh: boolean = false): Promise<ExtractProductMetadataResponse> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new HttpsError('invalid-argument', 'لینک محصول الزامی است.');
  }

  const normalizedUrl = cleanAndNormalizeUrl(url);
  if (!normalizedUrl || !normalizedUrl.startsWith('http')) {
    throw new HttpsError('invalid-argument', 'آدرس وارد شده معتبر نمی‌باشد.');
  }

  console.log(`[scrapeProductUrl] Invoked for URL: ${normalizedUrl} (forceRefresh: ${forceRefresh})`);

  try {
    const result = await backendScraperService.extractProduct(normalizedUrl, forceRefresh);

    if (!result.success || !result.data) {
      const errorMsg = result.error || 'استخراج ناموفق بود: امکان دریافت اطلاعات محصول از فروشگاه مبدا وجود ندارد.';
      console.warn(`[scrapeProductUrl] Extraction failed for ${normalizedUrl}: ${errorMsg}`);
      throw new HttpsError('not-found', errorMsg);
    }

    // Final sanity check: Ensure no zero, fake, or invalid price is returned
    if (!result.data.priceAed || result.data.priceAed <= 0) {
      throw new HttpsError('failed-precondition', 'استخراج ناموفق بود: قیمت معتبری از صفحه محصول دریافت نشد.');
    }

    return {
      success: true,
      data: result.data
    };
  } catch (err: any) {
    if (err instanceof HttpsError) {
      throw err;
    }
    console.error(`[scrapeProductUrl] Unhandled error scraping ${normalizedUrl}:`, err);
    throw new HttpsError('internal', err?.message || 'خطا در ارتباط با سرور استخراج اطلاعات محصول.');
  }
}

/**
 * Firebase Callable Function: scrapeProductUrl
 * Secure backend proxy for scraping product data from Dubai stores (Dr. Nutrition, Sporter, GNC, Life Pharmacy)
 */
export const scrapeProductUrl = onCall(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 10,
    cors: true
  },
  async (request): Promise<ExtractProductMetadataResponse> => {
    const rawUrl = request.data?.url;
    const forceRefresh = Boolean(request.data?.forceRefresh);
    return handleScrapeProduct(rawUrl, forceRefresh);
  }
);

/**
 * Firebase Callable Function: extractProductMetadata (Alias)
 */
export const extractProductMetadata = onCall(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 10,
    cors: true
  },
  async (request): Promise<ExtractProductMetadataResponse> => {
    const rawUrl = request.data?.url;
    const forceRefresh = Boolean(request.data?.forceRefresh);
    return handleScrapeProduct(rawUrl, forceRefresh);
  }
);

export { scrapeDrNutrition, scrapeSporter };
