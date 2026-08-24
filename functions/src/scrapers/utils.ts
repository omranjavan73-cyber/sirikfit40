import * as cheerio from 'cheerio';

// 1. Strict Out-Of-Stock & Disabled Filter
export const isOutOfStockElement = (tagHtml: string, rawText?: string): boolean => {
  if (!tagHtml && !rawText) return false;
  const tag = (tagHtml || '').toLowerCase();
  const text = (rawText || '').toLowerCase();

  if (
    tag.includes('disabled') ||
    tag.includes('aria-disabled="true"') ||
    tag.includes('data-in-stock="false"') ||
    tag.includes('data-available="false"') ||
    tag.includes('data-stock="out"') ||
    tag.includes('data-stock="0"') ||
    tag.includes('data-unavailable="true"') ||
    tag.includes('aria-hidden="true"')
  ) return true;

  const outOfStockClasses = [
    'disabled', 'unavailable', 'out-of-stock', 'out_of_stock', 'sold-out', 'sold_out',
    'is-disabled', 'inactive', 'dimmed', 'strikethrough', 'line-through',
    'is-soldout', 'soldout', 'unavailable-variant', 'disabled-item', 'out-stock',
    'no-stock', 'item-disabled', 'is-unavailable'
  ];
  for (const cls of outOfStockClasses) {
    if (new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'i').test(tag)) return true;
  }

  if (/style=["'][^"']*(?:text-decoration\s*:\s*line-through|opacity\s*:\s*0\.[1-4]|display\s*:\s*none)[^"']*["']/i.test(tag)) return true;
  if (tag.includes('<s>') || tag.includes('<strike>') || tag.includes('<del>') || tag.includes('line-through')) return true;

  const outKeywords = ['out of stock', 'currently unavailable', 'sold out', 'sold-out', 'unavailable', 'ناموجود', 'تمام شد', 'غیرفعال'];
  for (const kw of outKeywords) {
    if (text.includes(kw) || tag.includes(kw)) return true;
  }
  return false;
};

// 2. High-Res Image Sanitizer (Strict Logo / Badge / Icon / SVG Filtering)
export const sanitizeImageUrl = (rawImg: string, cleanUrl: string = ''): string => {
  if (!rawImg || typeof rawImg !== 'string') return '';
  let str = String(rawImg).trim().replace(/&amp;/g, '&').replace(/^["']|["']$/g, '').trim();

  // Filter out inline SVGs or data URLs that are store logos/icons
  if (str.startsWith('data:image/svg') || str.includes('logo') || str.includes('badge') || str.includes('icon') || str.includes('searchIcon') || str.includes('tamara') || str.includes('tabby')) {
    if (!str.includes('product') && !str.includes('catalog') && !str.includes('media')) {
      return '';
    }
  }

  if (str.endsWith('.svg')) return '';

  if (str.startsWith('//')) {
    str = 'https:' + str;
  } else if (str.startsWith('/')) {
    try {
      const u = new URL(cleanUrl || 'https://drnutrition.com');
      str = `${u.protocol}//${u.host}${str}`;
    } catch (_e) {
      str = 'https://drnutrition.com' + str;
    }
  } else if (str.startsWith('http://')) {
    str = str.replace('http://', 'https://');
  }

  str = str.split('"')[0].split("'")[0].split('\\')[0].trim();
  
  // Upgrade Shopify/Magento/E-Commerce thumbnail images to high-res master/1024x1024
  str = str.replace(/_(?:small|compact|thumb|medium|100x100|150x150|200x200|240x240|300x300)\.(jpe?g|png|webp|avif)/gi, '_1024x1024.$1');
  return str;
};

// 3. Digit Normalization
export const normalizeToEnglishDigits = (str: string): string => {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '۸', '٩'];
  let res = String(str);
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(persianDigits[i], 'g'), String(i));
    res = res.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return res;
};

// 4. Exact Price Extractor (Regex + No Dummy Fallbacks)
export const extractPriceNumber = (textOrVal: any): number => {
  if (textOrVal === undefined || textOrVal === null) return 0;
  if (typeof textOrVal === 'number') {
    return isNaN(textOrVal) || textOrVal <= 0 ? 0 : Math.round(textOrVal * 100) / 100;
  }
  const cleanStr = normalizeToEnglishDigits(String(textOrVal)).replace(/,/g, '').trim();
  
  // Try matching AED / Dhs currency regex first
  const currencyMatch = cleanStr.match(/(?:AED|Dhs\.?)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (currencyMatch && currencyMatch[1]) {
    const val = parseFloat(currencyMatch[1]);
    if (!isNaN(val) && val > 0) return Math.round(val * 100) / 100;
  }

  // General float match
  const match = cleanStr.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0 && val < 500000) return Math.round(val * 100) / 100;
  }
  return 0;
};

// 5. Robust Array Deduplication & Cleaner
export const deduplicateStrings = (items: (string | undefined | null)[]): string[] => {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  const invalidPlaceholders = new Set([
    'default', 'standard', 'normal', 'default title', 'پیش‌فرض', 'استاندارد', 'پیش‌فرض / استاندارد', 'none', 'null', 'undefined'
  ]);

  for (const item of items) {
    if (!item || typeof item !== 'string') continue;
    const trimmed = item.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || trimmed.length < 2) continue;
    if (invalidPlaceholders.has(lower)) continue;
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }
  return result;
};

// 6. Standard Browser Headers
export const getStandardScraperHeaders = (targetUrl?: string) => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/json;q=0.9',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8,fa;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1'
});

// 7. Embedded JSON Extractor Helper (__NEXT_DATA__, __INITIAL_STATE__, application/ld+json)
export const extractEmbeddedJsonData = ($: cheerio.CheerioAPI): { nextData?: any; initialState?: any; jsonLd?: any[] } => {
  let nextData: any = null;
  let initialState: any = null;
  const jsonLd: any[] = [];

  try {
    const nextHtml = $('#__NEXT_DATA__').html();
    if (nextHtml) nextData = JSON.parse(nextHtml);
  } catch (_e) {}

  try {
    $('script').each((_, el) => {
      const txt = $(el).html() || '';
      if (txt.includes('window.__INITIAL_STATE__') || txt.includes('__INITIAL_STATE__ =')) {
        const match = txt.match(/__INITIAL_STATE__\s*=\s*({.*?});/s) || txt.match(/__INITIAL_STATE__\s*=\s*({.*})/s);
        if (match && match[1]) {
          try { initialState = JSON.parse(match[1]); } catch (_err) {}
        }
      }
    });
  } catch (_e) {}

  try {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || '{}');
        if (Array.isArray(parsed['@graph'])) {
          jsonLd.push(...parsed['@graph']);
        } else if (Array.isArray(parsed)) {
          jsonLd.push(...parsed);
        } else if (parsed && typeof parsed === 'object') {
          jsonLd.push(parsed);
        }
      } catch (_err) {}
    });
  } catch (_e) {}

  return { nextData, initialState, jsonLd };
};

// 8. Persian Title Translator & Dictionary Helper
export const translateTitleToFa = (enTitle: string, brand: string = ''): string => {
  if (!enTitle) return '';
  let fa = enTitle.toLowerCase();
  const dict: Record<string, string> = {
    'whey protein isolate': 'پروتئین وی ایزوله',
    'whey isolate': 'پروتئین وی ایزوله',
    'whey protein': 'پروتئین وی',
    'mass gainer': 'گینر افزایش وزن',
    'serious mass': 'گینر سیریوس مس',
    'gainer': 'گینر افزایش وزن',
    'creatine monohydrate': 'کراتین مونوهیدرات',
    'creatine powder': 'پودر کراتین خالص',
    'creatine': 'کراتین',
    'bcaa': 'آمینو اسید BCAA',
    'eaa': 'آمینو اسید EAA',
    'pre-workout': 'پمپ قبل تمرین',
    'pre workout': 'پمپ قبل تمرین',
    'multivitamin': 'مولتی ویتامین',
    'multi-vitamin': 'مولتی ویتامین',
    'fish oil': 'روغن ماهی',
    'omega 3': 'امگا ۳',
    'omega-3': 'امگا ۳',
    'glutamine': 'گلوتامین',
    'collagen': 'کلاژن',
    'shaker': 'شیکر ورزشی',
    'isolate': 'ایزوله'
  };
  Object.keys(dict).forEach(key => {
    fa = fa.replace(new RegExp(key, 'gi'), dict[key]);
  });
  const brandPart = brand ? ` ${brand}` : '';
  return `${fa}${brandPart}`.trim().replace(/\b\w/g, l => l.toUpperCase());
};

// 9. Bilingual Persian Title Generator
export const generateBilingualProductTitle = (englishTitle: string, brand?: string): string => {
  if (!englishTitle) return '';
  const cleanEng = englishTitle.replace(/\s*\|\s*.*$/i, '').trim();
  const lower = cleanEng.toLowerCase();

  let faPrefix = '';
  if (lower.includes('creatine monohydrate') || lower.includes('creatine powder')) {
    faPrefix = 'پودر کراتین مونوهیدرات';
  } else if (lower.includes('creatine')) {
    faPrefix = 'کراتین ورزشی خالص';
  } else if (lower.includes('gold standard 100% whey') || lower.includes('whey gold standard')) {
    faPrefix = 'پروتئین وی گلد استاندارد ۱۰۰٪';
  } else if (lower.includes('iso 100') || lower.includes('iso-100') || lower.includes('isolate whey') || lower.includes('whey isolate')) {
    faPrefix = 'پروتئین ایزوله وی خالص';
  } else if (lower.includes('whey protein') || lower.includes('whey')) {
    faPrefix = 'پودر پروتئین وی اصل';
  } else if (lower.includes('mass gainer') || lower.includes('serious mass') || lower.includes('gainer')) {
    faPrefix = 'پودر گینر افزایش وزن و حجم عضلانی';
  } else if (lower.includes('bcaa')) {
    faPrefix = 'مکمل آمینواسید شاخه‌دار BCAA';
  } else if (lower.includes('eaa')) {
    faPrefix = 'مکمل آمینواسیدهای ضروری EAA';
  } else if (lower.includes('pre-workout') || lower.includes('pre workout') || lower.includes('c4 original') || lower.includes('abe ')) {
    faPrefix = 'مکمل پمپ انرژی قبل از تمرین';
  } else if (lower.includes('omega 3') || lower.includes('omega-3') || lower.includes('fish oil')) {
    faPrefix = 'کپسول امگا ۳ و روغن ماهی خالص';
  } else if (lower.includes('collagen')) {
    faPrefix = 'پودر کلاژن پپتاید جوانساز پوست و مفاصل';
  } else if (lower.includes('multivitamin') || lower.includes('multi-vitamin') || lower.includes('daily vitamins')) {
    faPrefix = 'مولتی‌ویتامین و مینرال کامل روزانه';
  } else if (lower.includes('glutamine')) {
    faPrefix = 'پودر گلوتامین ریکاوری عضلات';
  } else {
    faPrefix = translateTitleToFa(cleanEng, brand || '');
  }

  return `${faPrefix} (${cleanEng})`;
};


