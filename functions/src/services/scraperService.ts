import { drNutritionAdapter } from '../scrapers/drNutritionAdapter';
import { gncAdapter } from '../scrapers/gncAdapter';
import { sporterAdapter } from '../scrapers/sporterAdapter';
import { lifePharmacyAdapter } from '../scrapers/lifePharmacyAdapter';
import type { ScrapedProductResult } from '../scrapers/drNutritionAdapter';

export class BackendScraperService {
  private static instance: BackendScraperService;

  public static getInstance(): BackendScraperService {
    if (!BackendScraperService.instance) {
      BackendScraperService.instance = new BackendScraperService();
    }
    return BackendScraperService.instance;
  }

  public async scrapeProduct(url: string, cmsConfig?: any): Promise<ScrapedProductResult | null> {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim();
    const lower = cleanUrl.toLowerCase();

    try {
      if (lower.includes('drnutrition.com')) {
        return await drNutritionAdapter(cleanUrl, cmsConfig);
      } else if (lower.includes('gnc.') || lower.includes('gnc-mena.com')) {
        return await gncAdapter(cleanUrl, cmsConfig);
      } else if (lower.includes('sporter.com')) {
        return await sporterAdapter(cleanUrl, cmsConfig);
      } else if (lower.includes('lifepharmacy.com') || lower.includes('drpharmacy.ae')) {
        return await lifePharmacyAdapter(cleanUrl, cmsConfig);
      } else {
        // Fallback try drNutrition adapter as generic Magento / HTML parser
        return await drNutritionAdapter(cleanUrl, cmsConfig);
      }
    } catch (err: any) {
      console.error(`Scraper error for ${cleanUrl}:`, err?.message || err);
      return null;
    }
  }
}

export const backendScraperService = BackendScraperService.getInstance();
