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

/**
 * Clean raw HTML by stripping script tags, style tags, SVG elements, and HTML comments.
 */
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

/**
 * Fetch HTML or clean webpage text via 4-stage client-side CORS proxies & scraper tools.
 * Sequentially tries:
 * 1) AllOrigins RAW proxy
 * 2) CorsProxy.io
 * 3) ThingProxy
 * 4) Jina AI Reader endpoint (https://r.jina.ai/) which bypasses Cloudflare/403 blocks
 */
export async function fetchHtmlWithCorsProxy(targetUrl: string): Promise<string | null> {
  console.log(`[LinkParser] Starting multi-stage client fetch for URL: "${targetUrl}"`);

  const proxies: { name: string; getUrl: (u: string) => string }[] = [
    {
      name: 'AllOrigins RAW',
      getUrl: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
    },
    {
      name: 'CorsProxy.io',
      getUrl: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`
    },
    {
      name: 'ThingProxy',
      getUrl: (u) => `https://thingproxy.freeboard.io/fetch/${u}`
    },
    {
      name: 'Jina AI Reader',
      getUrl: (u) => `https://r.jina.ai/${u}`
    }
  ];

  for (let i = 0; i < proxies.length; i++) {
    const proxy = proxies[i];
    const proxyUrl = proxy.getUrl(targetUrl);
    console.log(`[LinkParser] Stage ${i + 1}/${proxies.length}: Requesting via ${proxy.name}...`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const trimmed = text ? text.trim() : '';

        const isBlocked =
          trimmed.includes('Access Denied') ||
          trimmed.includes('Just a moment...') ||
          trimmed.includes('403 Forbidden') ||
          trimmed.includes('enable JavaScript') ||
          trimmed.includes('Attention Required! | Cloudflare');

        if (trimmed && trimmed.length > 80 && !isBlocked) {
          console.log(`[LinkParser] Stage ${i + 1} (${proxy.name}) SUCCESS! Fetched ${trimmed.length} characters.`);
          return trimmed;
        } else {
          console.warn(`[LinkParser] Stage ${i + 1} (${proxy.name}) returned blocked or empty content.`);
        }
      } else {
        console.warn(`[LinkParser] Stage ${i + 1} (${proxy.name}) HTTP status: ${res.status}`);
      }
    } catch (e) {
      console.warn(`[LinkParser] Stage ${i + 1} (${proxy.name}) fetch error:`, e);
    }
  }

  console.error('[LinkParser] All 4 CORS/Scraper proxy stages failed to fetch page content.');
  return null;
}

/**
 * Extract product details using HTML + Gemini API with Key Rotation
 */
export async function parseProductLinkWithGemini(
  targetUrl: string,
  rawHtml?: string,
  keys?: string[]
): Promise<ParsedProductResult> {
  const effectiveKeys = getEffectiveGeminiKeysList(keys);
  
  // Clean HTML if provided and limit length for token efficiency
  const cleanedHtml = rawHtml ? cleanHtmlContent(rawHtml).slice(0, 15000) : '';

  console.log(`[LinkParser] Sending payload to Gemini API (HTML length: ${cleanedHtml.length} chars, Keys available: ${effectiveKeys.length})`);

  const prompt = `You are an expert product detail extractor for an online shopping platform in Dubai, UAE.
Extract details for the product URL: "${targetUrl}".

${cleanedHtml ? `Webpage Content / HTML:\n"""\n${cleanedHtml}\n"""` : ''}

Respond ONLY with a valid JSON object in this exact structure without markdown formatting or code blocks:
{
  "title": "Product Full Title in Persian or English",
  "priceAed": 120.0,
  "originalPriceAed": 150.0,
  "discountPercent": 20,
  "storeName": "Store Name (e.g., Life Pharmacy, Dr. Nutrition, Noon, Amazon, GNC, Sporter)",
  "image": "https://example.com/image.jpg",
  "weightKg": 0.8,
  "brand": "Brand Name",
  "category": "Category Name",
  "description": "Short Persian product description"
}`;

  const responseText = await callGeminiApiWithKeyRotation({
    prompt,
    keys: effectiveKeys,
    models: ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']
  });

  if (!responseText) {
    console.warn('[LinkParser] Gemini API returned empty response across all key rotations.');
    return {
      success: false,
      error: 'امکان استخراج اتوماتیک لینک وجود نداشت؛ لطفاً قیمت درهم را به صورت دستی وارد کنید.'
    };
  }

  try {
    const cleanJsonStr = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const parsed = JSON.parse(cleanJsonStr);
    
    const priceAed = Number(parsed.priceAed || parsed.price_aed) || 0;
    if (parsed && (parsed.title || priceAed > 0)) {
      console.log('[LinkParser] Successfully parsed JSON from Gemini:', parsed.title, priceAed, 'AED');
      const originalPriceAed = Number(parsed.originalPriceAed || parsed.original_price_aed) || 0;
      let discountPercent = Number(parsed.discountPercent) || 0;
      if (!discountPercent && originalPriceAed > priceAed) {
        discountPercent = Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100);
      }

      return {
        success: true,
        title: parsed.title || 'محصول استخراج شده',
        priceAed,
        originalPriceAed: originalPriceAed > priceAed ? originalPriceAed : undefined,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        storeName: parsed.storeName || 'فروشگاه دبی',
        brand: parsed.brand || parsed.storeName || 'برند معتبر',
        category: parsed.category || '💊 مکمل‌های ورزشی',
        image: parsed.image || '',
        images: parsed.image ? [parsed.image] : [],
        weightKg: Number(parsed.weightKg) || 0.8,
        description: parsed.description || 'توضیحات استخراج شده توسط هوش مصنوعی',
        options: parsed.options || ["پیش‌فرض / استاندارد"]
      };
    }
  } catch (err) {
    console.warn('[LinkParser] Error parsing Gemini response JSON:', err, 'Raw response:', responseText);
  }

  return {
    success: false,
    error: 'امکان استخراج اتوماتیک لینک وجود نداشت؛ لطفاً قیمت درهم را به صورت دستی وارد کنید.'
  };
}

/**
 * Universal product link parser.
 * Works seamlessly on hosted domains (Firebase Hosting) and local dev environments.
 * First tries backend route if available (and returns valid JSON).
 * On hosted SPA / CORS error / HTML index fallback / failure, fetches target HTML via client CORS proxy and runs Gemini extraction.
 */
export async function parseProductLinkUniversal(params: {
  url: string;
  geminiKeys?: string[];
  cmsConfig?: any;
}): Promise<ParsedProductResult> {
  const { url, geminiKeys, cmsConfig } = params;
  const targetUrl = url.trim();

  // 1. Try local/backend /api/parse-link endpoint if available
  try {
    const scraperKeyVal = (() => {
      try { return localStorage.getItem('scraper_api_key') || cmsConfig?.apiConfig?.scraperApiKey || ''; } catch (_e) { return cmsConfig?.apiConfig?.scraperApiKey || ''; }
    })();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('/api/parse-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        apiKey: scraperKeyVal,
        scraper_api_key: scraperKeyVal,
        scraperApiKey: scraperKeyVal,
        enable_scraper_api: true,
        geminiApiKeys: geminiKeys,
        geminiApiKey: geminiKeys?.[0] || ''
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data: any = await res.json();
        const priceAed = Number(data?.priceAed || data?.price_aed) || 0;
        if (data && data.title && priceAed > 0) {
          return {
            success: true,
            title: data.title,
            priceAed,
            originalPriceAed: Number(data.originalPriceAed || data.original_price_aed) || undefined,
            discountPercent: Number(data.discountPercent) || undefined,
            storeName: data.storeName || 'دبی',
            brand: data.brand || data.storeName,
            category: data.category,
            image: data.image || data.image_url || '',
            images: data.images || data.galleryImages || (data.image ? [data.image] : []),
            weightKg: Number(data.weightKg) || 0.8,
            description: data.description,
            options: data.options
          };
        }
      }
    }
  } catch (serverErr) {
    console.warn('Backend /api/parse-link skipped or unavailable, falling back to client proxy + Gemini:', serverErr);
  }

  // 2. Client-side CORS proxy + Gemini AI extraction
  try {
    const rawHtml = await fetchHtmlWithCorsProxy(targetUrl);
    const geminiResult = await parseProductLinkWithGemini(targetUrl, rawHtml || undefined, geminiKeys);
    if (geminiResult.success && geminiResult.priceAed && geminiResult.priceAed > 0) {
      return geminiResult;
    }
  } catch (clientErr) {
    console.error('Client-side proxy + Gemini extraction failed:', clientErr);
  }

  // 3. Graceful fallback error message
  return {
    success: false,
    error: 'امکان استخراج اتوماتیک لینک وجود نداشت؛ لطفاً قیمت درهم را به صورت دستی وارد کنید.'
  };
}
