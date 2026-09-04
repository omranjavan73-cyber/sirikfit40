export type StoreName =
  | 'GNC Store'
  | 'Life Pharmacy'
  | 'Dr Nutrition'
  | 'iHerb'
  | 'Sporter'
  | 'Amazon UAE'
  | 'Noon Dubai'
  | 'انبار ایران'
  | string;

export interface StoreConfig {
  id: string;
  name: string;
  nameFa?: string;
  badgeBg: string;
  badgeText: string;
  pulseColor: string;
  domainPattern: RegExp;
  origin: string;
  flag: string;
  brandColor: string;
  defaultUrl?: string;
}

export const SUPPORTED_STORES: Record<string, StoreConfig> = {
  iherb: {
    id: 'iherb',
    name: 'iHerb',
    nameFa: 'آی‌هرب',
    badgeBg: 'bg-[#458500]',
    badgeText: 'text-white',
    pulseColor: 'bg-emerald-300',
    domainPattern: /iherb\.com|ae\.iherb\.com/i,
    origin: 'انبار مرکزی iHerb امارات و دبی',
    flag: '🇦🇪',
    brandColor: '#458500',
    defaultUrl: 'https://ae.iherb.com'
  },
  sportsresearch: {
    id: 'sportsresearch',
    name: 'Sports Research',
    nameFa: 'اسپورتس ریسرچ',
    badgeBg: 'bg-emerald-700',
    badgeText: 'text-white',
    pulseColor: 'bg-white',
    domainPattern: /(?:www\.)?sportsresearch\.com/i,
    origin: 'فروشگاه رسمی Sports Research آمریکا',
    flag: '🇺🇸',
    brandColor: '#047857',
    defaultUrl: 'https://www.sportsresearch.com'
  },
  gnc: {
    id: 'gnc',
    name: 'GNC Store',
    nameFa: 'جی‌ان‌سی استور',
    badgeBg: 'bg-red-600',
    badgeText: 'text-white',
    pulseColor: 'bg-white',
    domainPattern: /gnc\.com|gnc-mena\.com|gnc\.ae|shoplivewell/i,
    origin: 'نمایندگی رسمی GNC امارات',
    flag: '🇦🇪',
    brandColor: '#dc2626',
    defaultUrl: 'https://www.gnc.com'
  },
  drnutrition: {
    id: 'drnutrition',
    name: 'Dr. Nutrition',
    nameFa: 'دکتر نوتریشن',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white',
    pulseColor: 'bg-white',
    domainPattern: /drnutrition\.com/i,
    origin: 'انبار مرکزی Dr Nutrition دبی',
    flag: '🇦🇪',
    brandColor: '#9333ea',
    defaultUrl: 'https://www.drnutrition.com/en-ae'
  },
  life: {
    id: 'life',
    name: 'Life Pharmacy',
    nameFa: 'داروخانه لایف',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
    pulseColor: 'bg-white',
    domainPattern: /lifepharmacy\.com|drpharmacy\.ae/i,
    origin: 'انبار داروخانه‌های لایف امارات',
    flag: '🇦🇪',
    brandColor: '#1e40af',
    defaultUrl: 'https://www.lifepharmacy.com'
  },
  sporter: {
    id: 'sporter',
    name: 'Sporter',
    nameFa: 'اسپورتر',
    badgeBg: 'bg-amber-400',
    badgeText: 'text-slate-950 font-bold',
    pulseColor: 'bg-slate-950',
    domainPattern: /sporter\.com/i,
    origin: 'انبار اسپورتر دبی',
    flag: '🇦🇪',
    brandColor: '#f59e0b',
    defaultUrl: 'https://www.sporter.com/en-ae'
  },
  amazon: {
    id: 'amazon',
    name: 'Amazon UAE',
    nameFa: 'آمازون امارات',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-white',
    pulseColor: 'bg-white',
    domainPattern: /amazon\.ae|amazon\./i,
    origin: 'دبی، امارات (Amazon.ae)',
    flag: '🇦🇪',
    brandColor: '#d97706',
    defaultUrl: 'https://www.amazon.ae'
  },
  noon: {
    id: 'noon',
    name: 'Noon Dubai',
    nameFa: 'نون دبی',
    badgeBg: 'bg-yellow-400',
    badgeText: 'text-slate-950 font-bold',
    pulseColor: 'bg-slate-950',
    domainPattern: /noon\.com/i,
    origin: 'انبار اکسپرس نون دبی',
    flag: '🇦🇪',
    brandColor: '#eab308',
    defaultUrl: 'https://www.noon.com/uae-en'
  },
  iran_warehouse: {
    id: 'iran_warehouse',
    name: 'انبار ایران',
    nameFa: 'انبار ایران (تحویل فوری)',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
    pulseColor: 'bg-white',
    domainPattern: /^$/i,
    origin: 'انبار مرکزی تهران (تحویل فوری ۲۴ ساعته)',
    flag: '🇮🇷',
    brandColor: '#059669'
  }
};

export const STORE_LIST: StoreConfig[] = Object.values(SUPPORTED_STORES);

/**
 * Retrieves custom configured stores from LocalStorage if available
 */
function getCustomConfiguredStore(storeNameOrUrl: string = ''): { brandColor?: string; nameFa?: string; title?: string; nameEn?: string } | null {
  if (typeof window === 'undefined' || !storeNameOrUrl) return null;
  try {
    const raw = localStorage.getItem('sirikfit_stores_list');
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return null;

    const s = storeNameOrUrl.toLowerCase().trim();
    for (const store of list) {
      const title = (store.title || '').toLowerCase();
      const shortTitle = (store.shortTitle || '').toLowerCase();
      const nameEn = (store.nameEn || '').toLowerCase();
      const nameFa = (store.nameFa || '').toLowerCase();
      const slug = (store.slug || '').toLowerCase();
      const url = (store.url || '').toLowerCase();

      if (
        s === slug ||
        s === title ||
        s === shortTitle ||
        s === nameEn ||
        s === nameFa ||
        (url && s.includes(url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, ''))) ||
        title.includes(s) ||
        nameEn.includes(s) ||
        (s.includes('dr nutrition') && (slug.includes('dr-nutrition') || slug.includes('dnp') || nameEn.includes('doctor nutrition') || nameEn.includes('dr. nutrition'))) ||
        (s.includes('life pharmacy') && (slug.includes('life') || nameEn.includes('life'))) ||
        (s.includes('gnc') && (slug.includes('gnc') || nameEn.includes('gnc'))) ||
        (s.includes('iherb') && (slug.includes('iherb') || nameEn.includes('iherb'))) ||
        (s.includes('sporter') && (slug.includes('sporter') || nameEn.includes('sporter')))
      ) {
        return store;
      }
    }
  } catch (_) {}
  return null;
}

export function getStoreConfig(storeNameOrUrl: string = ''): StoreConfig {
  const s = (storeNameOrUrl || '').toLowerCase().trim();
  const customStore = getCustomConfiguredStore(s);

  let baseConfig: StoreConfig;

  // 1. iHerb
  if (s.includes('iherb') || s.includes('آی‌هرب') || s.includes('آی هرب')) {
    baseConfig = { ...SUPPORTED_STORES.iherb };
  } else if (s.includes('gnc') || s.includes('جی ان سی') || s.includes('جی‌ان‌سی')) {
    // 2. GNC
    baseConfig = { ...SUPPORTED_STORES.gnc };
  } else if (s.includes('dr nutrition') || s.includes('drnutrition') || s.includes('dnp') || s.includes('دکتر نوتریشن') || s.includes('dr.')) {
    // 3. Dr Nutrition (Purple by default / configured)
    baseConfig = { ...SUPPORTED_STORES.drnutrition };
  } else if (s.includes('life pharmacy') || s.includes('lifepharmacy') || s.includes('لایف') || s.includes('life')) {
    // 4. Life Pharmacy (Blue by default / configured)
    baseConfig = { ...SUPPORTED_STORES.life };
  } else if (s.includes('sporter') || s.includes('اسپورتر')) {
    // 5. Sporter
    baseConfig = { ...SUPPORTED_STORES.sporter };
  } else if (s.includes('amazon') || s.includes('آمازون')) {
    // 6. Amazon
    baseConfig = { ...SUPPORTED_STORES.amazon };
  } else if (s.includes('noon') || s.includes('نون')) {
    // 7. Noon
    baseConfig = { ...SUPPORTED_STORES.noon };
  } else if (
    s.includes('انبار ایران') ||
    s.includes('iranwarehouse') ||
    s.includes('iran warehouse') ||
    s.includes('تحویل فوری') ||
    s.includes('موجودی ایران') ||
    s.includes('انبار')
  ) {
    // 8. Iran Warehouse
    baseConfig = { ...SUPPORTED_STORES.iran_warehouse };
  } else {
    // Check URL patterns
    let found: StoreConfig | null = null;
    for (const store of STORE_LIST) {
      if (store.domainPattern && store.domainPattern.test(s)) {
        found = { ...store };
        break;
      }
    }

    baseConfig = found || {
      id: 'generic_dubai',
      name: storeNameOrUrl || 'خرید مستقیم از دبی',
      nameFa: storeNameOrUrl || 'فروشگاه دبی',
      badgeBg: 'bg-slate-900',
      badgeText: 'text-white',
      pulseColor: 'bg-white',
      domainPattern: /./,
      origin: 'انبار امارات متحده عربی',
      flag: '🇦🇪',
      brandColor: '#0f172a'
    };
  }

  // Override brandColor with custom setting if present
  if (customStore?.brandColor) {
    baseConfig.brandColor = customStore.brandColor;
  }

  return baseConfig;
}

export function detectStoreFromUrl(url: string): StoreConfig | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  for (const store of STORE_LIST) {
    if (store.domainPattern && store.domainPattern.test(lower)) {
      return store;
    }
  }
  return null;
}
