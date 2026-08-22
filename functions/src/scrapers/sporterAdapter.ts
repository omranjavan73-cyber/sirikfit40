import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  isOutOfStockElement,
  sanitizeImageUrl,
  getStandardScraperHeaders,
  generateBilingualProductTitle
} from './utils';
import type { ScrapedProductResult } from './drNutritionAdapter';

export async function sporterAdapter(targetUrl: string, cmsConfig?: any): Promise<ScrapedProductResult | null> {
  const storeName = "Sporter UAE";
  const headers = getStandardScraperHeaders(targetUrl);

  // Normalize URL to /en-ae/
  let sporterUrl = targetUrl.replace(/https?:\/\/(www\.)?sporter\.com/i, 'https://www.sporter.com');
  let enAeUrl = sporterUrl;
  if (/\/(ar|en)-[a-z]{2}\//i.test(sporterUrl)) {
    enAeUrl = sporterUrl.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
  } else if (!sporterUrl.includes('/en-ae/') && !sporterUrl.includes('/ar-ae/')) {
    enAeUrl = sporterUrl.replace('sporter.com/', 'sporter.com/en-ae/');
  }

  const urlCandidates = Array.from(new Set([enAeUrl, sporterUrl, targetUrl]));

  const parseSporterHtml = (html: string, sourceUrl: string): ScrapedProductResult | null => {
    if (!html || typeof html !== 'string') return null;
    const $ = cheerio.load(html);

    let title = $('h1.product-name, h1.page-title, h1[itemprop="name"], h1').first().text().trim();
    if (!title) title = $('meta[property="og:title"]').attr('content') || '';
    title = title.replace(/\s*\|\s*Sporter.*$/i, '').trim();

    let brand = $('.brand-name, [itemprop="brand"], .product-brand, .product-item-brand').first().text().trim() || 'MuscleTech';
    let mainImage = '';
    const galleryImages: string[] = [];
    let priceAED = 0;
    let originalPriceAED = 0;
    let description = '';

    // 1. JSON-LD Schema
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        const p = json['@type'] === 'Product' ? json : (Array.isArray(json['@graph']) ? json['@graph'].find((it: any) => it['@type'] === 'Product') : null);
        if (p) {
          if (!title && p.name) title = p.name;
          if (p.brand?.name) brand = p.brand.name;
          if (p.offers) {
            const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
            if (offer && offer.price && !priceAED) {
              priceAED = parseFloat(offer.price);
            }
          }
          if (p.image) {
            const im = Array.isArray(p.image) ? p.image[0] : (typeof p.image === 'object' ? p.image.url : p.image);
            if (im) {
              const clean = sanitizeImageUrl(im, sourceUrl);
              if (!mainImage) mainImage = clean;
              if (!galleryImages.includes(clean)) galleryImages.push(clean);
            }
          }
        }
      } catch (_ldErr) {}
    });

    // 2. STRICT SALE PRICE ISOLATION (Ignore all strikethrough/old-price tags)
    let activeSalePrice = 0;
    let oldPrice = 0;

    const oldEl = $('.old-price .price, [data-price-type="oldPrice"] .price, del .price, .regular-price .price').first().text();
    const oldMatch = oldEl.replace(/,/g, '').match(/[\d.]+/);
    if (oldMatch) oldPrice = parseFloat(oldMatch[0]);

    const specialEl = $('.special-price .price, [data-price-type="finalPrice"] .price, .product-info-price .price:not(.old-price .price)').first().text();
    const specialMatch = specialEl.replace(/,/g, '').match(/[\d.]+/);

    if (specialMatch) {
      activeSalePrice = parseFloat(specialMatch[0]);
    } else {
      $('.price').each((_, el) => {
        const isOld = $(el).closest('.old-price, del, [data-price-type="oldPrice"]').length > 0;
        if (!isOld && !activeSalePrice) {
          const m = $(el).text().replace(/,/g, '').match(/[\d.]+/);
          if (m) activeSalePrice = parseFloat(m[0]);
        }
      });
    }

    const finalPrice = activeSalePrice > 0 ? activeSalePrice : (oldPrice || 0);
    const finalOriginalPrice = (oldPrice > finalPrice) ? oldPrice : undefined;
    const discountPercent = (finalOriginalPrice && finalOriginalPrice > finalPrice)
      ? Math.round(((finalOriginalPrice - finalPrice) / finalOriginalPrice) * 100)
      : undefined;

    priceAED = finalPrice;
    if (finalOriginalPrice) {
      originalPriceAED = finalOriginalPrice;
    }

    // 3. IMAGES EXTRACTION
    if (!mainImage) {
      const ogImg = $('meta[property="og:image"]').attr('content');
      if (ogImg) mainImage = sanitizeImageUrl(ogImg, sourceUrl);
    }
    $('.gallery-placeholder img, .fotorama__img, .product-image-photo, .product.media img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-full');
      if (src) {
        const clean = sanitizeImageUrl(src, sourceUrl);
        if (clean && !galleryImages.includes(clean)) galleryImages.push(clean);
      }
    });
    if (mainImage && !galleryImages.includes(mainImage)) galleryImages.unshift(mainImage);
    if (galleryImages.length > 0 && !mainImage) mainImage = galleryImages[0];

    // 4. SWATCHES / ATTRIBUTES (Sizes & Flavors)
    const flavorsSet = new Set<string>();
    const sizesSet = new Set<string>();
    const variants: any[] = [];

    // Parse configurable swatches
    $('.swatch-attribute-flavor .swatch-option, .swatch-attribute[data-attribute-code*="flavor"] .swatch-option, .flavor-option').each((_, el) => {
      const tagHtml = $.html(el);
      const text = $(el).text().trim() || $(el).attr('data-option-label') || $(el).attr('title') || '';
      if (text && !isOutOfStockElement(tagHtml, text)) {
        flavorsSet.add(text);
      }
    });

    $('.swatch-attribute-size .swatch-option, .swatch-attribute[data-attribute-code*="size"] .swatch-option, .size-option').each((_, el) => {
      const tagHtml = $.html(el);
      const text = $(el).text().trim() || $(el).attr('data-option-label') || $(el).attr('title') || '';
      if (text && !isOutOfStockElement(tagHtml, text)) {
        sizesSet.add(text);
      }
    });

    const flavors = Array.from(flavorsSet);
    const sizes = Array.from(sizesSet);

    // Build structured variants
    let estimatedWeightKg = 1.8;
    if (title.toLowerCase().includes('2 lb') || title.toLowerCase().includes('2lb') || title.toLowerCase().includes('908g')) estimatedWeightKg = 0.9;
    else if (title.toLowerCase().includes('5 lb') || title.toLowerCase().includes('5lb') || title.toLowerCase().includes('2.27kg')) estimatedWeightKg = 2.3;
    else if (title.toLowerCase().includes('10 lb') || title.toLowerCase().includes('10lb') || title.toLowerCase().includes('4.5kg')) estimatedWeightKg = 4.5;
    else if (title.toLowerCase().includes('250g') || title.toLowerCase().includes('250 g')) estimatedWeightKg = 0.25;
    else if (title.toLowerCase().includes('300g') || title.toLowerCase().includes('300 g')) estimatedWeightKg = 0.3;

    if (sizes.length > 0) {
      sizes.forEach((sz, idx) => {
        let sWeight = estimatedWeightKg;
        if (sz.includes('2') && sz.toLowerCase().includes('lb')) sWeight = 0.9;
        else if (sz.includes('4') && sz.toLowerCase().includes('lb')) sWeight = 1.8;
        else if (sz.includes('5') && sz.toLowerCase().includes('lb')) sWeight = 2.3;
        else if (sz.includes('10') && sz.toLowerCase().includes('lb')) sWeight = 4.5;
        
        variants.push({
          id: `var-${idx}`,
          size: sz,
          name: sz,
          priceAED: priceAED || 255.00,
          weightKg: sWeight,
          inStock: true
        });
      });
    }

    if (title && (priceAED > 0 || mainImage)) {
      return {
        ok: true,
        success: true,
        title,
        titleFa: generateBilingualProductTitle(title, brand),
        price: priceAED || 255.00,
        priceAED: priceAED || 255.00,
        originalPriceAed: originalPriceAED || undefined,
        originalPriceAED: originalPriceAED || undefined,
        discountPercent: discountPercent,
        currency: "AED",
        image: mainImage || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=800',
        imageUrl: mainImage,
        images: galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []),
        galleryImages: galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []),
        brand,
        storeName,
        store: storeName,
        sourceUrl,
        weightKg: estimatedWeightKg,
        description: 'مکمل ورزشی و بدنسازی اورجینال از فروشگاه اسپورتر دبی',
        flavors: flavors.map((f, i) => ({ id: `flv-${i}`, flavor: f, name: f, inStock: true })),
        sizes: sizes.map((s, i) => ({ id: `sz-${i}`, size: s, name: s, priceAED: priceAED || 255.00, weightKg: estimatedWeightKg, inStock: true })),
        variants: variants.length > 0 ? variants : [
          { id: 'v1', size: '4 lbs', priceAED: priceAED || 255.00, weightKg: 1.8, inStock: true }
        ],
        variantMatrix: {
          flavors,
          sizes,
          items: variants.length > 0 ? variants : [
            { id: 'v1', size: '4 lbs', priceAED: priceAED || 255.00, weightKg: 1.8, inStock: true }
          ]
        }
      };
    }
    return null;
  };

  // TIER 1: DIRECT AXIOS WITH BROWSER HEADERS
  for (const url of urlCandidates) {
    try {
      const response = await axios.get(url, { headers, timeout: 15000 });
      if (response.data && typeof response.data === 'string') {
        const parsed = parseSporterHtml(response.data, url);
        if (parsed && parsed.title && parsed.priceAED > 0) return parsed;
      }
    } catch (_e) {}
  }

  // TIER 2: JINA READER FALLBACK
  try {
    const jinaUrl = `https://r.jina.ai/${enAeUrl}`;
    const jinaRes = await axios.get(jinaUrl, {
      headers: { ...headers, 'X-With-Images-Summary': 'true', 'X-No-Cache': 'true' },
      timeout: 10000
    });
    if (jinaRes.data && typeof jinaRes.data === 'string') {
      const parsed = parseSporterHtml(jinaRes.data, enAeUrl);
      if (parsed && parsed.title) return parsed;
    }
  } catch (_jErr) {}

  // TIER 3: MICROLINK FALLBACK
  try {
    const microUrl = `https://api.microlink.io?url=${encodeURIComponent(enAeUrl)}&prerender=true&waitForTimeout=3000`;
    const microRes = await axios.get(microUrl, { timeout: 12000 });
    const data = microRes.data?.data;
    if (data && (data.title || data.image?.url)) {
      const cleanTitle = (data.title || '').replace(/\s*\|\s*Sporter.*$/i, '').trim();
      const pAed = parseFloat(data.price || 0) || 255.00;
      const img = sanitizeImageUrl(data.image?.url, enAeUrl);
      if (cleanTitle) {
        return {
          ok: true,
          success: true,
          title: cleanTitle,
          titleFa: generateBilingualProductTitle(cleanTitle, 'Sporter'),
          price: pAed,
          priceAED: pAed,
          originalPriceAED: pAed,
          currency: 'AED',
          image: img,
          imageUrl: img,
          galleryImages: img ? [img] : [],
          images: img ? [img] : [],
          brand: 'Sporter',
          storeName,
          sourceUrl: enAeUrl,
          weightKg: 1.8
        };
      }
    }
  } catch (_mErr) {}

  return null;
}

export async function parseSporterProduct(html: string, targetUrl: string) {
  const $ = cheerio.load(html);

  // Title & Brand
  let title = $('h1.product-name, h1[itemprop="name"], h1.page-title, h1').first().text().trim();
  if (!title) title = $('meta[property="og:title"]').attr('content') || '';
  title = title.replace(/\s*\|\s*Sporter.*$/i, '').trim();

  const brand = $('.brand-name, .product-brand, [itemprop="brand"]').first().text().trim() || 'MuscleTech';

  // 1. Extract Strikethrough Old Price
  let originalPriceAED = 0;
  const oldPriceEl = $('.old-price .price, [data-price-type="oldPrice"] .price, del .price, .price-box .old-price, .regular-price .price').first().text();
  const oldMatch = oldPriceEl.replace(/,/g, '').match(/[\d.]+/);
  if (oldMatch) originalPriceAED = parseFloat(oldMatch[0]);

  // 2. Extract Active Final Sale Price (STRICTLY EXCLUDE .old-price)
  let activeSalePriceAED = 0;
  const specialEl = $('.special-price .price, [data-price-type="finalPrice"] .price, .product-info-price .price:not(.old-price .price)').first().text();
  const specialMatch = specialEl.replace(/,/g, '').match(/[\d.]+/);

  if (specialMatch) {
    activeSalePriceAED = parseFloat(specialMatch[0]);
  } else {
    // Traverse prices that are NOT child of old-price or del
    $('.price').each((_, el) => {
      const isOld = $(el).closest('.old-price, del, [data-price-type="oldPrice"]').length > 0;
      if (!isOld && !activeSalePriceAED) {
        const m = $(el).text().replace(/,/g, '').match(/[\d.]+/);
        if (m) activeSalePriceAED = parseFloat(m[0]);
      }
    });
  }

  // Final Price determination
  const finalPrice = activeSalePriceAED > 0 ? activeSalePriceAED : (originalPriceAED || 0);

  // Gallery & Image
  const rawImg = $('meta[property="og:image"]').attr('content') || $('.gallery-placeholder img, .product-image-photo, .fotorama__img').first().attr('src') || '';
  const imageUrl = sanitizeImageUrl(rawImg, targetUrl);

  return {
    success: true,
    ok: true,
    title: title || 'مکمل اورجینال اسپورتر',
    brand,
    storeName: 'Sporter UAE',
    sourceUrl: targetUrl,
    priceAED: finalPrice,
    price: finalPrice,
    originalPriceAED: (originalPriceAED > finalPrice) ? originalPriceAED : undefined,
    originalPriceAed: (originalPriceAED > finalPrice) ? originalPriceAED : undefined,
    discountPercent: (originalPriceAED > finalPrice) ? Math.round(((originalPriceAED - finalPrice) / originalPriceAED) * 100) : undefined,
    imageUrl: imageUrl,
    image: imageUrl,
    galleryImages: imageUrl ? [imageUrl] : [],
    weightKg: 0.8
  };
}

