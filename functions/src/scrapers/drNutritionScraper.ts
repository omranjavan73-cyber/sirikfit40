import axios from 'axios';
import * as cheerio from 'cheerio';

export const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8,fa;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

export async function scrapeDrNutrition(url: string) {
  const cleanUrl = url.trim();
  const res = await axios.get(cleanUrl, { headers: BROWSER_HEADERS, timeout: 15000 });
  const $ = cheerio.load(res.data);

  let title = $('h1.product-title, h1[itemprop="name"], h1.page-title, h1').first().text().trim();
  if (!title) title = $('meta[property="og:title"]').attr('content') || '';
  title = title.replace(/\s*\|\s*Dr\s*Nutrition.*$/i, '').trim();

  const brand = $('.product-brand, .brand-name, [itemprop="brand"]').first().text().trim() || 'Applied Nutrition';
  const imageUrl = $('meta[property="og:image"]').attr('content') || $('.gallery-placeholder img, .fotorama__img').first().attr('src') || '';

  // Extract Price (Ignore Old/Strikethrough Price)
  let priceAED = 0;
  let originalPriceAED = 0;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}');
      if ((json['@type'] === 'Product' || json['@type'] === 'IndividualProduct') && json.offers) {
        const offer = Array.isArray(json.offers) ? json.offers[0] : json.offers;
        if (offer && offer.price) priceAED = parseFloat(offer.price);
      }
    } catch (e) {}
  });

  if (!priceAED) {
    const priceText = $('.special-price .price, .product-info-price .special-price, .price-wrapper[data-price-type="finalPrice"] .price, .price').not('.old-price *').first().text();
    const match = priceText.replace(/,/g, '').match(/[\d.]+/);
    if (match) priceAED = parseFloat(match[0]);
  }

  const oldPriceText = $('.old-price .price, del').first().text();
  const oldMatch = oldPriceText.replace(/,/g, '').match(/[\d.]+/);
  if (oldMatch) originalPriceAED = parseFloat(oldMatch[0]);

  return {
    success: true,
    title: title || 'محصول دکتر نیوتریشن',
    brand,
    store: 'Dr. Nutrition',
    sourceUrl: cleanUrl,
    imageUrl,
    priceAED: priceAED || 0,
    originalPriceAED: originalPriceAED || priceAED || 0,
    weightKg: 0.25,
    variants: [
      { id: 'v1', size: '250 Gm', flavor: 'Icy Blue Raz', priceAED: priceAED || 0, weightKg: 0.25, inStock: true }
    ]
  };
}
