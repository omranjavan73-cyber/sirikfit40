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

// 2. High-Res Image Sanitizer
export const sanitizeImageUrl = (rawImg: string, cleanUrl: string = ''): string => {
  if (!rawImg) return '';
  let str = String(rawImg).trim().replace(/&amp;/g, '&').replace(/^["']|["']$/g, '').trim();
  if (str.startsWith('//')) str = 'https:' + str;
  else if (str.startsWith('/')) {
    try {
      const u = new URL(cleanUrl || 'https://drnutrition.com');
      str = `${u.protocol}//${u.host}${str}`;
    } catch (_e) {
      str = 'https://drnutrition.com' + str;
    }
  } else if (str.startsWith('http://')) str = str.replace('http://', 'https://');
  str = str.split('"')[0].split("'")[0].split('\\')[0].trim();
  return str.replace(/_(?:small|compact|thumb|medium|100x100|150x150|200x200|240x240|300x300)\.(jpe?g|png|webp|avif)/gi, '_1024x1024.$1');
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

// 4. Standard Browser Headers
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

// 5. Bilingual Persian Title Generator
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
    faPrefix = brand ? `مکمل اورجینال ${brand}` : 'مکمل ورزشی اصل';
  }

  return `${faPrefix} (${cleanEng})`;
};

