// Patch script: replaces drNutritionAdapter in server.ts
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server.ts');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '// -------------------------------------------------------------------\n// ADAPTER 1: DR NUTRITION DEDICATED ADAPTER (drNutritionAdapter)\n// -------------------------------------------------------------------\nasync function drNutritionAdapter';
const endMarker = '// -------------------------------------------------------------------\n// ADAPTER 2: GNC STORE DEDICATED ADAPTER (gncAdapter)';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find the drNutritionAdapter boundaries!');
  console.log('startIdx:', startIdx, 'endIdx:', endIdx);
  process.exit(1);
}

console.log('Found adapter at lines', startIdx, '-', endIdx);
console.log('Adapter length:', endIdx - startIdx, 'chars');

// Check what's between the markers
const existing = content.substring(startIdx, endIdx);
const existingLines = existing.split('\n').length;
console.log('Existing adapter:', existingLines, 'lines');

const newAdapter = `// -------------------------------------------------------------------
// ADAPTER 1: DR NUTRITION DEDICATED ADAPTER (drNutritionAdapter)
// Multi-tier extraction pipeline handling Cloudflare protection
// TIER 1: Direct HTTP (fast, may hit CF 403)
// TIER 2: ScraperAPI with JS rendering (bypasses CF via proxy browser)
// TIER 3: ScraperAPI without rendering (cheaper fallback)
// TIER 4: Microlink with prerender
// TIER 5: Jina Reader (markdown output with smart parser)
// TIER 6: Shopify .js/.json endpoints
// TIER 7: Structured failure
// -------------------------------------------------------------------
async function drNutritionAdapter(targetUrl: string, cmsConfig?: any): Promise<ParseAdapterResult> {
  const storeName = "Dr. Nutrition";
  const headers = getStandardScraperHeaders(targetUrl);
  const extractionLog: any[] = [];
  const t0 = Date.now();

  // URL Normalization
  let drUrl = targetUrl.replace(/https?:\\/\\/(www\\.)?drnutrition\\.com/i, 'https://www.drnutrition.com');
  let enAeUrl = drUrl;
  if (/\\/(ar|en)-[a-z]{2}\\//i.test(drUrl)) {
    enAeUrl = drUrl.replace(/\\/(ar|en)-[a-z]{2}\\//i, '/en-ae/');
  } else if (!drUrl.includes('/en-ae/')) {
    enAeUrl = drUrl.replace('drnutrition.com/', 'drnutrition.com/en-ae/');
  }

  // Slug title inference helper (used when all scraping fails)
  const inferTitleFromSlug = (url: string): { title: string; brand: string } => {
    try {
      const slug = url.split('/').filter(Boolean).pop() || '';
      const clean = slug.replace(/[-_]/g, ' ').replace(/\\b\\w/g, (c: string) => c.toUpperCase()).trim();
      const brandPatterns: [RegExp, string][] = [
        [/applied[\\s-]nutrition/i, 'Applied Nutrition'],
        [/optimum[\\s-]nutrition|on[\\s-]gold/i, 'Optimum Nutrition'],
        [/dymatize/i, 'Dymatize'], [/myprotein/i, 'Myprotein'],
        [/muscletech/i, 'MuscleTech'], [/cellucor|c4[\\s-]/i, 'Cellucor'],
        [/isopure/i, 'Isopure'], [/now[\\s-]foods/i, 'NOW Foods'],
      ];
      let brand = 'Dr. Nutrition';
      for (const [pat, b] of brandPatterns) { if (pat.test(slug)) { brand = b; break; } }
      return { title: clean.slice(0, 120), brand };
    } catch (_e) { return { title: 'Dr. Nutrition Product', brand: 'Dr. Nutrition' }; }
  };

  // Jina Markdown parser (handles markdown output from r.jina.ai)
  const parseJinaMarkdown = (md: string, sourceUrl: string): ParseAdapterResult | null => {
    if (!md || md.length < 100) return null;
    let title = '', brand = '', price = 0;
    let originalPriceVal: number | undefined;
    let discountPct: number | undefined;
    const gallery: string[] = [];
    const flavors: string[] = [], sizes: string[] = [];
    const flvOpts: any[] = [], szOpts: any[] = [];
    let desc = '';

    const h1 = md.match(/^#\\s+([^\\n]+)/m);
    if (h1) title = cleanTitleStr(h1[1].replace(/\\|\\s*Dr\\.?\\s*Nutrition.*/i, '').trim());
    if (!title) {
      const tl = md.match(/Title:\\s*([^\\n]+)/i);
      if (tl) title = cleanTitleStr(tl[1].trim());
    }
    const bm = md.match(/By\\s+([A-Za-z0-9\\s&.\\-]+?)(?:\\n|\\|)/i) || md.match(/Brand:\\s*([^\\n]+)/i);
    if (bm) brand = bm[1].trim();

    const fp = md.match(/AED\\s*([\\d,]+\\.?\\d*)\\s+AED\\s*([\\d,]+\\.?\\d*)\\s+([\\d]+)%\\s*OFF/i);
    if (fp) {
      price = parseFloat(fp[1].replace(/,/g, ''));
      originalPriceVal = parseFloat(fp[2].replace(/,/g, ''));
      discountPct = parseInt(fp[3], 10);
    } else {
      const dp = md.match(/AED\\s*([\\d,]+\\.?\\d*)\\s+AED\\s*([\\d,]+\\.?\\d*)/i);
      if (dp) {
        const p1 = parseFloat(dp[1].replace(/,/g, '')), p2 = parseFloat(dp[2].replace(/,/g, ''));
        price = Math.min(p1, p2); originalPriceVal = Math.max(p1, p2);
        if (originalPriceVal > price) discountPct = Math.round(((originalPriceVal - price) / originalPriceVal) * 100);
      } else {
        const sp = md.match(/AED\\s*([\\d,]+\\.?\\d*)/i);
        if (sp) price = parseFloat(sp[1].replace(/,/g, ''));
      }
    }

    Array.from(md.matchAll(/!\\[([^\\]]*)\\]\\((https?:\\/\\/[^\\s)]+)\\)/gi)).forEach(m => {
      let imgUrl = m[2].trim();
      if (imgUrl.includes('/_next/image') && imgUrl.includes('url=')) {
        const up = imgUrl.match(/url=([^&]+)/);
        if (up) { try { imgUrl = decodeURIComponent(up[1]); } catch (_) {} }
      }
      const s = sanitizeImageUrl(imgUrl, sourceUrl);
      if (s && !gallery.includes(s) && !s.includes('logo') && !s.includes('icon') && !s.includes('.svg') && !s.includes('flag')) gallery.push(s);
    });

    const secRx = /###\\s+([^\\n]+)\\n([\\s\\S]*?)(?=(?:###|##|#\\s|Delivery|ADD TO CART|Ship to|$))/gi;
    let sm: RegExpExecArray | null;
    while ((sm = secRx.exec(md)) !== null) {
      const hd = (sm[1] || '').trim().toLowerCase();
      const bd = sm[2] || '';
      const skipKws = ['description', 'how to use', 'health notes', 'product details', 'features', 'nutrition', 'service', 'resources', 'customer', 'popular brands', 'categories', 'links', 'details'];
      if (skipKws.some(k => hd.includes(k))) {
        if (!desc && hd.includes('description')) desc = bd.replace(/!\\[[^\\]]*\\]\\([^)]+\\)/g, '').replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, '$1').trim().slice(0, 800);
        continue;
      }
      const isSz = /size|serv|weight|count|kg|lb|capsule|tablet|gram/i.test(hd);
      const isFlv = /flavor|flavour|taste/i.test(hd);
      bd.split('\\n').map(l => l.trim()).filter(Boolean).forEach((line, idx) => {
        const clean = line.replace(/!\\[[^\\]]*\\]\\([^)]+\\)/g, '').replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g, '$1').replace(/[*_~\`#>|]/g, '').replace(/^[-*+]\\s*/, '').trim();
        if (!clean || clean.length < 2 || clean.length > 60) return;
        if (/^(see more|out of stock|add to cart|quantity|delivery|free|sold)/i.test(clean)) return;
        const actSz = isSz || /\\b\\d+\\s*(serving|kg|g|lb|cap|tab|sachet)/i.test(clean);
        const actFlv = isFlv || (!actSz && /apple|mango|orange|lemon|berry|vanilla|chocolate|watermelon|unflavored|pineapple|green|fruit|burst|lime|passion/i.test(clean));
        if (actSz && !sizes.includes(clean)) { sizes.push(clean); szOpts.push({ id: \`sz-jina-\${idx}\`, name: clean, label: clean, type: 'size', inStock: true }); }
        else if (actFlv && !flavors.includes(clean)) { flavors.push(clean); flvOpts.push({ id: \`flv-jina-\${idx}\`, name: clean, label: clean, type: 'flavor', inStock: true }); }
      });
    }

    if (!title && !price) return null;
    const vGroups: any[] = [];
    if (flvOpts.length > 0) vGroups.push({ id: 'flavors', name: 'Flavor', type: 'flavor', options: flvOpts });
    if (szOpts.length > 0) vGroups.push({ id: 'sizes', name: 'Size', type: 'size', options: szOpts });
    return { ok: true, title: title || inferTitleFromSlug(sourceUrl).title, price, originalPriceAed: originalPriceVal, originalPriceAED: originalPriceVal, discountPercent: discountPct, currency: 'AED', image: gallery[0] || '', galleryImages: gallery, images: gallery, variantGroups: vGroups.length > 0 ? vGroups : undefined, flavors: flavors.length > 0 ? flavors : undefined, sizes: sizes.length > 0 ? sizes : undefined, options: [...flavors, ...sizes], description: desc || undefined, storeName, brand: brand || inferTitleFromSlug(sourceUrl).brand };
  };

  // TIER 1: Direct HTTP (fast check — may hit Cloudflare 403)
  for (const fetchUrl of [enAeUrl, drUrl]) {
    try {
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 4000);
      const directRes = await fetch(fetchUrl, { headers, signal: controller.signal });
      clearTimeout(tId);
      if (directRes.ok && directRes.status !== 403) {
        const html = await directRes.text();
        if (html && html.length > 5000) {
          extractionLog.push({ tier: 1, url: fetchUrl, htmlLen: html.length });
          const exactResult = parseDrNutritionExactJson(html, fetchUrl);
          if (exactResult && exactResult.title && exactResult.price && exactResult.price > 0) return exactResult;
          const parsed = parseHtmlEngine(html, fetchUrl);
          if (parsed.title && parsed.price > 0) return { ok: true, title: parsed.title, price: parsed.price, currency: 'AED', image: sanitizeImageUrl(parsed.image, fetchUrl), galleryImages: parsed.galleryImages, images: parsed.galleryImages, variantGroups: parsed.variantGroups, flavors: parsed.flavors, sizes: parsed.sizes, options: parsed.options, storeName, description: parsed.description };
        }
      }
    } catch (_e) { extractionLog.push({ tier: 1, success: false }); }
  }

  // TIER 2: ScraperAPI with JS rendering (bypasses Cloudflare)
  const scraperApiKey = (cmsConfig?.apiConfig as any)?.scraperApiKey || process.env.SCRAPER_API_KEY || process.env.SCRAPERAPI_KEY || "a67220b28858f356c2b0f0ea7878c6f8";
  if (scraperApiKey) {
    try {
      const sUrl = \`http://api.scraperapi.com?api_key=\${encodeURIComponent(scraperApiKey)}&url=\${encodeURIComponent(enAeUrl)}&render=true&country_code=ae&device_type=desktop\`;
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 22000);
      const sRes = await fetch(sUrl, { signal: controller.signal });
      clearTimeout(tId);
      if (sRes.ok) {
        const sHtml = await sRes.text();
        if (sHtml && sHtml.length > 5000) {
          extractionLog.push({ tier: 2, htmlLen: sHtml.length });
          const exactResult = parseDrNutritionExactJson(sHtml, enAeUrl);
          if (exactResult && exactResult.title && exactResult.price && exactResult.price > 0) return exactResult;
          const parsed = parseHtmlEngine(sHtml, enAeUrl);
          if (parsed.title && parsed.price > 0) return { ok: true, title: parsed.title, price: parsed.price, currency: 'AED', image: sanitizeImageUrl(parsed.image, enAeUrl), galleryImages: parsed.galleryImages, images: parsed.galleryImages, variantGroups: parsed.variantGroups, flavors: parsed.flavors, sizes: parsed.sizes, options: parsed.options, storeName, description: parsed.description };
        }
      }
    } catch (_e) { extractionLog.push({ tier: 2, success: false }); }

    // TIER 3: ScraperAPI without rendering (cheaper)
    try {
      const sUrl3 = \`http://api.scraperapi.com?api_key=\${encodeURIComponent(scraperApiKey)}&url=\${encodeURIComponent(enAeUrl)}&country_code=ae\`;
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 10000);
      const sRes3 = await fetch(sUrl3, { signal: controller.signal });
      clearTimeout(tId);
      if (sRes3.ok) {
        const sHtml3 = await sRes3.text();
        if (sHtml3 && sHtml3.length > 3000) {
          const exactResult = parseDrNutritionExactJson(sHtml3, enAeUrl);
          if (exactResult && exactResult.title && exactResult.price && exactResult.price > 0) return exactResult;
          const parsed = parseHtmlEngine(sHtml3, enAeUrl);
          if (parsed.title && parsed.price > 0) return { ok: true, title: parsed.title, price: parsed.price, currency: 'AED', image: sanitizeImageUrl(parsed.image, enAeUrl), galleryImages: parsed.galleryImages, images: parsed.galleryImages, variantGroups: parsed.variantGroups, flavors: parsed.flavors, sizes: parsed.sizes, options: parsed.options, storeName, description: parsed.description };
        }
      }
    } catch (_e3) { extractionLog.push({ tier: 3, success: false }); }
  }

  // TIER 4: Microlink prerender extractor
  const microlinkResult = await fetchWithMicrolink(enAeUrl, storeName);
  if (microlinkResult && microlinkResult.price && microlinkResult.price > 0 && microlinkResult.title && microlinkResult.title.length > 5) {
    extractionLog.push({ tier: 4, success: true });
    return microlinkResult;
  }

  // TIER 5: Jina Reader (renders CF-protected pages, returns Markdown)
  try {
    const jinaUrl = \`https://r.jina.ai/\${enAeUrl}\`;
    const jinaHdrs: Record<string, string> = { ...headers, 'Accept': 'text/plain, */*', 'X-With-Images-Summary': 'true', 'X-No-Cache': 'true', 'X-Return-Format': 'markdown' };
    const jinaKey = process.env.JINA_API_KEY || (cmsConfig?.apiConfig as any)?.jinaApiKey;
    if (jinaKey) jinaHdrs['Authorization'] = \`Bearer \${jinaKey}\`;
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 20000);
    const jinaRes = await fetch(jinaUrl, { headers: jinaHdrs, signal: controller.signal });
    clearTimeout(tId);
    if (jinaRes.ok) {
      const jinaText = await jinaRes.text();
      extractionLog.push({ tier: 5, contentLen: jinaText.length });
      if (jinaText.includes('__NEXT_DATA__') || jinaText.includes('application/ld+json')) {
        const exactResult = parseDrNutritionExactJson(jinaText, enAeUrl);
        if (exactResult && exactResult.title && exactResult.price && exactResult.price > 0) return exactResult;
      }
      const mdResult = parseJinaMarkdown(jinaText, enAeUrl);
      if (mdResult && mdResult.title && mdResult.price && mdResult.price > 0) return mdResult;
    }
  } catch (_jinaErr) { extractionLog.push({ tier: 5, success: false }); }

  // TIER 6: Shopify .js/.json endpoints
  try {
    const cleanBase = enAeUrl.split('?')[0].split('#')[0].replace(/\\/$/, '').replace(/\\.(js|json)$/i, '');
    for (const jsUrl of [\`\${cleanBase}.js\`, \`\${cleanBase}.json\`, cleanBase.replace('/en-ae/', '/') + '.js', cleanBase.replace('/en-ae/', '/') + '.json']) {
      try {
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(jsUrl, { headers: { ...headers, 'Accept': 'application/json, */*' }, signal: controller.signal });
        clearTimeout(tId);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (!json) continue;
          const pObj = json?.product || json;
          const t = pObj?.title || pObj?.name;
          let rawP = pObj?.price ?? pObj?.variants?.[0]?.price;
          if (t && rawP !== undefined) {
            let p = parseFloat(normalizeToEnglishDigits(String(rawP)).replace(/,/g, '').replace(/[^0-9.]/g, ''));
            if (!isNaN(p) && p > 0) {
              if (p > 1000 && !String(rawP).includes('.')) p = p / 100;
              const fp = Math.round(p * 100) / 100;
              const pImg = sanitizeImageUrl(pObj?.featured_image?.src || pObj?.image?.src, enAeUrl);
              const gal = (pObj?.images || []).map((im: any) => sanitizeImageUrl(im.src || im, enAeUrl)).filter(Boolean);
              const ca = parseFloat(pObj?.variants?.[0]?.compare_at_price || 0);
              const caP = ca > 1000 ? ca / 100 : ca;
              return { ok: true, title: cleanTitleStr(t), price: fp, currency: 'AED', image: pImg, galleryImages: gal, images: gal, originalPriceAed: caP > fp ? caP : undefined, originalPriceAED: caP > fp ? caP : undefined, storeName, brand: pObj?.vendor || storeName, description: pObj?.body_html ? String(pObj.body_html).replace(/<[^>]+>/g, ' ').trim().slice(0, 800) : undefined };
            }
          }
        }
      } catch (_jsErr) {}
    }
  } catch (_e) {}

  // TIER 7: Structured failure
  console.warn('[DrNutritionAdapter] All tiers failed for:', enAeUrl, { durationMs: Date.now() - t0, tiers: extractionLog.length });
  return { ok: false, requireManualEntry: true, message: "اطلاعات محصول در حال حاضر قابل دریافت نیست. لطفا دوباره تلاش کنید." };
}

`;

content = content.substring(0, startIdx) + newAdapter + content.substring(endIdx);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched drNutritionAdapter in server.ts');
console.log('New file size:', content.length, 'bytes');
