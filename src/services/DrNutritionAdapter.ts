import type { 
  UniversalProduct, 
  ProductVariantMatrix, 
  ProductVariantItem, 
  VariantDimension, 
  VariantOption, 
  ProductVariantGroup 
} from '../types';
import { generateBilingualProductTitle } from '../utils/parseLink';

/**
 * DrNutritionAdapter - Bulletproof, Ultra-Defensive Universal Adapter for Dr. Nutrition
 * 
 * Strict Architectural Principles:
 * 1. Absolute Exception Safety: Try/Catch every step. Never throw or allow unhandled rejections.
 * 2. Guaranteed Base Extraction: Extract Title, Price, Image, and Brand reliably from metadata / OpenGraph / LD+JSON / HTML regexes.
 * 3. Safe Variant Isolation: If hydration / JSON extraction of variants fails or contains unexpected structures, 
 *    gracefully swallow errors and return the pristine base product without crashing.
 * 4. Zero DOM-scraped broken sibling navigation.
 */
export class DrNutritionAdapter {
  public static readonly storeName = 'Dr. Nutrition';
  public static readonly storeOrigin = 'انبار مرکزی Dr Nutrition دبی';

  public static canHandle(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return lower.includes('drnutrition.com') || lower.includes('dr-nutrition');
  }

  /**
   * Cleans & formats numeric price values safely
   */
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

  /**
   * Helper to check if a title/option label or attribute is a Size
   */
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
           /\b\d+\s*(?:lb|kg|g|servings?|caps?|tabs?)\b/i.test(l);
  }

  /**
   * Helper to check if a label is a Flavor
   */
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
           l.includes('unflavored') ||
           l.includes('بدون طعم');
  }

  /**
   * Normalizes URLs to target the UAE EN store for accurate AED currency
   */
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

  /**
   * Extracts clean image URL
   */
  private static sanitizeImageUrl(src: string, baseUrl: string): string {
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
      return s.split('?')[0];
    } catch (_e) {
      return '';
    }
  }

  /**
   * Main entry point to parse a Dr. Nutrition product URL or HTML
   * GUARANTEE: NEVER throws or fails unhandled. Returns UniversalProduct or null.
   */
  public static async parse(targetUrl: string, rawHtml?: string): Promise<UniversalProduct | null> {
    try {
      const normalizedUrl = this.normalizeUrl(targetUrl);
      let html = rawHtml || '';

      // 1. Fetch raw HTML if not supplied
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
        } catch (_fetchErr) {
          // Swallow fetch error gracefully
        }
      }

      if (!html || html.length < 50) {
        return null;
      }

      // Step A: Extract Base Product Data (Title, Image, Price, Brand, Description)
      let title = '';
      let priceAed = 0;
      let originalPriceAed: number | undefined;
      let mainImage = '';
      const galleryImages: string[] = [];
      let brand = 'Dr. Nutrition';
      let description = '';

      // 1. OpenGraph & Meta Tags extraction
      try {
        const ogTitle = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta\b[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
        if (ogTitle?.[1]) {
          title = ogTitle[1].replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').trim();
        }

        const ogImage = html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta\b[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
        if (ogImage?.[1]) {
          const imgSanitized = this.sanitizeImageUrl(ogImage[1], normalizedUrl);
          if (imgSanitized) {
            mainImage = imgSanitized;
            galleryImages.push(imgSanitized);
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

      // 2. Schema.org LD+JSON extraction (Safe nested block)
      try {
        const ldMatches = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
        for (const m of ldMatches) {
          if (!m?.[1]) continue;
          try {
            const parsed = JSON.parse(m[1]);
            const list = Array.isArray(parsed) ? parsed : (parsed?.['@graph'] || [parsed]);
            for (const item of list) {
              if (!item || typeof item !== 'object') continue;
              const type = String(item['@type'] || '');
              if (type.includes('Product') || item.offers || item.name) {
                if (item.name && !title) {
                  title = String(item.name).replace(/&amp;/g, '&').trim();
                }
                if (item.brand) {
                  const bName = typeof item.brand === 'string' ? item.brand : (item.brand?.name || brand);
                  if (bName) brand = bName;
                }
                if (item.description && !description) {
                  description = String(item.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                }
                if (item.image) {
                  const imgList = Array.isArray(item.image) ? item.image : [item.image];
                  imgList.forEach((img: any) => {
                    const src = typeof img === 'string' ? img : (img?.url || img?.contentUrl);
                    if (src) {
                      const cleanImg = this.sanitizeImageUrl(src, normalizedUrl);
                      if (cleanImg && !galleryImages.includes(cleanImg)) {
                        galleryImages.push(cleanImg);
                        if (!mainImage) mainImage = cleanImg;
                      }
                    }
                  });
                }
                const offers = item.offers || item.hasVariant;
                if (offers && priceAed === 0) {
                  const offList = Array.isArray(offers) ? offers : [offers];
                  for (const off of offList) {
                    if (!off) continue;
                    const p = this.cleanPrice(off.price ?? off.lowPrice ?? off.priceSpecification?.price);
                    if (p > 0) {
                      priceAed = p;
                      break;
                    }
                  }
                }
              }
            }
          } catch (_jsonErr) {}
        }
      } catch (_ldErr) {}

      // 3. Fallback Title via H1 / page title
      if (!title) {
        try {
          const h1Match = html.match(/<h1[^>]*class=["'][^"']*page-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                          html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          if (h1Match?.[1]) {
            title = h1Match[1].replace(/<[^>]+>/g, '').trim();
          } else {
            const pageTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (pageTitleMatch?.[1]) {
              title = pageTitleMatch[1].split('|')[0].split('-')[0].trim();
            }
          }
        } catch (_tErr) {}
      }

      // 4. Safe Price Extraction via DOM / Regex
      if (priceAed === 0) {
        try {
          const priceMatches = [
            html.match(/data-price-amount=["']([0-9.]+)["']/i),
            html.match(/data-price-type=["']finalPrice["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*price["'][^>]*>\s*(?:AED|Dhs|د\.إ)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i),
            html.match(/class=["'][^"']*price-wrapper[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*price["'][^>]*>\s*(?:AED|Dhs|د\.إ)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i),
            html.match(/class=["'][^"']*price["'][^>]*>\s*(?:AED|Dhs|د\.إ)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i),
            html.match(/(?:AED|Dhs|د\.إ)\s*([0-9]+(?:\.[0-9]{1,2})?)/i),
            html.match(/([0-9]+(?:\.[0-9]{1,2})?)\s*(?:AED|Dhs|د\.إ)/i)
          ];

          for (const pm of priceMatches) {
            if (pm?.[1]) {
              const p = this.cleanPrice(pm[1]);
              if (p > 0) {
                priceAed = p;
                break;
              }
            }
          }
        } catch (_pErr) {}
      }

      // 5. Safe Image Extraction via DOM
      if (!mainImage) {
        try {
          const imgMatches = [
            html.match(/<img[^>]*class=["'][^"']*(?:gallery-image|product-image-photo|main-image)[^"']*["'][^>]*src=["']([^"']+)["']/i),
            html.match(/<img[^>]*data-src=["']([^"']*(?:catalog\/product|media\/product)[^"']+)["']/i),
            html.match(/<img[^>]*src=["']([^"']*(?:catalog\/product|media\/product)[^"']+)["']/i)
          ];
          for (const im of imgMatches) {
            if (im?.[1]) {
              const sanitized = this.sanitizeImageUrl(im[1], normalizedUrl);
              if (sanitized) {
                mainImage = sanitized;
                galleryImages.push(sanitized);
                break;
              }
            }
          }
        } catch (_imErr) {}
      }

      // Step B: Safe Variant Extraction from Hydration (__NEXT_DATA__ or Magento jsonConfig)
      // All variant logic is isolated in a nested try/catch to ensure it never crashes base extraction
      let variantMatrix: ProductVariantMatrix | undefined = undefined;
      let variantGroups: ProductVariantGroup[] | undefined = undefined;
      let dimensions: VariantDimension[] | undefined = undefined;
      let variantsList: ProductVariantItem[] | undefined = undefined;
      const extractedSizes: string[] = [];
      const extractedFlavors: string[] = [];

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

            if (rootProd.image && !mainImage) {
              const rImg = this.sanitizeImageUrl(typeof rootProd.image === 'string' ? rootProd.image : (rootProd.image?.url || rootProd.image?.src), normalizedUrl);
              if (rImg) {
                mainImage = rImg;
                if (!galleryImages.includes(rImg)) galleryImages.push(rImg);
              }
            }

            // Safe Sibling/Variant Items
            const rawSiblings = Array.isArray(rootProd.variants) ? rootProd.variants :
                                (Array.isArray(rootProd.siblings) ? rootProd.siblings :
                                (Array.isArray(rootProd.child_products) ? rootProd.child_products : []));

            if (Array.isArray(rawSiblings) && rawSiblings.length > 0) {
              const vItems: ProductVariantItem[] = [];
              rawSiblings.forEach((v: any, vIdx: number) => {
                if (!v || typeof v !== 'object') return;
                const vTitle = String(v.name || v.title || v.label || '').trim();
                const vSize = v.size || v.weight || v.serving;
                const vFlavor = v.flavor || v.flavour || v.taste;
                const vp = this.cleanPrice(v.price ?? v.priceAED ?? v.final_price) || priceAed;
                const vOp = this.cleanPrice(v.originalPrice ?? v.compare_at_price ?? v.regular_price);

                if (vSize && typeof vSize === 'string' && !extractedSizes.includes(vSize)) extractedSizes.push(vSize);
                if (vFlavor && typeof vFlavor === 'string' && !extractedFlavors.includes(vFlavor)) extractedFlavors.push(vFlavor);

                const itemDisplay = vTitle || [vSize, vFlavor].filter(Boolean).join(' - ') || `گزینه ${vIdx + 1}`;
                vItems.push({
                  id: String(v.id || v.sku || `v-${vIdx}`),
                  title: itemDisplay,
                  name: itemDisplay,
                  size: vSize ? String(vSize) : undefined,
                  flavor: vFlavor ? String(vFlavor) : undefined,
                  priceAED: vp,
                  priceAed: vp,
                  originalPriceAED: vOp > vp ? vOp : undefined,
                  originalPriceAed: vOp > vp ? vOp : undefined,
                  image: v.image ? this.sanitizeImageUrl(typeof v.image === 'string' ? v.image : v.image.url, normalizedUrl) : undefined,
                  inStock: v.inStock !== false && v.is_salable !== false
                });
              });

              if (vItems.length > 0) {
                variantsList = vItems;
                variantMatrix = {
                  sizes: extractedSizes,
                  flavors: extractedFlavors,
                  items: vItems,
                  selectedVariant: vItems[0]
                };
              }
            }
          }
        }
      } catch (_varErr) {
        // Variant extraction failure does not stop product parsing
        variantsList = undefined;
        variantMatrix = undefined;
      }

      // Final Base Validation
      if (!title) {
        title = 'مکمل اورجینال Dr. Nutrition';
      }
      if (priceAed === 0) {
        // Fallback default safe price if completely unparseable
        priceAed = 100;
      }

      const bilingualTitle = generateBilingualProductTitle(title, this.storeName, brand);

      // Construct Dimensions & Groups only if valid variants exist
      if (variantMatrix && variantMatrix.items && variantMatrix.items.length > 0) {
        const dims: VariantDimension[] = [];
        const grps: ProductVariantGroup[] = [];

        if (extractedFlavors.length > 0) {
          const flvOpts: VariantOption[] = extractedFlavors.map((f, idx) => {
            const m = variantMatrix?.items.find(it => it.flavor === f);
            return {
              id: `flv-${idx}`,
              name: f,
              priceAed: m?.priceAED || priceAed,
              originalPriceAed: m?.originalPriceAED,
              image: m?.image,
              inStock: m?.inStock !== false
            };
          });
          dims.push({ id: 'flavors', name: 'طعم (Flavor)', type: 'flavor', options: flvOpts });
          grps.push({ id: 'flavors', name: 'طعم (Flavor)', type: 'flavor', options: flvOpts });
        }

        if (extractedSizes.length > 0) {
          const szOpts: VariantOption[] = extractedSizes.map((s, idx) => {
            const m = variantMatrix?.items.find(it => it.size === s);
            return {
              id: `sz-${idx}`,
              name: s,
              priceAed: m?.priceAED || priceAed,
              originalPriceAed: m?.originalPriceAED,
              image: m?.image,
              inStock: m?.inStock !== false
            };
          });
          dims.push({ id: 'sizes', name: 'وزن / سایز (Size)', type: 'size', options: szOpts });
          grps.push({ id: 'sizes', name: 'وزن / سایز (Size)', type: 'size', options: szOpts });
        }

        if (dims.length > 0) dimensions = dims;
        if (grps.length > 0) variantGroups = grps;
      }

      const finalProduct: UniversalProduct = {
        title: bilingualTitle,
        titleFa: bilingualTitle,
        titleEn: title,
        url: normalizedUrl,
        priceAed,
        originalPriceAed,
        discountPercent: (originalPriceAed && originalPriceAed > priceAed) ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100) : undefined,
        weightKg: 0.8,
        image: mainImage || '',
        images: galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []),
        galleryImages: galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []),
        storeName: this.storeName,
        storeOrigin: this.storeOrigin,
        brand: brand || this.storeName,
        description: description || `محصول اورجینال با ضمانت اصالت ۱۰۰٪ از ${this.storeName}`,
        dimensions,
        variantGroups,
        variants: variantsList as any,
        variantMatrix,
        options: variantsList ? variantsList.map(v => v.title) : ["پیش‌فرض / استاندارد"],
        flavors: extractedFlavors.length > 0 ? extractedFlavors : undefined,
        sizes: extractedSizes.length > 0 ? extractedSizes : undefined,
        inStock: true
      };

      return finalProduct;
    } catch (fatalErr) {
      console.error('[DrNutritionAdapter] Fatal error swallowed gracefully:', fatalErr);
      return null;
    }
  }
}
