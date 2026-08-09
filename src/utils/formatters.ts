// Helper utilities for Persian formatting

export function toPersianDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/\d/g, (digit) => persianDigits[parseInt(digit, 10)]);
}

export function formatToman(amount: number): string {
  if (isNaN(amount)) return '۰ تومان';
  const formatted = Math.round(amount).toLocaleString('fa-IR');
  return `${formatted} تومان`;
}

export function formatAed(amount: number): string {
  if (isNaN(amount) || amount === 0) return '0 AED';
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('en-US')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} AED`;
}

export function formatPersianDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return isoString;
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
  return Math.round(withProfitAed * aedRate);
}

/**
 * CRITICAL INPUT CLEANING RULE:
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
 * Priority 1: Current manual rate input from admin in settings (settings.manualAedRate or settings.aedRate)
 * Priority 2: Last saved rate from admin in localStorage (sirikfit_financial_settings, omex_financial_settings, or sirikfit_aed_rate)
 * Priority 3: Last saved rate in cmsConfig or Firestore
 * Warning: If no admin rate has ever been set, logs warning "لطفاً نرخ درهم را وارد کنید" and returns safe fallback to prevent crashes.
 */
export function getEffectiveAedRate(
  settings?: { aedRate?: number; manualAedRate?: number } | null,
  cms?: any
): number {
  // Priority 1: Current admin rate input from settings
  if (settings) {
    if (typeof settings.manualAedRate === 'number' && !isNaN(settings.manualAedRate) && settings.manualAedRate > 0) {
      return settings.manualAedRate;
    }
    if (typeof settings.aedRate === 'number' && !isNaN(settings.aedRate) && settings.aedRate > 0) {
      return settings.aedRate;
    }
  }

  // Priority 2: Stored in localStorage from previous admin saves
  try {
    if (typeof window !== 'undefined') {
      const savedFinancials = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
      if (savedFinancials) {
        const parsed = JSON.parse(savedFinancials);
        if (parsed) {
          if (typeof parsed.manualAedRate === 'number' && !isNaN(parsed.manualAedRate) && parsed.manualAedRate > 0) return parsed.manualAedRate;
          if (typeof parsed.aedRate === 'number' && !isNaN(parsed.aedRate) && parsed.aedRate > 0) return parsed.aedRate;
          const pRate = parseFloat(parsed.manualAedRate || parsed.aedRate);
          if (!isNaN(pRate) && pRate > 0) return pRate;
        }
      }
      const directLocal = localStorage.getItem('sirikfit_aed_rate');
      if (directLocal) {
        const num = parseFloat(directLocal);
        if (!isNaN(num) && num > 0) return num;
      }
    }
  } catch (_e) {}

  // Priority 3: Last saved rate in cmsConfig
  if (cms) {
    const cmsRate = cms?.pricingRules?.manualAedRate || cms?.pricingRules?.aedRate || cms?.apiConfig?.manualAedRate || cms?.apiConfig?.aedRate;
    if (typeof cmsRate === 'number' && !isNaN(cmsRate) && cmsRate > 0) {
      return cmsRate;
    }
    const parsedCmsRate = parseFloat(cmsRate);
    if (!isNaN(parsedCmsRate) && parsedCmsRate > 0) {
      return parsedCmsRate;
    }
  }

  // Fallback if no rate recorded in history: Log warning "لطفاً نرخ درهم را وارد کنید"
  console.warn('⚠️ [SirikFit Admin Warning]: لطفاً نرخ درهم را وارد کنید! (هیچ نرخ واقعی در تاریخچه ثبت نشده است)');
  return 53000;
}

