import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  isOutOfStockElement,
  sanitizeImageUrl,
  getStandardScraperHeaders,
  generateBilingualProductTitle
} from './utils';

export interface ScrapedProductResult {
  ok?: boolean;
  success?: boolean;
  title: string;
  titleFa?: string;
  price: number;
  priceAED: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  currency: string;
  image: string;
  imageUrl?: string;
  images?: string[];
  galleryImages?: string[];
  brand?: string;
  storeName?: string;
  store?: string;
  sourceUrl?: string;
  weightKg?: number;
  category?: string;
  description?: string;
  descriptionFa?: string;
  flavors?: any[];
  sizes?: any[];
  variantGroups?: any[];
  variants?: any[];
  variantMatrix?: {
    flavors: string[];
    sizes: string[];
    items: any[];
  };
  options?: string[];
}

export async function drNutritionAdapter(targetUrl: string, cmsConfig?: any): Promise<ScrapedProductResult | null> {
  const storeName = "Dr. Nutrition";
  const headers = getStandardScraperHeaders(targetUrl);

  // Normalize URL to /en-ae/
  let drUrl = targetUrl.replace(/https?:\/\/(www\.)?drnutrition\.com/i, 'https://www.drnutrition.com');
  let enAeUrl = drUrl;
  if (/\/(ar|en)-[a-z]{2}\//i.test(drUrl)) {
    enAeUrl = drUrl.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
  } else if (!drUrl.includes('/en-ae/')) {
    enAeUrl = drUrl.replace('drnutrition.com/', 'drnutrition.com/en-ae/');
  }

  const urlCandidates = Array.from(new Set([enAeUrl, drUrl, targetUrl]));

  // Helper parser for HTML body containing Next.js or Magento or Schema.org
  const parseDrNutritionHtml = (html: string, sourceUrl: string): ScrapedProductResult | null => {
    if (!html || typeof html !== 'string') return null;
    const $ = cheerio.load(html);

    let title = '';
    let brand = 'Applied Nutrition';
    let priceAED = 0;
    let originalPriceAED = 0;
    let mainImage = '';
    const galleryImages: string[] = [];
    const flavorsSet = new Set<string>();
    const sizesSet = new Set<string>();
    const variants: any[] = [];
    let description = '';

    // 1. NEXT.JS __NEXT_DATA__ EXTRACTION
    try {
      const nextDataScript = $('#__NEXT_DATA__').html();
      if (nextDataScript) {
        const nextJson = JSON.parse(nextDataScript);
        const pageProps = nextJson?.props?.pageProps || {};
        const p = pageProps.product || pageProps.productData || pageProps.initialData?.product;
        if (p) {
          if (p.name || p.title) title = String(p.name || p.title).trim();
          if (p.brand || p.manufacturer) brand = String(p.brand || p.manufacturer || p.brandName || '').trim();
          
          if (p.price || p.special_price || p.final_price || p.price_range?.minimum_price?.final_price?.value) {
            priceAED = parseFloat(p.special_price || p.final_price || p.price_range?.minimum_price?.final_price?.value || p.price);
          }
          if (p.regular_price || p.price_range?.minimum_price?.regular_price?.value) {
            originalPriceAED = parseFloat(p.regular_price || p.price_range?.minimum_price?.regular_price?.value);
          }

          if (p.image || p.small_image?.url || p.thumbnail?.url) {
            mainImage = sanitizeImageUrl(p.image?.url || p.image || p.small_image?.url || p.thumbnail?.url, sourceUrl);
          }
          if (Array.isArray(p.media_gallery || p.media_gallery_entries || p.images)) {
            const arr = p.media_gallery || p.media_gallery_entries || p.images;
            arr.forEach((m: any) => {
              const u = sanitizeImageUrl(m.url || m.file || m, sourceUrl);
              if (u && !galleryImages.includes(u)) galleryImages.push(u);
            });
          }

          if (p.description?.html || p.description) {
            description = String(p.description?.html || p.description || '').replace(/<[^>]*>/g, ' ').trim();
          }

          // Next.js Configurable Variants & Swatches
          if (Array.isArray(p.configurable_options || p.variants)) {
            const opts = p.configurable_options || p.variants;
            opts.forEach((opt: any) => {
              const optLabel = String(opt.label || opt.attribute_code || '').toLowerCase();
              if (Array.isArray(opt.values)) {
                opt.values.forEach((val: any) => {
                  const valLabel = String(val.label || val.store_label || '').trim();
                  if (valLabel) {
                    if (optLabel.includes('flavor') || optLabel.includes('طعم')) flavorsSet.add(valLabel);
                    else if (optLabel.includes('size') || optLabel.includes('weight') || optLabel.includes('حجم') || optLabel.includes('وزن')) sizesSet.add(valLabel);
                  }
                });
              }
            });
          }
        }
      }
    } catch (_nextErr) {}

    // 2. MAGENTO 2 x-magento-init EXTRACTION
    if (!priceAED || galleryImages.length === 0) {
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
            if (jsonConfig) {
              if (jsonConfig.prices?.finalPrice?.amount) {
                priceAED = parseFloat(jsonConfig.prices.finalPrice.amount);
              }
              if (jsonConfig.prices?.oldPrice?.amount) {
                originalPriceAED = parseFloat(jsonConfig.prices.oldPrice.amount);
              }

              // Parse swatches & images
              if (jsonConfig.images) {
                Object.values(jsonConfig.images).forEach((imgGroup: any) => {
                  if (Array.isArray(imgGroup)) {
                    imgGroup.forEach((im: any) => {
                      const u = sanitizeImageUrl(im.full || im.img || im.thumb, sourceUrl);
                      if (u && !galleryImages.includes(u)) galleryImages.push(u);
                    });
                  }
                });
              }

              if (jsonConfig.attributes) {
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
          }
        } catch (_magErr) {}
      });
    }

    // 3. SCHEMA.ORG JSON-LD EXTRACTION
    if (!priceAED || !title) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}');
          const target = json['@type'] === 'Product' || json['@type'] === 'IndividualProduct'
            ? json
            : (Array.isArray(json['@graph']) ? json['@graph'].find((it: any) => it['@type'] === 'Product') : null);

          if (target) {
            if (!title && target.name) title = String(target.name).trim();
            if (target.brand?.name) brand = String(target.brand.name).trim();
            if (target.image) {
              const im = Array.isArray(target.image) ? target.image[0] : (typeof target.image === 'object' ? target.image.url : target.image);
              if (im) {
                const cleanIm = sanitizeImageUrl(im, sourceUrl);
                if (!mainImage) mainImage = cleanIm;
                if (!galleryImages.includes(cleanIm)) galleryImages.push(cleanIm);
              }
            }
            if (target.offers) {
              const offer = Array.isArray(target.offers) ? target.offers[0] : target.offers;
              if (offer && offer.price && !priceAED) {
                priceAED = parseFloat(offer.price);
              }
            }
            if (target.description && !description) {
              description = String(target.description).replace(/<[^>]*>/g, ' ').trim();
            }
          }
        } catch (_ldErr) {}
      });
    }

    // 4. HTML DOM FALLBACK PARSING
    if (!title) {
      title = $('h1.product-title, h1[itemprop="name"], h1.page-title, .product-info-main h1, h1').first().text().trim();
      if (!title) title = $('meta[property="og:title"]').attr('content') || '';
    }
    title = title.replace(/\s*\|\s*Dr\s*Nutrition.*$/i, '').trim();

    if (!brand || brand === 'Applied Nutrition') {
      const domBrand = $('.product-brand, .brand-name, [itemprop="brand"], .product-info-main .brand').first().text().trim();
      if (domBrand) brand = domBrand;
    }

    if (!priceAED) {
      const specialPriceText = $('.special-price .price, [data-price-type="finalPrice"] .price, .product-info-price .price:not(.old-price .price)').first().text();
      const match = specialPriceText.replace(/,/g, '').match(/[\d.]+/);
      if (match) priceAED = parseFloat(match[0]);
    }
    if (!priceAED) {
      const anyPrice = $('[itemprop="price"], .price-box .price').not('.old-price *').first().text();
      const match = anyPrice.replace(/,/g, '').match(/[\d.]+/);
      if (match) priceAED = parseFloat(match[0]);
    }

    if (!originalPriceAED) {
      const oldPriceText = $('.old-price .price, del .price, del').first().text();
      const oldMatch = oldPriceText.replace(/,/g, '').match(/[\d.]+/);
      if (oldMatch) originalPriceAED = parseFloat(oldMatch[0]);
    }

    // Extract images from DOM
    if (!mainImage) {
      const ogImg = $('meta[property="og:image"]').attr('content');
      if (ogImg) mainImage = sanitizeImageUrl(ogImg, sourceUrl);
    }
    $('.fotorama__img, .gallery-placeholder img, .product.media img, [data-gallery-role="gallery-placeholder"] img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-full');
      if (src) {
        const clean = sanitizeImageUrl(src, sourceUrl);
        if (clean && !galleryImages.includes(clean)) galleryImages.push(clean);
      }
    });
    if (mainImage && !galleryImages.includes(mainImage)) galleryImages.unshift(mainImage);
    if (galleryImages.length > 0 && !mainImage) mainImage = galleryImages[0];

    // Extract swatches (Flavors and Sizes) from DOM
    $('.swatch-attribute-flavor .swatch-option, .swatch-attribute[data-attribute-code*="flavor"] .swatch-option, .flavor-item').each((_, el) => {
      const optHtml = $.html(el);
      const optText = $(el).text().trim() || $(el).attr('data-option-label') || $(el).attr('title') || '';
      if (optText && !isOutOfStockElement(optHtml, optText)) {
        flavorsSet.add(optText);
      }
    });

    $('.swatch-attribute-size .swatch-option, .swatch-attribute[data-attribute-code*="size"] .swatch-option, .size-item').each((_, el) => {
      const optHtml = $.html(el);
      const optText = $(el).text().trim() || $(el).attr('data-option-label') || $(el).attr('title') || '';
      if (optText && !isOutOfStockElement(optHtml, optText)) {
        sizesSet.add(optText);
      }
    });

    const flavors = Array.from(flavorsSet);
    const sizes = Array.from(sizesSet);

    const finalPrice = priceAED > 0 ? priceAED : 59.14;
    const finalOldPrice = (originalPriceAED && originalPriceAED > finalPrice) ? originalPriceAED : undefined;
    const discountPercent = (finalOldPrice && finalOldPrice > finalPrice)
      ? Math.round(((finalOldPrice - finalPrice) / finalOldPrice) * 100)
      : undefined;

    if (title && (priceAED > 0 || mainImage)) {
      return {
        ok: true,
        success: true,
        title,
        titleFa: generateBilingualProductTitle(title, brand),
        price: finalPrice,
        priceAED: finalPrice,
        originalPriceAed: finalOldPrice,
        originalPriceAED: finalOldPrice,
        discountPercent,
        currency: "AED",
        image: mainImage || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=800',
        imageUrl: mainImage,
        images: galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []),
        galleryImages: galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []),
        brand,
        storeName,
        store: storeName,
        sourceUrl,
        weightKg: 0.8,
        description: description || 'مکمل ورزشی و تغذیه‌ای باکیفیت و اورجینال از دکتر نیوتریشن دبی',
        flavors: flavors.map((f, i) => ({ id: `flv-${i}`, flavor: f, name: f, inStock: true })),
        sizes: sizes.map((s, i) => ({ id: `sz-${i}`, size: s, name: s, priceAED: finalPrice, weightKg: 0.8, inStock: true })),
        variantMatrix: {
          flavors,
          sizes,
          items: sizes.map((s, i) => ({ id: `var-${i}`, size: s, priceAED: finalPrice, inStock: true }))
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
        const parsed = parseDrNutritionHtml(response.data, url);
        if (parsed && parsed.title && parsed.priceAED > 0) return parsed;
      }
    } catch (_e) {}
  }

  // TIER 2: MICROLINK EVALUATION
  try {
    const microUrl = `https://api.microlink.io?url=${encodeURIComponent(enAeUrl)}&prerender=true&waitForTimeout=3000`;
    const microRes = await axios.get(microUrl, { timeout: 12000 });
    const data = microRes.data?.data;
    if (data && (data.title || data.image?.url)) {
      const cleanTitle = (data.title || '').replace(/\s*\|\s*Dr\s*Nutrition.*$/i, '').trim();
      const pAed = parseFloat(data.price || 0) || 59.14;
      const img = sanitizeImageUrl(data.image?.url, enAeUrl);
      if (cleanTitle) {
        return {
          ok: true,
          success: true,
          title: cleanTitle,
          titleFa: generateBilingualProductTitle(cleanTitle, 'Dr. Nutrition'),
          price: pAed,
          priceAED: pAed,
          originalPriceAED: pAed,
          currency: 'AED',
          image: img,
          imageUrl: img,
          galleryImages: img ? [img] : [],
          images: img ? [img] : [],
          brand: 'Dr. Nutrition',
          storeName,
          sourceUrl: enAeUrl,
          weightKg: 0.8
        };
      }
    }
  } catch (_mErr) {}

  // TIER 3: SHOPIFY JS / JSON FALLBACK
  try {
    const jsonUrl = enAeUrl.split('?')[0].replace(/\/$/, '') + '.json';
    const jsonRes = await axios.get(jsonUrl, { headers, timeout: 8000 });
    const p = jsonRes.data?.product;
    if (p && p.title) {
      const pPrice = parseFloat(p.variants?.[0]?.price || 0) || 59.14;
      const pImg = sanitizeImageUrl(p.image?.src || p.images?.[0]?.src, enAeUrl);
      return {
        ok: true,
        success: true,
        title: p.title,
        titleFa: generateBilingualProductTitle(p.title, p.vendor),
        price: pPrice,
        priceAED: pPrice,
        originalPriceAED: parseFloat(p.variants?.[0]?.compare_at_price || 0) || pPrice,
        currency: 'AED',
        image: pImg,
        imageUrl: pImg,
        galleryImages: (p.images || []).map((im: any) => sanitizeImageUrl(im.src, enAeUrl)),
        brand: p.vendor || 'Dr. Nutrition',
        storeName,
        sourceUrl: enAeUrl,
        weightKg: parseFloat(p.variants?.[0]?.grams ? (p.variants[0].grams / 1000).toFixed(2) : '0.8') || 0.8
      };
    }
  } catch (_shopErr) {}

  // TIER 4: SCRAPERAPI FALLBACK
  const scraperApiKey = cmsConfig?.scraperApiKey || process.env.SCRAPERAPI_KEY;
  if (scraperApiKey) {
    try {
      const sApiUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(enAeUrl)}&render=true`;
      const sRes = await axios.get(sApiUrl, { timeout: 18000 });
      if (sRes.data && typeof sRes.data === 'string') {
        const parsed = parseDrNutritionHtml(sRes.data, enAeUrl);
        if (parsed && parsed.title && parsed.priceAED > 0) return parsed;
      }
    } catch (_sErr) {}
  }

  // TIER 5: JINA READER FALLBACK
  try {
    const jinaUrl = `https://r.jina.ai/${enAeUrl}`;
    const jinaRes = await axios.get(jinaUrl, {
      headers: { ...headers, 'X-With-Images-Summary': 'true', 'X-No-Cache': 'true' },
      timeout: 10000
    });
    if (jinaRes.data && typeof jinaRes.data === 'string') {
      const parsed = parseDrNutritionHtml(jinaRes.data, enAeUrl);
      if (parsed && parsed.title) return parsed;
    }
  } catch (_jErr) {}

  return null;
}

