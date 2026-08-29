import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  isOutOfStockElement,
  sanitizeImageUrl,
  getStandardScraperHeaders,
  generateBilingualProductTitle,
  extractDrNutritionHandle,
  extractPriceNumber,
  isArtificialFallback,
  deduplicateStrings,
  cleanDrNutritionTitle,
  cleanDrNutritionSlugForSearch,
  sanitizeFlavorName,
  extractDrNutritionImageHierarchical,
  isInvalidDrNutritionImage
} from './utils';

export interface ExtractedProduct {
  titleFa: string;
  titleEn: string;
  brand: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  imageUrl: string;
  galleryImages: string[];
  selectedFlavor?: string | null;
  selectedSize?: string | null;
  sizes: string[];
  flavors: string[];
  inStock: boolean;
  variants?: any[];
  description?: string;
}

export interface ScrapedProductResult {
  ok?: boolean;
  success?: boolean;
  title: string;
  titleFa?: string;
  price: number;
  priceAED: number;
  priceAed?: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  originalPrice?: number;
  discountPercent?: number;
  currency: string;
  image: string;
  mainImage?: string;
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
  selectedFlavor?: string | null;
  selectedSize?: string | null;
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
  inStock?: boolean;
}

export const extractRobustProductData = (html: string, sourceUrl: string): ExtractedProduct => {
  const $ = cheerio.load(html);
  let priceAed = 0;
  let originalPriceAed = 0;
  let rawTitle = $('h1.page-title, h1[data-ui-id="page-title-wrapper"], h1.product-title, h1').first().text().trim();
  let brand = $('.product-brand, .brand-name, [itemprop="brand"]').first().text().trim() || 'Dr. Nutrition';
  const galleryImages: string[] = [];
  const flavorsSet = new Set<string>();
  const sizesSet = new Set<string>();
  let description = '';

  // Extract Images using Strict 3-Tier Hierarchy (Tier 1: OpenGraph, Tier 2: JSON-LD, Tier 3: Specific DOM)
  const imageResolution = extractDrNutritionImageHierarchical($, sourceUrl);
  let imageUrl = imageResolution.mainImage;
  imageResolution.galleryImages.forEach(img => {
    if (img && !isInvalidDrNutritionImage(img) && !galleryImages.includes(img)) {
      galleryImages.push(img);
    }
  });

  // Tier 1: Parse __NEXT_DATA__ (for Dr. Nutrition / Next.js SPA pages)
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (nextDataScript) {
    try {
      const nextJson = JSON.parse(nextDataScript);
      const productNode = nextJson?.props?.pageProps?.product || nextJson?.props?.pageProps?.productData || nextJson?.props?.pageProps?.initialData?.product;
      if (productNode) {
        priceAed = Number(productNode.final_price || productNode.special_price || productNode.price_range?.minimum_price?.final_price?.value || productNode.price || 0);
        originalPriceAed = Number(productNode.regular_price || productNode.price_range?.minimum_price?.regular_price?.value || productNode.price || 0);
        if (productNode.name || productNode.title) rawTitle = productNode.name || productNode.title;
        brand = productNode.brand || productNode.brand_name || productNode.manufacturer || brand;
        if (productNode.image?.url || productNode.image) {
          const pImg = sanitizeImageUrl(productNode.image?.url || productNode.image, sourceUrl);
          if (pImg && !isInvalidDrNutritionImage(pImg)) {
            imageUrl = pImg;
            if (!galleryImages.includes(pImg)) galleryImages.unshift(pImg);
          }
        }
        if (Array.isArray(productNode.media_gallery || productNode.images)) {
          (productNode.media_gallery || productNode.images).forEach((m: any) => {
            const u = sanitizeImageUrl(m.url || m.file || m, sourceUrl);
            if (u && !isInvalidDrNutritionImage(u) && !galleryImages.includes(u)) galleryImages.push(u);
          });
        }
        if (productNode.description?.html || productNode.description) {
          description = String(productNode.description?.html || productNode.description || '').replace(/<[^>]*>/g, ' ').trim();
        }

        // Swatches from Next.js
        if (Array.isArray(productNode.configurable_options || productNode.variants)) {
          (productNode.configurable_options || productNode.variants).forEach((opt: any) => {
            const optLabel = String(opt.label || opt.attribute_code || '').toLowerCase();
            if (Array.isArray(opt.values)) {
              opt.values.forEach((val: any) => {
                const valLabel = String(val.label || val.store_label || '').trim();
                if (valLabel) {
                  if (optLabel.includes('flavor') || optLabel.includes('طعم') || optLabel.includes('flavour')) {
                    const cleanFlv = sanitizeFlavorName(valLabel);
                    if (cleanFlv) flavorsSet.add(cleanFlv);
                  } else if (optLabel.includes('size') || optLabel.includes('weight') || optLabel.includes('حجم') || optLabel.includes('serving')) {
                    if (!isArtificialFallback(valLabel)) sizesSet.add(valLabel);
                  }
                }
              });
            }
          });
        }
      }
    } catch (_e) {
      console.warn('NextData parse failed, proceeding to Tier 2');
    }
  }

  // Tier 1.5: Parse Magento text/x-magento-init (if present)
  if (!priceAed || priceAed === 0) {
    $('script[type="text/x-magento-init"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        const priceBox = json['[data-role=priceBox]']?.priceBox?.priceConfig?.prices 
                      || json['#product_addtocart_form']?.priceBox?.priceConfig?.prices
                      || json['*']?.priceBox?.priceConfig?.prices;
        if (priceBox) {
          if (priceBox.finalPrice?.amount) {
            priceAed = parseFloat(String(priceBox.finalPrice.amount)) || priceAed;
          }
          if (priceBox.oldPrice?.amount) {
            originalPriceAed = parseFloat(String(priceBox.oldPrice.amount)) || originalPriceAed;
          }
        }
      } catch (_e) {}
    });
  }

  // Tier 2: Parse JSON-LD Schema
  if (!priceAed || priceAed === 0) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        const target = json['@type'] === 'Product' || json['@type'] === 'IndividualProduct'
          ? json
          : (Array.isArray(json['@graph']) ? json['@graph'].find((it: any) => it['@type'] === 'Product') : null);
        if (target) {
          if (target.name) rawTitle = String(target.name).trim();
          if (target.brand?.name) brand = String(target.brand.name).trim();
          if (target.image) {
            const im = Array.isArray(target.image) ? target.image[0] : (typeof target.image === 'object' ? target.image.url : target.image);
            if (im && !imageUrl) {
              const clean = sanitizeImageUrl(im, sourceUrl);
              if (clean && !isInvalidDrNutritionImage(clean)) imageUrl = clean;
            }
          }
          const offer = Array.isArray(target.offers) ? target.offers[0] : target.offers;
          if (offer && offer.price) {
            priceAed = parseFloat(String(offer.price).replace(/[^\d.]/g, '')) || 0;
          }
        }
      } catch (_e) {}
    });
  }

  // Tier 3: Parse OpenGraph & Meta Price Tags
  if (!priceAed || priceAed === 0) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content') || $('meta[property="og:price:amount"]').attr('content') || $('meta[name="twitter:data1"]').attr('content');
    if (metaPrice) {
      priceAed = parseFloat(metaPrice.replace(/[^\d.]/g, '')) || 0;
    }
  }

  // Tier 4: DOM Selectors (Magento / Custom eCommerce)
  if (!priceAed || priceAed === 0) {
    const activePriceText = $('[data-price-type="finalPrice"] .price, .special-price .price, .product-info-price .price:not(.old-price *), .price-wrapper .price').first().text();
    priceAed = parseFloat(activePriceText.replace(/[^\d.]/g, '')) || 0;

    const oldPriceText = $('[data-price-type="oldPrice"] .price, .old-price .price, del .price').first().text();
    originalPriceAed = parseFloat(oldPriceText.replace(/[^\d.]/g, '')) || 0;
  }

  // Parse Swatches from DOM
  $('.swatch-attribute-flavor .swatch-option, .swatch-attribute[data-attribute-code*="flavor"] .swatch-option, .flavor-item, .swatch-opt [data-attribute-code*="flavor"] .swatch-option').each((_, el) => {
    const optText = $(el).text().trim() || $(el).attr('data-option-label') || $(el).attr('title') || '';
    if (optText && !isOutOfStockElement($.html(el), optText)) {
      const cleanFlv = sanitizeFlavorName(optText);
      if (cleanFlv) flavorsSet.add(cleanFlv);
    }
  });
  $('.swatch-attribute-size .swatch-option, .swatch-attribute[data-attribute-code*="size"] .swatch-option, .size-item, .swatch-opt [data-attribute-code*="size"] .swatch-option').each((_, el) => {
    const optText = $(el).text().trim() || $(el).attr('data-option-label') || $(el).attr('title') || '';
    if (optText && !isOutOfStockElement($.html(el), optText) && !isArtificialFallback(optText)) {
      sizesSet.add(optText);
    }
  });

  const flavors = Array.from(flavorsSet);
  const sizes = Array.from(sizesSet);
  const cleanImage = imageUrl || (galleryImages.length > 0 ? galleryImages[0] : '');
  const titleEn = cleanDrNutritionTitle(rawTitle);

  if (cleanImage && !galleryImages.includes(cleanImage)) {
    galleryImages.unshift(cleanImage);
  }

  const finalPrice = priceAed > 0 ? priceAed : 0;
  const finalOriginal = (originalPriceAed && originalPriceAed > finalPrice) ? originalPriceAed : undefined;
  const discountPercent = finalOriginal && finalPrice > 0
    ? Math.round(((finalOriginal - finalPrice) / finalOriginal) * 100)
    : undefined;

  // Build variants
  const standardizedVariants: any[] = [];
  if (sizes.length > 0 && flavors.length > 0) {
    sizes.forEach((s, sIdx) => {
      flavors.forEach((f, fIdx) => {
        standardizedVariants.push({
          id: `var-${sIdx}-${fIdx}`,
          size: s,
          flavor: f,
          price: finalPrice,
          priceAED: finalPrice,
          priceAed: finalPrice,
          originalPrice: finalOriginal,
          originalPriceAED: finalOriginal,
          originalPriceAed: finalOriginal,
          inStock: true,
          image: cleanImage
        });
      });
    });
  } else if (sizes.length > 0) {
    sizes.forEach((s, sIdx) => {
      standardizedVariants.push({
        id: `var-${sIdx}`,
        size: s,
        price: finalPrice,
        priceAED: finalPrice,
        priceAed: finalPrice,
        originalPrice: finalOriginal,
        originalPriceAED: finalOriginal,
        originalPriceAed: finalOriginal,
        inStock: true,
        image: cleanImage
      });
    });
  } else if (flavors.length > 0) {
    flavors.forEach((f, fIdx) => {
      standardizedVariants.push({
        id: `var-${fIdx}`,
        flavor: f,
        price: finalPrice,
        priceAED: finalPrice,
        priceAed: finalPrice,
        originalPrice: finalOriginal,
        originalPriceAED: finalOriginal,
        originalPriceAed: finalOriginal,
        inStock: true,
        image: cleanImage
      });
    });
  }

  return {
    titleFa: generateBilingualProductTitle(titleEn, brand),
    titleEn: titleEn || 'نامشخص',
    brand: brand || 'Dr. Nutrition',
    priceAed: finalPrice,
    originalPriceAed: finalOriginal,
    discountPercent,
    imageUrl: cleanImage || '',
    galleryImages,
    sizes,
    flavors,
    variants: standardizedVariants,
    description,
    inStock: !html.includes('Out of stock') && !html.includes('ناموجود')
  };
};

export async function drNutritionAdapter(targetUrl: string, cmsConfig?: any, options?: { timeoutMs?: number; userAgent?: string }): Promise<ScrapedProductResult | null> {
  const storeName = "Dr. Nutrition";
  const headers = getStandardScraperHeaders(targetUrl, options?.userAgent);
  const timeout = options?.timeoutMs || 15000;

  // Normalize URL to /en-ae/
  let drUrl = targetUrl.replace(/https?:\/\/(www\.)?drnutrition\.com/i, 'https://www.drnutrition.com');
  let enAeUrl = drUrl;
  if (/\/(ar|en)-[a-z]{2}\//i.test(drUrl)) {
    enAeUrl = drUrl.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
  } else if (!drUrl.includes('/en-ae/')) {
    enAeUrl = drUrl.replace('drnutrition.com/', 'drnutrition.com/en-ae/');
  }

  // TIER 0: DIRECT DR. NUTRITION LIVE API (Bypasses Cloudflare HTML Protection)
  const handle = extractDrNutritionHandle(targetUrl);
  if (handle) {
    const apiHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Locale': 'en',
      'X-Region': 'ae',
      'X-Locale-Region': 'en-ae',
      'Accept-Language': 'en',
      'User-Agent': options?.userAgent || headers['User-Agent']
    };

    // 0A. Check Combos / Stacks API endpoint
    try {
      const comboUrl = `https://data.drnutrition.com/api/v1/combos/${encodeURIComponent(handle)}`;
      const comboRes = await axios.get(comboUrl, {
        headers: apiHeaders,
        timeout: Math.min(timeout, 8000),
        validateStatus: (s) => s < 400
      });

      const combo = comboRes.data?.data?.combo;
      if (combo) {
        const priceAed = Number(combo.selling_price?.amount || 0);
        if (priceAed > 0) {
          const rawTitle = String(combo.name || '').trim();
          const titleEn = rawTitle;
          const origAed = Number(combo.price?.amount || 0);
          const originalPriceAed = origAed > priceAed ? origAed : undefined;
          const discountPercent = originalPriceAed
            ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100)
            : undefined;

          let mainImg = sanitizeImageUrl(combo.base_image || combo.thumbnail_url, targetUrl);
          if (isInvalidDrNutritionImage(mainImg)) mainImg = '';

          const galleryImages: string[] = [];
          if (mainImg) galleryImages.push(mainImg);

          const variantsList: any[] = [];
          const flavorsList: string[] = [];
          const sizesList: string[] = [];

          if (Array.isArray(combo.products)) {
            combo.products.forEach((pItem: any, pIdx: number) => {
              const defOpt = (Array.isArray(pItem.options) ? pItem.options.find((o: any) => o.is_default) : null) || pItem.options?.[0];
              const optLabel = defOpt?.label || pItem.product?.name || `گزینه ${pIdx + 1}`;
              const optImg = defOpt?.image ? sanitizeImageUrl(defOpt.image, targetUrl) : undefined;
              if (optImg && !isInvalidDrNutritionImage(optImg) && !galleryImages.includes(optImg)) {
                galleryImages.push(optImg);
              }
              if (optLabel) {
                const lowerL = optLabel.toLowerCase();
                if (lowerL.includes('kg') || lowerL.includes('gm') || lowerL.includes('g') || lowerL.includes('lb') || lowerL.includes('l ')) {
                  if (!sizesList.includes(optLabel)) sizesList.push(optLabel);
                } else {
                  if (!flavorsList.includes(optLabel)) flavorsList.push(optLabel);
                }
              }
              variantsList.push({
                id: String(defOpt?.id || pItem.id || `combo-v-${pIdx}`),
                title: optLabel,
                price: priceAed,
                priceAed,
                priceAED: priceAed,
                image: optImg,
                inStock: true
              });
            });
          }

          if (!mainImg && galleryImages.length > 0) mainImg = galleryImages[0];

          const brand = combo.brand?.name || 'Dr. Nutrition';
          const titleFa = generateBilingualProductTitle(titleEn, brand);

          return {
            ok: true,
            success: true,
            title: titleEn,
            titleFa,
            brand,
            storeName,
            sourceUrl: targetUrl,
            priceAed,
            priceAED: priceAed,
            price: priceAed,
            originalPriceAed,
            originalPriceAED: originalPriceAed,
            originalPrice: originalPriceAed,
            discountPercent,
            currency: 'AED',
            mainImage: mainImg,
            image: mainImg,
            imageUrl: mainImg,
            galleryImages,
            images: galleryImages,
            weightKg: 1.2,
            flavors: flavorsList,
            sizes: sizesList,
            variants: variantsList,
            variantMatrix: {
              flavors: flavorsList,
              sizes: sizesList,
              items: variantsList
            }
          };
        }
      }
    } catch (_comboErr: any) {}

    // 0B. Check Individual Product API endpoint
    try {
      const prodUrl = `https://data.drnutrition.com/api/v1/products/${encodeURIComponent(handle)}`;
      const prodRes = await axios.get(prodUrl, {
        headers: apiHeaders,
        timeout: Math.min(timeout, 8000),
        validateStatus: (s) => s < 400
      });

      const prod = prodRes.data?.data;
      if (prod) {
        const priceAed = Number(prod.selling_price || prod.price || 0);
        if (priceAed > 0) {
          const rawTitle = String(prod.name || prod.title || '').trim();
          const titleEn = cleanDrNutritionTitle(rawTitle);
          const origAed = Number(prod.price || 0);
          const originalPriceAed = origAed > priceAed ? origAed : undefined;
          const discountPercent = prod.discount || (originalPriceAed ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100) : undefined);

          let mainImg = sanitizeImageUrl(prod.base_image || prod.image, targetUrl);
          if (isInvalidDrNutritionImage(mainImg)) mainImg = '';

          const galleryImages: string[] = [];
          if (mainImg) galleryImages.push(mainImg);
          if (Array.isArray(prod.additional_images)) {
            prod.additional_images.forEach((img: any) => {
              const s = sanitizeImageUrl(img, targetUrl);
              if (s && !isInvalidDrNutritionImage(s) && !galleryImages.includes(s)) {
                galleryImages.push(s);
              }
            });
          }
          if (!mainImg && galleryImages.length > 0) mainImg = galleryImages[0];

          let weightKg = 0.8;
          if (prod.weight) {
            const wStr = String(prod.weight).toLowerCase();
            const num = parseFloat(wStr.replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 0) {
              if (wStr.includes('kg') || wStr.includes('کیلوگرم')) weightKg = num;
              else if (wStr.includes('g') || wStr.includes('گرم') || wStr.includes('gm')) weightKg = Math.round((num / 1000) * 100) / 100;
              else if (wStr.includes('lb')) weightKg = Math.round(num * 0.453592 * 100) / 100;
            }
          }

          const brand = prod.brand || prod.brand_details?.name || 'Dr. Nutrition';
          const titleFa = generateBilingualProductTitle(titleEn, brand);

          return {
            ok: true,
            success: true,
            title: titleEn,
            titleFa,
            brand,
            storeName,
            sourceUrl: targetUrl,
            priceAed,
            priceAED: priceAed,
            price: priceAed,
            originalPriceAed,
            originalPriceAED: originalPriceAed,
            originalPrice: originalPriceAed,
            discountPercent,
            currency: 'AED',
            mainImage: mainImg,
            image: mainImg,
            imageUrl: mainImg,
            galleryImages,
            images: galleryImages,
            weightKg,
            flavors: [],
            sizes: [],
            variants: [],
            variantMatrix: {
              flavors: [],
              sizes: [],
              items: []
            }
          };
        }
      }
    } catch (_prodErr: any) {}

    // 0C. Check Search API endpoint
    try {
      const searchQuery = cleanDrNutritionSlugForSearch(handle);
      if (searchQuery) {
        const searchApiUrl = `https://data.drnutrition.com/api/v1/search?q=${encodeURIComponent(searchQuery)}`;
        const apiRes = await axios.get(searchApiUrl, {
          headers: apiHeaders,
          timeout: Math.min(timeout, 8000),
          validateStatus: (s) => s < 400
        });

        if (apiRes.data && apiRes.data.data?.products && Array.isArray(apiRes.data.data.products) && apiRes.data.data.products.length > 0) {
          const products = apiRes.data.data.products;
          let matched = products.find((p: any) => p.slug === handle || p.url?.endsWith(handle));
          if (!matched) {
            matched = products[0];
          }

          const priceAed = Number(matched.selling_price || matched.price || 0);
          if (priceAed > 0) {
            const rawTitle = String(matched.title || '').trim();
            const titleEn = cleanDrNutritionTitle(rawTitle);
            const rawOrig = Number(matched.price || 0);
            const originalPriceAed = rawOrig > priceAed ? rawOrig : undefined;
            const discountPercent = matched.discount || (originalPriceAed ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100) : undefined);

            let mainImg = sanitizeImageUrl(matched.original_image || matched.image, targetUrl);
            if (isInvalidDrNutritionImage(mainImg)) mainImg = '';

            const galleryImages: string[] = [];
            if (mainImg) galleryImages.push(mainImg);
            if (Array.isArray(matched.additional_images)) {
              matched.additional_images.forEach((img: any) => {
                const s = sanitizeImageUrl(img, targetUrl);
                if (s && !isInvalidDrNutritionImage(s) && !galleryImages.includes(s)) {
                  galleryImages.push(s);
                }
              });
            }
            if (!mainImg && galleryImages.length > 0) mainImg = galleryImages[0];

            let weightKg = 0.8;
            if (matched.weight) {
              const wStr = String(matched.weight).toLowerCase();
              const num = parseFloat(wStr.replace(/[^0-9.]/g, ''));
              if (!isNaN(num) && num > 0) {
                if (wStr.includes('kg') || wStr.includes('کیلوگرم')) weightKg = num;
                else if (wStr.includes('g') || wStr.includes('گرم') || wStr.includes('gm')) weightKg = Math.round((num / 1000) * 100) / 100;
                else if (wStr.includes('lb')) weightKg = Math.round(num * 0.453592 * 100) / 100;
              }
            }

            const flavorsList: string[] = [];
            const sizesList: string[] = [];
            const titleParts = rawTitle.split(',').map((p: string) => p.trim()).filter(Boolean);
            if (titleParts.length >= 2) {
              for (let i = 1; i < titleParts.length; i++) {
                const part = titleParts[i];
                const cleanPart = cleanDrNutritionTitle(part);
                if (!cleanPart || isArtificialFallback(cleanPart)) continue;
                const lowerP = cleanPart.toLowerCase();
                const isSize = lowerP.includes('kg') || lowerP.includes('gm') || lowerP.includes('g') || 
                               lowerP.includes('lb') || lowerP.includes('serving') || lowerP.includes('capsule') || lowerP.includes('tablet');
                if (isSize) {
                  if (!sizesList.includes(cleanPart)) sizesList.push(cleanPart);
                } else {
                  const cleanFlv = sanitizeFlavorName(cleanPart);
                  if (cleanFlv && !flavorsList.includes(cleanFlv)) flavorsList.push(cleanFlv);
                }
              }
            }

            const cleanFlavors = deduplicateStrings(flavorsList);
            const cleanSizes = deduplicateStrings(sizesList);
            const brand = matched.category_one_name || 'Dr. Nutrition';
            const titleFa = generateBilingualProductTitle(titleEn, brand);

            const structuredVariants: any[] = [{
              id: String(matched.product_option_id || matched.product_id || 'v-0'),
              title: titleEn,
              price: priceAed,
              priceAed,
              priceAED: priceAed,
              image: mainImg || undefined,
              inStock: matched.in_stock !== false,
              flavor: cleanFlavors.length > 0 ? cleanFlavors[0] : undefined,
              size: cleanSizes.length > 0 ? cleanSizes[0] : undefined
            }];

            return {
              ok: true,
              success: true,
              title: titleEn,
              titleFa,
              brand,
              storeName,
              sourceUrl: targetUrl,
              priceAed,
              priceAED: priceAed,
              price: priceAed,
              originalPriceAed,
              originalPriceAED: originalPriceAed,
              originalPrice: originalPriceAed,
              discountPercent,
              currency: 'AED',
              mainImage: mainImg,
              image: mainImg,
              imageUrl: mainImg,
              galleryImages,
              images: galleryImages,
              weightKg,
              flavors: cleanFlavors,
              sizes: cleanSizes,
              variants: structuredVariants,
              variantMatrix: {
                flavors: cleanFlavors,
                sizes: cleanSizes,
                items: structuredVariants
              }
            };
          }
        }
      }
    } catch (_searchErr: any) {}

    // 0D. Jina Reader HTML/Markdown proxy fallback
    try {
      const jinaUrl = `https://r.jina.ai/${targetUrl}`;
      const jinaRes = await axios.get(jinaUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: Math.min(timeout, 10000)
      });
      const md = jinaRes.data;
      if (typeof md === 'string' && md.length > 100) {
        const cleanMd = md.replace(/(?:free\s+(?:delivery|shipping)\s+on\s+orders?\s+over\s+aed\s*\d+)/gi, '');
        const priceMatches = Array.from(cleanMd.matchAll(/AED\s*([0-9]+(?:\.[0-9]{1,2})?)/gi));
        if (priceMatches.length > 0) {
          const sellingPrice = parseFloat(priceMatches[0][1]);
          let origPrice: number | undefined = undefined;
          if (priceMatches.length >= 2) {
            origPrice = parseFloat(priceMatches[1][1]);
          }
          if (sellingPrice > 0) {
            const titleMatch = md.match(/^#\s+(.+)$/m) || md.match(/Title:\s*(.+)$/m);
            const rawTitle = titleMatch ? titleMatch[1].trim() : handle.replace(/-/g, ' ');
            const titleEn = cleanDrNutritionTitle(rawTitle);

            const imgMatches = Array.from(md.matchAll(/https%3A%2F%2Fmedia\.drnutrition\.com%2Fmedia%2F[^&"'\s)]+|https:\/\/media\.drnutrition\.com\/media\/[^"'\s)]+/gi));
            let mainImg = '';
            const galleryImages: string[] = [];
            for (const im of imgMatches) {
              const decoded = decodeURIComponent(im[0]);
              if (!isInvalidDrNutritionImage(decoded) && !galleryImages.includes(decoded)) {
                galleryImages.push(decoded);
                if (!mainImg) mainImg = decoded;
              }
            }

            const discountMatch = md.match(/(\d+)%\s*OFF/i);
            const discountPercent = discountMatch ? parseInt(discountMatch[1], 10) : undefined;

            return {
              ok: true,
              success: true,
              title: titleEn,
              titleFa: generateBilingualProductTitle(titleEn, 'Dr. Nutrition'),
              brand: 'Dr. Nutrition',
              storeName,
              sourceUrl: targetUrl,
              priceAed: sellingPrice,
              priceAED: sellingPrice,
              price: sellingPrice,
              originalPriceAed: origPrice && origPrice > sellingPrice ? origPrice : undefined,
              originalPriceAED: origPrice && origPrice > sellingPrice ? origPrice : undefined,
              originalPrice: origPrice && origPrice > sellingPrice ? origPrice : undefined,
              discountPercent,
              currency: 'AED',
              mainImage: mainImg,
              image: mainImg,
              imageUrl: mainImg,
              galleryImages,
              images: galleryImages,
              weightKg: 1.0,
              flavors: [],
              sizes: [],
              variants: [],
              variantMatrix: {
                flavors: [],
                sizes: [],
                items: []
              }
            };
          }
        }
      }
    } catch (_jinaErr: any) {}
  }

  // TIER 1: DIRECT PRODUCT JSON ENDPOINT (/products/[handle].json)
  if (handle) {
    const jsonCandidates = [
      `https://www.drnutrition.com/en-ae/products/${handle}.json`,
      `https://www.drnutrition.com/products/${handle}.json`,
      `https://www.drnutrition.com/en-ae/product/${handle}.json`
    ];

    for (const jsonUrl of jsonCandidates) {
      try {
        const jsonRes = await axios.get(jsonUrl, {
          headers: {
            ...headers,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-AE,en;q=0.9'
          },
          timeout: Math.min(timeout, 8000),
          validateStatus: (s) => s < 400
        });

        if (jsonRes.data && (jsonRes.data.product || jsonRes.data.title)) {
          const product = jsonRes.data.product || jsonRes.data;
          const rawTitle = String(product.title || product.name || '').trim();
          const titleEn = cleanDrNutritionTitle(rawTitle);
          const brand = String(product.vendor || product.brand || 'Dr. Nutrition').trim();
          const rawVariants = Array.isArray(product.variants) ? product.variants : [];
          const v0 = rawVariants[0] || {};

          let rawPrice = v0.price ?? product.price;
          let rawComparePrice = v0.compare_at_price ?? product.compare_at_price;

          let priceAed = extractPriceNumber(rawPrice);
          if (priceAed > 1000 || (!String(rawPrice).includes('.') && priceAed >= 1000)) priceAed = priceAed / 100;

          let originalPriceAed = rawComparePrice ? extractPriceNumber(rawComparePrice) : 0;
          if (originalPriceAed > 1000 || (!String(rawComparePrice).includes('.') && originalPriceAed >= 1000)) originalPriceAed = originalPriceAed / 100;

          // Mathematical Invariant
          if (priceAed > 0 && originalPriceAed > 0) {
            const minP = Math.min(priceAed, originalPriceAed);
            const maxP = Math.max(priceAed, originalPriceAed);
            priceAed = minP;
            originalPriceAed = maxP > minP ? maxP : 0;
          }

          if (titleEn && priceAed > 0) {
            const galleryImages: string[] = [];
            if (Array.isArray(product.images)) {
              product.images.forEach((img: any) => {
                const src = typeof img === 'string' ? img : (img?.src || img?.url);
                if (src) {
                  const s = sanitizeImageUrl(src, targetUrl);
                  if (s && !isInvalidDrNutritionImage(s) && !galleryImages.includes(s)) galleryImages.push(s);
                }
              });
            }

            let rawImg = product.image?.src || product.image || (galleryImages.length > 0 ? galleryImages[0] : '');
            if (typeof rawImg === 'object' && rawImg?.src) rawImg = rawImg.src;
            const mainImg = sanitizeImageUrl(String(rawImg || (galleryImages[0] || '')), targetUrl);
            if (mainImg && !isInvalidDrNutritionImage(mainImg) && !galleryImages.includes(mainImg)) galleryImages.unshift(mainImg);

            const flavorsList: string[] = [];
            const sizesList: string[] = [];
            const structuredVariants: any[] = [];

            if (Array.isArray(product.options)) {
              product.options.forEach((opt: any) => {
                const optName = String(opt.name || '').toLowerCase();
                const values = Array.isArray(opt.values) ? opt.values : [];
                values.forEach((val: any) => {
                  const valStr = String(val || '').trim();
                  if (optName.includes('flavor') || optName.includes('طعم') || optName.includes('flavour')) {
                    const cleanFlv = sanitizeFlavorName(valStr);
                    if (cleanFlv && !flavorsList.includes(cleanFlv)) flavorsList.push(cleanFlv);
                  } else if (optName.includes('size') || optName.includes('weight') || optName.includes('حجم') || optName.includes('serving')) {
                    if (valStr && !isArtificialFallback(valStr) && !sizesList.includes(valStr)) sizesList.push(valStr);
                  }
                });
              });
            }

            if (rawVariants.length > 0) {
              rawVariants.forEach((v: any, vIdx: number) => {
                let vPrice = priceAed;
                if (v.price) {
                  let vp = extractPriceNumber(v.price);
                  if (vp > 1000 || (!String(v.price).includes('.') && vp >= 1000)) vp = vp / 100;
                  if (vp > 0) vPrice = vp;
                }
                const rawVTitle = String(v.title || v.option1 || '').trim();
                const vImg = v.featured_image?.src ? sanitizeImageUrl(v.featured_image.src, targetUrl) : undefined;

                if (rawVTitle && !isArtificialFallback(rawVTitle)) {
                  const isSize = rawVTitle.toLowerCase().includes('kg') || rawVTitle.toLowerCase().includes('g') || rawVTitle.toLowerCase().includes('lb') || rawVTitle.toLowerCase().includes('serving') || rawVTitle.toLowerCase().includes('عددی');
                  if (isSize) {
                    if (!sizesList.includes(rawVTitle)) sizesList.push(rawVTitle);
                  } else {
                    const cleanFlv = sanitizeFlavorName(rawVTitle);
                    if (cleanFlv && !flavorsList.includes(cleanFlv)) flavorsList.push(cleanFlv);
                  }
                  structuredVariants.push({
                    id: String(v.id || `var-${vIdx}`),
                    title: rawVTitle,
                    price: vPrice,
                    priceAed: vPrice,
                    priceAED: vPrice,
                    image: vImg && !isInvalidDrNutritionImage(vImg) ? vImg : undefined,
                    inStock: v.available !== false
                  });
                }
              });
            }

            const cleanFlavors = deduplicateStrings(flavorsList);
            const cleanSizes = deduplicateStrings(sizesList);
            const titleFa = generateBilingualProductTitle(titleEn, brand);
            const finalOriginalPrice = originalPriceAed > priceAed ? originalPriceAed : undefined;
            const discountPercent = finalOriginalPrice ? Math.round(((finalOriginalPrice - priceAed) / finalOriginalPrice) * 100) : undefined;

            return {
              ok: true,
              success: true,
              title: titleEn,
              titleFa,
              brand,
              storeName,
              sourceUrl: targetUrl,
              priceAed,
              priceAED: priceAed,
              price: priceAed,
              originalPriceAed: finalOriginalPrice,
              originalPriceAED: finalOriginalPrice,
              originalPrice: finalOriginalPrice,
              discountPercent,
              currency: 'AED',
              mainImage: mainImg,
              image: mainImg,
              imageUrl: mainImg,
              galleryImages,
              images: galleryImages,
              weightKg: 0.8,
              flavors: cleanFlavors,
              sizes: cleanSizes,
              variants: structuredVariants,
              variantMatrix: {
                flavors: cleanFlavors,
                sizes: cleanSizes,
                items: structuredVariants
              },
              description: product.body_html ? String(product.body_html).replace(/<[^>]*>/g, ' ').trim() : undefined
            };
          }
        }
      } catch (_jsonErr) {}
    }
  }

  const urlCandidates = Array.from(new Set([enAeUrl, drUrl, targetUrl]));

  for (const url of urlCandidates) {
    try {
      const response = await axios.get(url, { headers, timeout });
      if (response.data && typeof response.data === 'string') {
        const robust = extractRobustProductData(response.data, url);
        if (robust && robust.titleEn && robust.priceAed > 0) {
          return {
            ok: true,
            success: true,
            title: robust.titleEn,
            titleFa: robust.titleFa,
            brand: robust.brand,
            storeName,
            sourceUrl: url,
            priceAed: robust.priceAed,
            priceAED: robust.priceAed,
            price: robust.priceAed,
            originalPriceAed: robust.originalPriceAed,
            originalPriceAED: robust.originalPriceAed,
            originalPrice: robust.originalPriceAed,
            discountPercent: robust.discountPercent,
            currency: 'AED',
            mainImage: robust.imageUrl,
            image: robust.imageUrl,
            imageUrl: robust.imageUrl,
            galleryImages: robust.galleryImages,
            images: robust.galleryImages,
            weightKg: 0.8,
            flavors: robust.flavors,
            sizes: robust.sizes,
            variants: robust.variants || [],
            variantMatrix: {
              flavors: robust.flavors,
              sizes: robust.sizes,
              items: robust.variants || []
            },
            description: robust.description
          };
        }
      }
    } catch (_e) {}
  }

  // Jina Reader Fallback
  try {
    const jinaUrl = `https://r.jina.ai/${enAeUrl}`;
    const jinaRes = await axios.get(jinaUrl, {
      headers: { ...headers, 'Accept': 'text/plain, text/markdown', 'X-With-Images-Summary': 'true' },
      timeout: 12000
    });
    if (jinaRes.data && typeof jinaRes.data === 'string') {
      const md = jinaRes.data;
      let title = '';
      let price = 0;
      let originalPrice: number | undefined;

      const h1 = md.match(/^#\s+([^\n]+)/m);
      if (h1) title = h1[1].replace(/\|\s*Dr\s*Nutrition.*/i, '').trim();

      const priceMatches = Array.from(md.matchAll(/AED\s*([\d,]+\.?\d*)/gi))
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(p => !isNaN(p) && p > 0 && p < 50000);

      if (priceMatches.length > 0) {
        price = Math.min(...priceMatches);
        const max = Math.max(...priceMatches);
        if (max > price) originalPrice = max;
      }

      const imgMatch = md.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
      const img = imgMatch ? sanitizeImageUrl(imgMatch[1], enAeUrl) : '';

      if (title && price > 0) {
        return {
          ok: true,
          success: true,
          title,
          titleFa: generateBilingualProductTitle(title, 'Dr. Nutrition'),
          brand: 'Dr. Nutrition',
          storeName,
          sourceUrl: targetUrl,
          priceAed: price,
          priceAED: price,
          price,
          originalPriceAed: originalPrice,
          originalPriceAED: originalPrice,
          originalPrice,
          discountPercent: originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined,
          currency: 'AED',
          mainImage: img,
          image: img,
          imageUrl: img,
          galleryImages: img ? [img] : [],
          images: img ? [img] : [],
          weightKg: 0.8
        };
      }
    }
  } catch (_jErr) {}

  return null;
}
