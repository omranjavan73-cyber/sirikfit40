import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import firebaseConfigJson from './firebase-applet-config.json';

// Safe & Lazy Firebase Initialization to prevent deployment timeouts
let firebaseApp: any = null;
let dbInstance: any = null;

function getDb() {
  if (!dbInstance) {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();
    dbInstance = (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)')
      ? getFirestore(firebaseApp, firebaseConfigJson.firestoreDatabaseId)
      : getFirestore(firebaseApp);
  }
  return dbInstance;
}

const app = express();
const PORT = process.env.PORT || 3000;

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
    aedRate: number;
    manualAedRate?: number;
    autoUpdateRates?: boolean;
    currencyApiUrl?: string;
    cargoRatePerKg: number;
    profitMargin: number;
    minOrderAed?: number;
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
    aedRate: 19500,
    cargoRatePerKg: 35,
    profitMargin: 15,
    minOrderAed: 200,
  },
  cms: defaultCmsConfig,
  users: [],
  orders: []
};

let cachedStore: StoreData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 3000;

function readStoreFromFile(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const store: StoreData = JSON.parse(content);
    if (!store.cms) store.cms = defaultCmsConfig;
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
    const firestore = getDb();
    const settingsDocRef = doc(firestore, 'settings', 'app');
    const settingsSnap = await getDoc(settingsDocRef);
    let settings = defaultData.settings;
    if (settingsSnap.exists()) {
      settings = { ...defaultData.settings, ...settingsSnap.data() } as any;
    }

    const cmsDocRef = doc(firestore, 'settings', 'cms');
    const cmsSnap = await getDoc(cmsDocRef);
    let cms = defaultCmsConfig;
    if (cmsSnap.exists()) {
      cms = { ...defaultCmsConfig, ...cmsSnap.data() } as any;
    }

    cachedStore = { settings, cms, users: [], orders: [] };
    lastFetchTime = now;
    return cachedStore;
  } catch (err) {
    console.warn('Firestore fallback to file:', err instanceof Error ? err.message : String(err));
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
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (_e) {}
}

async function persistSettings(settings: any) {
  if (cachedStore) cachedStore.settings = settings;
  writeStore(cachedStore || defaultData);
  try {
    await setDoc(doc(getDb(), 'settings', 'app'), settings, { merge: true });
  } catch (err) {
    console.warn('Persist settings error:', err instanceof Error ? err.message : String(err));
  }
}

async function persistCms(cms: any) {
  if (cachedStore) cachedStore.cms = cms;
  writeStore(cachedStore || defaultData);
  try {
    await setDoc(doc(getDb(), 'settings', 'cms'), cms, { merge: true });
  } catch (err) {
    console.warn('Persist CMS error:', err instanceof Error ? err.message : String(err));
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

app.get('/api/settings', (req, res) => {
  const store = readStore();
  res.json(store.settings);
});

app.get('/api/cms', (req, res) => {
  const store = readStore();
  res.json(store.cms);
});

app.post('/api/cms', async (req, res) => {
  const store = readStore();
  store.cms = { ...store.cms, ...req.body };
  await persistCms(store.cms);
  res.json({ success: true, cms: store.cms });
});

app.post('/api/settings', async (req, res) => {
  const store = readStore();
  store.settings = { ...store.settings, ...req.body };
  await persistSettings(store.settings);
  res.json({ success: true, settings: store.settings });
});

// Express Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error('Express Error:', err.message || err);
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
  next();
});

// Export 2nd Gen Cloud Function
export const api = onRequest(
  {
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 60,
  },
  app
);

// Bulletproof Local Express Listener for Cloud Functions Evaluation
const isCloudEnv = !!process.env.K_SERVICE || !!process.env.FUNCTION_TARGET || !!process.env.FUNCTIONS_EMULATOR;

if (!isCloudEnv) {
  getStoreData().catch(e => console.warn('Hydrate warn:', e));
  const server = app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
  
  // Prevent EADDRINUSE from crashing Firebase CLI inspection process
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port ${PORT} in use] Standalone listener bypassed for Cloud Function evaluation.`);
    } else {
      console.error('Express listener error:', err);
    }
  });
}