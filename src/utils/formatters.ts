import { getSafeItem } from './safeStorage';
import { extractUrlAndCaption } from './urlHelper';

export { extractUrlAndCaption } from './urlHelper';

// Helper utilities for Persian formatting and exchange rate resolution

export function toPersianDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/\d/g, (digit) => persianDigits[parseInt(digit, 10)]);
}

export function normalizeToEnglishDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = String(str);
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(persianDigits[i], 'g'), String(i));
    res = res.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return res;
}

export function cleanIranianMobile(phone: string | number | null | undefined): string {
  if (!phone) return '';
  let clean = normalizeToEnglishDigits(String(phone)).replace(/[^0-9+]/g, '');
  if (clean.startsWith('+98')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('98') && clean.length === 12) {
    clean = '0' + clean.slice(2);
  } else if (clean.startsWith('9') && clean.length === 10) {
    clean = '0' + clean;
  }
  return clean;
}

export function isValidIranianMobile(phone: string | number | null | undefined): boolean {
  const clean = cleanIranianMobile(phone);
  return /^09[0-9]{9}$/.test(clean);
}

export function cleanPostalCode(code: string | number | null | undefined): string {
  if (!code) return '';
  return normalizeToEnglishDigits(String(code)).replace(/[^0-9]/g, '');
}

export function isValidPostalCode(code: string | number | null | undefined): boolean {
  const clean = cleanPostalCode(code);
  return /^[0-9]{10}$/.test(clean);
}

export function formatToman(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '۰ تومان';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) return '۰ تومان';
  const formatted = Math.round(num).toLocaleString('fa-IR');
  return `${formatted} تومان`;
}

export function formatPrice(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '۰';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) return '۰';
  return Math.round(num).toLocaleString('fa-IR');
}

export function formatAed(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 AED';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num) || num === 0) return '0 AED';
  const formatted = Number.isInteger(num)
    ? num.toLocaleString('en-US')
    : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} AED`;
}

export function formatAedValue(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num) || num === 0) return '0';
  return Number.isInteger(num)
    ? num.toLocaleString('en-US')
    : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPersianDate(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '';
  try {
    const date = typeof dateInput === 'number' || typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return String(dateInput);
  }
}

export function calculateFinalToman(
  priceAed: number,
  weightKg: number,
  cargoRatePerKg: number,
  profitMarginPercent: number,
  aedRate: number
): number {
  const cargoCostAed = weightKg * cargoRatePerKg;
  const subtotalAed = priceAed + cargoCostAed;
  const withProfitAed = subtotalAed * (1 + profitMarginPercent / 100);
  const rawToman = withProfitAed * aedRate;
  if (!rawToman || rawToman <= 0) return 0;
  return Math.floor(rawToman / 1000) * 1000;
}

/**
 * Preprocesses and sanitizes user input containing product links.
 * 1. Locate position where "http://" or "https://" starts in user input.
 * 2. Completely DISCARD and REMOVE all text that appears BEFORE "http://" or "https://".
 * 3. Extract ONLY the URL string starting from "http://" or "https://" up to the first space or end of string.
 * 4. Return ONLY this extracted clean URL.
 */
export function deduplicateImageUrls(
  images: (string | null | undefined)[],
  fallback?: string
): string[] {
  if (!Array.isArray(images)) return fallback ? [fallback] : [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of images) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('data:image/svg')) continue;

    // Filter out dummy icon placeholders, flags, pixel trackers
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('icon-') ||
      lower.includes('/icon_') ||
      lower.includes('pixel.gif') ||
      lower.includes('placeholder.png') ||
      lower.includes('flag-') ||
      lower.includes('sprite.') ||
      lower.includes('logo_') ||
      lower.includes('/logo.')
    ) {
      continue;
    }

    // Normalize URL key (ignoring small resizing query params so high-res versions match)
    let key = trimmed;
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const u = new URL(trimmed);
        key = `${u.origin}${u.pathname}`.toLowerCase().replace(/\/+$/, '');
      }
    } catch (_e) {
      key = trimmed.toLowerCase().split('?')[0];
    }

    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }

  if (result.length === 0 && fallback) {
    return [fallback];
  }
  return result;
}

export function extractCleanUrl(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const { cleanUrl } = extractUrlAndCaption(input);
  return cleanUrl;
}


/**
 * Admin Rate History Fallback Architecture for AED Exchange Rate:
 * Fallback order:
 * 1. direct localStorage key ('sirikfit_aed_rate')
 * 2. localStorage ('sirikfit_financial_settings' -> exchangeRate or aedRate)
 * 3. settings props
 * 4. cms props
 * 5. Return 0 if uninitialized (no hardcoded fallback)
 */
export function getEffectiveAedRate(
  settings?: { aedRate?: number | null; manualAedRate?: number | null; exchangeRate?: number | null } | null,
  cms?: any
): number {
  // 1. Direct localStorage key
  const directLocal = getSafeItem<string>('sirikfit_aed_rate', '');
  if (directLocal) {
    const num = parseFloat(directLocal);
    if (!isNaN(num) && num > 0) return num;
  }

  // 2. LocalStorage financial settings
  const savedFinancials = getSafeItem<any>('sirikfit_financial_settings', null) || getSafeItem<any>('omex_financial_settings', null);
  if (savedFinancials && typeof savedFinancials === 'object') {
    const exRate = parseFloat(savedFinancials.exchangeRate || savedFinancials.aedRate || savedFinancials.manualAedRate);
    if (!isNaN(exRate) && exRate > 0) return exRate;
  }

  // 3. Current admin rate input from settings props
  if (settings) {
    if (typeof settings.exchangeRate === 'number' && !isNaN(settings.exchangeRate) && settings.exchangeRate > 0) {
      return settings.exchangeRate;
    }
    if (typeof settings.manualAedRate === 'number' && !isNaN(settings.manualAedRate) && settings.manualAedRate > 0) {
      return settings.manualAedRate;
    }
    if (typeof settings.aedRate === 'number' && !isNaN(settings.aedRate) && settings.aedRate > 0) {
      return settings.aedRate;
    }
  }

  // 4. CMS Config
  if (cms) {
    const cmsRate = cms?.pricingRules?.manualAedRate || cms?.pricingRules?.aedRate || cms?.apiConfig?.manualAedRate || cms?.apiConfig?.aedRate;
    if (cmsRate) {
      const parsedCmsRate = parseFloat(cmsRate);
      if (!isNaN(parsedCmsRate) && parsedCmsRate > 0) {
        return parsedCmsRate;
      }
    }
  }

  return 0;
}

/**
 * Helper to extract clean string value for text inputs (avoids [object Object] bug)
 */
export const serializeVariantNames = (items: any[] | undefined): string => {
  if (!items || !Array.isArray(items)) return '';
  return items
    .map(it => (typeof it === 'string' ? it : (it?.name || it?.flavor || it?.size || it?.label || '')))
    .filter(Boolean)
    .join(', ');
};

/**
 * Helper to parse comma-separated text back into clean array
 */
export const parseCommaSeparatedNames = (str: string): string[] => {
  if (!str) return [];
  return str
    .split(/[,،]+/)
    .map(s => s.trim())
    .filter(s => s && s !== '[object Object]');
};

export interface FormattedSizeResult {
  displayLabel: string; // e.g. "5 پوند (معادل ۲.۳ کیلوگرم)"
  rawSize: string;      // e.g. "5 lbs"
  weightKg: number;     // e.g. 2.3
}

export function sanitizeVariantLabel(label: string | null | undefined): string {
  if (!label || typeof label !== 'string') return '';
  let clean = label.trim();

  // Strip bracketed prices: (150 د.إ), ( 250 د.ا ), (120 AED), (50 درهم), (+30 AED), (+ 25 AED)
  clean = clean.replace(/\(\s*[\+\-]?\s*\d+(?:\.\d+)?\s*(?:د\.إ|د\.ا|AED|aed|درهم|toman|تومان)?\s*\)/gi, '');
  
  // Strip trailing price additions: - 150 AED, + 25 AED, : 100 AED, 150 د.إ
  clean = clean.replace(/(?:[-–—:]|\+)\s*\d+(?:\.\d+)?\s*(?:د\.إ|د\.ا|AED|aed|درهم|toman|تومان)\b/gi, '');
  clean = clean.replace(/\b\d+(?:\.\d+)?\s*(?:د\.إ|د\.ا|درهم)\b/gi, '');

  // Clean empty brackets or dangling separators left behind
  clean = clean.replace(/\(\s*\)/g, '').replace(/[-–—:]\s*$/g, '').replace(/\s{2,}/g, ' ').trim();

  return clean;
}

export function parseAndConvertSize(inputSize: string): FormattedSizeResult {
  if (!inputSize || typeof inputSize !== 'string') {
    return { displayLabel: 'سایز پیشفرض', rawSize: '', weightKg: 0.8 };
  }

  const clean = sanitizeVariantLabel(inputSize);
  const lower = clean.toLowerCase();

  // 1. Check LBS / Pounds (e.g., "5 lbs", "2 lbs", "10 lb", "5پوند")
  const lbsMatch = lower.match(/([\d.]+)\s*(?:lbs|lb|پوند)/i);
  if (lbsMatch && lbsMatch[1]) {
    const lbsVal = parseFloat(lbsMatch[1]);
    let kgVal = 0.8;
    if (lbsVal === 5) kgVal = 2.27;
    else if (lbsVal === 2) kgVal = 0.9;
    else if (lbsVal === 10) kgVal = 4.54;
    else if (lbsVal === 1) kgVal = 0.45;
    else kgVal = Math.round(lbsVal * 0.453592 * 100) / 100;

    return {
      rawSize: clean,
      displayLabel: `${lbsVal} پوند (معادل ${kgVal} کیلوگرم)`,
      weightKg: kgVal
    };
  }

  // 2. Check Grams (e.g., "250 g", "500 gm", "300g")
  const gMatch = lower.match(/([\d.]+)\s*(?:gm|grams|gram|g|گرمی|گرم)/i);
  if (gMatch && gMatch[1]) {
    const gVal = parseFloat(gMatch[1]);
    const kgVal = Math.round((gVal / 1000) * 100) / 100;
    return {
      rawSize: clean,
      displayLabel: `${gVal} گرم (معادل ${kgVal} کیلوگرم)`,
      weightKg: kgVal
    };
  }

  // 3. Check KG (e.g., "2.2 kg", "1 kg")
  const kgMatch = lower.match(/([\d.]+)\s*(?:kg|kilos|kilogram|کیلو|کیلوگرم)/i);
  if (kgMatch && kgMatch[1]) {
    const kgVal = parseFloat(kgMatch[1]);
    return {
      rawSize: clean,
      displayLabel: `${kgVal} کیلوگرم`,
      weightKg: kgVal
    };
  }

  // 4. Default / Servings fallback
  return {
    rawSize: clean,
    displayLabel: clean,
    weightKg: 0.8
  };
}

export function getStoreBadgeTheme(storeNameOrBrand: string = '') {
  const s = (storeNameOrBrand || '').toLowerCase();
  if (s.includes('gnc')) {
    return {
      bg: 'bg-red-600 text-white',
      dot: 'bg-white',
      name: 'GNC Store'
    };
  }
  if (s.includes('dr nutrition') || s.includes('drnutrition') || s.includes('dnp')) {
    return {
      bg: 'bg-purple-700 text-white',
      dot: 'bg-emerald-400',
      name: 'Dr. Nutrition'
    };
  }
  if (s.includes('sporter')) {
    return {
      bg: 'bg-amber-400 text-gray-950 font-black',
      dot: 'bg-gray-950',
      name: 'Sporter UAE'
    };
  }
  if (s.includes('life pharmacy') || s.includes('lifepharmacy')) {
    return {
      bg: 'bg-blue-700 text-white',
      dot: 'bg-pink-400',
      name: 'Life Pharmacy'
    };
  }
  return {
    bg: 'bg-black text-white',
    dot: 'bg-red-500',
    name: storeNameOrBrand || 'خرید مستقیم از دبی'
  };
}

