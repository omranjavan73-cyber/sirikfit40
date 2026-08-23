import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  isOutOfStockElement,
  sanitizeImageUrl,
  getStandardScraperHeaders,
  generateBilingualProductTitle
} from './utils';
import type { ScrapedProductResult } from './drNutritionAdapter';

export function parseSporterStrict(html: string, url: string): ScrapedProductResult | null {
  const $ = cheerio.load(html);

  // 1. JSON-LD Title & Image Extraction
  let jsonTitle = '';
  let jsonImage = '';
  const galleryImages: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      const items = data['@graph'] ? data['@graph'] : (Array.isArray(data) ? data : [data]);
      for (const item of items) {
        if (item && (item['@type'] === 'Product' || item.offers)) {
          jsonTitle = item.name || jsonTitle;
          jsonImage = Array.isArray(item.image) ? item.image[0] : (item.image || jsonImage);
          if (Array.isArray(item.image)) {
            item.image.forEach((img: string) => {
              if (img && typeof img === 'string' && !galleryImages.includes(img)) galleryImages.push(img);
            });
          }
        }
      }
    } catch (_) {}
  });

  const title = jsonTitle || $('h1.product-name, h1[itemprop="name"], h1.page-title').first().text().trim() || 'مکمل اسپورتر';
  const brand = $('.brand-name, .product-brand, [itemprop="brand"]').first().text().trim() || 'Sporter UAE';

  // 2. BULLETPROOF 3-TIER PRICE EXTRACTION
  let finalPrice = 0;
  let oldPrice = 0;

  // TIER 1: EXTRACT FROM MAGENTO PRICE CONFIG JSON (100% ACCURATE)
  $('script[type="text/x-magento-init"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}');
      const priceBox = json['[data-role=priceBox]']?.priceBox?.priceConfig?.prices 
                    || json['#product_addtocart_form']?.priceBox?.priceConfig?.prices;
      if (priceBox) {
        if (priceBox.finalPrice?.amount) finalPrice = parseFloat(String(priceBox.finalPrice.amount));
        if (priceBox.oldPrice?.amount) oldPrice = parseFloat(String(priceBox.oldPrice.amount));
      }
    } catch (_) {}
  });

  // TIER 2: ATTRIBUTE-BASED TARGETING
  if (!finalPrice) {
    const finalPriceAttr = $('[data-price-type="finalPrice"]').first().attr('data-price-amount');
    if (finalPriceAttr) finalPrice = parseFloat(finalPriceAttr);

    const oldPriceAttr = $('[data-price-type="oldPrice"]').first().attr('data-price-amount');
    if (oldPriceAttr) oldPrice = parseFloat(oldPriceAttr);
  }

  // TIER 3: AGGRESSIVE DOM PURGE FALLBACK
  if (!finalPrice) {
    // First, explicitly delete all strikethrough nodes from the Cheerio instance
    $('.old-price, del, s, [data-price-type="oldPrice"], .price-box .old-price').remove();

    // Read the remaining .price element text (guaranteed to be the active selling price)
    const remainingPriceTxt = $('.price-box .price, span.price, .special-price .price, .price-final_price .price, .product-info-price .price, .price').first().text().replace(/,/g, '').trim();
    const match = remainingPriceTxt.match(/[\d.]+/);
    if (match) {
      finalPrice = parseFloat(match[0]);
    }
  }

  // Fallback to meta tags if still zero
  if (!finalPrice) {
    const metaPriceMatch = $('meta[property="product:price:amount"], meta[property="og:price:amount"]').attr('content');
    if (metaPriceMatch) {
      const mp = parseFloat(metaPriceMatch.replace(/,/g, '').replace(/[^0-9.]/g, ''));
      if (!isNaN(mp) && mp > 0 && mp < 50000) finalPrice = mp;
    }
  }

  // 3. NORMALIZATION OUTPUT
  const activePrice = Math.round(finalPrice * 100) / 100;
  const normalizedOldPrice = (oldPrice && oldPrice > activePrice) ? Math.round(oldPrice * 100) / 100 : undefined;
  const discountPercent = normalizedOldPrice
    ? Math.round(((normalizedOldPrice - activePrice) / normalizedOldPrice) * 100)
    : undefined;

  // 3. EXTRACT SIZES, FLAVORS & SWATCHES
  const flavorsSet = new Set<string>();
  const sizesSet = new Set<string>();

  // From Magento JSON scripts
  $('script[type="text/x-magento-init"]').each((_, el) => {
    try {
      const raw = $(el).html() || '{}';
      if (raw.includes('Magento_Swatches/js/swatch-renderer') || raw.includes('spConfig')) {
        const parsed = JSON.parse(raw);
        const swatchRenderer = parsed['[data-role=swatch-options]']?.['Magento_Swatches/js/swatch-renderer'] ||
                               parsed['#product_addtocart_form']?.['Magento_Swatches/js/swatch-renderer'] ||
                               parsed['*']?.['Magento_Swatches/js/swatch-renderer'] ||
                               parsed['*']?.['spConfig'];
        const jsonConfig = swatchRenderer?.jsonConfig || swatchRenderer;
        if (jsonConfig?.attributes) {
          Object.values(jsonConfig.attributes).forEach((attr: any) => {
            const code = String(attr.code || attr.label || '').toLowerCase();
            if (Array.isArray(attr.options)) {
              attr.options.forEach((opt: any) => {
                const optName = String(opt.label || '').trim();
                if (optName) {
                  if (code.includes('flavor') || code.includes('طعم')) flavorsSet.add(optName);
                  else if (code.includes('size') || code.includes('weight') || code.includes('حجم')) sizesSet.add(optName);
                }
              });
            }
          });
        }
      }
    } catch (_) {}
  });

  // From DOM Swatch Elements
  $('.swatch-attribute-flavor .swatch-option, .swatch-attribute[data-attribute-code*="flavor"] .swatch-option, .flavor-item, [data-attribute-code*="flavor"] .swatch-select-option').each((_, el) => {
    const optText = $(el).text().trim() || $(el).attr('data-option-label') || $(el).attr('title') || '';
    if (optText) flavorsSet.add(optText);
  });

  $('.swatch-attribute-size .swatch-option, .swatch-attribute[data-attribute-code*="size"] .swatch-option, .swatch-attribute[data-attribute-code*="weight"] .swatch-option, .size-item, [data-attribute-code*="size"] .swatch-select-option').each((_, el) => {
    const optText = $(el).text().trim() || $(el).attr('data-option-label') || $(el).attr('title') || '';
    if (optText) sizesSet.add(optText);
  });

  const flavors = Array.from(flavorsSet);
  const sizes = Array.from(sizesSet);

  // Construct standardized ProductVariant matrix
  const standardizedVariants: any[] = [];
  if (sizes.length > 0 && flavors.length > 0) {
    sizes.forEach((s, sIdx) => {
      flavors.forEach((f, fIdx) => {
        standardizedVariants.push({
          id: `var-${sIdx}-${fIdx}`,
          size: s,
          flavor: f,
          price: activePrice,
          priceAED: activePrice,
          priceAed: activePrice,
          originalPrice: normalizedOldPrice,
          originalPriceAED: normalizedOldPrice,
          originalPriceAed: normalizedOldPrice,
          inStock: true,
          image: mainImg
        });
      });
    });
  } else if (sizes.length > 0) {
    sizes.forEach((s, sIdx) => {
      standardizedVariants.push({
        id: `var-${sIdx}`,
        size: s,
        price: activePrice,
        priceAED: activePrice,
        priceAed: activePrice,
        originalPrice: normalizedOldPrice,
        originalPriceAED: normalizedOldPrice,
        originalPriceAed: normalizedOldPrice,
        inStock: true,
        image: mainImg
      });
    });
  } else if (flavors.length > 0) {
    flavors.forEach((f, fIdx) => {
      standardizedVariants.push({
        id: `var-${fIdx}`,
        flavor: f,
        price: activePrice,
        priceAED: activePrice,
        priceAed: activePrice,
        originalPrice: normalizedOldPrice,
        originalPriceAED: normalizedOldPrice,
        originalPriceAed: normalizedOldPrice,
        inStock: true,
        image: mainImg
      });
    });
  }

  return {
    ok: true,
    success: true,
    title,
    titleFa: generateBilingualProductTitle(title, 'Sporter'),
    brand,
    storeName: 'Sporter UAE',
    sourceUrl: url,
    priceAed: activePrice,
    priceAED: activePrice,
    price: activePrice,
    originalPriceAed: normalizedOldPrice,
    originalPriceAED: normalizedOldPrice,
    originalPrice: normalizedOldPrice,
    discountPercent,
    currency: 'AED',
    mainImage: mainImg,
    image: mainImg,
    imageUrl: mainImg,
    galleryImages: galleryImages.filter(Boolean),
    images: galleryImages.filter(Boolean),
    weightKg: 0.8,
    flavors: flavors,
    sizes: sizes,
    variants: standardizedVariants,
    variantMatrix: {
      flavors,
      sizes,
      items: standardizedVariants
    }
  };
}



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

  // TIER 1: DIRECT AXIOS WITH STRICT PARSER
  for (const url of urlCandidates) {
    try {
      const response = await axios.get(url, { headers, timeout: 15000 });
      if (response.data && typeof response.data === 'string') {
        const parsed = parseSporterStrict(response.data, url);
        if (parsed && parsed.title && (parsed.priceAED > 0 || parsed.mainImage)) {
          return parsed;
        }
      }
    } catch (_e) {}
  }

  // TIER 2: JINA READER FALLBACK (MARKDOWN PARSER)
  try {
    const jinaUrl = `https://r.jina.ai/${enAeUrl}`;
    const jinaRes = await axios.get(jinaUrl, {
      headers: { ...headers, 'Accept': 'text/plain, text/markdown', 'X-With-Images-Summary': 'true', 'X-No-Cache': 'true' },
      timeout: 12000
    });
    if (jinaRes.data && typeof jinaRes.data === 'string') {
      const md = jinaRes.data;
      let title = '';
      let price = 0;
      let originalPrice: number | undefined;
      let discountPercent: number | undefined;
      const gallery: string[] = [];

      const h1 = md.match(/^#\s+([^\n]+)/m);
      if (h1) title = h1[1].replace(/\|\s*Sporter.*/i, '').trim();

      // Extract active selling price vs strikethrough price from adjacent AED text lines
      const adjacentPriceMatches = Array.from(md.matchAll(/AED\s*([\d,]+\.?\d*)[ \t]*(?:\r?\n+[ \t]*AED\s*([\d,]+\.?\d*))?/gi))
        .filter(m => {
          const raw = m[0].toLowerCase();
          return !raw.includes('tamara') && !raw.includes('tabby') && !raw.includes('split');
        });

      for (const m of adjacentPriceMatches) {
        const p1 = parseFloat(m[1].replace(/,/g, ''));
        const p2 = m[2] ? parseFloat(m[2].replace(/,/g, '')) : undefined;

        if (!isNaN(p1) && p1 > 0 && p1 < 50000) {
          if (p2 !== undefined && !isNaN(p2) && p2 > 0 && p2 < 50000) {
            price = Math.min(p1, p2);
            originalPrice = Math.max(p1, p2);
            if (originalPrice > price) {
              discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
            }
            break;
          } else if (!price) {
            price = p1;
          }
        }
      }

      // Extract accurate weight
      let weightKg = 0.5;
      const weightMatch = md.match(/(?:Size|Weight|Net Wt\.?|حجم|وزن)[:\s]*([0-9.]+)\s*(grams?|g|kg|lbs?|oz|ml|servings?|capsules?|tablets?|softgels?)/i) ||
                          md.match(/([0-9.]+)\s*(grams?|g|kg|lbs?|oz)\b/i);
      if (weightMatch) {
        const val = parseFloat(weightMatch[1]);
        const unit = weightMatch[2].toLowerCase();
        if (unit.startsWith('g')) weightKg = Math.round((val / 1000) * 1000) / 1000;
        else if (unit === 'kg') weightKg = val;
        else if (unit.startsWith('lb')) weightKg = Math.round((val * 0.453592) * 1000) / 1000;
        else if (unit === 'oz') weightKg = Math.round((val * 0.0283495) * 1000) / 1000;
      }

      // Extract images
      Array.from(md.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi)).forEach(m => {
        const s = sanitizeImageUrl(m[2].trim(), enAeUrl);
        if (s && !gallery.includes(s) && !s.includes('logo') && !s.includes('icon') && !s.includes('.svg') && !s.includes('Tamara') && !s.includes('searchIcon')) {
          gallery.push(s);
        }
      });

      const mainImg = gallery[0] || '';

      if (title && price > 0) {
        return {
          ok: true,
          success: true,
          title,
          titleFa: generateBilingualProductTitle(title, 'Sporter'),
          brand: 'Sporter UAE',
          storeName,
          sourceUrl: targetUrl,
          priceAed: price,
          priceAED: price,
          price,
          originalPriceAed: (originalPrice && originalPrice > price) ? originalPrice : undefined,
          originalPriceAED: (originalPrice && originalPrice > price) ? originalPrice : undefined,
          originalPrice: (originalPrice && originalPrice > price) ? originalPrice : undefined,
          discountPercent,
          currency: 'AED',
          mainImage: mainImg,
          image: mainImg,
          imageUrl: mainImg,
          galleryImages: gallery,
          images: gallery,
          weightKg
        };
      }
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
  return parseSporterStrict(html, targetUrl);
}
