import type { UniversalProduct } from '../types';
import { DrNutritionParser } from './drNutritionParser';

/**
 * DrNutritionAdapter - Universal Adapter for Dr. Nutrition
 */
export class DrNutritionAdapter {
  public static readonly storeName = DrNutritionParser.storeName;
  public static readonly storeOrigin = DrNutritionParser.storeOrigin;

  public static canHandle(url: string): boolean {
    return DrNutritionParser.canHandle(url);
  }

  public static cleanPrice(raw: any): number {
    return DrNutritionParser.cleanPrice(raw);
  }

  public static isSizeOption(label: string): boolean {
    return DrNutritionParser.isSizeOption(label);
  }

  public static isFlavorOption(label: string): boolean {
    return DrNutritionParser.isFlavorOption(label);
  }

  public static normalizeUrl(url: string): string {
    return DrNutritionParser.normalizeUrl(url);
  }

  public static async parse(targetUrl: string, rawHtml?: string): Promise<UniversalProduct | null> {
    return DrNutritionParser.parse(targetUrl, rawHtml);
  }
}
