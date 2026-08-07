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
