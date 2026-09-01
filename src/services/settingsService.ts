import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { isFirestoreGrpcNoise } from '../firebase';
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

/**
 * Normalizes any Iranian (09... / 98...) or UAE (+971... / 971...) mobile number
 * and constructs a clean WhatsApp deep link URL using the standard api.whatsapp.com endpoint.
 */
export function formatWhatsAppUrl(rawPhone?: string, defaultMessage = 'سلام، در رابطه با خرید از سیریک فیت راهنمایی میخواستم'): string {
  if (!rawPhone || !rawPhone.trim()) return '';
  let clean = rawPhone.replace(/[^0-9]/g, '');
  if (clean.startsWith('09')) clean = '98' + clean.substring(1);
  if (clean.startsWith('00')) clean = clean.substring(2);
  if (!clean) clean = '971501234567';
  return `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(defaultMessage)}`;
}

export function formatWhatsAppLink(phone: string, text = 'سلام، در رابطه با خرید از سیریک فیت راهنمایی میخواستم'): string {
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
    whatsappNumber: '+971501234567',
    whatsappDefaultMessage: 'سلام، درخواست راهنمایی و پشتیبانی دارم'
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
 * Single source of truth: Fetches support configuration from settings/support with fallback to settings/general
 */
export const getSupportSettings = async (): Promise<SupportFirestoreDoc> => {
  try {
    if (db) {
      const snap = await getDoc(doc(db, 'settings', 'support'));
      if (snap.exists()) {
        const data = snap.data() as SupportFirestoreDoc;
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_support_settings', JSON.stringify(data));
        }
        return data;
      }
    }
  } catch (err) {
    if (!isFirestoreGrpcNoise(err)) {
      console.warn('Notice reading settings/support from Firestore:', err);
    }
  }

  // Fallback to settings/general or localStorage
  const general = await getGeneralSettings();
  if (general.whatsappNumber || general.whatsappSupportNumber) {
    return {
      whatsappNumber: general.whatsappNumber || general.whatsappSupportNumber,
      whatsappDefaultMessage: general.whatsappDefaultMessage,
      telegramBotUsername: general.telegramBotUsername
    };
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('sirikfit_support_settings');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {}
    }
  }

  return {
    whatsappNumber: '+971501234567',
    whatsappDefaultMessage: 'سلام، در رابطه با خرید از سیریک فیت راهنمایی میخواستم'
  };
};

/**
 * Saves support configuration to settings/support as single source of truth,
 * and synchronizes settings/general and settings/support_config for backward compatibility.
 */
export const saveSupportSettings = async (data: Partial<SupportFirestoreDoc>): Promise<boolean> => {
  const payload = {
    ...data,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = localStorage.getItem('sirikfit_support_settings');
      const merged = existing ? { ...JSON.parse(existing), ...payload } : payload;
      localStorage.setItem('sirikfit_support_settings', JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('supportSettingsUpdated', { detail: merged }));
    } catch (_e) {}
  }

  try {
    if (db) {
      // 1. Primary write to settings/support
      await setDoc(doc(db, 'settings', 'support'), payload, { merge: true });

      // 2. Mirror to settings/general
      await setDoc(doc(db, 'settings', 'general'), {
        whatsappNumber: payload.whatsappNumber,
        whatsappSupportNumber: payload.whatsappNumber,
        whatsappDefaultMessage: payload.whatsappDefaultMessage,
        updatedAt: payload.updatedAt
      }, { merge: true });

      // 3. Mirror to settings/support_config
      await setDoc(doc(db, 'settings', 'support_config'), {
        whatsappNumber: payload.whatsappNumber,
        whatsappDefaultMessage: payload.whatsappDefaultMessage,
        updatedAt: payload.updatedAt
      }, { merge: true });
    }
    return true;
  } catch (err) {
    if (!isFirestoreGrpcNoise(err)) {
      console.warn('Notice saving to settings/support in Firestore:', err);
    }
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



