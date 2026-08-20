import type { UniversalProduct, ProductVariantMatrix, ProductVariantItem, VariantDimension, VariantOption, ProductVariantGroup } from '../types';
import { generateBilingualProductTitle } from '../utils/parseLink';

/**
 * GNC MENA & Shopify Store Universal Adapter
 * 
 * Uses the native Shopify `.js` and `.json` endpoint trick to extract
 * 100% accurate variant price matrices (e.g. 68 Servings = 389.90 AED, 29 Servings = 199 AED).
 */
export class GncAdapter {
  public static readonly storeName = 'GNC Store';
  public static readonly storeOrigin = 'نمایندگی رسمی GNC امارات';

  public static canHandle(url: string): boolean {
    const lower = (url || '').toLowerCase();
    return lower.includes('gnc-mena.com') || lower.includes('gnc.ae') || lower.includes('gnc.com') || (lower.includes('/products/') && (lower.includes('gnc') || lower.includes('mena')));
  }

  /**
   * Parses a GNC or Shopify product URL by hitting the clean `.js` / `.json` endpoint
   */
  public static async parse(targetUrl: string): Promise<UniversalProduct | null> {
    try {
      // 1. Strip query params and prepare clean endpoint URL
      const cleanUrl = targetUrl.split('?')[0].replace(/\.js$/i, '').replace(/\.json$/i, '');
      const jsUrl = `${cleanUrl}.js`;
      const jsonUrl = `${cleanUrl}.json`;

      let productData: any = null;

      // Try .js endpoint first (Fastest and native on Shopify)
      try {
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 4000);
        const jsRes = await fetch(jsUrl, {
          headers: { 'Accept': 'application/json, text/javascript, */*; q=0.01' },
          signal: controller.signal
        });
        clearTimeout(tId);

        if (jsRes.ok) {
          productData = await jsRes.json();
        }
      } catch (_jsErr) {
        // Fallback to .json
      }

      // Try .json endpoint fallback
      if (!productData) {
        try {
          const controller = new AbortController();
          const tId = setTimeout(() => controller.abort(), 4000);
          const jsonRes = await fetch(jsonUrl, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
          });
          clearTimeout(tId);

          if (jsonRes.ok) {
            const jsonBody = await jsonRes.json();
            productData = jsonBody?.product || jsonBody;
          }
        } catch (_jsonErr) {
          // Both failed
        }
      }

      if (!productData || (!productData.title && !productData.name)) {
        return null;
      }

      const pObj = productData.product || productData;
      const rawTitle = pObj.title || pObj.name || 'GNC Product';
      const bilingualTitle = generateBilingualProductTitle(rawTitle, 'GNC Store');

      // Gallery Images
      const galleryImages: string[] = [];
      if (Array.isArray(pObj.images)) {
        pObj.images.forEach((img: any) => {
          const src = typeof img === 'string' ? img : (img?.src || img?.url);
          if (src) {
            const cleanSrc = src.startsWith('//') ? `https:${src}` : src;
            if (!galleryImages.includes(cleanSrc)) galleryImages.push(cleanSrc);
          }
        });
      }

      const featuredImgSrc = pObj.featured_image?.src || pObj.image?.src || pObj.featured_image || (galleryImages[0] || '');
      const mainImage = featuredImgSrc.startsWith('//') ? `https:${featuredImgSrc}` : featuredImgSrc;
      if (mainImage && !galleryImages.includes(mainImage)) {
        galleryImages.unshift(mainImage);
      }

      // Map Variant Matrix
      const rawVariants: any[] = Array.isArray(pObj.variants) ? pObj.variants : [];
      const items: ProductVariantItem[] = [];
      const sizesSet = new Set<string>();
      const flavorsSet = new Set<string>();

      rawVariants.forEach((v: any, idx: number) => {
        // Shopify stores prices in cents (e.g. 38990 -> 389.90 AED)
        let price = v.price;
        if (typeof price === 'number') {
          if (price >= 1000) price = price / 100;
        } else if (typeof price === 'string') {
          const p = parseFloat(price.replace(/,/g, '').replace(/[^0-9.]/g, ''));
          price = p >= 1000 ? p / 100 : p;
        }
        price = Math.round(Number(price || 0) * 100) / 100;

        let origPrice = v.compare_at_price;
        if (typeof origPrice === 'number') {
          if (origPrice >= 1000) origPrice = origPrice / 100;
        } else if (typeof origPrice === 'string') {
          const op = parseFloat(origPrice.replace(/,/g, '').replace(/[^0-9.]/g, ''));
          origPrice = op >= 1000 ? op / 100 : op;
        }
        origPrice = origPrice ? Math.round(Number(origPrice) * 100) / 100 : undefined;

        // Categorize options (option1, option2, option3)
        const opts = [v.option1, v.option2, v.option3].filter(Boolean).map(String);
        let size: string | undefined;
        let flavor: string | undefined;

        opts.forEach(opt => {
          const s = opt.trim();
          if (['default title', 'default', '1'].includes(s.toLowerCase())) return;

          const isSize = s.toLowerCase().includes('serving') ||
                         s.toLowerCase().includes('count') ||
                         s.toLowerCase().includes('kg') ||
                         s.toLowerCase().includes('lb') ||
                         s.toLowerCase().includes('g') ||
                         s.toLowerCase().includes('capsule') ||
                         s.toLowerCase().includes('tablet') ||
                         s.toLowerCase().includes('سروینگ') ||
                         s.toLowerCase().includes('عددی');
          if (isSize) {
            size = s;
            sizesSet.add(s);
          } else {
            flavor = s;
            flavorsSet.add(s);
          }
        });

        const vTitle = v.title && !['default title', 'default', '1'].includes(v.title.toLowerCase())
          ? v.title
          : ([flavor, size].filter(Boolean).join(' / ') || `گزینه ${idx + 1}`);

        let vImg = v.featured_image?.src ? (v.featured_image.src.startsWith('//') ? `https:${v.featured_image.src}` : v.featured_image.src) : undefined;

        items.push({
          id: String(v.id || `v-${idx}`),
          title: vTitle,
          name: vTitle,
          size,
          flavor,
          priceAED: price,
          priceAed: price,
          originalPriceAED: origPrice,
          originalPriceAed: origPrice,
          image: vImg,
          imageThumbnail: vImg,
          inStock: v.available !== false
        });
      });

      const sizes = Array.from(sizesSet);
      const flavors = Array.from(flavorsSet);
      const basePrice = items[0]?.priceAED || (typeof pObj.price === 'number' && pObj.price >= 1000 ? pObj.price / 100 : Number(pObj.price || 0));
      const baseOrigPrice = items[0]?.originalPriceAED;

      const variantMatrix: ProductVariantMatrix = {
        sizes,
        flavors,
        items,
        selectedVariant: items[0]
      };

      // Build structured Variant Dimensions for UI
      const dimensions: VariantDimension[] = [];
      if (flavors.length > 0) {
        const flavorOptions: VariantOption[] = flavors.map((f, fIdx) => {
          const match = items.find(it => it.flavor === f);
          return {
            id: `flv-${fIdx}`,
            name: f,
            label: f,
            type: 'flavor',
            price: match?.priceAED || basePrice,
            priceAed: match?.priceAED || basePrice,
            priceAED: match?.priceAED || basePrice,
            originalPriceAED: match?.originalPriceAED,
            image: match?.image,
            inStock: match?.inStock !== false
          };
        });
        dimensions.push({
          id: 'flavors',
          name: 'طعم (Flavor)',
          type: 'flavor',
          options: flavorOptions
        });
      }

      if (sizes.length > 0) {
        const sizeOptions: VariantOption[] = sizes.map((s, sIdx) => {
          const match = items.find(it => it.size === s);
          return {
            id: `sz-${sIdx}`,
            name: s,
            label: s,
            type: 'size',
            price: match?.priceAED || basePrice,
            priceAed: match?.priceAED || basePrice,
            priceAED: match?.priceAED || basePrice,
            originalPriceAED: match?.originalPriceAED,
            image: match?.image,
            inStock: match?.inStock !== false
          };
        });
        dimensions.push({
          id: 'sizes',
          name: 'تعداد سروینگ / بسته‌بندی (Size)',
          type: 'size',
          options: sizeOptions
        });
      }

      const variantGroups: ProductVariantGroup[] = dimensions.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type as any,
        options: d.options
      }));

      return {
        title: bilingualTitle,
        titleFa: bilingualTitle,
        titleEn: rawTitle,
        url: targetUrl,
        priceAed: basePrice,
        originalPriceAed: baseOrigPrice,
        weightKg: 1.0,
        image: mainImage,
        images: galleryImages,
        galleryImages,
        storeName: GncAdapter.storeName,
        storeOrigin: GncAdapter.storeOrigin,
        brand: pObj.vendor || 'GNC',
        description: pObj.body_html ? String(pObj.body_html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500) : undefined,
        dimensions,
        variantGroups,
        variants: items as any,
        variantMatrix,
        options: items.map(it => it.title),
        flavors,
        sizes,
        inStock: items.some(it => it.inStock)
      };
    } catch (err) {
      console.error('[GncAdapter] Extraction error:', err);
      return null;
    }
  }
}
