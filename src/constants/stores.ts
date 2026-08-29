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
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
    pulseColor: 'bg-white',
    domainPattern: /drnutrition\.com/i,
    origin: 'انبار مرکزی Dr Nutrition دبی',
    flag: '🇦🇪',
    brandColor: '#2563eb',
    defaultUrl: 'https://www.drnutrition.com/en-ae'
  },
  life: {
    id: 'life',
    name: 'Life Pharmacy',
    nameFa: 'داروخانه لایف',
    badgeBg: 'bg-teal-600',
    badgeText: 'text-white',
    pulseColor: 'bg-white',
    domainPattern: /lifepharmacy\.com|drpharmacy\.ae/i,
    origin: 'انبار داروخانه‌های لایف امارات',
    flag: '🇦🇪',
    brandColor: '#0d9488',
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

export function getStoreConfig(storeNameOrUrl: string = ''): StoreConfig {
  const s = (storeNameOrUrl || '').toLowerCase().trim();

  // 1. iHerb
  if (s.includes('iherb') || s.includes('آی‌هرب') || s.includes('آی هرب')) {
    return SUPPORTED_STORES.iherb;
  }
  // 2. GNC
  if (s.includes('gnc') || s.includes('جی ان سی') || s.includes('جی‌ان‌سی')) {
    return SUPPORTED_STORES.gnc;
  }
  // 3. Dr Nutrition
  if (s.includes('dr nutrition') || s.includes('drnutrition') || s.includes('dnp') || s.includes('دکتر نوتریشن') || s.includes('dr.')) {
    return SUPPORTED_STORES.drnutrition;
  }
  // 4. Life Pharmacy
  if (s.includes('life pharmacy') || s.includes('lifepharmacy') || s.includes('لایف') || s.includes('life')) {
    return SUPPORTED_STORES.life;
  }
  // 5. Sporter
  if (s.includes('sporter') || s.includes('اسپورتر')) {
    return SUPPORTED_STORES.sporter;
  }
  // 6. Amazon
  if (s.includes('amazon') || s.includes('آمازون')) {
    return SUPPORTED_STORES.amazon;
  }
  // 7. Noon
  if (s.includes('noon') || s.includes('نون')) {
    return SUPPORTED_STORES.noon;
  }
  // 8. Iran Warehouse
  if (
    s.includes('انبار ایران') ||
    s.includes('iranwarehouse') ||
    s.includes('iran warehouse') ||
    s.includes('تحویل فوری') ||
    s.includes('موجودی ایران') ||
    s.includes('انبار')
  ) {
    return SUPPORTED_STORES.iran_warehouse;
  }

  // Check URL patterns
  for (const store of STORE_LIST) {
    if (store.domainPattern && store.domainPattern.test(s)) {
      return store;
    }
  }

  // Generic fallback
  return {
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
