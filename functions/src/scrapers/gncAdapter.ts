import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  sanitizeImageUrl,
  getStandardScraperHeaders,
  generateBilingualProductTitle
} from './utils';
import type { ScrapedProductResult } from './drNutritionAdapter';

export async function gncAdapter(targetUrl: string, cmsConfig?: any): Promise<ScrapedProductResult | null> {
  const storeName = "GNC Store";
  const headers = getStandardScraperHeaders(targetUrl);

  // 1. TIER 1: SHOPIFY PRODUCT JSON (.js or .json)
  try {
    const jsonUrl = targetUrl.split('?')[0].replace(/\/$/, '') + '.json';
    const res = await axios.get(jsonUrl, { headers, timeout: 10000 });
    const p = res.data?.product;
    if (p && p.title) {
      const variants = p.variants || [];
      const v0 = variants[0] || {};
      const priceAED = parseFloat(v0.price) || 0;
      const origPriceAED = parseFloat(v0.compare_at_price) || priceAED;
      const mainImage = sanitizeImageUrl(p.image?.src || (p.images && p.images[0]?.src), targetUrl);
      const galleryImages = (p.images || []).map((im: any) => sanitizeImageUrl(im.src || im, targetUrl)).filter(Boolean);

      const flavors: string[] = [];
      const sizes: string[] = [];
      (p.options || []).forEach((opt: any) => {
        const optName = String(opt.name || '').toLowerCase();
        if (optName.includes('flavor') || optName.includes('طعم')) {
          (opt.values || []).forEach((v: string) => flavors.push(String(v)));
        } else if (optName.includes('size') || optName.includes('weight') || optName.includes('سایز') || optName.includes('حجم')) {
          (opt.values || []).forEach((v: string) => sizes.push(String(v)));
        }
      });

      const structuredVariants = variants.map((v: any, idx: number) => ({
        id: `var-${v.id || idx}`,
        size: v.option1 || v.title,
        priceAED: parseFloat(v.price) || priceAED,
        weightKg: v.grams ? parseFloat((v.grams / 1000).toFixed(2)) : 0.8,
        inStock: v.available !== false
      }));

      return {
        ok: true,
        success: true,
        title: p.title,
        titleFa: generateBilingualProductTitle(p.title, p.vendor),
        price: priceAED,
        priceAED: priceAED,
        originalPriceAed: origPriceAED,
        originalPriceAED: origPriceAED,
        currency: "AED",
        image: mainImage,
        imageUrl: mainImage,
        images: galleryImages,
        galleryImages: galleryImages,
        brand: p.vendor || 'GNC',
        storeName,
        store: storeName,
        sourceUrl: targetUrl,
        weightKg: v0.grams ? parseFloat((v0.grams / 1000).toFixed(2)) : 0.8,
        description: p.body_html ? p.body_html.replace(/<[^>]*>/g, ' ').trim() : 'مکمل اورجینال فروشگاه GNC',
        flavors: flavors.map((f, i) => ({ id: `flv-${i}`, flavor: f, name: f, inStock: true })),
        sizes: sizes.map((s, i) => ({ id: `sz-${i}`, size: s, name: s, priceAED: priceAED, weightKg: 0.8, inStock: true })),
        variants: structuredVariants,
        variantMatrix: {
          flavors,
          sizes,
          items: structuredVariants
        }
      };
    }
  } catch (_shopErr) {}

  // 2. TIER 2: DIRECT HTML FETCH
  try {
    const res = await axios.get(targetUrl, { headers, timeout: 12000 });
    const $ = cheerio.load(res.data);
    let title = $('h1.product-single__title, h1.product__title, h1').first().text().trim();
    if (!title) title = $('meta[property="og:title"]').attr('content') || '';
    const brand = $('.product-single__vendor, [itemprop="brand"]').first().text().trim() || 'GNC';

    let priceAED = 0;
    const priceText = $('.price__regular .price-item--regular, .product__price, [data-product-price]').first().text();
    const match = priceText.replace(/,/g, '').match(/[\d.]+/);
    if (match) priceAED = parseFloat(match[0]);

    const mainImage = sanitizeImageUrl($('meta[property="og:image"]').attr('content') || $('.product-single__photo img').first().attr('src') || '', targetUrl);

    if (title && (priceAED > 0 || mainImage)) {
      return {
        ok: true,
        success: true,
        title,
        titleFa: generateBilingualProductTitle(title, brand),
        price: priceAED || 199.00,
        priceAED: priceAED || 199.00,
        originalPriceAED: priceAED || 199.00,
        currency: "AED",
        image: mainImage,
        imageUrl: mainImage,
        galleryImages: mainImage ? [mainImage] : [],
        images: mainImage ? [mainImage] : [],
        brand,
        storeName,
        store: storeName,
        sourceUrl: targetUrl,
        weightKg: 0.8
      };
    }
  } catch (_htmlErr) {}

  return null;
}

