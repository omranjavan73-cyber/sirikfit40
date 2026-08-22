import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  sanitizeImageUrl,
  getStandardScraperHeaders,
  generateBilingualProductTitle
} from './utils';
import type { ScrapedProductResult } from './drNutritionAdapter';

export async function lifePharmacyAdapter(targetUrl: string, cmsConfig?: any): Promise<ScrapedProductResult | null> {
  const storeName = "Life Pharmacy";
  const headers = getStandardScraperHeaders(targetUrl);

  // 1. TIER 1: NEXT.JS DATA EXTRACTION
  try {
    const res = await axios.get(targetUrl, { headers, timeout: 12000 });
    if (res.data && typeof res.data === 'string') {
      const $ = cheerio.load(res.data);
      const nextScript = $('#__NEXT_DATA__').html();
      if (nextScript) {
        const nextJson = JSON.parse(nextScript);
        const p = nextJson?.props?.pageProps?.product || nextJson?.props?.pageProps?.initialData?.product;
        if (p) {
          const title = p.title || p.name || '';
          const brand = p.brand?.name || p.brand || 'Life Pharmacy';
          const priceAED = parseFloat(p.offer_price || p.price || p.regular_price || 0);
          const origPriceAED = parseFloat(p.regular_price || priceAED);
          const mainImage = sanitizeImageUrl(p.images?.featured_image || (p.images && p.images[0]?.image_url), targetUrl);
          const galleryImages = (p.images || []).map((im: any) => sanitizeImageUrl(im.image_url || im, targetUrl)).filter(Boolean);

          if (title && (priceAED > 0 || mainImage)) {
            return {
              ok: true,
              success: true,
              title,
              titleFa: generateBilingualProductTitle(title, brand),
              price: priceAED || 89.00,
              priceAED: priceAED || 89.00,
              originalPriceAed: origPriceAED || priceAED || 89.00,
              originalPriceAED: origPriceAED || priceAED || 89.00,
              currency: "AED",
              image: mainImage,
              imageUrl: mainImage,
              images: galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []),
              galleryImages: galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []),
              brand,
              storeName,
              store: storeName,
              sourceUrl: targetUrl,
              weightKg: 0.5,
              description: p.description ? p.description.replace(/<[^>]*>/g, ' ').trim() : 'مکمل و اقلام دارویی اورجینال از لایف فارمسی دبی'
            };
          }
        }
      }

      // HTML fallback
      let title = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
      title = title.replace(/\s*\|\s*Life\s*Pharmacy.*$/i, '').trim();
      const mainImage = sanitizeImageUrl($('meta[property="og:image"]').attr('content') || '', targetUrl);
      const priceText = $('.price, [data-price]').first().text();
      const match = priceText.replace(/,/g, '').match(/[\d.]+/);
      const priceAED = match ? parseFloat(match[0]) : 89.00;

      if (title && (priceAED > 0 || mainImage)) {
        return {
          ok: true,
          success: true,
          title,
          titleFa: generateBilingualProductTitle(title, 'Life Pharmacy'),
          price: priceAED,
          priceAED: priceAED,
          originalPriceAED: priceAED,
          currency: "AED",
          image: mainImage,
          imageUrl: mainImage,
          galleryImages: mainImage ? [mainImage] : [],
          images: mainImage ? [mainImage] : [],
          brand: 'Life Pharmacy',
          storeName,
          store: storeName,
          sourceUrl: targetUrl,
          weightKg: 0.5
        };
      }
    }
  } catch (_e) {}

  return null;
}

