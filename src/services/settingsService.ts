import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { LandingSettings } from '../types';
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
  // 1. Direct Firestore Fetch
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
    console.error('Error loading landing settings from Firestore:', err);
  }

  // 2. API Backend Fetch Fallback
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/landing-settings');
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && json.landingSettings && Object.keys(json.landingSettings).length > 0) {
          const merged: LandingSettings = { ...defaultLandingSettings, ...json.landingSettings };
          localStorage.setItem('sirikfit_landing_settings', JSON.stringify(merged));
          return merged;
        }
      }
    }
  } catch (_) {}

  // 3. LocalStorage Fallback
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

export const saveLandingSettings = async (settings: Partial<LandingSettings>): Promise<boolean> => {
  try {
    const payload: LandingSettings = {
      ...defaultLandingSettings,
      ...settings,
      updatedAt: new Date().toISOString()
    } as any;

    // 1. Firestore Write
    if (db) {
      const docRef = doc(db, 'settings', 'landing');
      await setDoc(docRef, payload, { merge: true });
      try {
        await setDoc(doc(db, 'settings', 'general'), payload, { merge: true });
      } catch (_) {}
    }

    // 2. API Backend Write
    try {
      if (typeof window !== 'undefined') {
        fetch('/api/landing-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    } catch (_) {}

    // 3. LocalStorage & Custom Event Write
    if (typeof window !== 'undefined') {
      localStorage.setItem('sirikfit_landing_settings', JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('landingSettingsUpdated', { detail: payload }));
    }

    return true;
  } catch (err) {
    console.error('Error saving landing settings:', err);
    return false;
  }
};

