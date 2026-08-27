import { toPersianDigits } from './formatters';

export type FreshnessLevel = 'fresh' | 'moderate' | 'urgent';

export interface LinkFreshnessInfo {
  elapsedDays: number;
  level: FreshnessLevel;
  badgeClass: string;
  dotEmoji: string;
  label: string;
  shortLabel: string;
  numericBadge: string;
  numericBadgeClass: string;
  isUrgent: boolean;
}

/**
 * Calculates the number of full days elapsed since a given timestamp.
 */
export function getLinkAgeInDays(timestamp?: string | number | Date | null): number {
  if (!timestamp) return 999;
  try {
    const timeMs = new Date(timestamp).getTime();
    if (isNaN(timeMs) || timeMs <= 0) return 999;
    const diffMs = Date.now() - timeMs;
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

/**
 * Generates dynamic, color-coded link age and freshness badge data.
 * - 0 - 2 Days: 🟢 تازه (امروز / ۱ یا ۲ روز پیش) [bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-2 py-0.5 rounded-full text-xs]
 * - 3 - 6 Days: 🟡 معتدل (X روز پیش) [bg-amber-100 text-amber-800 border-amber-300 font-bold px-2 py-0.5 rounded-full text-xs]
 * - 7+ Days: 🔴 بررسی فوری (+X روز پیش) [bg-rose-100 text-rose-800 border-rose-300 font-bold px-2 py-0.5 rounded-full text-xs animate-pulse]
 */
export function getLinkFreshnessInfo(timestamp?: string | number | Date | null): LinkFreshnessInfo {
  const elapsedDays = getLinkAgeInDays(timestamp);

  if (elapsedDays === 999) {
    return {
      elapsedDays: 999,
      level: 'urgent',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
      dotEmoji: '🔴',
      label: '🔴 بررسی فوری (نامشخص)',
      shortLabel: 'نامشخص',
      numericBadge: '+۷',
      numericBadgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-0.5 rounded-full text-xs animate-pulse',
      isUrgent: true
    };
  }

  if (elapsedDays <= 2) {
    const dayText = elapsedDays === 0 ? 'امروز' : elapsedDays === 1 ? 'دیروز' : `${toPersianDigits(elapsedDays)} روز پیش`;
    return {
      elapsedDays,
      level: 'fresh',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dotEmoji: '🟢',
      label: `🟢 تازه (${dayText})`,
      shortLabel: `تازه (${dayText})`,
      numericBadge: toPersianDigits(elapsedDays),
      numericBadgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-0.5 rounded-full text-xs',
      isUrgent: false
    };
  }

  if (elapsedDays <= 6) {
    return {
      elapsedDays,
      level: 'moderate',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      dotEmoji: '🟡',
      label: `🟡 معتدل (${toPersianDigits(elapsedDays)} روز پیش)`,
      shortLabel: `${toPersianDigits(elapsedDays)} روز پیش`,
      numericBadge: toPersianDigits(elapsedDays),
      numericBadgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2.5 py-0.5 rounded-full text-xs',
      isUrgent: false
    };
  }

  return {
    elapsedDays,
    level: 'urgent',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
    dotEmoji: '🔴',
    label: `🔴 بررسی فوری (+${toPersianDigits(elapsedDays)} روز پیش)`,
    shortLabel: `+${toPersianDigits(elapsedDays)} روز`,
    numericBadge: `+${toPersianDigits(Math.min(elapsedDays, 99))}`,
    numericBadgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-0.5 rounded-full text-xs animate-pulse',
    isUrgent: true
  };
}
