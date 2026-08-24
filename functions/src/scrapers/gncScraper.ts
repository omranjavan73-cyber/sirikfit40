import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  sanitizeImageUrl,
  getStandardScraperHeaders,
  extractPriceNumber,
  deduplicateStrings,
  extractEmbeddedJsonData
} from './utils';

export async function scrapeGnc(url: string) {
  const cleanUrl = url.trim();
  console.log('[gncScraper] start', cleanUrl);
  const headers = getStandardScraperHeaders(cleanUrl);

  // 1. Tier 1: Shopify JSON API
  try {
    const jsonUrl = cleanUrl.split('?')[0].replace(/\/$/, '') + '.json';
    const res = await axios.get(jsonUrl, { headers, timeout: 10000 });
    const p = res.data?.product;
    if (p && p.title) {
      const variants = p.variants || [];
      const v0 = variants[0] || {};
      const priceAED = extractPriceNumber(v0.price);
      const origPriceAED = extractPriceNumber(v0.compare_at_price);
      const mainImage = sanitizeImageUrl(p.image?.src || (p.images && p.images[0]?.src), cleanUrl);
      const galleryImages = (p.images || []).map((im: any) => sanitizeImageUrl(im.src || im, cleanUrl)).filter(Boolean);

      const rawFlavors: string[] = [];
      const rawSizes: string[] = [];
      (p.options || []).forEach((opt: any) => {
        const optName = String(opt.name || '').toLowerCase();
        if (optName.includes('flavor') || optName.includes('طعم')) {
          (opt.values || []).forEach((v: string) => rawFlavors.push(String(v)));
        } else if (optName.includes('size') || optName.includes('weight') || optName.includes('سایز') || optName.includes('حجم')) {
          (opt.values || []).forEach((v: string) => rawSizes.push(String(v)));
        }
      });

      const cleanFlavors = deduplicateStrings(rawFlavors);
      const cleanSizes = deduplicateStrings(rawSizes);

      if (priceAED > 0) {
        return {
          success: true,
          title: p.title,
          brand: p.vendor || 'GNC',
          store: 'GNC Store',
          sourceUrl: cleanUrl,
          imageUrl: mainImage || '',
          galleryImages,
          priceAED,
          originalPriceAED: origPriceAED > priceAED ? origPriceAED : undefined,
          weightKg: v0.grams ? parseFloat((v0.grams / 1000).toFixed(2)) : 0.8,
          flavors: cleanFlavors,
          sizes: cleanSizes,
          inStock: v0.available !== false
        };
      }
    }
  } catch (_shopErr) {}

  // 2. Tier 2: Direct HTML Scraping
  try {
    const res = await axios.get(cleanUrl, { headers, timeout: 12000 });
    const $ = cheerio.load(res.data);
    const { jsonLd } = extractEmbeddedJsonData($);

    let title = $('h1.product-single__title, h1.product__title, h1').first().text().trim();
    if (!title) title = $('meta[property="og:title"]').attr('content') || '';
    const brand = $('.product-single__vendor, [itemprop="brand"]').first().text().trim() || 'GNC';

    let priceAED = 0;
    let originalPriceAED = 0;

    // Check JSON-LD
    if (jsonLd && jsonLd.length > 0) {
      for (const item of jsonLd) {
        if (item && (item['@type'] === 'Product' || item.offers)) {
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offer && offer.price) priceAED = extractPriceNumber(offer.price);
        }
      }
    }

    if (!priceAED) {
      const priceText = $('.price__regular .price-item--regular, .product__price, [data-product-price], .price').first().text();
      priceAED = extractPriceNumber(priceText);
    }

    const mainImage = sanitizeImageUrl($('meta[property="og:image"]').attr('content') || $('.product-single__photo img, .product__media img').first().attr('src') || '', cleanUrl);

    if (title && priceAED > 0) {
      return {
        success: true,
        title,
        brand,
        store: 'GNC Store',
        sourceUrl: cleanUrl,
        imageUrl: mainImage || '',
        galleryImages: mainImage ? [mainImage] : [],
        priceAED,
        originalPriceAED: originalPriceAED > priceAED ? originalPriceAED : undefined,
        weightKg: 0.8,
        flavors: [],
        sizes: [],
        inStock: !res.data.includes('sold-out') && !res.data.includes('Out of stock')
      };
    }
  } catch (_htmlErr) {}

  return {
    success: false,
    error: 'امکان استخراج اطلاعات از فروشگاه GNC مقدور نیست.'
  };
}
