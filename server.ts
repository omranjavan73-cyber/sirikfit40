import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import firebaseConfigJson from './firebase-applet-config.json';

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();
const db = (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)')
  ? getFirestore(firebaseApp, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(firebaseApp);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// File persistence setup
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

export interface StoreCardItem {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  url: string;
  image: string;
  badge?: string;
  enabled?: boolean;
  active?: boolean;
  samplePriceAed: number;
  sampleWeightKg: number;
}

export interface FeaturedDeal {
  id: string;
  title: string;
  brand?: string;
  category: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg?: number;
  image: string;
  url: string;
  storeName?: string;
  badge?: string;
  isActive: boolean;
}

export interface LocalInventoryItem {
  id: string;
  title: string;
  image: string;
  priceToman: number;
  originalPriceToman?: number;
  stockQuantity: number;
  category: string;
  description?: string;
  deliveryBadge?: string;
  inStock: boolean;
}

export interface HomePageSettings {
  topPromoText: string;
  showTopPromo: boolean;
  appTitle: string;
  appSubtitle: string;
  brandTitle?: string;
  brandSubtitle?: string;
  headerPillSlogan?: string;
  logoUrl?: string;
  heroMainHeadline?: string;
  heroHighlightWord?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  calcBlackBadge: string;
  calcMainHeadline: string;
  calcSubtitle: string;
  calcScheduleBadge: string;
  telegramHandle: string;
  telegramLink: string;
  whatsappPhone?: string;
  whatsappLink?: string;
  officePhone: string;
  supportHeadline: string;
  supportSubtitle: string;
  showSupportSection: boolean;
  showTelegramCard?: boolean;
  telegramTitle?: string;
  showEmailCard?: boolean;
  emailTitle?: string;
  showPhoneCard?: boolean;
  phoneTitle?: string;
  trustBadge1: string;
  trustBadge2: string;
  trustBadge3: string;
}

export type GatewayProvider = 'zarinpal' | 'zibal' | 'nextpay' | 'idpay' | 'card_to_card';

export interface PaymentGatewayConfig {
  activeGateway: GatewayProvider;
  merchantId: string;
  callbackUrl: string;
  isSandbox: boolean;
  cardToCard: {
    cardNumber: string;
    bankName: string;
    cardholderName: string;
    shabaNumber?: string;
  };
}

export interface CmsConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroNotice: string;
  heroImage: string;
  showAnnouncementBanner?: boolean;
  announcementText?: string;
  announcementBadge?: string;
  announcementSlogans?: string[];
  stores: StoreCardItem[];
  deals?: FeaturedDeal[];
  showLocalInventory?: boolean;
  warehouseBannerTitle?: string;
  warehouseBannerSubtitle?: string;
  warehouseBannerTheme?: 'light' | 'dark' | 'emerald' | 'amber';
  warehouseBannerButtonText?: string;
  localInventory?: LocalInventoryItem[];
  homeContent?: HomePageSettings;
  paymentGateway?: PaymentGatewayConfig;
  apiConfig: {
    currencyApiUrl: string;
    autoUpdateRates: boolean;
    scraperEndpoint: string;
    geminiApiKey: string;
    geminiApiKey1?: string;
    geminiApiKey2?: string;
    geminiApiKey3?: string;
    geminiApiKeys?: string[];
    allowedDomains?: string[];
    enableDomainRestriction?: boolean;
    scraperApiKey?: string;
    enableScraperApi?: boolean;
  };
}

interface StoreData {
  settings: {
    aedRate: number;        // e.g., 53000 Tomans
    manualAedRate?: number; // e.g., 53000 Tomans
    autoUpdateRates?: boolean;
    currencyApiUrl?: string;
    cargoRatePerKg: number; // e.g., 35 AED per KG
    profitMargin: number;   // e.g., 15 (%)
    minOrderAed?: number;   // e.g., 200 AED minimum threshold
  };
  cms: CmsConfig;
  users: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    email?: string;
    passwordHash: string;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    userId?: string;
    trackingCode: string;
    customerName: string;
    phoneNumber: string;
    deliveryAddress: string;
    notes?: string;
    productTitle: string;
    productUrl: string;
    productImage?: string;
    storeName?: string;
    priceAed: number;
    weightKg: number;
    aedRate: number;
    cargoRatePerKg: number;
    profitMargin: number;
    calculatedToman: number;
    paymentStatus: 'PAID' | 'PENDING' | 'FAILED';
    shippingStatus: 'PENDING_BUY' | 'PURCHASED' | 'DUBAI_WAREHOUSE' | 'SHIPPED_IRAN' | 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
    createdAt: string;
    paymentRefId?: string;
  }>;
}

const defaultCmsConfig: CmsConfig = {
  heroTitle: 'برآورد دقیق و خرید مستقیم مکمل و کالا از دبی',
  heroSubtitle: 'لینک محصول از ۳ فروشگاه معتبر امارات (Dr. Nutrition, GNC, Life Pharmacy) را وارد کنید تا قیمت تحویل نهایی در ایران محاسبه شود.',
  heroNotice: '✈️ پرواز بعدی ارسال کارگو هوایی دبی به ایران: سه‌شنبه و جمعه هر هفته',
  heroImage: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600',
  showAnnouncementBanner: true,
  announcementText: 'ارسال مستقیم و تضمینی کالا از دبی تا درب منزل',
  announcementBadge: 'تحویل ۵ الی ۷ روز کاری',
  announcementSlogans: [
    '⚡ ارسال مستقیم و تضمینی کالا از دبی تا درب منزل',
    '💯 تضمین ۱۰۰٪ اصالت مکملها و ضمانت بازگشت',
    '🚀 تحویل سریع و ایمن بین ۵ تا ۷ روز کاری'
  ],
  homeContent: {
    topPromoText: 'سیریک فیت - مکملهای تخصصی ورزشی و اورجینال',
    showTopPromo: true,
    appTitle: 'SIRIK FIT',
    appSubtitle: 'مکملهای ورزشی و اورجینال',
    brandTitle: 'SIRIK FIT',
    brandSubtitle: 'مکملهای ورزشی و اورجینال',
    logoUrl: '',
    calcBlackBadge: '✦ خرید مستقیم از دبی',
    calcMainHeadline: 'برآورد قیمت و ثبت سفارش',
    calcSubtitle: 'لینک محصول را وارد کنید تا قیمت تحویل در ایران فوری محاسبه شود.',
    calcScheduleBadge: '📅 ارسال هر دوشنبه و پنجشنبه',
    telegramHandle: '@SIRIK_FIT_Support',
    telegramLink: 'https://t.me/SIRIK_FIT_Support',
    officePhone: '021-91000000',
    supportHeadline: 'پشتیبانی و مشاوره تخصصی واردات دبی',
    supportSubtitle: 'پاسخگویی ۲۴ ساعته توسط کارشناسان تغذیه و لاجستیک',
    showSupportSection: true,
    showTelegramCard: true,
    telegramTitle: 'ارتباط با پشتیبانی در تلگرام',
    showEmailCard: true,
    emailTitle: 'ارتباط از طریق ایمیل پشتیبانی',
    showPhoneCard: true,
    phoneTitle: 'تلفن پشتیبانی',
    trustBadge1: 'اصالت ۱۰۰٪ کالا',
    trustBadge2: 'حمل ایمن کارگو',
    trustBadge3: 'تحویل ۵ تا ۷ روزه'
  },
  paymentGateway: {
    activeGateway: 'zarinpal',
    merchantId: 'zarin_merchant_omex_8849102',
    callbackUrl: '/api/payment/callback',
    isSandbox: true,
    cardToCard: {
      cardNumber: '6037-9918-4421-9876',
      bankName: 'بانک ملی ایران',
      cardholderName: 'به نام مدیریت بازرگانی اومکس دبی',
      shabaNumber: 'IR680170000000109988772001'
    }
  },
  stores: [
    {
      id: 'store-1',
      title: 'Dr. Nutrition Dubai',
      shortTitle: 'Dr. Nutrition',
      description: 'بزرگترین مرجع مکمل‌های ورزشی، ویتامین و رژیمی در امارات و خاورمیانه',
      url: 'https://www.drnutrition.com/en-ae',
      image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif" letter-spacing="-6">dnp</text><path d="M50 120 C 90 70, 135 40, 175 28 C 150 65, 110 110, 75 130 Z" fill="%2378BE20"/><path d="M60 112 Q 115 65, 163 35" stroke="%235A9614" stroke-width="3" fill="none"/></svg>',
      badge: 'تخفیف ویژه دبی',
      samplePriceAed: 320,
      sampleWeightKg: 2.3
    },
    {
      id: 'store-2',
      title: 'GNC UAE',
      shortTitle: 'GNC',
      description: 'نمایندگی رسمی برند جهانی GNC در دبی - انواع مولتی ویتامین و مکمل تخصصی',
      url: 'https://gnc-mena.com/',
      image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="115" text-anchor="middle" fill="%23E31837" font-weight="900" font-size="70" font-family="Arial,sans-serif" letter-spacing="-2">GNC</text><text x="100" y="145" text-anchor="middle" fill="%23E31837" font-weight="800" font-size="20" font-family="Arial,sans-serif" letter-spacing="4">LIVE WELL</text></svg>',
      badge: 'ضمانت ۱۰۰٪ اورجینال',
      samplePriceAed: 125,
      sampleWeightKg: 0.35
    },
    {
      id: 'store-3',
      title: 'Life Pharmacy UAE',
      shortTitle: 'Life Pharmacy',
      description: 'بزرگترین داروخانه آنلاین امارات - داروها، ویتامین‌ها و محصولات بهداشتی معتبر دبی',
      url: 'https://www.lifepharmacy.com',
      image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><path d="M100 15 C56 15 40 42 40 70 V135 H160 V70 C160 42 144 15 100 15 Z" fill="%231C3F94"/><circle cx="100" cy="55" r="9" fill="%23FFFFFF"/><path d="M100 68 C84 80 72 84 64 110 H136 C128 84 116 80 100 68 Z" fill="%23FFFFFF"/><text x="100" y="172" text-anchor="middle" fill="%23C42582" font-weight="900" font-size="36" font-family="sans-serif">LIFE%C2%AE</text></svg>',
      badge: 'داروخانه آنلاین دبی',
      samplePriceAed: 110,
      sampleWeightKg: 0.4
    }
  ],
  deals: [
    {
      id: 'deal-1',
      title: 'پروتئین وی ایزوله اپتیموم نوتریشن Gold Standard 5lb',
      brand: 'Optimum Nutrition',
      category: '💊 مکمل‌های ورزشی',
      priceAed: 280,
      originalPriceAed: 350,
      discountPercent: 20,
      weightKg: 2.3,
      image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
      url: 'https://www.drnutrition.com/en-ae/product/on-gold-standard-100-whey-5lb',
      storeName: 'Dr. Nutrition',
      badge: '🔥 پرفروش',
      isActive: true
    },
    {
      id: 'deal-2',
      title: 'پماد قبل از تمرین C4 Extreme Pre-Workout 30 Servings',
      brand: 'Cellucor',
      category: '🏷️ تخفیف ویژه',
      priceAed: 135,
      originalPriceAed: 170,
      discountPercent: 20,
      weightKg: 0.6,
      image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&q=80&w=400',
      url: 'https://www.drnutrition.com/en-ae/product/cellucor-c4-original-30-servings',
      storeName: 'Dr. Nutrition',
      badge: '🏷️ تخفیف ویژه',
      isActive: true
    },
    {
      id: 'deal-3',
      title: 'مولتی ویتامین تخصصی آقایان GNC Mega Men One Daily',
      brand: 'GNC UAE',
      category: '✨ ویتامین و سلامت',
      priceAed: 110,
      originalPriceAed: 140,
      discountPercent: 21,
      weightKg: 0.4,
      image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
      url: 'https://gnc-mena.com/en-ae/multivitamins/gnc-mega-men.html',
      storeName: 'GNC UAE',
      badge: '✨ ویتامین و سلامت',
      isActive: true
    },
    {
      id: 'deal-4',
      title: 'روغن ماهی امگا ۳ اولترا سوفت ژل Life Pharmacy Omega-3 1000mg',
      brand: 'Life Pharmacy',
      category: '✨ ویتامین و سلامت',
      priceAed: 95,
      originalPriceAed: 125,
      discountPercent: 24,
      weightKg: 0.3,
      image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=400',
      url: 'https://www.lifepharmacy.com/product/daily-multi-100s',
      storeName: 'Life Pharmacy',
      badge: '🏷️ تخفیف ویژه',
      isActive: true
    }
  ],
  showLocalInventory: true,
  warehouseBannerTitle: 'کالاهای موجود در انبار ایران (ارسال فوری)',
  warehouseBannerSubtitle: 'تحویل ۱ تا ۲ روزه در سراسر کشور • کالاها پلمپ و اورجینال',
  warehouseBannerTheme: 'light',
  warehouseBannerButtonText: 'جستجو و مشاهده همه',
  localInventory: [
    {
      id: 'local-1',
      title: 'پروتئین وی ایزوله اپتیموم نوتریشن Gold Standard 5lb (انبار تهران)',
      image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
      priceToman: 7200000,
      originalPriceToman: 7800000,
      stockQuantity: 5,
      category: '💊 مکمل‌های ورزشی',
      description: 'ارسال فوری ۱ تا ۲ روزه با پیک یا پست پیشتاز - پلمپ اورجینال خرید مستقیم از دبی',
      deliveryBadge: '⚡ تحویل فوری ۲۴ ساعته',
      inStock: true
    },
    {
      id: 'local-2',
      title: 'قرص مولتی ویتامین GNC Mega Men One Daily (انبار ایران)',
      image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
      priceToman: 2450000,
      originalPriceToman: 2800000,
      stockQuantity: 12,
      category: '✨ ویتامین و سلامت',
      description: 'موجود در انبار مرکزی ایران، ارسال همان روز ثبت سفارش',
      deliveryBadge: '📦 ارسال همان روز',
      inStock: true
    },
    {
      id: 'local-3',
      title: 'روغن ماهی امگا ۳ اولترا لایف فارمسی 1000mg',
      image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=400',
      priceToman: 2100000,
      originalPriceToman: 2500000,
      stockQuantity: 8,
      category: '✨ ویتامین و سلامت',
      description: 'بسته‌بندی جدید، تاریخ انقضای معتبر ۲۰۲۷',
      deliveryBadge: '⚡ تحویل فوری',
      inStock: true
    }
  ],
  apiConfig: {
    currencyApiUrl: 'https://api.navasan.tech/latest?api_key=omex_demo',
    autoUpdateRates: true,
    scraperEndpoint: '/api/parse-link',
    geminiApiKey: process.env.GEMINI_API_KEY ? '******' : '',
    allowedDomains: ['gnc-mena.com', 'drnutrition.com', 'lifepharmacy.com', 'sporter.com', 'amazon.ae'],
    enableDomainRestriction: true
  }
};

const defaultData: StoreData = {
  settings: {
    aedRate: 19500,        // 19,500 Toman per AED
    cargoRatePerKg: 35,    // 35 AED cargo rate per KG
    profitMargin: 15,      // 15% profit margin
    minOrderAed: 200,      // 200 AED minimum threshold
  },
  cms: defaultCmsConfig,
  users: [
    {
      id: 'usr-101',
      name: 'علیرضا حسینی',
      phoneNumber: '09121234567',
      email: 'alireza@example.com',
      passwordHash: '123456',
      createdAt: new Date().toISOString()
    }
  ],
  orders: [
    {
      id: 'ord-1001',
      userId: 'usr-101',
      trackingCode: 'OMX-94821',
      customerName: 'علیرضا حسینی',
      phoneNumber: '09121234567',
      deliveryAddress: 'تهران، خیابان ولیعصر، نرسیده به میدان ونک، پلاک ۱۴',
      notes: 'لطفا قبل از ارسال تماس بگیرید.',
      productTitle: 'مکمل وی ایزوله اپتیموم نوتریشن ON Gold Standard 100% Whey 2.27kg',
      productUrl: 'https://www.drnutrition.com/en-ae/product/on-gold-standard-100-whey-5lb',
      productImage: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
      storeName: 'Dr. Nutrition',
      priceAed: 320,
      weightKg: 2.3,
      aedRate: 19500,
      cargoRatePerKg: 35,
      profitMargin: 15,
      calculatedToman: 9028925,
      paymentStatus: 'PAID',
      shippingStatus: 'SHIPPED',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      paymentRefId: 'PAY-8829104'
    },
    {
      id: 'ord-1002',
      trackingCode: 'OMX-77319',
      customerName: 'مریم احمدی',
      phoneNumber: '09359876543',
      deliveryAddress: 'شیراز، خیابان ارم، کوچه ۶، پلاک ۲۰',
      notes: 'تحویل عصرها باشد',
      productTitle: 'مولتی ویتامین GNC Mega Men One Daily - 60 Caplets',
      productUrl: 'https://www.gnc.com/multivitamins/gnc-mega-men.html',
      productImage: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
      storeName: 'GNC Store',
      priceAed: 110,
      weightKg: 0.4,
      aedRate: 19500,
      cargoRatePerKg: 35,
      profitMargin: 15,
      calculatedToman: 2780100,
      paymentStatus: 'PAID',
      shippingStatus: 'PROCESSING',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      paymentRefId: 'PAY-9003821'
    }
  ]
};

let cachedStore: StoreData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 3000;

function readStoreFromFile(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const store: StoreData = JSON.parse(content);
    if (!store.cms) store.cms = defaultCmsConfig;
    if (!store.cms.deals || !Array.isArray(store.cms.deals) || store.cms.deals.length === 0) {
      store.cms.deals = defaultCmsConfig.deals;
    }
    if (store.cms.showLocalInventory === undefined) store.cms.showLocalInventory = true;
    if (!store.cms.warehouseBannerTitle) store.cms.warehouseBannerTitle = 'کالاهای موجود در انبار ایران (ارسال فوری)';
    if (!store.cms.warehouseBannerSubtitle) store.cms.warehouseBannerSubtitle = 'تحویل ۱ تا ۲ روزه در سراسر کشور • کالاها پلمپ و اورجینال';
    if (!store.cms.warehouseBannerTheme) store.cms.warehouseBannerTheme = 'light';
    if (!store.cms.warehouseBannerButtonText) store.cms.warehouseBannerButtonText = 'جستجو و مشاهده همه';
    if (store.cms.showAnnouncementBanner === undefined) store.cms.showAnnouncementBanner = true;
    if (!store.cms.announcementText) store.cms.announcementText = defaultCmsConfig.announcementText;
    if (!store.cms.announcementBadge) store.cms.announcementBadge = defaultCmsConfig.announcementBadge;
    if (!store.cms.localInventory || !Array.isArray(store.cms.localInventory) || store.cms.localInventory.length === 0) {
      store.cms.localInventory = defaultCmsConfig.localInventory;
    }
    if (!store.users) store.users = defaultData.users;
    if (store.cms && Array.isArray(store.cms.stores)) {
      store.cms.stores = store.cms.stores.filter(s => !s.title.includes('Amazon') && !s.url.includes('amazon.ae'));
    }
    return store;
  } catch (err) {
    console.error('Error reading store file:', err);
    return defaultData;
  }
}

async function getStoreData(forceRefresh = false): Promise<StoreData> {
  const now = Date.now();
  if (cachedStore && !forceRefresh && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedStore;
  }

  try {
    const settingsDocRef = doc(db, 'settings', 'app');
    const settingsSnap = await getDoc(settingsDocRef);
    let settings = defaultData.settings;
    if (settingsSnap.exists()) {
      settings = { ...defaultData.settings, ...settingsSnap.data() } as any;
    } else {
      await setDoc(settingsDocRef, defaultData.settings);
    }

    const cmsDocRef = doc(db, 'settings', 'cms');
    const cmsSnap = await getDoc(cmsDocRef);
    let cms = defaultCmsConfig;
    if (cmsSnap.exists()) {
      cms = { ...defaultCmsConfig, ...cmsSnap.data() } as any;
    } else {
      await setDoc(cmsDocRef, defaultCmsConfig);
    }

    const usersSnap = await getDocs(collection(db, 'users'));
    let users: any[] = [];
    if (!usersSnap.empty) {
      users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      users = defaultData.users;
      for (const u of defaultData.users) {
        await setDoc(doc(db, 'users', u.id), u);
      }
    }

    const ordersSnap = await getDocs(collection(db, 'orders'));
    let orders: any[] = [];
    if (!ordersSnap.empty) {
      orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      orders = defaultData.orders;
      for (const o of defaultData.orders) {
        await setDoc(doc(db, 'orders', o.id), o);
      }
    }

    if (cms && Array.isArray(cms.stores)) {
      cms.stores = cms.stores.filter((s: any) => !s.title.includes('Amazon') && !s.url.includes('amazon.ae'));
    }

    cachedStore = { settings, cms, users, orders };
    lastFetchTime = now;
    return cachedStore;
  } catch (err) {
    console.error('Firestore getStoreData error, falling back to local file/memory:', err);
    if (cachedStore) return cachedStore;
    cachedStore = readStoreFromFile();
    return cachedStore;
  }
}

function readStore(): StoreData {
  if (cachedStore) return cachedStore;
  return readStoreFromFile();
}

function writeStore(data: StoreData) {
  cachedStore = data;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (_e) {}
}

async function persistSettings(settings: any) {
  if (cachedStore) cachedStore.settings = settings;
  writeStore(cachedStore || defaultData);
  try {
    await setDoc(doc(db, 'settings', 'app'), settings, { merge: true });
  } catch (err) {
    console.error('Error persisting settings to Firestore:', err);
  }
}

async function persistCms(cms: any) {
  if (cachedStore) cachedStore.cms = cms;
  writeStore(cachedStore || defaultData);
  try {
    await setDoc(doc(db, 'settings', 'cms'), cms, { merge: true });
  } catch (err) {
    console.error('Error persisting CMS to Firestore:', err);
  }
}

async function persistUser(user: any) {
  if (cachedStore) {
    const idx = cachedStore.users.findIndex(u => u.id === user.id);
    if (idx >= 0) cachedStore.users[idx] = user;
    else cachedStore.users.push(user);
    writeStore(cachedStore);
  }
  try {
    await setDoc(doc(db, 'users', user.id), user);
  } catch (err) {
    console.error('Error persisting user to Firestore:', err);
  }
}

async function persistOrder(order: any) {
  if (cachedStore) {
    const idx = cachedStore.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) cachedStore.orders[idx] = order;
    else cachedStore.orders.unshift(order);
    writeStore(cachedStore);
  }
  try {
    await setDoc(doc(db, 'orders', order.id), order);
  } catch (err) {
    console.error('Error persisting order to Firestore:', err);
  }
}

async function removeOrder(orderId: string) {
  if (cachedStore) {
    cachedStore.orders = cachedStore.orders.filter(o => o.id !== orderId);
    writeStore(cachedStore);
  }
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (err) {
    console.error('Error deleting order from Firestore:', err);
  }
}

// Sample products database for quick instant estimation
const PRESET_PRODUCTS = [
  {
    title: 'مکمل پروتئین وی اپتیموم نوتریشن (ON Gold Standard Whey 5lbs)',
    url: 'https://www.drnutrition.com/en-ae/product/on-gold-standard-100-whey-5lb',
    priceAed: 320,
    weightKg: 2.3,
    storeName: 'Dr. Nutrition',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
    category: 'مکمل ورزشی'
  },
  {
    title: 'پماد قبل از تمرین C4 Original Pre-Workout 30 Servings',
    url: 'https://www.drnutrition.com/en-ae/product/cellucor-c4-original-30-servings',
    priceAed: 145,
    weightKg: 0.6,
    storeName: 'Dr. Nutrition',
    image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&q=80&w=400',
    category: 'پمپ و مکمل انرژی'
  },
  {
    title: 'قرص مولتی ویتامین آقایان GNC Mega Men Sport',
    url: 'https://www.gnc.com/en-ae/multivitamins/gnc-mega-men-sport.html',
    priceAed: 125,
    weightKg: 0.35,
    storeName: 'GNC Store',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
    category: 'ویتامین و سلامتی'
  },
  {
    title: 'آمینو اسید شاخه‌دار Scivation Xtend BCAA 90 Servings',
    url: 'https://www.drnutrition.com/en-ae/product/xtend-bcaa-90-servings',
    priceAed: 240,
    weightKg: 1.4,
    storeName: 'Dr. Nutrition',
    image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&q=80&w=400',
    category: 'مکمل ورزشی'
  },
  {
    title: 'مولتی ویتامین و مینرال لایف فارمسی Life Pharmacy Daily Multi 100s',
    url: 'https://www.lifepharmacy.com/product/daily-multi-100s',
    priceAed: 110,
    weightKg: 0.4,
    storeName: 'Life Pharmacy',
    image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=400',
    category: 'سلامتی و داروخانه'
  },
  {
    title: 'سرم ویتامین سی روشن کننده لایف فارمسی Vitamin C Serum 30ml',
    url: 'https://www.lifepharmacy.com/product/vit-c-serum-30ml',
    priceAed: 85,
    weightKg: 0.2,
    storeName: 'Life Pharmacy',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400',
    category: 'مراقبت پوست'
  }
];

// Initialize Gemini API if available
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (e) {
    console.warn('Gemini API init skipped or key invalid:', e);
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// GET /api/currency/aed - Test / fetch live exchange rate with auto API & manual fallback logic
app.get('/api/currency/aed', async (req, res) => {
  const store = readStore();
  const apiConfig = store.cms?.apiConfig || { currencyApiUrl: '', autoUpdateRates: false };
  const manualRate = store.settings.manualAedRate || store.settings.aedRate || 53000;

  const targetUrl = req.query.url ? String(req.query.url) : apiConfig.currencyApiUrl;
  const isAutoEnabled = req.query.forceApi === 'true' || apiConfig.autoUpdateRates;

  if (!targetUrl || !isAutoEnabled) {
    return res.json({
      success: true,
      rate: manualRate,
      source: 'manual',
      message: 'نرخ دستی فعال است.'
    });
  }

  try {
    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      // Extract numeric rate from various common JSON keys (aed, rate, price, etc)
      let fetchedRate: number | null = null;
      if (typeof data.aed === 'number') fetchedRate = data.aed;
      else if (typeof data.rate === 'number') fetchedRate = data.rate;
      else if (typeof data.price === 'number') fetchedRate = data.price;
      else if (data.aed_toman) fetchedRate = parseFloat(data.aed_toman);
      else if (data.AED ? typeof data.AED === 'number' : false) fetchedRate = data.AED;
      else if (data.result && typeof data.result === 'number') fetchedRate = data.result;

      if (fetchedRate && !isNaN(fetchedRate) && fetchedRate >= 1000 && fetchedRate <= 300000) {
        return res.json({
          success: true,
          rate: Math.round(fetchedRate),
          source: 'api',
          message: `نرخ زنده از API دریافت شد: ${fetchedRate.toLocaleString('fa-IR')} تومان`
        });
      }
    }
  } catch (err) {
    console.warn('Currency API fetch failed:', err);
  }

  // Fallback to manual rate if API fails or yields invalid result
  return res.json({
    success: true,
    rate: manualRate,
    source: 'manual_fallback',
    warning: 'دریافت نرخ از API با خطا مواجه شد. سیستم به طور خودکار به نرخ دستی بازگشت.',
    fallbackRate: manualRate
  });
});

// GET /api/settings
app.get('/api/settings', (req, res) => {
  const store = readStore();
  res.json(store.settings);
});

// GET /api/cms
app.get('/api/cms', (req, res) => {
  const store = readStore();
  res.json(store.cms);
});

// POST /api/cms
app.post('/api/cms', async (req, res) => {
  const {
    heroTitle,
    heroSubtitle,
    heroNotice,
    heroImage,
    showAnnouncementBanner,
    announcementText,
    announcementBadge,
    stores,
    deals,
    showLocalInventory,
    warehouseBannerTitle,
    warehouseBannerSubtitle,
    warehouseBannerTheme,
    warehouseBannerButtonText,
    localInventory,
    homeContent,
    paymentGateway,
    apiConfig
  } = req.body;
  const store = readStore();

  if (heroTitle !== undefined) store.cms.heroTitle = heroTitle;
  if (heroSubtitle !== undefined) store.cms.heroSubtitle = heroSubtitle;
  if (heroNotice !== undefined) store.cms.heroNotice = heroNotice;
  if (heroImage !== undefined) store.cms.heroImage = heroImage;
  if (typeof showAnnouncementBanner === 'boolean') store.cms.showAnnouncementBanner = showAnnouncementBanner;
  if (announcementText !== undefined) store.cms.announcementText = announcementText;
  if (announcementBadge !== undefined) store.cms.announcementBadge = announcementBadge;
  if (Array.isArray(stores)) store.cms.stores = stores;
  if (Array.isArray(deals)) store.cms.deals = deals;
  if (typeof showLocalInventory === 'boolean') store.cms.showLocalInventory = showLocalInventory;
  if (warehouseBannerTitle !== undefined) store.cms.warehouseBannerTitle = warehouseBannerTitle;
  if (warehouseBannerSubtitle !== undefined) store.cms.warehouseBannerSubtitle = warehouseBannerSubtitle;
  if (warehouseBannerTheme !== undefined) store.cms.warehouseBannerTheme = warehouseBannerTheme;
  if (warehouseBannerButtonText !== undefined) store.cms.warehouseBannerButtonText = warehouseBannerButtonText;
  if (Array.isArray(localInventory)) store.cms.localInventory = localInventory;
  if (homeContent && typeof homeContent === 'object') {
    store.cms.homeContent = { ...store.cms.homeContent, ...homeContent };
  }
  if (paymentGateway && typeof paymentGateway === 'object') {
    store.cms.paymentGateway = { ...store.cms.paymentGateway, ...paymentGateway };
  }
  if (apiConfig && typeof apiConfig === 'object') {
    store.cms.apiConfig = { ...store.cms.apiConfig, ...apiConfig };
  }

  await persistCms(store.cms);
  res.json({ success: true, cms: store.cms });
});

// POST /api/settings
app.post('/api/settings', async (req, res) => {
  const { aedRate, manualAedRate, autoUpdateRates, currencyApiUrl, cargoRatePerKg, profitMargin, minOrderAed } = req.body;
  
  const store = readStore();
  const effectiveAedRate = typeof aedRate === 'number' ? Math.max(1, aedRate) : store.settings.aedRate;
  const effectiveManualRate = typeof manualAedRate === 'number' ? Math.max(1, manualAedRate) : (store.settings.manualAedRate || effectiveAedRate);

  store.settings = {
    ...store.settings,
    aedRate: effectiveAedRate,
    manualAedRate: effectiveManualRate,
    autoUpdateRates: typeof autoUpdateRates === 'boolean' ? autoUpdateRates : (store.settings.autoUpdateRates ?? true),
    currencyApiUrl: typeof currencyApiUrl === 'string' ? currencyApiUrl : store.settings.currencyApiUrl,
    cargoRatePerKg: typeof cargoRatePerKg === 'number' ? Math.max(0, cargoRatePerKg) : store.settings.cargoRatePerKg,
    profitMargin: typeof profitMargin === 'number' ? Math.max(0, profitMargin) : store.settings.profitMargin,
    minOrderAed: typeof minOrderAed === 'number' ? Math.max(0, minOrderAed) : (store.settings.minOrderAed ?? 200)
  };

  if (!store.cms.apiConfig) {
    store.cms.apiConfig = {
      currencyApiUrl: store.settings.currencyApiUrl || '',
      autoUpdateRates: store.settings.autoUpdateRates ?? true,
      scraperEndpoint: '/api/parse-link',
      geminiApiKey: ''
    };
  } else {
    if (typeof autoUpdateRates === 'boolean') store.cms.apiConfig.autoUpdateRates = autoUpdateRates;
    if (typeof currencyApiUrl === 'string') store.cms.apiConfig.currencyApiUrl = currencyApiUrl;
  }

  await persistSettings(store.settings);
  await persistCms(store.cms);
  res.json({ success: true, settings: store.settings });
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, identifier, password } = req.body;
  if (!name || !identifier || !password) {
    return res.status(400).json({ error: 'لطفاً تمامی فیلدها را وارد کنید.' });
  }

  const store = readStore();
  const cleanId = identifier.trim().toLowerCase();

  const existing = store.users.find(u => u.phoneNumber === cleanId || (u.email && u.email.toLowerCase() === cleanId));
  if (existing) {
    return res.status(400).json({ error: 'این شماره یا ایمیل قبلاً در سیستم ثبت شده است. لطفاً وارد شوید.' });
  }

  const newUser = {
    id: 'usr-' + Date.now(),
    name: name.trim(),
    phoneNumber: cleanId,
    email: cleanId.includes('@') ? cleanId : undefined,
    passwordHash: password,
    createdAt: new Date().toISOString()
  };

  await persistUser(newUser);

  const { passwordHash, ...userPayload } = newUser;
  return res.json({ success: true, user: userPayload });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'شماره/ایمیل و رمز عبور الزامی است.' });
  }

  const store = readStore();
  const cleanId = identifier.trim().toLowerCase();

  const user = store.users.find(u =>
    (u.phoneNumber && u.phoneNumber.toLowerCase() === cleanId) ||
    (u.email && u.email.toLowerCase() === cleanId)
  );

  if (!user) {
    // For seamless UX, if user doesn't exist, auto-register them
    const newUser = {
      id: 'usr-' + Date.now(),
      name: cleanId.includes('@') ? cleanId.split('@')[0] : 'کاربر گرامی',
      phoneNumber: cleanId,
      email: cleanId.includes('@') ? cleanId : undefined,
      passwordHash: password,
      createdAt: new Date().toISOString()
    };
    await persistUser(newUser);

    const { passwordHash, ...userPayload } = newUser;
    return res.json({ success: true, user: userPayload, autoRegistered: true });
  }

  if (user.passwordHash !== password) {
    return res.status(400).json({ error: 'رمز عبور اشتباه است.' });
  }

  const { passwordHash, ...userPayload } = user;
  return res.json({ success: true, user: userPayload });
});

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const validPasswords = ['omex2025', 'admin123', 'omexadmin'];
  
  if (validPasswords.includes(password)) {
    return res.json({ success: true, token: 'omex_session_token_' + Date.now() });
  } else {
    return res.status(401).json({ error: 'رمز عبور مدیریت اشتباه است' });
  }
});

// GET /api/preset-products
app.get('/api/preset-products', (req, res) => {
  res.json(PRESET_PRODUCTS);
});

// GET /api/orders
app.get('/api/orders', (req, res) => {
  const store = readStore();
  const phone = req.query.phone as string | undefined;
  const userId = req.query.userId as string | undefined;
  const userIdentifier = req.query.userIdentifier as string | undefined;
  const trackingCode = req.query.trackingCode as string | undefined;

  let filtered = store.orders;

  if (userId) {
    filtered = filtered.filter(o => o.userId === userId);
  } else if (userIdentifier) {
    const clean = userIdentifier.trim().toLowerCase();
    filtered = filtered.filter(o =>
      (o.userId && o.userId === clean) ||
      (o.phoneNumber && o.phoneNumber.toLowerCase().includes(clean))
    );
  } else if (phone) {
    filtered = filtered.filter(o => o.phoneNumber.includes(phone.trim()));
  }

  if (trackingCode) {
    filtered = filtered.filter(o => o.trackingCode.toLowerCase().includes(trackingCode.trim().toLowerCase()));
  }

  // Sort by created at descending
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(filtered);
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  const {
    userId,
    customerName,
    phoneNumber,
    deliveryAddress,
    notes,
    productTitle,
    productUrl,
    productImage,
    storeName,
    priceAed,
    weightKg,
    selectedOption
  } = req.body;

  if (!customerName || !phoneNumber || !deliveryAddress || !productTitle || priceAed === undefined) {
    return res.status(400).json({ error: 'لطفا تمامی فیلدهای اجباری را تکمیل کنید' });
  }

  const store = readStore();
  const { aedRate, cargoRatePerKg, profitMargin } = store.settings;

  // Formula: Final_Toman = ((Price_AED + (Weight_KG * Cargo_Rate)) * (1 + Profit_Margin / 100)) * AED_Rate
  const weight = Math.max(0.1, weightKg || 0.5);
  const calculatedToman = Math.round(((priceAed + (weight * cargoRatePerKg)) * (1 + profitMargin / 100)) * aedRate);

  const trackingCode = 'OMX-' + Math.floor(10000 + Math.random() * 90000);
  const newOrder = {
    id: 'ord-' + Date.now(),
    userId: userId || undefined,
    trackingCode,
    customerName,
    phoneNumber,
    deliveryAddress,
    notes: notes || '',
    productTitle,
    productUrl: extractCleanUrl(productUrl || 'https://drnutrition.com'),
    productImage: productImage || 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
    storeName: storeName || 'فروشگاه دبی',
    priceAed: Number(priceAed),
    weightKg: weight,
    aedRate,
    cargoRatePerKg,
    profitMargin,
    calculatedToman,
    selectedOption: selectedOption || undefined,
    paymentStatus: 'PENDING' as const,
    shippingStatus: 'PENDING' as const,
    createdAt: new Date().toISOString()
  };

  await persistOrder(newOrder);

  res.json({ success: true, order: newOrder });
});

// PATCH /api/orders/:id
app.patch('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, shippingStatus, paymentRefId } = req.body;

  const store = readStore();
  const index = store.orders.findIndex(o => o.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'سفارش یافت نشد' });
  }

  if (paymentStatus) store.orders[index].paymentStatus = paymentStatus;
  if (shippingStatus) store.orders[index].shippingStatus = shippingStatus;
  if (paymentRefId) store.orders[index].paymentRefId = paymentRefId;

  await persistOrder(store.orders[index]);
  res.json({ success: true, order: store.orders[index] });
});

// DELETE /api/orders/:id
app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const store = readStore();
  const initialLength = store.orders.length;
  store.orders = store.orders.filter(o => o.id !== id);

  if (store.orders.length === initialLength) {
    return res.status(404).json({ error: 'سفارش یافت نشد' });
  }

  await removeOrder(id);
  res.json({ success: true });
});

// GET /api/payment-gateway
app.get('/api/payment-gateway', (req, res) => {
  const store = readStore();
  res.json(store.cms.paymentGateway || defaultCmsConfig.paymentGateway);
});

// POST /api/payment-gateway
app.post('/api/payment-gateway', async (req, res) => {
  const store = readStore();
  const paymentConfig = req.body;
  if (!store.cms) store.cms = defaultCmsConfig;
  store.cms.paymentGateway = paymentConfig;
  await persistCms(store.cms);
  res.json({ success: true, paymentGateway: store.cms.paymentGateway });
});

// Helper function to send instant Telegram alert to admin bot
async function sendTelegramAdminNotification(order: any, cmsConfig: any) {
  const token = cmsConfig?.apiConfig?.telegramBotToken || cmsConfig?.homeContent?.telegramBotToken;
  const chatId = cmsConfig?.apiConfig?.adminChatId || cmsConfig?.homeContent?.adminChatId;
  const isEnabled = cmsConfig?.apiConfig?.telegramNotifyEnabled ?? true;

  if (!isEnabled || !token || !chatId) {
    console.log('[Telegram Alert] Skipped: Bot token or Chat ID missing.');
    return { success: false, reason: 'missing_config' };
  }

  const customerName = order.customerName || 'خریدار';
  const customerPhone = order.phoneNumber || '-';
  const customerAddress = order.deliveryAddress || 'آدرس ثبت نشده';
  const productTitle = order.productTitle || 'محصول سفارشی';
  const variant = order.selectedOption || 'اصلی (پیش‌فرض)';
  const quantity = order.quantity || 1;
  const priceAed = order.priceAed !== undefined ? order.priceAed : 0;
  const totalToman = order.calculatedToman ? Number(order.calculatedToman).toLocaleString('fa-IR') : '۰';
  const productUrl = order.productUrl || 'https://drnutrition.com';

  const messageText = `🛍️ *سفارش جدید در سیریک فیت (SIRIK FIT) ثبت شد!*

👤 *اطلاعات خریدار:*
• نام: ${customerName}
• شماره تماس: ${customerPhone}
• آدرس: ${customerAddress}

📦 *مشخصات کالا:*
• نام: ${productTitle}
• متغیر / طعم / سایز: ${variant}
• تعداد: ${quantity} عدد
• قیمت پایه: ${priceAed} AED

💳 *پرداختی:* ${totalToman} تومان

🔗 *لینک خرید مستقیم از دبی:*
${productUrl}`;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      })
    });
    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    console.error('[Telegram Alert Error]:', err);
    return { success: false, error: String(err) };
  }
}

// Helper function to send instant HTML Email invoice to admin
async function sendEmailAdminNotification(order: any, cmsConfig: any) {
  const destinationEmail = cmsConfig?.apiConfig?.adminDestinationEmail || cmsConfig?.homeContent?.adminDestinationEmail || 'omran.javan73@gmail.com';
  const isEnabled = cmsConfig?.apiConfig?.emailNotifyEnabled ?? true;
  const resendKey = cmsConfig?.apiConfig?.resendApiKey || process.env.RESEND_API_KEY;
  const emailjsService = cmsConfig?.apiConfig?.emailjsServiceId;
  const emailjsTemplate = cmsConfig?.apiConfig?.emailjsTemplateId;
  const emailjsPublic = cmsConfig?.apiConfig?.emailjsPublicKey;

  if (!isEnabled) {
    console.log('[Email Alert] Skipped: Email notifications disabled.');
    return { success: false, reason: 'disabled' };
  }

  const customerName = order.customerName || 'خریدار';
  const customerPhone = order.phoneNumber || '-';
  const customerAddress = order.deliveryAddress || 'آدرس ثبت نشده';
  const productTitle = order.productTitle || 'محصول سفارشی';
  const variant = order.selectedOption || 'اصلی (پیش‌فرض)';
  const quantity = order.quantity || 1;
  const priceAed = order.priceAed !== undefined ? order.priceAed : 0;
  const totalToman = order.calculatedToman ? Number(order.calculatedToman).toLocaleString('fa-IR') : '۰';
  const productUrl = order.productUrl || 'https://drnutrition.com';
  const trackingCode = order.trackingCode || 'OMX-TEST';

  const htmlBody = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; color: #0f172a;">
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 20px;">🛍️ فاکتور سفارش جدید SIRIK FIT</h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">کد پیگیری سفارش: <strong>${trackingCode}</strong></p>
      </div>

      <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #cbd5e1;">
        <h3 style="margin-top: 0; color: #1e293b; font-size: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">👤 مشخصات خریدار</h3>
        <p style="margin: 6px 0; font-size: 13px;"><strong>نام:</strong> ${customerName}</p>
        <p style="margin: 6px 0; font-size: 13px;"><strong>شماره تماس:</strong> <span dir="ltr">${customerPhone}</span></p>
        <p style="margin: 6px 0; font-size: 13px;"><strong>آدرس تحویل:</strong> ${customerAddress}</p>
      </div>

      <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #cbd5e1;">
        <h3 style="margin-top: 0; color: #1e293b; font-size: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">📦 مشخصات کالا</h3>
        <p style="margin: 6px 0; font-size: 13px;"><strong>عنوان کالا:</strong> ${productTitle}</p>
        <p style="margin: 6px 0; font-size: 13px;"><strong>متغیر / طعم / سایز:</strong> ${variant}</p>
        <p style="margin: 6px 0; font-size: 13px;"><strong>تعداد:</strong> ${quantity} عدد</p>
        <p style="margin: 6px 0; font-size: 13px;"><strong>قیمت پایه (درهم):</strong> ${priceAed} AED</p>
        <p style="margin: 6px 0; font-size: 14px; color: #059669; font-weight: bold;"><strong>مبلغ کل پرداختی:</strong> ${totalToman} تومان</p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${productUrl}" target="_blank" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px; display: inline-block;">
          🔗 مشاهده و خرید کالا در سایت دبی
        </a>
      </div>
    </div>
  `;

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'SIRIK FIT Orders <onboarding@resend.dev>',
          to: [destinationEmail],
          subject: `🛍️ سفارش جدید SIRIK FIT - کد سفارش #${trackingCode}`,
          html: htmlBody
        })
      });
      const data = await res.json();
      return { success: res.ok, provider: 'resend', data };
    } catch (e) {
      console.error('[Resend Email Error]:', e);
    }
  }

  if (emailjsService && emailjsTemplate && emailjsPublic) {
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: emailjsService,
          template_id: emailjsTemplate,
          user_id: emailjsPublic,
          template_params: {
            to_email: destinationEmail,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            product_title: productTitle,
            variant: variant,
            quantity: quantity,
            price_aed: priceAed,
            total_toman: totalToman,
            product_url: productUrl,
            tracking_code: trackingCode
          }
        })
      });
      return { success: res.ok, provider: 'emailjs' };
    } catch (e) {
      console.error('[EmailJS Error]:', e);
    }
  }

  console.log(`[Email Notification Logged] Sent to: ${destinationEmail}, Order: ${trackingCode}`);
  return { success: true, simulated: true, destinationEmail, trackingCode };
}

// POST /api/notify/telegram
app.post('/api/notify/telegram', async (req, res) => {
  const { orderId, orderData } = req.body;
  const store = readStore();
  let orderToNotify = orderData;
  if (orderId && !orderToNotify) {
    orderToNotify = store.orders.find(o => o.id === orderId);
  }
  if (!orderToNotify) {
    return res.status(400).json({ error: 'اطلاعات سفارش برای ارسال پیام یافت نشد' });
  }

  const result = await sendTelegramAdminNotification(orderToNotify, store.cms);
  res.json(result);
});

// POST /api/notify/email
app.post('/api/notify/email', async (req, res) => {
  const { orderId, orderData } = req.body;
  const store = readStore();
  let orderToNotify = orderData;
  if (orderId && !orderToNotify) {
    orderToNotify = store.orders.find(o => o.id === orderId);
  }
  if (!orderToNotify) {
    return res.status(400).json({ error: 'اطلاعات سفارش برای ارسال ایمیل یافت نشد' });
  }

  const result = await sendEmailAdminNotification(orderToNotify, store.cms);
  res.json(result);
});

// POST /api/payment/simulate
app.post('/api/payment/simulate', async (req, res) => {
  const { orderId, cardNumber, success } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'شناسه سفارش مشخص نشده است' });
  }

  const store = readStore();
  const orderIndex = store.orders.findIndex(o => o.id === orderId);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'سفارش یافت نشد' });
  }

  if (success !== false) {
    const paymentRefId = 'PAY-' + Math.floor(1000000 + Math.random() * 9000000);
    store.orders[orderIndex].paymentStatus = 'PAID';
    store.orders[orderIndex].shippingStatus = 'PURCHASED';
    store.orders[orderIndex].paymentRefId = paymentRefId;

    await persistOrder(store.orders[orderIndex]);

    // Trigger instant Telegram and Email Admin Alerts in background
    sendTelegramAdminNotification(store.orders[orderIndex], store.cms);
    sendEmailAdminNotification(store.orders[orderIndex], store.cms);

    return res.json({
      success: true,
      message: 'پرداخت با موفقیت انجام شد',
      paymentRefId,
      order: store.orders[orderIndex]
    });
  } else {
    store.orders[orderIndex].paymentStatus = 'FAILED';
    await persistOrder(store.orders[orderIndex]);
    return res.status(400).json({
      success: false,
      error: 'پرداخت توسط بانک ناموفق اعلام شد',
      order: store.orders[orderIndex]
    });
  }
});

// Multi-Proxy Waterfall Helper with Dedicated Render Puppeteer Scraper
async function fetchWithProxies(
  targetUrl: string
): Promise<{ ok: boolean; status: number; text: string }> {
  // 1. Primary: Dedicated Render Puppeteer Scraper Endpoint
  try {
    const targetEndpoint = 'https://my-scraper-ycsp.onrender.com/scrape?url=' + encodeURIComponent(targetUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(targetEndpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const rawText = await res.text();
      let htmlText = rawText;
      try {
        const json = JSON.parse(rawText);
        if (json.error) {
          console.warn('[RenderScraper] Scraper returned error payload:', json.error);
          htmlText = '';
        } else if (json.html || json.data || json.content || json.body) {
          htmlText = json.html || json.data || json.content || json.body;
        }
      } catch (_e) {}

      if (htmlText && htmlText.length > 20 && !htmlText.trim().startsWith('{')) {
        return { ok: true, status: 200, text: htmlText };
      }
    }
  } catch (_err) {
    console.warn('[RenderScraper] Primary scraper request failed or timed out, falling back to Proxy Waterfall...');
  }

  // 2. Secondary: Multi-Proxy Waterfall Fallback
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const headers = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,application/json,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'Cache-Control': 'no-cache'
  };

  const proxyEndpoints = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(targetUrl)}`,
    targetUrl,
    `https://r.jina.ai/${encodeURIComponent(targetUrl)}`
  ];

  for (const proxyUrl of proxyEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(proxyUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        if (proxyUrl.includes('allorigins.win/get')) {
          const json: any = await res.json();
          if (json && json.contents && typeof json.contents === 'string' && json.contents.length > 20) {
            return { ok: true, status: 200, text: json.contents };
          }
        } else {
          const text = await res.text();
          if (text && text.length > 20) {
            return { ok: true, status: res.status, text };
          }
        }
      }
    } catch (_err) {
      // Continue to next proxy in waterfall
    }
  }

  return { ok: false, status: 500, text: '' };
}

// CRITICAL INPUT CLEANING RULE
function extractCleanUrl(input: string): string {
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

// POST /api/parse-link
// Smartly extracts product price in AED, estimated weight in KG, title, store name, and image URL using Dedicated Scraper & Multi-Proxy Waterfall
app.post('/api/parse-link', async (req, res) => {
  const rawUrl = req.body.url;
  const cleanUrl = extractCleanUrl(rawUrl);
  const storeData = readStore();
  const cmsConfig = storeData.cms;

  if (!cleanUrl || typeof cleanUrl !== 'string' || !cleanUrl.toLowerCase().startsWith('http')) {
    return res.status(400).json({
      success: false,
      error: 'امکان استخراج اطلاعات از این لینک وجود نداشت. لطفاً صحت لینک را بررسی کنید.',
      message: 'امکان استخراج اطلاعات از این لینک وجود نداشت. لطفاً صحت لینک را بررسی کنید.'
    });
  }

  // 1. Drop Temu explicitly as requested
  if (cleanUrl.toLowerCase().includes('temu.com')) {
    return res.status(400).json({
      success: false,
      error: 'استخراج از Temu به دلیل امنیت بالا فعلاً مقدور نیست.',
      message: 'استخراج از Temu به دلیل امنیت بالا فعلاً مقدور نیست.'
    });
  }

  // Validate Whitelisted Domain (محدودیت پویا و دامنه‌های مجاز)
  const isFreeReq = req.body?.is_free_extraction === true || req.body?.is_free_extraction === 'true' || req.body?.isFreeExtraction === true;
  const reqRestricted = req.body?.enable_domain_restriction ?? req.body?.enableDomainRestriction;

  const defaultAllowedDomains = ['noon.com', 'amazon.ae', 'lifepharmacy.com', 'sporter.com', 'drnutrition.com', 'gnc-mena.com'];
  const configuredAllowed = (cmsConfig?.apiConfig?.allowedDomains && cmsConfig.apiConfig.allowedDomains.length > 0)
    ? cmsConfig.apiConfig.allowedDomains
    : defaultAllowedDomains;

  let enableRestriction = true;
  if (typeof reqRestricted === 'boolean') {
    enableRestriction = reqRestricted;
  } else if (typeof reqRestricted === 'string') {
    enableRestriction = reqRestricted === 'true';
  } else if (isFreeReq) {
    enableRestriction = false;
  } else {
    enableRestriction = cmsConfig?.apiConfig?.enableDomainRestriction ?? true;
  }

  let activeAllowedDomains = configuredAllowed;
  if (enableRestriction && cmsConfig?.stores) {
    const disabledStoreUrls = cmsConfig.stores
      .filter((s: any) => s.enabled === false || s.active === false)
      .map((s: any) => (s.url || '').toLowerCase());

    activeAllowedDomains = configuredAllowed.filter(domain => {
      const isStoreDisabled = disabledStoreUrls.some((u: string) => u.includes(domain));
      return !isStoreDisabled;
    });
  }

  if (enableRestriction) {
    const isAllowedDomain = activeAllowedDomains.some(domain => cleanUrl.toLowerCase().includes(domain));
    if (!isAllowedDomain) {
      return res.status(400).json({
        success: false,
        error: 'استخراج خودکار از این سایت در حال حاضر پشتیبانی نمیشود. لطفاً قیمت و مشخصات را دستی وارد کنید.',
        message: 'استخراج خودکار از این سایت در حال حاضر پشتیبانی نمیشود. لطفاً قیمت و مشخصات را دستی وارد کنید.'
      });
    }
  }

  // Store Detection
  let storeName = 'فروشگاه آنلاین دبی';
  if (cleanUrl.includes('noon.com')) storeName = 'Noon Dubai';
  else if (cleanUrl.includes('amazon.ae') || cleanUrl.includes('amazon.')) storeName = 'Amazon UAE';
  else if (cleanUrl.includes('lifepharmacy.com')) storeName = 'Life Pharmacy';
  else if (cleanUrl.includes('sporter.com')) storeName = 'Sporter UAE';
  else if (cleanUrl.includes('drnutrition.com')) storeName = 'Dr. Nutrition';
  else if (cleanUrl.includes('gnc.com') || cleanUrl.includes('gnc-mena.com')) storeName = 'GNC Store';
  else if (cleanUrl.includes('lifeextension.com')) storeName = 'Life Extension';

  let htmlTitle = '';
  let htmlImage = '';
  let htmlPrice = 0;
  let htmlOriginalPrice = 0;
  let htmlDescription = '';
  const collectedImages: string[] = [];

  const isAmazonUrl = cleanUrl.toLowerCase().includes('amazon.ae') || cleanUrl.toLowerCase().includes('amazon.');
  const isNoonUrl = cleanUrl.toLowerCase().includes('noon.com');
  const isDrNutritionUrl = cleanUrl.toLowerCase().includes('drnutrition.com');
  const isGncUrl = cleanUrl.toLowerCase().includes('gnc-mena.com') || cleanUrl.toLowerCase().includes('gnc.com');
  const isShopifyUrl = !isDrNutritionUrl && (isGncUrl || cleanUrl.toLowerCase().includes('/products/'));

  const sanitizeImageUrl = (rawImg: string) => {
    if (!rawImg) return '';
    let str = String(rawImg).trim().replace(/&amp;/g, '&');
    str = str.replace(/^["']|["']$/g, '').trim();
    if (str.startsWith('//')) {
      str = 'https:' + str;
    } else if (str.startsWith('/')) {
      if (isDrNutritionUrl) {
        str = 'https://drnutrition.com' + str;
      } else {
        try {
          const u = new URL(cleanUrl);
          str = `${u.protocol}//${u.host}${str}`;
        } catch (_e) {
          str = 'https://drnutrition.com' + str;
        }
      }
    } else if (str.startsWith('http://')) {
      str = str.replace('http://', 'https://');
    }
    str = str.split('"')[0].split("'")[0].split('\\')[0].trim();
    return str;
  };

  // A. NOON SKU-BASED CATALOG API PARSER (Via Dedicated Scraper & Waterfall)
  if (isNoonUrl) {
    const noonSkuMatch = cleanUrl.match(/\/(Z[A-Z0-9]+)\/p\//i) ||
                         cleanUrl.match(/\/(N[A-Z0-9]+)\/p\//i) ||
                         cleanUrl.match(/[\/-](Z[A-Za-z0-9]{8,25})(?:[\/\?%]|$)/i) ||
                         cleanUrl.match(/[\/-](N[A-Za-z0-9]{8,25})(?:[\/\?%]|$)/i);
    if (noonSkuMatch && noonSkuMatch[1]) {
      const sku = noonSkuMatch[1];
      const catalogApiUrl = `https://www.noon.com/_svc/catalog/api/v3/u/${sku}`;
      const proxyRes = await fetchWithProxies(catalogApiUrl);

      if (proxyRes.ok && proxyRes.text) {
        try {
          const apiJson: any = JSON.parse(proxyRes.text);
          const pObj = apiJson?.result?.product || apiJson?.product || apiJson?.data?.product || apiJson?.catalog?.product;
          if (pObj) {
            if (pObj.name || pObj.title || pObj.en_name) {
              htmlTitle = String(pObj.name || pObj.title || pObj.en_name).trim();
            }
            const rawP = pObj.sale_price ?? pObj.price ?? pObj.offer_price ?? pObj.variants?.[0]?.price ?? pObj.offers?.[0]?.price;
            if (rawP !== undefined && rawP !== null) {
              const parsedP = parseFloat(String(rawP));
              if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
            }
            const rawOrig = pObj.was_price ?? pObj.original_price ?? pObj.msrp;
            if (rawOrig !== undefined && rawOrig !== null) {
              const parsedOrig = parseFloat(String(rawOrig));
              if (!isNaN(parsedOrig) && parsedOrig > htmlPrice) htmlOriginalPrice = Math.round(parsedOrig * 100) / 100;
            }
            const imgKey = pObj.image_key || (Array.isArray(pObj.image_keys) ? pObj.image_keys[0] : null) || pObj.image_url || pObj.image;
            if (imgKey && typeof imgKey === 'string') {
              if (imgKey.startsWith('http')) {
                htmlImage = imgKey;
              } else if (imgKey.startsWith('tr:') || imgKey.startsWith('products/') || imgKey.startsWith('p/')) {
                htmlImage = `https://f.nooncdn.com/${imgKey}${imgKey.endsWith('.jpg') ? '' : '.jpg'}`;
              } else {
                htmlImage = `https://f.nooncdn.com/products/tr:n-t_400/${imgKey}.jpg`;
              }
            } else if (Array.isArray(pObj.images) && pObj.images[0]) {
              htmlImage = typeof pObj.images[0] === 'string' ? pObj.images[0] : (pObj.images[0].url || pObj.images[0].src || '');
            }
            if (pObj.brand || pObj.brand_name) {
              storeName = `Noon (${pObj.brand || pObj.brand_name})`;
            }
          }
        } catch (_jsonErr) {}
      }
    }

    // Fallback if catalog API text extraction didn't yield title/price
    if (!htmlTitle || htmlPrice === 0) {
      const pageRes = await fetchWithProxies(cleanUrl);
      if (pageRes.ok && pageRes.text) {
        const htmlText = pageRes.text;
        const nextDataMatch = htmlText.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
        if (nextDataMatch && nextDataMatch[1]) {
          try {
            const nextJson = JSON.parse(nextDataMatch[1]);
            const pp = nextJson?.props?.pageProps;
            const pObj = pp?.catalog?.product || pp?.product || pp?.productData || pp?.initialState?.product || pp?.productDetail;
            if (pObj) {
              if (!htmlTitle) {
                const titleVal = pObj.name || pObj.title || pObj.en_name || pp?.catalog?.product?.name || pp?.product?.name;
                if (titleVal) htmlTitle = String(titleVal).trim();
              }
              if (htmlPrice === 0) {
                const rawP = pObj.sale_price ?? pObj.price ?? pObj.offer_price ?? pp?.catalog?.product?.sale_price ?? pp?.product?.sale_price;
                if (rawP !== undefined && rawP !== null) {
                  const cleanPStr = String(rawP).replace(/,/g, '').replace(/[^0-9.]/g, '');
                  const parsedP = parseFloat(cleanPStr);
                  if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
                }
              }
              if (!htmlImage) {
                const imgKey = pObj.image_key || pp?.catalog?.product?.image_key || pp?.product?.image_key || (Array.isArray(pObj.image_keys) ? pObj.image_keys[0] : null);
                if (imgKey) {
                  htmlImage = String(imgKey).startsWith('http') ? String(imgKey) : `https://f.nooncdn.com/products/tr:n-t_400/${imgKey}.jpg`;
                }
              }
            }
          } catch (_e) {}
        }
        if (!htmlTitle) {
          const noonTitle = htmlText.match(/<h1[^>]*class=["'][^"']*pdp-[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                            htmlText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                            htmlText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
          if (noonTitle && noonTitle[1]) htmlTitle = noonTitle[1].replace(/<[^>]+>/g, '').trim().replace(/\s*\|\s*Noon.*$/i, '');
        }
        if (htmlPrice === 0) {
          const noonPrice = htmlText.match(/<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["']/i) ||
                            htmlText.match(/["']sale_price["']\s*:\s*([\d\.]+)/i) ||
                            htmlText.match(/["']priceNow["']\s*:\s*([\d\.]+)/i) ||
                            htmlText.match(/AED\s*([\d\.]+)/i);
          if (noonPrice && noonPrice[1]) {
            const cleanP = parseFloat(noonPrice[1]);
            if (!isNaN(cleanP) && cleanP > 0) htmlPrice = Math.round(cleanP * 100) / 100;
          }
        }
        if (!htmlImage) {
          const noonImg = htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                          htmlText.match(/https:\/\/f\.nooncdn\.com\/products\/[^\s"'<>]+/i);
          if (noonImg) {
            htmlImage = noonImg[1] || noonImg[0];
          }
        }
      }
    }
  }

  // B. AMAZON AE HTML SCRAPING (Via Dedicated Scraper & Waterfall)
  if (isAmazonUrl && (!htmlTitle || htmlPrice === 0)) {
    const asinMatch = cleanUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i) || cleanUrl.match(/\/([A-Z0-9]{10})(?:[\/\?%]|$)/i);
    const targetAmzUrl = (asinMatch && asinMatch[1]) ? `https://www.amazon.ae/dp/${asinMatch[1]}` : cleanUrl;
    const pageRes = await fetchWithProxies(targetAmzUrl);

    if (pageRes.ok && pageRes.text) {
      const htmlText = pageRes.text;

      // Jina markdown parsing if jina proxy was used
      if (pageRes.text.startsWith('# ') || pageRes.text.includes('Title: ')) {
        const jinaTitle = htmlText.match(/^#\s*([^\n]+)/m) || htmlText.match(/Title:\s*([^\n]+)/i);
        if (jinaTitle && jinaTitle[1]) {
          htmlTitle = jinaTitle[1].replace(/^Amazon\.ae\s*:\s*/i, '').replace(/\s*[\-\|:]\s*Amazon.*$/i, '').trim();
        }
        const jinaPrice = htmlText.match(/(?:AED|Price:)\s*([\d\.,]+)/i) || htmlText.match(/([\d\.,]+)\s*AED/i);
        if (jinaPrice && jinaPrice[1]) {
          const cleanP = parseFloat(jinaPrice[1].replace(/,/g, ''));
          if (!isNaN(cleanP) && cleanP > 0) htmlPrice = Math.round(cleanP * 100) / 100;
        }
        const jinaImg = htmlText.match(/(https:\/\/(?:m\.media-amazon|images-na\.ssl-images-amazon)\.com\/images\/I\/[^\s"'\)\n]+)/i);
        if (jinaImg && jinaImg[1]) htmlImage = jinaImg[1];
      }

      // Standard Amazon HTML parsing
      if (!htmlTitle) {
        const amzTitle = htmlText.match(/<span[^>]*id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i) ||
                         htmlText.match(/<h1[^>]*id=["']title["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                         htmlText.match(/<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/i) ||
                         htmlText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         htmlText.match(/<title>([^<]+)<\/title>/i);
        if (amzTitle && amzTitle[1]) {
          htmlTitle = amzTitle[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&#\d+;/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
        }
      }

      if (htmlPrice === 0) {
        const amzPrice = htmlText.match(/<span[^>]*class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*(?:AED|AED&nbsp;)?\s*([\d\.,]+)\s*(?:AED)?<\/span>/i) ||
                         htmlText.match(/id=["'](?:priceblock_ourprice|priceblock_dealprice|price_inside_buybox|corePrice_desktop|corePrice_feature_div)["'][^>]*>\s*(?:AED)?\s*([\d\.,]+)/i) ||
                         htmlText.match(/<span[^>]*class=["'][^"']*a-price-whole[^"']*["'][^>]*>([\d\.,]+)/i) ||
                         htmlText.match(/<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["']/i) ||
                         htmlText.match(/["']price["']\s*:\s*["']?([\d\.]+)["']?/i);
        if (amzPrice && amzPrice[1]) {
          const cleanP = parseFloat(amzPrice[1].replace(/,/g, ''));
          if (!isNaN(cleanP) && cleanP > 0) htmlPrice = Math.round(cleanP * 100) / 100;
        }
      }

      if (!htmlImage) {
        const amzImg = htmlText.match(/<img[^>]*id=["']landingImage["'][^>]*data-old-hires=["']([^"']+)["']/i) ||
                       htmlText.match(/<img[^>]*id=["']landingImage["'][^>]*src=["']([^"']+)["']/i) ||
                       htmlText.match(/data-a-dynamic-image=["']\{&quot;(https:\/\/[^&"]+)&quot;/i) ||
                       htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                       htmlText.match(/(https:\/\/(?:m\.media-amazon|images-na\.ssl-images-amazon)\.com\/images\/I\/[^\s"'\)<>]+)/i);
        if (amzImg && amzImg[1] && amzImg[1].startsWith('http')) {
          htmlImage = amzImg[1];
        }
      }
    }
  }

  // C. DR NUTRITION SPECIALIZED PARSER (Dedicated Scraper + JSON-LD Primary + OG/DOM Fallback)
  if (isDrNutritionUrl && (!htmlTitle || htmlPrice === 0)) {
    const pageRes = await fetchWithProxies(cleanUrl);
    if (pageRes.ok && pageRes.text) {
      const htmlText = pageRes.text;

      const sanitizeImageUrl = (rawImg: string) => {
        if (!rawImg) return '';
        let str = String(rawImg).trim().replace(/&amp;/g, '&');
        str = str.replace(/^["']|["']$/g, '').trim();
        if (str.startsWith('//')) {
          str = 'https:' + str;
        } else if (str.startsWith('/')) {
          str = 'https://drnutrition.com' + str;
        } else if (str.startsWith('http://')) {
          str = str.replace('http://', 'https://');
        }
        str = str.split('"')[0].split("'")[0].split('\\')[0].trim();
        return str;
      };

      // 1. Primary Extractor: Parse application/ld+json
      const ldMatches = Array.from(htmlText.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
      for (const ldMatch of ldMatches) {
        if (ldMatch && ldMatch[1]) {
          try {
            const ldJson = JSON.parse(ldMatch[1]);
            const items = Array.isArray(ldJson) ? ldJson : (ldJson['@graph'] ? ldJson['@graph'] : [ldJson]);
            for (const item of items) {
              if (item && (item['@type'] === 'Product' || item['@type'] === 'IndividualProduct' || item.name || item.offers)) {
                if (!htmlTitle && item.name) {
                  htmlTitle = String(item.name).replace(/<[^>]+>/g, '').trim();
                }
                if (!htmlDescription && item.description) {
                  const cleanDesc = String(item.description).replace(/<[^>]+>/g, '').trim();
                  if (cleanDesc) htmlDescription = cleanDesc;
                }
                if (item.image) {
                  if (typeof item.image === 'string') {
                    collectedImages.push(item.image);
                    if (!htmlImage) htmlImage = sanitizeImageUrl(item.image);
                  } else if (Array.isArray(item.image)) {
                    item.image.forEach((img: any) => {
                      const str = typeof img === 'string' ? img : (img?.url || img?.src || '');
                      if (str) collectedImages.push(str);
                    });
                    if (!htmlImage && collectedImages[0]) htmlImage = sanitizeImageUrl(collectedImages[0]);
                  } else if (typeof item.image === 'object') {
                    const str = item.image.url || item.image.src || '';
                    if (str) {
                      collectedImages.push(str);
                      if (!htmlImage) htmlImage = sanitizeImageUrl(str);
                    }
                  }
                }
                if (htmlPrice === 0 && item.offers) {
                  const offersList = Array.isArray(item.offers) ? item.offers : [item.offers];
                  for (const offerObj of offersList) {
                    if (offerObj) {
                      const pVal = offerObj.price ?? offerObj.lowPrice ?? offerObj.highPrice;
                      if (pVal !== undefined && pVal !== null) {
                        const cleanPStr = String(pVal).replace(/,/g, '').replace(/[^0-9.]/g, '');
                        let parsedP = parseFloat(cleanPStr);
                        if (parsedP > 2000) parsedP = parsedP / 100;
                        if (!isNaN(parsedP) && parsedP > 0) {
                          htmlPrice = Math.round(parsedP * 100) / 100;
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (_e) {}
        }
      }

      // 2. Secondary Extractor: OpenGraph / Meta / Regex Fallbacks
      if (!htmlTitle) {
        const titleMatch = htmlText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                           htmlText.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
                           htmlText.match(/<h1[^>]*class=["'][^"']*product-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                           htmlText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                           htmlText.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          htmlTitle = titleMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&#\d+;/g, '')
            .replace(/&amp;/g, '&')
            .replace(/\s*[\-\|:]\s*Dr\.?\s*Nutrition.*$/i, '')
            .trim();
        }
      }

      if (!htmlImage) {
        const imageMatch = htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                           htmlText.match(/<meta[^>]*name=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                           htmlText.match(/<meta[^>]*property=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                           htmlText.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                           htmlText.match(/<img[^>]*class=["'][^"']*product[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
                           htmlText.match(/<img[^>]*class=["'][^"']*product[^"']*["'][^>]*data-src=["']([^"']+)["']/i) ||
                           htmlText.match(/<img[^>]*class=["'][^"']*product[^"']*["'][^>]*data-lazy=["']([^"']+)["']/i) ||
                           htmlText.match(/<img[^>]*data-src=["']([^"']+)["'][^>]*class=["'][^"']*product[^"']*["']/i) ||
                           htmlText.match(/<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*product[^"']*["']/i) ||
                           htmlText.match(/["'](?:image|imageUrl|full_image|main_image|product_image)["']\s*:\s*["']([^"']+)["']/i) ||
                           htmlText.match(/<img[^>]*src=["']([^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
        if (imageMatch && imageMatch[1]) {
          htmlImage = sanitizeImageUrl(imageMatch[1]);
        }
      }

      if (!htmlDescription) {
        const descMatch = htmlText.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                          htmlText.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                          htmlText.match(/<meta[^>]*property=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                          htmlText.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i);
        if (descMatch && descMatch[1]) {
          const cleanDesc = descMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&#\d+;/g, '')
            .replace(/&amp;/g, '&')
            .trim();
          if (cleanDesc) htmlDescription = cleanDesc;
        }
      }

      if (htmlPrice === 0) {
        const priceMatch = htmlText.match(/<meta[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["']/i) ||
                           htmlText.match(/["']price["']\s*:\s*["']?([\d\.,]+)["']?/i) ||
                           htmlText.match(/["']priceAmount["']\s*:\s*["']?([\d\.,]+)["']?/i) ||
                           htmlText.match(/AED\s*([\d\.,]+)/i) ||
                           htmlText.match(/([\d\.,]+)\s*AED/i);
        if (priceMatch && priceMatch[1]) {
          const cleanPStr = priceMatch[1].replace(/,/g, '').replace(/[^0-9.]/g, '');
          const parsedP = parseFloat(cleanPStr);
          if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
        }
      }
    }
  }

  // D. SHOPIFY STORES PARSER (.json / .js endpoints)
  if (isShopifyUrl && (!htmlTitle || htmlPrice === 0)) {
    const rawBaseUrl = cleanUrl.split('?')[0].replace(/\.js$/i, '').replace(/\.json$/i, '');
    const jsonEndpoint = rawBaseUrl + '.json';
    const jsEndpoint = rawBaseUrl + '.js';

    // 1. Try Direct Fetch to .json first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const directJsonRes = await fetch(jsonEndpoint, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (directJsonRes.ok) {
        const jsonData = await directJsonRes.json();
        const pObj = jsonData?.product || jsonData;
        if (pObj && (pObj.title || pObj.name)) {
          htmlTitle = String(pObj.title || pObj.name).trim();
          const variants = Array.isArray(pObj.variants) ? pObj.variants : [];
          const primaryVariant = variants[0];
          let rawP = primaryVariant?.price ?? pObj.price;
          if (rawP !== undefined && rawP !== null) {
            const cleanPStr = String(rawP).replace(/,/g, '').replace(/[^0-9.]/g, '');
            let parsedP = parseFloat(cleanPStr);
            if (parsedP > 2000) parsedP = parsedP / 100;
            if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
          }
          if (primaryVariant?.compare_at_price) {
            const cleanOrigStr = String(primaryVariant.compare_at_price).replace(/,/g, '').replace(/[^0-9.]/g, '');
            let parsedOrig = parseFloat(cleanOrigStr);
            if (parsedOrig > 2000) parsedOrig = parsedOrig / 100;
            if (!isNaN(parsedOrig) && parsedOrig > htmlPrice) htmlOriginalPrice = Math.round(parsedOrig * 100) / 100;
          }
          const imgObj = pObj.image?.src || (Array.isArray(pObj.images) && pObj.images[0] ? (typeof pObj.images[0] === 'string' ? pObj.images[0] : pObj.images[0]?.src) : pObj.featured_image);
          if (imgObj) {
            const imgStr = String(imgObj);
            htmlImage = imgStr.startsWith('http') ? imgStr : 'https:' + imgStr;
          }
        }
      }
    } catch (_e) {}

    // 2. Fallback to Proxy Waterfall for .json if direct fetch didn't return title/price
    if (!htmlTitle || htmlPrice === 0) {
      const proxyRes = await fetchWithProxies(jsonEndpoint);
      if (proxyRes.ok && proxyRes.text) {
        try {
          const jsData = JSON.parse(proxyRes.text);
          const pObj = jsData?.product || jsData;
          if (pObj && (pObj.title || pObj.name)) {
            htmlTitle = String(pObj.title || pObj.name).trim();
            const variants = Array.isArray(pObj.variants) ? pObj.variants : [];
            const primaryVariant = variants[0];
            let rawP = primaryVariant?.price ?? pObj.price;
            if (rawP !== undefined && rawP !== null) {
              const cleanPStr = String(rawP).replace(/,/g, '').replace(/[^0-9.]/g, '');
              let parsedP = parseFloat(cleanPStr);
              if (parsedP > 2000) parsedP = parsedP / 100;
              if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
            }
            const imgObj = pObj.image?.src || (Array.isArray(pObj.images) && pObj.images[0] ? (typeof pObj.images[0] === 'string' ? pObj.images[0] : pObj.images[0]?.src) : pObj.featured_image);
            if (imgObj) {
              const imgStr = String(imgObj);
              htmlImage = imgStr.startsWith('http') ? imgStr : 'https:' + imgStr;
            }
          }
        } catch (_e) {}
      }
    }

    // 3. Fallback to .js endpoint via proxies
    if (!htmlTitle || htmlPrice === 0) {
      const jsRes = await fetchWithProxies(jsEndpoint);
      if (jsRes.ok && jsRes.text) {
        try {
          const jsData = JSON.parse(jsRes.text);
          if (jsData && (jsData.title || jsData.name)) {
            htmlTitle = String(jsData.title || jsData.name).trim();
            let rawP = jsData.price;
            if ((rawP === undefined || rawP === null) && Array.isArray(jsData.variants) && jsData.variants[0]) {
              rawP = jsData.variants[0].price;
            }
            if (rawP !== undefined && rawP !== null) {
              const cleanPStr = String(rawP).replace(/,/g, '').replace(/[^0-9.]/g, '');
              let parsedP = parseFloat(cleanPStr);
              if (parsedP > 2000) parsedP = parsedP / 100;
              if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
            }
            if (jsData.featured_image) {
              htmlImage = typeof jsData.featured_image === 'string'
                ? (jsData.featured_image.startsWith('http') ? jsData.featured_image : 'https:' + jsData.featured_image)
                : (jsData.featured_image.src ? (jsData.featured_image.src.startsWith('http') ? jsData.featured_image.src : 'https:' + jsData.featured_image.src) : '');
            }
          }
        } catch (_e) {}
      }
    }
  }

  // D. OTHER STORES & GENERAL JSON-LD PARSER
  if (!htmlTitle || htmlPrice === 0) {
    if (!isNoonUrl && !isAmazonUrl) {
      const pageRes = await fetchWithProxies(cleanUrl);
      if (pageRes.ok && pageRes.text) {
        const htmlText = pageRes.text;

        const ldMatches = Array.from(htmlText.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
        for (const ldMatch of ldMatches) {
          if (ldMatch && ldMatch[1]) {
            try {
              const ldJson = JSON.parse(ldMatch[1]);
              const items = Array.isArray(ldJson) ? ldJson : (ldJson['@graph'] ? ldJson['@graph'] : [ldJson]);
              for (const item of items) {
                if (item && (item['@type'] === 'Product' || item['@type'] === 'IndividualProduct' || item.name || item.offers)) {
                  if (!htmlTitle && item.name) htmlTitle = String(item.name).trim();
                  if (!htmlImage) {
                    if (typeof item.image === 'string') htmlImage = item.image;
                    else if (Array.isArray(item.image) && item.image[0]) htmlImage = typeof item.image[0] === 'string' ? item.image[0] : (item.image[0]?.url || '');
                  }
                  if (htmlPrice === 0 && item.offers) {
                    const offerObj = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                    if (offerObj) {
                      const pVal = offerObj.price ?? offerObj.lowPrice ?? offerObj.highPrice;
                      if (pVal !== undefined && pVal !== null) {
                        let parsedP = parseFloat(String(pVal));
                        if (parsedP > 2000) parsedP = parsedP / 100;
                        if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
                      }
                    }
                  }
                }
              }
            } catch (_e) {}
          }
        }

        if (!htmlTitle) {
          const titleMatch = htmlText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                             htmlText.match(/<h1[^>]*class=["'][^"']*product-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                             htmlText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                             htmlText.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            htmlTitle = titleMatch[1].replace(/<[^>]+>/g, '').replace(/&#\d+;/g, '').replace(/\s*\|.*/, '').replace(/\s*- Dr\.?\s*Nutrition.*$/i, '').trim();
          }
        }
        if (!htmlImage) {
          const imageMatch = htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                             htmlText.match(/<meta[^>]*name=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          if (imageMatch && imageMatch[1] && imageMatch[1].startsWith('http')) htmlImage = imageMatch[1];
        }
        if (htmlPrice === 0) {
          const priceMatch = htmlText.match(/<meta[^>]*property=["'](?:og:price:amount|product:price:amount)["'][^>]*content=["']([^"']+)["']/i) ||
                             htmlText.match(/["']price["']\s*:\s*["']?([\d\.,]+)["']?/i) ||
                             htmlText.match(/["']offers["'][\s\S]*?["']price["']\s*:\s*["']?([\d\.,]+)["']?/i) ||
                             htmlText.match(/AED\s*([\d\.,]+)/i) ||
                             htmlText.match(/([\d\.,]+)\s*AED/i);
          if (priceMatch && priceMatch[1]) {
            const cleanPStr = priceMatch[1].replace(/,/g, '').replace(/[^0-9.]/g, '');
            const parsedP = parseFloat(cleanPStr);
            if (!isNaN(parsedP) && parsedP > 0) htmlPrice = Math.round(parsedP * 100) / 100;
          }
        }
      }
    }
  }

  // Final title cleanup
  if (htmlTitle) {
    htmlTitle = htmlTitle
      .replace(/\s*[\-\|:]\s*Amazon\.ae.*$/i, '')
      .replace(/^Buy\s+/i, '')
      .replace(/\s*online on Amazon\.ae.*$/i, '')
      .replace(/\s*[\-\|:]\s*Noon.*$/i, '')
      .replace(/\s*[\-\|:]\s*Dr\.?\s*Nutrition.*$/i, '')
      .trim();
  }

  // SUCCESSFUL EXTRACTION
  if (htmlTitle && htmlPrice > 0) {
    if (htmlImage) {
      collectedImages.unshift(htmlImage);
    }

    const processedImages: string[] = [];
    for (const rawImg of collectedImages) {
      if (!rawImg) continue;
      let clean = sanitizeImageUrl(rawImg);
      if (!clean || !clean.startsWith('http')) continue;
      if ((isDrNutritionUrl || clean.includes('drnutrition.com')) && !clean.includes('images.weserv.nl')) {
        clean = 'https://images.weserv.nl/?url=' + encodeURIComponent(clean);
      }
      if (!processedImages.includes(clean)) {
        processedImages.push(clean);
      }
    }

    const mainImage = processedImages[0] || htmlImage || '';
    const finalImagesList = processedImages.length > 0 ? processedImages.slice(0, 5) : (mainImage ? [mainImage] : []);

    if (isDrNutritionUrl) {
      console.log("Extracted DrNutrition Images:", finalImagesList);
    }

    const effectiveOrig = (htmlOriginalPrice > htmlPrice) ? htmlOriginalPrice : 0;
    const effectiveDisc = effectiveOrig > htmlPrice ? Math.round(((effectiveOrig - htmlPrice) / effectiveOrig) * 100) : 0;

    return res.json({
      success: true,
      title: htmlTitle,
      price: htmlPrice,
      brand: storeName,
      url: cleanUrl,
      priceAed: htmlPrice,
      price_aed: htmlPrice,
      originalPriceAed: effectiveOrig > 0 ? effectiveOrig : undefined,
      original_price_aed: effectiveOrig > 0 ? effectiveOrig : undefined,
      discountPercent: effectiveDisc > 0 ? effectiveDisc : undefined,
      weightKg: 0.8,
      storeName,
      image: mainImage,
      mainImage: mainImage,
      image_url: mainImage,
      images: finalImagesList,
      galleryImages: finalImagesList,
      description: htmlDescription || `محصول استخراج شده مستقیم از ${storeName}`,
      options: ["پیش‌فرض / استاندارد"],
      aiExtracted: false,
      directScraped: true
    });
  }

  // BULLETPROOF ERROR HANDLING IF ALL PROXIES FAILED OR BLOCKED BY CLOUDFLARE/CAPTCHA
  return res.status(400).json({
    success: false,
    error: 'سایت مبدا استخراج را مسدود کرد. لطفاً لحظاتی بعد مجدداً تلاش کنید.',
    message: 'سایت مبدا استخراج را مسدود کرد. لطفاً لحظاتی بعد مجدداً تلاش کنید.'
  });
});

// Express global JSON error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error('Express Server Error:', err.message || err);
    return res.status(err.status || err.statusCode || 500).json({
      error: err.message || 'خطای سرور رخ داده است.'
    });
  }
  next();
});

// Export 2nd Generation Cloud Function
export const api = onRequest(
  {
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 60,
  },
  app
);

// ----------------------------------------------------
// VITE MIDDLEWARE & STANDALONE SERVER
// ----------------------------------------------------
async function startServer() {
  await getStoreData().catch(e => console.warn('Initial store hydrate warn:', e));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.FUNCTION_TARGET && !process.env.FUNCTIONS_EMULATOR) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`OMEX Dubai Import Platform server listening on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.FUNCTION_TARGET && !process.env.FUNCTIONS_EMULATOR) {
  startServer();
}
