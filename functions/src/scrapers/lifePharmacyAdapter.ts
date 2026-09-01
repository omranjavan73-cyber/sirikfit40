import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  sanitizeImageUrl,
  getStandardScraperHeaders,
  generateBilingualProductTitle,
  extractPriceNumber,
  deduplicateStrings,
  isArtificialFallback
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

          const rawFlavors: string[] = [];
          const rawSizes: string[] = [];
          const variantsList: any[] = [];

          if (Array.isArray(p.variants || p.options)) {
            const arr = p.variants || p.options;
            arr.forEach((v: any, idx: number) => {
              const sz = v.size || v.weight || v.option1 || '';
              const flv = v.flavor || v.option2 || '';
              if (sz && !isArtificialFallback(sz)) rawSizes.push(String(sz));
              if (flv && !isArtificialFallback(flv)) rawFlavors.push(String(flv));
              const vPrice = extractPriceNumber(v.price || v.offer_price || priceAED);
              const vOrig = extractPriceNumber(v.regular_price || origPriceAED);
              variantsList.push({
                id: `var-${v.id || idx}`,
                size: sz || undefined,
                flavor: flv || undefined,
                price: vPrice,
                priceAED: vPrice,
                priceAed: vPrice,
                originalPrice: vOrig > vPrice ? vOrig : undefined,
                originalPriceAED: vOrig > vPrice ? vOrig : undefined,
                originalPriceAed: vOrig > vPrice ? vOrig : undefined,
                inStock: v.in_stock !== false && v.is_available !== false,
                image: sanitizeImageUrl(v.image || mainImage, targetUrl)
              });
            });
          }

          const flavors = deduplicateStrings(rawFlavors);
          const sizes = deduplicateStrings(rawSizes);
          const selectedFlavor = flavors.length > 0 ? flavors[0] : null;
          const selectedSize = sizes.length > 0 ? sizes[0] : null;

          const validVariants = variantsList.filter(v => {
            const hasFlavor = v.flavor && !isArtificialFallback(v.flavor);
            const hasSize = v.size && !isArtificialFallback(v.size);
            return hasFlavor || hasSize;
          });

          if (title && priceAED > 0) {
            return {
              ok: true,
              success: true,
              title,
              titleFa: generateBilingualProductTitle(title, brand),
              price: priceAED,
              priceAED: priceAED,
              originalPriceAed: origPriceAED > priceAED ? origPriceAED : undefined,
              originalPriceAED: origPriceAED > priceAED ? origPriceAED : undefined,
              currency: "AED",
              image: mainImage || '',
              imageUrl: mainImage || '',
              images: galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []),
              galleryImages: galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []),
              brand,
              storeName,
              store: storeName,
              sourceUrl: targetUrl,
              weightKg: 0.5,
              description: p.description ? p.description.replace(/<[^>]*>/g, ' ').trim() : 'مکمل و اقلام دارویی اورجینال از لایف فارمسی دبی',
              selectedFlavor,
              selectedSize,
              flavors: flavors,
              sizes: sizes,
              variants: validVariants,
              variantMatrix: {
                flavors,
                sizes,
                items: validVariants
              }
            };
          }
        }
      }

      // 2. TIER 2: JSON-LD EXTRACTION
      let ldProduct: any = null;
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const content = $(el).html();
          if (!content) return;
          const ld = JSON.parse(content);
          const items = Array.isArray(ld) ? ld : (ld['@graph'] ? ld['@graph'] : [ld]);
          for (const item of items) {
            if (item && (item['@type'] === 'Product' || item.name)) {
              const ldTitle = String(item.name || item.headline || '')
                .replace(/\s*\|\s*Life\s*Pharmacy.*$/i, '')
                .trim();
              const offerPrice = item.offers?.price ?? item.offers?.lowPrice ?? item.offers?.highPrice;
              const ldPrice = extractPriceNumber(offerPrice);
              const ldBrand = item.brand?.name || item.brand || 'Life Pharmacy';
              const rawImg = Array.isArray(item.image) ? item.image[0] : (item.image?.url || item.image);
              const ldImg = sanitizeImageUrl(rawImg || '', targetUrl);

              if (ldTitle && ldPrice > 0) {
                ldProduct = {
                  title: ldTitle,
                  brand: ldBrand,
                  price: ldPrice,
                  image: ldImg
                };
                break;
              }
            }
          }
        } catch (_e) {}
      });

      if (ldProduct) {
        return {
          ok: true,
          success: true,
          title: ldProduct.title,
          titleFa: generateBilingualProductTitle(ldProduct.title, ldProduct.brand),
          price: ldProduct.price,
          priceAED: ldProduct.price,
          originalPriceAED: ldProduct.price,
          currency: "AED",
          image: ldProduct.image || '',
          imageUrl: ldProduct.image || '',
          galleryImages: ldProduct.image ? [ldProduct.image] : [],
          images: ldProduct.image ? [ldProduct.image] : [],
          brand: ldProduct.brand,
          storeName,
          store: storeName,
          sourceUrl: targetUrl,
          weightKg: 0.5
        };
      }

      // 3. TIER 3: HTML FALLBACK (h1, og:title, meta tags)
      let rawTitle = $('h1.product-title, h1[itemprop="name"], h1').first().text().trim() || 
                     $('meta[property="og:title"]').attr('content') || 
                     $('meta[name="twitter:title"]').attr('content') || 
                     '';
      let title = rawTitle.replace(/\s*\|\s*Life\s*Pharmacy.*$/i, '').trim();
      const brand = $('[itemprop="brand"], .product-brand').first().text().trim() || 'Life Pharmacy';
      const mainImage = sanitizeImageUrl($('meta[property="og:image"]').attr('content') || '', targetUrl);
      const priceText = $('.price, [data-price], .offer-price, .special-price').first().text();
      const priceAED = extractPriceNumber(priceText);

      if (title && priceAED > 0) {
        return {
          ok: true,
          success: true,
          title,
          titleFa: generateBilingualProductTitle(title, brand),
          price: priceAED,
          priceAED: priceAED,
          originalPriceAED: priceAED,
          currency: "AED",
          image: mainImage || '',
          imageUrl: mainImage || '',
          galleryImages: mainImage ? [mainImage] : [],
          images: mainImage ? [mainImage] : [],
          brand,
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


