export interface ProductFlavorVariant {
  id: string;
  name: string;
  flavor?: string;         // for compatibility
  imageUrl?: string;
  image?: string;          // for compatibility
  hasCustomPrice?: boolean; // Checkbox toggle
  priceAED?: number;       // Buying price in AED
  priceAed?: number;       // for compatibility
  weightKg?: number;       // Weight in KG (default 0.8)
  priceToman?: number;     // Auto-calculated & editable selling Toman price
  inStock?: boolean;
  isAvailable?: boolean;
}

export interface ProductSizeVariant {
  id: string;
  size: string;
  name?: string;           // for compatibility
  displayLabel?: string;   // Formatted Persian/LBS bilingual label
  hasCustomPrice?: boolean; // Checkbox toggle
  priceAED?: number;       // Buying price in AED
  priceAed?: number;       // for compatibility
  weightKg?: number;       // Weight in KG
  priceToman?: number;     // Auto-calculated & editable selling Toman price
  inStock?: boolean;
  isAvailable?: boolean;
}

export interface ProductVariantItem {
  id: string;
  title: string;        // e.g. "120 Servings" or "Chocolate / 5 lbs"
  size?: string;
  flavor?: string;
  name?: string;
  url?: string;         // Sibling product URL for URL-based variant stores (e.g. Dr. Nutrition)
  priceAED: number;     // Variant-specific price
  priceAed?: number;
  originalPriceAED?: number;
  originalPriceAed?: number;
  priceToman?: number;
  weightKg?: number;
  image?: string;
  imageThumbnail?: string;
  inStock: boolean;
}

export interface ProductVariantMatrix {
  sizes: string[];      // e.g., ["1 kg", "1.8 kg", "5 lbs", "32 Servings"]
  flavors: string[];    // e.g., ["Chocolate Caramel", "Green Apple", "Vanilla"]
  items: ProductVariantItem[]; // Full matrix of options with individual pricing
  selectedVariant?: ProductVariantItem;
}

export interface ScrapedProductDetail {
  id: string;
  source: 'drnutrition' | 'gnc' | 'lifepharmacy' | 'generic';
  sourceUrl: string;
  canonicalUrl?: string;
  title: string;
  brand: string;
  currentPriceAED: number;
  originalPriceAED?: number;
  discountPercentage?: number;
  currency: 'AED';
  mainImage: string;
  galleryImages: string[];
  inStock: boolean;
  variants: ProductVariantMatrix;
  description: string;
  nutritionFacts?: Record<string, string>;
  ingredients?: string[];
  category?: string;
  scrapedAt: string;
}

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  postalCode?: string;
  createdAt: string;
}

export interface FinancialSettings {
  aedRate: number | null; // Tomans per AED (Active Exchange Rate)
  manualAedRate?: number; // Manual override rate
  autoUpdateRates?: boolean; // Enable automatic API fetch switch
  currencyApiUrl?: string; // Rate API endpoint
  cargoRatePerKg?: number; // e.g., 35 AED per KG
  cargoFeePerKg?: number;
  profitMargin?: number; // e.g., 15 (%)
  profitMarginPercent?: number;
  minOrderAed?: number; // Deprecated: Minimum cart order in AED (e.g., 200)
  minOrderAmountToman?: number; // Minimum cart order in Toman (e.g., 5000000 or 0)
  minOrderLimitEnabled?: boolean; // Whether minimum order limit is enforced
  insurancePercent?: number;
  customsFeePercent?: number;
  showEnamad?: boolean;
  updatedAt?: string | number;
}

export interface StoreCardItem {
  id: string;
  title: string;
  shortTitle?: string;
  subtitle?: string;
  description: string;
  url: string;
  image: string;
  badge?: string;
  brandColor?: string;
  ctaText?: string;
  enabled?: boolean;
  active?: boolean;
  samplePriceAed?: number;
  sampleWeightKg?: number;
}

export interface FeaturedDeal {
  id: string;
  title: string;
  brand?: string;
  category: string;
  categoryKey?: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg?: number;
  profitMargin?: number;
  marginPercent?: number;
  priceToman?: number;
  originalPriceToman?: number;
  stockQuantity?: number;
  stockCount?: number;
  image?: string;
  images?: string[];
  url: string;
  storeName?: string;
  badge?: string;
  deliveryBadge?: string;
  section?: 'featured' | 'bestseller' | 'discount';
  isFeaturedInCalculator?: boolean;
  isPopularSample?: boolean;
  isPopular?: boolean;
  isActive: boolean;
  inStock?: boolean;
  mainCategory?: string;
  subCategory?: string;
  description?: string;
  flavors?: (string | any)[];
  sizes?: (string | any)[];
  variants?: any[];
  [key: string]: any;
}

export interface LocalInventoryItem {
  id: string;
  title: string;
  brand?: string;
  image: string;
  images?: string[];
  priceToman: number;
  originalPriceToman?: number;
  calculatedTomanOverride?: number;
  stockQuantity: number;
  stockCount?: number;
  category: string;
  categoryKey?: string;
  mainCategory?: string;
  subCategory?: string;
  description?: string;
  deliveryBadge?: string;
  inStock: boolean;
  isIranWarehouse?: boolean;
  isLocalInventory?: boolean;
  isPopularSample?: boolean;
  isPopular?: boolean;
  priceAed?: number;
  weightKg?: number;
  marginPercent?: number;
  flavors?: (string | any)[];
  sizes?: (string | any)[];
  variants?: any[];
  url?: string;
  [key: string]: any;
}

export interface HomePageSettings {
  topPromoText: string;
  showTopPromo: boolean;
  appTitle: string;
  appSubtitle: string;
  brandTitle?: string;
  brandSubtitle?: string;
  logoUrl?: string;
  calcBlackBadge: string;
  calcMainHeadline: string;
  calcSubtitle: string;
  calcScheduleBadge: string;
  telegramHandle: string;
  telegramLink: string;
  whatsappPhone?: string;
  whatsappLink?: string;
  officePhone: string;
  dubaiPhone?: string;
  showDubaiPhone?: boolean;
  showWhatsappCard?: boolean;
  telegramBotToken?: string;
  adminChatId?: string;
  telegramNotifyEnabled?: boolean;
  adminDestinationEmail?: string;
  emailNotifyEnabled?: boolean;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  resendApiKey?: string;
  supportHeadline: string;
  supportSubtitle: string;
  showSupportSection: boolean;
  showFaqSection?: boolean;
  showTelegramCard?: boolean;
  telegramTitle?: string;
  showEmailCard?: boolean;
  emailTitle?: string;
  showPhoneCard?: boolean;
  phoneTitle?: string;
  trustBadge1: string;
  trustBadge2: string;
  trustBadge3: string;
  showTrustBadges?: boolean;
  showEnamad?: boolean;
  showSamandehi?: boolean;
  enamadHtml?: string;
  enamadCode?: string;
  enamadUrl?: string;
  samandehiHtml?: string;
  samandehiCode?: string;
  customBadgeImg?: string;
  customBadgeLink?: string;
  supportPhone?: string;
  headerPillSlogan?: string;
  heroMainHeadline?: string;
  heroHighlightWord?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
}

export type GatewayProvider = 'zibal';

export interface PaymentGatewayConfig {
  activeGateway: 'zibal';
  zibalMerchantId: string;
  zibalSandbox: boolean;
  callbackUrl: string;
  successMessage?: string;
  merchantId?: string;
  isSandbox?: boolean;
  updatedAt?: string;
}

export interface GatewayProviderConfig extends PaymentGatewayConfig {}

export interface CommissionRule {
  id: string;
  minAmountAed: number;
  maxAmountAed: number | null; // null means 'Above' max
  commissionPercent: number;
  isEnabled: boolean;
}

export interface ShippingIncrementRule {
  id: string;
  itemNumber: number; // e.g. 2 for 2nd item, 3 for 3rd item
  additionalCostAed: number;
  isEnabled: boolean;
}

export interface PricingRulesConfig {
  minOrderAmountToman?: number;
  minOrderLimitEnabled?: boolean;
  baseCommission: {
    percentage: number;
    isEnabled: boolean;
  };
  commissionRules: CommissionRule[];
  shippingConfig: {
    baseShippingCostAed: number;
    minShippingCostAed: number;
    maxShippingCostAed: number;
  };
  shippingIncrementRules: ShippingIncrementRule[];
}

export interface WarehouseCategory {
  id: string;
  label: string;
  name?: string;
  iconUrl?: string;
  imageUrl?: string;
  filterKey: string;
  englishLabel?: string;
  isPinned?: boolean;
}

export interface HomeBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  title?: string;
  enabled?: boolean;
}

export interface DomainItem {
  domain: string;
  enabled: boolean;
}

export interface FeatureToggles {
  showReviews?: boolean;
  showComments?: boolean;
  showStores?: boolean;
  showBreakdown?: boolean;
  showLocalInventory?: boolean;
  showAnnouncementBanner?: boolean;
  showSupportSection?: boolean;
  showTopPromo?: boolean;
  showTrustBadges?: boolean;
  showEnamad?: boolean;
  showSamandehi?: boolean;
  showFaqSection?: boolean;
}

export interface PromoPopupConfig {
  enabled: boolean;
  targetPage: 'all' | 'home' | 'inventory' | 'deals';
  template: 'template1' | 'template2' | 'template3';
  imageUrl?: string;
  title: string;
  subtitle?: string;
  discountText?: string;
  couponCode?: string;
  buttonText: string;
  targetUrl: string;
  delaySeconds: number;
}

export interface ServicePillarItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface TermItem {
  id: string;
  title: string;
  description: string;
}

export interface LandingBenefitItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface LandingFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface LandingRuleItem {
  id: string;
  title: string;
  content: string;
}

export const ENAMAD_CONFIG = {
  enabled: true,
  id: "7355626",
  code: "jj9HCtmWurzgveMEKQyc6iOcMamK4RG8",
  verificationUrl: "https://trustseal.enamad.ir/?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8",
  logoUrl: "https://trustseal.enamad.ir/logo.aspx?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8"
};

export interface ContactSettings {
  showTelegram: boolean;
  telegramId: string;
  telegramActionText: string; // Default: 'چت آنلاین'

  showEmail: boolean;
  supportEmail: string;
  emailActionText: string;    // Default: 'ارسال ایمیل'

  showPhone: boolean;
  supportPhone: string;
  phoneActionText: string;    // Default: 'تماس تلفنی'

  showHours: boolean;
  supportHours: string;       // Default: 'پاسخگویی همه‌روزه، ساعت ۹ صبح الی ۲۳'

  showAddress: boolean;
  officeLocation: string;     // Default: 'دفتر هماهنگی و ارسال مرسولات دبی و ایران'
}

export interface LandingSettings {
  // 1. Visibility Toggles
  showBenefits: boolean;
  showAbout: boolean;
  showContact: boolean;
  showFaq: boolean;
  showRules: boolean;
  showTrustBadges: boolean;
  showEnamad?: boolean;

  // 1.1 Granular Contact Channel Toggles
  showTelegram?: boolean;
  telegramActionText?: string;
  showEmail?: boolean;
  emailActionText?: string;
  showPhone?: boolean;
  phoneActionText?: string;
  showHours?: boolean;
  showAddress?: boolean;

  // 2. Brand & About
  brandName: string;
  brandSubtitle: string;
  aboutText: string;
  deliveryGuaranteeBadge: string;

  // 3. Contact & Support (Consolidated from General Settings)
  telegramId: string;
  supportEmail: string;
  supportPhone: string;
  supportHours: string;
  officeLocation: string;
  enamadCode?: string;

  // 4. Structured Lists
  benefits: Array<{ id: string; title: string; description: string; icon?: string }>;
  faqs: Array<{ id: string; question: string; answer: string }>;
  rules: Array<{ id: string; title: string; content: string }>;
}

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
  enamadCode: `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8' alt='نماد اعتماد الکترونیکی' style='cursor:pointer' code='jj9HCtmWurzgveMEKQyc6iOcMamK4RG8'></a>`,
  benefits: [
    { id: "b1", title: "اصالت ۱۰۰٪ کالا", description: "خرید مستقیم از نمایندگیهای رسمی دبی (GNC، Dr. Nutrition، Sporter)" },
    { id: "b2", title: "حمل ایمن و سریع", description: "ارسال تخصصی با کنترل دما و بستهبندی استاندارد" },
    { id: "b3", title: "قیمت منصفانه و شفاف", description: "محاسبه خودکار و دقیق بر اساس نرخ زنده درهم بدون واسطه" },
    { id: "b4", title: "مشاوره و پشتیبانی ۲۴/۷", description: "راهنمایی تخصصی جهت انتخاب مکملهای مناسب" }
  ],
  faqs: [
    { id: "f1", question: "آیا محصولات دارای ضمانت اصالت هستند؟", answer: "بله، تمامی کالاها مستقیماً با فاکتور رسمی از دبی خریداری و با پلمپ شرکتی ارسال میشوند." },
    { id: "f2", question: "زمان تحویل سفارش چقدر است؟", answer: "سفارشهای انبار ایران فوری (۱ الی ۲ روز) و سفارشهای مستقیم دبی ظرف ۵ الی ۱۰ روز کاری تحویل میگردند." }
  ],
  rules: [
    { id: "r1", title: "ضمانت اصالت و سلامت فیزیکی", content: "کلیه سفارشها قبل از ارسال در دفتر دبی بازرسی و تست پلمپ میشوند." },
    { id: "r2", title: "روند ثبت و پیگیری سفارش", content: "پس از ثبت سفارش، کد رهگیری پست و وضعیت ترخیص به کاربر پیامک میشود." }
  ]
};

export interface LandingContentSettings {
  // Visibility switches
  showAboutUs: boolean;
  showServices: boolean;
  showContactSupport: boolean;
  showTerms: boolean;

  // About Us
  aboutUsTitle: string;
  aboutUsSubtitle?: string;
  aboutUsDescription: string;
  aboutUsBadge?: string;
  aboutUsHighlight1?: string;
  aboutUsHighlight2?: string;
  aboutUsHighlight3?: string;
  aboutUsHighlight4?: string;

  // Services & Features (4 pillars)
  servicesTitle: string;
  servicesSubtitle?: string;
  servicesList: ServicePillarItem[];

  // Contact & Support
  contactTitle: string;
  contactSubtitle?: string;
  supportEmail: string;
  supportTelegram: string;
  supportTelegramLink?: string;
  supportPhone: string;
  supportHours: string;
  officeAddress: string;

  // Terms & Conditions
  termsTitle: string;
  termsSubtitle?: string;
  termsList: TermItem[];
}

export const DEFAULT_LANDING_CONTENT: LandingContentSettings = {
  showAboutUs: true,
  showServices: true,
  showContactSupport: true,
  showTerms: true,

  aboutUsTitle: 'درباره سیریک فیت',
  aboutUsSubtitle: 'مرجع تخصصی واردات مستقیم و تضمینی مکمل‌های ورزشی از دبی',
  aboutUsDescription:
    'سیریک فیت (SIRIK FIT) مرجع تخصصی تأمین و واردات مستقیم مکمل‌های ورزشی و غذایی اورجینال از معتبرترین برندهای جهانی و نمایندگی‌های امارات متحده عربی است. هدف ما تضمین ۱۰۰٪ اصالت کالا، بهترین قیمت رقابتی بر پایه درهم و تحویل ایمن و سریع (۵ الی ۱۰ روز کاری) به سراسر ایران می‌باشد.',
  aboutUsBadge: 'تضمین ۱۰۰٪ اصالت فیزیکی و آزمایشگاهی',
  aboutUsHighlight1: 'تأمین مستقیم و بدون واسطه از معتبرترین نمایندگی‌های رسمی دبی (Dr. Nutrition, GNC, Life Pharmacy)',
  aboutUsHighlight2: 'ارسال ایمن و تخصصی کارگو هوایی بدون آسیب به مکمل‌ها ظرف ۵ تا ۱۰ روز کاری',
  aboutUsHighlight3: 'محاسبه شفاف و زنده قیمت نهایی ریالی بر اساس نرخ روز درهم و کمترین هزینه حمل',
  aboutUsHighlight4: 'پشتیبانی و مشاوره ۲۴ ساعته توسط کارشناسان تغذیه و لاجستیک اختصاصی',

  servicesTitle: 'خدمات و مزایای سیریک فیت',
  servicesSubtitle: 'چرا ورزشکاران حرفه‌ای خرید از دبی را با سیریک فیت تجربه می‌کنند؟',
  servicesList: [
    {
      id: 'pillar-1',
      title: 'اصالت ۱۰۰٪ کالا',
      description: 'تضمین خرید مستقیم از نمایندگی‌های رسمی دبی و برندهای معتبر بین‌المللی با هولوگرام و بچ‌نامبر معتبر.',
      icon: 'ShieldCheck'
    },
    {
      id: 'pillar-2',
      title: 'حمل ایمن و سریع',
      description: 'ارسال تخصصی با کنترل دما و بسته‌بندی استاندارد ظرف ۵ تا ۱۰ روز کاری به سراسر کشور.',
      icon: 'Truck'
    },
    {
      id: 'pillar-3',
      title: 'قیمت منصفانه و شفاف',
      description: 'محاسبه خودکار و دقیق قیمت نهایی بر اساس نرخ زنده درهم بدون واسطه‌های غیرضروری و کارمزد پنهان.',
      icon: 'Coins'
    },
    {
      id: 'pillar-4',
      title: 'مشاوره و پشتیبانی ۲۴/۷',
      description: 'راهنمایی تخصصی جهت انتخاب مکمل‌های متناسب با هدف ورزشی و دوره تمرینی شما در تلگرام و تلفنی.',
      icon: 'Headphones'
    }
  ],

  contactTitle: 'تماس با پشتیبانی و ارتباط با ما',
  contactSubtitle: 'پاسخگویی همه‌روزه، مشاوره تخصصی و پیگیری لحظه‌ای سفارش‌ها',
  supportEmail: 'info@sirikfit.ir',
  supportTelegram: '@SIRIK_FIT_Support',
  supportTelegramLink: 'https://t.me/SIRIK_FIT_Support',
  supportPhone: '021-91000000',
  supportHours: 'پاسخگویی همه‌روزه، ساعت ۹ صبح الی ۲۳',
  officeAddress: 'دفتر هماهنگی و ارسال مرسولات دبی و ایران',

  termsTitle: 'قوانین و مقررات خرید از سیریک فیت',
  termsSubtitle: 'شفافیت کامل، حفظ حقوق مشتریان و استانداردهای ارسال بین‌المللی',
  termsList: [
    {
      id: 'term-1',
      title: 'ضمانت اصالت و سلامت فیزیکی',
      description: 'تمامی محصولات دارای هولوگرام، بچ‌نامبر و تاریخ انقضای معتبر هستند و با ضمانت بازگشت وجه عرضه می‌شوند.'
    },
    {
      id: 'term-2',
      title: 'روند ثبت و پیگیری سفارش',
      description: 'بلافاصله پس از ثبت سفارش، کد رهگیری و پیامک تایید برای خریدار ارسال می‌شود و وضعیت مرسوله در پنل کاربری قابل استعلام است.'
    },
    {
      id: 'term-3',
      title: 'شرایط تعویض و مرجوعی',
      description: 'در صورت هرگونه مغایرت کالا با لینک ثبت شده یا باز نشدن پلمپ محصول تا ۷ روز کاری امکان بازگشت وجه یا تعویض وجود دارد.'
    },
    {
      id: 'term-4',
      title: 'حریم خصوصی و امنیت اطلاعات',
      description: 'تمامی اطلاعات تماس، تراکنش‌ها و نشانی مشتریان نزد سرورهای امن سیریک فیت محفوظ بوده و در اختیار اشخاص ثالث قرار نمی‌گیرد.'
    }
  ]
};

export interface CmsConfig {
  landingSettings?: LandingSettings;
  landingContent?: LandingContentSettings;
  features?: FeatureToggles;
  promoPopup?: PromoPopupConfig;
  heroTitle: string;
  heroSubtitle: string;
  heroNotice: string;
  heroImage: string;
  showAnnouncementBanner?: boolean;
  showPriceBreakdown?: boolean;
  showBreakdown?: boolean;
  showReviewsSection?: boolean;
  showReviews?: boolean;
  showComments?: boolean;
  showStores?: boolean;
  showSupportSection?: boolean;
  showFaqSection?: boolean;
  showTopPromo?: boolean;
  showTrustBadges?: boolean;
  showEnamad?: boolean;
  showSamandehi?: boolean;
  enamadHtml?: string;
  enamadCode?: string;
  enamadUrl?: string;
  samandehiHtml?: string;
  samandehiCode?: string;
  customBadgeImg?: string;
  customBadgeLink?: string;
  popularSamplesOrder?: string[];
  announcementText?: string;
  announcementBadge?: string;
  announcementSlogans?: string[];
  homeBanners?: HomeBanner[];
  stores: StoreCardItem[];
  deals?: FeaturedDeal[];
  showLocalInventory?: boolean;
  warehouseBannerTitle?: string;
  warehouseBannerSubtitle?: string;
  warehouseBannerTheme?: 'light' | 'dark' | 'emerald' | 'amber';
  warehouseBannerButtonText?: string;
  localInventory?: LocalInventoryItem[];
  warehouseCategories?: WarehouseCategory[];
  homeContent?: HomePageSettings;
  paymentGateway?: PaymentGatewayConfig;
  pricingRules?: PricingRulesConfig;
  apiConfig: {
    currencyApiUrl: string;
    autoUpdateRates: boolean;
    scraperEndpoint: string;
    geminiApiKey: string;
    geminiApiKey1?: string;
    geminiApiKey2?: string;
    geminiApiKey3?: string;
    geminiApiKeys?: string[];
    telegramBotToken?: string;
    adminChatId?: string;
    telegramNotifyEnabled?: boolean;
    adminDestinationEmail?: string;
    emailNotifyEnabled?: boolean;
    emailjsServiceId?: string;
    emailjsTemplateId?: string;
    emailjsPublicKey?: string;
    resendApiKey?: string;
    allowedDomains?: string[];
    domainItems?: DomainItem[];
    enableDomainRestriction?: boolean;
    scraperApiKey?: string;
    enableScraperApi?: boolean;
    puppeteerScraperUrl?: string;
  };
}

export type PaymentStatus = 'PAID' | 'PENDING' | 'FAILED';
export type ShippingStatus = 
  | 'PENDING_BUY' 
  | 'PURCHASED' 
  | 'DUBAI_WAREHOUSE' 
  | 'SHIPPED_IRAN' 
  | 'COMPLETED' 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'SHIPPED' 
  | 'DELIVERED';

export interface DiscountCode {
  id: string;
  code: string;                 // e.g. "OFF10", "OMRAN2026" (uppercase, trimmed)
  type: 'percent' | 'fixed';     // Percentage or Fixed Toman amount
  value: number;                // e.g. 15 for 15% OR 200000 for 200k Toman
  minOrderToman?: number;       // Optional minimum order criteria
  maxDiscountToman?: number;    // Optional ceiling for percentage discounts
  usageLimit?: number;          // Max total uses allowed (e.g. 100)
  usedCount: number;            // Current number of redemptions
  expiryDate?: string;          // ISO string date or YYYY-MM-DD
  isActive: boolean;            // Active status toggle
  applicableSection?: 'ALL' | 'IRAN_WAREHOUSE' | 'OFFERS'; // Section Scope: ALL, IRAN_WAREHOUSE, or OFFERS
  createdAt: number;
}

export interface Order {
  id: string;
  orderId?: string;
  orderNumber?: string;
  userId?: string;
  trackingCode: string;
  customerName: string;
  phoneNumber: string;
  customerPhone?: string;
  deliveryAddress: string;
  shippingAddress?: string;
  postalCode?: string;
  notes?: string;
  productTitle: string;
  productUrl: string;
  productImage?: string;
  storeName?: string;
  priceAed: number;
  weightKg: number;
  aedRate?: number;
  cargoRatePerKg?: number;
  profitMargin?: number;
  calculatedToman: number;
  totalToman?: number;
  totalAmountToman?: number;
  paymentStatus: PaymentStatus | string;
  shippingStatus: ShippingStatus | string;
  orderStatus?: string;
  paymentMethod?: string;
  items?: any[];
  customer?: any;
  createdAt: string | number;
  updatedAt?: string | number;
  paymentRefId?: string;
  paymentRefNumber?: string;
  trackId?: string;
  paidAt?: string;
  paymentGateway?: string;
  gateway?: string;
  paymentDetails?: any;
  paymentFailureReason?: string;
  selectedOption?: string;
  discountCode?: string;
  discountAmountToman?: number;
  isLocalInventory?: boolean;
  status?: string;
  [key: string]: any;
}

export interface ScrapedProductResult {
  id: string;
  title: string;
  brand?: string;
  sourceStore: string;
  sourceUrl: string;
  mainImage: string;
  galleryImages: string[]; // Array of full-res and secondary photo URLs
  videos?: string[];       // Product videos if available
  basePriceAED: number;
  calculatedPriceToman: number;
  inStock: boolean;
  variants: ProductVariantItem[];
  variantMatrix?: ProductVariantMatrix;
  variantGroups?: VariantGroupsStructure;
  features?: string[];
  description?: string;
}

export interface VariantOption {
  id: string;
  label?: string; // e.g., "Double Rich Chocolate" or "5 lbs / 2.27 kg"
  name: string;   // for backward compatibility & direct access
  nameFa?: string;
  type?: 'flavor' | 'size' | 'color' | 'general' | 'style' | 'generic';
  inStock: boolean; // Strict in-stock validation
  price?: number;
  priceAed?: number; // for backward compatibility
  priceAED?: number;
  originalPrice?: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  currency?: string;
  imageUrl?: string;
  image?: string; // for backward compatibility
  sku?: string;
  url?: string;
}

export interface VariantGroupsStructure {
  flavors?: VariantOption[];
  sizes?: VariantOption[];
  others?: VariantOption[];
}

export interface ProductData {
  title: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  description: string;
  features?: string[];
  images: string[];
  videos?: string[];
  variantGroups: VariantGroupsStructure;
  isAvailable: boolean;
  sourceUrl: string;
}

export interface VariantDimension {
  id: string;
  name: string;
  type: 'flavor' | 'size' | 'color' | 'style' | 'generic';
  options: VariantOption[];
}

export interface UniversalProduct {
  title: string;
  titleFa?: string;
  titleEn?: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg: number;
  image: string;
  images: string[];
  galleryImages: string[];
  videos?: string[];
  features?: string[];
  storeName: string;
  storeOrigin?: string;
  brand?: string;
  category?: string;
  description?: string;
  descriptionFa?: string;
  dimensions?: VariantDimension[];
  variantGroups?: ProductVariantGroup[];
  variants?: ProductVariant[];
  variantMatrix?: ProductVariantMatrix;
  options?: string[];
  flavors?: string[];
  sizes?: string[];
  inStock?: boolean;
  selectedVariants?: Record<string, VariantOption>;
  rawSpecs?: Record<string, string>;
}

export interface ProductVariantOption {
  id: string;
  name: string;        // e.g. "وانیل / Vanilla", "2.27 kg (5 lbs)"
  nameFa?: string;     // Persian translated or cleaned name
  priceAed?: number;   // Specific price if variant has a different price
  priceAED?: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  image?: string;      // Image specific to this variant/flavor
  inStock?: boolean;
  sku?: string;
  url?: string;
}

export interface ProductVariantGroup {
  id: string;
  name: string;        // e.g. "طعم (Flavor)", "وزن / سایز (Size / Weight)", "رنگ (Color)"
  type: 'flavor' | 'size' | 'color' | 'style' | 'generic';
  options: ProductVariantOption[];
}

export interface ScrapedProduct {
  title: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg: number;
  image?: string;
  galleryImages?: string[];
  storeName: string;
  brand?: string;
  category?: string;
  description?: string;
  variantGroups?: ProductVariantGroup[];
  variants?: ProductVariant[];
  variantMatrix?: ProductVariantMatrix;
  options?: string[];
  flavors?: string[];
  sizes?: string[];
  inStock?: boolean;
  selectedVariants?: Record<string, ProductVariantOption>;
}

export interface ParsedProduct {
  title: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg: number;
  image?: string;
  galleryImages?: string[];
  storeName: string;
  category?: string;
  brand?: string;
  options?: string[];
  flavors?: string[];
  sizes?: string[];
  description?: string;
  aiExtracted?: boolean;
  fallback?: boolean;
  variantGroups?: ProductVariantGroup[];
  variants?: ProductVariant[];
  variantMatrix?: ProductVariantMatrix;
}

export interface ProductVariant {
  id: string;
  size?: string;
  flavor?: string;
  price: number;            // Active Selling Price AED
  originalPrice?: number;   // Strikethrough Price AED
  inStock: boolean;
  image?: string;
  sku?: string;
  title?: string;
  name?: string;
  priceAed?: number;
  priceAED?: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  priceToman?: number;
  imageThumbnail?: string;
  url?: string;
  weightKg?: number;
}

export interface NormalizedProduct {
  id?: string;
  title: string;
  titleFa?: string;
  titleEn?: string;
  brand?: string;
  storeName?: string;
  sourceUrl?: string;
  url?: string;
  price: number;
  priceAed?: number;
  priceAED?: number;
  originalPrice?: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  discountPercent?: number;
  currency?: string;
  mainImage?: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  galleryImages?: string[];
  weightKg?: number;
  description?: string;
  descriptionFa?: string;
  inStock?: boolean;
  sizes: string[];
  flavors: string[];
  variants: ProductVariant[];
  selectedVariant?: { size?: string; flavor?: string };
}

export interface CartItem {
  id: string;
  cartItemId?: string;
  product?: any;
  title: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg: number;
  image?: string;
  galleryImages?: string[];
  storeName?: string;
  calculatedToman?: number;
  calculatedTomanOverride?: number;
  priceToman?: number;
  quantity: number;
  category?: string;
  brand?: string;
  selectedOption?: string;
  selectedFlavor?: string;
  selectedSize?: string;
  selectedVariant?: ProductVariant | ProductVariantItem;
  selectedVariants?: Record<string, ProductVariantOption>;
  options?: string[];
  flavors?: string[];
  sizes?: string[];
  variantGroups?: ProductVariantGroup[];
  variants?: ProductVariant[];
  variantMatrix?: ProductVariantMatrix;
  description?: string;
  isLocalInventory?: boolean;
  isIranWarehouse?: boolean;
  isDeal?: boolean;
}

export type TabType = 'main' | 'inventory' | 'deals' | 'account' | 'admin' | 'detail' | 'cart' | 'faq' | 'receipt';

export interface TicketMessage {
  id: string;
  senderRole: 'user' | 'admin';
  senderName: string;
  message: string;
  createdAt: string;
  timestamp: number;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  subject: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'REPLIED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export type ExpenseCategory =
  | 'CARGO_MONTHLY'
  | 'PACKAGING_SUPPLIES'
  | 'SUPPLIER_PAYMENT'
  | 'DISCOUNT_REBATE'
  | 'OPERATIONAL_MISC';

export interface FinancialExpense {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  currency: 'AED' | 'TOMAN';
  amountToman: number;
  amountAed?: number;
  date: string;
  timestamp: number;
  vendorName?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface AdminSecuritySettings {
  adminPasswordHash?: string;
  adminPassword?: string;
  passwordHash?: string;
  backupEmail?: string;
  adminEmail?: string;
  recoveryEmail?: string;
  updatedAt?: string;
  lastPasswordChange?: string;
  resetToken?: string;
  resetTokenExpires?: number;
  smtpConfig?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    fromEmail: string;
    secure: boolean;
  };
}

export interface PasswordResetOtpState {
  step: 'REQUEST' | 'VERIFY';
  email: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  error?: string;
  successMessage?: string;
}

