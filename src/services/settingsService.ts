import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { isFirestoreGrpcNoise, sanitizePayloadForFirestore } from '../firebase';
import type { LandingSettings } from '../types';
import type { GeneralSettingsDoc, SupportSettings, SupportFirestoreDoc } from '../types/settings';
import { DEFAULT_GENERAL_SUPPORT_SETTINGS } from '../types/settings';
import { ENAMAD_CONFIG } from '../types';

export { ENAMAD_CONFIG };

export const DEFAULT_ENAMAD_CODE = `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8' alt='نماد اعتماد الکترونیکی' style='cursor:pointer' code='jj9HCtmWurzgveMEKQyc6iOcMamK4RG8'></a>`;

export const defaultLandingSettings: LandingSettings = {
  showBenefits: true,
  showAbout: true,
  showContact: true,
  showFaq: true,
  showRules: true,
  showTrustBadges: true,
  showEnamad: true,
  showTelegram: true,
  telegramActionText: 'چت آنلاین',
  showEmail: true,
  emailActionText: 'ارسال ایمیل',
  showPhone: true,
  phoneActionText: 'تماس تلفنی',
  showHours: true,
  showAddress: true,
  brandName: "سیریک فیت | SIRIK FIT",
  brandSubtitle: "تأمین و واردات مستقیم مکمل از دبی",
  aboutText: "سیریک فیت (SIRIK FIT) مرجع تخصصی تأمین و واردات مستقیم مکمل‌های ورزشی و غذایی اورجینال از معتبرترین برندهای جهانی و نمایندگی‌های امارات متحده عربی است.",
  deliveryGuaranteeBadge: "تضمین ۱۰۰٪ اصالت کالا | ارسال ۵ الی ۱۰ روز کاری",
  telegramId: "@SIRIK_FIT_Support",
  supportEmail: "info@sirikfit.ir",
  supportPhone: "021-91000000",
  supportHours: "پاسخگویی همه‌روزه، ساعت ۹ صبح الی ۲۳",
  officeLocation: "دفتر هماهنگی و ارسال مرسولات دبی و ایران",
  enamadCode: DEFAULT_ENAMAD_CODE,
  benefits: [
    {
      id: 'benefit-1',
      title: 'اصالت ۱۰۰٪ تضمینی از نمایندگی دبی',
      description: 'تمامی مکمل‌ها به صورت مستقیم و با بسته‌بندی پلمپ کارخانه‌ای از نمایندگی‌های رسمی امارات متحده عربی تأمین می‌شوند.',
      icon: 'ShieldCheck'
    },
    {
      id: 'benefit-2',
      title: 'حمل ایمن و سریع با کارگو هوایی',
      description: 'ارسال بسته‌ها در شرایط دمایی استاندارد و با بسته‌بندی ضدضربه در بازه زمانی ۵ تا ۱۰ روز کاری انجام می‌پذیرد.',
      icon: 'Truck'
    },
    {
      id: 'benefit-3',
      title: 'شفافیت کامل در قیمت و محاسبه دقیق',
      description: 'محاسبه بدون واسطه بر پایه نرخ روز درهم امارات با در نظر گرفتن کلیه هزینه‌های بسته‌بندی، کارگو و ترخیص.',
      icon: 'Coins'
    },
    {
      id: 'benefit-4',
      title: 'مشاوره تخصصی و رهگیری ۲۴ ساعته',
      description: 'پشتیبانی همه‌روزه توسط کارشناسان تغذیه ورزشی و پیگیری لحظه‌ای مرسوله تا زمان تحویل درب منزل.',
      icon: 'Headphones'
    }
  ],
  faqs: [
    {
      id: 'faq-1',
      question: 'چگونه از اصالت مکمل‌ها مطمئن شوم؟',
      answer: 'کلیه سفارش‌ها مستقیماً از نمایندگی‌های معتبر دبی ( نظیر Dr. Nutrition ،Sporter ،Life Pharmacy و GNC) خریداری شده و دارای بارکد و پلمپ رسمی کارخانه‌ای هستند.'
    },
    {
      id: 'faq-2',
      question: 'مدت زمان ارسال سفارش‌ها چقدر است؟',
      answer: 'سفارش‌ها بین ۵ الی ۱۰ روز کاری پس از تأیید نهایی، با بسته‌بندی ایمن تحویل داده می‌شوند.'
    },
    {
      id: 'faq-3',
      question: 'هزینه نهایی چگونه محاسبه می‌شود؟',
      answer: 'قیمت هر محصول بر مبنای نرخ روز درهم در سایت مبدأ به‌علاوه هزینه کارگو و ترخیص محاسبه می‌گردد.'
    }
  ],
  rules: [
    {
      id: 'rule-1',
      title: 'ضمانت اصالت فیزیکی و پلمپ کالا',
      content: 'سیریک فیت متعهد می‌شود تمامی اقلام را دقیقاً مطابق با سفارش ثبت‌شده و در بسته‌بندی پلمپ اولیه نمایندگی دبی تحویل نماید.'
    },
    {
      id: 'rule-2',
      title: 'روند ثبت سفارش و تأمین کالا',
      content: 'خرید از فروشگاه مبدأ بلافاصله پس از پرداخت وجه آغاز شده و امکان لغو سفارش پس از خرید از دبی وجود ندارد.'
    },
    {
      id: 'rule-3',
      title: 'شرایط تعویض و مرجوعی کالا',
      content: 'در صورت بروز هرگونه آسیب فیزیکی ناشی از حمل یا مغایرت محصول، خریدار موظف است ظرف ۲۴ ساعت پس از دریافت با پشتیبانی تماس حاصل نماید.'
    }
  ]
};

export const getLandingSettings = async (): Promise<LandingSettings> => {
  try {
    if (db) {
      const docRef = doc(db, 'settings', 'landing');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<LandingSettings>;
        const merged: LandingSettings = { ...defaultLandingSettings, ...data };
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_landing_settings', JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch (err) {
    if (!isFirestoreGrpcNoise(err)) {
      console.warn('Notice reading settings/landing from Firestore:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('sirikfit_landing_settings');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return { ...defaultLandingSettings, ...parsed };
      } catch (_) {}
    }
  }

  return defaultLandingSettings;
};

export const saveLandingSettings = async (data: Partial<LandingSettings>): Promise<boolean> => {
  const payload: LandingSettings = {
    ...defaultLandingSettings,
    ...data,
    updatedAt: new Date().toISOString()
  } as any;

  if (typeof window !== 'undefined') {
    localStorage.setItem('sirikfit_landing_settings', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('landingSettingsUpdated', { detail: payload }));
  }

  try {
    if (db) {
      await setDoc(doc(db, 'settings', 'landing'), payload, { merge: true });
    }
    return true;
  } catch (err) {
    if (!isFirestoreGrpcNoise(err)) {
      console.warn('Notice saving to settings/landing in Firestore:', err);
    }
    return true;
  }
};

export const DEFAULT_WHATSAPP_NUMBER = '+989914984801';
export const DEFAULT_WHATSAPP_MESSAGE = 'سلام، در رابطه با خرید از سیریک فیت راهنمایی میخواستم';

/**
 * Normalizes any Iranian (09... / 98...) or UAE (+971... / 971...) mobile number
 * and constructs a clean WhatsApp deep link URL using the standard api.whatsapp.com endpoint.
 */
export function formatWhatsAppUrl(rawPhone = DEFAULT_WHATSAPP_NUMBER, defaultMessage = DEFAULT_WHATSAPP_MESSAGE): string {
  if (!rawPhone || !rawPhone.trim()) rawPhone = DEFAULT_WHATSAPP_NUMBER;
  let clean = rawPhone.replace(/[^0-9]/g, '');
  if (clean.startsWith('09')) clean = '98' + clean.substring(1);
  if (clean.startsWith('00')) clean = clean.substring(2);
  if (!clean) clean = '989914984801';
  return `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(defaultMessage)}`;
}

export function formatWhatsAppLink(phone = DEFAULT_WHATSAPP_NUMBER, text = DEFAULT_WHATSAPP_MESSAGE): string {
  return formatWhatsAppUrl(phone, text);
}

/**
 * Fetches general settings (including support WhatsApp phone number) from settings/general
 */
export const getGeneralSettings = async (): Promise<GeneralSettingsDoc> => {
  try {
    if (db) {
      const snap = await getDoc(doc(db, 'settings', 'general'));
      if (snap.exists()) {
        const data = snap.data() as GeneralSettingsDoc;
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_general_settings', JSON.stringify(data));
        }
        return data;
      }
    }
  } catch (err) {
    if (!isFirestoreGrpcNoise(err)) {
      console.warn('Notice reading settings/general from Firestore:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('sirikfit_general_settings');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {}
    }
  }

  return {
    whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
    whatsappDefaultMessage: DEFAULT_WHATSAPP_MESSAGE
  };
};

/**
 * Saves or updates general settings document in settings/general
 */
export const saveGeneralSettings = async (data: Partial<GeneralSettingsDoc>): Promise<boolean> => {
  const payload = {
    ...data,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = localStorage.getItem('sirikfit_general_settings');
      const merged = existing ? { ...JSON.parse(existing), ...payload } : payload;
      localStorage.setItem('sirikfit_general_settings', JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('generalSettingsUpdated', { detail: merged }));
    } catch (_e) {}
  }

  try {
    if (db) {
      await setDoc(doc(db, 'settings', 'general'), payload, { merge: true });
    }
    return true;
  } catch (err) {
    if (!isFirestoreGrpcNoise(err)) {
      console.warn('Notice saving to settings/general in Firestore:', err);
    }
    return false;
  }
};

/**
 * Subscribes in real-time to changes in settings/general
 */
export const subscribeToGeneralSettings = (callback: (settings: GeneralSettingsDoc) => void): (() => void) => {
  if (!db) return () => {};

  try {
    return onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as GeneralSettingsDoc;
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_general_settings', JSON.stringify(data));
        }
        callback(data);
      }
    }, (err) => {
      if (!isFirestoreGrpcNoise(err)) {
        console.warn('Notice listening to settings/general:', err);
      }
    });
  } catch (e) {
    console.warn('Error setting up settings/general snapshot:', e);
    return () => {};
  }
};

/**
 * Single source of truth: Fetches support configuration from settings/support with fallback to settings/support_config and settings/general
 */
export const getSupportSettings = async (): Promise<SupportFirestoreDoc> => {
  try {
    if (db) {
      // 1. Primary: settings/support
      const snap = await getDoc(doc(db, 'settings', 'support'));
      if (snap.exists()) {
        const data = snap.data() as SupportFirestoreDoc;
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_support_settings', JSON.stringify(data));
          localStorage.setItem('sirikfit_support_config', JSON.stringify(data));
        }
        return data;
      }

      // 2. Secondary fallback: settings/support_config
      const snapConfig = await getDoc(doc(db, 'settings', 'support_config'));
      if (snapConfig.exists()) {
        const data = snapConfig.data() as SupportFirestoreDoc;
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_support_settings', JSON.stringify(data));
          localStorage.setItem('sirikfit_support_config', JSON.stringify(data));
        }
        return data;
      }
    }
  } catch (err) {
    if (!isFirestoreGrpcNoise(err)) {
      console.warn('Notice reading settings/support from Firestore:', err);
    }
  }

  // 3. Fallback to settings/general
  try {
    const general = await getGeneralSettings();
    if (general.whatsappNumber || general.whatsappSupportNumber) {
      return {
        whatsappNumber: general.whatsappNumber || general.whatsappSupportNumber,
        whatsappDefaultMessage: general.whatsappDefaultMessage,
        telegramBotUsername: general.telegramBotUsername,
        isFloatingWidgetEnabled: general.isFloatingWidgetEnabled ?? true,
        supportHours: general.supportHours,
        responseTimeText: general.responseTimeText
      };
    }
  } catch (_) {}

  // 4. Offline / LocalStorage fallback
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('sirikfit_support_settings') || localStorage.getItem('sirikfit_support_config');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {}
    }
  }

  return {
    whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
    whatsappDefaultMessage: DEFAULT_WHATSAPP_MESSAGE,
    telegramBotUsername: 'SIRIK_FIT_Support_bot',
    isFloatingWidgetEnabled: true
  };
};

/**
 * Saves support configuration to settings/support as single source of truth,
 * and synchronizes settings/general and settings/support_config for backward compatibility.
 * Verifies the database write with read-back before acknowledging success.
 */
export const saveSupportSettings = async (data: Partial<SupportFirestoreDoc>): Promise<boolean> => {
  const cleanPhone = (data.whatsappNumber && data.whatsappNumber.trim()) ? data.whatsappNumber.trim() : DEFAULT_WHATSAPP_NUMBER;
  const cleanMsg = (data.whatsappDefaultMessage && data.whatsappDefaultMessage.trim()) ? data.whatsappDefaultMessage.trim() : DEFAULT_WHATSAPP_MESSAGE;

  const payload: SupportFirestoreDoc = {
    ...data,
    whatsappNumber: cleanPhone,
    whatsappDefaultMessage: cleanMsg,
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    console.error('Firestore not initialized');
    return false;
  }

  try {
    // 1. Primary write to settings/support
    await setDoc(doc(db, 'settings', 'support'), payload, { merge: true });

    // 2. Mirror to settings/support_config and settings/general in parallel
    await Promise.all([
      setDoc(doc(db, 'settings', 'support_config'), payload, { merge: true }),
      setDoc(doc(db, 'settings', 'general'), {
        whatsappNumber: payload.whatsappNumber,
        whatsappSupportNumber: payload.whatsappNumber,
        whatsappDefaultMessage: payload.whatsappDefaultMessage,
        telegramBotUsername: payload.telegramBotUsername || 'SIRIK_FIT_Support_bot',
        isFloatingWidgetEnabled: payload.isFloatingWidgetEnabled ?? true,
        supportHours: payload.supportHours,
        responseTimeText: payload.responseTimeText,
        updatedAt: payload.updatedAt
      }, { merge: true })
    ]);

    // 3. Verification step: Read-back confirmation
    const verifySnap = await getDoc(doc(db, 'settings', 'support'));
    if (!verifySnap.exists() || verifySnap.data()?.whatsappNumber !== payload.whatsappNumber) {
      throw new Error('تایید نوشتن در دیتابیس settings/support ناموفق بود.');
    }

    // 4. Update local caches and broadcast reactive events
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sirikfit_support_settings', JSON.stringify(payload));
        localStorage.setItem('sirikfit_support_config', JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent('supportSettingsUpdated', { detail: payload }));
        window.dispatchEvent(new CustomEvent('supportConfigUpdated', { detail: payload }));
        window.dispatchEvent(new Event('storage'));
      } catch (_e) {}
    }

    return true;
  } catch (err) {
    console.error('Failed to save support settings to Firestore:', err);
    return false;
  }
};

/**
 * Real-time listener on settings/support (with fallback to settings/general)
 */
export const subscribeToSupportSettings = (callback: (settings: SupportFirestoreDoc) => void): (() => void) => {
  if (!db) return () => {};

  try {
    const unsubSupport = onSnapshot(doc(db, 'settings', 'support'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SupportFirestoreDoc;
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_support_settings', JSON.stringify(data));
        }
        callback(data);
      }
    }, (err) => {
      if (!isFirestoreGrpcNoise(err)) {
        console.warn('Notice listening to settings/support:', err);
      }
    });

    return () => {
      unsubSupport();
    };
  } catch (e) {
    console.warn('Error setting up settings/support snapshot:', e);
    return () => {};
  }
};

/**
 * Interface for settings/home document (Single Source of Truth for Home Page)
 */
export interface HomeSettingsDoc {
  logoUrl?: string;
  headerLogoUrl?: string;
  siteTitle?: string;
  brandSlogan?: string;
  heroHeading?: string;
  heroSubheading?: string;
  showTopPromo?: boolean;
  topPromoText?: string;
  bannerImageUrl?: string;
  calculatorHeading?: string;
  partnerStores?: any[];
  stores?: any[];
  banners?: any[];
  homeBanners?: any[];
  updatedAt?: string;
  [key: string]: any;
}

/**
 * Fetches settings/home with fallback to cms/app and LocalStorage
 */
export const getHomeSettings = async (): Promise<HomeSettingsDoc> => {
  try {
    if (db) {
      // 1. Primary: settings/home
      const homeSnap = await getDoc(doc(db, 'settings', 'home'));
      if (homeSnap.exists()) {
        const data = homeSnap.data() as HomeSettingsDoc;
        // Fallback check: if stores or banners are missing in settings/home, check cms/app
        if ((!data.stores && !data.partnerStores) || (!data.banners && !data.homeBanners)) {
          const cmsSnap = await getDoc(doc(db, 'cms', 'app')).catch(() => null);
          if (cmsSnap && cmsSnap.exists()) {
            const cmsData = cmsSnap.data();
            if (!data.stores && !data.partnerStores && Array.isArray(cmsData.stores)) {
              data.stores = cmsData.stores;
              data.partnerStores = cmsData.stores;
            }
            if (!data.banners && !data.homeBanners && Array.isArray(cmsData.homeBanners)) {
              data.banners = cmsData.homeBanners;
              data.homeBanners = cmsData.homeBanners;
            }
          }
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_home_settings', JSON.stringify(data));
        }
        return data;
      }

      // 2. Secondary fallback: cms/app
      const cmsSnap = await getDoc(doc(db, 'cms', 'app'));
      if (cmsSnap.exists()) {
        const cmsData = cmsSnap.data() as any;
        const res: HomeSettingsDoc = {
          logoUrl: cmsData.logoUrl,
          headerLogoUrl: cmsData.logoUrl,
          siteTitle: cmsData.siteTitle,
          brandSlogan: cmsData.brandSlogan,
          heroHeading: cmsData.heroHeading,
          heroSubheading: cmsData.heroSubheading,
          showTopPromo: cmsData.showTopPromo,
          topPromoText: cmsData.topPromoText,
          bannerImageUrl: cmsData.bannerImageUrl,
          calculatorHeading: cmsData.calculatorHeading,
          partnerStores: cmsData.stores || [],
          stores: cmsData.stores || [],
          banners: cmsData.homeBanners || [],
          homeBanners: cmsData.homeBanners || [],
          updatedAt: cmsData.updatedAt
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_home_settings', JSON.stringify(res));
        }
        return res;
      }
    }
  } catch (err) {
    if (!isFirestoreGrpcNoise(err)) {
      console.warn('Notice reading settings/home from Firestore:', err);
    }
  }

  // 3. Fallback to LocalStorage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('sirikfit_home_settings');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {}
    }
  }

  return {};
};

/**
 * Saves home settings to settings/home and synchronizes cms/app, ensuring
 * partnerStores and banners are atomically preserved.
 */
export const saveHomeSettings = async (data: Partial<HomeSettingsDoc>): Promise<boolean> => {
  if (!db) {
    console.error('Firestore not initialized');
    return false;
  }

  try {
    const nowIso = new Date().toISOString();
    
    // First read current settings/home and cms/app to guarantee we preserve partnerStores & banners
    let existingStores: any[] = [];
    let existingBanners: any[] = [];

    try {
      const homeSnap = await getDoc(doc(db, 'settings', 'home'));
      if (homeSnap.exists()) {
        const hData = homeSnap.data();
        if (Array.isArray(hData.partnerStores) && hData.partnerStores.length > 0) existingStores = hData.partnerStores;
        else if (Array.isArray(hData.stores) && hData.stores.length > 0) existingStores = hData.stores;

        if (Array.isArray(hData.banners) && hData.banners.length > 0) existingBanners = hData.banners;
        else if (Array.isArray(hData.homeBanners) && hData.homeBanners.length > 0) existingBanners = hData.homeBanners;
      }
      if (existingStores.length === 0 || existingBanners.length === 0) {
        const cmsSnap = await getDoc(doc(db, 'cms', 'app'));
        if (cmsSnap.exists()) {
          const cData = cmsSnap.data();
          if (existingStores.length === 0 && Array.isArray(cData.stores)) existingStores = cData.stores;
          if (existingBanners.length === 0 && Array.isArray(cData.homeBanners)) existingBanners = cData.homeBanners;
        }
      }
    } catch (_err) {}

    const payload: HomeSettingsDoc = {
      ...data,
      updatedAt: nowIso
    };

    // If data didn't explicitly pass partnerStores/stores, preserve existing
    if (!payload.partnerStores && !payload.stores && existingStores.length > 0) {
      payload.partnerStores = existingStores;
      payload.stores = existingStores;
    } else if (payload.partnerStores && !payload.stores) {
      payload.stores = payload.partnerStores;
    } else if (payload.stores && !payload.partnerStores) {
      payload.partnerStores = payload.stores;
    }

    // If data didn't explicitly pass banners/homeBanners, preserve existing
    if (!payload.banners && !payload.homeBanners && existingBanners.length > 0) {
      payload.banners = existingBanners;
      payload.homeBanners = existingBanners;
    } else if (payload.banners && !payload.homeBanners) {
      payload.homeBanners = payload.banners;
    } else if (payload.homeBanners && !payload.banners) {
      payload.banners = payload.homeBanners;
    }

    // 1. Write to settings/home with sanitized payload
    await setDoc(doc(db, 'settings', 'home'), sanitizePayloadForFirestore(payload), { merge: true });

    // 2. Synchronize to cms/app
    const cmsSyncPayload: any = {
      ...payload,
      stores: payload.stores || payload.partnerStores || existingStores,
      homeBanners: payload.homeBanners || payload.banners || existingBanners
    };
    await setDoc(doc(db, 'cms', 'app'), sanitizePayloadForFirestore(cmsSyncPayload), { merge: true });

    // 3. Local storage & events
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sirikfit_home_settings', JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent('homeSettingsUpdated', { detail: payload }));
        window.dispatchEvent(new Event('storage'));
      } catch (_e) {}
    }

    return true;
  } catch (err) {
    console.error('Failed to save home settings to Firestore:', err);
    return false;
  }
};

/**
 * Real-time listener on settings/home
 */
export const subscribeToHomeSettings = (callback: (settings: HomeSettingsDoc) => void): (() => void) => {
  if (!db) return () => {};

  try {
    const unsub = onSnapshot(doc(db, 'settings', 'home'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as HomeSettingsDoc;
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_home_settings', JSON.stringify(data));
        }
        callback(data);
      }
    }, (err) => {
      if (!isFirestoreGrpcNoise(err)) {
        console.warn('Notice listening to settings/home:', err);
      }
    });

    return () => {
      unsub();
    };
  } catch (e) {
    console.warn('Error setting up settings/home snapshot:', e);
    return () => {};
  }
};
