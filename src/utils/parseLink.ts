import { getEffectiveGeminiKeysList, callGeminiApiWithKeyRotation } from './geminiKey';
import type { ProductVariantGroup, ProductVariantOption, ProductVariantMatrix, ProductVariantItem } from '../types';

export interface ParsedProductResult {
  success: boolean;
  requireManualEntry?: boolean;
  id?: string;
  title?: string;
  priceAed?: number;
  basePriceAED?: number;
  originalPriceAed?: number;
  discountPercent?: number;
  image?: string;
  mainImage?: string;
  images?: string[];
  galleryImages?: string[];
  videos?: string[];
  features?: string[];
  weightKg?: number;
  storeName?: string;
  sourceStore?: string;
  sourceUrl?: string;
  brand?: string;
  category?: string;
  description?: string;
  inStock?: boolean;
  variants?: any[];
  variantMatrix?: ProductVariantMatrix;
  variantGroups?: ProductVariantGroup[];
  options?: string[];
  flavors?: string[];
  sizes?: string[];
  error?: string;
  message?: string;
}

/**
 * Helper to convert ASCII digits to Persian digits.
 */
export function toPersianDigits(str: string): string {
  if (!str) return '';
  const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => digits[parseInt(w, 10)]);
}

/**
 * Formats product titles into an elegant bilingual structure:
 * [معادل و ویژگی‌های اصلی به فارسی] (Original English Title)
 */
export function generateBilingualProductTitle(rawTitle: string, storeName?: string, brand?: string): string {
  if (!rawTitle) return 'مکمل اورجینال امارات';

  const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();
  if (!cleanTitle) return 'مکمل اورجینال امارات';

  // If already bilingual (e.g., contains Persian text followed by English in parentheses)
  if (/[\u0600-\u06FF]/.test(cleanTitle) && /\([A-Za-z0-9\s.,%&+\-/'"]+\)/.test(cleanTitle)) {
    return cleanTitle;
  }

  // If the title is purely Persian without English letters
  if (/[\u0600-\u06FF]/.test(cleanTitle) && !/[a-zA-Z]{3,}/.test(cleanTitle)) {
    return cleanTitle;
  }

  try {
    const lower = cleanTitle.toLowerCase();
    const parts: string[] = [];

    // 1. Form / Package Type
    let formPrefix = '';
    if (/\bcapsules?\b|\bcaps?\b/i.test(cleanTitle)) {
      formPrefix = 'کپسول';
    } else if (/\btablets?\b|\btabs?\b/i.test(cleanTitle)) {
      formPrefix = 'قرص';
    } else if (/\bsoftgels?\b|\bsoftgel\b/i.test(cleanTitle)) {
      formPrefix = 'کپسول ژله‌ای';
    } else if (/\bgummies\b|\bgummy\b/i.test(cleanTitle)) {
      formPrefix = 'پاستیل';
    } else if (/\bpowders?\b/i.test(cleanTitle)) {
      formPrefix = 'پودر';
    } else if (/\bliquid\b/i.test(cleanTitle)) {
      formPrefix = 'شربت و مایع';
    }

    // 2. Main Supplement / Product Category
    let categoryPersian = '';
    if (/whey\s+isolate/i.test(lower)) {
      categoryPersian = 'پروتئین وی ایزوله';
    } else if (/whey/i.test(lower)) {
      categoryPersian = 'پروتئین وی';
    } else if (/creatine\s+monohydrate/i.test(lower)) {
      categoryPersian = 'پودر کراتین مونوهیدرات';
    } else if (/creatine/i.test(lower)) {
      categoryPersian = 'پودر کراتین';
    } else if (/bcaa/i.test(lower)) {
      categoryPersian = 'مکمل بیسیایای (BCAA)';
    } else if (/amino/i.test(lower)) {
      categoryPersian = 'مکمل آمینو اسید';
    } else if (/glutamine/i.test(lower)) {
      categoryPersian = 'پودر گلوتامین';
    } else if (/gainer|mass/i.test(lower)) {
      categoryPersian = 'مکمل گینر افزایش وزن';
    } else if (/pre\s*-\s*workout|preworkout/i.test(lower)) {
      categoryPersian = 'پمپ و مکمل قبل از تمرین';
    } else if (/carnitine|l-carnitine/i.test(lower)) {
      categoryPersian = 'مکمل ال‌کارنیتین';
    } else if (/fat\s+burner|burner/i.test(lower)) {
      categoryPersian = 'مکمل چربی‌سوز';
    } else if (/prenatal/i.test(lower)) {
      categoryPersian = 'مکمل بارداری و پریناتال';
    } else if (/omega\s*3|fish\s+oil/i.test(lower)) {
      categoryPersian = 'روغن ماهی امگا ۳';
    } else if (/multivitamin|multi\s*vitamin|multi/i.test(lower)) {
      categoryPersian = 'مکمل مولتی‌ویتامین';
    } else if (/collagen/i.test(lower)) {
      categoryPersian = 'پودر و مکمل کلاژن';
    } else if (/ashwagandha/i.test(lower)) {
      categoryPersian = 'مکمل گیاهی آشواگاندا';
    } else if (/magnesium/i.test(lower)) {
      categoryPersian = 'مکمل منیزیم';
    } else if (/zinc/i.test(lower)) {
      categoryPersian = 'مکمل زینک';
    } else if (/vitamin\s+c/i.test(lower)) {
      categoryPersian = 'ویتامین C';
    } else if (/vitamin\s+d/i.test(lower)) {
      categoryPersian = 'ویتامین D3';
    } else if (/biotin/i.test(lower)) {
      categoryPersian = 'مکمل بیوتین';
    } else if (/peanut\s+butter/i.test(lower)) {
      categoryPersian = 'کره بادام زمینی';
    } else if (/shaker/i.test(lower)) {
      categoryPersian = 'شیکر و قمقمه ورزشی';
    }

    if (formPrefix && categoryPersian.startsWith(formPrefix)) {
      formPrefix = '';
    }

    if (formPrefix) parts.push(formPrefix);
    if (categoryPersian) parts.push(categoryPersian);

    // 3. Gender / Attributes
    if (/women|female/i.test(lower) && !parts.some(p => p.includes('پریناتال') || p.includes('زنانه'))) {
      parts.push('زنانه');
    } else if (/men|male/i.test(lower) && !parts.some(p => p.includes('مردانه'))) {
      parts.push('مردانه');
    }

    if (/100%/i.test(lower) && !parts.some(p => p.includes('۱۰۰٪'))) {
      parts.push('۱۰۰٪');
    }

    if (/gold\s+standard/i.test(lower) && !parts.some(p => p.includes('گلد استاندارد'))) {
      parts.push('گلد استاندارد');
    }

    if (/organic/i.test(lower) && !parts.some(p => p.includes('ارگانیک'))) {
      parts.push('ارگانیک');
    }

    // 4. Weight / Size / Quantity
    const kgMatch = cleanTitle.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos|kilogram)/i);
    if (kgMatch && kgMatch[1]) {
      const pNum = toPersianDigits(kgMatch[1]);
      parts.push(`${pNum} کیلوگرمی`);
    } else {
      const lbsMatch = cleanTitle.match(/(\d+(?:\.\d+)?)\s*(?:lbs|lb)/i);
      if (lbsMatch && lbsMatch[1]) {
        const lbsVal = parseFloat(lbsMatch[1]);
        if (lbsVal === 5) {
          parts.push('۲.۲ کیلوگرمی');
        } else {
          const pNum = toPersianDigits(lbsMatch[1]);
          parts.push(`${pNum} پوندی`);
        }
      } else {
        const gMatch = cleanTitle.match(/(\d+)\s*(?:g|gram|grams)\b/i);
        if (gMatch && gMatch[1] && parseInt(gMatch[1], 10) >= 30) {
          const pNum = toPersianDigits(gMatch[1]);
          parts.push(`${pNum} گرمی`);
        }
      }
    }

    const countMatch = cleanTitle.match(/(\d+)\s*(?:capsules?|caps?|tablets?|tabs?|softgels?|gummies|count)\b/i);
    if (countMatch && countMatch[1]) {
      const pNum = toPersianDigits(countMatch[1]);
      parts.push(`${pNum} عددی`);
    } else {
      const servMatch = cleanTitle.match(/(\d+)\s*(?:servings?|serv)\b/i);
      if (servMatch && servMatch[1]) {
        const pNum = toPersianDigits(servMatch[1]);
        parts.push(`${pNum} سروینگ`);
      }
    }

    let persianPrefix = parts.join(' ').trim();

    if (!persianPrefix) {
      if (brand || storeName) {
        persianPrefix = `مکمل اورجینال ${brand || storeName}`;
      } else {
        persianPrefix = 'مکمل تخصصی و اورجینال';
      }
    }

    return `${persianPrefix} (${cleanTitle})`;
  } catch (err) {
    console.warn('[LinkParser] Error generating bilingual title, falling back to original English title:', err);
    return cleanTitle;
  }
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
 * Stage 1: Ultra-Fast Primary Extractor using Microlink API.
 * Microlink uses cloud instances to bypass Cloudflare 403 blocks and return normalized OpenGraph data.
 */
export async function fetchWithMicrolink(targetUrl: string): Promise<{
  title?: string;
  image?: string;
  description?: string;
  publisher?: string;
  priceAed?: number;
  rawText?: string;
} | null> {
  console.log(`[LinkParser] [Microlink] Fetching metadata for: "${targetUrl}"`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&prerender=auto`;
    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        const data = json.data;
        const title = data.title ? String(data.title).trim() : undefined;
        const description = data.description ? String(data.description).trim() : undefined;
        const publisher = data.publisher ? String(data.publisher).trim() : undefined;
        const image = data.image?.url || data.logo?.url || undefined;

        console.log(`[LinkParser] [Microlink] Success! Title: "${title}", Publisher: "${publisher}"`);

        // Try extracting AED price directly from title & description text
        let priceAed: number | undefined = undefined;
        const combinedText = `${title || ''} ${description || ''}`;
        const priceMatch = combinedText.match(/(?:AED|Dhs|د\.إ)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:AED|Dhs|د\.إ)/i);
        if (priceMatch) {
          const rawVal = priceMatch[1] || priceMatch[2];
          if (rawVal) {
            const parsed = parseFloat(rawVal.replace(/,/g, ''));
            if (!isNaN(parsed) && parsed > 0) {
              priceAed = parsed;
              console.log(`[LinkParser] [Microlink] Extracted price from text: ${priceAed} AED`);
            }
          }
        }

        return {
          title,
          image,
          description,
          publisher,
          priceAed,
          rawText: combinedText
        };
      }
    } else {
      console.warn(`[LinkParser] [Microlink] HTTP Status ${res.status}`);
    }
  } catch (err) {
    console.warn('[LinkParser] [Microlink] Fetch failed:', err);
  }
  return null;
}

/**
 * Stage 2: Secondary Extractor using ScraperAPI if an API key is available.
 * Bypasses Cloudflare completely with residential proxy IPs.
 */
export async function fetchWithScraperApi(targetUrl: string, apiKey: string): Promise<string | null> {
  if (!apiKey || !apiKey.trim()) return null;

  console.log(`[LinkParser] [ScraperAPI] Requesting via ScraperAPI for: "${targetUrl}"`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const scraperUrl = `https://api.scraperapi.com?api_key=${encodeURIComponent(apiKey.trim())}&url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(scraperUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text();
      if (html && html.length > 200 && !html.includes('Attention Required! | Cloudflare')) {
        console.log(`[LinkParser] [ScraperAPI] Success! Fetched ${html.length} chars of HTML.`);
        return html;
      }
    } else {
      console.warn(`[LinkParser] [ScraperAPI] HTTP status ${res.status}`);
    }
  } catch (err) {
    console.warn('[LinkParser] [ScraperAPI] Fetch failed:', err);
  }
  return null;
}

/**
 * Stage 3: Multi-proxy CORS & Jina Reader Fallback Pipeline.
 */
export async function fetchHtmlWithCorsProxy(targetUrl: string): Promise<string | null> {
  console.log(`[LinkParser] Starting fallback multi-stage client fetch for URL: "${targetUrl}"`);

  const proxies: { name: string; getUrl: (u: string) => string }[] = [
    {
      name: 'Jina AI Reader',
      getUrl: (u) => `https://r.jina.ai/${u}`
    },
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
    }
  ];

  for (let i = 0; i < proxies.length; i++) {
    const proxy = proxies[i];
    const proxyUrl = proxy.getUrl(targetUrl);
    console.log(`[LinkParser] Fallback Stage ${i + 1}/${proxies.length}: Requesting via ${proxy.name}...`);

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
          console.log(`[LinkParser] Fallback Stage ${i + 1} (${proxy.name}) SUCCESS! Fetched ${trimmed.length} characters.`);
          return trimmed;
        } else {
          console.warn(`[LinkParser] Fallback Stage ${i + 1} (${proxy.name}) returned blocked or empty content.`);
        }
      } else {
        console.warn(`[LinkParser] Fallback Stage ${i + 1} (${proxy.name}) HTTP status: ${res.status}`);
      }
    } catch (e) {
      console.warn(`[LinkParser] Fallback Stage ${i + 1} (${proxy.name}) fetch error:`, e);
    }
  }

  console.error('[LinkParser] All fallback CORS/Scraper proxy stages failed.');
  return null;
}

/**
 * High-Speed, Lightweight OpenGraph / JSON-LD HTML Metadata Extractor.
 * Bypasses AI for instant (sub-second) parsing when valid e-commerce meta tags or JSON-LD are found.
 */
export function parseHtmlMetadata(html: string, targetUrl: string): ParsedProductResult | null {
  if (!html || html.length < 50) return null;

  let title = '';
  let priceAed = 0;
  let originalPriceAed = 0;
  let image = '';
  let storeName = '';
  let brand = '';

  // Extract domain-based store name as intelligent fallback
  try {
    const parsedUrl = new URL(targetUrl);
    const host = parsedUrl.hostname.replace(/^www\./i, '');
    if (host.includes('drnutrition')) storeName = 'Dr. Nutrition';
    else if (host.includes('lifepharmacy')) storeName = 'Life Pharmacy';
    else if (host.includes('sporter')) storeName = 'Sporter';
    else if (host.includes('gnc')) storeName = 'GNC';
    else if (host.includes('noon')) storeName = 'Noon';
    else if (host.includes('amazon')) storeName = 'Amazon';
    else {
      const parts = host.split('.');
      if (parts[0]) {
        storeName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }
  } catch (_e) {
    storeName = 'فروشگاه دبی';
  }

  // 1. Try parsing Schema.org JSON-LD scripts first
  const jsonLdMatches = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const tag of jsonLdMatches) {
      try {
        const jsonText = tag.replace(/<script\b[^>]*>/i, '').replace(/<\/script>/i, '').trim();
        const data = JSON.parse(jsonText);

        const inspectSchema = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;

          if (Array.isArray(obj)) {
            obj.forEach(inspectSchema);
            return;
          }

          if (obj['@graph'] && Array.isArray(obj['@graph'])) {
            obj['@graph'].forEach(inspectSchema);
            return;
          }

          // Title
          if (!title && (obj.name || obj.headline)) {
            title = String(obj.name || obj.headline).trim();
          }

          // Image
          if (!image) {
            if (typeof obj.image === 'string') image = obj.image;
            else if (Array.isArray(obj.image) && typeof obj.image[0] === 'string') image = obj.image[0];
            else if (obj.image && typeof obj.image.url === 'string') image = obj.image.url;
          }

          // Brand
          if (!brand) {
            if (typeof obj.brand === 'string') brand = obj.brand;
            else if (obj.brand && typeof obj.brand.name === 'string') brand = obj.brand.name;
          }

          // Offers / Price
          const offers = obj.offers || obj;
          const processOffer = (off: any) => {
            if (!off || typeof off !== 'object') return;
            const rawVal = String(off.price || off.lowPrice || off.priceAmount || '');
            const parsedNum = parseFloat(rawVal.replace(/,/g, '').replace(/[^0-9.]/g, ''));
            if (!isNaN(parsedNum) && parsedNum > 0 && priceAed === 0) {
              priceAed = parsedNum;
            }
            const rawOrig = String(off.highPrice || '');
            const parsedOrig = parseFloat(rawOrig.replace(/,/g, '').replace(/[^0-9.]/g, ''));
            if (!isNaN(parsedOrig) && parsedOrig > priceAed) {
              originalPriceAed = parsedOrig;
            }
          };

          if (Array.isArray(offers)) {
            offers.forEach(processOffer);
          } else if (typeof offers === 'object') {
            processOffer(offers);
          }
        };

        inspectSchema(data);
      } catch (_e) {
        // Skip invalid JSON-LD block
      }
    }
  }

  // 2. OpenGraph & Meta Tag regex extraction if title or price missing
  if (!priceAed) {
    const priceMetaMatches = [
      /<meta\b[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["']/i,
      /<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["'](?:product:price:amount|og:price:amount)["']/i,
      /<meta\b[^>]*name=["'](?:price|product:price|twitter:data1|amount)["'][^>]*content=["']([^"']+)["']/i,
      /<meta\b[^>]*itemprop=["']price["'][^>]*content=["']([^"']+)["']/i
    ];
    for (const rx of priceMetaMatches) {
      const m = html.match(rx);
      if (m && m[1]) {
        const parsed = parseFloat(m[1].replace(/,/g, '').replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          priceAed = parsed;
          break;
        }
      }
    }
  }

  if (!title) {
    const titleMetaMatches = [
      /<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
      /<meta\b[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i,
      /<title\b[^>]*>([^<]+)<\/title>/i
    ];
    for (const rx of titleMetaMatches) {
      const m = html.match(rx);
      if (m && m[1]) {
        const cleanTitle = m[1]
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        if (cleanTitle) {
          title = cleanTitle;
          break;
        }
      }
    }
  }

  if (!image) {
    const imageMetaMatches = [
      /<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta\b[^>]*property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
      /<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /<meta\b[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i
    ];
    for (const rx of imageMetaMatches) {
      const m = html.match(rx);
      if (m && m[1]) {
        image = m[1].trim();
        if (image) break;
      }
    }
  }

  if (!storeName || storeName === 'فروشگاه دبی') {
    const siteNameMatch = html.match(/<meta\b[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
    if (siteNameMatch && siteNameMatch[1]) {
      storeName = siteNameMatch[1].trim();
    }
  }

  // 3. Return high-speed result if price and title are found
  if (priceAed > 0 && title) {
    const formattedTitle = generateBilingualProductTitle(title, storeName, brand);
    console.log(`[LinkParser] Fast No-AI Metadata Extraction SUCCESS! Title: "${formattedTitle}", Price: ${priceAed} AED`);

    let discountPercent: number | undefined = undefined;
    if (originalPriceAed > priceAed) {
      discountPercent = Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100);
    }

    return {
      success: true,
      title: formattedTitle,
      priceAed,
      originalPriceAed: originalPriceAed > priceAed ? originalPriceAed : undefined,
      discountPercent,
      storeName: storeName || 'فروشگاه دبی',
      brand: brand || storeName || 'برند معتبر',
      category: '💊 مکمل‌های ورزشی',
      image: image || '',
      images: image ? [image] : [],
      weightKg: 0.8,
      description: `محصول اورجینال با ضمانت اصالت ۱۰۰٪ از ${storeName || 'فروشگاه‌های معتبر دبی'}`,
      options: ["پیش‌فرض / استاندارد"]
    };
  }

  console.log(`[LinkParser] Fast Metadata Parsing did not yield valid price (found title: "${title}", price: ${priceAed}). Falling back to Gemini AI.`);
  return null;
}

/**
 * Extract product details using text/HTML + Gemini API with Key Rotation.
 * Gemini strictly returns JSON structure: { title, priceAed, originalPriceAed, discountPercent, storeName, image, galleryImages, variantGroups, weightKg, brand, category, description }.
 */
export async function parseProductLinkWithGemini(
  targetUrl: string,
  rawContent?: string,
  keys?: string[]
): Promise<ParsedProductResult> {
  const effectiveKeys = getEffectiveGeminiKeysList(keys);
  
  // Clean HTML/Text if provided and limit length for token efficiency
  const cleanedContent = rawContent ? cleanHtmlContent(rawContent).slice(0, 15000) : '';

  console.log(`[LinkParser] Sending payload to Gemini API (Content length: ${cleanedContent.length} chars, Keys available: ${effectiveKeys.length})`);

  const prompt = `You are an expert product detail extractor for an online shopping platform in Dubai, UAE.
Extract details for the product URL: "${targetUrl}".

${cleanedContent ? `Webpage Content / Metadata:\n"""\n${cleanedContent}\n"""` : ''}

Respond ONLY with a valid JSON object in this exact structure without markdown formatting or code blocks:
{
  "title": "Product Full Title in English or Persian",
  "priceAed": 120.0,
  "originalPriceAed": 150.0,
  "discountPercent": 20,
  "storeName": "Store Name (e.g., Life Pharmacy, Dr. Nutrition, Noon, Amazon, GNC, Sporter)",
  "image": "https://example.com/main-image.jpg",
  "galleryImages": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg"
  ],
  "weightKg": 0.8,
  "brand": "Brand Name",
  "category": "Category Name",
  "description": "Short Persian product description",
  "variantMatrix": {
    "sizes": ["60 Servings", "120 Servings"],
    "flavors": ["Chocolate", "Vanilla"],
    "items": [
      {
        "id": "v1",
        "title": "60 Servings / Chocolate",
        "size": "60 Servings",
        "flavor": "Chocolate",
        "priceAED": 160.95,
        "originalPriceAED": 199.0,
        "inStock": true
      },
      {
        "id": "v2",
        "title": "120 Servings / Chocolate",
        "size": "120 Servings",
        "flavor": "Chocolate",
        "priceAED": 242.95,
        "originalPriceAED": 299.0,
        "inStock": true
      }
    ]
  },
  "variantGroups": [
    {
      "id": "flavors",
      "name": "طعم (Flavor)",
      "type": "flavor",
      "options": [
        { "id": "f1", "name": "وانیل (Vanilla)", "priceAed": 120.0 },
        { "id": "f2", "name": "شکلات (Chocolate)", "priceAed": 120.0 }
      ]
    },
    {
      "id": "sizes",
      "name": "وزن / سایز (Size)",
      "type": "size",
      "options": [
        { "id": "s1", "name": "۶۰ سروینگ (60 Servings)", "priceAed": 160.95 },
        { "id": "s2", "name": "۱۲۰ سروینگ (120 Servings)", "priceAed": 242.95 }
      ]
    }
  ]
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

      const storeName = parsed.storeName || 'فروشگاه دبی';
      const brandName = parsed.brand || storeName || 'برند معتبر';
      const formattedTitle = generateBilingualProductTitle(parsed.title || 'محصول استخراج شده', storeName, brandName);

      const mainImg = parsed.image || '';
      const rawGallery = Array.isArray(parsed.galleryImages)
        ? parsed.galleryImages.filter((g: any) => typeof g === 'string' && g.trim() !== '')
        : (Array.isArray(parsed.images) ? parsed.images : []);
      
      const galleryImages = Array.from(new Set([mainImg, ...rawGallery].filter(Boolean)));

      // Process variant groups
      let variantGroups: ProductVariantGroup[] = [];
      if (Array.isArray(parsed.variantGroups) && parsed.variantGroups.length > 0) {
        variantGroups = parsed.variantGroups.map((vg: any, gIdx: number) => ({
          id: vg.id || `group-${gIdx}`,
          name: vg.name || (vg.type === 'size' ? 'وزن / سایز (Size)' : 'طعم (Flavor)'),
          type: vg.type || (vg.name?.includes('وزن') || vg.name?.includes('سایز') || vg.name?.includes('Size') ? 'size' : 'flavor'),
          options: (Array.isArray(vg.options) ? vg.options : []).map((opt: any, oIdx: number) => ({
            id: opt.id || `opt-${gIdx}-${oIdx}`,
            name: typeof opt === 'string' ? opt : (opt.name || opt.title || `گزینه ${oIdx + 1}`),
            priceAed: Number(opt.priceAed || opt.priceAED || opt.price || priceAed) || priceAed,
            priceAED: Number(opt.priceAED || opt.priceAed || opt.price || priceAed) || priceAed,
            originalPriceAed: Number(opt.originalPriceAed || opt.originalPriceAED || opt.originalPrice || 0) || undefined,
            originalPriceAED: Number(opt.originalPriceAED || opt.originalPriceAed || opt.originalPrice || 0) || undefined,
            image: opt.image || undefined,
            inStock: opt.inStock !== false
          }))
        }));
      }

      const extractedFlavors: string[] = [];
      const extractedSizes: string[] = [];
      variantGroups.forEach(vg => {
        if (vg.type === 'size') {
          vg.options.forEach(opt => {
            if (opt.name && !extractedSizes.includes(opt.name)) extractedSizes.push(opt.name);
          });
        } else {
          vg.options.forEach(opt => {
            if (opt.name && !extractedFlavors.includes(opt.name)) extractedFlavors.push(opt.name);
          });
        }
      });

      // Construct Unified ProductVariantMatrix
      const matrixItems: ProductVariantItem[] = [];
      if (parsed.variantMatrix && Array.isArray(parsed.variantMatrix.items)) {
        parsed.variantMatrix.items.forEach((item: any, idx: number) => {
          const itemTitle = item.title || item.name || '';
          const itemPrice = Number(item.priceAED || item.priceAed || item.price || priceAed) || priceAed;
          const itemOrigPrice = Number(item.originalPriceAED || item.originalPriceAed || item.originalPrice || 0) || undefined;
          matrixItems.push({
            id: item.id || `matrix-${idx}`,
            title: itemTitle || `گزینه ${idx + 1}`,
            name: itemTitle || `گزینه ${idx + 1}`,
            size: item.size,
            flavor: item.flavor,
            priceAED: itemPrice,
            priceAed: itemPrice,
            originalPriceAED: itemOrigPrice,
            originalPriceAed: itemOrigPrice,
            image: item.image,
            inStock: item.inStock !== false
          });
        });
      }

      // If matrix items is empty, generate from variantGroups
      if (matrixItems.length === 0 && variantGroups.length > 0) {
        variantGroups.forEach(vg => {
          vg.options.forEach((opt, optIdx) => {
            matrixItems.push({
              id: opt.id || `opt-${optIdx}`,
              title: opt.name,
              name: opt.name,
              size: vg.type === 'size' ? opt.name : undefined,
              flavor: vg.type === 'flavor' ? opt.name : undefined,
              priceAED: opt.priceAed || priceAed,
              priceAed: opt.priceAed || priceAed,
              originalPriceAED: opt.originalPriceAed,
              originalPriceAed: opt.originalPriceAed,
              image: opt.image,
              inStock: opt.inStock !== false
            });
          });
        });
      }

      const variantMatrix: ProductVariantMatrix = {
        sizes: parsed.variantMatrix?.sizes || extractedSizes,
        flavors: parsed.variantMatrix?.flavors || extractedFlavors,
        items: matrixItems,
        selectedVariant: matrixItems[0]
      };

      return {
        success: true,
        title: formattedTitle,
        priceAed,
        originalPriceAed: originalPriceAed > priceAed ? originalPriceAed : undefined,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        storeName,
        brand: brandName,
        category: parsed.category || '💊 مکمل‌های ورزشی',
        image: mainImg,
        images: galleryImages,
        galleryImages,
        weightKg: Number(parsed.weightKg) || 0.8,
        description: parsed.description || 'محصول اورجینال با ضمانت اصالت ۱۰۰٪ دبی و بسته‌بندی پلمپ شرکتی',
        variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
        variantMatrix,
        variants: matrixItems,
        flavors: variantMatrix.flavors.length > 0 ? variantMatrix.flavors : (parsed.flavors || []),
        sizes: variantMatrix.sizes.length > 0 ? variantMatrix.sizes : (parsed.sizes || []),
        options: parsed.options || [...variantMatrix.flavors, ...variantMatrix.sizes]
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
 * Blazing fast, Cloudflare-bypassing client-side architecture:
 * 1. Try local/backend /api/parse-link endpoint if available.
 * 2. Primary Extractor: Microlink API (Ultra-Fast OpenGraph & Cloudflare Bypass).
 * 3. Secondary Extractor: ScraperAPI if scraperApiKey is provided in settings/localStorage.
 * 4. Fallback pipeline: Jina AI Reader & CORS proxies + OpenGraph Regex.
 * 5. Gemini AI extraction fallback with key rotation.
 */
export async function parseProductLinkUniversal(params: {
  url: string;
  geminiKeys?: string[];
  cmsConfig?: any;
}): Promise<ParsedProductResult> {
  const { url, geminiKeys, cmsConfig } = params;
  const targetUrl = url.trim();

  const scraperKeyVal = (() => {
    try {
      return localStorage.getItem('scraper_api_key') || cmsConfig?.apiConfig?.scraperApiKey || '';
    } catch (_e) {
      return cmsConfig?.apiConfig?.scraperApiKey || '';
    }
  })();

  const defaultErrorMsg = "در حال حاضر امکان استخراج خودکار اطلاعات این لینک وجود ندارد. لطفاً چند لحظه بعد مجدداً تلاش فرمایید.";

  // Call backend /api/parse-link Microservice
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('/api/parse-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        apiKey: scraperKeyVal,
        scraperApiKey: scraperKeyVal,
        geminiApiKeys: geminiKeys,
        geminiApiKey: geminiKeys?.[0] || ''
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data: any = await res.json();
    const priceAed = Number(data?.priceAed || data?.price_aed || data?.price) || 0;

    if (data && (data.success === true || data.ok === true) && data.title && priceAed > 0) {
      const storeName = data.storeName || data.brand || 'دبی';
      const brandName = data.brand || storeName;
      const formattedTitle = generateBilingualProductTitle(data.title, storeName, brandName);

      const mainImg = data.image || data.mainImage || data.image_url || '';
      const rawGallery = Array.isArray(data.galleryImages) 
        ? data.galleryImages 
        : (Array.isArray(data.images) ? data.images : []);
      const galleryImages = Array.from(new Set([mainImg, ...rawGallery].filter(Boolean)));

      // Process variant groups
      let variantGroups: ProductVariantGroup[] = [];
      if (Array.isArray(data.variantGroups) && data.variantGroups.length > 0) {
        variantGroups = data.variantGroups;
      } else {
        const flavors = Array.isArray(data.flavors) ? data.flavors : [];
        const sizes = Array.isArray(data.sizes) ? data.sizes : [];
        if (flavors.length > 0) {
          variantGroups.push({
            id: 'group-flavors',
            name: 'طعم (Flavor)',
            type: 'flavor',
            options: flavors.map((f: string, idx: number) => ({
              id: `flv-${idx}`,
              name: f,
              priceAed: priceAed,
              inStock: true
            }))
          });
        }
        if (sizes.length > 0) {
          variantGroups.push({
            id: 'group-sizes',
            name: 'وزن / سایز (Size)',
            type: 'size',
            options: sizes.map((s: string, idx: number) => ({
              id: `sz-${idx}`,
              name: s,
              priceAed: priceAed,
              inStock: true
            }))
          });
        }
      }

      return {
        success: true,
        id: data.id || `scraped-${Date.now()}`,
        title: formattedTitle,
        priceAed,
        basePriceAED: priceAed,
        originalPriceAed: Number(data.originalPriceAed || data.original_price_aed) || undefined,
        discountPercent: Number(data.discountPercent) || undefined,
        storeName,
        sourceStore: storeName,
        sourceUrl: targetUrl,
        brand: brandName,
        category: data.category || '💊 مکمل‌های ورزشی',
        image: mainImg,
        mainImage: mainImg,
        images: galleryImages,
        galleryImages,
        weightKg: Number(data.weightKg) || 0.8,
        description: data.description,
        inStock: data.inStock !== false,
        variants: data.variants || [],
        variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
        options: data.options,
        flavors: data.flavors || [],
        sizes: data.sizes || []
      };
    }

    // Backend returned extraction failure -> Return Tier 4 structured error directly.
    // DO NOT trigger browser-side CORS proxy attempts.
    return {
      success: false,
      requireManualEntry: true,
      error: data?.message || defaultErrorMsg,
      message: data?.message || defaultErrorMsg,
      title: "",
      priceAed: 0,
      image: ""
    };
  } catch (serverErr) {
    console.warn('Backend /api/parse-link microservice call failed:', serverErr);
    return {
      success: false,
      requireManualEntry: true,
      error: defaultErrorMsg,
      message: defaultErrorMsg,
      title: "",
      priceAed: 0,
      image: ""
    };
  }
}

