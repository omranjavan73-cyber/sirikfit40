import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  isOutOfStockElement,
  sanitizeImageUrl,
  getStandardScraperHeaders,
  generateBilingualProductTitle
} from './utils';
import type { ScrapedProductResult, ExtractedProduct } from './drNutritionAdapter';

export interface ScrapedProductData {
  titleFa?: string;
  titleEn: string;
  brand: string;
  priceAed: number;          // Active selling price (e.g. 40.09)
  originalPriceAed?: number;  // Old struck-through price (e.g. 57.27)
  discountPercent?: number;  // e.g. 30 (%)
  imageUrl: string;
  sizes: string[];
  flavors: string[];
  inStock: boolean;
}

/**
 * Bulletproof Sporter HTML Parser
 * Extracts ACTIVE selling price (e.g., AED 40.09) and ORIGINAL strikethrough price (e.g., AED 57.27)
 */
export const parseSporterHtml = (html: string, sourceUrl: string = 'https://www.sporter.com/en-ae/'): ScrapedProductResult => {
  const $ = cheerio.load(html);

  // 1. Title & Brand Extraction
  let jsonTitle = '';
  let jsonImage = '';
  let jsonPrice = 0;
  let jsonOldPrice = 0;
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
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offer) {
            if (offer.price) {
              const p = parseFloat(String(offer.price).replace(/,/g, '').replace(/[^0-9.]/g, ''));
              if (!isNaN(p) && p > 0) jsonPrice = p;
            }
            if (offer.lowPrice) {
              const lp = parseFloat(String(offer.lowPrice).replace(/,/g, '').replace(/[^0-9.]/g, ''));
              if (!isNaN(lp) && lp > 0) jsonPrice = lp;
            }
            if (offer.highPrice) {
              const hp = parseFloat(String(offer.highPrice).replace(/,/g, '').replace(/[^0-9.]/g, ''));
              if (!isNaN(hp) && hp > 0) jsonOldPrice = hp;
            }
          }
        }
      }
    } catch (_) {}
  });

  const titleEn = jsonTitle || $('h1.page-title, [data-ui-id="page-title-wrapper"], h1.product-name, h1').first().text().trim() || 'مکمل اسپورتر';
  const brand = $('.product-brand, .brand-name, [itemprop="brand"]').first().text().trim() || 'Sporter UAE';
  const mainImg = sanitizeImageUrl(jsonImage || $('meta[property="og:image"]').attr('content') || $('.gallery-placeholder img, [itemprop="image"], .fotorama__img, .product-image-photo').first().attr('src') || '', sourceUrl) || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=800';

  // 2. BULLETPROOF 4-TIER PRICE EXTRACTION
  let priceAed = 0;
  let originalPriceAed = 0;

  // Tier 1: Parse Magento priceConfig JSON
  $('script[type="text/x-magento-init"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}');
      const priceBox = json['[data-role=priceBox]']?.priceBox?.priceConfig?.prices 
                    || json['#product_addtocart_form']?.priceBox?.priceConfig?.prices
                    || json['*']?.priceBox?.priceConfig?.prices;
      if (priceBox) {
        if (priceBox.finalPrice?.amount) {
          const val = parseFloat(String(priceBox.finalPrice.amount));
          if (!isNaN(val) && val > 0) priceAed = val;
        }
        if (priceBox.oldPrice?.amount) {
          const val = parseFloat(String(priceBox.oldPrice.amount));
          if (!isNaN(val) && val > 0) originalPriceAed = val;
        }
      }
    } catch (_) {}
  });

  // Tier 2: Check Magento / Sporter Specific Price Selectors & Attributes
  if (!priceAed) {
    const specialPriceElem = $('[data-price-type="finalPrice"] .price, .special-price .price, .product-info-price .special-price');
    const oldPriceElem = $('[data-price-type="oldPrice"] .price, .old-price .price, .product-info-price .old-price, del .price, s .price, .line-through .price');
    const regularPriceElem = $('[data-price-type="basePrice"] .price, .price-box .price, .product-info-price .price');

    if (specialPriceElem.length > 0) {
      const rawSpecial = specialPriceElem.first().text().replace(/[^\d.]/g, '');
      priceAed = parseFloat(rawSpecial) || 0;
      if (oldPriceElem.length > 0) {
        const rawOld = oldPriceElem.first().text().replace(/[^\d.]/g, '');
        originalPriceAed = parseFloat(rawOld) || 0;
      }
    } else if (regularPriceElem.length > 0) {
      const rawRegular = regularPriceElem.first().text().replace(/[^\d.]/g, '');
      priceAed = parseFloat(rawRegular) || 0;
    }
  }

  // Tier 3: Fallback to JSON-LD Schema
  if (!priceAed && jsonPrice > 0) {
    priceAed = jsonPrice;
    if (!originalPriceAed && jsonOldPrice > jsonPrice) originalPriceAed = jsonOldPrice;
  }

  // Tier 4: OpenGraph & Meta price tags
  if (!priceAed) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content') || $('meta[name="twitter:data1"]').attr('content');
    if (metaPrice) {
      priceAed = parseFloat(metaPrice.replace(/[^\d.]/g, '')) || 0;
    }
  }

  // Compute Discount Percent if both prices exist
  let discountPercent: number | undefined;
  if (originalPriceAed > priceAed && originalPriceAed > 0) {
    discountPercent = Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100);
  }

  // 3. EXTRACT SIZES, FLAVORS & SWATCHES
  const flavorsSet = new Set<string>();
  const sizesSet = new Set<string>();

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

  $('.swatch-attribute-flavor .swatch-option, .swatch-attribute[data-attribute-code*="flavor"] .swatch-option, .flavor-item, [data-attribute-code*="flavor"] .swatch-select-option').each((_, el) => {
    const optText = $(el).text().trim() || $(el).attr('data-option-label') || $(el).attr('title') || '';
    if (optText) flavorsSet.add(optText);
  });

  $('.swatch-attribute-size .swatch-option, .swatch-attribute[data-attribute-code*="size"] .swatch-option, .swatch-attribute[data-attribute-code*="weight"] .swatch-option, .size-item, [data-attribute-code*="size"] .swatch-select-option').each((_, el) => {
    const optText = $(el).text().trim() || $(el).attr('data-option-label') || $(el).attr('title') || '';
    if (optText) sizesSet.add(optText);
  });

  const flavors = Array.from(flavorsSet).filter(f => f && f.length > 1 && !['default', 'standard', 'پیش‌فرض'].includes(f.toLowerCase()));
  const sizes = Array.from(sizesSet).filter(s => s && s.length > 1 && !['default', 'standard', 'پیش‌فرض'].includes(s.toLowerCase()));
  const finalActivePrice = priceAed > 0 ? priceAed : 0;
  const finalOriginalPrice = (originalPriceAed && originalPriceAed > finalActivePrice) ? originalPriceAed : undefined;

  // Construct standardized ProductVariant matrix
  const standardizedVariants: any[] = [];
  if (sizes.length > 0 && flavors.length > 0) {
    sizes.forEach((s, sIdx) => {
      flavors.forEach((f, fIdx) => {
        standardizedVariants.push({
          id: `var-${sIdx}-${fIdx}`,
          size: s,
          flavor: f,
          price: finalActivePrice,
          priceAED: finalActivePrice,
          priceAed: finalActivePrice,
          originalPrice: finalOriginalPrice,
          originalPriceAED: finalOriginalPrice,
          originalPriceAed: finalOriginalPrice,
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
        price: finalActivePrice,
        priceAED: finalActivePrice,
        priceAed: finalActivePrice,
        originalPrice: finalOriginalPrice,
        originalPriceAED: finalOriginalPrice,
        originalPriceAed: finalOriginalPrice,
        inStock: true,
        image: mainImg
      });
    });
  } else if (flavors.length > 0) {
    flavors.forEach((f, fIdx) => {
      standardizedVariants.push({
        id: `var-${fIdx}`,
        flavor: f,
        price: finalActivePrice,
        priceAED: finalActivePrice,
        priceAed: finalActivePrice,
        originalPrice: finalOriginalPrice,
        originalPriceAED: finalOriginalPrice,
        originalPriceAed: finalOriginalPrice,
        inStock: true,
        image: mainImg
      });
    });
  }

  return {
    ok: finalActivePrice > 0,
    success: finalActivePrice > 0,
    title: titleEn,
    titleFa: generateBilingualProductTitle(titleEn, 'Sporter'),
    brand,
    storeName: 'Sporter UAE',
    sourceUrl,
    priceAed: finalActivePrice,
    priceAED: finalActivePrice,
    price: finalActivePrice,
    originalPriceAed: finalOriginalPrice,
    originalPriceAED: finalOriginalPrice,
    originalPrice: finalOriginalPrice,
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
};

export async function sporterAdapter(targetUrl: string, cmsConfig?: any): Promise<ScrapedProductResult | null> {
  const storeName = "Sporter UAE";
  const headers = getStandardScraperHeaders(targetUrl);

  let sporterUrl = targetUrl.replace(/https?:\/\/(www\.)?sporter\.com/i, 'https://www.sporter.com');
  let enAeUrl = sporterUrl;
  if (/\/(ar|en)-[a-z]{2}\//i.test(sporterUrl)) {
    enAeUrl = sporterUrl.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
  } else if (!sporterUrl.includes('/en-ae/') && !sporterUrl.includes('/ar-ae/')) {
    enAeUrl = sporterUrl.replace('sporter.com/', 'sporter.com/en-ae/');
  }

  const urlCandidates = Array.from(new Set([enAeUrl, sporterUrl, targetUrl]));

  for (const url of urlCandidates) {
    try {
      const response = await axios.get(url, { headers, timeout: 15000 });
      if (response.data && typeof response.data === 'string') {
        const parsed = parseSporterHtml(response.data, url);
        if (parsed && parsed.title && (parsed.priceAED > 0 || parsed.mainImage)) {
          return parsed;
        }
      }
    } catch (_e) {}
  }

  // Jina Reader Fallback
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
          weightKg: 0.8
        };
      }
    }
  } catch (_jErr) {}

  return null;
}
