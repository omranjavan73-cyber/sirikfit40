import { UniversalProduct, ProductVariantGroup, ProductVariantItem } from '../types';

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
    const lower = url.toLowerCase().trim();
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
           lower.includes('placeholder') ||
           lower.includes('footer') ||
           lower.includes('tamara') ||
           lower.includes('tabby') ||
           lower.includes('pixel') ||
           lower.includes('1x1') ||
           lower.includes('spacer') ||
           lower.includes('shop.png') ||
           lower.includes('express.png') ||
           lower.includes('pickup.png') ||
           lower.includes('modes/') ||
           lower.includes('flags/') ||
           lower.includes('site-logo') ||
           lower.endsWith('.svg') ||
           lower.includes('.svg?') ||
           lower.startsWith('data:image/svg');
  }

  public static cleanTitle(raw: string): string {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (['dr. nutrition', 'dr nutrition', 'product | dr. nutrition uae', 'product', 'دکتر نوتریشن'].includes(trimmed.toLowerCase())) {
      return '';
    }
    return trimmed
      .replace(/\|\s*Dr\.?\s*Nutrition.*/gi, '')
      .replace(/\|\s*دكتور\s*نيوترشن.*/gi, '')
      .replace(/-\s*Dr\.?\s*Nutrition.*/gi, '')
      .replace(/\s*BB\s*[\d.]+\s*(?:L|Jug|liter)?.*$/i, '')
      .replace(/\s+-\s+BB\s*[\d.]+.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
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

    // 1. Schema.org JSON-LD (PRIORITY 1)
    try {
      const ldMatches = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
      for (const match of ldMatches) {
        if (!match?.[1]) continue;
        try {
          const parsed = JSON.parse(match[1]);
          const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
          for (const item of items) {
            if (!item || typeof item !== 'object') continue;
            if (item['@type'] === 'Product' || item.offers) {
              if (!title && (item.name || item.headline)) {
                const t = this.cleanTitle(String(item.name || item.headline));
                if (t) title = t;
              }
              if (!description && item.description) {
                description = String(item.description).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim().slice(0, 1000);
              }
              if (item.brand) {
                const b = typeof item.brand === 'string' ? item.brand : item.brand?.name;
                if (b) brand = b;
              }
              if (item.image) {
                const imgs = Array.isArray(item.image) ? item.image : [item.image];
                imgs.forEach((img: any) => {
                  const clean = this.sanitizeImageUrl(typeof img === 'string' ? img : img?.url, normalizedUrl);
                  if (clean && !rawImages.includes(clean)) rawImages.push(clean);
                });
              }
              if (priceAed === 0 && item.offers) {
                const offersList = Array.isArray(item.offers) ? item.offers : [item.offers];
                for (const offer of offersList) {
                  if (!offer) continue;
                  const pVal = offer.price ?? offer.lowPrice ?? offer.priceSpecification?.price;
                  if (pVal !== undefined && pVal !== null) {
                    const p = this.cleanPrice(pVal);
                    if (p > 0) {
                      priceAed = p;
                      const origP = this.cleanPrice(offer.highPrice);
                      if (origP > priceAed) originalPriceAed = origP;
                      break;
                    }
                  }
                }
              }
            }
          }
        } catch (_ldParseErr) {}
      }
    } catch (_ldErr) {}

    // 2. Next.js __NEXT_DATA__ / RSC Streams (PRIORITY 2)
    const variantItems: ProductVariantItem[] = [];
    const sizesSet = new Set<string>();
    const flavorsSet = new Set<string>();

    try {
      // RSC stream matching
      if (priceAed === 0) {
        const spMatch = html.match(/"selling_price":\s*\{\s*"amount":\s*([\d.]+)/i) ||
                        html.match(/"selling_price":\s*([\d.]+)/i);
        if (spMatch && spMatch[1]) {
          const p = this.cleanPrice(spMatch[1]);
          if (p > 0) priceAed = p;
        }
      }
      if (!originalPriceAed) {
        const opMatch = html.match(/"original_price":\s*\{\s*"amount":\s*([\d.]+)/i) ||
                        html.match(/"price":\s*\{\s*"amount":\s*([\d.]+)/i) ||
                        html.match(/"regular_price":\s*([\d.]+)/i);
        if (opMatch && opMatch[1]) {
          const op = this.cleanPrice(opMatch[1]);
          if (op > priceAed) originalPriceAed = op;
        }
      }
      const rscImgs = Array.from(html.matchAll(/https:\/\/media\.drnutrition\.com\/media\/[^"'\s\\]+/gi));
      rscImgs.forEach(m => {
        const clean = this.sanitizeImageUrl(m[0], normalizedUrl);
        if (clean && !rawImages.includes(clean)) rawImages.push(clean);
      });

      // Next.js __NEXT_DATA__
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
            title = this.cleanTitle(String(rootProd.name || rootProd.title));
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

          if (rootProd.image) {
            const rImg = this.sanitizeImageUrl(typeof rootProd.image === 'string' ? rootProd.image : (rootProd.image?.url || rootProd.image?.src), normalizedUrl);
            if (rImg && !rawImages.includes(rImg)) rawImages.push(rImg);
          }
        }
      }
    } catch (_nextErr) {}

    // 3. Strikethrough & DOM Selectors
    if (!originalPriceAed && html.includes('line-through')) {
      const origMatch = html.match(/class=["'][^"']*line-through[^"']*["'][^>]*>(?:AED\s*)?([\d\.,]+)<\/span>/i) ||
                        html.match(/<del[^>]*>(?:AED\s*)?([\d\.,]+)<\/del>/i);
      if (origMatch && origMatch[1]) {
        const op = this.cleanPrice(origMatch[1]);
        if (op > priceAed) originalPriceAed = op;
      }
    }

    if (priceAed === 0) {
      // Exclude shipping banners first
      const cleanHtmlForDom = html
        .replace(/<[^>]*class=["'][^"']*(?:delivery|shipping|header|banner|perk|notice)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '')
        .replace(/(?:free\s*(?:delivery|shipping)|orders?\s*(?:above|over)|threshold)[^\n<]{0,80}(?:AED|Dhs|د\.إ)?\s*\d+(?:\.\d+)?/gi, '')
        .replace(/\b(?:100)\s*(?:AED|Dhs|د\.إ)?\b[^\n<]{0,40}(?:free|shipping|delivery)/gi, '');

      const domPriceMatch = cleanHtmlForDom.match(/class=["'][^"']*(?:selling-price|accent|final-price)[^"']*["'][^>]*>([\d\.,]+)<\/span>/i);
      if (domPriceMatch && domPriceMatch[1]) {
        const p = this.cleanPrice(domPriceMatch[1]);
        if (p > 0) priceAed = p;
      }
    }

    // Fallback title from OG or H1
    if (!title) {
      const ogTitle = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (ogTitle && ogTitle[1]) {
        const t = this.cleanTitle(ogTitle[1]);
        if (t) title = t;
      }
    }
    if (!title) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (h1Match && h1Match[1]) {
        const t = this.cleanTitle(h1Match[1].replace(/<[^>]+>/g, ' '));
        if (t) title = t;
      }
    }

    // Set main image
    if (rawImages.length > 0) {
      mainImage = rawImages[0];
    }

    // Strict Validation: NEVER return fake AED 100 or logo or generic fallback
    if (!title || title === 'Dr. Nutrition' || priceAed <= 0 || !mainImage) {
      return null;
    }

    const discountPercent = (originalPriceAed && originalPriceAed > priceAed)
      ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100)
      : undefined;

    const titleEn = title;
    const titleFa = `${title} اورجینال دبی`;

    const variantGroups: ProductVariantGroup[] = [];
    if (flavorsSet.size > 0) {
      variantGroups.push({
        id: 'group-flavors',
        name: 'طعم (Flavor)',
        type: 'flavor',
        options: Array.from(flavorsSet).map((flv, idx) => ({
          id: `flv-${idx}`,
          name: flv,
          priceAed,
          inStock: true
        }))
      });
    }
    if (sizesSet.size > 0) {
      variantGroups.push({
        id: 'group-sizes',
        name: 'وزن / سایز (Size)',
        type: 'size',
        options: Array.from(sizesSet).map((sz, idx) => ({
          id: `sz-${idx}`,
          name: sz,
          priceAed,
          inStock: true
        }))
      });
    }

    return {
      title: titleFa,
      titleFa,
      titleEn,
      url: normalizedUrl,
      priceAed,
      originalPriceAed,
      discountPercent,
      weightKg: 0.8,
      image: mainImage,
      images: rawImages,
      galleryImages: rawImages,
      storeName: this.storeName,
      storeOrigin: this.storeOrigin,
      brand,
      description: description || `محصول اورجینال از ${this.storeName}`,
      variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
      variants: variantItems,
      options: variantItems.map(v => v.title),
      flavors: flavorsSet.size > 0 ? Array.from(flavorsSet) : undefined,
      sizes: sizesSet.size > 0 ? Array.from(sizesSet) : undefined,
      inStock: true
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

        const normalizedSlug = handle.toLowerCase().replace(/^\/+|\/+$/g, '');

        // 1A. Direct combo endpoint
        try {
          const comboRes = await fetch(`https://data.drnutrition.com/api/v1/combos/${encodeURIComponent(normalizedSlug)}`, {
            headers: apiHeaders
          });
          if (comboRes.ok) {
            const json: any = await comboRes.json();
            const combo = json?.data?.combo;
            if (combo) {
              const res = this.buildProductFromCombo(combo, normalizedUrl);
              if (res) return res;
            }
          }
        } catch (_comboErr) {}

        // 1B. Catalog Combo Lookup (handles slugs where user pasted without the 6-10 char hash suffix)
        try {
          const comboListRes = await fetch('https://data.drnutrition.com/api/v1/combos?per_page=100', {
            headers: apiHeaders
          });
          if (comboListRes.ok) {
            const json: any = await comboListRes.json();
            const combos = json?.data?.combos || [];
            const match = combos.find((c: any) => {
              const cSlug = (c.slug || '').toLowerCase();
              if (cSlug === normalizedSlug) return true;
              const cSlugBase = cSlug.replace(/-[A-Za-z0-9]{6,10}$/, '');
              return cSlugBase === normalizedSlug;
            });
            if (match) {
              try {
                const detailRes = await fetch(`https://data.drnutrition.com/api/v1/combos/${match.id}`, { headers: apiHeaders });
                if (detailRes.ok) {
                  const detailJson = await detailRes.json();
                  if (detailJson?.data?.combo) {
                    const res = this.buildProductFromCombo(detailJson.data.combo, normalizedUrl);
                    if (res) return res;
                  }
                }
              } catch (_detailErr) {}

              const res = this.buildProductFromCombo(match, normalizedUrl);
              if (res) return res;
            }
          }
        } catch (_comboListErr) {}

        // 1C. Product Search API
        try {
          const searchTerms = normalizedSlug
            .replace(/^product\//i, '')
            .replace(/\.html?$/i, '')
            .replace(/-(?:bb|jug|shaker|bottle|free|promo|gift|offer)-.*/gi, '')
            .replace(/-/g, ' ')
            .trim();

          if (searchTerms) {
            const searchRes = await fetch(`https://data.drnutrition.com/api/v1/search?q=${encodeURIComponent(searchTerms)}`, {
              headers: apiHeaders
            });
            if (searchRes.ok) {
              const json: any = await searchRes.json();
              const products = json?.data?.products || [];
              if (Array.isArray(products) && products.length > 0) {
                let matched = products.find((p: any) => p.slug === normalizedSlug || p.url?.endsWith(normalizedSlug));
                if (!matched) {
                  const slugWords = searchTerms.toLowerCase().split(' ').filter(w => w.length > 2);
                  matched = products.find((p: any) => {
                    const pTitle = (p.title || '').toLowerCase();
                    return slugWords.length > 0 && slugWords.every(w => pTitle.includes(w));
                  });
                }
                if (matched) {
                  const res = this.buildProductFromApiProduct(matched, normalizedUrl);
                  if (res) return res;
                }
              }
            }
          }
        } catch (_searchErr) {}
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

          if (res.ok && res.status !== 403) {
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

  private static buildProductFromCombo(combo: any, normalizedUrl: string): UniversalProduct | null {
    const priceAed = Number(combo.selling_price?.amount || combo.selling_price || 0);
    if (!priceAed || priceAed <= 0) return null;

    const rawTitle = String(combo.name || '').trim();
    const cleanTitle = this.cleanTitle(rawTitle);
    if (!cleanTitle || cleanTitle === 'Dr. Nutrition') return null;

    const origAed = Number(combo.price?.amount || combo.price || 0);
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
    const brand = combo.brand?.name || "Farah Secrets";
    const titleEn = cleanTitle;
    const titleFa = `پک ویژه ${cleanTitle} اصل دبی`;

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

  private static buildProductFromApiProduct(prod: any, normalizedUrl: string): UniversalProduct | null {
    const priceAed = Number(prod.selling_price || prod.price || 0);
    if (!priceAed || priceAed <= 0) return null;

    const rawTitle = String(prod.title || prod.name || '').trim();
    const cleanTitle = this.cleanTitle(rawTitle);
    if (!cleanTitle || cleanTitle === 'Dr. Nutrition') return null;

    const origAed = Number(prod.price || 0);
    const originalPriceAed = origAed > priceAed ? origAed : undefined;
    const discountPercent = prod.discount || (originalPriceAed ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100) : undefined);

    let mainImage = prod.original_image || prod.image || prod.base_image || '';
    if (this.isInvalidImage(mainImage)) mainImage = '';
    const galleryImages: string[] = [mainImage].filter(Boolean);
    if (Array.isArray(prod.additional_images)) {
      prod.additional_images.forEach((img: string) => {
        if (img && !this.isInvalidImage(img) && !galleryImages.includes(img)) galleryImages.push(img);
      });
    }
    if (!mainImage && galleryImages.length > 0) mainImage = galleryImages[0];

    const brand = prod.brand?.name || prod.brand_name || prod.brand || this.storeName;
    const titleEn = cleanTitle;
    const titleFa = `${cleanTitle} اورجینال دبی`;

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
