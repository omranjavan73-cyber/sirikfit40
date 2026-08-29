import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { sanitizePayloadForFirestore } from '../utils/adminSaveHelper';
import { sanitizeForFirestore } from '../utils/sanitizePayload';
import type { StoreSettings, StoreCardItem } from '../types/store';

export const DEFAULT_PRESET_STORES: StoreSettings[] = [
  {
    id: 'store-iherb',
    title: 'iHerb UAE',
    shortTitle: 'iHerb',
    nameFa: 'آی‌هرب دبی و امارات',
    nameEn: 'iHerb',
    slug: 'iherb',
    subtitle: 'انبار مرکزی و رسمی آی‌هرب',
    description: 'بزرگترین مرجع جهانی مکمل، ویتامین و سلامت طبیعی با ارسال مستقیم از امارات و دبی',
    url: 'https://ae.iherb.com',
    brandColor: '#458500',
    badge: 'ضمانت اصالت ۱۰۰٪',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23458500"/><text x="100" y="118" text-anchor="middle" fill="%23FFFFFF" font-weight="900" font-size="54" font-family="Arial,sans-serif" letter-spacing="-1">iHerb</text><path d="M50 145 Q 100 162 150 145" stroke="%23A0D636" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="150" cy="145" r="4" fill="%23A0D636"/></svg>',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23458500"/><text x="100" y="118" text-anchor="middle" fill="%23FFFFFF" font-weight="900" font-size="54" font-family="Arial,sans-serif" letter-spacing="-1">iHerb</text><path d="M50 145 Q 100 162 150 145" stroke="%23A0D636" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="150" cy="145" r="4" fill="%23A0D636"/></svg>',
    isActive: true,
    enabled: true,
    orderCtaText: 'محاسبه و خرید از iHerb'
  },
  {
    id: 'store-gnc',
    title: 'GNC UAE',
    shortTitle: 'GNC',
    nameFa: 'جی‌ان‌سی امارات',
    nameEn: 'GNC Store',
    slug: 'gnc',
    subtitle: 'نمایندگی رسمی GNC',
    description: 'نمایندگی رسمی برند جهانی GNC در امارات - انواع مولتی‌ویتامین‌ها، امگا ۳ و مکمل‌های سلامتی اورجینال',
    url: 'https://gnc-mena.com/',
    brandColor: '#dc2626',
    badge: 'ضمانت ۱۰۰٪ اورجینال',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="115" text-anchor="middle" fill="%23E31837" font-weight="900" font-size="70" font-family="Arial,sans-serif" letter-spacing="-2">GNC</text><text x="100" y="145" text-anchor="middle" fill="%23E31837" font-weight="800" font-size="20" font-family="Arial,sans-serif" letter-spacing="4">LIVE WELL</text></svg>',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="115" text-anchor="middle" fill="%23E31837" font-weight="900" font-size="70" font-family="Arial,sans-serif" letter-spacing="-2">GNC</text><text x="100" y="145" text-anchor="middle" fill="%23E31837" font-weight="800" font-size="20" font-family="Arial,sans-serif" letter-spacing="4">LIVE WELL</text></svg>',
    isActive: true,
    enabled: true,
    orderCtaText: 'محاسبه و خرید از GNC'
  },
  {
    id: 'store-life',
    title: 'Life Pharmacy UAE',
    shortTitle: 'Life Pharmacy',
    nameFa: 'داروخانه لایف دبی',
    nameEn: 'Life Pharmacy',
    slug: 'life-pharmacy',
    subtitle: 'داروخانه آنلاین دبی',
    description: 'بزرگترین زنجیره داروخانه آنلاین دبی - داروها، ویتامین‌ها، مکمل‌ها و محصولات آرایشی بهداشتی معتبر',
    url: 'https://www.lifepharmacy.com',
    brandColor: '#1e40af',
    badge: 'داروخانه آنلاین دبی',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><path d="M100 15 C56 15 40 42 40 70 V135 H160 V70 C160 42 144 15 100 15 Z" fill="%231C3F94"/><circle cx="100" cy="55" r="9" fill="%23FFFFFF"/><path d="M100 68 C84 80 72 84 64 110 H136 C128 84 116 80 100 68 Z" fill="%23FFFFFF"/><text x="100" y="172" text-anchor="middle" fill="%23C42582" font-weight="900" font-size="36" font-family="sans-serif">LIFE%C2%AE</text></svg>',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><path d="M100 15 C56 15 40 42 40 70 V135 H160 V70 C160 42 144 15 100 15 Z" fill="%231C3F94"/><circle cx="100" cy="55" r="9" fill="%23FFFFFF"/><path d="M100 68 C84 80 72 84 64 110 H136 C128 84 116 80 100 68 Z" fill="%23FFFFFF"/><text x="100" y="172" text-anchor="middle" fill="%23C42582" font-weight="900" font-size="36" font-family="sans-serif">LIFE%C2%AE</text></svg>',
    isActive: true,
    enabled: true,
    orderCtaText: 'محاسبه و خرید از Life'
  },
  {
    id: 'store-dnp',
    title: 'Doctor Nutrition Dubai',
    shortTitle: 'Dr. Nutrition',
    nameFa: 'دکتر نوتریشن دبی',
    nameEn: 'Doctor Nutrition',
    slug: 'dr-nutrition',
    subtitle: 'بزرگترین مرجع مکمل دبی',
    description: 'بزرگترین مرجع تخصصی مکمل‌های ورزشی، ویتامین و پروتئین ایزوله در امارات و خاورمیانه',
    url: 'https://www.drnutrition.com/en-ae',
    brandColor: '#9333ea',
    badge: 'تخفیف ویژه دبی',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif" letter-spacing="-6">dnp</text><path d="M50 120 C 90 70, 135 40, 175 28 C 150 65, 110 110, 75 130 Z" fill="%2378BE20"/><path d="M60 112 Q 115 65, 163 35" stroke="%235A9614" stroke-width="3" fill="none"/></svg>',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif" letter-spacing="-6">dnp</text><path d="M50 120 C 90 70, 135 40, 175 28 C 150 65, 110 110, 75 130 Z" fill="%2378BE20"/><path d="M60 112 Q 115 65, 163 35" stroke="%235A9614" stroke-width="3" fill="none"/></svg>',
    isActive: true,
    enabled: true,
    orderCtaText: 'محاسبه و خرید از DNP'
  },
  {
    id: 'store-sporter',
    title: 'Sporter UAE',
    shortTitle: 'Sporter',
    nameFa: 'اسپورتر امارات',
    nameEn: 'Sporter',
    slug: 'sporter',
    subtitle: 'فروشگاه تخصصی فیتنس و مکمل',
    description: 'تنوع بی‌نظیر مکمل‌های ورزشی و پوشاک تمرینی اصل با ارسال مستقیم از دبی',
    url: 'https://www.sporter.com/en-ae',
    brandColor: '#f59e0b',
    badge: 'تخفیف باشگاهی',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%230f172a"/><text x="100" y="118" text-anchor="middle" fill="%23F59E0B" font-weight="900" font-size="44" font-family="Arial,sans-serif">SPORTER</text></svg>',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%230f172a"/><text x="100" y="118" text-anchor="middle" fill="%23F59E0B" font-weight="900" font-size="44" font-family="Arial,sans-serif">SPORTER</text></svg>',
    isActive: true,
    enabled: true,
    orderCtaText: 'محاسبه و خرید از Sporter'
  },
  {
    id: 'store-amazon',
    title: 'Amazon UAE',
    shortTitle: 'Amazon.ae',
    nameFa: 'آمازون امارات',
    nameEn: 'Amazon UAE',
    slug: 'amazon',
    subtitle: 'فروشگاه آنلاین آمازون دبی',
    description: 'خرید انواع مکمل‌های کمیاب و محصولات بین‌المللی از سایت آمازون امارات',
    url: 'https://www.amazon.ae',
    brandColor: '#d97706',
    badge: 'ارسال پرایم',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23232F3E"/><text x="100" y="105" text-anchor="middle" fill="%23FFFFFF" font-weight="900" font-size="38" font-family="sans-serif">amazon</text><text x="100" y="132" text-anchor="middle" fill="%23FF9900" font-weight="800" font-size="22" font-family="sans-serif">.ae</text><path d="M50 145 Q 100 165 150 145" stroke="%23FF9900" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M142 138 L 152 146 L 140 152 Z" fill="%23FF9900"/></svg>',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23232F3E"/><text x="100" y="105" text-anchor="middle" fill="%23FFFFFF" font-weight="900" font-size="38" font-family="sans-serif">amazon</text><text x="100" y="132" text-anchor="middle" fill="%23FF9900" font-weight="800" font-size="22" font-family="sans-serif">.ae</text><path d="M50 145 Q 100 165 150 145" stroke="%23FF9900" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M142 138 L 152 146 L 140 152 Z" fill="%23FF9900"/></svg>',
    isActive: true,
    enabled: true,
    orderCtaText: 'محاسبه و خرید از Amazon'
  },
  {
    id: 'store-noon',
    title: 'Noon Dubai',
    shortTitle: 'Noon',
    nameFa: 'نون دبی',
    nameEn: 'Noon Dubai',
    slug: 'noon',
    subtitle: 'فروشگاه بزرگ نون امارات',
    description: 'خرید مستقیم از فروشگاه بزرگ نون دبی با تحویل اکسپرس',
    url: 'https://www.noon.com/uae-en',
    brandColor: '#eab308',
    badge: 'نون اکسپرس',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23FEE600"/><text x="100" y="120" text-anchor="middle" fill="%23000000" font-weight="900" font-size="60" font-family="Arial,sans-serif">noon</text></svg>',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23FEE600"/><text x="100" y="120" text-anchor="middle" fill="%23000000" font-weight="900" font-size="60" font-family="Arial,sans-serif">noon</text></svg>',
    isActive: true,
    enabled: true,
    orderCtaText: 'محاسبه و خرید از Noon'
  }
];

/**
 * Normalizes a store object to ensure both logoUrl & image, nameFa & title, isActive & enabled exist.
 */
export function normalizeStoreItem(item: any): StoreSettings {
  const logo = (item.logoUrl || item.image || item.logo || '').trim();
  const title = (item.title || item.nameFa || item.name || 'فروشگاه جدید').trim();
  const nameEn = (item.nameEn || item.shortTitle || 'Store').trim();
  const nameFa = (item.nameFa || item.title || title).trim();
  const slug = (item.slug || item.id || nameEn.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/^store-/, '');
  const active = item.isActive !== undefined ? Boolean(item.isActive) : (item.enabled !== undefined ? Boolean(item.enabled) : true);

  return {
    id: item.id || `store-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    shortTitle: item.shortTitle || item.nameEn || title,
    nameFa,
    nameEn,
    slug,
    subtitle: item.subtitle || '',
    description: item.description || '',
    url: item.url || 'https://',
    logoUrl: logo,
    image: logo,
    badge: item.badge || '',
    brandColor: item.brandColor || '#111111',
    orderCtaText: item.orderCtaText || item.ctaText || `محاسبه و خرید از ${nameFa}`,
    ctaText: item.ctaText || item.orderCtaText || `محاسبه و خرید از ${nameFa}`,
    isActive: active,
    enabled: active,
    commissionRate: typeof item.commissionRate === 'number' ? item.commissionRate : undefined,
    samplePriceAed: typeof item.samplePriceAed === 'number' ? item.samplePriceAed : undefined,
    sampleWeightKg: typeof item.sampleWeightKg === 'number' ? item.sampleWeightKg : undefined,
    updatedAt: item.updatedAt || new Date().toISOString()
  };
}

/**
 * Fetches configured stores from Firestore with fallback to LocalStorage and DEFAULT_PRESET_STORES.
 */
export async function getStoresFromFirestore(): Promise<StoreSettings[]> {
  try {
    // 1. Try fetching dedicated doc: settings/stores
    if (db) {
      const storesDocSnap = await getDoc(doc(db, 'settings', 'stores'));
      if (storesDocSnap.exists()) {
        const data = storesDocSnap.data();
        if (Array.isArray(data.stores) && data.stores.length > 0) {
          return data.stores.map(normalizeStoreItem);
        }
      }

      // 2. Try fetching from cms/app
      const cmsSnap = await getDoc(doc(db, 'cms', 'app'));
      if (cmsSnap.exists()) {
        const data = cmsSnap.data();
        if (Array.isArray(data.stores) && data.stores.length > 0) {
          return data.stores.map(normalizeStoreItem);
        }
      }
    }
  } catch (err) {
    console.warn('Firestore store fetch error, using fallback:', err);
  }

  // Fallback to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem('sirikfit_stores_list');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeStoreItem);
        }
      }
    } catch (_) {}
  }

  return DEFAULT_PRESET_STORES;
}

/**
 * Persists full list of stores atomically across Firestore (settings/stores and cms/app) and LocalStorage.
 */
export async function saveStoresToFirestore(stores: (StoreSettings | StoreCardItem)[]): Promise<{ success: boolean; error?: string }> {
  if (!Array.isArray(stores)) {
    return { success: false, error: 'Stores list must be an array' };
  }

  const normalized = stores.map(normalizeStoreItem);

  // 1. Update LocalStorage immediately
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sirikfit_stores_list', JSON.stringify(normalized));
      
      const rawCms = localStorage.getItem('sirikfit_cms_config');
      const cms = rawCms ? JSON.parse(rawCms) : {};
      cms.stores = normalized;
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(cms));

      window.dispatchEvent(new CustomEvent('storesUpdated', { detail: { stores: normalized } }));
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { cmsConfig: cms } }));
    } catch (lsErr) {
      console.warn('LocalStorage save error for stores:', lsErr);
    }
  }

  // 2. Persist to Firestore
  try {
    if (db) {
      const cleanData = sanitizeForFirestore({
        stores: normalized,
        updatedAt: new Date().toISOString()
      });

      await Promise.all([
        setDoc(doc(db, 'settings', 'stores'), cleanData, { merge: true }),
        setDoc(doc(db, 'cms', 'app'), { stores: cleanData.stores, updatedAt: cleanData.updatedAt }, { merge: true })
      ]);
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error saving stores to Firestore:', err);
    return { success: false, error: err?.message || String(err) };
  }
}
