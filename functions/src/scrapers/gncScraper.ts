import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  cleanAndNormalizeUrl,
  getStandardScraperHeaders,
  extractJsonLdSchema,
  extractEmbeddedJsonData,
  sanitizeImageUrl,
  extractPriceNumber,
  deduplicateStrings,
  generateBilingualProductTitle,
  isOutOfStockElement,
  isArtificialFallback
} from './utils';

export interface GncScraperResult {
  success: boolean;
  ok?: boolean;
  titleFa: string;
  titleEn: string;
  title: string;
  brand: string;
  priceAed: number;
  priceAED?: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  discountPercent?: number;
  image: string;
  imageUrl: string;
  galleryImages: string[];
  inStock: boolean;
  retailer: 'GNC';
  store: string;
  storeName: string;
  sourceUrl: string;
  selectedFlavor?: string | null;
  selectedSize?: string | null;
  flavors: string[];
  sizes: string[];
  variants: any[];
  weightKg: number;
  description?: string;
  error?: string;
}

/**
 * Permanent, Multi-Tier GNC Extraction Engine
 * Tier 1: Shopify .json / .js API endpoint
 * Tier 2: Standardized JSON-LD Schema
 * Tier 3: Sanitized High-Res DOM Selectors
 */
export async function scrapeGnc(rawUrl: string): Promise<GncScraperResult> {
  const normalizedUrl = cleanAndNormalizeUrl(rawUrl) || rawUrl.trim();
  const headers = getStandardScraperHeaders(normalizedUrl);

  let titleEn = '';
  let brand = 'GNC';
  let priceAed = 0;
  let originalPriceAed = 0;
  let mainImage = '';
  const galleryImages: string[] = [];
  const flavorsList: string[] = [];
  const sizesList: string[] = [];
  const structuredVariants: any[] = [];
  let description = '';
  let inStock = true;

  // -------------------------------------------------------------
  // TIER 1: Shopify Product JSON API
  // -------------------------------------------------------------
  try {
    const jsonUrl = normalizedUrl.split('?')[0].replace(/\/$/, '') + '.json';
    const res = await axios.get(jsonUrl, { headers, timeout: 10000 });
    const p = res.data?.product;
    if (p && p.title) {
      titleEn = p.title;
      brand = p.vendor || 'GNC';
      description = p.body_html ? p.body_html.replace(/<[^>]*>/g, ' ').trim() : '';

      const variants = Array.isArray(p.variants) ? p.variants : [];
      const v0 = variants[0] || {};
      priceAed = extractPriceNumber(v0.price);
      originalPriceAed = extractPriceNumber(v0.compare_at_price);

      mainImage = sanitizeImageUrl(p.image?.src || (p.images && p.images[0]?.src), normalizedUrl);
      if (Array.isArray(p.images)) {
        p.images.forEach((im: any) => {
          const u = sanitizeImageUrl(im.src || im, normalizedUrl);
          if (u && !galleryImages.includes(u)) galleryImages.push(u);
        });
      }

      (p.options || []).forEach((opt: any) => {
        const optName = String(opt.name || '').toLowerCase();
        if (optName.includes('flavor') || optName.includes('طعم')) {
          (opt.values || []).forEach((v: any) => {
            const vStr = String(v || '').trim();
            if (vStr && !isArtificialFallback(vStr)) flavorsList.push(vStr);
          });
        } else if (optName.includes('size') || optName.includes('weight') || optName.includes('سایز') || optName.includes('حجم')) {
          (opt.values || []).forEach((v: any) => {
            const vStr = String(v || '').trim();
            if (vStr && !isArtificialFallback(vStr)) sizesList.push(vStr);
          });
        }
      });

      variants.forEach((v: any, idx: number) => {
        const vPrice = extractPriceNumber(v.price) || priceAed;
        const vOrigPrice = extractPriceNumber(v.compare_at_price);
        const opt1 = String(v.option1 || '').trim();
        const opt2 = String(v.option2 || '').trim();
        const vTitle = String(v.title || '').trim();

        const isOpt1Size = opt1.toLowerCase().includes('kg') || opt1.toLowerCase().includes('g') || opt1.toLowerCase().includes('lb') || opt1.toLowerCase().includes('serving') || opt1.toLowerCase().includes('عددی') || opt1.toLowerCase().includes('capsule') || opt1.toLowerCase().includes('tablet');
        
        let sizeVal: string | undefined = undefined;
        let flavorVal: string | undefined = undefined;

        if (opt1 && !isArtificialFallback(opt1)) {
          if (isOpt1Size) sizeVal = opt1;
          else flavorVal = opt1;
        }

        if (opt2 && !isArtificialFallback(opt2)) {
          if (!sizeVal && (opt2.toLowerCase().includes('kg') || opt2.toLowerCase().includes('lb') || opt2.toLowerCase().includes('serving'))) {
            sizeVal = opt2;
          } else if (!flavorVal) {
            flavorVal = opt2;
          }
        }

        if (!sizeVal && !flavorVal && vTitle && !isArtificialFallback(vTitle)) {
          if (isOpt1Size) sizeVal = vTitle;
          else flavorVal = vTitle;
        }

        if (sizeVal || flavorVal) {
          structuredVariants.push({
            id: `var-${v.id || idx}`,
            size: sizeVal,
            flavor: flavorVal,
            title: vTitle && !isArtificialFallback(vTitle) ? vTitle : (flavorVal || sizeVal),
            price: vPrice,
            priceAed: vPrice,
            priceAED: vPrice,
            originalPriceAed: vOrigPrice > vPrice ? vOrigPrice : undefined,
            inStock: v.available !== false,
            image: sanitizeImageUrl(v.featured_image?.src || mainImage, normalizedUrl)
          });
        }
      });

      if (v0.available === false) {
        inStock = variants.some((v: any) => v.available !== false);
      }
    }
  } catch (_shopErr) {}

  // -------------------------------------------------------------
  // TIER 2 & 3: Direct HTML Scraping Fallback (JSON-LD + DOM)
  // -------------------------------------------------------------
  if (!priceAed) {
    try {
      const res = await axios.get(normalizedUrl, { headers, timeout: 12000 });
      const html = res.data;
      if (html && typeof html === 'string') {
        const $ = cheerio.load(html);

        // JSON-LD
        const jsonLdData = extractJsonLdSchema($, normalizedUrl);
        if (jsonLdData) {
          if (!titleEn && jsonLdData.name) titleEn = jsonLdData.name;
          if (jsonLdData.brand) brand = jsonLdData.brand;
          if (jsonLdData.priceAED > 0) priceAed = jsonLdData.priceAED;
          if (jsonLdData.originalPriceAED && jsonLdData.originalPriceAED > priceAed) originalPriceAed = jsonLdData.originalPriceAED;
          if (!mainImage && jsonLdData.image) mainImage = jsonLdData.image;
          if (jsonLdData.galleryImages?.length > 0) {
            jsonLdData.galleryImages.forEach(img => {
              if (img && !galleryImages.includes(img)) galleryImages.push(img);
            });
          }
        }

        // DOM Fallback
        if (!titleEn) {
          titleEn = $('h1.product-single__title, h1.product__title, h1').first().text().trim() ||
                    $('meta[property="og:title"]').attr('content') || '';
        }
        if (!priceAed) {
          const priceText = $('.price__regular .price-item--regular, .product__price, [data-product-price], .price').first().text();
          priceAed = extractPriceNumber(priceText);
        }
        if (!mainImage) {
          const ogImg = $('meta[property="og:image"]').attr('content') ||
                        $('.product-single__photo img, .product__media img').first().attr('src');
          mainImage = sanitizeImageUrl(ogImg || '', normalizedUrl);
        }

        // Swatch & Variant Option DOM Extraction (Strictly exclude out-of-stock / disabled / line-through)
        $('.variant-wrapper, .swatch, .product-form__input, [data-option-index], fieldset.js-product-form__input').each((_, wrap) => {
          const optLabel = $(wrap).find('legend, label, .form__label').first().text().toLowerCase();
          $(wrap).find('input[type="radio"], option, .swatch-element, button[data-value]').each((__, optEl) => {
            const $opt = $(optEl);
            const val = $opt.attr('data-value') || $opt.val() || $opt.text().trim();
            const valStr = String(val || '').trim();
            const isOutOfStock = $opt.hasClass('disabled') || $opt.hasClass('soldout') || $opt.hasClass('out-of-stock') || $opt.is(':disabled') || $opt.attr('disabled') !== undefined || isOutOfStockElement($opt.toString(), valStr);
            if (valStr && !isOutOfStock && !isArtificialFallback(valStr)) {
              if (optLabel.includes('flavor') || optLabel.includes('طعم')) {
                if (!flavorsList.includes(valStr)) flavorsList.push(valStr);
              } else if (optLabel.includes('size') || optLabel.includes('weight') || optLabel.includes('حجم')) {
                if (!sizesList.includes(valStr)) sizesList.push(valStr);
              }
            }
          });
        });
      }
    } catch (_htmlErr) {}
  }

  if (mainImage && !galleryImages.includes(mainImage)) {
    galleryImages.unshift(mainImage);
  }

  const cleanFlavors = deduplicateStrings(flavorsList);
  const cleanSizes = deduplicateStrings(sizesList);
  const titleFa = generateBilingualProductTitle(titleEn, brand);

  const selectedFlavor: string | null = cleanFlavors.length > 0 ? cleanFlavors[0] : null;
  const selectedSize: string | null = cleanSizes.length > 0 ? cleanSizes[0] : null;

  // Filter structured variants: if single-SKU default, keep variants empty
  const validVariants = structuredVariants.filter(v => {
    const hasFlavor = v.flavor && !isArtificialFallback(v.flavor);
    const hasSize = v.size && !isArtificialFallback(v.size);
    return hasFlavor || hasSize;
  });

  let discountPercent: number | undefined;
  if (originalPriceAed > priceAed && originalPriceAed > 0) {
    discountPercent = Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100);
  }

  if (!priceAed || priceAed <= 0) {
    return {
      success: false,
      ok: false,
      titleFa,
      titleEn,
      title: titleEn,
      brand,
      priceAed: 0,
      image: mainImage,
      imageUrl: mainImage,
      galleryImages,
      inStock: false,
      retailer: 'GNC',
      store: 'GNC Store',
      storeName: 'GNC Store',
      sourceUrl: normalizedUrl,
      selectedFlavor,
      selectedSize,
      flavors: cleanFlavors,
      sizes: cleanSizes,
      variants: validVariants,
      weightKg: 0.8,
      error: 'امکان استخراج اطلاعات از فروشگاه GNC مقدور نشد.'
    };
  }

  return {
    success: true,
    ok: true,
    titleFa,
    titleEn,
    title: titleEn,
    brand,
    priceAed,
    priceAED: priceAed,
    originalPriceAed: originalPriceAed > priceAed ? originalPriceAed : undefined,
    originalPriceAED: originalPriceAed > priceAed ? originalPriceAed : undefined,
    discountPercent,
    image: mainImage,
    imageUrl: mainImage,
    galleryImages,
    inStock,
    retailer: 'GNC',
    store: 'GNC Store',
    storeName: 'GNC Store',
    sourceUrl: normalizedUrl,
    selectedFlavor,
    selectedSize,
    flavors: cleanFlavors,
    sizes: cleanSizes,
    variants: validVariants,
    weightKg: 0.8,
    description
  };
}
