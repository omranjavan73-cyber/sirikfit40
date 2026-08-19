export interface SeoSettings {
  // A. Global Meta Tags & Identity
  siteTitleTemplate: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl: string;
  robotsIndex: 'index, follow' | 'noindex, nofollow' | 'noindex, follow' | 'index, nofollow' | 'noarchive';
  siteName: string;
  author: string;

  // B. Search Engine Verification & Tracking
  googleVerificationCode: string;
  bingVerificationCode: string;
  ga4MeasurementId: string;
  gtmContainerId: string;

  // C. Social Sharing (Open Graph & Twitter Cards)
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  ogType: string;
  twitterCardType: 'summary_large_image' | 'summary';
  twitterHandle?: string;

  // D. Structured Data (JSON-LD Schema Markup)
  orgName: string;
  orgLegalName?: string;
  orgLogoUrl: string;
  orgPhone: string;
  orgEmail: string;
  orgInstagram?: string;
  orgTelegram?: string;
  orgWhatsapp?: string;
  storeAddress: string;
  storeCity: string;
  storeCountry: string;
  priceCurrency: string;
  enableProductSchema: boolean;
  enableOrganizationSchema: boolean;
  enableLocalBusinessSchema: boolean;

  // Metadata
  updatedAt?: string;
  updatedBy?: string;
}

export const defaultSeoSettings: SeoSettings = {
  siteTitleTemplate: 'سیریک فیت | SIRIK FIT - خرید آنلاین مکمل‌های اورجینال ورزشی از دبی',
  metaDescription: 'سیریک فیت مرجع معتبر خرید آنلاین و واردات مستقیم مکمل‌های ورزشی و بدنسازی اورجینال از معتبرترین فروشگاه‌های دبی با ضمانت اصالت و ارسال سریع به سراسر ایران.',
  metaKeywords: [
    'سیریک فیت',
    'خرید مکمل از دبی',
    'پروتئین وی اورجینال',
    'کراتین مونوهیدرات',
    'گینر اصل',
    'مکمل بدنسازی',
    'Dr Nutrition دبی',
    'GNC دبی',
    'واردات مکمل ورزشی',
    'خرید از آمازون امارات'
  ],
  canonicalUrl: 'https://sirikfit.ir',
  robotsIndex: 'index, follow',
  siteName: 'سیریک فیت (SIRIK FIT)',
  author: 'SirikFit Dubai Trade Group',

  googleVerificationCode: '',
  bingVerificationCode: '',
  ga4MeasurementId: '',
  gtmContainerId: '',

  ogTitle: 'سیریک فیت | واردات مستقیم مکمل‌های ورزشی اورجینال از دبی',
  ogDescription: 'برآورد آنی قیمت، تضمین اصالت ۱۰۰٪ و تحویل سریع مکمل‌های معتبر امارات در ایران با سیریک فیت.',
  ogImageUrl: 'https://sirikfit.ir/og-preview.jpg',
  ogType: 'website',
  twitterCardType: 'summary_large_image',
  twitterHandle: '@sirikfit',

  orgName: 'بازرگانی سیریک فیت',
  orgLegalName: 'گروه بازرگانی سیریک فیت قشم و دبی',
  orgLogoUrl: 'https://sirikfit.ir/favicon.svg',
  orgPhone: '09170000000',
  orgEmail: 'support@sirikfit.ir',
  orgInstagram: 'https://instagram.com/sirikfit',
  orgTelegram: 'https://t.me/sirikfit',
  orgWhatsapp: 'https://wa.me/989170000000',
  storeAddress: 'بندر سیریک، بازار مرکزی تجاری، دفتر بازرگانی سیریک فیت',
  storeCity: 'سیریک',
  storeCountry: 'ایران',
  priceCurrency: 'IRR',
  enableProductSchema: true,
  enableOrganizationSchema: true,
  enableLocalBusinessSchema: true
};
