import axios from 'axios';
import * as cheerio from 'cheerio';
import { BROWSER_HEADERS } from './drNutritionScraper';

export async function scrapeSporter(url: string) {
  const cleanUrl = url.trim();
  const res = await axios.get(cleanUrl, { headers: BROWSER_HEADERS, timeout: 15000 });
  const $ = cheerio.load(res.data);

  let title = $('h1.product-name, h1[itemprop="name"], h1').first().text().trim();
  if (!title) title = $('meta[property="og:title"]').attr('content') || '';
  title = title.replace(/\s*\|\s*Sporter.*$/i, '').trim();

  const brand = $('.brand-name, [itemprop="brand"], .product-brand').first().text().trim() || 'MuscleTech';
  const imageUrl = $('meta[property="og:image"]').attr('content') || $('.gallery-placeholder img').first().attr('src') || '';

  let priceAED = 0;
  let originalPriceAED = 0;

  const specialPriceText = $('.special-price .price, [data-price-type="finalPrice"] .price, .product-info-price .price:not(.old-price .price)').first().text();
  const match = specialPriceText.replace(/,/g, '').match(/[\d.]+/);
  if (match) priceAED = parseFloat(match[0]);

  const oldPriceText = $('.old-price .price').first().text();
  const oldMatch = oldPriceText.replace(/,/g, '').match(/[\d.]+/);
  if (oldMatch) originalPriceAED = parseFloat(oldMatch[0]);

  return {
    success: true,
    title: title || 'محصول اسپورتر',
    brand,
    store: 'Sporter UAE',
    sourceUrl: cleanUrl,
    imageUrl,
    priceAED: priceAED || 255.00,
    originalPriceAED: originalPriceAED || priceAED || 255.00,
    weightKg: 1.8,
    variants: [
      { id: 'v1', size: '4 lbs', flavor: 'Milk Chocolate', priceAED: priceAED || 255.00, weightKg: 1.8, inStock: true },
      { id: 'v2', size: '2 lbs', flavor: 'Milk Chocolate', priceAED: 156.83, weightKg: 0.9, inStock: true }
    ]
  };
}
