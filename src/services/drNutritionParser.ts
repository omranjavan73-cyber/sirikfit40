import type { 
  UniversalProduct, 
  ProductVariantMatrix, 
  ProductVariantItem, 
  VariantDimension, 
  VariantOption, 
  ProductVariantGroup 
} from '../types';
import { generateBilingualProductTitle } from '../utils/parseLink';
import { deduplicateImageUrls } from '../utils/formatters';
import { isOutOfStockElement } from './gncParser';

export { isOutOfStockElement };

/**
 * DrNutritionParser - Strict DOM-State & Variant Extraction Parser
 */
export class DrNutritionParser {
  public static readonly storeName = 'Dr. Nutrition';
  public static readonly storeOrigin = 'انبار مرکزی Dr Nutrition دبی';

  public static canHandle(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return lower.includes('drnutrition.com') || lower.includes('dr-nutrition');
  }

  public static cleanPrice(raw: any): number {
    try {
      if (raw === undefined || raw === null) return 0;
      if (typeof raw === 'number') {
        if (isNaN(raw) || raw < 0) return 0;
        if (raw >= 2500 && !String(raw).includes('.')) return Math.round((raw / 100) * 100) / 100;
        return Math.round(raw * 100) / 100;
      }
      const str = String(raw)
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
        .replace(/,/g, '')
        .replace(/[^0-9.]/g, '');
      let num = parseFloat(str);
      if (isNaN(num) || num < 0) return 0;
      if (num >= 2500 && !String(raw).includes('.')) num = num / 100;
      return Math.round(num * 100) / 100;
    } catch (_e) {
      return 0;
    }
  }

  public static isSizeOption(label: string): boolean {
    if (!label || typeof label !== 'string') return false;
    const l = label.toLowerCase();
    return l.includes('serving') ||
           l.includes('count') ||
           l.includes('kg') ||
           l.includes('lb') ||
           l.includes('g') ||
           l.includes('capsule') ||
           l.includes('tablet') ||
           l.includes('سروینگ') ||
           l.includes('عددی') ||
           l.includes('سایز') ||
           l.includes('وزن') ||
           l.includes('حجم') ||
           /\b\d+\s*(?:lb|kg|g|gm|servings?|caps?|tabs?|sachets?|sticks?)\b/i.test(l);
  }

  public static isFlavorOption(label: string): boolean {
    if (!label || typeof label !== 'string') return false;
    const l = label.toLowerCase();
    return l.includes('flavor') ||
           l.includes('flavour') ||
           l.includes('taste') ||
           l.includes('طعم') ||
           l.includes('chocolate') ||
           l.includes('vanilla') ||
           l.includes('strawberry') ||
           l.includes('banana') ||
           l.includes('cookie') ||
           l.includes('peanut') ||
           l.includes('berry') ||
           l.includes('fruit') ||
           l.includes('lemonade') ||
           l.includes('watermelon') ||
           l.includes('apple') ||
           l.includes('mango') ||
           l.includes('unflavored') ||
           l.includes('بدون طعم');
  }

  public static normalizeUrl(url: string): string {
    try {
      let u = (url || '').trim();
      if (!u) return '';
      if (!u.startsWith('http')) u = `https://${u}`;
      u = u.replace(/https?:\/\/(www\.)?drnutrition\.com/i, 'https://www.drnutrition.com');
      if (/\/(ar|en)-[a-z]{2}\//i.test(u)) {
        u = u.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
      } else if (!u.includes('/en-ae/')) {
        u = u.replace('drnutrition.com/', 'drnutrition.com/en-ae/');
      }
      return u;
    } catch (_e) {
      return url || '';
    }
  }

  public static isInvalidImage(url: string): boolean {
    if (!url || typeof url !== 'string') return true;
    const lower = url.toLowerCase();
    return lower.includes('logo') ||
           lower.includes('dnp') ||
           lower.includes('icon') ||
           lower.includes('header') ||
           lower.includes('badge') ||
           lower.includes('banner') ||
           lower.includes('avatar') ||
           lower.includes('payment') ||
           lower.includes('og-logo') ||
           lower.includes('vector.svg') ||
           lower.includes('placeholder');
  }

  public static sanitizeImageUrl(src: string, baseUrl: string): string {
    try {
      if (!src || typeof src !== 'string') return '';
      let s = src.trim();
      if (s.startsWith('//')) s = `https:${s}`;
      else if (s.startsWith('/')) {
        try {
          const u = new URL(baseUrl);
          s = `${u.origin}${s}`;
        } catch {
          s = `https://www.drnutrition.com${s}`;
        }
      }
      const clean = s.split('?')[0];
      if (this.isInvalidImage(clean)) return '';
      return clean;
    } catch (_e) {
      return '';
    }
  }

  public static parseHtml(html: string, targetUrl: string): UniversalProduct | null {
    if (!html || html.length < 50) return null;
    const normalizedUrl = this.normalizeUrl(targetUrl);

    let title = '';
    let priceAed = 0;
    let originalPriceAed: number | undefined;
    let mainImage = '';
    const rawImages: string[] = [];
    let brand = 'Dr. Nutrition';
    let description = '';

    // 1. OpenGraph & Meta Tags
    try {
      const ogTitle = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta\b[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
      if (ogTitle?.[1]) {
        title = ogTitle[1].replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').trim();
      }

      const ogImage = html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta\b[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
      if (ogImage?.[1]) {
        const cleanImg = this.sanitizeImageUrl(ogImage[1], normalizedUrl);
        if (cleanImg) {
          mainImage = cleanImg;
          rawImages.push(cleanImg);
        }
      }

      const metaDesc = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta\b[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (metaDesc?.[1]) {
        description = metaDesc[1].trim();
      }

      const ogPrice = html.match(/<meta\b[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta\b[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i);
      if (ogPrice?.[1]) {
        const p = this.cleanPrice(ogPrice[1]);
        if (p > 0) priceAed = p;
      }
    } catch (_ogErr) {}

    // 2. Next.js __NEXT_DATA__
    const variantItems: ProductVariantItem[] = [];
    const sizesSet = new Set<string>();
    const flavorsSet = new Set<string>();

    try {
      const nextMatch = html.match(/<script id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (nextMatch?.[1]) {
        const nextJson = JSON.parse(nextMatch[1]);
        const pageProps = nextJson?.props?.pageProps;
        const rootProd = pageProps?.product || 
                         pageProps?.initialData?.product || 
                         pageProps?.data?.product || 
                         pageProps?.productDetails;

        if (rootProd && typeof rootProd === 'object') {
          if (!title && (rootProd.name || rootProd.title)) {
            title = String(rootProd.name || rootProd.title).trim();
          }
          if (priceAed === 0) {
            const rootP = this.cleanPrice(rootProd.final_price ?? rootProd.special_price ?? rootProd.price ?? rootProd.sale_price);
            if (rootP > 0) priceAed = rootP;
          }
          const rootOrig = this.cleanPrice(rootProd.regular_price ?? rootProd.old_price ?? rootProd.compare_at_price);
          if (rootOrig > priceAed) originalPriceAed = rootOrig;

          if (rootProd.brand) {
            const b = typeof rootProd.brand === 'string' ? rootProd.brand : (rootProd.brand?.name || rootProd.brand_name);
            if (b) brand = b;
          }

          if (rootProd.image && !mainImage) {
            const rImg = this.sanitizeImageUrl(typeof rootProd.image === 'string' ? rootProd.image : (rootProd.image?.url || rootProd.image?.src), normalizedUrl);
            if (rImg) {
              mainImage = rImg;
              rawImages.push(rImg);
            }
          }

          // Variants / Siblings extraction with accurate pricing per flavor/size
          const rawSiblings = Array.isArray(rootProd.variants) ? rootProd.variants :
                              (Array.isArray(rootProd.siblings) ? rootProd.siblings :
                              (Array.isArray(rootProd.child_products) ? rootProd.child_products : []));

          if (Array.isArray(rawSiblings) && rawSiblings.length > 0) {
            rawSiblings.forEach((v: any, vIdx: number) => {
              if (!v || typeof v !== 'object') return;
              const vTitle = String(v.name || v.title || v.label || '').trim();
              const vSize = v.size || v.weight || v.serving;
              const vFlavor = v.flavor || v.flavour || v.taste;
              const vp = this.cleanPrice(v.price ?? v.priceAED ?? v.final_price ?? v.special_price) || priceAed;
              const vOp = this.cleanPrice(v.originalPrice ?? v.compare_at_price ?? v.regular_price ?? v.old_price);

              const isAvailable = v.inStock !== false && v.is_salable !== false && v.available !== false && !v.is_out_of_stock;

              if (vSize && typeof vSize === 'string') sizesSet.add(vSize);
              if (vFlavor && typeof vFlavor === 'string') flavorsSet.add(vFlavor);

              const itemDisplay = vTitle || [vSize, vFlavor].filter(Boolean).join(' - ') || `گزینه ${vIdx + 1}`;
              const vImg = v.image ? this.sanitizeImageUrl(typeof v.image === 'string' ? v.image : v.image.url, normalizedUrl) : undefined;
              if (vImg) rawImages.push(vImg);

              variantItems.push({
                id: String(v.id || v.sku || `v-${vIdx}`),
                title: itemDisplay,
                name: itemDisplay,
                size: vSize ? String(vSize) : undefined,
                flavor: vFlavor ? String(vFlavor) : undefined,
                priceAED: vp,
                priceAed: vp,
                originalPriceAED: vOp > vp ? vOp : undefined,
                originalPriceAed: vOp > vp ? vOp : undefined,
                image: vImg,
                imageThumbnail: vImg,
                url: v.url ? this.normalizeUrl(v.url) : undefined,
                inStock: isAvailable
              });
            });
          }
        }
      }
    } catch (_nextErr) {}

    // 3. Fallback Schema.org LD+JSON
    if (priceAed === 0 || !title) {
      try {
        const ldMatches = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
        for (const m of ldMatches) {
          if (!m?.[1]) continue;
          try {
            const parsed = JSON.parse(m[1]);
            const list = Array.isArray(parsed) ? parsed : (parsed?.['@graph'] || [parsed]);
            for (const item of list) {
              if (!item || typeof item !== 'object') continue;
              if (item.name && !title) title = String(item.name).trim();
              if (item.brand && brand === 'Dr. Nutrition') {
                const b = typeof item.brand === 'string' ? item.brand : item.brand?.name;
                if (b) brand = b;
              }
              if (item.offers && priceAed === 0) {
                const offList = Array.isArray(item.offers) ? item.offers : [item.offers];
                for (const off of offList) {
                  const p = this.cleanPrice(off?.price ?? off?.lowPrice);
                  if (p > 0) {
                    priceAed = p;
                    break;
                  }
                }
              }
            }
          } catch (_e) {}
        }
      } catch (_ldErr) {}
    }

    // 4. Fallback DOM H1 / Price Regex
    if (!title) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (h1Match?.[1]) title = h1Match[1].replace(/<[^>]+>/g, '').trim();
    }
    if (priceAed === 0) {
      const pMatch = html.match(/(?:AED|Dhs|د\.إ)\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
                     html.match(/([0-9]+(?:\.[0-9]{1,2})?)\s*(?:AED|Dhs|د\.إ)/i);
      if (pMatch?.[1]) priceAed = this.cleanPrice(pMatch[1]);
    }

    if (!title || priceAed <= 0) {
      return null;
    }

    const galleryImages = deduplicateImageUrls([mainImage, ...rawImages], mainImage);
    const bilingualTitle = generateBilingualProductTitle(title, this.storeName, brand);

    const sizes = Array.from(sizesSet);
    const flavors = Array.from(flavorsSet);

    // Build dimensions & variant groups
    let dimensions: VariantDimension[] | undefined;
    let variantGroups: ProductVariantGroup[] | undefined;
    let variantMatrix: ProductVariantMatrix | undefined;

    if (variantItems.length > 0) {
      const inStockItems = variantItems.filter(it => it.inStock);
      const activeItem = inStockItems[0] || variantItems[0];
      const basePrice = activeItem?.priceAED || priceAed;

      variantMatrix = {
        sizes,
        flavors,
        items: variantItems,
        selectedVariant: activeItem
      };

      const dims: VariantDimension[] = [];
      const grps: ProductVariantGroup[] = [];

      if (flavors.length > 0) {
        const flvOpts: VariantOption[] = flavors.map((f, idx) => {
          const m = variantItems.find(it => it.flavor === f);
          return {
            id: `flv-${idx}`,
            name: f,
            label: f,
            type: 'flavor',
            price: m?.priceAED || basePrice,
            priceAed: m?.priceAED || basePrice,
            priceAED: m?.priceAED || basePrice,
            originalPriceAED: m?.originalPriceAED,
            image: m?.image,
            inStock: m ? m.inStock : true,
            url: m?.url
          };
        });
        dims.push({ id: 'flavors', name: 'طعم (Flavor)', type: 'flavor', options: flvOpts });
        grps.push({ id: 'flavors', name: 'طعم (Flavor)', type: 'flavor', options: flvOpts });
      }

      if (sizes.length > 0) {
        const szOpts: VariantOption[] = sizes.map((s, idx) => {
          const m = variantItems.find(it => it.size === s);
          return {
            id: `sz-${idx}`,
            name: s,
            label: s,
            type: 'size',
            price: m?.priceAED || basePrice,
            priceAed: m?.priceAED || basePrice,
            priceAED: m?.priceAED || basePrice,
            originalPriceAED: m?.originalPriceAED,
            image: m?.image,
            inStock: m ? m.inStock : true,
            url: m?.url
          };
        });
        dims.push({ id: 'sizes', name: 'وزن / سایز (Size)', type: 'size', options: szOpts });
        grps.push({ id: 'sizes', name: 'وزن / سایز (Size)', type: 'size', options: szOpts });
      }

      if (dims.length > 0) dimensions = dims;
      if (grps.length > 0) variantGroups = grps;
    }

    return {
      title: bilingualTitle,
      titleFa: bilingualTitle,
      titleEn: title,
      url: normalizedUrl,
      priceAed: variantMatrix?.selectedVariant?.priceAED || priceAed,
      originalPriceAed,
      discountPercent: (originalPriceAed && originalPriceAed > priceAed) ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100) : undefined,
      weightKg: 0.8,
      image: mainImage || galleryImages[0] || '',
      images: galleryImages,
      galleryImages,
      storeName: this.storeName,
      storeOrigin: this.storeOrigin,
      brand: brand || this.storeName,
      description: description || `محصول اورجینال با ضمانت اصالت ۱۰۰٪ از ${this.storeName}`,
      dimensions,
      variantGroups,
      variants: variantItems.length > 0 ? (variantItems as any) : undefined,
      variantMatrix,
      options: variantItems.length > 0 ? variantItems.map(v => v.title) : undefined,
      flavors: flavors.length > 0 ? flavors : undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
      inStock: variantItems.length > 0 ? variantItems.some(it => it.inStock) : true
    };
  }

  public static async parse(targetUrl: string, rawHtml?: string): Promise<UniversalProduct | null> {
    try {
      const normalizedUrl = this.normalizeUrl(targetUrl);
      const clean = normalizedUrl.split('?')[0].split('#')[0];
      const parts = clean.split('/').filter(Boolean);
      const handle = parts[parts.length - 1];

      if (handle) {
        const apiHeaders = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Locale': 'en',
          'X-Region': 'ae',
          'X-Locale-Region': 'en-ae',
          'Accept-Language': 'en'
        };

        // 1. Try combo endpoint
        try {
          const comboRes = await fetch(`https://data.drnutrition.com/api/v1/combos/${encodeURIComponent(handle)}`, {
            headers: apiHeaders
          });
          if (comboRes.ok) {
            const json: any = await comboRes.json();
            const combo = json?.data?.combo;
            if (combo) {
              const priceAed = Number(combo.selling_price?.amount || 0);
              if (priceAed > 0) {
                const origAed = Number(combo.price?.amount || 0);
                const originalPriceAed = origAed > priceAed ? origAed : undefined;
                const discountPercent = originalPriceAed ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100) : undefined;
                let mainImage = combo.base_image || combo.thumbnail_url || '';
                if (this.isInvalidImage(mainImage)) mainImage = '';
                const galleryImages: string[] = [mainImage].filter(Boolean);
                const variants: any[] = [];
                const flavors: string[] = [];
                const sizes: string[] = [];

                if (Array.isArray(combo.products)) {
                  combo.products.forEach((pItem: any, idx: number) => {
                    const defOpt = (Array.isArray(pItem.options) ? pItem.options.find((o: any) => o.is_default) : null) || pItem.options?.[0];
                    const optLabel = defOpt?.label || pItem.product?.name || `گزینه ${idx + 1}`;
                    if (defOpt?.image && !this.isInvalidImage(defOpt.image) && !galleryImages.includes(defOpt.image)) {
                      galleryImages.push(defOpt.image);
                    }
                    const lowerL = optLabel.toLowerCase();
                    if (lowerL.includes('kg') || lowerL.includes('gm') || lowerL.includes('g') || lowerL.includes('lb') || lowerL.includes('l ')) {
                      if (!sizes.includes(optLabel)) sizes.push(optLabel);
                    } else {
                      if (!flavors.includes(optLabel)) flavors.push(optLabel);
                    }
                    variants.push({
                      id: String(defOpt?.id || pItem.id || `combo-${idx}`),
                      title: optLabel,
                      name: optLabel,
                      priceAED: priceAed,
                      priceAed,
                      price: priceAed,
                      image: defOpt?.image,
                      inStock: true
                    });
                  });
                }

                if (!mainImage && galleryImages.length > 0) mainImage = galleryImages[0];
                const brand = combo.brand?.name || this.storeName;
                const titleEn = combo.name || handle;
                const titleFa = `پک ویژه ${titleEn} اصل دبی`;

                return {
                  title: titleFa,
                  titleFa,
                  titleEn,
                  url: normalizedUrl,
                  priceAed,
                  originalPriceAed,
                  discountPercent,
                  weightKg: 1.2,
                  image: mainImage || galleryImages[0] || '',
                  images: galleryImages,
                  galleryImages,
                  storeName: this.storeName,
                  storeOrigin: this.storeOrigin,
                  brand,
                  description: combo.description || `پکیج اورجینال از ${this.storeName}`,
                  variants,
                  options: variants.map(v => v.title),
                  flavors: flavors.length > 0 ? flavors : undefined,
                  sizes: sizes.length > 0 ? sizes : undefined,
                  inStock: combo.is_active !== false
                };
              }
            }
          }
        } catch (_comboErr) {}

        // 2. Try product endpoint
        try {
          const prodRes = await fetch(`https://data.drnutrition.com/api/v1/products/${encodeURIComponent(handle)}`, {
            headers: apiHeaders
          });
          if (prodRes.ok) {
            const json: any = await prodRes.json();
            const prod = json?.data;
            if (prod) {
              const priceAed = Number(prod.selling_price || prod.price || 0);
              if (priceAed > 0) {
                const origAed = Number(prod.price || 0);
                const originalPriceAed = origAed > priceAed ? origAed : undefined;
                const discountPercent = prod.discount || (originalPriceAed ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100) : undefined);
                let mainImage = prod.base_image || prod.image || '';
                if (this.isInvalidImage(mainImage)) mainImage = '';
                const galleryImages: string[] = [mainImage].filter(Boolean);
                if (Array.isArray(prod.additional_images)) {
                  prod.additional_images.forEach((img: string) => {
                    if (img && !this.isInvalidImage(img) && !galleryImages.includes(img)) galleryImages.push(img);
                  });
                }
                if (!mainImage && galleryImages.length > 0) mainImage = galleryImages[0];
                const brand = prod.brand || prod.brand_details?.name || this.storeName;
                const titleEn = prod.name || prod.title || handle;
                const titleFa = `${titleEn} اورجینال دبی`;

                return {
                  title: titleFa,
                  titleFa,
                  titleEn,
                  url: normalizedUrl,
                  priceAed,
                  originalPriceAed,
                  discountPercent,
                  weightKg: 0.8,
                  image: mainImage || galleryImages[0] || '',
                  images: galleryImages,
                  galleryImages,
                  storeName: this.storeName,
                  storeOrigin: this.storeOrigin,
                  brand,
                  description: prod.description || `محصول اورجینال از ${this.storeName}`,
                  variants: [],
                  options: [],
                  inStock: prod.availability !== 'Out of stock' && prod.in_stock !== false
                };
              }
            }
          }
        } catch (_prodErr) {}
      }

      let html = rawHtml || '';

      if (!html || html.length < 100) {
        try {
          const controller = new AbortController();
          const tId = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(normalizedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9'
            },
            signal: controller.signal
          });
          clearTimeout(tId);

          if (res.ok) {
            html = await res.text();
          }
        } catch (_fetchErr) {}
      }

      if (html && html.length >= 50) {
        return this.parseHtml(html, normalizedUrl);
      }
      return null;
    } catch (fatalErr) {
      console.error('[DrNutritionParser] Fatal error:', fatalErr);
      return null;
    }
  }
}
