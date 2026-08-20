import type { UniversalProduct } from '../types';
import { GncParser } from './gncParser';

/**
 * GNC MENA & Shopify Store Universal Adapter
 * 
 * Uses the native Shopify `.js` and `.json` endpoint trick to extract
 * 100% accurate variant price matrices (e.g. 68 Servings = 389.90 AED, 29 Servings = 199 AED).
 */
export class GncAdapter {
  public static readonly storeName = GncParser.storeName;
  public static readonly storeOrigin = GncParser.storeOrigin;

  public static canHandle(url: string): boolean {
    return GncParser.canHandle(url);
  }

  public static async parse(targetUrl: string): Promise<UniversalProduct | null> {
    return GncParser.parse(targetUrl);
  }
}
