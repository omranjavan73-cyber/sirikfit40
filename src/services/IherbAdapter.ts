import type { UniversalProduct } from '../types';
import { IherbParser, resolveIherbHighResImage } from './iherbParser';

/**
 * IherbAdapter - Universal Adapter for iHerb
 */
export class IherbAdapter {
  public static readonly storeName = IherbParser.storeName;
  public static readonly storeOrigin = IherbParser.storeOrigin;

  public static canHandle(url: string): boolean {
    return IherbParser.canHandle(url);
  }

  public static cleanPrice(raw: any): number {
    return IherbParser.cleanPrice(raw);
  }

  public static normalizeUrl(url: string): string {
    return IherbParser.normalizeUrl(url);
  }

  public static resolveHighResImage(url: string): string {
    return resolveIherbHighResImage(url);
  }

  public static async parse(targetUrl: string, rawHtml?: string, rawData?: any): Promise<UniversalProduct | null> {
    return IherbParser.parse(targetUrl, rawHtml, rawData);
  }
}
