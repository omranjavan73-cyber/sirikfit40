import { getEffectiveGeminiKeysList, callGeminiApiWithKeyRotation } from './geminiKey';

export interface ParsedProductResult {
  success: boolean;
  title?: string;
  priceAed?: number;
  originalPriceAed?: number;
  discountPercent?: number;
  image?: string;
  images?: string[];
  weightKg?: number;
  storeName?: string;
  brand?: string;
  category?: string;
  description?: string;
  options?: string[];
  error?: string;
  message?: string;
}

export function toPersianDigits(str: string): string {
  if (!str) return '';
  const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => digits[parseInt(w, 10)]);
}

export function generateBilingualProductTitle(rawTitle: string, storeName?: string, brand?: string): string {
  if (!rawTitle) return 'محصول استخراج شده';
  const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();
  if (!cleanTitle) return 'محصول استخراج شده';

  if (/[\u0600-\u06FF]/.test(cleanTitle) && /\([A-Za-z0-9\s.,%&+\-/'"]+\)/.test(cleanTitle)) {
    return cleanTitle;
  }
  if (/[\u0600-\u06FF]/.test(cleanTitle) && !/[a-zA-Z]{3,}/.test(cleanTitle)) {
    return cleanTitle;
  }

  try {
    const lower = cleanTitle.toLowerCase();
    const parts: string[] = [];

    let formPrefix = '';
    if (/\bcapsules?\b|\bcaps?\b/i.test(cleanTitle)) formPrefix = 'کپسول';
    else if (/\btablets?\b|\btabs?\b/i.test(cleanTitle)) formPrefix = 'قرص';
    else if (/\bsoftgels?\b|\bsoftgel\b/i.test(cleanTitle)) formPrefix = 'کپسول ژله‌ای';
    else if (/\bgummies\b|\bgummy\b/i.test(cleanTitle)) formPrefix = 'پاستیل';
    else if (/\bpowders?\b/i.test(cleanTitle)) formPrefix = 'پودر';

    let categoryPersian = '';
    if (/whey\s+isolate/i.test(lower)) categoryPersian = 'پروتئین وی ایزوله';
    else if (/whey/i.test(lower)) categoryPersian = 'پروتئین وی';
    else if (/creatine\s+monohydrate/i.test(lower)) categoryPersian = 'پودر کراتین مونوهیدرات';
    else if (/creatine/i.test(lower)) categoryPersian = 'پودر کراتین';
    else if (/bcaa/i.test(lower)) categoryPersian = 'مکمل بیسیایای (BCAA)';
    else if (/amino/i.test(lower)) categoryPersian = 'مکمل آمینو اسید';
    else if (/glutamine/i.test(lower)) categoryPersian = 'پودر گلوتامین';
    else if (/gainer|mass/i.test(lower)) categoryPersian = 'مکمل گینر افزایش وزن';
    else if (/pre\s*-\s*workout|preworkout/i.test(lower)) categoryPersian = 'پمپ و مکمل قبل از تمرین';
    else if (/prenatal/i.test(lower)) categoryPersian = 'مکمل بارداری و پریناتال';
    else if (/multivitamin|multi\s*vitamin|multi/i.test(lower)) categoryPersian = 'مکمل مولتی‌ویتامین';

    if (formPrefix && categoryPersian.startsWith(formPrefix)) formPrefix = '';
    if (formPrefix) parts.push(formPrefix);
    if (categoryPersian) parts.push(categoryPersian);

    if (/women|female/i.test(lower) && !parts.some(p => p.includes('زنانه'))) parts.push('زنانه');
    else if (/men|male/i.test(lower) && !parts.some(p => p.includes('مردانه'))) parts.push('مردانه');

    const countMatch = cleanTitle.match(/(\d+)\s*(?:capsules?|caps?|tablets?|tabs?|softgels?|count)\b/i);
    if (countMatch && countMatch[1]) {
      parts.push(`${toPersianDigits(countMatch[1])} عددی`);
    }

    let persianPrefix = parts.join(' ').trim();
    if (!persianPrefix) {
      persianPrefix = brand || storeName ? `مکمل اورجینال ${brand || storeName}` : 'مکمل تخصصی و اورجینال';
    }

    return `${persianPrefix} (${cleanTitle})`;
  } catch (_err) {
    return cleanTitle;
  }
}

export function cleanHtmlContent(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(url: string): string {
  let trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

/**
 * Fast & Anti-Cloudflare Fetcher using Jina AI Reader as Priority 1 (3-second timeout)
 */
export async function fetchHtmlWithCorsProxy(targetUrl: string): Promise<string | null> {
  const cleanUrl = normalizeUrl(targetUrl);
  console.log(`[LinkParser] Fast Fetch for URL: "${cleanUrl}"`);

  const proxies = [
    { name: 'Jina AI Reader', getUrl: (u: string) => `https://r.jina.ai/${u}` },
    { name: 'AllOrigins RAW', getUrl: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` }
  ];

  for (const proxy of proxies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500); // Fast 4.5s timeout

      const res = await fetch(proxy.getUrl(cleanUrl), {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,application/xhtml+xml,*/*' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const trimmed = text ? text.trim() : '';
        if (trimmed && trimmed.length > 100 && !trimmed.includes('Attention Required! | Cloudflare')) {
          console.log(`[LinkParser] Fast Fetch SUCCESS via ${proxy.name}`);
          return trimmed;
        }
      }
    } catch (_e) {}
  }
  return null;
}

/**
 * High-Speed OpenGraph / JSON-LD Extractor
 */
export function parseHtmlMetadata(html: string, targetUrl: string): ParsedProductResult | null {
  if (!html || html.length < 50) return null;

  let title = '';
  let priceAed = 0;
  let image = '';
  let storeName = 'فروشگاه دبی';

  try {
    const parsedUrl = new URL(targetUrl);
    const host = parsedUrl.hostname.replace(/^www\./i, '');
    if (host.includes('lifepharmacy')) storeName = 'Life Pharmacy';
    else if (host.includes('drnutrition')) storeName = 'Dr. Nutrition';
    else if (host.includes('gnc')) storeName = 'GNC';
  } catch (_e) {}

  // Parse JSON-LD
  const jsonLdMatches = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const tag of jsonLdMatches) {
      try {
        const jsonText = tag.replace(/<script\b[^>]*>/i, '').replace(/<\/script>/i, '').trim();
        const data = JSON.parse(jsonText);
        const inspect = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj)) { obj.forEach(inspect); return; }
          if (obj.name && !title) title = String(obj.name).trim();
          if (obj.image && !image) {
            image = typeof obj.image === 'string' ? obj.image : (obj.image.url || obj.image[0] || '');
          }
          const offers = obj.offers || obj;
          if (offers && typeof offers === 'object') {
            const rawP = String(offers.price || offers.lowPrice || '');
            const parsedP = parseFloat(rawP.replace(/,/g, '').replace(/[^0-9.]/g, ''));
            if (!isNaN(parsedP) && parsedP > 0) priceAed = parsedP;
          }
        };
        inspect(data);
      } catch (_e) {}
    }
  }

  // OpenGraph Fallback
  if (!priceAed) {
    const m = html.match(/<meta\b[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["']/i);
    if (m && m[1]) priceAed = parseFloat(m[1].replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0;
  }
  if (!title) {
    const m = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<title\b[^>]*>([^<]+)<\/title>/i);
    if (m && m[1]) title = m[1].trim();
  }
  if (!image) {
    const m = html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (m && m[1]) image = m[1].trim();
  }

  if (priceAed > 0 && title) {
    return {
      success: true,
      title: generateBilingualProductTitle(title, storeName),
      priceAed,
      storeName,
      image,
      weightKg: 0.8
    };
  }
  return null;
}

/**
 * Universal Parser with Guaranteed Gemini Fallback
 */
export async function parseProductLinkUniversal(params: {
  url: string;
  geminiKeys?: string[];
  cmsConfig?: any;
}): Promise<ParsedProductResult> {
  const targetUrl = normalizeUrl(params.url);
  const effectiveKeys = getEffectiveGeminiKeysList(params.geminiKeys);

  // 1. Try Fast Metadata Extraction
  const rawHtml = await fetchHtmlWithCorsProxy(targetUrl);
  if (rawHtml) {
    const fastMeta = parseHtmlMetadata(rawHtml, targetUrl);
    if (fastMeta && fastMeta.priceAed && fastMeta.priceAed > 0) {
      return fastMeta;
    }
  }

  // 2. ALWAYS Fallback to Gemini AI (Even if rawHtml is null, uses URL Slug parsing)
  console.log('[LinkParser] Running Gemini AI Extraction Fallback...');
  const cleanedHtml = rawHtml ? cleanHtmlContent(rawHtml).slice(0, 10000) : '';

  const prompt = `Extract product details for URL: "${targetUrl}".
${cleanedHtml ? `Webpage Content:\n"""\n${cleanedHtml}\n"""` : 'Note: Could not download HTML. Extract title, brand, and AED price directly from the URL slug string.'}

Respond ONLY with valid JSON:
{
  "title": "Product Title in English",
  "priceAed": 120.0,
  "storeName": "Store Name",
  "image": "https://example.com/image.jpg",
  "weightKg": 0.8
}`;

  try {
    const responseText = await callGeminiApiWithKeyRotation({
      prompt,
      keys: effectiveKeys,
      models: ['gemini-1.5-flash', 'gemini-2.0-flash']
    });

    if (responseText) {
      const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      const priceAed = Number(parsed.priceAed) || 0;

      if (priceAed > 0 || parsed.title) {
        return {
          success: true,
          title: generateBilingualProductTitle(parsed.title || 'محصول استخراج شده', parsed.storeName),
          priceAed: priceAed > 0 ? priceAed : 150,
          storeName: parsed.storeName || 'فروشگاه دبی',
          image: parsed.image || '',
          weightKg: Number(parsed.weightKg) || 0.8
        };
      }
    }
  } catch (_e) {}

  return {
    success: false,
    error: 'امکان استخراج اتوماتیک لینک وجود نداشت؛ لطفاً قیمت درهم را به صورت دستی وارد کنید.'
  };
}