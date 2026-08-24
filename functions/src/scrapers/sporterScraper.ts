import axios from 'axios';
import { BROWSER_HEADERS } from './drNutritionScraper';
import { parseSporterHtml } from './sporterAdapter';

export async function scrapeSporter(url: string) {
  const cleanUrl = url.trim();
  console.log('[sporterScraper] start', cleanUrl);
  const res = await axios.get(cleanUrl, { headers: BROWSER_HEADERS, timeout: 15000 });
  const parsed = parseSporterHtml(res.data, cleanUrl);

  if (parsed) {
    return {
      success: true,
      title: parsed.title || 'محصول اسپورتر',
      brand: parsed.brand || 'Sporter UAE',
      store: 'Sporter UAE',
      sourceUrl: cleanUrl,
      imageUrl: parsed.image || parsed.mainImage || '',
      priceAED: parsed.priceAED || parsed.price,
      originalPriceAED: parsed.originalPriceAED || parsed.originalPriceAed,
      discountPercent: parsed.discountPercent,
      weightKg: parsed.weightKg || 1.8,
      variants: parsed.variants || [
        { id: 'v1', size: 'Standard', flavor: 'Default', priceAED: parsed.priceAED || parsed.price, inStock: true }
      ]
    };
  }

  return {
    success: false,
    title: 'محصول اسپورتر',
    brand: 'Sporter UAE',
    store: 'Sporter UAE',
    sourceUrl: cleanUrl,
    imageUrl: '',
    priceAED: 0,
    weightKg: 1.8,
    variants: []
  };
}
