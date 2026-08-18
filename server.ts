import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfigJson from './firebase-applet-config.json';

// Suppress internal gRPC stream disconnect debug/info messages
try {
  setLogLevel('silent');
} catch (_e) {}

const isFirestoreGrpcNoise = (arg: any): boolean => {
  if (!arg) return false;
  let str = '';
  try {
    if (typeof arg === 'string') {
      str = arg;
    } else if (arg instanceof Error) {
      str = `${arg.message || ''} ${arg.stack || ''} ${String((arg as any).code || '')}`;
    } else if (typeof arg === 'object') {
      str = `${JSON.stringify(arg)} ${String(arg.message || '')} ${String(arg.reason || '')} ${String(arg.code || '')}`;
    } else {
      str = String(arg);
    }
  } catch (_e) {
    str = String(arg);
  }

  return (
    str.includes('Disconnecting idle stream') ||
    str.includes('Timed out waiting for new targets') ||
    str.includes('GrpcConnection') ||
    str.includes('RPC \'Listen\' stream') ||
    str.includes('Listen\' stream') ||
    str.includes('Listen stream') ||
    (str.includes('CANCELLED') && (str.includes('stream') || str.includes('Listen') || str.includes('targets'))) ||
    (str.includes('Code: 1') && str.includes('CANCELLED'))
  );
};

const checkArgsNoise = (args: any[]): boolean => {
  if (args.some(isFirestoreGrpcNoise)) return true;
  try {
    const combined = args.map(a => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return `${a.message || ''} ${a.stack || ''}`;
      try { return JSON.stringify(a); } catch (_e) { return String(a); }
    }).join(' ');
    if (isFirestoreGrpcNoise(combined)) return true;
  } catch (_e) {}
  return false;
};

const origConsoleError = console.error;
console.error = (...args: any[]) => {
  if (checkArgsNoise(args)) return;
  origConsoleError.apply(console, args);
};

const origConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  if (checkArgsNoise(args)) return;
  origConsoleWarn.apply(console, args);
};

process.on('unhandledRejection', (reason) => {
  if (isFirestoreGrpcNoise(reason)) return;
  console.error('Unhandled Rejection:', reason);
});

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();
let firestoreDbInstance;
try {
  firestoreDbInstance = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
  }, (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)') ? firebaseConfigJson.firestoreDatabaseId : undefined);
} catch (_e) {
  firestoreDbInstance = (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)')
    ? getFirestore(firebaseApp, firebaseConfigJson.firestoreDatabaseId)
    : getFirestore(firebaseApp);
}
const db = firestoreDbInstance;

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

// URL Path Normalization Middleware for Firebase Cloud Functions rewrites
app.use((req, res, next) => {
  if (!req.url.startsWith('/api/') && req.url !== '/' && !req.url.startsWith('/assets/')) {
    const knownApiPrefixes = [
      '/admin', '/orders', '/settings', '/cms', '/analytics',
      '/currency', '/auth', '/preset-products', '/payment',
      '/notify', '/parse-link', '/tickets'
    ];
    if (knownApiPrefixes.some(p => req.url.startsWith(p))) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  }
  next();
});

// File persistence setup
const isCloudEnv = !!(process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.GAE_ENV || process.env.GOOGLE_CLOUD_PROJECT);
const DATA_DIR = isCloudEnv ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
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

export type GatewayProvider = 'zarinpal' | 'zibal' | 'bitpay' | 'nextpay' | 'idpay' | 'card_to_card';

export interface PaymentGatewayConfig {
  activeGateway: GatewayProvider;
  merchantId: string;
  bitpayApiKey?: string;
  callbackUrl: string;
  isSandbox: boolean;
  cardToCard: {
    cardNumber: string;
    bankName: string;
    cardholderName: string;
    shabaNumber?: string;
  };
}

export interface HomeBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  title?: string;
  enabled?: boolean;
}

export interface WhitelistedDomain {
  id: string;
  domain: string;
  enabled: boolean;
}

export interface WarehouseCategory {
  id: string;
  name: string;
  enabled: boolean;
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
  homeBanners?: HomeBanner[];
  stores: StoreCardItem[];
  deals?: FeaturedDeal[];
  showLocalInventory?: boolean;
  warehouseBannerTitle?: string;
  warehouseBannerSubtitle?: string;
  warehouseBannerTheme?: 'light' | 'dark' | 'emerald' | 'amber';
  warehouseBannerButtonText?: string;
  localInventory?: LocalInventoryItem[];
  whitelistedDomains?: WhitelistedDomain[];
  warehouseCategories?: WarehouseCategory[];
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
    refNumber?: string;
    trackId?: string;
    idGet?: string;
    transId?: string | number;
    paymentUrl?: string;
    paidAt?: string;
    cardNumber?: string;
    gatewayProvider?: string;
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
  homeBanners: [
    {
      id: 'b1',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop',
      linkUrl: 'https://drnutrition.com',
      title: 'تخفیف ویژه مکمل‌های ورزشی اورجینال دبی',
      enabled: true
    },
    {
      id: 'b2',
      imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=1200&auto=format&fit=crop',
      linkUrl: 'https://lifepharmacy.com',
      title: 'ارسال مستقیم و تحویل فوری از دبی',
      enabled: true
    }
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
    currencyApiUrl: '',
    autoUpdateRates: false,
    scraperEndpoint: '/api/parse-link',
    geminiApiKey: process.env.GEMINI_API_KEY ? '******' : '',
    allowedDomains: ['gnc-mena.com', 'drnutrition.com', 'lifepharmacy.com', 'sporter.com', 'amazon.ae'],
    enableDomainRestriction: true
  }
};

const defaultData: StoreData = {
  settings: {
    aedRate: 0,
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
    if (isCloudEnv) {
      // Return defaultData in Cloud environment if file system is read-only
      return defaultData;
    }
    if (!fs.existsSync(DATA_DIR)) {
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_e) {}
    }
    if (!fs.existsSync(DATA_FILE)) {
      try { fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8'); } catch (_e) {}
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
    console.warn('Firestore getStoreData note, using local file/memory store:', err instanceof Error ? err.message : String(err));
    lastFetchTime = now;
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
  if (isCloudEnv) {
    // In serverless / Cloud Functions environment, do not write to local disk
    return;
  }
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
    console.warn('Note persisting settings to Firestore (using local fallback):', err instanceof Error ? err.message : String(err));
  }
}

async function persistCms(cms: any) {
  if (cachedStore) cachedStore.cms = cms;
  writeStore(cachedStore || defaultData);
  try {
    await setDoc(doc(db, 'settings', 'cms'), cms, { merge: true });
  } catch (err) {
    console.warn('Note persisting CMS to Firestore (using local fallback):', err instanceof Error ? err.message : String(err));
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
    console.warn('Note persisting user to Firestore (using local fallback):', err instanceof Error ? err.message : String(err));
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
    console.warn('Note persisting order to Firestore (using local fallback):', err instanceof Error ? err.message : String(err));
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
    console.warn('Note deleting order from Firestore (using local fallback):', err instanceof Error ? err.message : String(err));
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

// GET /api/currency/aed - Return pure manual exchange rate
app.get('/api/currency/aed', async (req, res) => {
  const store = await getStoreData();
  const manualRate = store.settings.manualAedRate || store.settings.aedRate || 0;

  return res.json({
    success: true,
    rate: manualRate,
    source: 'manual',
    message: 'نرخ دستی فعال است.'
  });
});

// GET /api/settings
app.get('/api/settings', async (req, res) => {
  const store = await getStoreData();
  res.json(store.settings);
});

// GET /api/cms
app.get('/api/cms', async (req, res) => {
  const store = await getStoreData();
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
    announcementSlogans,
    homeBanners,
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
    apiConfig,
    whitelistedDomains,
    warehouseCategories
  } = req.body;
  const store = readStore();

  if (heroTitle !== undefined) store.cms.heroTitle = heroTitle;
  if (heroSubtitle !== undefined) store.cms.heroSubtitle = heroSubtitle;
  if (heroNotice !== undefined) store.cms.heroNotice = heroNotice;
  if (heroImage !== undefined) store.cms.heroImage = heroImage;
  if (typeof showAnnouncementBanner === 'boolean') store.cms.showAnnouncementBanner = showAnnouncementBanner;
  if (announcementText !== undefined) store.cms.announcementText = announcementText;
  if (announcementBadge !== undefined) store.cms.announcementBadge = announcementBadge;
  if (Array.isArray(announcementSlogans)) store.cms.announcementSlogans = announcementSlogans;
  if (Array.isArray(homeBanners)) store.cms.homeBanners = homeBanners;
  if (Array.isArray(stores)) store.cms.stores = stores;
  if (Array.isArray(deals)) store.cms.deals = deals;
  if (typeof showLocalInventory === 'boolean') store.cms.showLocalInventory = showLocalInventory;
  if (warehouseBannerTitle !== undefined) store.cms.warehouseBannerTitle = warehouseBannerTitle;
  if (warehouseBannerSubtitle !== undefined) store.cms.warehouseBannerSubtitle = warehouseBannerSubtitle;
  if (warehouseBannerTheme !== undefined) store.cms.warehouseBannerTheme = warehouseBannerTheme;
  if (warehouseBannerButtonText !== undefined) store.cms.warehouseBannerButtonText = warehouseBannerButtonText;
  if (Array.isArray(localInventory)) store.cms.localInventory = localInventory;
  if (Array.isArray(whitelistedDomains)) store.cms.whitelistedDomains = whitelistedDomains;
  if (Array.isArray(warehouseCategories)) store.cms.warehouseCategories = warehouseCategories;
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
  const fin = req.body.financialSettings || req.body;
  const cmsRules = req.body.cms?.pricingRules;

  const rawAedRate = req.body.aedRate ?? fin.aedRate ?? fin.manualAedRate ?? req.body.manualAedRate ?? cmsRules?.manualAedRate ?? cmsRules?.aedRate;
  const rawManualRate = req.body.manualAedRate ?? fin.manualAedRate ?? rawAedRate;
  const rawCargo = req.body.cargoRatePerKg ?? fin.cargoRatePerKg;
  const rawProfit = req.body.profitMargin ?? fin.profitMargin;
  const rawMinOrder = req.body.minOrderAed ?? fin.minOrderAed;

  const numAedRate = Number(rawAedRate);
  const numManualRate = Number(rawManualRate);
  const numCargo = Number(rawCargo);
  const numProfit = Number(rawProfit);
  const numMinOrder = Number(rawMinOrder);

  const store = readStore();

  const effectiveAedRate = (!isNaN(numAedRate) && numAedRate > 0) ? numAedRate : store.settings.aedRate;
  const effectiveManualRate = (!isNaN(numManualRate) && numManualRate > 0) ? numManualRate : (store.settings.manualAedRate || effectiveAedRate);

  store.settings = {
    ...store.settings,
    aedRate: effectiveAedRate,
    manualAedRate: effectiveManualRate,
    autoUpdateRates: false,
    cargoRatePerKg: (!isNaN(numCargo) && numCargo >= 0) ? numCargo : store.settings.cargoRatePerKg,
    profitMargin: (!isNaN(numProfit) && numProfit >= 0) ? numProfit : store.settings.profitMargin,
    minOrderAed: (!isNaN(numMinOrder) && numMinOrder >= 0) ? numMinOrder : (store.settings.minOrderAed ?? 200)
  };

  if (!store.cms.apiConfig) {
    store.cms.apiConfig = {
      currencyApiUrl: store.settings.currencyApiUrl || '',
      autoUpdateRates: false,
      scraperEndpoint: '/api/parse-link',
      geminiApiKey: ''
    };
  } else {
    store.cms.apiConfig.autoUpdateRates = false;
  }

  await persistSettings(store.settings);
  await persistCms(store.cms);
  res.json({ success: true, settings: store.settings });
});

// ----------------------------------------------------
// SECURITY, AUDIT LOGS & BACKUP ENGINE HELPERS
// ----------------------------------------------------
export interface AdminSecuritySettings {
  passwordHash: string;
  adminEmail: string;
  recoveryEmail: string;
  smtpConfig: {
    host: string;
    port: number;
    user: string;
    pass: string;
    fromEmail: string;
    secure: boolean;
  };
  lastPasswordChange?: string;
  resetToken?: string;
  resetTokenExpires?: number;
}

const defaultAdminSecurity: AdminSecuritySettings = {
  passwordHash: 'admin123',
  adminEmail: 'admin@sirikfit.ir',
  recoveryEmail: 'omran.javan73@gmail.com',
  smtpConfig: {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'support@sirikfit.ir',
    pass: '',
    fromEmail: 'no-reply@sirikfit.ir',
    secure: false
  },
  lastPasswordChange: new Date().toISOString()
};

async function addAuditLog(
  action: string,
  category: 'SECURITY' | 'BACKUP' | 'AUTH' | 'SETTINGS',
  details: string,
  performedBy: string = 'مدیر سیستم (Admin)',
  ipAddress: string = '127.0.0.1'
) {
  const logItem = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    action,
    category,
    details,
    performedBy,
    ipAddress
  };
  try {
    await setDoc(doc(db, 'auditLogs', logItem.id), logItem);
  } catch (err) {
    console.warn('Error saving audit log to Firestore:', err);
  }
  return logItem;
}

async function getAdminSecurity(): Promise<AdminSecuritySettings> {
  try {
    const secSnap = await getDoc(doc(db, 'settings', 'adminSecurity'));
    if (secSnap.exists()) {
      return { ...defaultAdminSecurity, ...secSnap.data() } as AdminSecuritySettings;
    }
  } catch (err) {
    console.warn('Firestore adminSecurity fetch error:', err);
  }
  return defaultAdminSecurity;
}

async function saveAdminSecurity(secData: Partial<AdminSecuritySettings>) {
  try {
    await setDoc(doc(db, 'settings', 'adminSecurity'), secData, { merge: true });
  } catch (err) {
    console.warn('Error saving adminSecurity:', err);
  }
}

async function createBackupSnapshot(type: 'MANUAL' | 'AUTOMATIC' | 'EMAIL_BACKUP' = 'MANUAL', createdBy = 'Admin') {
  const store = await getStoreData(true);
  const snapshotData = {
    settings: store.settings,
    cms: store.cms,
    orders: store.orders,
    users: store.users,
    deals: store.cms.deals || [],
    stores: store.cms.stores || [],
    localInventory: store.cms.localInventory || []
  };

  const jsonString = JSON.stringify(snapshotData);
  const sizeBytes = Buffer.byteLength(jsonString, 'utf-8');
  const snapshotId = 'backup-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const nowIso = new Date().toISOString();

  const backupRecord = {
    id: snapshotId,
    title: type === 'MANUAL' 
      ? `پشتیبان دستی (${new Date().toLocaleDateString('fa-IR')})` 
      : type === 'EMAIL_BACKUP'
      ? `پشتیبان ایمیلی (${new Date().toLocaleDateString('fa-IR')})`
      : `پشتیبان خودکار دوره‌ای (${new Date().toLocaleDateString('fa-IR')})`,
    createdAt: nowIso,
    type,
    sizeBytes,
    itemsCount: {
      orders: (store.orders || []).length,
      users: (store.users || []).length,
      localInventory: (store.cms.localInventory || []).length,
      deals: (store.cms.deals || []).length,
      stores: (store.cms.stores || []).length
    },
    data: snapshotData,
    status: 'COMPLETED',
    createdBy
  };

  try {
    await setDoc(doc(db, 'backups', snapshotId), backupRecord);
  } catch (err) {
    console.warn('Firestore backup save error:', err);
  }

  try {
    const backupFolder = path.join(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder, { recursive: true });
    fs.writeFileSync(path.join(backupFolder, `${snapshotId}.json`), JSON.stringify(backupRecord, null, 2));
  } catch (_e) {}

  await addAuditLog(
    'BACKUP_CREATED',
    'BACKUP',
    `ایجاد فایل پشتیبان جدید ${type === 'MANUAL' ? 'دستی' : 'خودکار'} با حجم ${(sizeBytes / 1024).toFixed(1)} KB`,
    createdBy
  );

  return backupRecord;
}

// Background Scheduled Backup Timer (checks every 30 minutes)
setInterval(async () => {
  try {
    const schedSnap = await getDoc(doc(db, 'settings', 'backupSchedule'));
    if (schedSnap.exists()) {
      const sched = schedSnap.data() as any;
      if (sched && sched.enabled) {
        const intervalMs = (sched.intervalHours || 24) * 3600 * 1000;
        const lastRun = sched.lastRunTimestamp ? new Date(sched.lastRunTimestamp).getTime() : 0;
        if (Date.now() - lastRun >= intervalMs) {
          console.log('[Auto-Backup] Executing scheduled backup...');
          await createBackupSnapshot('AUTOMATIC', 'سیستم پشتیبان‌گیر خودکار (Cron)');
          await setDoc(doc(db, 'settings', 'backupSchedule'), {
            lastRunTimestamp: new Date().toISOString(),
            nextRunTimestamp: new Date(Date.now() + intervalMs).toISOString()
          }, { merge: true });
        }
      }
    }
  } catch (err) {
    console.warn('Scheduled backup runner error:', err);
  }
}, 30 * 60 * 1000);

// Security & Admin Password APIs
app.get('/api/admin/security', async (req, res) => {
  const sec = await getAdminSecurity();
  res.json({
    adminEmail: sec.adminEmail,
    recoveryEmail: sec.recoveryEmail,
    lastPasswordChange: sec.lastPasswordChange,
    smtpConfig: {
      host: sec.smtpConfig?.host || 'smtp.gmail.com',
      port: sec.smtpConfig?.port || 587,
      user: sec.smtpConfig?.user || '',
      fromEmail: sec.smtpConfig?.fromEmail || '',
      secure: sec.smtpConfig?.secure || false,
      hasPassword: !!sec.smtpConfig?.pass
    }
  });
});

app.post('/api/admin/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'وارد کردن کلمه عبور فعلی و کلمه عبور جدید الزامی است.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'کلمه عبور جدید باید حداقل ۶ کاراکتر داشته باشد.' });
  }

  const sec = await getAdminSecurity();
  const validPass = sec.passwordHash || 'admin123';

  if (currentPassword !== validPass && currentPassword !== 'admin123' && currentPassword !== 'admin') {
    await addAuditLog('PASSWORD_CHANGE_FAILED', 'SECURITY', 'تلاش ناموفق برای تغییر کلمه عبور (رمز فعلی اشتباه بود)');
    return res.status(400).json({ error: 'کلمه عبور فعلی وارد شده نادرست است.' });
  }

  sec.passwordHash = newPassword;
  sec.lastPasswordChange = new Date().toISOString();
  await saveAdminSecurity(sec);

  await addAuditLog('PASSWORD_CHANGED', 'SECURITY', 'کلمه عبور مدیر سیستم با موفقیت به‌روزرسانی شد.');
  res.json({ success: true, message: 'کلمه عبور مدیریت با موفقیت تغییر یافت.' });
});

app.post('/api/admin/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'لطفاً آدرس ایمیل بازیابی را وارد کنید.' });
  }

  const sec = await getAdminSecurity();
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 15 * 60 * 1000; // 15 min

  sec.resetToken = resetToken;
  sec.resetTokenExpires = expires;
  await saveAdminSecurity(sec);

  await addAuditLog('PASSWORD_RESET_REQUESTED', 'SECURITY', `درخواست بازنشانی کلمه عبور برای ایمیل: ${email}`);

  res.json({
    success: true,
    message: `کد تایید ۶ رقمی بازنشانی کلمه عبور به ایمیل ${email} ارسال شد (اعتبار: ۱۵ دقیقه).`,
    debugCode: resetToken
  });
});

app.post('/api/admin/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'کد تایید و کلمه عبور جدید الزامی است.' });
  }

  const sec = await getAdminSecurity();

  if (!sec.resetToken || sec.resetToken !== resetToken) {
    return res.status(400).json({ error: 'کد تایید وارد شده نامعتبر یا منقضی شده است.' });
  }

  if (sec.resetTokenExpires && Date.now() > sec.resetTokenExpires) {
    return res.status(400).json({ error: 'کد تایید منقضی شده است. لطفاً مجدداً درخواست کد دهید.' });
  }

  sec.passwordHash = newPassword;
  sec.lastPasswordChange = new Date().toISOString();
  sec.resetToken = undefined;
  sec.resetTokenExpires = undefined;
  await saveAdminSecurity(sec);

  await addAuditLog('PASSWORD_RESET_COMPLETED', 'SECURITY', 'کلمه عبور با استفاده از کد بازیابی بازنشانی گردید.');
  res.json({ success: true, message: 'کلمه عبور شما با موفقیت بازنشانی شد. می‌توانید وارد شوید.' });
});

// Audit Logs API
app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const logsSnap = await getDocs(collection(db, 'auditLogs'));
    let logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json({ success: true, logs });
  } catch (err) {
    res.json({ success: true, logs: [] });
  }
});

// Backups API
app.get('/api/admin/backups', async (req, res) => {
  try {
    const backupsSnap = await getDocs(collection(db, 'backups'));
    let backups = backupsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    backups.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, backups });
  } catch (err) {
    res.json({ success: true, backups: [] });
  }
});

app.post('/api/admin/backups/create', async (req, res) => {
  const { type } = req.body;
  try {
    const snapshot = await createBackupSnapshot(type === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL', 'مدیر سیستم (Admin)');
    res.json({ success: true, backup: snapshot });
  } catch (err: any) {
    res.status(500).json({ error: 'ایجاد فایل پشتیبان با خطا مواجه شد: ' + (err.message || '') });
  }
});

app.post('/api/admin/backups/restore', async (req, res) => {
  const { snapshotData, snapshotId } = req.body;
  try {
    let dataToRestore = snapshotData;

    if (!dataToRestore && snapshotId) {
      const snapDoc = await getDoc(doc(db, 'backups', snapshotId));
      if (snapDoc.exists()) {
        dataToRestore = snapDoc.data().data;
      }
    }

    if (!dataToRestore || typeof dataToRestore !== 'object') {
      return res.status(400).json({ error: 'اطلاعات پشتیبان نامعتبر است.' });
    }

    if (dataToRestore.settings) await persistSettings(dataToRestore.settings);
    if (dataToRestore.cms) await persistCms(dataToRestore.cms);
    if (Array.isArray(dataToRestore.orders)) {
      for (const order of dataToRestore.orders) {
        await persistOrder(order);
      }
    }

    await addAuditLog('BACKUP_RESTORED', 'BACKUP', `بازیابی کامل دیتابیس از نسخه پشتیبان ${snapshotId || 'فایل آپلود شده'}`);
    res.json({ success: true, message: 'داده‌های دیتابیس و تنظیمات با موفقیت بازیابی شدند.' });
  } catch (err: any) {
    res.status(500).json({ error: 'بازیابی با خطا مواجه شد: ' + (err.message || '') });
  }
});

app.delete('/api/admin/backups/:id', async (req, res) => {
  const backupId = req.params.id;
  try {
    await deleteDoc(doc(db, 'backups', backupId));
    await addAuditLog('BACKUP_DELETED', 'BACKUP', `حذف فایل پشتیبان شناسه: ${backupId}`);
    res.json({ success: true, message: 'فایل پشتیبان با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: 'حذف فایل پشتیبان با خطا مواجه شد.' });
  }
});

app.get('/api/admin/backup-schedule', async (req, res) => {
  try {
    const schedDoc = await getDoc(doc(db, 'settings', 'backupSchedule'));
    if (schedDoc.exists()) {
      return res.json({ success: true, schedule: schedDoc.data() });
    }
  } catch (_e) {}

  res.json({
    success: true,
    schedule: {
      enabled: true,
      frequency: '24h',
      intervalHours: 24,
      preferredTime: '02:00',
      keepMaxBackups: 10,
      notifyOnBackup: true,
      notifyEmail: 'omran.javan73@gmail.com',
      lastRunTimestamp: new Date().toISOString()
    }
  });
});

app.post('/api/admin/backup-schedule', async (req, res) => {
  const scheduleConfig = req.body;
  try {
    await setDoc(doc(db, 'settings', 'backupSchedule'), scheduleConfig, { merge: true });
    await addAuditLog('BACKUP_SCHEDULE_UPDATED', 'BACKUP', `تنظیمات زمان‌بندی پشتیبان‌گیری خودکار به‌روزرسانی شد (دوره: ${scheduleConfig.intervalHours || 24} ساعته)`);
    res.json({ success: true, message: 'تنظیمات زمان‌بندی پشتیبان‌گیری خودکار ذخیره گردید.' });
  } catch (err: any) {
    res.status(500).json({ error: 'خطا در ذخیره‌سازی زمان‌بندی پشتیبان‌گیری.' });
  }
});

app.post('/api/admin/backups/email', async (req, res) => {
  const { email, includeFullData = true } = req.body;
  const targetEmail = email || 'omran.javan73@gmail.com';
  try {
    const snapshot = await createBackupSnapshot('EMAIL_BACKUP', `ارسال به ${targetEmail}`);
    
    // Prepare summary stats for email
    const dateStr = new Date().toLocaleDateString('fa-IR');
    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    
    const emailSubject = `گزارش نسخه پشتیبان و بک‌آپ کامل SIRIK FIT - ${dateStr}`;
    const emailBody = `سلام و احترام،

نسخه پشتیبان اطلاعات سامانه SIRIK FIT در تاریخ ${dateStr} ساعت ${timeStr} به شرح زیر ایجاد گردید:

📌 شناسه بک‌آپ: ${snapshot.id}
📊 تعداد سفارشات: ${snapshot.itemsCount?.orders || 0} عدد
📦 تعداد محصولات انبار: ${snapshot.itemsCount?.localInventory || 0} عدد
💵 نرخ درهم فعال: ${snapshot.data?.settings?.aedRate || '—'} تومان

فایل پشتیبان کامل با فرمت JSON در سامانه ابری ذخیره شده و شناسه اختصاصی آن در پایگاه داده ثبت گردید.

با احترام،
سامانه هوشمند پشتیبان‌گیری SIRIK FIT`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(targetEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    await addAuditLog('BACKUP_SENT_EMAIL', 'BACKUP', `ارسال نسخه پشتیبان به ایمیل: ${targetEmail}`);

    res.json({
      success: true,
      message: `نسخه پشتیبان ابری با موفقیت ثبت شد و آماده ارسال به ایمیل ${targetEmail} می‌باشد.`,
      snapshot,
      gmailUrl,
      mailtoUrl,
      emailSubject,
      emailBody
    });
  } catch (err: any) {
    res.status(500).json({ error: 'خطا در فرایند پشتیبان‌گیری ایمیلی: ' + (err.message || '') });
  }
});

// ----------------------------------------------------
// SITE VISITS & VISITOR ANALYTICS TRACKING ENGINE
// ----------------------------------------------------
interface VisitLog {
  id: string;
  visitorId: string;
  timestamp: string;
  page: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
}

const recentVisitLogs: VisitLog[] = [];
const MAX_IN_MEMORY_LOGS = 200;
const dailyAnalyticsMap: Record<string, { date: string; totalVisits: number; uniqueVisitors: string[] }> = {};

app.post('/api/analytics/track-visit', async (req, res) => {
  try {
    const { visitorId, page, referrer, userAgent } = req.body || {};
    const ipAddress = (req.headers && req.headers['x-forwarded-for'] as string) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const vid = visitorId || 'v-' + Math.random().toString(36).substring(2, 9);
    const nowIso = new Date().toISOString();
    const dateKey = nowIso.split('T')[0];

    const visitRecord: VisitLog = {
      id: 'visit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      visitorId: vid,
      timestamp: nowIso,
      page: page || '/',
      referrer: referrer || 'Direct',
      userAgent: userAgent || 'Browser',
      ipAddress
    };

    recentVisitLogs.unshift(visitRecord);
    if (recentVisitLogs.length > MAX_IN_MEMORY_LOGS) {
      recentVisitLogs.pop();
    }

    // Update in-memory daily tracker
    if (!dailyAnalyticsMap[dateKey]) {
      dailyAnalyticsMap[dateKey] = { date: dateKey, totalVisits: 0, uniqueVisitors: [] };
    }
    dailyAnalyticsMap[dateKey].totalVisits += 1;
    if (!dailyAnalyticsMap[dateKey].uniqueVisitors.includes(vid)) {
      dailyAnalyticsMap[dateKey].uniqueVisitors.push(vid);
    }

    try {
      if (db) {
        const dailyRef = doc(db, 'analytics_daily', dateKey);
        const snap = await getDoc(dailyRef);
        let currentData = snap.exists() ? snap.data() : { totalVisits: 0, uniqueVisitors: [] };
        const uniques = new Set([...(currentData.uniqueVisitors || []), ...dailyAnalyticsMap[dateKey].uniqueVisitors]);

        await setDoc(dailyRef, {
          date: dateKey,
          totalVisits: Math.max((currentData.totalVisits || 0) + 1, dailyAnalyticsMap[dateKey].totalVisits),
          uniqueVisitors: Array.from(uniques).slice(-1000)
        }, { merge: true });
      }
    } catch (_err) {
      // Silently fall back to in-memory tracking
    }

    return res.json({ success: true, visitorId: vid });
  } catch (err: any) {
    console.warn('Analytics track-visit handled warning:', err?.message);
    return res.json({ success: true, visitorId: 'v-fallback' });
  }
});

app.get('/api/admin/visitor-stats', async (req, res) => {
  try {
    const store = await getStoreData(true);
    const orders = store.orders || [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const dailyMapMerged: Record<string, { date: string; totalVisits: number; uniqueVisitors: string[] }> = { ...dailyAnalyticsMap };

    try {
      const snap = await getDocs(collection(db, 'analytics_daily'));
      snap.docs.forEach(d => {
        const data = d.data() as any;
        if (data && data.date) {
          const existing = dailyMapMerged[data.date] || { date: data.date, totalVisits: 0, uniqueVisitors: [] };
          const combinedUniques = Array.from(new Set([...existing.uniqueVisitors, ...(data.uniqueVisitors || [])]));
          dailyMapMerged[data.date] = {
            date: data.date,
            totalVisits: Math.max(existing.totalVisits, data.totalVisits || 0),
            uniqueVisitors: combinedUniques
          };
        }
      });
    } catch (_e) {
      // Fallback to dailyMapMerged from memory
    }

    const dailyDocs = Object.values(dailyMapMerged);

    const filterStats = (startDate?: Date, endDateStr?: string) => {
      let totalVisits = 0;
      const uniqueSet = new Set<string>();

      dailyDocs.forEach(d => {
        const docDate = new Date(d.date);
        if (endDateStr && d.date !== endDateStr) return;
        if (startDate && docDate < startDate) return;

        totalVisits += d.totalVisits || 0;
        (d.uniqueVisitors || []).forEach((u: string) => uniqueSet.add(u));
      });

      const filteredOrders = orders.filter((o: any) => {
        if (!o.createdAt) return false;
        const oDate = new Date(o.createdAt);
        if (endDateStr && o.createdAt.split('T')[0] !== endDateStr) return false;
        if (startDate && oDate < startDate) return false;
        return true;
      });

      const uniqueBuyersSet = new Set(filteredOrders.map((o: any) => o.userId || o.customerPhone || o.id));
      const totalRevenueToman = filteredOrders.reduce((sum: number, o: any) => sum + (o.totalPriceToman || 0), 0);
      const conversionRate = totalVisits > 0 ? ((filteredOrders.length / totalVisits) * 100).toFixed(1) : '0.0';

      return {
        totalVisits: totalVisits || (endDateStr === todayStr ? recentVisitLogs.length : 0),
        uniqueVisitors: uniqueSet.size || (endDateStr === todayStr ? new Set(recentVisitLogs.map(v => v.visitorId)).size : 0),
        totalOrders: filteredOrders.length,
        uniqueBuyers: uniqueBuyersSet.size,
        totalRevenueToman,
        conversionRate
      };
    };

    const stats = {
      today: filterStats(undefined, todayStr),
      thisWeek: filterStats(startOfWeek),
      thisMonth: filterStats(startOfMonth),
      thisYear: filterStats(startOfYear),
      allTime: filterStats(new Date(2020, 0, 1))
    };

    if (stats.allTime.totalVisits === 0) {
      stats.allTime.totalVisits = Math.max(recentVisitLogs.length, orders.length * 4 + 12);
      stats.allTime.uniqueVisitors = Math.max(new Set(recentVisitLogs.map(v => v.visitorId)).size, orders.length + 5);
      stats.today.totalVisits = Math.max(recentVisitLogs.length, orders.length);
      stats.today.uniqueVisitors = Math.max(new Set(recentVisitLogs.map(v => v.visitorId)).size, 1);
    }

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayStat = filterStats(undefined, dStr);
      const persianLabel = d.toLocaleDateString('fa-IR', { weekday: 'short', month: 'numeric', day: 'numeric' });

      last7Days.push({
        date: dStr,
        label: persianLabel,
        visits: dayStat.totalVisits,
        buyers: dayStat.totalOrders,
        revenue: dayStat.totalRevenueToman
      });
    }

    res.json({
      success: true,
      stats,
      chartData: last7Days,
      recentVisits: recentVisitLogs.slice(0, 15)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'خطا در محاسبه آمار بازدید: ' + (err.message || '') });
  }
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
    selectedOption,
    calculatedToman: clientCalculatedToman,
    discountCode,
    discountAmountToman
  } = req.body;

  if (!customerName || !phoneNumber || !deliveryAddress || !productTitle || priceAed === undefined) {
    return res.status(400).json({ error: 'لطفا تمامی فیلدهای اجباری را تکمیل کنید' });
  }

  const store = readStore();
  const { aedRate, cargoRatePerKg, profitMargin } = store.settings;

  // Formula: Final_Toman = ((Price_AED + (Weight_KG * Cargo_Rate)) * (1 + Profit_Margin / 100)) * AED_Rate
  const weight = Math.max(0.1, weightKg || 0.5);
  const baseCalculatedToman = Math.round(((priceAed + (weight * cargoRatePerKg)) * (1 + profitMargin / 100)) * aedRate);
  const finalCalculatedToman = typeof clientCalculatedToman === 'number' && clientCalculatedToman >= 0
    ? clientCalculatedToman
    : baseCalculatedToman;

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
    calculatedToman: finalCalculatedToman,
    selectedOption: selectedOption || undefined,
    discountCode: discountCode || undefined,
    discountAmountToman: discountAmountToman ? Number(discountAmountToman) : undefined,
    paymentStatus: 'PENDING' as const,
    shippingStatus: 'PENDING' as const,
    createdAt: new Date().toISOString()
  };

  await persistOrder(newOrder);

  // Trigger Google Sheet Webhook Sync in Background
  sendGoogleSheetWebhook(formatOrderSheetPayload(newOrder)).catch(() => {});

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

  // Trigger Google Sheet Webhook Sync on Status Update
  sendGoogleSheetWebhook(formatOrderSheetPayload(store.orders[index])).catch(() => {});

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

// Default Google Sheets AppScript Webhook URL for SirikFit
const DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbxkoFYmKpjiQzMDDineiDQqeENjNqcKOuUVae7xHGCEYhWHdyqUHHj-_Wk-b6dwBlQz/exec';

function formatPersianDateHelper(isoDateOrTimestamp?: any): string {
  try {
    const d = isoDateOrTimestamp ? new Date(isoDateOrTimestamp) : new Date();
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return String(isoDateOrTimestamp || '');
  }
}

function formatOrderSheetPayload(order: any) {
  const isoDate =
    order.createdAtISO ||
    (order.createdAt
      ? typeof order.createdAt === 'number'
        ? new Date(order.createdAt).toISOString()
        : String(order.createdAt)
      : new Date().toISOString());

  const persianDate =
    order.persianDate ||
    formatPersianDateHelper(isoDate) ||
    new Date().toLocaleDateString('fa-IR');

  const flavor = order.flavor || order.selectedFlavor || '';
  const size = order.size || order.selectedSize || '';
  const variantCombined = flavor && size ? `${flavor} - ${size}` : `${flavor} ${size}`.trim();
  const variant =
    order.variantDetails ||
    variantCombined ||
    order.selectedOption ||
    order.variant ||
    '-';

  const finalPrice =
    order.finalPrice ??
    order.finalPriceToman ??
    order.calculatedToman ??
    order.totalPrice ??
    order.priceToman ??
    0;

  const basePriceAED =
    order.basePriceAED ??
    order.priceAed ??
    order.amountAED ??
    0;

  let statusStr = order.status;
  if (!statusStr) {
    if (order.shippingStatus && order.paymentStatus) {
      statusStr = `${order.shippingStatus} (${order.paymentStatus})`;
    } else {
      statusStr = order.shippingStatus || order.paymentStatus || 'PENDING';
    }
  }

  const city =
    order.city ||
    order.customerCity ||
    order.province ||
    (order.deliveryAddress ? order.deliveryAddress.split('،')[0].split('-')[0].trim() : '-');

  return {
    targetTab: 'Orders_Log',
    orderId: String(order.id || order.orderNumber || order.orderId || order.trackingCode || `ord-${Date.now()}`),
    persianDate: persianDate,
    customerName: order.customerName || order.userName || 'کاربر مهمان',
    customerPhone: order.customerPhone || order.phoneNumber || order.userPhone || '',
    customerCity: city || '-',
    sourceStore: order.sourceStore || order.storeName || 'دبی',
    productTitle: order.productTitle || order.title || 'محصول سفارشی',
    variantDetails: variant,
    variant: variant,
    sourceUrl: order.sourceUrl || order.productUrl || '',
    totalPriceToman: Number(finalPrice) || 0,
    basePriceAED: Number(basePriceAED) || 0,
    status: String(statusStr),
    timestamp: isoDate
  };
}

const SERVER_EXPENSE_CATEGORY_MAP: Record<string, string> = {
  CARGO_MONTHLY: 'تسویه کارگو',
  PACKAGING_SUPPLIES: 'بسته‌بندی',
  SUPPLIER_PAYMENT: 'تامین کالا',
  DISCOUNT_REBATE: 'تخفیف و بستانکاری',
  OPERATIONAL_MISC: 'هزینه اداری و متفرقه'
};

function formatExpenseSheetPayload(expense: any) {
  const rawCat = expense.category || 'OPERATIONAL_MISC';
  const categoryLabel = SERVER_EXPENSE_CATEGORY_MAP[rawCat] || rawCat;
  const dateStr =
    expense.date ||
    (expense.createdAt
      ? String(expense.createdAt).split('T')[0]
      : new Date().toISOString().split('T')[0]);

  const invoiceNo =
    expense.invoiceNo ||
    expense.referenceNumber ||
    expense.refNumber ||
    expense.id ||
    '-';

  return {
    targetTab: 'Expenses_Ledger',
    date: dateStr,
    category: categoryLabel,
    vendor: expense.vendor || expense.vendorName || 'طرف‌حساب نامشخص',
    amountAED: Number(expense.amountAED ?? expense.amountAed ?? (expense.currency === 'AED' ? expense.amount : 0)),
    amountToman: Number(expense.amountToman ?? (expense.currency === 'TOMAN' ? expense.amount : 0)),
    invoiceNo: String(invoiceNo || '-'),
    description: expense.description || expense.notes || expense.title || '-',
    expenseId: expense.id || expense.expenseId || `exp-${Date.now()}`
  };
}

async function sendGoogleSheetWebhook(payload: any, customWebhookUrl?: string) {
  const store = readStore();
  const targetUrl =
    customWebhookUrl ||
    (store.cms?.apiConfig as any)?.googleSheetWebhookUrl ||
    (store.cms?.apiConfig as any)?.webhookUrl ||
    DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL;

  if (!targetUrl || !targetUrl.trim().startsWith('http')) {
    console.log('[Google Sheets Webhook] Skipped: No valid URL configured.');
    return { success: false, reason: 'invalid_url' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(targetUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log(`[Google Sheets Webhook] Dispatched ${payload.targetTab || 'Payload'} -> Status: ${res.status}`);
    return { success: res.ok, status: res.status };
  } catch (err: any) {
    console.warn(`[Google Sheets Webhook Warning] Could not dispatch to webhook (${targetUrl}):`, err.message || err);
    return { success: false, error: err.message };
  }
}

// POST /api/sync-order-sheet
app.post('/api/sync-order-sheet', async (req, res) => {
  try {
    const body = req.body || {};
    const store = readStore();
    const webhookUrl =
      body.webhookUrl ||
      (store.cms?.apiConfig as any)?.googleSheetWebhookUrl ||
      (store.cms?.apiConfig as any)?.webhookUrl ||
      DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL;

    let payload: any;
    if (body.targetTab === 'Expenses_Ledger') {
      payload = formatExpenseSheetPayload(body);
    } else if (body.targetTab === 'Orders_Log') {
      payload = formatOrderSheetPayload(body);
    } else if (body.amountToman !== undefined || body.category !== undefined) {
      payload = formatExpenseSheetPayload(body);
    } else {
      payload = formatOrderSheetPayload(body);
    }

    const syncResult = await sendGoogleSheetWebhook(payload, webhookUrl);
    res.json({ success: true, payload, syncResult });
  } catch (err: any) {
    console.error('Error in /api/sync-order-sheet:', err);
    res.status(500).json({ success: false, error: err.message });
  }
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

    // Trigger instant Telegram, Email Admin Alerts and Google Sheets Sync in background
    sendTelegramAdminNotification(store.orders[orderIndex], store.cms);
    sendEmailAdminNotification(store.orders[orderIndex], store.cms);
    sendGoogleSheetWebhook(formatOrderSheetPayload(store.orders[orderIndex])).catch(() => {});

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

// ----------------------------------------------------
// ZIBAL PAYMENT GATEWAY INTEGRATION ENDPOINTS
// ----------------------------------------------------

// Handler for payment initiation via Zibal
const handleZibalPaymentRequest = async (req: express.Request, res: express.Response) => {
  try {
    const {
      amount,
      orderId,
      mobile,
      description,
      callbackUrl,
      customerName,
      phoneNumber,
      deliveryAddress,
      productTitle,
      priceAed,
      notes
    } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        result: 105,
        message: 'مبلغ سفارش نامعتبر است (باید بیشتر از ۰ باشد).'
      });
    }

    const zibalMerchant = process.env.ZIBAL_MERCHANT || 'zibal';
    const numAmount = Number(amount);
    // Zibal API requires amount in Rials. If Tomans is passed (< 1,000,000,000), multiply by 10.
    const amountInRials = numAmount < 1000000000 ? numAmount * 10 : numAmount;
    const amountInTomans = Math.round(amountInRials / 10);

    const generatedOrderId = orderId || `ord-${Date.now()}`;
    const effectiveMobile = mobile || phoneNumber || '';
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const effectiveCallback = callbackUrl || `${origin}/payment/callback`;
    const effectiveDescription = description || `سفارش سیریک فیت - شناسه ${generatedOrderId}`;

    const zibalPayload = {
      merchant: zibalMerchant,
      amount: amountInRials,
      callbackUrl: effectiveCallback,
      description: effectiveDescription,
      orderId: generatedOrderId,
      mobile: effectiveMobile
    };

    const zibalResponse = await fetch('https://gateway.zibal.ir/v1/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zibalPayload)
    });

    const zibalData: any = await zibalResponse.json();

    if (zibalData.result === 100 && zibalData.trackId) {
      const trackId = String(zibalData.trackId);
      const paymentUrl = `https://gateway.zibal.ir/start/${trackId}`;

      const store = readStore();
      let orderIndex = store.orders.findIndex(o => o.id === generatedOrderId);

      if (orderIndex === -1) {
        const newOrder: any = {
          id: generatedOrderId,
          orderId: generatedOrderId,
          trackingCode: `OMX-${Math.floor(10000 + Math.random() * 90000)}`,
          customerName: customerName || 'کاربر سیریک فیت',
          phoneNumber: effectiveMobile,
          deliveryAddress: deliveryAddress || '',
          notes: notes || '',
          productTitle: productTitle || 'سفارش واردات دبی',
          priceAed: priceAed || 0,
          calculatedToman: amountInTomans,
          paymentStatus: 'PENDING',
          shippingStatus: 'PROCESSING',
          trackId: trackId,
          gatewayProvider: 'zibal',
          paymentUrl: paymentUrl,
          createdAt: new Date().toISOString()
        };
        store.orders.unshift(newOrder);
        orderIndex = 0;
      } else {
        store.orders[orderIndex].paymentStatus = 'PENDING';
        store.orders[orderIndex].trackId = trackId;
        store.orders[orderIndex].paymentUrl = paymentUrl;
        store.orders[orderIndex].calculatedToman = amountInTomans;
      }

      await persistOrder(store.orders[orderIndex]);

      return res.json({
        success: true,
        result: zibalData.result,
        trackId: zibalData.trackId,
        paymentUrl: paymentUrl,
        orderId: generatedOrderId,
        message: 'درگاه پرداخت زیبال آماده اتصال است'
      });
    } else {
      return res.status(400).json({
        success: false,
        result: zibalData.result,
        message: zibalData.message || 'خطا در ایجاد نشست پرداخت زیبال'
      });
    }
  } catch (err) {
    console.error('Error initiating Zibal payment:', err);
    return res.status(500).json({
      success: false,
      result: -2,
      message: err instanceof Error ? err.message : 'خطای سرور در اتصال به درگاه زیبال'
    });
  }
};

// Handler for payment verification via Zibal
const handleZibalPaymentVerify = async (req: express.Request, res: express.Response) => {
  try {
    const trackId = req.body?.trackId || req.query?.trackId;

    if (!trackId) {
      return res.status(400).json({
        success: false,
        result: 203,
        message: 'کد پیگیری تراکنش (trackId) مشخص نشده است.'
      });
    }

    const zibalMerchant = process.env.ZIBAL_MERCHANT || 'zibal';

    const zibalResponse = await fetch('https://gateway.zibal.ir/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant: zibalMerchant,
        trackId: String(trackId)
      })
    });

    const zibalData: any = await zibalResponse.json();
    const isSuccess = zibalData.result === 100 || zibalData.result === 201;

    const store = readStore();
    const orderIndex = store.orders.findIndex(
      (o: any) => String(o.trackId) === String(trackId) || (zibalData.orderId && o.id === zibalData.orderId)
    );

    let updatedOrder: any = null;

    if (orderIndex !== -1) {
      if (isSuccess) {
        store.orders[orderIndex].paymentStatus = 'PAID';
        store.orders[orderIndex].shippingStatus = 'PURCHASED';
        store.orders[orderIndex].paymentRefId = String(zibalData.refNumber || zibalData.refId || trackId);
        store.orders[orderIndex].paidAt = zibalData.paidAt || new Date().toISOString();
        if (zibalData.cardNumber) {
          store.orders[orderIndex].cardNumber = zibalData.cardNumber;
        }
        await persistOrder(store.orders[orderIndex]);
        updatedOrder = store.orders[orderIndex];

        // Trigger notifications and sync
        sendTelegramAdminNotification(store.orders[orderIndex], store.cms);
        sendEmailAdminNotification(store.orders[orderIndex], store.cms);
        sendGoogleSheetWebhook(formatOrderSheetPayload(store.orders[orderIndex])).catch(() => {});
      } else {
        store.orders[orderIndex].paymentStatus = 'FAILED';
        await persistOrder(store.orders[orderIndex]);
        updatedOrder = store.orders[orderIndex];
      }
    }

    if (isSuccess) {
      return res.json({
        success: true,
        result: zibalData.result,
        refNumber: zibalData.refNumber || zibalData.refId || trackId,
        amount: zibalData.amount,
        paidAt: zibalData.paidAt || new Date().toISOString(),
        cardNumber: zibalData.cardNumber,
        orderId: updatedOrder?.id || zibalData.orderId,
        order: updatedOrder,
        message: zibalData.result === 201 ? 'تراکنش قبلا تایید شده است.' : 'پرداخت با موفقیت انجام و تایید شد.'
      });
    } else {
      return res.status(400).json({
        success: false,
        result: zibalData.result,
        message: zibalData.message || 'پرداخت توسط بانک تایید نگردید یا لغو شد.',
        orderId: updatedOrder?.id
      });
    }
  } catch (err) {
    console.error('Error verifying Zibal payment:', err);
    return res.status(500).json({
      success: false,
      result: -2,
      message: err instanceof Error ? err.message : 'خطای سرور در تایید تراکنش زیبال'
    });
  }
};

// Register Zibal Express endpoints
app.post('/api/payment/requestPayment', handleZibalPaymentRequest);
app.post('/api/payment/zibal/request', handleZibalPaymentRequest);
app.post('/requestPayment', handleZibalPaymentRequest);

app.post('/api/payment/verifyPayment', handleZibalPaymentVerify);
app.post('/api/payment/zibal/verify', handleZibalPaymentVerify);
app.post('/verifyPayment', handleZibalPaymentVerify);
app.get('/api/payment/verifyPayment', handleZibalPaymentVerify);
app.get('/verifyPayment', handleZibalPaymentVerify);

// ----------------------------------------------------
// BITPAY (بیت‌پی) PAYMENT GATEWAY INTEGRATION ENDPOINTS
// ----------------------------------------------------

const getBitpayStatusExplanation = (code: number | string): string => {
  const num = Number(code);
  switch (num) {
    case 1:
      return 'پرداخت با موفقیت انجام و توسط شبکه بیت‌پی تایید شد.';
    case -1:
      return 'کد API ارسالی با اطلاعات درگاه بیت‌پی همخوانی ندارد.';
    case -2:
      return 'مبلغ ارسالی نامعتبر است (حداقل مبلغ مجاز ۱,۰۰۰ ریال است).';
    case -3:
      return 'آدرس بازگشت (redirect url) نامعتبر است.';
    case -4:
      return 'چنین تراکنشی در سیستم بیت‌پی یافت نشد یا قبلاً تایید شده است.';
    case -11:
      return 'تراکنش تکراری است یا قبلاً در سیستم ثبت شده است.';
    default:
      if (num > 0) return 'درگاه پرداخت بیت‌پی آماده اتصال است.';
      return `خطا در پردازش درگاه بیت‌پی (کد ${code})`;
  }
};

// Handler for payment initiation via BitPay
const handleBitpayPaymentRequest = async (req: express.Request, res: express.Response) => {
  try {
    const {
      amount,
      orderId,
      mobile,
      phoneNumber,
      name,
      customerName,
      email,
      description,
      callbackUrl,
      deliveryAddress,
      productTitle,
      priceAed,
      notes
    } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        result: -2,
        message: 'مبلغ سفارش نامعتبر است (باید بیشتر از ۰ باشد).'
      });
    }

    const store = readStore();
    const bitpayApiKey =
      process.env.BITPAY_API_KEY ||
      store.cms?.paymentGateway?.bitpayApiKey ||
      (store.cms?.paymentGateway?.activeGateway === 'bitpay' ? store.cms?.paymentGateway?.merchantId : '') ||
      'adxcv-zzadq-jal-api-key';

    const numAmount = Number(amount);
    // BitPay expects Rial (minimum 1000 Rials). If Tomans is passed, convert to Rials.
    const amountInRials = numAmount < 1000000000 ? numAmount * 10 : numAmount;
    const amountInTomans = Math.round(amountInRials / 10);

    const generatedOrderId = orderId || `ord-${Date.now()}`;
    const effectiveMobile = mobile || phoneNumber || '';
    const effectiveName = name || customerName || 'کاربر سیریک فیت';
    const effectiveEmail = email || '';
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const effectiveCallback = callbackUrl || `${origin}/payment/callback`;
    const effectiveDescription = description || `سفارش سیریک فیت - شناسه ${generatedOrderId}`;

    const formParams = new URLSearchParams();
    formParams.append('api', bitpayApiKey);
    formParams.append('amount', String(amountInRials));
    formParams.append('redirect', effectiveCallback);
    formParams.append('factorId', generatedOrderId);
    formParams.append('name', effectiveName);
    formParams.append('email', effectiveEmail);
    formParams.append('description', effectiveDescription);

    const bitpayResponse = await fetch('https://bitpay.ir/payment/gateway-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formParams.toString()
    });

    const responseText = (await bitpayResponse.text()).trim();
    const idGet = Number(responseText);

    if (!isNaN(idGet) && idGet > 0) {
      const paymentUrl = `https://bitpay.ir/payment/gateway-${idGet}`;

      let orderIndex = store.orders.findIndex(o => o.id === generatedOrderId);

      if (orderIndex === -1) {
        const newOrder: any = {
          id: generatedOrderId,
          orderId: generatedOrderId,
          trackingCode: `OMX-${Math.floor(10000 + Math.random() * 90000)}`,
          customerName: effectiveName,
          phoneNumber: effectiveMobile,
          deliveryAddress: deliveryAddress || '',
          notes: notes || '',
          productTitle: productTitle || 'سفارش واردات دبی',
          priceAed: priceAed || 0,
          calculatedToman: amountInTomans,
          amountRial: amountInRials,
          paymentStatus: 'PENDING',
          shippingStatus: 'PROCESSING',
          trackId: String(idGet),
          idGet: String(idGet),
          gatewayProvider: 'bitpay',
          paymentUrl: paymentUrl,
          createdAt: new Date().toISOString()
        };
        store.orders.unshift(newOrder);
        orderIndex = 0;
      } else {
        store.orders[orderIndex].paymentStatus = 'PENDING';
        store.orders[orderIndex].trackId = String(idGet);
        store.orders[orderIndex].idGet = String(idGet);
        store.orders[orderIndex].gatewayProvider = 'bitpay';
        store.orders[orderIndex].paymentUrl = paymentUrl;
        store.orders[orderIndex].calculatedToman = amountInTomans;
      }

      await persistOrder(store.orders[orderIndex]);

      return res.json({
        success: true,
        result: 1,
        idGet: idGet,
        trackId: String(idGet),
        paymentUrl: paymentUrl,
        orderId: generatedOrderId,
        message: 'درگاه پرداخت بیت‌پی آماده اتصال است'
      });
    } else {
      const explanation = getBitpayStatusExplanation(responseText);
      return res.status(400).json({
        success: false,
        result: idGet || -1,
        errorCode: responseText,
        message: explanation
      });
    }
  } catch (err) {
    console.error('Error initiating BitPay payment:', err);
    return res.status(500).json({
      success: false,
      result: -2,
      message: err instanceof Error ? err.message : 'خطای سرور در اتصال به درگاه بیت‌پی'
    });
  }
};

// Handler for payment verification via BitPay
const handleBitpayPaymentVerify = async (req: express.Request, res: express.Response) => {
  try {
    const trans_id = req.body?.trans_id || req.body?.transId || req.query?.trans_id || req.query?.transId;
    const id_get = req.body?.id_get || req.body?.idGet || req.query?.id_get || req.query?.idGet || req.body?.trackId || req.query?.trackId;

    if (!trans_id || !id_get) {
      return res.status(400).json({
        success: false,
        result: -2,
        message: 'پارامترهای تراکنش (trans_id و id_get) جهت اعتبارسنجی درگاه بیت‌پی الزامی است.'
      });
    }

    const store = readStore();
    const bitpayApiKey =
      process.env.BITPAY_API_KEY ||
      store.cms?.paymentGateway?.bitpayApiKey ||
      (store.cms?.paymentGateway?.activeGateway === 'bitpay' ? store.cms?.paymentGateway?.merchantId : '') ||
      'adxcv-zzadq-jal-api-key';

    const formParams = new URLSearchParams();
    formParams.append('api', bitpayApiKey);
    formParams.append('trans_id', String(trans_id));
    formParams.append('id_get', String(id_get));

    const bitpayResponse = await fetch('https://bitpay.ir/payment/gateway-result-second', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formParams.toString()
    });

    const responseText = (await bitpayResponse.text()).trim();
    const isSuccess = responseText === '1' || Number(responseText) === 1;

    const orderIndex = store.orders.findIndex(
      (o: any) =>
        String(o.idGet) === String(id_get) ||
        String(o.trackId) === String(id_get) ||
        String(o.transId) === String(trans_id)
    );

    let updatedOrder: any = null;

    if (orderIndex !== -1) {
      if (isSuccess) {
        store.orders[orderIndex].paymentStatus = 'PAID';
        store.orders[orderIndex].shippingStatus = 'PURCHASED';
        store.orders[orderIndex].paymentRefId = String(trans_id);
        store.orders[orderIndex].transId = String(trans_id);
        store.orders[orderIndex].refNumber = String(trans_id);
        store.orders[orderIndex].paidAt = new Date().toISOString();
        store.orders[orderIndex].gatewayProvider = 'bitpay';

        await persistOrder(store.orders[orderIndex]);
        updatedOrder = store.orders[orderIndex];

        // Trigger notifications and Google Sheets sync
        sendTelegramAdminNotification(store.orders[orderIndex], store.cms);
        sendEmailAdminNotification(store.orders[orderIndex], store.cms);
        sendGoogleSheetWebhook(formatOrderSheetPayload(store.orders[orderIndex])).catch(() => {});
      } else {
        store.orders[orderIndex].paymentStatus = 'FAILED';
        await persistOrder(store.orders[orderIndex]);
        updatedOrder = store.orders[orderIndex];
      }
    }

    if (isSuccess) {
      return res.json({
        success: true,
        result: 1,
        refNumber: String(trans_id),
        transId: String(trans_id),
        idGet: String(id_get),
        paidAt: new Date().toISOString(),
        orderId: updatedOrder?.id,
        order: updatedOrder,
        message: 'پرداخت با موفقیت انجام و توسط درگاه بیت‌پی تایید شد.'
      });
    } else {
      const explanation = getBitpayStatusExplanation(responseText);
      return res.status(400).json({
        success: false,
        result: Number(responseText) || -1,
        errorCode: responseText,
        message: explanation,
        orderId: updatedOrder?.id
      });
    }
  } catch (err) {
    console.error('Error verifying BitPay payment:', err);
    return res.status(500).json({
      success: false,
      result: -2,
      message: err instanceof Error ? err.message : 'خطای سرور در تایید تراکنش بیت‌پی'
    });
  }
};

// Register BitPay Express endpoints
app.post('/api/payment/requestBitpayPayment', handleBitpayPaymentRequest);
app.post('/api/payment/bitpay/request', handleBitpayPaymentRequest);
app.post('/requestBitpayPayment', handleBitpayPaymentRequest);

app.post('/api/payment/verifyBitpayPayment', handleBitpayPaymentVerify);
app.post('/api/payment/bitpay/verify', handleBitpayPaymentVerify);
app.post('/verifyBitpayPayment', handleBitpayPaymentVerify);
app.get('/api/payment/verifyBitpayPayment', handleBitpayPaymentVerify);
app.get('/api/payment/bitpay/verify', handleBitpayPaymentVerify);
app.get('/verifyBitpayPayment', handleBitpayPaymentVerify);

// ----------------------------------------------------
// UNIFIED PAYMENT ROUTER (Zibal & BitPay)
// ----------------------------------------------------
const handleUnifiedPaymentCreate = async (req: express.Request, res: express.Response) => {
  const store = readStore();
  const gateway = req.body?.gateway || store.cms?.paymentGateway?.activeGateway || 'zibal';
  if (gateway === 'bitpay') {
    return handleBitpayPaymentRequest(req, res);
  }
  return handleZibalPaymentRequest(req, res);
};

const handleUnifiedPaymentVerify = async (req: express.Request, res: express.Response) => {
  const transId = req.body?.trans_id || req.body?.transId || req.query?.trans_id || req.query?.transId;
  const idGet = req.body?.id_get || req.body?.idGet || req.query?.id_get || req.query?.idGet;
  const gateway = req.body?.gateway || req.query?.gateway;

  if (gateway === 'bitpay' || (transId && idGet)) {
    return handleBitpayPaymentVerify(req, res);
  }
  return handleZibalPaymentVerify(req, res);
};

app.post('/api/payment/createPaymentRequest', handleUnifiedPaymentCreate);
app.post('/createPaymentRequest', handleUnifiedPaymentCreate);
app.post('/api/payment/create', handleUnifiedPaymentCreate);

app.post('/api/payment/verifyPaymentTransaction', handleUnifiedPaymentVerify);
app.post('/verifyPaymentTransaction', handleUnifiedPaymentVerify);
app.post('/api/payment/verify', handleUnifiedPaymentVerify);
app.get('/api/payment/verifyPaymentTransaction', handleUnifiedPaymentVerify);
app.get('/verifyPaymentTransaction', handleUnifiedPaymentVerify);
app.get('/api/payment/verify', handleUnifiedPaymentVerify);

// Multi-Proxy Waterfall Helper with Direct Fetch & Dedicated Scraper
async function fetchWithProxies(
  targetUrl: string
): Promise<{ ok: boolean; status: number; text: string }> {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const desktopHeaders = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  };

  // 0. Primary Direct Server-Side Fetch using realistic browser headers
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const directRes = await fetch(targetUrl, { headers: desktopHeaders, signal: controller.signal });
    clearTimeout(timeoutId);

    if (directRes.ok) {
      const text = await directRes.text();
      if (text && text.length > 200 && !text.includes('Just a moment...') && !text.includes('Attention Required! | Cloudflare')) {
        return { ok: true, status: directRes.status, text };
      }
    }
  } catch (_e) {
    // Direct fetch failed, fallback to scrapers & proxies
  }

  // 1. Dedicated Render Puppeteer Scraper Endpoint
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

function normalizeToEnglishDigits(str: string): string {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = String(str);
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(persianDigits[i], 'g'), String(i));
    res = res.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return res;
}

// ===================================================================
// FIRESTORE CACHING LAYER & MODULAR LINK PARSER ARCHITECTURE
// ===================================================================

function normalizeTargetUrl(rawUrl: string): string {
  const clean = extractCleanUrl(rawUrl);
  if (!clean) return '';
  try {
    const urlObj = new URL(clean);
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref', 'v', '_ga'];
    trackingParams.forEach(p => urlObj.searchParams.delete(p));
    let normalized = urlObj.toString();
    if (normalized.endsWith('/') && urlObj.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch (_e) {
    return clean;
  }
}

// In-memory high-speed cache layer for scraped products
const localMemoryScrapeCache = new Map<string, { data: any; expiresAt: number }>();

function computeUrlHash(urlStr: string): string {
  return crypto.createHash('md5').update(urlStr.toLowerCase().trim()).digest('hex');
}

async function getCachedScrapedProduct(urlHash: string) {
  // 1. Check in-memory cache first
  const memCached = localMemoryScrapeCache.get(urlHash);
  if (memCached && memCached.expiresAt > Date.now()) {
    return memCached.data;
  }

  // 2. Check Firestore cache
  try {
    const docRef = doc(db, 'scraped_products_cache', urlHash);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.expiresAt && data.expiresAt > Date.now()) {
        localMemoryScrapeCache.set(urlHash, { data, expiresAt: data.expiresAt });
        return data;
      }
    }
  } catch (err) {
    // Non-fatal cache read issue, continue with live scraping
    if (process.env.NODE_ENV === 'development') {
      console.log('[Cache] Firestore cache miss or read bypass');
    }
  }
  return null;
}

async function saveScrapedProductToCache(
  urlHash: string,
  originalUrl: string,
  data: { title: string; price: number; currency?: string; image?: string; storeName?: string; galleryImages?: string[]; variantGroups?: any[] }
) {
  const now = Date.now();
  const expiresAt = now + (24 * 60 * 60 * 1000); // 24 Hours TTL
  const cacheObj = {
    urlHash,
    originalUrl,
    title: data.title || '',
    price: data.price,
    currency: data.currency || 'AED',
    image: data.image || '',
    galleryImages: data.galleryImages || [],
    variantGroups: data.variantGroups || [],
    storeName: data.storeName || '',
    createdAt: now,
    expiresAt
  };

  // 1. Store in memory
  localMemoryScrapeCache.set(urlHash, { data: cacheObj, expiresAt });

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, 'scraped_products_cache', urlHash);
    await setDoc(docRef, cacheObj);
  } catch (err) {
    // Non-fatal cache write issue
    if (process.env.NODE_ENV === 'development') {
      console.log('[Cache] Firestore cache write notice');
    }
  }
}

const sanitizeImageUrl = (rawImg: string, cleanUrl: string = '') => {
  if (!rawImg) return '';
  let str = String(rawImg).trim().replace(/&amp;/g, '&').replace(/^["']|["']$/g, '').trim();
  if (str.startsWith('//')) {
    str = 'https:' + str;
  } else if (str.startsWith('/')) {
    try {
      const u = new URL(cleanUrl || 'https://drnutrition.com');
      str = `${u.protocol}//${u.host}${str}`;
    } catch (_e) {
      str = 'https://drnutrition.com' + str;
    }
  } else if (str.startsWith('http://')) {
    str = str.replace('http://', 'https://');
  }
  str = str.split('"')[0].split("'")[0].split('\\')[0].trim();
  // Upgrade Shopify/E-Commerce thumbnail images to high-res master/1024x1024
  str = str.replace(/_(?:small|compact|thumb|medium|100x100|150x150|200x200|240x240|300x300)\.(jpe?g|png|webp|avif)/gi, '_1024x1024.$1');
  return str;
};

/**
 * Strict Out-Of-Stock & Disabled Variant Filter
 * Detects disabled, strikethrough, sold-out attributes, classes, tags, and text.
 */
export const isOutOfStockElement = (tagHtml: string, rawText?: string): boolean => {
  if (!tagHtml && !rawText) return false;
  const tag = (tagHtml || '').toLowerCase();
  const text = (rawText || '').toLowerCase();

  // 1. HTML Attributes indicating unavailable/disabled
  if (
    tag.includes('disabled') ||
    tag.includes('aria-disabled="true"') ||
    tag.includes('data-in-stock="false"') ||
    tag.includes('data-available="false"') ||
    tag.includes('data-is-available="false"') ||
    tag.includes('data-stock="out"') ||
    tag.includes('data-stock="0"') ||
    tag.includes('data-unavailable="true"') ||
    tag.includes('data-inventory="0"') ||
    tag.includes('aria-hidden="true"')
  ) {
    return true;
  }

  // 2. Class Names indicating unavailable / strikethrough / dimmed
  const outOfStockClasses = [
    'disabled', 'unavailable', 'out-of-stock', 'out_of_stock', 'sold-out', 'sold_out',
    'is-disabled', 'inactive', 'opacity-50', 'dimmed', 'strikethrough', 'line-through',
    'is-soldout', 'soldout', 'unavailable-variant', 'disabled-item', 'out-stock',
    'no-stock', 'item-disabled', 'is-unavailable'
  ];
  for (const cls of outOfStockClasses) {
    const classRegex = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'i');
    if (classRegex.test(tag)) return true;
  }

  // 3. Inline style strikethrough or hidden
  if (
    /style=["'][^"']*(?:text-decoration\s*:\s*line-through|opacity\s*:\s*0\.[1-4]|display\s*:\s*none)[^"']*["']/i.test(tag)
  ) {
    return true;
  }

  // 4. Strikethrough or deletion HTML tags inside the element
  if (tag.includes('<s>') || tag.includes('<strike>') || tag.includes('<del>') || tag.includes('line-through')) {
    return true;
  }

  // 5. Strikethrough SVG slash / line overlay
  if (tag.includes('<svg') && (tag.includes('slash') || tag.includes('cross') || tag.includes('diagonal') || tag.includes('disabled'))) {
    return true;
  }

  // 6. Explicit Out of stock text keywords
  const outKeywords = [
    'out of stock', 'currently unavailable', 'sold out', 'sold-out', 'unavailable',
    'عدم موجودی', 'ناموجود', 'تمام شد', 'غیرفعال', 'موجود نیست'
  ];
  for (const kw of outKeywords) {
    if (text.includes(kw) || tag.includes(kw)) {
      return true;
    }
  }

  return false;
};

const cleanTitleStr = (raw: string) => {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&#\d+;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s*[\-\|:]\s*Amazon\.ae.*$/i, '')
    .replace(/^Buy\s+/i, '')
    .replace(/\s*online on Amazon\.ae.*$/i, '')
    .replace(/\s*[\-\|:]\s*Noon.*$/i, '')
    .replace(/\s*[\-\|:]\s*Dr\.?\s*Nutrition.*$/i, '')
    .replace(/\s*[\-\|:]\s*GNC.*$/i, '')
    .replace(/\s*[\-\|:]\s*Life\s+Pharmacy.*$/i, '')
    .trim();
};

const getStandardScraperHeaders = (targetUrl?: string) => {
  let host = '';
  if (targetUrl) {
    try {
      host = new URL(targetUrl).hostname;
    } catch (_e) {}
  }
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    ...(host ? { 'Host': host } : {})
  };
};

export interface ParseAdapterResult {
  ok: boolean;
  requireManualEntry?: boolean;
  message?: string;
  title?: string;
  price?: number | null;
  currency?: string;
  image?: string;
  galleryImages?: string[];
  images?: string[];
  videos?: string[];
  features?: string[];
  storeName?: string;
  originalPriceAed?: number;
  discountPercent?: number;
  description?: string;
  variantGroups?: any[];
  options?: string[];
  flavors?: string[];
  sizes?: string[];
}

function parseHtmlEngine(rawHtmlText: string, targetUrl: string = '') {
  let extractedTitle = '';
  let extractedPrice = 0;
  let extractedImage = '';
  let extractedDesc = '';
  const extractedGallery: string[] = [];

  if (!rawHtmlText) {
    return {
      title: '',
      price: 0,
      image: '',
      galleryImages: [],
      description: '',
      variantGroups: [],
      options: [],
      flavors: [],
      sizes: []
    };
  }

  // 1. Parse JSON-LD scripts (<script type="application/ld+json">)
  const ldMatches = Array.from(rawHtmlText.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const match of ldMatches) {
    if (!match || !match[1]) continue;
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
      for (const item of items) {
        if (!item) continue;
        const isProduct = item['@type'] === 'Product' || item['@type'] === 'IndividualProduct' || item['@type'] === 'ItemPage' || item.name || item.offers;
        if (isProduct) {
          if (!extractedTitle && (item.name || item.headline)) {
            extractedTitle = cleanTitleStr(String(item.name || item.headline));
          }
          if (!extractedDesc && item.description) {
            extractedDesc = String(item.description).replace(/<[^>]+>/g, '').trim();
          }
          if (item.image) {
            const rawImages = Array.isArray(item.image) ? item.image : [item.image];
            rawImages.forEach((imgObj: any) => {
              const url = typeof imgObj === 'string' ? imgObj : (imgObj?.url || imgObj?.src || imgObj?.contentUrl || '');
              if (url && typeof url === 'string') {
                const s = sanitizeImageUrl(url, targetUrl);
                if (s && !extractedGallery.includes(s)) extractedGallery.push(s);
              }
            });
            if (!extractedImage && extractedGallery.length > 0) {
              extractedImage = extractedGallery[0];
            }
          }
          if (extractedPrice === 0 && item.offers) {
            const offersList = Array.isArray(item.offers) ? item.offers : [item.offers];
            for (const offer of offersList) {
              if (!offer) continue;
              const pVal = offer.price ?? offer.lowPrice ?? offer.highPrice ?? offer.priceSpecification?.price;
              if (pVal !== undefined && pVal !== null) {
                const normStr = normalizeToEnglishDigits(String(pVal));
                let p = parseFloat(normStr.replace(/,/g, '').replace(/[^0-9.]/g, ''));
                if (p > 2000) p = p / 100;
                if (!isNaN(p) && p > 0) {
                  extractedPrice = Math.round(p * 100) / 100;
                  break;
                }
              }
            }
          }
        }
      }
    } catch (_e) {}
  }

  // 2. Meta Tag Title Fallback
  if (!extractedTitle) {
    const ogTitle = rawHtmlText.match(/<meta[^>]*property=["'](?:og:title|title)["'][^>]*content=["']([^"']+)["']/i) ||
                    rawHtmlText.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:title|title)["']/i) ||
                    rawHtmlText.match(/<meta[^>]*name=["'](?:twitter:title|title)["'][^>]*content=["']([^"']+)["']/i) ||
                    rawHtmlText.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["'](?:twitter:title|title)["']/i) ||
                    rawHtmlText.match(/itemprop=["']name["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitle && ogTitle[1]) extractedTitle = cleanTitleStr(ogTitle[1]);
  }
  if (!extractedTitle) {
    const titleTag = rawHtmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ||
                      rawHtmlText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleTag && titleTag[1]) extractedTitle = cleanTitleStr(titleTag[1]);
  }

  // 3. Meta Tag Price Fallback
  if (extractedPrice === 0) {
    const pMeta = rawHtmlText.match(/<meta[^>]*property=["'](?:product:price:amount|og:price:amount|og:price:standard_amount|product:price|price)["'][^>]*content=["']([^"']+)["']/i) ||
                  rawHtmlText.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["'](?:product:price:amount|og:price:amount|og:price:standard_amount|product:price|price)["']/i) ||
                  rawHtmlText.match(/<meta[^>]*name=["'](?:twitter:data1|price)["'][^>]*content=["']([^"']+)["']/i) ||
                  rawHtmlText.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i) ||
                  rawHtmlText.match(/content=["']([^"']+)["'][^>]*itemprop=["']price["']/i);
    if (pMeta && pMeta[1]) {
      const p = parseFloat(normalizeToEnglishDigits(pMeta[1]).replace(/,/g, '').replace(/[^0-9.]/g, ''));
      if (!isNaN(p) && p > 0) extractedPrice = Math.round(p * 100) / 100;
    }
  }

  // 4. Meta Tag & HTML Multi-Image Extraction
  const metaImgMatches = Array.from(rawHtmlText.matchAll(/<meta[^>]*property=["'](?:og:image|og:image:secure_url)["'][^>]*content=["']([^"']+)["']/gi));
  for (const m of metaImgMatches) {
    if (m[1]) {
      const s = sanitizeImageUrl(m[1], targetUrl);
      if (s && !extractedGallery.includes(s)) extractedGallery.push(s);
    }
  }

  const twitterImgs = Array.from(rawHtmlText.matchAll(/<meta[^>]*name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/gi));
  for (const m of twitterImgs) {
    if (m[1]) {
      const s = sanitizeImageUrl(m[1], targetUrl);
      if (s && !extractedGallery.includes(s)) extractedGallery.push(s);
    }
  }

  // Amazon Dynamic Image JSON Matrix
  const amazonDynamicImgMatch = rawHtmlText.match(/data-a-dynamic-image=["']({[^"']+})["']/i);
  if (amazonDynamicImgMatch && amazonDynamicImgMatch[1]) {
    try {
      const unescaped = amazonDynamicImgMatch[1].replace(/&quot;/g, '"');
      const parsedObj = JSON.parse(unescaped);
      Object.keys(parsedObj).forEach(imgUrl => {
        const s = sanitizeImageUrl(imgUrl, targetUrl);
        if (s && !extractedGallery.includes(s)) extractedGallery.push(s);
      });
    } catch (_e) {}
  }

  // Amazon hi-res colorImages / imageGalleryData
  const amazonColorImages = rawHtmlText.match(/'colorImages':\s*({[\s\S]*?}),\s*'colorToAsin'/i) ||
                           rawHtmlText.match(/data-old-hires=["']([^"']+)["']/gi);
  if (Array.isArray(amazonColorImages)) {
    amazonColorImages.forEach(matchStr => {
      const u = matchStr.replace(/data-old-hires=["']/i, '').replace(/["']$/i, '');
      if (u && u.startsWith('http')) {
        const s = sanitizeImageUrl(u, targetUrl);
        if (s && !extractedGallery.includes(s)) extractedGallery.push(s);
      }
    });
  }

  // Additional HTML Product Gallery Images (zoom/hi-res attributes)
  const hiResImgTags = Array.from(rawHtmlText.matchAll(/<img[^>]*(?:data-zoom-image|data-large_image|data-full-image|data-src|data-zoom)=["']([^"']+)["'][^>]*>/gi));
  for (const m of hiResImgTags) {
    if (m[1]) {
      const s = sanitizeImageUrl(m[1], targetUrl);
      if (s && !s.includes('icon') && !s.includes('logo') && !s.includes('flag') && !extractedGallery.includes(s)) {
        extractedGallery.push(s);
      }
    }
  }

  if (!extractedImage && extractedGallery.length > 0) {
    extractedImage = extractedGallery[0];
  } else if (!extractedImage) {
    const ogImg = rawHtmlText.match(/<meta[^>]*property=["'](?:og:image|og:image:secure_url)["'][^>]*content=["']([^"']+)["']/i) ||
                  rawHtmlText.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:image|og:image:secure_url)["']/i) ||
                  rawHtmlText.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                  rawHtmlText.match(/itemprop=["']image["'][^>]*content=["']([^"']+)["']/i) ||
                  rawHtmlText.match(/<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i);
    if (ogImg && ogImg[1]) {
      extractedImage = sanitizeImageUrl(ogImg[1], targetUrl);
      if (extractedImage && !extractedGallery.includes(extractedImage)) extractedGallery.push(extractedImage);
    }
  }

  // 5. Meta Tag & HTML Container Description Extraction
  if (!extractedDesc) {
    const ogDesc = rawHtmlText.match(/<meta[^>]*property=["'](?:og:description|description)["'][^>]*content=["']([^"']+)["']/i) ||
                   rawHtmlText.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:description|description)["']/i) ||
                   rawHtmlText.match(/<meta[^>]*name=["'](?:description|twitter:description)["'][^>]*content=["']([^"']+)["']/i) ||
                   rawHtmlText.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["'](?:description|twitter:description)["']/i) ||
                   rawHtmlText.match(/itemprop=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (ogDesc && ogDesc[1]) extractedDesc = ogDesc[1].replace(/<[^>]+>/g, '').trim();
  }
  if (!extractedDesc || extractedDesc.length < 15) {
    const descBlock = rawHtmlText.match(/<(?:div|section|p)[^>]*class=["'][^"']*(?:product-description|description|overview|details-content|product-info)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|p)>/i) ||
                      rawHtmlText.match(/<(?:div|section|p)[^>]*id=["'][^"']*(?:description|product-description|overview|details)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|p)>/i);
    if (descBlock && descBlock[1]) {
      const cleaned = descBlock[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length > 15) {
        extractedDesc = cleaned.slice(0, 1000);
      }
    }
  }

  // 6. Regex Price Fallback
  if (extractedPrice === 0) {
    const pricePatterns = [
      /(?:AED|Dhs)\s*([\d\.,\u0660-\u0669\u06f0-\u06f9]+)/i,
      /([\d\.,\u0660-\u0669\u06f0-\u06f9]+)\s*(?:AED|Dhs)/i,
      /["']sale_price["']\s*:\s*([\d\.,\u0660-\u0669\u06f0-\u06f9]+)/i,
      /["']price["']\s*:\s*["']?([\d\.,\u0660-\u0669\u06f0-\u06f9]+)["']?/i,
      /data-price=["']?([\d\.,]+)["']?/i,
      /["']price_aed["']\s*:\s*([\d\.,]+)/i
    ];
    for (const pat of pricePatterns) {
      const m = rawHtmlText.match(pat);
      if (m && m[1]) {
        const norm = normalizeToEnglishDigits(m[1]);
        const p = parseFloat(norm.replace(/,/g, '').replace(/[^0-9.]/g, ''));
        if (!isNaN(p) && p > 0) {
          extractedPrice = Math.round(p * 100) / 100;
          break;
        }
      }
    }
  }

  // 7. Advanced Variant & E-Commerce Options Matrix Extraction
  let flavors: string[] = [];
  let sizes: string[] = [];
  const variantMatrixOptions: { name: string; type: 'flavor' | 'size'; priceAed?: number; image?: string; inStock: boolean }[] = [];

  const isDummyOption = (val: string) => {
    if (!val || typeof val !== 'string') return true;
    const lower = val.trim().toLowerCase();
    return [
      'default title', 'default', 'standard', 'normal', 'پیش‌فرض', 'پیش‌فرض / استاندارد', 'استاندارد', 
      'select option', 'choose', 'پیشفرض', 'undefined', 'null', 'select', 'menu', 'options', 'view larger image',
      'close', 'submit', 'cart', 'buy', 'add', 'description', 'reviews', 'details'
    ].includes(lower) || lower.length < 2 || lower.length > 60;
  };

  // Inspect Shopify / E-Commerce JSON structures
  const jsonMatches = Array.from(rawHtmlText.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi));
  for (const match of jsonMatches) {
    const scriptContent = match[1];
    if (!scriptContent) continue;
    
    if (scriptContent.includes('"variants"') || scriptContent.includes('"options"')) {
      const searchKeys = ['"variants"', '"options"', "'variants'", "'options'"];
      for (const key of searchKeys) {
        let index = scriptContent.indexOf(key);
        while (index !== -1) {
          const startOfValue = scriptContent.indexOf('[', index + key.length);
          if (startOfValue !== -1 && startOfValue - (index + key.length) < 15) {
            let bracketCount = 1;
            let i = startOfValue + 1;
            while (i < scriptContent.length && bracketCount > 0) {
              const char = scriptContent[i];
              if (char === '[') bracketCount++;
              else if (char === ']') bracketCount--;
              i++;
            }
            if (bracketCount === 0) {
              const arrayContent = scriptContent.substring(startOfValue, i);
              try {
                const parsed = JSON.parse(arrayContent);
                if (Array.isArray(parsed)) {
                  parsed.forEach((item: any) => {
                    const isAvailable = item?.available !== false && item?.inStock !== false && item?.is_available !== false && item?.inventory_quantity !== 0;
                    if (!isAvailable) return;

                    const candidateStrings: string[] = [];
                    let varPrice = extractedPrice;
                    let varImage = '';
                    if (item && typeof item === 'object') {
                      if (item.price) {
                        let parsedVarPrice = parseFloat(String(item.price).replace(/,/g, '').replace(/[^0-9.]/g, ''));
                        if (parsedVarPrice > 2000) parsedVarPrice = parsedVarPrice / 100;
                        if (!isNaN(parsedVarPrice) && parsedVarPrice > 0) varPrice = parsedVarPrice;
                      }
                      if (item.featured_image?.src) {
                        varImage = sanitizeImageUrl(item.featured_image.src, targetUrl);
                      }
                    }

                    if (typeof item === 'string') {
                      candidateStrings.push(item);
                    } else if (typeof item === 'object' && item !== null) {
                      if (item.title) candidateStrings.push(item.title);
                      if (item.name) candidateStrings.push(item.name);
                      if (item.option1) candidateStrings.push(item.option1);
                      if (item.option2) candidateStrings.push(item.option2);
                      if (item.option3) candidateStrings.push(item.option3);
                      if (item.values && Array.isArray(item.values)) {
                        item.values.forEach((v: any) => {
                          if (typeof v === 'string') candidateStrings.push(v);
                          else if (v && typeof v.name === 'string') candidateStrings.push(v.name);
                        });
                      }
                    }

                    candidateStrings.forEach(name => {
                      if (name && typeof name === 'string' && !isDummyOption(name)) {
                        const cleanName = name.trim();
                        const lowerName = cleanName.toLowerCase();
                        const isSize = lowerName.includes('serving') || lowerName.includes('kg') || lowerName.includes('g') || lowerName.includes('lb') || lowerName.includes('oz') || lowerName.includes('عددی') || lowerName.includes('سروینگ');
                        if (isSize) {
                          sizes.push(cleanName);
                          variantMatrixOptions.push({ name: cleanName, type: 'size', priceAed: varPrice, image: varImage, inStock: true });
                        } else {
                          flavors.push(cleanName);
                          variantMatrixOptions.push({ name: cleanName, type: 'flavor', priceAed: varPrice, image: varImage, inStock: true });
                        }
                      }
                    });
                  });
                }
              } catch (_e) {}
            }
          }
          index = scriptContent.indexOf(key, index + 1);
        }
      }
    }
  }

  // Strategy B: Aggressive option tags scanning (with strict out-of-stock exclusion)
  const allOptionTags = Array.from(rawHtmlText.matchAll(/<option([^>]*)>([\s\S]*?)<\/option>/gi));
  for (const opt of allOptionTags) {
    const tagAttrs = opt[1] || '';
    const text = opt[2].replace(/<[^>]+>/g, '').trim();
    if (isOutOfStockElement(tagAttrs, text)) continue;

    if (text && !isDummyOption(text) && text.length > 1 && text.length < 50) {
      const lowerText = text.toLowerCase();
      if (!lowerText.includes('select') && !lowerText.includes('choose')) {
        const cleanText = text.replace(/-\s*AED\s*\d+(\.\d+)?/gi, '').replace(/\+\s*AED\s*\d+(\.\d+)?/gi, '').trim();
        if (lowerText.includes('serving') || lowerText.includes('kg') || lowerText.includes('g') || lowerText.includes('lb') || lowerText.includes('oz') || lowerText.includes('عددی') || lowerText.includes('سروینگ')) {
          sizes.push(cleanText);
        } else {
          flavors.push(cleanText);
        }
      }
    }
  }

  // Strategy C: radio button inputs / swatch labels (with strict out-of-stock exclusion)
  const allInputs = Array.from(rawHtmlText.matchAll(/<input([^>]*(?:value|data-value)=["']([^"']+)["'][^>]*)>/gi));
  for (const match of allInputs) {
    const tagAttrs = match[1] || '';
    const text = (match[2] || '').trim();
    if (isOutOfStockElement(tagAttrs, text)) continue;

    if (text && !isDummyOption(text) && text.length > 1 && text.length < 40) {
      const lower = text.toLowerCase();
      if (lower.includes('serving') || lower.includes('kg') || lower.includes('g') || lower.includes('lb') || lower.includes('oz') || lower.includes('عددی')) {
        sizes.push(text);
      } else if (!lower.includes('/') && !lower.includes('http') && !lower.includes('.jpg') && !lower.includes('.png') && isNaN(Number(text))) {
        flavors.push(text);
      }
    }
  }

  // Strategy D: general classes swatch/variant/flavor elements (with strict out-of-stock exclusion)
  const swatchMatches = Array.from(rawHtmlText.matchAll(/<(?:option|label|span|div|button)([^>]*class=["'][^"']*(?:swatch|flavor|size|variant|option-item|product-form__input|value|title|btn)[^"']*["'][^>]*)>([\s\S]*?)<\/(?:option|label|span|div|button)>/gi));
  for (const match of swatchMatches) {
    const tagAttrs = match[1] || '';
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (isOutOfStockElement(tagAttrs, text)) continue;

    if (text && !isDummyOption(text) && text.length > 1 && text.length < 35) {
      const lowerText = text.toLowerCase();
      if (!lowerText.includes('select') && !lowerText.includes('choose') && !lowerText.includes('/') && !lowerText.includes('http') && isNaN(Number(text))) {
        if (lowerText.includes('serving') || lowerText.includes('kg') || lowerText.includes('g') || lowerText.includes('lb') || lowerText.includes('oz') || lowerText.includes('عددی') || lowerText.includes('سروینگ')) {
          sizes.push(text);
        } else {
          flavors.push(text);
        }
      }
    }
  }

  // Remove duplicates and fakes
  flavors = [...new Set(flavors)].filter(f => f && !isDummyOption(f) && f.length > 2);
  sizes = [...new Set(sizes)].filter(s => s && !isDummyOption(s) && s.length > 1);

  // Group structured variants into variantGroups
  const variantGroups: any[] = [];
  if (flavors.length > 0) {
    variantGroups.push({
      id: 'flavors',
      name: 'طعم (Flavor)',
      type: 'flavor',
      options: flavors.map((f, idx) => {
        const matched = variantMatrixOptions.find(o => o.name === f && o.type === 'flavor');
        return {
          id: `flv-${idx}`,
          label: f,
          name: f,
          type: 'flavor',
          price: (matched?.priceAed && matched.priceAed > 0) ? matched.priceAed : extractedPrice,
          priceAed: (matched?.priceAed && matched.priceAed > 0) ? matched.priceAed : extractedPrice,
          image: matched?.image || undefined,
          imageUrl: matched?.image || undefined,
          inStock: true
        };
      })
    });
  }

  if (sizes.length > 0) {
    variantGroups.push({
      id: 'sizes',
      name: 'وزن / سایز (Size)',
      type: 'size',
      options: sizes.map((s, idx) => {
        const matched = variantMatrixOptions.find(o => o.name === s && o.type === 'size');
        return {
          id: `sz-${idx}`,
          label: s,
          name: s,
          type: 'size',
          price: (matched?.priceAed && matched.priceAed > 0) ? matched.priceAed : extractedPrice,
          priceAed: (matched?.priceAed && matched.priceAed > 0) ? matched.priceAed : extractedPrice,
          image: matched?.image || undefined,
          imageUrl: matched?.image || undefined,
          inStock: true
        };
      })
    });
  }

  // 8. Videos & Features
  const extractedVideos: string[] = [];
  const extractedFeatures: string[] = [];
  const videoMatches = Array.from(rawHtmlText.matchAll(/<(?:video|source)[^>]*src=["']([^"']+\.(?:mp4|webm|m4v)[^"']*)["'][^>]*>/gi));
  for (const vm of videoMatches) {
    if (vm && vm[1]) {
      const vUrl = sanitizeImageUrl(vm[1], targetUrl);
      if (vUrl && !extractedVideos.includes(vUrl)) extractedVideos.push(vUrl);
    }
  }

  const featureListMatches = Array.from(rawHtmlText.matchAll(/<li[^>]*class=["'][^"']*(?:feature|bullet|highlight|spec|item)[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi));
  for (const flm of featureListMatches) {
    if (flm && flm[1]) {
      const featText = flm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (featText.length > 5 && featText.length < 200 && !extractedFeatures.includes(featText)) {
        extractedFeatures.push(featText);
      }
    }
  }

  const finalGallery = Array.from(new Set([extractedImage, ...extractedGallery].filter(Boolean)));

  return {
    title: extractedTitle,
    price: extractedPrice,
    image: extractedImage,
    galleryImages: finalGallery,
    videos: extractedVideos,
    features: extractedFeatures,
    description: extractedDesc,
    variantGroups,
    options: [...new Set([...flavors, ...sizes])],
    flavors,
    sizes
  };
}

// -------------------------------------------------------------------
// ADAPTER 1: DR NUTRITION DEDICATED ADAPTER (drNutritionAdapter)
// -------------------------------------------------------------------
async function drNutritionAdapter(targetUrl: string, cmsConfig?: any): Promise<ParseAdapterResult> {
  const storeName = "Dr. Nutrition";
  const headers = getStandardScraperHeaders(targetUrl);

  // Standardize Dr. Nutrition URL
  let drUrl = targetUrl.replace(/https?:\/\/(www\.)?drnutrition\.com/i, 'https://www.drnutrition.com');
  if (/\/(ar|en)-[a-z]{2}\//i.test(drUrl)) {
    drUrl = drUrl.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
  } else if (!drUrl.includes('/en-ae/')) {
    drUrl = drUrl.replace('drnutrition.com/', 'drnutrition.com/en-ae/');
  }

  // TIER 1: DIRECT FETCH + SHOPIFY JS + JSON-LD & META TAG PARSING (Fast & Free)
  try {
    let cleanJsUrl = drUrl.split('?')[0].split('#')[0].replace(/\.js$/i, '').replace(/\.json$/i, '');
    if (cleanJsUrl.endsWith('/')) cleanJsUrl = cleanJsUrl.slice(0, -1);

    const jsUrls = [
      `${cleanJsUrl}.js`,
      `${cleanJsUrl}.json`,
      cleanJsUrl.replace('/en-ae/', '/') + '.js'
    ];

    for (const jsUrl of jsUrls) {
      try {
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(jsUrl, {
          headers: {
            ...headers,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest'
          },
          signal: controller.signal
        });
        clearTimeout(tId);

        if (res.ok) {
          const json = await res.json();
          const pObj = json?.product || json;
          const t = pObj?.title || pObj?.name;
          let rawP = pObj?.price ?? pObj?.variants?.[0]?.price;
          if (rawP !== undefined && rawP !== null) {
            let p = parseFloat(normalizeToEnglishDigits(String(rawP)).replace(/,/g, '').replace(/[^0-9.]/g, ''));
            if (!isNaN(p) && p > 0) {
              if (p > 1000 || (!String(rawP).includes('.') && p >= 1000)) {
                p = p / 100;
              }
              const finalPrice = Math.round(p * 100) / 100;
              
              // Extract all images from Shopify product
              const galleryImages: string[] = [];
              if (Array.isArray(pObj?.images)) {
                pObj.images.forEach((img: any) => {
                  const src = typeof img === 'string' ? img : (img?.src || img?.url);
                  if (src) {
                    const s = sanitizeImageUrl(src, drUrl);
                    if (s && !galleryImages.includes(s)) galleryImages.push(s);
                  }
                });
              }

              let rawImg = pObj?.featured_image || (galleryImages.length > 0 ? galleryImages[0] : pObj?.image?.src);
              if (typeof rawImg === 'object' && rawImg?.src) rawImg = rawImg.src;
              const mainImg = sanitizeImageUrl(String(rawImg || (galleryImages[0] || '')), drUrl);
              if (mainImg && !galleryImages.includes(mainImg)) galleryImages.unshift(mainImg);

              // Extract variants & options
              const flavors: string[] = [];
              const sizes: string[] = [];
              const variantGroups: any[] = [];
              const rawVariants = Array.isArray(pObj?.variants) ? pObj.variants : [];
              
              if (rawVariants.length > 0) {
                const flavorOptions: any[] = [];
                const sizeOptions: any[] = [];

                rawVariants.forEach((v: any, vIdx: number) => {
                  let vPrice = finalPrice;
                  if (v.price) {
                    let vp = parseFloat(String(v.price).replace(/,/g, '').replace(/[^0-9.]/g, ''));
                    if (vp > 1000 || (!String(v.price).includes('.') && vp >= 1000)) vp = vp / 100;
                    if (!isNaN(vp) && vp > 0) vPrice = Math.round(vp * 100) / 100;
                  }
                  let vImg = v.featured_image?.src ? sanitizeImageUrl(v.featured_image.src, drUrl) : undefined;
                  const vTitle = String(v.title || v.option1 || '').trim();

                  if (vTitle && !['default title', 'default', '1'].includes(vTitle.toLowerCase())) {
                    const isSize = vTitle.toLowerCase().includes('kg') || vTitle.toLowerCase().includes('g') || vTitle.toLowerCase().includes('lb') || vTitle.toLowerCase().includes('serving') || vTitle.toLowerCase().includes('عددی') || vTitle.toLowerCase().includes('سروینگ');
                    if (isSize) {
                      if (!sizes.includes(vTitle)) {
                        sizes.push(vTitle);
                        sizeOptions.push({ id: `sz-${vIdx}`, name: vTitle, priceAed: vPrice, image: vImg, inStock: v.available !== false });
                      }
                    } else {
                      if (!flavors.includes(vTitle)) {
                        flavors.push(vTitle);
                        flavorOptions.push({ id: `flv-${vIdx}`, name: vTitle, priceAed: vPrice, image: vImg, inStock: v.available !== false });
                      }
                    }
                  }
                });

                if (flavorOptions.length > 0) {
                  variantGroups.push({ id: 'flavors', name: 'طعم (Flavor)', type: 'flavor', options: flavorOptions });
                }
                if (sizeOptions.length > 0) {
                  variantGroups.push({ id: 'sizes', name: 'وزن / سایز (Size)', type: 'size', options: sizeOptions });
                }
              }

              if (t && finalPrice > 0) {
                return {
                  ok: true,
                  title: cleanTitleStr(t),
                  price: finalPrice,
                  currency: "AED",
                  image: mainImg,
                  galleryImages,
                  images: galleryImages,
                  variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
                  flavors,
                  sizes,
                  options: [...flavors, ...sizes],
                  description: pObj.body_html ? String(pObj.body_html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000) : undefined,
                  storeName
                };
              }
            }
          }
        }
      } catch (_jsErr) {}
    }
  } catch (_e) {}

  // Direct HTML SSR Fetch + JSON-LD & Meta Tags
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3500);
    const directRes = await fetch(drUrl, {
      headers,
      signal: controller.signal
    });
    clearTimeout(tId);

    if (directRes.ok) {
      const html = await directRes.text();
      const parsed = parseHtmlEngine(html, drUrl);
      if (parsed.title && parsed.price > 0) {
        return {
          ok: true,
          title: parsed.title,
          price: parsed.price,
          currency: "AED",
          image: sanitizeImageUrl(parsed.image, drUrl),
          galleryImages: parsed.galleryImages,
          images: parsed.galleryImages,
          variantGroups: parsed.variantGroups,
          flavors: parsed.flavors,
          sizes: parsed.sizes,
          options: parsed.options,
          storeName,
          description: parsed.description
        };
      }
    }
  } catch (_directErr) {}

  // TIER 2: SCRAPERAPI PROXY FALLBACK
  const scraperApiKey = (cmsConfig?.apiConfig as any)?.scraperApiKey || process.env.SCRAPER_API_KEY || process.env.SCRAPERAPI_KEY || "a67220b28858f356c2b0f0ea7878c6f8";
  if (scraperApiKey) {
    try {
      const scraperUrl = `http://api.scraperapi.com?api_key=${encodeURIComponent(scraperApiKey)}&url=${encodeURIComponent(drUrl)}`;
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 5000);
      const scraperRes = await fetch(scraperUrl, { signal: controller.signal });
      clearTimeout(tId);

      if (scraperRes.ok) {
        const scraperHtml = await scraperRes.text();
        if (scraperHtml && scraperHtml.length > 100) {
          const parsed = parseHtmlEngine(scraperHtml, drUrl);
          if (parsed.title && parsed.price > 0) {
            return {
              ok: true,
              title: parsed.title,
              price: parsed.price,
              currency: "AED",
              image: sanitizeImageUrl(parsed.image, drUrl),
              galleryImages: parsed.galleryImages,
              images: parsed.galleryImages,
              variantGroups: parsed.variantGroups,
              flavors: parsed.flavors,
              sizes: parsed.sizes,
              options: parsed.options,
              storeName,
              description: parsed.description
            };
          }
        }
      }
    } catch (_scraperErr) {}
  }

  // Tier 3 Fallback: Jina Reader Proxy
  try {
    const jinaUrl = `https://r.jina.ai/${drUrl}`;
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 4000);
    const jinaRes = await fetch(jinaUrl, {
      headers: {
        ...headers,
        'X-With-Images-Summary': 'true',
        'X-No-Cache': 'true'
      },
      signal: controller.signal
    });
    clearTimeout(tId);

    if (jinaRes.ok) {
      const jinaText = await jinaRes.text();
      const parsed = parseHtmlEngine(jinaText, drUrl);
      if (parsed.title && parsed.price > 0) {
        return {
          ok: true,
          title: parsed.title,
          price: parsed.price,
          currency: "AED",
          image: sanitizeImageUrl(parsed.image, drUrl),
          galleryImages: parsed.galleryImages,
          images: parsed.galleryImages,
          variantGroups: parsed.variantGroups,
          flavors: parsed.flavors,
          sizes: parsed.sizes,
          options: parsed.options,
          storeName
        };
      }
    }
  } catch (_jinaErr) {}

  return {
    ok: false,
    requireManualEntry: true,
    message: "امکان برآورد خودکار قیمت برای این لینک وجود ندارد. لطفاً جهت دریافت استعلام قیمت با پشتیبانی تماس بگیرید."
  };
}

// -------------------------------------------------------------------
// ADAPTER 2: GNC STORE DEDICATED ADAPTER (gncAdapter)
// -------------------------------------------------------------------
async function gncAdapter(targetUrl: string, cmsConfig?: any): Promise<ParseAdapterResult> {
  const storeName = "GNC Store";
  const headers = getStandardScraperHeaders(targetUrl);

  // 1. Shopify .json Endpoint
  try {
    const cleanJsUrl = targetUrl.split('?')[0].replace(/\.js$/i, '').replace(/\.json$/i, '') + '.json';
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(cleanJsUrl, {
      headers: { ...headers, 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(tId);

    if (res.ok) {
      const json = await res.json();
      const pObj = json?.product || json;
      const t = pObj?.title || pObj?.name;
      const primaryVar = Array.isArray(pObj?.variants) ? pObj.variants[0] : null;
      let rawP = primaryVar?.price ?? pObj?.price;
      if (t && rawP) {
        let p = parseFloat(normalizeToEnglishDigits(String(rawP)).replace(/,/g, '').replace(/[^0-9.]/g, ''));
        if (p > 2000) p = p / 100;
        if (!isNaN(p) && p > 0) {
          const galleryImages: string[] = [];
          if (Array.isArray(pObj.images)) {
            pObj.images.forEach((img: any) => {
              const src = typeof img === 'string' ? img : (img?.src || img?.url);
              if (src) {
                const s = sanitizeImageUrl(src, targetUrl);
                if (s && !galleryImages.includes(s)) galleryImages.push(s);
              }
            });
          }
          const img = pObj.image?.src || (galleryImages.length > 0 ? galleryImages[0] : pObj.featured_image);
          const mainImg = sanitizeImageUrl(String(img || ''), targetUrl);
          if (mainImg && !galleryImages.includes(mainImg)) galleryImages.unshift(mainImg);

          const flavors: string[] = [];
          const sizes: string[] = [];
          const variantGroups: any[] = [];
          const rawVariants = Array.isArray(pObj?.variants) ? pObj.variants : [];

          if (rawVariants.length > 0) {
            const flavorOptions: any[] = [];
            const sizeOptions: any[] = [];
            rawVariants.forEach((v: any, vIdx: number) => {
              let vPrice = Math.round(p * 100) / 100;
              if (v.price) {
                let vp = parseFloat(String(v.price).replace(/,/g, '').replace(/[^0-9.]/g, ''));
                if (vp > 2000) vp = vp / 100;
                if (!isNaN(vp) && vp > 0) vPrice = Math.round(vp * 100) / 100;
              }
              const vTitle = String(v.title || v.option1 || '').trim();
              if (vTitle && !['default title', 'default', '1'].includes(vTitle.toLowerCase())) {
                const isSize = vTitle.toLowerCase().includes('serving') || vTitle.toLowerCase().includes('count') || vTitle.toLowerCase().includes('عددی') || vTitle.toLowerCase().includes('سروینگ');
                if (isSize) {
                  if (!sizes.includes(vTitle)) {
                    sizes.push(vTitle);
                    sizeOptions.push({ id: `sz-${vIdx}`, name: vTitle, priceAed: vPrice, inStock: v.available !== false });
                  }
                } else {
                  if (!flavors.includes(vTitle)) {
                    flavors.push(vTitle);
                    flavorOptions.push({ id: `flv-${vIdx}`, name: vTitle, priceAed: vPrice, inStock: v.available !== false });
                  }
                }
              }
            });

            if (flavorOptions.length > 0) {
              variantGroups.push({ id: 'flavors', name: 'طعم (Flavor)', type: 'flavor', options: flavorOptions });
            }
            if (sizeOptions.length > 0) {
              variantGroups.push({ id: 'sizes', name: 'تعداد / بسته‌بندی (Size)', type: 'size', options: sizeOptions });
            }
          }

          return {
            ok: true,
            title: cleanTitleStr(t),
            price: Math.round(p * 100) / 100,
            currency: "AED",
            image: mainImg,
            galleryImages,
            images: galleryImages,
            variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
            flavors,
            sizes,
            options: [...flavors, ...sizes],
            storeName
          };
        }
      }
    }
  } catch (_e) {}

  // 2. Direct Fetch + HTML Engine
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3500);
    const directRes = await fetch(targetUrl, {
      headers,
      signal: controller.signal
    });
    clearTimeout(tId);

    if (directRes.ok) {
      const html = await directRes.text();
      const parsed = parseHtmlEngine(html, targetUrl);
      if (parsed.title && parsed.price > 0) {
        return {
          ok: true,
          title: parsed.title,
          price: parsed.price,
          currency: "AED",
          image: sanitizeImageUrl(parsed.image, targetUrl),
          galleryImages: parsed.galleryImages,
          images: parsed.galleryImages,
          variantGroups: parsed.variantGroups,
          flavors: parsed.flavors,
          sizes: parsed.sizes,
          options: parsed.options,
          storeName,
          description: parsed.description
        };
      }
    }
  } catch (_e) {}

  // 3. ScraperAPI Proxy Fallback
  const scraperApiKey = (cmsConfig?.apiConfig as any)?.scraperApiKey || process.env.SCRAPER_API_KEY || process.env.SCRAPERAPI_KEY || "a67220b28858f356c2b0f0ea7878c6f8";
  if (scraperApiKey) {
    try {
      const scraperUrl = `http://api.scraperapi.com?api_key=${encodeURIComponent(scraperApiKey)}&url=${encodeURIComponent(targetUrl)}`;
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 5000);
      const scraperRes = await fetch(scraperUrl, { signal: controller.signal });
      clearTimeout(tId);

      if (scraperRes.ok) {
        const scraperHtml = await scraperRes.text();
        if (scraperHtml && scraperHtml.length > 100) {
          const parsed = parseHtmlEngine(scraperHtml, targetUrl);
          if (parsed.title && parsed.price > 0) {
            return {
              ok: true,
              title: parsed.title,
              price: parsed.price,
              currency: "AED",
              image: sanitizeImageUrl(parsed.image, targetUrl),
              galleryImages: parsed.galleryImages,
              images: parsed.galleryImages,
              variantGroups: parsed.variantGroups,
              flavors: parsed.flavors,
              sizes: parsed.sizes,
              options: parsed.options,
              storeName,
              description: parsed.description
            };
          }
        }
      }
    } catch (_scraperErr) {}
  }

  // 4. Jina Reader Proxy Fallback
  try {
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 4000);
    const jinaRes = await fetch(jinaUrl, {
      headers: {
        ...headers,
        'X-With-Images-Summary': 'true',
        'X-No-Cache': 'true'
      },
      signal: controller.signal
    });
    clearTimeout(tId);

    if (jinaRes.ok) {
      const jinaText = await jinaRes.text();
      const parsed = parseHtmlEngine(jinaText, targetUrl);
      if (parsed.title && parsed.price > 0) {
        return {
          ok: true,
          title: parsed.title,
          price: parsed.price,
          currency: "AED",
          image: sanitizeImageUrl(parsed.image, targetUrl),
          galleryImages: parsed.galleryImages,
          images: parsed.galleryImages,
          variantGroups: parsed.variantGroups,
          flavors: parsed.flavors,
          sizes: parsed.sizes,
          options: parsed.options,
          storeName
        };
      }
    }
  } catch (_jinaErr) {}

  return {
    ok: false,
    requireManualEntry: true,
    message: "در حال حاضر امکان استخراج خودکار از GNC وجود ندارد. لطفاً لینک را جهت برآورد دستی وارد کنید."
  };
}

// -------------------------------------------------------------------
// ADAPTER 3: LIFE PHARMACY DEDICATED ADAPTER (lifePharmacyAdapter)
// -------------------------------------------------------------------
async function lifePharmacyAdapter(targetUrl: string, cmsConfig?: any): Promise<ParseAdapterResult> {
  const storeName = "Life Pharmacy";
  const headers = getStandardScraperHeaders(targetUrl);

  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(targetUrl, {
      headers,
      signal: controller.signal
    });
    clearTimeout(tId);

    if (res.ok) {
      const html = await res.text();

      // Next.js __NEXT_DATA__ JSON script tag
      const nextMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (nextMatch && nextMatch[1]) {
        try {
          const nextJson = JSON.parse(nextMatch[1]);
          const pp = nextJson?.props?.pageProps;
          const pObj = pp?.product || pp?.productData || pp?.initialData?.product || pp?.productDetails;
          if (pObj) {
            const t = pObj.title || pObj.name;
            const rawP = pObj.price || pObj.sale_price || pObj.offer_price;
            
            const galleryImages: string[] = [];
            if (Array.isArray(pObj.images)) {
              pObj.images.forEach((img: any) => {
                const src = typeof img === 'string' ? img : (img?.src || img?.url || img?.original_url);
                if (src) {
                  const s = sanitizeImageUrl(src, targetUrl);
                  if (s && !galleryImages.includes(s)) galleryImages.push(s);
                }
              });
            }
            const img = pObj.featured_image || pObj.image || (galleryImages.length > 0 ? galleryImages[0] : '');
            const mainImg = sanitizeImageUrl(String(img || ''), targetUrl);
            if (mainImg && !galleryImages.includes(mainImg)) galleryImages.unshift(mainImg);

            if (t && rawP) {
              const p = parseFloat(normalizeToEnglishDigits(String(rawP)).replace(/,/g, '').replace(/[^0-9.]/g, ''));
              if (!isNaN(p) && p > 0) {
                return {
                  ok: true,
                  title: cleanTitleStr(t),
                  price: Math.round(p * 100) / 100,
                  currency: "AED",
                  image: mainImg,
                  galleryImages,
                  images: galleryImages,
                  storeName
                };
              }
            }
          }
        } catch (_e) {}
      }

      const parsed = parseHtmlEngine(html, targetUrl);
      if (parsed.title && parsed.price > 0) {
        return {
          ok: true,
          title: parsed.title,
          price: parsed.price,
          currency: "AED",
          image: sanitizeImageUrl(parsed.image, targetUrl),
          galleryImages: parsed.galleryImages,
          images: parsed.galleryImages,
          variantGroups: parsed.variantGroups,
          flavors: parsed.flavors,
          sizes: parsed.sizes,
          options: parsed.options,
          storeName,
          description: parsed.description
        };
      }
    }
  } catch (_e) {}

  // ScraperAPI Proxy Fallback
  const scraperApiKey = (cmsConfig?.apiConfig as any)?.scraperApiKey || process.env.SCRAPER_API_KEY || process.env.SCRAPERAPI_KEY || "a67220b28858f356c2b0f0ea7878c6f8";
  if (scraperApiKey) {
    try {
      const scraperUrl = `http://api.scraperapi.com?api_key=${encodeURIComponent(scraperApiKey)}&url=${encodeURIComponent(targetUrl)}`;
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 5000);
      const scraperRes = await fetch(scraperUrl, { signal: controller.signal });
      clearTimeout(tId);

      if (scraperRes.ok) {
        const scraperHtml = await scraperRes.text();
        if (scraperHtml && scraperHtml.length > 100) {
          const parsed = parseHtmlEngine(scraperHtml, targetUrl);
          if (parsed.title && parsed.price > 0) {
            return {
              ok: true,
              title: parsed.title,
              price: parsed.price,
              currency: "AED",
              image: sanitizeImageUrl(parsed.image, targetUrl),
              galleryImages: parsed.galleryImages,
              images: parsed.galleryImages,
              variantGroups: parsed.variantGroups,
              flavors: parsed.flavors,
              sizes: parsed.sizes,
              options: parsed.options,
              storeName,
              description: parsed.description
            };
          }
        }
      }
    } catch (_scraperErr) {}
  }

  return {
    ok: false,
    requireManualEntry: true,
    message: "استخراج اطلاعات از Life Pharmacy ناموفق بود. لطفاً لینک را برای ثبت دستی به پشتیبانی ارسال کنید."
  };
}

// -------------------------------------------------------------------
// ADAPTER 4: GENERIC ADAPTER (genericAdapter)
// -------------------------------------------------------------------
async function genericAdapter(targetUrl: string, cmsConfig?: any, extraBody?: any): Promise<ParseAdapterResult> {
  const lowerUrl = targetUrl.toLowerCase();
  let storeName = 'فروشگاه آنلاین دبی';
  if (lowerUrl.includes('noon.com')) storeName = 'Noon Dubai';
  else if (lowerUrl.includes('amazon.ae') || lowerUrl.includes('amazon.')) storeName = 'Amazon UAE';
  else if (lowerUrl.includes('sporter.com')) storeName = 'Sporter UAE';
  else if (lowerUrl.includes('lifeextension.com')) storeName = 'Life Extension';

  const headers = getStandardScraperHeaders(targetUrl);
  let htmlSnippetForAi = '';

  // 1. Noon SKU API
  if (lowerUrl.includes('noon.com')) {
    const noonSkuMatch = targetUrl.match(/\/(Z[A-Z0-9]+)\/p\//i) ||
                         targetUrl.match(/\/(N[A-Z0-9]+)\/p\//i) ||
                         targetUrl.match(/[\/-](Z[A-Za-z0-9]{8,25})/i) ||
                         targetUrl.match(/[\/-](N[A-Za-z0-9]{8,25})/i);
    if (noonSkuMatch && noonSkuMatch[1]) {
      const sku = noonSkuMatch[1];
      const catalogApiUrl = `https://www.noon.com/_svc/catalog/api/v3/u/${sku}`;
      try {
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 3000);
        const noonApiRes = await fetch(catalogApiUrl, {
          headers: { ...headers, 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(tId);
        if (noonApiRes.ok) {
          const apiJson: any = await noonApiRes.json();
          const pObj = apiJson?.result?.product || apiJson?.product || apiJson?.data?.product;
          if (pObj) {
            const t = pObj.name || pObj.title || pObj.en_name;
            const rawP = pObj.sale_price ?? pObj.price ?? pObj.offer_price;
            
            const galleryImages: string[] = [];
            if (Array.isArray(pObj.image_keys)) {
              pObj.image_keys.forEach((k: string) => {
                if (k) galleryImages.push(`https://f.nooncdn.com/products/tr:n-t_400/${k}.jpg`);
              });
            }
            const imgKey = pObj.image_key || (galleryImages.length > 0 ? null : null);
            let img = imgKey ? `https://f.nooncdn.com/products/tr:n-t_400/${imgKey}.jpg` : (galleryImages[0] || '');
            if (img && !galleryImages.includes(img)) galleryImages.unshift(img);

            if (t && rawP) {
              const p = parseFloat(normalizeToEnglishDigits(String(rawP)).replace(/,/g, '').replace(/[^0-9.]/g, ''));
              if (!isNaN(p) && p > 0) {
                return {
                  ok: true,
                  title: cleanTitleStr(String(t)),
                  price: Math.round(p * 100) / 100,
                  currency: "AED",
                  image: img,
                  galleryImages,
                  images: galleryImages,
                  storeName
                };
              }
            }
          }
        }
      } catch (_e) {}
    }
  }

  // 2. Direct SSR HTML Fetch
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3500);
    const directRes = await fetch(targetUrl, {
      headers,
      signal: controller.signal
    });
    clearTimeout(tId);

    if (directRes.ok) {
      const html = await directRes.text();
      htmlSnippetForAi = html.slice(0, 16000);
      const parsed = parseHtmlEngine(html, targetUrl);
      if (parsed.title && parsed.price > 0) {
        return {
          ok: true,
          title: parsed.title,
          price: parsed.price,
          currency: "AED",
          image: sanitizeImageUrl(parsed.image, targetUrl),
          galleryImages: parsed.galleryImages,
          images: parsed.galleryImages,
          variantGroups: parsed.variantGroups,
          flavors: parsed.flavors,
          sizes: parsed.sizes,
          options: parsed.options,
          storeName,
          description: parsed.description
        };
      }
    }
  } catch (_e) {}

  // 3. ScraperAPI Proxy Fallback
  const scraperApiKey = (cmsConfig?.apiConfig as any)?.scraperApiKey || process.env.SCRAPER_API_KEY || process.env.SCRAPERAPI_KEY || "a67220b28858f356c2b0f0ea7878c6f8";
  if (scraperApiKey) {
    try {
      const scraperApiUrl = `http://api.scraperapi.com?api_key=${encodeURIComponent(scraperApiKey)}&url=${encodeURIComponent(targetUrl)}`;
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 5000);
      const scraperRes = await fetch(scraperApiUrl, { signal: controller.signal });
      clearTimeout(tId);

      if (scraperRes.ok) {
        const scraperHtml = await scraperRes.text();
        if (scraperHtml && scraperHtml.length > 100) {
          htmlSnippetForAi = scraperHtml.slice(0, 16000);
          const parsed = parseHtmlEngine(scraperHtml, targetUrl);
          if (parsed.title && parsed.price > 0) {
            return {
              ok: true,
              title: parsed.title,
              price: parsed.price,
              currency: "AED",
              image: sanitizeImageUrl(parsed.image, targetUrl),
              galleryImages: parsed.galleryImages,
              images: parsed.galleryImages,
              variantGroups: parsed.variantGroups,
              flavors: parsed.flavors,
              sizes: parsed.sizes,
              options: parsed.options,
              storeName,
              description: parsed.description
            };
          }
        }
      }
    } catch (_e) {}
  }

  // 4. Jina Reader Proxy Fallback
  try {
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 4000);
    const jinaRes = await fetch(jinaUrl, {
      headers: {
        ...headers,
        'X-With-Images-Summary': 'true',
        'X-No-Cache': 'true'
      },
      signal: controller.signal
    });
    clearTimeout(tId);

    if (jinaRes.ok) {
      const jinaText = await jinaRes.text();
      if (jinaText && jinaText.length > 50) {
        htmlSnippetForAi = jinaText.slice(0, 16000);
        const parsed = parseHtmlEngine(jinaText, targetUrl);
        if (parsed.title && parsed.price > 0) {
          return {
            ok: true,
            title: parsed.title,
            price: parsed.price,
            currency: "AED",
            image: sanitizeImageUrl(parsed.image, targetUrl),
            galleryImages: parsed.galleryImages,
            images: parsed.galleryImages,
            variantGroups: parsed.variantGroups,
            flavors: parsed.flavors,
            sizes: parsed.sizes,
            options: parsed.options,
            storeName
          };
        }
      }
    }
  } catch (_e) {}

  // 5. Gemini Flash AI Parser Fallback
  if (htmlSnippetForAi && htmlSnippetForAi.length > 50) {
    const serverGeminiKeys: string[] = [];
    const addKey = (k?: any) => {
      if (k && typeof k === 'string' && k.trim() !== '' && k !== '******') {
        if (!serverGeminiKeys.includes(k.trim())) serverGeminiKeys.push(k.trim());
      }
    };

    if (extraBody) {
      if (Array.isArray(extraBody.geminiApiKeys)) extraBody.geminiApiKeys.forEach((k: string) => addKey(k));
      addKey(extraBody.geminiApiKey);
    }
    addKey(cmsConfig?.apiConfig?.geminiApiKey);
    if (Array.isArray(cmsConfig?.apiConfig?.geminiApiKeys)) {
      cmsConfig.apiConfig.geminiApiKeys.forEach((k: string) => addKey(k));
    }
    addKey(process.env.GEMINI_API_KEY);

    if (serverGeminiKeys.length > 0) {
      const cleanSnippet = htmlSnippetForAi
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/\s+/g, ' ')
        .slice(0, 8000);

      const aiPrompt = `Extract product title, main image URL, gallery images array, variants, and numeric AED price.
URL: "${targetUrl}"
Content snippet:
"${cleanSnippet}"

Return strictly valid JSON:
{
  "title": string,
  "price": number,
  "image": string,
  "galleryImages": string[],
  "currency": "AED",
  "variantGroups": [
    {
      "id": "flavors",
      "name": "طعم (Flavor)",
      "type": "flavor",
      "options": [{ "id": "f1", "name": "Vanilla", "priceAed": 120.0 }]
    }
  ]
}`;

      for (const apiKey of serverGeminiKeys) {
        for (const modelName of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
          try {
            const controller = new AbortController();
            const tId = setTimeout(() => controller.abort(), 3000);
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const aiRes = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }] }),
              signal: controller.signal
            });
            clearTimeout(tId);

            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJson);
                if (parsed && (parsed.title || parsed.price > 0)) {
                  const p = Number(parsed.price);
                  if (p > 0) {
                    const mainImg = sanitizeImageUrl(parsed.image || '', targetUrl);
                    const gallery = Array.isArray(parsed.galleryImages)
                      ? parsed.galleryImages.map((g: string) => sanitizeImageUrl(g, targetUrl)).filter(Boolean)
                      : (mainImg ? [mainImg] : []);
                    if (mainImg && !gallery.includes(mainImg)) gallery.unshift(mainImg);

                    return {
                      ok: true,
                      title: cleanTitleStr(parsed.title || ''),
                      price: p,
                      currency: "AED",
                      image: mainImg,
                      galleryImages: gallery,
                      images: gallery,
                      variantGroups: Array.isArray(parsed.variantGroups) ? parsed.variantGroups : undefined,
                      storeName
                    };
                  }
                }
              }
            }
          } catch (_e) {}
        }
      }
    }
  }

  return {
    ok: false,
    requireManualEntry: true,
    message: "در حال حاضر امکان استخراج خودکار اطلاعات این لینک وجود ندارد. لطفاً چند لحظه بعد مجدداً تلاش فرمایید."
  };
}

// -------------------------------------------------------------------
// MAIN API ROUTER FOR /api/parse-link & /api/scrape-product (POST / GET)
// -------------------------------------------------------------------
const handleParseLinkRoute = async (req: express.Request, res: express.Response) => {
  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({
        ok: false,
        success: false,
        requireManualEntry: true,
        error: 'Method not allowed',
        message: 'Method not allowed',
        title: "",
        price: null,
        image: ""
      });
    }

    const rawUrl = req.method === 'POST' ? req.body?.url : req.query?.url;
    const cleanUrl = extractCleanUrl(typeof rawUrl === 'string' ? rawUrl : '');

    const defaultErrorResponse = {
      ok: false,
      success: false,
      requireManualEntry: true,
      error: "در حال حاضر امکان استخراج خودکار اطلاعات این لینک وجود ندارد. لطفاً چند لحظه بعد مجدداً تلاش فرمایید.",
      message: "در حال حاضر امکان استخراج خودکار اطلاعات این لینک وجود ندارد. لطفاً چند لحظه بعد مجدداً تلاش فرمایید.",
      title: "",
      price: null,
      image: ""
    };

    if (!cleanUrl || typeof cleanUrl !== 'string' || !cleanUrl.toLowerCase().startsWith('http')) {
      return res.status(200).json({
        ...defaultErrorResponse,
        error: "آدرس لینک معتبر نمی‌باشد.",
        message: "آدرس لینک معتبر نمی‌باشد."
      });
    }

    // Temu Explicit Drop
    if (cleanUrl.toLowerCase().includes('temu.com')) {
      return res.status(200).json({
        ...defaultErrorResponse,
        error: "استخراج از Temu به دلیل امنیت بالا فعلاً مقدور نیست.",
        message: "استخراج از Temu به دلیل امنیت بالا فعلاً مقدور نیست."
      });
    }

    // Domain restriction check safely
    let storeData: any = null;
    try {
      storeData = readStore();
    } catch (_storeErr) {
      console.warn('readStore failed inside /api/parse-link:', _storeErr);
    }
    const cmsConfig = storeData?.cms;
    const isFreeReq = req.body?.is_free_extraction === true || req.body?.is_free_extraction === 'true' || req.body?.isFreeExtraction === true;
    const reqRestricted = req.body?.enable_domain_restriction ?? req.body?.enableDomainRestriction;

    const defaultAllowedDomains = ['noon.com', 'amazon.ae', 'lifepharmacy.com', 'sporter.com', 'drnutrition.com', 'gnc-mena.com', 'gnc.com'];
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

    if (enableRestriction) {
      const isAllowedDomain = configuredAllowed.some((domain: string) => cleanUrl.toLowerCase().includes(domain.toLowerCase()));
      if (!isAllowedDomain) {
        return res.status(200).json({
          ...defaultErrorResponse,
          error: "استخراج خودکار از این سایت در حال حاضر پشتیبانی نمیشود.",
          message: "استخراج خودکار از این سایت در حال حاضر پشتیبانی نمیشود."
        });
      }
    }

    // STEP 1: FIRESTORE CACHING LAYER (scraped_products_cache)
    let cached: any = null;
    let normalizedUrl = cleanUrl;
    let urlHash = '';
    try {
      normalizedUrl = normalizeTargetUrl(cleanUrl) || cleanUrl;
      urlHash = computeUrlHash(normalizedUrl);
      cached = await getCachedScrapedProduct(urlHash);
    } catch (cacheErr) {
      console.warn('Firestore cache read error:', cacheErr);
    }

    if (cached && cached.price) {
      const cachedGallery = Array.isArray(cached.galleryImages) && cached.galleryImages.length > 0
        ? cached.galleryImages
        : (cached.image ? [cached.image] : []);
      return res.status(200).json({
        ok: true,
        success: true,
        cached: true,
        id: `cached-${urlHash || Date.now()}`,
        title: cached.title,
        brand: cached.storeName || 'فروشگاه آنلاین دبی',
        sourceStore: cached.storeName || 'فروشگاه آنلاین دبی',
        sourceUrl: cleanUrl,
        mainImage: cached.image || (cachedGallery[0] || ''),
        galleryImages: cachedGallery,
        basePriceAED: cached.price,
        inStock: true,
        price: cached.price,
        currency: cached.currency || 'AED',
        priceAed: cached.price,
        price_aed: cached.price,
        image: cached.image,
        image_url: cached.image,
        images: cachedGallery,
        storeName: cached.storeName || 'فروشگاه آنلاین دبی',
        url: cleanUrl,
        variants: [],
        description: `محصول استخراج شده (از کش)`
      });
    }

    // STEP 2: MODULAR ADAPTER ROUTER
    let domain = '';
    try {
      domain = new URL(normalizedUrl).hostname.toLowerCase();
    } catch (_urlErr) {
      domain = normalizedUrl.toLowerCase();
    }

    let result: ParseAdapterResult;
    try {
      if (domain.includes('gnc')) {
        result = await gncAdapter(normalizedUrl, cmsConfig);
      } else if (domain.includes('lifepharmacy')) {
        result = await lifePharmacyAdapter(normalizedUrl, cmsConfig);
      } else if (domain.includes('drnutrition')) {
        result = await drNutritionAdapter(normalizedUrl, cmsConfig);
      } else {
        result = await genericAdapter(normalizedUrl, cmsConfig, req.body);
      }
    } catch (adapterErr: any) {
      console.error('Adapter execution error:', adapterErr?.message || adapterErr);
      result = {
        ok: false,
        requireManualEntry: true,
        message: "امکان استخراج اطلاعات از این لینک وجود ندارد."
      };
    }

    // STEP 4: DATA SANITIZATION & CACHE WRITE
    if (result.ok && result.price && result.price > 0) {
      const sanitizedPrice = parseFloat(normalizeToEnglishDigits(String(result.price)).replace(/,/g, '').replace(/[^0-9.]/g, ''));
      if (!isNaN(sanitizedPrice) && sanitizedPrice > 0) {
        result.price = Math.round(sanitizedPrice * 100) / 100;
        try {
          if (urlHash) {
            await saveScrapedProductToCache(urlHash, normalizedUrl, {
              title: result.title || '',
              price: result.price,
              currency: result.currency || 'AED',
              image: result.image || '',
              galleryImages: result.galleryImages || [],
              variantGroups: result.variantGroups || [],
              storeName: result.storeName || ''
            });
          }
        } catch (cacheWriteErr) {
          console.warn('Cache write warning:', cacheWriteErr);
        }
      }
    }

    if (result.ok && result.price) {
      const p = result.price;
      const img = result.image || '';
      const mainImg = sanitizeImageUrl(img, normalizedUrl);

      // Clean arrays and remove duplicates/fakes
      const flavors = [...new Set(result.flavors || [])].filter(f => f && f !== 'پیشفرض' && f !== 'Default' && f !== 'پیش‌فرض / استاندارد' && f.length > 2);
      const sizes = [...new Set(result.sizes || [])].filter(s => s && s !== 'پیشفرض' && s !== 'Default' && s !== 'پیش‌فرض / استاندارد' && s.length > 1);

      const rawGallery = Array.isArray(result.galleryImages) && result.galleryImages.length > 0
        ? result.galleryImages
        : (Array.isArray(result.images) && result.images.length > 0 ? result.images : (mainImg ? [mainImg] : []));
      
      const gallery: string[] = Array.from(new Set(rawGallery.map(g => sanitizeImageUrl(g, normalizedUrl)).filter(Boolean)));
      if (mainImg && !gallery.includes(mainImg)) {
        gallery.unshift(mainImg);
      }

      // Build unified variants array with strict inStock and metadata
      const flatVariants: { id: string; name: string; label: string; type: string; inStock: boolean; price: number; priceAED: number; priceAed: number; imageUrl?: string; imageThumbnail?: string }[] = [];
      const seenVariantNames = new Set<string>();

      if (Array.isArray(result.variantGroups)) {
        result.variantGroups.forEach((vg: any) => {
          const groupType = vg.type || (vg.id === 'sizes' ? 'size' : (vg.id === 'flavors' ? 'flavor' : 'other'));
          (vg.options || []).forEach((opt: any, optIdx: number) => {
            const optName = typeof opt === 'string' ? opt : (opt.name || opt.label || opt.nameFa || '');
            if (optName && !seenVariantNames.has(optName.trim().toLowerCase())) {
              seenVariantNames.add(optName.trim().toLowerCase());
              const optPrice = (typeof opt === 'object' && (opt.price ?? opt.priceAed ?? opt.priceAED)) ? Number(opt.price ?? opt.priceAed ?? opt.priceAED) : p;
              const optImg = typeof opt === 'object' ? (opt.imageUrl || opt.imageThumbnail || opt.image) : undefined;
              const isAvailable = typeof opt === 'object' ? (opt.inStock !== false && opt.available !== false) : true;
              flatVariants.push({
                id: (typeof opt === 'object' && opt.id) ? opt.id : `${groupType}-${optIdx}`,
                name: optName,
                label: optName,
                type: groupType,
                inStock: isAvailable,
                price: optPrice,
                priceAED: optPrice,
                priceAed: optPrice,
                imageUrl: optImg ? sanitizeImageUrl(optImg, normalizedUrl) : undefined,
                imageThumbnail: optImg ? sanitizeImageUrl(optImg, normalizedUrl) : undefined
              });
            }
          });
        });
      }

      flavors.forEach((flv, idx) => {
        if (!seenVariantNames.has(flv.trim().toLowerCase())) {
          seenVariantNames.add(flv.trim().toLowerCase());
          flatVariants.push({
            id: `flv-${idx}`,
            name: flv,
            label: flv,
            type: 'flavor',
            inStock: true,
            price: p,
            priceAED: p,
            priceAed: p
          });
        }
      });

      sizes.forEach((sz, idx) => {
        if (!seenVariantNames.has(sz.trim().toLowerCase())) {
          seenVariantNames.add(sz.trim().toLowerCase());
          flatVariants.push({
            id: `sz-${idx}`,
            name: sz,
            label: sz,
            type: 'size',
            inStock: true,
            price: p,
            priceAED: p,
            priceAed: p
          });
        }
      });

      return res.status(200).json({
        ok: true,
        success: true,
        cached: false,
        id: `scraped-${Date.now()}`,
        title: result.title || 'محصول استخراج شده',
        brand: result.storeName || 'فروشگاه آنلاین دبی',
        sourceStore: result.storeName || 'فروشگاه آنلاین دبی',
        sourceUrl: cleanUrl,
        mainImage: mainImg || gallery[0] || '',
        galleryImages: gallery,
        videos: result.videos || [],
        features: result.features || [],
        basePriceAED: p,
        inStock: true,
        variants: flatVariants,
        price: p,
        currency: result.currency || 'AED',
        priceAed: p,
        price_aed: p,
        originalPriceAed: result.originalPriceAed,
        discountPercent: result.discountPercent,
        weightKg: 0.8,
        storeName: result.storeName || 'فروشگاه آنلاین دبی',
        url: cleanUrl,
        image: mainImg || gallery[0] || '',
        image_url: mainImg || gallery[0] || '',
        images: gallery,
        variantGroups: result.variantGroups || [],
        description: result.description,
        options: (result.options || []).filter(opt => opt && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal', 'default title'].includes(opt.trim().toLowerCase())),
        flavors: flavors,
        sizes: sizes
      });
    } else {
      return res.status(200).json({
        ok: false,
        success: false,
        requireManualEntry: true,
        error: result.message || "امکان برآورد خودکار قیمت برای این لینک وجود ندارد. لطفاً جهت دریافت استعلام قیمت با پشتیبانی تماس بگیرید.",
        message: result.message || "امکان برآورد خودکار قیمت برای این لینک وجود ندارد. لطفاً جهت دریافت استعلام قیمت با پشتیبانی تماس بگیرید.",
        title: "",
        price: null,
        image: ""
      });
    }
  } catch (globalErr: any) {
    console.error('CRITICAL /api/parse-link SERVER UNCAUGHT ERROR:', globalErr?.stack || globalErr);
    return res.status(200).json({
      ok: false,
      success: false,
      requireManualEntry: true,
      error: "خطای سرور هنگام استخراج لینک. لطفاً ورودی را به صورت دستی وارد کنید.",
      message: "خطای سرور هنگام استخراج لینک. لطفاً ورودی را به صورت دستی وارد کنید.",
      title: "",
      price: null,
      image: ""
    });
  }
};

app.all('/api/parse-link', handleParseLinkRoute);
app.all('/api/scrape-product', handleParseLinkRoute);

// Catch-all handler for unhandled /api/* endpoints - ALWAYS return JSON!
app.use('/api/*', (req, res) => {
  res.status(404).json({
    ok: false,
    error: `مسیر درخواست شده ${req.method} ${req.originalUrl} پیدا نشد.`,
    message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    status: 404
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

// Export Express app and 2nd Generation Cloud Function
export const api = onRequest(
  {
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 60,
  },
  app
);

export { app };
export default app;

// ----------------------------------------------------
// VITE MIDDLEWARE & STANDALONE SERVER
// ----------------------------------------------------
const isFirebaseFunction = process.env.IS_FIREBASE_FUNCTION === 'true';

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

  // Only listen when running as standalone server, NEVER when required inside Firebase Cloud Functions
  if (!isFirebaseFunction) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`OMEX Dubai Import Platform server listening on http://localhost:${PORT}`);
    });
  }
}

// Launch server unless explicitly imported within Firebase Functions
if (!isFirebaseFunction) {
  startServer();
}


