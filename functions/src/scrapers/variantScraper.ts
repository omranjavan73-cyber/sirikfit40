import axios from 'axios';
import * as cheerio from 'cheerio';
import { drNutritionAdapter } from './drNutritionAdapter';
import { sporterAdapter } from './sporterAdapter';
import { gncAdapter } from './gncAdapter';
import { lifePharmacyAdapter } from './lifePharmacyAdapter';
import { extractAttributesFromText } from '../utils/attributeParser';
import { sanitizeImageUrl, getStandardScraperHeaders } from './utils';

export interface ScrapedVariantResult {
  ok: boolean;
  success: boolean;
  size?: string;
  flavor?: string;
  priceAed: number;
  priceAED: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  inStock: boolean;
  imageUrl?: string;
  image?: string;
  weightKg?: number;
  rawTitle?: string;
  sourceUrl: string;
  error?: string;
}

export async function scrapeVariantUrl(targetUrl: string): Promise<ScrapedVariantResult> {
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return {
      ok: false,
      success: false,
      priceAed: 0,
      priceAED: 0,
      inStock: false,
      sourceUrl: targetUrl || '',
      error: 'Invalid target URL'
    };
  }

  const cleanUrl = targetUrl.trim();
  const lower = cleanUrl.toLowerCase();
  let fullProduct: any = null;

  try {
    if (lower.includes('drnutrition.com')) {
      fullProduct = await drNutritionAdapter(cleanUrl);
    } else if (lower.includes('sporter.com')) {
      fullProduct = await sporterAdapter(cleanUrl);
    } else if (lower.includes('gnc.')) {
      fullProduct = await gncAdapter(cleanUrl);
    } else if (lower.includes('lifepharmacy.com')) {
      fullProduct = await lifePharmacyAdapter(cleanUrl);
    }
  } catch (_e) {}

  if (fullProduct && fullProduct.ok) {
    const rawTitle = fullProduct.title || '';
    const attr = extractAttributesFromText(rawTitle, cleanUrl);
    const sz = attr.size || (fullProduct.sizes && fullProduct.sizes[0]?.size) || (fullProduct.sizes && fullProduct.sizes[0]) || '';
    const flv = attr.flavor || (fullProduct.flavors && fullProduct.flavors[0]?.flavor) || (fullProduct.flavors && fullProduct.flavors[0]) || '';
    const pAed = fullProduct.priceAed || fullProduct.priceAED || fullProduct.price || 0;
    const origAed = fullProduct.originalPriceAed || fullProduct.originalPriceAED || fullProduct.originalPrice;
    const img = fullProduct.image || fullProduct.imageUrl || (fullProduct.images && fullProduct.images[0]) || '';

    return {
      ok: true,
      success: true,
      size: sz ? String(sz) : undefined,
      flavor: flv ? String(flv) : undefined,
      priceAed: pAed,
      priceAED: pAed,
      originalPriceAed: origAed,
      originalPriceAED: origAed,
      inStock: fullProduct.inStock !== false,
      imageUrl: img,
      image: img,
      weightKg: fullProduct.weightKg || attr.weightKg || 0.8,
      rawTitle,
      sourceUrl: cleanUrl
    };
  }

  // Direct pinpoint Cheerio scraping for auxiliary link
  try {
    const headers = getStandardScraperHeaders(cleanUrl);
    const res = await axios.get(cleanUrl, { headers, timeout: 12000 });
    const $ = cheerio.load(res.data);

    // 1. Purge recommendation / cross-sell / related product nodes to avoid wrong price capture
    $('.related, .upsell, .crosssell, .block-related, .block-upsell, .carousel, .recommended-products, .slider-products, .product-slider, footer, .footer, #footer').remove();

    const title = $('h1, meta[property="og:title"]').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
    
    // Extract variant image
    let img = '';
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) img = sanitizeImageUrl(ogImg, cleanUrl);
    if (!img) {
      const domImg = $('.fotorama__img, .gallery-placeholder img, .product.media img, [data-gallery-role="gallery-placeholder"] img, .product-image-photo').first().attr('src') || $('img').first().attr('src');
      if (domImg) img = sanitizeImageUrl(domImg, cleanUrl);
    }

    let priceAed = 0;
    let origAed = 0;

    // Scope search to the main product area
    const mainScope = $('.product-info-main, .product-info-price, .product-view, .product-details, #maincontent').first();
    const scope$ = mainScope.length ? cheerio.load(mainScope.html() || '') : $;

    // A. Next.js / JSON data
    try {
      const nextData = $('#__NEXT_DATA__').html();
      if (nextData) {
        const parsed = JSON.parse(nextData);
        const p = parsed?.props?.pageProps?.product || parsed?.props?.pageProps?.productData;
        if (p) {
          if (p.price || p.special_price || p.final_price) {
            priceAed = parseFloat(p.special_price || p.final_price || p.price);
          }
          if (p.regular_price) origAed = parseFloat(p.regular_price);
        }
      }
    } catch (_) {}

    // B. Magento jsonConfig
    if (!priceAed) {
      $('script[type="text/x-magento-init"]').each((_, el) => {
        try {
          const raw = $(el).html() || '{}';
          if (raw.includes('finalPrice') || raw.includes('spConfig')) {
            const parsed = JSON.parse(raw);
            const swatchRenderer = parsed['[data-role=swatch-options]']?.['Magento_Swatches/js/swatch-renderer'] ||
                                   parsed['#product_addtocart_form']?.['Magento_Swatches/js/swatch-renderer'] ||
                                   parsed['*']?.['spConfig'];
            const jsonConfig = swatchRenderer?.jsonConfig || swatchRenderer;
            if (jsonConfig?.prices?.finalPrice?.amount) {
              priceAed = parseFloat(jsonConfig.prices.finalPrice.amount);
            }
            if (jsonConfig?.prices?.oldPrice?.amount) {
              origAed = parseFloat(jsonConfig.prices.oldPrice.amount);
            }
          }
        } catch (_) {}
      });
    }

    // C. Attribute-based final price
    if (!priceAed) {
      const attrFinal = scope$('[data-price-type="finalPrice"]').first().attr('data-price-amount');
      if (attrFinal) priceAed = parseFloat(attrFinal);
    }

    // D. DOM text search in main scope
    if (!priceAed) {
      scope$('.old-price, del, s, [data-price-type="oldPrice"]').remove();
      const priceText = scope$('.special-price .price, [data-price-type="finalPrice"] .price, .price-wrapper .price, .product-info-price .price, .price').first().text();
      const match = priceText.replace(/,/g, '').match(/[\d.]+/);
      if (match) priceAed = parseFloat(match[0]);
    }

    const attr = extractAttributesFromText(title, cleanUrl);

    return {
      ok: true,
      success: true,
      size: attr.size,
      flavor: attr.flavor,
      priceAed: priceAed || 0,
      priceAED: priceAed || 0,
      originalPriceAed: (origAed && origAed > priceAed) ? origAed : undefined,
      originalPriceAED: (origAed && origAed > priceAed) ? origAed : undefined,
      inStock: true,
      imageUrl: img,
      image: img,
      weightKg: attr.weightKg || 0.8,
      rawTitle: title,
      sourceUrl: cleanUrl
    };
  } catch (err: any) {
    return {
      ok: false,
      success: false,
      priceAed: 0,
      priceAED: 0,
      inStock: false,
      sourceUrl: cleanUrl,
      error: err.message
    };
  }
}
