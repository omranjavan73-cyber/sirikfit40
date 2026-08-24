import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  sanitizeImageUrl,
  getStandardScraperHeaders,
  extractPriceNumber,
  deduplicateStrings,
  extractEmbeddedJsonData
} from './utils';

export async function scrapeDrNutrition(url: string) {
  const cleanUrl = url.trim();
  const headers = getStandardScraperHeaders(cleanUrl);

  // Normalize URL to /en-ae/
  let enAeUrl = cleanUrl.replace(/https?:\/\/(www\.)?drnutrition\.com/i, 'https://www.drnutrition.com');
  if (/\/(ar|en)-[a-z]{2}\//i.test(enAeUrl)) {
    enAeUrl = enAeUrl.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
  } else if (!enAeUrl.includes('/en-ae/')) {
    enAeUrl = enAeUrl.replace('drnutrition.com/', 'drnutrition.com/en-ae/');
  }

  const res = await axios.get(enAeUrl, { headers, timeout: 15000 });
  const html = res.data;
  if (!html || typeof html !== 'string') {
    return { success: false, error: 'Empty response from Dr. Nutrition' };
  }

  const $ = cheerio.load(html);
  const { nextData, jsonLd } = extractEmbeddedJsonData($);

  let title = '';
  let brand = 'Dr. Nutrition';
  let imageUrl = '';
  const galleryImages: string[] = [];
  let priceAED = 0;
  let originalPriceAED = 0;
  const flavorsList: string[] = [];
  const sizesList: string[] = [];

  // 1. Tier 1: Next.js __NEXT_DATA__
  if (nextData) {
    const productNode = nextData?.props?.pageProps?.product || nextData?.props?.pageProps?.productData || nextData?.props?.pageProps?.initialData?.product;
    if (productNode) {
      title = productNode.name || productNode.title || '';
      brand = productNode.brand || productNode.brand_name || productNode.manufacturer || brand;
      priceAED = extractPriceNumber(productNode.final_price || productNode.special_price || productNode.price_range?.minimum_price?.final_price?.value || productNode.price);
      originalPriceAED = extractPriceNumber(productNode.regular_price || productNode.price_range?.minimum_price?.regular_price?.value || productNode.price);
      if (productNode.image?.url || productNode.image) {
        imageUrl = sanitizeImageUrl(productNode.image?.url || productNode.image, enAeUrl);
      }
      if (Array.isArray(productNode.media_gallery || productNode.images)) {
        (productNode.media_gallery || productNode.images).forEach((m: any) => {
          const u = sanitizeImageUrl(m.url || m.file || m, enAeUrl);
          if (u && !galleryImages.includes(u)) galleryImages.push(u);
        });
      }
      if (Array.isArray(productNode.configurable_options || productNode.variants)) {
        (productNode.configurable_options || productNode.variants).forEach((opt: any) => {
          const optLabel = String(opt.label || opt.attribute_code || '').toLowerCase();
          if (Array.isArray(opt.values)) {
            opt.values.forEach((val: any) => {
              const valLabel = String(val.label || val.store_label || '').trim();
              if (valLabel) {
                if (optLabel.includes('flavor') || optLabel.includes('طعم')) flavorsList.push(valLabel);
                else if (optLabel.includes('size') || optLabel.includes('weight') || optLabel.includes('حجم')) sizesList.push(valLabel);
              }
            });
          }
        });
      }
    }
  }

  // 2. Tier 2: JSON-LD Schema
  if (!priceAED && jsonLd && jsonLd.length > 0) {
    for (const item of jsonLd) {
      if (item && (item['@type'] === 'Product' || item['@type'] === 'IndividualProduct' || item.offers)) {
        if (!title && item.name) title = String(item.name).trim();
        if (item.brand?.name) brand = String(item.brand.name).trim();
        if (!imageUrl && item.image) {
          const img = Array.isArray(item.image) ? item.image[0] : (typeof item.image === 'object' ? item.image.url : item.image);
          imageUrl = sanitizeImageUrl(img, enAeUrl);
        }
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        if (offer && offer.price) {
          priceAED = extractPriceNumber(offer.price);
        }
      }
    }
  }

  // 3. Tier 3: Meta tags
  if (!title) {
    title = $('meta[property="og:title"]').attr('content') || $('h1.product-title, h1[itemprop="name"], h1.page-title, h1').first().text().trim();
    title = title.replace(/\s*\|\s*Dr\s*Nutrition.*$/i, '').trim();
  }
  if (!imageUrl) {
    const metaImg = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
    imageUrl = sanitizeImageUrl(metaImg || '', enAeUrl);
  }
  if (!priceAED) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content') || $('meta[name="twitter:data1"]').attr('content');
    priceAED = extractPriceNumber(metaPrice);
  }

  // 4. Tier 4: DOM Fallback
  if (!imageUrl) {
    const domImg = $('.gallery-placeholder img, [itemprop="image"], .fotorama__img, .product-image-photo').first().attr('src');
    imageUrl = sanitizeImageUrl(domImg || '', enAeUrl);
  }
  if (!priceAED) {
    const priceText = $('.special-price .price, .product-info-price .special-price, .price-wrapper[data-price-type="finalPrice"] .price, .price').not('.old-price *').first().text();
    priceAED = extractPriceNumber(priceText);
  }
  if (!originalPriceAED) {
    const oldPriceText = $('.old-price .price, del, [data-price-type="oldPrice"] .price').first().text();
    originalPriceAED = extractPriceNumber(oldPriceText);
  }

  const cleanFlavors = deduplicateStrings(flavorsList);
  const cleanSizes = deduplicateStrings(sizesList);

  if (!priceAED || priceAED <= 0) {
    return {
      success: false,
      error: 'امکان استخراج قیمت زنده از این لینک وجود ندارد.'
    };
  }

  return {
    success: true,
    title: title || 'محصول دکتر نیوتریشن',
    brand,
    store: 'Dr. Nutrition',
    sourceUrl: cleanUrl,
    imageUrl: imageUrl || '',
    galleryImages: galleryImages.filter(Boolean),
    priceAED,
    originalPriceAED: originalPriceAED > priceAED ? originalPriceAED : undefined,
    weightKg: 0.8,
    flavors: cleanFlavors,
    sizes: cleanSizes,
    inStock: !html.includes('Out of stock') && !html.includes('ناموجود')
  };
}

