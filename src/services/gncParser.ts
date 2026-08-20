import type { UniversalProduct, ProductVariantMatrix, ProductVariantItem, VariantDimension, VariantOption, ProductVariantGroup } from '../types';
import { generateBilingualProductTitle } from '../utils/parseLink';
import { deduplicateImageUrls } from '../utils/formatters';

/**
 * Strict Out-Of-Stock & Disabled Variant Filter
 * Detects disabled, strikethrough, sold-out attributes, classes, tags, and text.
 */
export function isOutOfStockElement(tagHtml: string, rawText?: string): boolean {
  if (!tagHtml && !rawText) return false;
  const tag = (tagHtml || '').toLowerCase();
  const text = (rawText || '').toLowerCase();

  // 1. HTML Attributes indicating unavailable/disabled
  if (
    tag.includes('disabled') ||
    tag.includes('aria-disabled="true"') ||
    tag.includes('data-in-stock="false"') ||
    tag.includes('data-available="false"') ||
    tag.includes('data-is-available="false"') ||
    tag.includes('data-stock="out"') ||
    tag.includes('data-stock="0"') ||
    tag.includes('data-unavailable="true"') ||
    tag.includes('data-inventory="0"') ||
    tag.includes('aria-hidden="true"')
  ) {
    return true;
  }

  // 2. Class Names indicating unavailable / strikethrough / dimmed
  const outOfStockClasses = [
    'disabled', 'unavailable', 'out-of-stock', 'out_of_stock', 'sold-out', 'sold_out',
    'is-disabled', 'inactive', 'opacity-50', 'dimmed', 'strikethrough', 'line-through',
    'is-soldout', 'soldout', 'unavailable-variant', 'disabled-item', 'out-stock',
    'no-stock', 'item-disabled', 'is-unavailable', 'pointer-events-none'
  ];
  for (const cls of outOfStockClasses) {
    const classRegex = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'i');
    if (classRegex.test(tag)) return true;
  }

  // 3. Inline style strikethrough or hidden
  if (
    /style=["'][^"']*(?:text-decoration\s*:\s*line-through|opacity\s*:\s*0\.[1-4]|display\s*:\s*none)[^"']*["']/i.test(tag)
  ) {
    return true;
  }

  // 4. Strikethrough or deletion HTML tags
  if (tag.includes('<s>') || tag.includes('<strike>') || tag.includes('<del>') || tag.includes('line-through')) {
    return true;
  }

  // 5. Text-level markers
  if (
    text.includes('(out of stock)') ||
    text.includes('(sold out)') ||
    text.includes('(unavailable)') ||
    text.includes('(ناموجود)') ||
    text.includes('out of stock') ||
    text.includes('sold out')
  ) {
    return true;
  }

  return false;
}

/**
 * GNC MENA & Shopify Store Dedicated Parser
 */
export class GncParser {
  public static readonly storeName = 'GNC Store';
  public static readonly storeOrigin = 'نمایندگی رسمی GNC امارات';

  public static canHandle(url: string): boolean {
    const lower = (url || '').toLowerCase();
    return lower.includes('gnc-mena.com') || lower.includes('gnc.ae') || lower.includes('gnc.com') || (lower.includes('/products/') && (lower.includes('gnc') || lower.includes('mena')));
  }

  public static parseJsonProduct(productData: any, targetUrl: string): UniversalProduct | null {
    try {
      if (!productData || (!productData.title && !productData.name)) return null;
      const pObj = productData.product || productData;
      const rawTitle = pObj.title || pObj.name || 'GNC Product';
      const bilingualTitle = generateBilingualProductTitle(rawTitle, this.storeName);

      // Gallery Images & Main Image
      const rawGallery: string[] = [];
      if (Array.isArray(pObj.images)) {
        pObj.images.forEach((img: any) => {
          const src = typeof img === 'string' ? img : (img?.src || img?.url);
          if (src) {
            const cleanSrc = src.startsWith('//') ? `https:${src}` : src;
            rawGallery.push(cleanSrc);
          }
        });
      }

      const featuredImgSrc = pObj.featured_image?.src || pObj.image?.src || pObj.featured_image || (rawGallery[0] || '');
      const mainImage = featuredImgSrc.startsWith('//') ? `https:${featuredImgSrc}` : featuredImgSrc;

      const galleryImages = deduplicateImageUrls([mainImage, ...rawGallery], mainImage);

      // Multi-Price Variant Mapping
      const rawVariants: any[] = Array.isArray(pObj.variants) ? pObj.variants : [];
      const items: ProductVariantItem[] = [];
      const sizesSet = new Set<string>();
      const flavorsSet = new Set<string>();

      rawVariants.forEach((v: any, idx: number) => {
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

        const isAvailable = v.available !== false;

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
                         s.toLowerCase().includes('عددی') ||
                         /\b\d+\s*(?:lb|kg|g|servings?|caps?|tabs?)\b/i.test(s);
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
          inStock: isAvailable
        });
      });

      const sizes = Array.from(sizesSet);
      const flavors = Array.from(flavorsSet);
      
      const inStockItems = items.filter(it => it.inStock);
      const activePrimaryItem = inStockItems[0] || items[0];

      const basePrice = activePrimaryItem?.priceAED || (typeof pObj.price === 'number' && pObj.price >= 1000 ? pObj.price / 100 : Number(pObj.price || 0));
      const baseOrigPrice = activePrimaryItem?.originalPriceAED;

      const variantMatrix: ProductVariantMatrix = {
        sizes,
        flavors,
        items,
        selectedVariant: activePrimaryItem
      };

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
            inStock: match ? match.inStock : true
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
            inStock: match ? match.inStock : true
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
        storeName: this.storeName,
        storeOrigin: this.storeOrigin,
        brand: pObj.vendor || 'GNC',
        description: pObj.body_html ? String(pObj.body_html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500) : undefined,
        dimensions: dimensions.length > 0 ? dimensions : undefined,
        variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
        variants: items.length > 0 ? (items as any) : undefined,
        variantMatrix: items.length > 0 ? variantMatrix : undefined,
        options: items.length > 0 ? items.map(it => it.title) : undefined,
        flavors: flavors.length > 0 ? flavors : undefined,
        sizes: sizes.length > 0 ? sizes : undefined,
        inStock: items.length > 0 ? items.some(it => it.inStock) : true
      };
    } catch (err) {
      console.error('[GncParser] Extraction error:', err);
      return null;
    }
  }

  public static async parse(targetUrl: string): Promise<UniversalProduct | null> {
    try {
      const cleanUrl = targetUrl.split('?')[0].replace(/\.js$/i, '').replace(/\.json$/i, '');
      const jsUrl = `${cleanUrl}.js`;
      const jsonUrl = `${cleanUrl}.json`;

      let productData: any = null;

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
      } catch (_jsErr) {}

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
        } catch (_jsonErr) {}
      }

      if (productData) {
        return this.parseJsonProduct(productData, targetUrl);
      }
      return null;
    } catch (err) {
      console.error('[GncParser] Fatal parse error:', err);
      return null;
    }
  }
}
