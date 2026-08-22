/**
 * Dr. Nutrition Adapter Module - Extracted for maintainability
 * This is imported into server.ts via dynamic require for patching
 */

// URL-slug title inference helper
export function inferDrNutritionTitleFromSlug(url: string): { title: string; brand: string } {
  try {
    const slug = url.split('/').filter(Boolean).pop() || '';
    const clean = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).trim();
    const brandMap: [RegExp, string][] = [
      [/applied[\s-]nutrition/i, 'Applied Nutrition'],
      [/optimum[\s-]nutrition|on[\s-]gold/i, 'Optimum Nutrition'],
      [/dymatize/i, 'Dymatize'],
      [/myprotein/i, 'Myprotein'],
      [/bsn/i, 'BSN'],
      [/muscletech/i, 'MuscleTech'],
      [/cellucor|c4[\s-]/i, 'Cellucor'],
      [/isopure/i, 'Isopure'],
      [/universal[\s-]nutrition/i, 'Universal Nutrition'],
      [/now[\s-]foods/i, 'NOW Foods'],
      [/gnc/i, 'GNC'],
      [/naturo[\s-]sciences/i, 'Naturo Sciences'],
      [/reflex[\s-]nutrition/i, 'Reflex Nutrition'],
    ];
    let detectedBrand = 'Dr. Nutrition';
    for (const [pattern, brand] of brandMap) {
      if (pattern.test(slug)) { detectedBrand = brand; break; }
    }
    return { title: clean.slice(0, 120), brand: detectedBrand };
  } catch (_e) {
    return { title: 'Dr. Nutrition Product', brand: 'Dr. Nutrition' };
  }
}

// Jina Markdown Parser for Dr. Nutrition pages
export function parseDrNutritionJinaMarkdown(
  md: string,
  sourceUrl: string,
  sanitizeImageUrlFn: (src: string, base: string) => string,
  cleanTitleStrFn: (s: string) => string
): any | null {
  if (!md || md.length < 100) return null;

  let title = '';
  let brand = '';
  let price = 0;
  let originalPrice: number | undefined;
  let discountPercent: number | undefined;
  const galleryImages: string[] = [];
  const flavors: string[] = [];
  const sizes: string[] = [];
  const flavorOptions: any[] = [];
  const sizeOptions: any[] = [];
  let description = '';

  // 1. Title: first H1
  const h1Match = md.match(/^#\s+([^\n]+)/m);
  if (h1Match) {
    title = cleanTitleStrFn(h1Match[1].replace(/\|\s*Dr\.?\s*Nutrition.*/i, '').trim());
  }
  if (!title) {
    const titleLineMatch = md.match(/Title:\s*([^\n]+)/i);
    if (titleLineMatch) title = cleanTitleStrFn(titleLineMatch[1].trim());
  }

  // 2. Brand
  const brandMatch = md.match(/By\s+([A-Za-z0-9\s&.\-]+?)(?:\n|\|)/i) || md.match(/Brand:\s*([^\n]+)/i);
  if (brandMatch) brand = brandMatch[1].trim();

  // 3. Prices
  const fullPriceMatch = md.match(/AED\s*([\d,]+\.?\d*)\s+AED\s*([\d,]+\.?\d*)\s+([\d]+)%\s*OFF/i);
  if (fullPriceMatch) {
    price = parseFloat(fullPriceMatch[1].replace(/,/g, ''));
    originalPrice = parseFloat(fullPriceMatch[2].replace(/,/g, ''));
    discountPercent = parseInt(fullPriceMatch[3], 10);
  } else {
    const dualPriceMatch = md.match(/AED\s*([\d,]+\.?\d*)\s+AED\s*([\d,]+\.?\d*)/i);
    if (dualPriceMatch) {
      const p1 = parseFloat(dualPriceMatch[1].replace(/,/g, ''));
      const p2 = parseFloat(dualPriceMatch[2].replace(/,/g, ''));
      price = Math.min(p1, p2);
      originalPrice = Math.max(p1, p2);
      if (originalPrice > price) {
        discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
      }
    } else {
      const singleMatch = md.match(/AED\s*([\d,]+\.?\d*)/i);
      if (singleMatch) price = parseFloat(singleMatch[1].replace(/,/g, ''));
    }
  }

  // 4. Images from markdown image syntax
  const imageMatches = Array.from(md.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi));
  imageMatches.forEach(m => {
    let imgUrl = m[2].trim();
    if (imgUrl.includes('/_next/image') && imgUrl.includes('url=')) {
      const urlParam = imgUrl.match(/url=([^&]+)/);
      if (urlParam) {
        try { imgUrl = decodeURIComponent(urlParam[1]); } catch (_) {}
      }
    }
    const sanitized = sanitizeImageUrlFn(imgUrl, sourceUrl);
    if (sanitized && !galleryImages.includes(sanitized) &&
        !sanitized.includes('logo') && !sanitized.includes('icon') && !sanitized.includes('.svg') &&
        !sanitized.includes('flag') && !sanitized.includes('banner') && !sanitized.includes('mode')) {
      galleryImages.push(sanitized);
    }
  });

  // 5. Variant option groups
  const sectionRegex = /###\s+([^\n]+)\n([\s\S]*?)(?=(?:###|##|#\s|Delivery|ADD TO CART|Ship to|$))/gi;
  let secMatch: RegExpExecArray | null;
  while ((secMatch = sectionRegex.exec(md)) !== null) {
    const heading = (secMatch[1] || '').trim().toLowerCase();
    const body = secMatch[2] || '';
    const skipKeywords = ['description', 'how to use', 'health notes', 'product details', 'features', 'nutrition', 'service', 'resources', 'customer', 'popular brands', 'categories', 'links', 'details', 'ingredients'];
    if (skipKeywords.some(k => heading.includes(k))) {
      if (!description && (heading.includes('description') || heading.includes('about'))) {
        description = body.replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim().slice(0, 800);
      }
      continue;
    }

    const isSize = /size|serv|weight|count|kg|lb|capsule|tablet|gram/i.test(heading);
    const isFlavor = /flavor|flavour|taste/i.test(heading);
    const bodyLines = body.split('\n').map(l => l.trim()).filter(Boolean);

    bodyLines.forEach((line, idx) => {
      const clean = line
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_~`#>|]/g, '')
        .replace(/^[-*+]\s*/, '')
        .trim();
      if (!clean || clean.length < 2 || clean.length > 60) return;
      if (/^(see more|out of stock|add to cart|quantity|delivery|free|sold)/i.test(clean)) return;

      const isActuallySize = isSize || /\b\d+\s*(serving|kg|g|lb|cap|tab|sachet)/i.test(clean);
      const isActuallyFlavor = isFlavor || (!isActuallySize && /apple|mango|orange|lemon|berry|vanilla|chocolate|watermelon|unflavored|pineapple|green|fruit|burst|lime|passion/i.test(clean));

      if (isActuallySize) {
        if (!sizes.includes(clean)) {
          sizes.push(clean);
          sizeOptions.push({ id: `sz-jina-${idx}`, name: clean, label: clean, type: 'size', inStock: true });
        }
      } else if (isActuallyFlavor) {
        if (!flavors.includes(clean)) {
          flavors.push(clean);
          flavorOptions.push({ id: `flv-jina-${idx}`, name: clean, label: clean, type: 'flavor', inStock: true });
        }
      }
    });
  }

  if (!title && !price) return null;

  const variantGroups: any[] = [];
  if (flavorOptions.length > 0) variantGroups.push({ id: 'flavors', name: 'Flavor', type: 'flavor', options: flavorOptions });
  if (sizeOptions.length > 0) variantGroups.push({ id: 'sizes', name: 'Size', type: 'size', options: sizeOptions });

  return {
    ok: true,
    title: title || inferDrNutritionTitleFromSlug(sourceUrl).title,
    price: price || 0,
    originalPriceAed: originalPrice,
    originalPriceAED: originalPrice,
    discountPercent,
    currency: 'AED',
    image: galleryImages[0] || '',
    galleryImages,
    images: galleryImages,
    variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
    flavors: flavors.length > 0 ? flavors : undefined,
    sizes: sizes.length > 0 ? sizes : undefined,
    options: [...flavors, ...sizes],
    description: description || undefined,
    storeName: 'Dr. Nutrition',
    brand: brand || inferDrNutritionTitleFromSlug(sourceUrl).brand
  };
}
