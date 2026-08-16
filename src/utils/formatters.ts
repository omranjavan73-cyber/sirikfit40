import { getSafeItem } from './safeStorage';

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

export function formatToman(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '۰ تومان';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) return '۰ تومان';
  const formatted = Math.round(num).toLocaleString('fa-IR');
  return `${formatted} تومان`;
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
export function extractCleanUrl(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  const httpIndex = trimmed.search(/https?:\/\//i);
  if (httpIndex === -1) {
    return trimmed;
  }
  const fromHttp = trimmed.slice(httpIndex);
  const match = fromHttp.match(/^(https?:\/\/[^\s]+)/i);
  return match ? match[1] : fromHttp;
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
