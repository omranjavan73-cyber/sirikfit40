import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  LayoutDashboard,
  ShoppingBag,
  SlidersHorizontal,
  Image as ImageIcon,
  Plus,
  Trash2,
  Save,
  Upload,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Clock,
  Truck,
  Coins,
  Globe,
  Key,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  ArrowUp,
  ArrowDown,
  PackageCheck,
  Package,
  Plane,
  Home,
  ToggleLeft,
  ToggleRight,
  Phone,
  PhoneCall,
  Send,
  Mail,
  ShieldCheck,
  Headphones,
  CreditCard,
  Wallet,
  FileText,
  Download,
  Filter,
  Search,
  Eye,
  EyeOff,
  Calculator,
  PieChart,
  Building2,
  FileSpreadsheet,
  Check,
  Copy,
  Database
} from 'lucide-react';
import { checkFirestoreConnection, saveSettingsToFirestore, fetchSettingsFromFirestore, saveCmsToFirestore, getCmsFromFirestore } from '../firebase';
import {
  FinancialSettings,
  Order,
  PaymentStatus,
  ShippingStatus,
  CmsConfig,
  StoreCardItem,
  FeaturedDeal,
  LocalInventoryItem,
  WarehouseCategory,
  HomePageSettings,
  GatewayProvider,
  PaymentGatewayConfig,
  PricingRulesConfig,
  HomeBanner,
  DomainItem
} from '../types';
import { formatToman, formatAed, formatPersianDate, toPersianDigits } from '../utils/formatters';
import { getEffectiveGeminiKeysList, setEffectiveGeminiKeysList } from '../utils/geminiKey';
import { PricingRulesAdmin } from './PricingRulesAdmin';

const DEFAULT_WAREHOUSE_CATEGORIES: WarehouseCategory[] = [
  { id: 'all', label: 'همه کالاها', filterKey: 'all', iconUrl: '' },
  { id: 'protein', label: 'پروتئین', filterKey: 'protein', iconUrl: '' },
  { id: 'vitamin', label: 'ویتامین', filterKey: 'vitamin', iconUrl: '' },
  { id: 'pre', label: 'قبل تمرین', filterKey: 'pre', iconUrl: '' },
  { id: 'omega', label: 'امگا ۳', filterKey: 'omega', iconUrl: '' },
  { id: 'hot', label: 'پرفروش', filterKey: 'hot', iconUrl: '' },
];

const DEFAULT_STORES: StoreCardItem[] = [
  {
    id: 'store-dnp',
    title: 'Doctor Nutrition Dubai',
    shortTitle: 'Dr. Nutrition',
    subtitle: 'بزرگترین مرجع مکمل دبی',
    description: 'بزرگترین مرجع تخصصی مکمل‌های ورزشی، ویتامین و پروتئین ایزوله در امارات و خاورمیانه',
    url: 'https://www.drnutrition.com/en-ae',
    badge: 'تخفیف ویژه دبی',
    enabled: true,
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif" letter-spacing="-6">dnp</text><path d="M50 120 C 90 70, 135 40, 175 28 C 150 65, 110 110, 75 130 Z" fill="%2378BE20"/><path d="M60 112 Q 115 65, 163 35" stroke="%235A9614" stroke-width="3" fill="none"/></svg>'
  },
  {
    id: 'store-life',
    title: 'Life Pharmacy UAE',
    shortTitle: 'Life Pharmacy',
    subtitle: 'داروخانه آنلاین دبی',
    description: 'بزرگترین زنجیره داروخانه آنلاین دبی - داروها، ویتامین‌ها، مکمل‌ها و محصولات آرایشی بهداشتی معتبر',
    url: 'https://www.lifepharmacy.com',
    badge: 'داروخانه آنلاین دبی',
    enabled: true,
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><path d="M100 15 C56 15 40 42 40 70 V135 H160 V70 C160 42 144 15 100 15 Z" fill="%231C3F94"/><circle cx="100" cy="55" r="9" fill="%23FFFFFF"/><path d="M100 68 C84 80 72 84 64 110 H136 C128 84 116 80 100 68 Z" fill="%23FFFFFF"/><text x="100" y="172" text-anchor="middle" fill="%23C42582" font-weight="900" font-size="36" font-family="sans-serif">LIFE%C2%AE</text></svg>'
  },
  {
    id: 'store-gnc',
    title: 'GNC UAE',
    shortTitle: 'GNC',
    subtitle: 'نمایندگی رسمی GNC',
    description: 'نمایندگی رسمی برند جهانی GNC در امارات - انواع مولتی‌ویتامین‌ها، امگا ۳ و مکمل‌های سلامتی اورجینال',
    url: 'https://gnc-mena.com/',
    badge: 'ضمانت ۱۰۰٪ اورجینال',
    enabled: true,
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="115" text-anchor="middle" fill="%23E31837" font-weight="900" font-size="70" font-family="Arial,sans-serif" letter-spacing="-2">GNC</text><text x="100" y="145" text-anchor="middle" fill="%23E31837" font-weight="800" font-size="20" font-family="Arial,sans-serif" letter-spacing="4">LIVE WELL</text></svg>'
  }
];

// Helper Function: Auto Image Compressor & Resizer (Max 800x800, quality 0.7)
export const compressImageFile = (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> => {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
      return;
    }
    // SVG or non-image files read directly
    if (!file.type.startsWith('image/') || file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve((e.target?.result as string) || '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

interface AdminPanelProps {
  settings: FinancialSettings;
  onUpdateSettings: (newSettings: FinancialSettings) => void;
  cms: CmsConfig | null;
  onUpdateCms: (newCms: CmsConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings,
  onUpdateSettings,
  cms,
  onUpdateCms
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Sub-tab: 'dashboard' | 'orders' | 'financial' | 'cms' | 'deals' | 'inventory' | 'homeContent' | 'accounting' | 'gateway' | 'pricingRules' | 'backup' | 'security' | 'apiSettings'
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'dashboard' | 'orders' | 'financial' | 'cms' | 'deals' | 'inventory' | 'homeContent' | 'accounting' | 'gateway' | 'pricingRules' | 'backup' | 'security' | 'apiSettings'
  >('dashboard');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // Payment Gateway Settings State
  const [activeGateway, setActiveGateway] = useState<GatewayProvider>(cms?.paymentGateway?.activeGateway || 'zarinpal');
  const [merchantId, setMerchantId] = useState<string>(cms?.paymentGateway?.merchantId || 'zarin_merchant_omex_8849102');
  const [callbackUrl, setCallbackUrl] = useState<string>(cms?.paymentGateway?.callbackUrl || '/api/payment/callback');
  const [isSandbox, setIsSandbox] = useState<boolean>(cms?.paymentGateway?.isSandbox ?? true);
  const [cardNumber, setCardNumber] = useState<string>(cms?.paymentGateway?.cardToCard?.cardNumber || '6037-9918-4421-9876');
  const [bankName, setBankName] = useState<string>(cms?.paymentGateway?.cardToCard?.bankName || 'بانک ملی ایران');
  const [cardholderName, setCardholderName] = useState<string>(cms?.paymentGateway?.cardToCard?.cardholderName || 'به نام مدیریت بازرگانی سیریک فیت پرو');
  const [shabaNumber, setShabaNumber] = useState<string>(cms?.paymentGateway?.cardToCard?.shabaNumber || 'IR680170000000109988772001');

  const [showMerchantSecret, setShowMerchantSecret] = useState<boolean>(false);
  const [isSavingGateway, setIsSavingGateway] = useState<boolean>(false);
  const [saveGatewaySuccess, setSaveGatewaySuccess] = useState<boolean>(false);

  // Accounting & Financial Ledger Filter State
  const [accountingPeriodFilter, setAccountingPeriodFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [accountingSearchQuery, setAccountingSearchQuery] = useState<string>('');
  const [accountingStatusFilter, setAccountingStatusFilter] = useState<string>('ALL');

  // Financial Form String Inputs (Fixes leading zero bugs & clearing empty state)
  const [aedRateInput, setAedRateInput] = useState<string>(String(settings.aedRate));
  const [manualAedRateInput, setManualAedRateInput] = useState<string>(String(settings.manualAedRate || settings.aedRate || 53000));
  const [cargoRateInput, setCargoRateInput] = useState<string>(String(settings.cargoRatePerKg));
  const [profitMarginInput, setProfitMarginInput] = useState<string>(String(settings.profitMargin));
  const [minOrderAedInput, setMinOrderAedInput] = useState<string>(String(settings.minOrderAed || 200));

  const [isTestingRateApi, setIsTestingRateApi] = useState<boolean>(false);
  const [rateTestResult, setRateTestResult] = useState<{ message: string; type: 'success' | 'error' | 'warning'; rate?: number } | null>(null);

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);
  const [scraperToast, setScraperToast] = useState<string | null>(null);

  // CMS Form State
  const [heroTitle, setHeroTitle] = useState(cms?.heroTitle || '');
  const [heroSubtitle, setHeroSubtitle] = useState(cms?.heroSubtitle || '');
  const [heroNotice, setHeroNotice] = useState(cms?.heroNotice || '');
  const [heroImage, setHeroImage] = useState(cms?.heroImage || '');
  const [storesList, setStoresList] = useState<StoreCardItem[]>(
    cms?.stores && cms.stores.length > 0 ? cms.stores : DEFAULT_STORES
  );
  const [dealsList, setDealsList] = useState<FeaturedDeal[]>(cms?.deals || []);
  const [showLocalInventory, setShowLocalInventory] = useState<boolean>(cms?.showLocalInventory ?? true);
  const [warehouseBannerTitle, setWarehouseBannerTitle] = useState(cms?.warehouseBannerTitle || 'کالاهای موجود در انبار ایران (ارسال فوری)');
  const [warehouseBannerSubtitle, setWarehouseBannerSubtitle] = useState(cms?.warehouseBannerSubtitle || 'تحویل ۱ تا ۲ روزه در سراسر کشور • کالاها پلمپ و اورجینال');
  const [warehouseBannerTheme, setWarehouseBannerTheme] = useState<'light' | 'dark' | 'emerald' | 'amber'>(cms?.warehouseBannerTheme || 'light');
  const [warehouseBannerButtonText, setWarehouseBannerButtonText] = useState(cms?.warehouseBannerButtonText || 'جستجو و مشاهده همه');
  const [localInventoryList, setLocalInventoryList] = useState<LocalInventoryItem[]>(cms?.localInventory || []);
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategory[]>(
    cms?.warehouseCategories?.length ? cms.warehouseCategories : DEFAULT_WAREHOUSE_CATEGORIES
  );
  const DEFAULT_BANNER_SLOGANS = [
    '⚡ ارسال مستقیم و تضمینی کالا از دبی تا درب منزل',
    '💯 تضمین ۱۰۰٪ اصالت مکملها و ضمانت بازگشت',
    '🚀 تحویل سریع و ایمن بین ۵ تا ۷ روز کاری'
  ];

  const [showAnnouncementBanner, setShowAnnouncementBanner] = useState<boolean>(cms?.showAnnouncementBanner ?? true);
  const [announcementText, setAnnouncementText] = useState(cms?.announcementText || 'ارسال مستقیم و تضمینی کالا از دبی تا درب منزل');
  const [announcementBadge, setAnnouncementBadge] = useState(cms?.announcementBadge || 'تحویل ۵ الی ۷ روز کاری');
  const [announcementSlogans, setAnnouncementSlogans] = useState<string[]>(
    cms?.announcementSlogans && cms.announcementSlogans.length > 0
      ? cms.announcementSlogans
      : DEFAULT_BANNER_SLOGANS
  );

  const handleUpdateSlogan = (index: number, val: string) => {
    const updated = [...announcementSlogans];
    updated[index] = val;
    setAnnouncementSlogans(updated);
  };

  const handleMoveSloganUp = (index: number) => {
    if (index === 0) return;
    const updated = [...announcementSlogans];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setAnnouncementSlogans(updated);
  };

  const handleMoveSloganDown = (index: number) => {
    if (index >= announcementSlogans.length - 1) return;
    const updated = [...announcementSlogans];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setAnnouncementSlogans(updated);
  };

  const handleAddSlogan = () => {
    setAnnouncementSlogans([...announcementSlogans, '⚡ شعار جدید بنر']);
  };

  const handleRemoveSlogan = (index: number) => {
    if (announcementSlogans.length <= 1) return;
    setAnnouncementSlogans(announcementSlogans.filter((_, i) => i !== index));
  };

  const handleResetSlogans = () => {
    setAnnouncementSlogans([...DEFAULT_BANNER_SLOGANS]);
  };

  // Home Page Slideshow Banners State & Handlers
  const DEFAULT_HOME_BANNERS: HomeBanner[] = [
    {
      id: 'b1',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop',
      linkUrl: 'https://drnutrition.com',
      title: 'تخفیف ویژه مکمل‌های ورزشی و پروتئین',
      enabled: true
    },
    {
      id: 'b2',
      imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=1200&auto=format&fit=crop',
      linkUrl: 'https://lifepharmacy.com',
      title: 'ارسال مستقیم و تحویل فوری از دبی',
      enabled: true
    }
  ];

  const [homeBannersList, setHomeBannersList] = useState<HomeBanner[]>(
    cms?.homeBanners && cms.homeBanners.length > 0
      ? cms.homeBanners
      : DEFAULT_HOME_BANNERS
  );

  const handleAddBanner = () => {
    const newBanner: HomeBanner = {
      id: 'b_' + Date.now(),
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop',
      linkUrl: 'https://drnutrition.com',
      title: `بنر شماره ${homeBannersList.length + 1}`,
      enabled: true
    };
    setHomeBannersList([...homeBannersList, newBanner]);
  };

  const handleUpdateBanner = (index: number, field: keyof HomeBanner, value: any) => {
    const updated = [...homeBannersList];
    updated[index] = { ...updated[index], [field]: value };
    setHomeBannersList(updated);
  };

  const handleMoveBannerUp = (index: number) => {
    if (index === 0) return;
    const updated = [...homeBannersList];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setHomeBannersList(updated);
  };

  const handleMoveBannerDown = (index: number) => {
    if (index >= homeBannersList.length - 1) return;
    const updated = [...homeBannersList];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setHomeBannersList(updated);
  };

  const handleRemoveBanner = (index: number) => {
    setHomeBannersList(homeBannersList.filter((_, i) => i !== index));
  };

  const handleBannerFileUpload = async (index: number, file: File) => {
    try {
      const compressed = await compressImageFile(file, 1200, 800, 0.7);
      if (compressed) {
        handleUpdateBanner(index, 'imageUrl', compressed);
      }
    } catch (_e) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) handleUpdateBanner(index, 'imageUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const [currencyApiUrl, setCurrencyApiUrl] = useState(cms?.apiConfig?.currencyApiUrl || '');
  const [scraperEndpoint, setScraperEndpoint] = useState(cms?.apiConfig?.scraperEndpoint || '');
  const [scraperApiKey, setScraperApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('scraper_api_key') || cms?.apiConfig?.scraperApiKey || '';
    } catch (_e) {
      return cms?.apiConfig?.scraperApiKey || '';
    }
  });
  const [enableScraperApi, setEnableScraperApi] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('enable_scraper_api');
      if (saved !== null) return JSON.parse(saved);
    } catch (_e) {}
    return cms?.apiConfig?.enableScraperApi ?? false;
  });
  const [autoUpdateRates, setAutoUpdateRates] = useState(cms?.apiConfig?.autoUpdateRates ?? true);
  const initialGeminiKeys = getEffectiveGeminiKeysList(cms?.apiConfig?.geminiApiKeys || cms?.apiConfig?.geminiApiKey);
  const [geminiApiKey1, setGeminiApiKey1] = useState<string>(initialGeminiKeys[0] || (typeof cms?.apiConfig?.geminiApiKey === 'string' && cms.apiConfig.geminiApiKey !== '******' ? cms.apiConfig.geminiApiKey : ''));
  const [geminiApiKey2, setGeminiApiKey2] = useState<string>(initialGeminiKeys[1] || (typeof cms?.apiConfig?.geminiApiKey2 === 'string' && cms.apiConfig.geminiApiKey2 !== '******' ? cms.apiConfig.geminiApiKey2 : ''));
  const [geminiApiKey3, setGeminiApiKey3] = useState<string>(initialGeminiKeys[2] || (typeof cms?.apiConfig?.geminiApiKey3 === 'string' && cms.apiConfig.geminiApiKey3 !== '******' ? cms.apiConfig.geminiApiKey3 : ''));
  const [showGeminiApiKey, setShowGeminiApiKey] = useState<boolean>(false);

  // Telegram Bot & Email Notification Settings State
  const [telegramBotToken, setTelegramBotToken] = useState<string>(cms?.apiConfig?.telegramBotToken || cms?.homeContent?.telegramBotToken || '');
  const [adminChatId, setAdminChatId] = useState<string>(cms?.apiConfig?.adminChatId || cms?.homeContent?.adminChatId || '');
  const [telegramNotifyEnabled, setTelegramNotifyEnabled] = useState<boolean>(cms?.apiConfig?.telegramNotifyEnabled ?? true);

  const [adminDestinationEmail, setAdminDestinationEmail] = useState<string>(cms?.apiConfig?.adminDestinationEmail || cms?.homeContent?.adminDestinationEmail || 'omran.javan73@gmail.com');
  const [emailNotifyEnabled, setEmailNotifyEnabled] = useState<boolean>(cms?.apiConfig?.emailNotifyEnabled ?? true);
  const [emailjsServiceId, setEmailjsServiceId] = useState<string>(cms?.apiConfig?.emailjsServiceId || '');
  const [emailjsTemplateId, setEmailjsTemplateId] = useState<string>(cms?.apiConfig?.emailjsTemplateId || '');
  const [emailjsPublicKey, setEmailjsPublicKey] = useState<string>(cms?.apiConfig?.emailjsPublicKey || '');
  const [resendApiKey, setResendApiKey] = useState<string>(cms?.apiConfig?.resendApiKey || '');

  // Domain Whitelist & Restrictions State (Checkboxes & Add/Remove Support)
  const DEFAULT_DOMAIN_ITEMS: DomainItem[] = [
    { domain: 'drnutrition.com', enabled: true },
    { domain: 'gnc-mena.com', enabled: true },
    { domain: 'lifepharmacy.com', enabled: true },
    { domain: 'sporter.com', enabled: true },
    { domain: 'amazon.ae', enabled: true },
    { domain: 'noon.com', enabled: true }
  ];

  const [domainItemsList, setDomainItemsList] = useState<DomainItem[]>(() => {
    if (cms?.apiConfig?.domainItems && cms.apiConfig.domainItems.length > 0) {
      return cms.apiConfig.domainItems;
    }
    if (cms?.apiConfig?.allowedDomains && cms.apiConfig.allowedDomains.length > 0) {
      return cms.apiConfig.allowedDomains.map(d => ({ domain: d, enabled: true }));
    }
    return DEFAULT_DOMAIN_ITEMS;
  });

  const [newDomainInput, setNewDomainInput] = useState('');

  const handleAddDomain = () => {
    if (!newDomainInput.trim()) return;
    let cleanDomain = newDomainInput.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (!cleanDomain) return;
    if (domainItemsList.some(item => item.domain === cleanDomain)) {
      setNewDomainInput('');
      return;
    }
    setDomainItemsList([...domainItemsList, { domain: cleanDomain, enabled: true }]);
    setNewDomainInput('');
  };

  const handleToggleDomainItem = (index: number) => {
    const updated = [...domainItemsList];
    updated[index].enabled = !updated[index].enabled;
    setDomainItemsList(updated);
  };

  const handleRemoveDomainItem = (index: number) => {
    setDomainItemsList(domainItemsList.filter((_, i) => i !== index));
  };

  const handleResetDomains = () => {
    setDomainItemsList([...DEFAULT_DOMAIN_ITEMS]);
  };

  const [enableDomainRestriction, setEnableDomainRestriction] = useState<boolean>(() => {
    try {
      const savedRestricted = localStorage.getItem('enable_domain_restriction');
      if (savedRestricted !== null) return JSON.parse(savedRestricted);
      const savedFree = localStorage.getItem('is_free_extraction');
      if (savedFree !== null) return savedFree !== 'true';
    } catch (_e) {}
    return cms?.apiConfig?.enableDomainRestriction ?? true;
  });

  const handleToggleDomainRestriction = (checked: boolean) => {
    setEnableDomainRestriction(checked);
    try {
      localStorage.setItem('enable_domain_restriction', JSON.stringify(checked));
      localStorage.setItem('is_free_extraction', (!checked).toString());
    } catch (_e) {}
  };

  // Home Page Content Settings State
  const [topPromoText, setTopPromoText] = useState(cms?.homeContent?.topPromoText || 'سیریک فیت - مکمل‌های تخصصی ورزشی و اورجینال');
  const [showTopPromo, setShowTopPromo] = useState<boolean>(cms?.homeContent?.showTopPromo ?? false);

  const [appTitleText, setAppTitleText] = useState(cms?.homeContent?.appTitle || 'SIRIK FIT');
  const [appSubtitleText, setAppSubtitleText] = useState(cms?.homeContent?.appSubtitle || 'مکمل‌های ورزشی و اورجینال');
  const [headerPillSlogan, setHeaderPillSlogan] = useState(cms?.homeContent?.headerPillSlogan || 'مکمل‌های ورزشی و اورجینال');
  const [logoUrl, setLogoUrl] = useState(cms?.homeContent?.logoUrl || '');

  const [heroMainHeadline, setHeroMainHeadline] = useState(cms?.homeContent?.heroMainHeadline || 'فقط اورجینال، فقط');
  const [heroHighlightWord, setHeroHighlightWord] = useState(cms?.homeContent?.heroHighlightWord || 'نتیجه.');
  const [heroBannerSubtitle, setHeroBannerSubtitle] = useState(cms?.homeContent?.heroSubtitle || 'تضمین اصالت کالا، تضمین کیفیت.');
  const [heroImageUrl, setHeroImageUrl] = useState(cms?.homeContent?.heroImageUrl || '');

  const [calcBlackBadge, setCalcBlackBadge] = useState(cms?.homeContent?.calcBlackBadge || '✦ خرید مستقیم از دبی');
  const [calcMainHeadline, setCalcMainHeadline] = useState(cms?.homeContent?.calcMainHeadline || 'برآورد قیمت و ثبت سفارش');
  const [calcSubtitle, setCalcSubtitle] = useState(cms?.homeContent?.calcSubtitle || 'لینک محصول را وارد کنید تا قیمت تحویل در ایران فوری محاسبه شود.');
  const [calcScheduleBadge, setCalcScheduleBadge] = useState(cms?.homeContent?.calcScheduleBadge || '📅 ارسال هر دوشنبه و پنجشنبه');

  const [telegramHandle, setTelegramHandle] = useState(cms?.homeContent?.telegramHandle || '@SIRIK_FIT_Support');
  const [telegramLink, setTelegramLink] = useState(cms?.homeContent?.telegramLink || 'https://t.me/SIRIK_FIT_Support');
  const [whatsappPhone, setWhatsappPhone] = useState(cms?.homeContent?.whatsappPhone || 'پاسخگویی سریع ۲۴ ساعته');
  const [whatsappLink, setWhatsappLink] = useState(cms?.homeContent?.whatsappLink || 'https://wa.me/989120000000');
  const [showWhatsappCard, setShowWhatsappCard] = useState<boolean>(cms?.homeContent?.showWhatsappCard ?? true);
  const [officePhone, setOfficePhone] = useState(cms?.homeContent?.officePhone || '021-91000000');
  const [dubaiPhone, setDubaiPhone] = useState(cms?.homeContent?.dubaiPhone || '+971-500000000');
  const [showDubaiPhone, setShowDubaiPhone] = useState<boolean>(cms?.homeContent?.showDubaiPhone ?? true);
  const [supportHeadline, setSupportHeadline] = useState(cms?.homeContent?.supportHeadline || 'پشتیبانی و مشاوره تخصصی واردات دبی');
  const [supportSubtitle, setSupportSubtitle] = useState(cms?.homeContent?.supportSubtitle || 'پاسخگویی ۲۴ ساعته توسط کارشناسان تغذیه و لاجستیک');
  const [showSupportSection, setShowSupportSection] = useState<boolean>(cms?.homeContent?.showSupportSection ?? true);

  const [showScraperApiKey, setShowScraperApiKey] = useState<boolean>(false);
  const [showTelegramToken, setShowTelegramToken] = useState<boolean>(false);
  const [showResendKey, setShowResendKey] = useState<boolean>(false);
  
  const [showTelegramCard, setShowTelegramCard] = useState<boolean>(cms?.homeContent?.showTelegramCard ?? true);
  const [telegramTitle, setTelegramTitle] = useState<string>(cms?.homeContent?.telegramTitle || 'ارتباط با پشتیبانی در تلگرام');
  
  const [showEmailCard, setShowEmailCard] = useState<boolean>(cms?.homeContent?.showEmailCard ?? true);
  const [emailTitle, setEmailTitle] = useState<string>(cms?.homeContent?.emailTitle || 'ارتباط از طریق ایمیل پشتیبانی');
  
  const [showPhoneCard, setShowPhoneCard] = useState<boolean>(cms?.homeContent?.showPhoneCard ?? true);
  const [phoneTitle, setPhoneTitle] = useState<string>(cms?.homeContent?.phoneTitle || 'تلفن پشتیبانی');

  const [trustBadge1, setTrustBadge1] = useState(cms?.homeContent?.trustBadge1 || 'اصالت ۱۰۰٪ کالا');
  const [trustBadge2, setTrustBadge2] = useState(cms?.homeContent?.trustBadge2 || 'حمل ایمن کارگو');
  const [trustBadge3, setTrustBadge3] = useState(cms?.homeContent?.trustBadge3 || 'تحویل ۵ تا ۷ روزه');

  // Security & Password Management State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Recovery Email & Forgot Password State
  const [recoveryEmail, setRecoveryEmail] = useState('omran.javan73@gmail.com');
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [forgotMessage, setForgotMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSendingForgot, setIsSendingForgot] = useState(false);

  // Security Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilterCategory, setLogFilterCategory] = useState<string>('ALL');

  // Advanced Backup & Schedule State
  const [backupMessage, setBackupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [backupList, setBackupList] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backupSchedule, setBackupSchedule] = useState({
    enabled: true,
    frequency: '24h',
    intervalHours: 24,
    preferredTime: '02:00',
    keepMaxBackups: 10,
    notifyOnBackup: true,
    notifyEmail: 'omran.javan73@gmail.com'
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<any | null>(null);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Email Backup State
  const [emailBackupTarget, setEmailBackupTarget] = useState('omran.javan73@gmail.com');
  const [isSendingEmailBackup, setIsSendingEmailBackup] = useState(false);
  const [copiedEmailBackupText, setCopiedEmailBackupText] = useState(false);
  const [lastEmailBackupResult, setLastEmailBackupResult] = useState<{
    gmailUrl?: string;
    mailtoUrl?: string;
    emailSubject?: string;
    emailBody?: string;
  } | null>(null);

  // Site Visits & Visitor Analytics State
  const [visitorPeriod, setVisitorPeriod] = useState<'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'allTime'>('today');
  const [visitorStatsData, setVisitorStatsData] = useState<any | null>(null);
  const [isLoadingVisitorStats, setIsLoadingVisitorStats] = useState(false);

  const fetchVisitorStats = async () => {
    setIsLoadingVisitorStats(true);
    try {
      const res = await fetch('/api/admin/visitor-stats');
      const data = await res.json();
      if (data.success) {
        setVisitorStatsData(data);
      }
    } catch (err) {
      console.warn('Error fetching visitor stats:', err);
    } finally {
      setIsLoadingVisitorStats(false);
    }
  };

  // Copy Product Link Handler
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const handleCopyProductUrl = (url: string, orderId: string) => {
    const targetUrl = url || 'https://drnutrition.com';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(targetUrl);
      setCopiedOrderId(orderId);
      setTimeout(() => {
        setCopiedOrderId(null);
      }, 2500);
    }
  };

  // Password & Security API Handlers
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassMessage({ text: 'لطفاً تمامی فیلدهای کلمه عبور را تکمیل کنید.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassMessage({ text: 'کلمه عبور جدید و تکرار آن یکسان نیستند.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setPassMessage({ text: 'کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.', type: 'error' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در تغییر کلمه عبور');
      }

      setPassMessage({ text: data.message || 'کلمه عبور با موفقیت به‌روزرسانی شد.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchAuditLogs();
    } catch (err: any) {
      setPassMessage({ text: err.message || 'خطا در برقراری ارتباط با سرور', type: 'error' });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleRequestForgotCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);

    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      setForgotMessage({ text: 'آدرس ایمیل معتبر جهت بازیابی کلمه عبور را وارد کنید.', type: 'error' });
      return;
    }

    setIsSendingForgot(true);
    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در ارسال کد بازیابی');
      }

      setForgotMessage({
        text: `${data.message} ${data.debugCode ? `(کد تایید تستی: ${data.debugCode})` : ''}`,
        type: 'success'
      });
      if (data.debugCode) setForgotOtpCode(data.debugCode);
      setForgotStep('VERIFY');
    } catch (err: any) {
      setForgotMessage({ text: err.message || 'خطا در ارسال کد بازیابی', type: 'error' });
    } finally {
      setIsSendingForgot(false);
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);

    if (!forgotOtpCode || !forgotNewPassword) {
      setForgotMessage({ text: 'کد تایید ۶ رقمی و کلمه عبور جدید الزامی است.', type: 'error' });
      return;
    }

    setIsSendingForgot(true);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: forgotOtpCode, newPassword: forgotNewPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'کد تایید اشتباه یا منقضی شده است.');
      }

      setForgotMessage({ text: 'کلمه عبور شما با موفقیت بازنشانی گردید. اکنون می‌توانید وارد شوید.', type: 'success' });
      setForgotStep('REQUEST');
      setForgotOtpCode('');
      setForgotNewPassword('');
      fetchAuditLogs();
    } catch (err: any) {
      setForgotMessage({ text: err.message || 'خطا در بازنشانی کلمه عبور', type: 'error' });
    } finally {
      setIsSendingForgot(false);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.warn('Error fetching audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchBackupsList = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch('/api/admin/backups');
      const data = await res.json();
      if (data.success && Array.isArray(data.backups)) {
        setBackupList(data.backups);
      }
    } catch (err) {
      console.warn('Error fetching backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const fetchBackupSchedule = async () => {
    try {
      const res = await fetch('/api/admin/backup-schedule');
      const data = await res.json();
      if (data.success && data.schedule) {
        setBackupSchedule(data.schedule);
      }
    } catch (err) {
      console.warn('Error fetching backup schedule:', err);
    }
  };

  const handleCreateManualSnapshot = async () => {
    setIsCreatingSnapshot(true);
    setBackupMessage(null);
    try {
      const res = await fetch('/api/admin/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'MANUAL' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ایجاد بک‌آپ');

      setBackupMessage({ text: 'نسخه پشتیبان ابری جدید با موفقیت ایجاد گردید.', type: 'success' });
      fetchBackupsList();
      fetchAuditLogs();
    } catch (err: any) {
      setBackupMessage({ text: err.message || 'خطا در ایجاد پشتیبان', type: 'error' });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!window.confirm('آیا از حذف این نسخه پشتیبان اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/admin/backups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setBackupMessage({ text: 'فایل پشتیبان با موفقیت حذف گردید.', type: 'success' });
        fetchBackupsList();
        fetchAuditLogs();
      }
    } catch (err) {
      setBackupMessage({ text: 'خطا در حذف پشتیبان', type: 'error' });
    }
  };

  const handleSaveBackupSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    try {
      const res = await fetch('/api/admin/backup-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupSchedule)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ذخیره زمان‌بندی');

      setBackupMessage({ text: 'تنظیمات زمان‌بندی پشتیبان‌گیری خودکار با موفقیت ثبت شد.', type: 'success' });
      fetchAuditLogs();
    } catch (err: any) {
      setBackupMessage({ text: err.message || 'خطا در ذخیره زمان‌بندی', type: 'error' });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSendEmailBackup = async (openGmailDirectly: boolean = false) => {
    if (!emailBackupTarget || !emailBackupTarget.includes('@')) {
      setBackupMessage({ text: 'لطفاً یک آدرس ایمیل معتبر وارد کنید.', type: 'error' });
      return;
    }
    setIsSendingEmailBackup(true);
    setBackupMessage(null);
    try {
      const res = await fetch('/api/admin/backups/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailBackupTarget })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در ارسال بک‌آپ');

      setLastEmailBackupResult({
        gmailUrl: data.gmailUrl,
        mailtoUrl: data.mailtoUrl,
        emailSubject: data.emailSubject,
        emailBody: data.emailBody
      });
      setBackupMessage({
        text: `نسخه پشتیبان جدید ایجاد گردید و لینک آماده‌سازی ایمیل به ${emailBackupTarget} ایجاد شد.`,
        type: 'success'
      });
      fetchBackupsList();
      fetchAuditLogs();

      if (openGmailDirectly && data.gmailUrl) {
        window.open(data.gmailUrl, '_blank');
      }
    } catch (err: any) {
      setBackupMessage({ text: err.message || 'خطا در فرایند ارسال پشتیبان به ایمیل', type: 'error' });
    } finally {
      setIsSendingEmailBackup(false);
    }
  };

  const handleRestoreSelectedSnapshot = async (backupItem: any) => {
    setIsRestoringBackup(true);
    setBackupMessage(null);
    try {
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: backupItem.id, snapshotData: backupItem.data })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'خطا در بازیابی');

      setBackupMessage({ text: 'داده‌های دیتابیس با موفقیت به این نسخه پشتیبان بازگردانی شدند.', type: 'success' });
      setSelectedBackupForRestore(null);
      fetchAuditLogs();
    } catch (err: any) {
      setBackupMessage({ text: err.message || 'خطا در بازیابی اطلاعات', type: 'error' });
    } finally {
      setIsRestoringBackup(false);
    }
  };

  useEffect(() => {
    if (activeAdminSubTab === 'security') {
      fetchAuditLogs();
    } else if (activeAdminSubTab === 'backup') {
      fetchBackupsList();
      fetchBackupSchedule();
    } else if (activeAdminSubTab === 'dashboard') {
      fetchVisitorStats();
    }
  }, [activeAdminSubTab]);

  useEffect(() => {
    fetchVisitorStats();
  }, []);

  // Backup Export and Import Handlers
  const handleExportBackup = () => {
    try {
      const backupData = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        platform: 'SIRIK FIT Imports Platform',
        settings,
        cms,
        orders,
        localInventory: localInventoryList,
        deals: dealsList,
        stores: storesList
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('download', `sirikfit-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setBackupMessage({ text: 'خروجی فایل پشتیبان (JSON) با موفقیت دریافت شد.', type: 'success' });
    } catch (err: any) {
      setBackupMessage({ text: 'خطا در دانلود فایل پشتیبان: ' + (err.message || ''), type: 'error' });
    }
  };

  const handleImportBackup = async (file: File) => {
    setIsRestoringBackup(true);
    setBackupMessage(null);
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      if (!importedData || typeof importedData !== 'object') {
        throw new Error('فرمت فایل انتخاب شده نامعتبر است.');
      }

      // Restore Settings if present
      if (importedData.settings) {
        onUpdateSettings(importedData.settings);
        await saveSettingsToFirestore(importedData.settings);
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedData.settings)
        }).catch(() => {});
      }

      // Restore CMS if present
      if (importedData.cms) {
        onUpdateCms(importedData.cms);
        await saveSettingsToFirestore(importedData.cms);
        await fetch('/api/cms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedData.cms)
        }).catch(() => {});
      }

      // Restore Orders if present
      if (Array.isArray(importedData.orders)) {
        setOrders(importedData.orders);
        for (const order of importedData.orders) {
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
          }).catch(() => {});
        }
      }

      if (Array.isArray(importedData.deals)) setDealsList(importedData.deals);
      if (Array.isArray(importedData.localInventory)) setLocalInventoryList(importedData.localInventory);
      if (Array.isArray(importedData.stores)) setStoresList(importedData.stores);

      setBackupMessage({ text: 'اطلاعات فایل پشتیبان با موفقیت بازیابی و همگام‌سازی شد.', type: 'success' });
    } catch (err: any) {
      console.error('Error restoring backup:', err);
      setBackupMessage({ text: 'خطا در بازیابی فایل پشتیبان: ' + (err.message || 'فرمت فایل ناهمخوان است.'), type: 'error' });
    } finally {
      setIsRestoringBackup(false);
    }
  };

  // Direct Image File Upload Handlers (Base64 + Auto Compressor & Resizer)
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageFile(file, 800, 800, 0.7);
      if (compressed) {
        setLogoUrl(compressed);
      }
    }
  };

  const handleHeroBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageFile(file, 1200, 800, 0.7);
      if (compressed) {
        setHeroImageUrl(compressed);
      }
    }
  };

  const [isSavingCms, setIsSavingCms] = useState(false);
  const [saveCmsSuccess, setSaveCmsSuccess] = useState(false);

  // Sync inputs if props update
  useEffect(() => {
    setAedRateInput(String(settings.aedRate));
    setCargoRateInput(String(settings.cargoRatePerKg));
    setProfitMarginInput(String(settings.profitMargin));
    setMinOrderAedInput(String(settings.minOrderAed || 200));
  }, [settings]);

  useEffect(() => {
    if (cms) {
      setHeroTitle(cms.heroTitle);
      setHeroSubtitle(cms.heroSubtitle);
      setHeroNotice(cms.heroNotice);
      setHeroImage(cms.heroImage);
      setStoresList(cms.stores && cms.stores.length > 0 ? cms.stores : DEFAULT_STORES);
      setDealsList(cms.deals || []);
      setShowLocalInventory(cms.showLocalInventory ?? true);
      setWarehouseBannerTitle(cms.warehouseBannerTitle || 'کالاهای موجود در انبار ایران (ارسال فوری)');
      setWarehouseBannerSubtitle(cms.warehouseBannerSubtitle || 'تحویل ۱ تا ۲ روزه در سراسر کشور • کالاها پلمپ و اورجینال');
      setWarehouseBannerTheme(cms.warehouseBannerTheme || 'light');
      setWarehouseBannerButtonText(cms.warehouseBannerButtonText || 'جستجو و مشاهده همه');
      setLocalInventoryList(cms.localInventory || []);
      if (cms.warehouseCategories && cms.warehouseCategories.length) {
        setWarehouseCategories(cms.warehouseCategories);
      }
      setShowAnnouncementBanner(cms.showAnnouncementBanner ?? true);
      setAnnouncementText(cms.announcementText || 'ارسال مستقیم و تضمینی کالا از دبی تا درب منزل');
      setAnnouncementBadge(cms.announcementBadge || 'تحویل ۵ الی ۷ روز کاری');
      if (cms.announcementSlogans && cms.announcementSlogans.length > 0) {
        setAnnouncementSlogans(cms.announcementSlogans);
      } else {
        setAnnouncementSlogans(DEFAULT_BANNER_SLOGANS);
      }
      setCurrencyApiUrl(cms.apiConfig?.currencyApiUrl || '');
      setScraperEndpoint(cms.apiConfig?.scraperEndpoint || '');
      if (cms.apiConfig?.scraperApiKey) setScraperApiKey(cms.apiConfig.scraperApiKey);
      if (cms.apiConfig?.enableScraperApi !== undefined) setEnableScraperApi(cms.apiConfig.enableScraperApi);
      setAutoUpdateRates(cms.apiConfig?.autoUpdateRates ?? true);
      setTelegramBotToken(cms.apiConfig?.telegramBotToken || cms.homeContent?.telegramBotToken || '');
      setAdminChatId(cms.apiConfig?.adminChatId || cms.homeContent?.adminChatId || '');
      setTelegramNotifyEnabled(cms.apiConfig?.telegramNotifyEnabled ?? true);
      setAdminDestinationEmail(cms.apiConfig?.adminDestinationEmail || cms.homeContent?.adminDestinationEmail || 'omran.javan73@gmail.com');
      setEmailNotifyEnabled(cms.apiConfig?.emailNotifyEnabled ?? true);
      setEmailjsServiceId(cms.apiConfig?.emailjsServiceId || '');
      setEmailjsTemplateId(cms.apiConfig?.emailjsTemplateId || '');
      setEmailjsPublicKey(cms.apiConfig?.emailjsPublicKey || '');
      setResendApiKey(cms.apiConfig?.resendApiKey || '');
      if (cms.apiConfig?.domainItems && cms.apiConfig.domainItems.length > 0) {
        setDomainItemsList(cms.apiConfig.domainItems);
      } else if (cms.apiConfig?.allowedDomains && cms.apiConfig.allowedDomains.length > 0) {
        setDomainItemsList(cms.apiConfig.allowedDomains.map(d => ({ domain: d, enabled: true })));
      }
      if (cms.homeBanners && cms.homeBanners.length > 0) {
        setHomeBannersList(cms.homeBanners);
      }
      try {
        const savedRestricted = localStorage.getItem('enable_domain_restriction');
        if (savedRestricted !== null) {
          setEnableDomainRestriction(JSON.parse(savedRestricted));
        } else {
          const savedFree = localStorage.getItem('is_free_extraction');
          if (savedFree !== null) {
            setEnableDomainRestriction(savedFree !== 'true');
          } else if (cms.apiConfig?.enableDomainRestriction !== undefined) {
            setEnableDomainRestriction(cms.apiConfig.enableDomainRestriction);
          }
        }
      } catch (_e) {}

      const loadedKeys = getEffectiveGeminiKeysList(cms.apiConfig?.geminiApiKeys || cms.apiConfig?.geminiApiKey);
      setGeminiApiKey1(loadedKeys[0] || (typeof cms.apiConfig?.geminiApiKey === 'string' && cms.apiConfig.geminiApiKey !== '******' ? cms.apiConfig.geminiApiKey : ''));
      setGeminiApiKey2(loadedKeys[1] || (typeof cms.apiConfig?.geminiApiKey2 === 'string' && cms.apiConfig.geminiApiKey2 !== '******' ? cms.apiConfig.geminiApiKey2 : ''));
      setGeminiApiKey3(loadedKeys[2] || (typeof cms.apiConfig?.geminiApiKey3 === 'string' && cms.apiConfig.geminiApiKey3 !== '******' ? cms.apiConfig.geminiApiKey3 : ''));

      if (cms.homeContent) {
        const titleToUse = (cms.homeContent.brandTitle || cms.homeContent.appTitle || 'SIRIK FIT').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').replace(/PRO/gi, '').replace(/OMEX/gi, '').trim() || 'SIRIK FIT';
        const subToUse = (cms.homeContent.brandSubtitle || cms.homeContent.appSubtitle || 'مکمل‌های ورزشی و اورجینال').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').trim() || 'مکمل‌های ورزشی و اورجینال';
        setTopPromoText(cms.homeContent.topPromoText || 'سیریک فیت - مکمل‌های تخصصی ورزشی و اورجینال');
        setShowTopPromo(cms.homeContent.showTopPromo ?? false);
        setAppTitleText(titleToUse);
        setAppSubtitleText(subToUse);
        setHeaderPillSlogan(cms.homeContent.headerPillSlogan || subToUse);
        setLogoUrl(cms.homeContent.logoUrl || '');
        setHeroMainHeadline(cms.homeContent.heroMainHeadline || 'فقط اورجینال، فقط');
        setHeroHighlightWord(cms.homeContent.heroHighlightWord || 'نتیجه.');
        setHeroBannerSubtitle(cms.homeContent.heroSubtitle || 'تضمین اصالت کالا، تضمین کیفیت.');
        setHeroImageUrl(cms.homeContent.heroImageUrl || '');
        setCalcBlackBadge(cms.homeContent.calcBlackBadge || '✦ خرید مستقیم از دبی');
        setCalcMainHeadline(cms.homeContent.calcMainHeadline || 'برآورد قیمت و ثبت سفارش');
        setCalcSubtitle(cms.homeContent.calcSubtitle || 'لینک محصول را وارد کنید تا قیمت تحویل در ایران فوری محاسبه شود.');
        setCalcScheduleBadge(cms.homeContent.calcScheduleBadge || '📅 ارسال هر دوشنبه و پنجشنبه');
        setTelegramHandle(cms.homeContent.telegramHandle || '@SIRIK_FIT_Support');
        setTelegramLink(cms.homeContent.telegramLink || 'https://t.me/SIRIK_FIT_Support');
        setWhatsappPhone(cms.homeContent.whatsappPhone || 'پاسخگویی سریع ۲۴ ساعته');
        setWhatsappLink(cms.homeContent.whatsappLink || 'https://wa.me/989120000000');
        setShowWhatsappCard(cms.homeContent.showWhatsappCard ?? true);
        setOfficePhone(cms.homeContent.officePhone || '021-91000000');
        setDubaiPhone(cms.homeContent.dubaiPhone || '+971-500000000');
        setShowDubaiPhone(cms.homeContent.showDubaiPhone ?? true);
        setSupportHeadline(cms.homeContent.supportHeadline || 'پشتیبانی و مشاوره تخصصی واردات دبی');
        setSupportSubtitle(cms.homeContent.supportSubtitle || 'پاسخگویی ۲۴ ساعته توسط کارشناسان تغذیه و لاجستیک');
        setShowSupportSection(cms.homeContent.showSupportSection ?? true);
        setShowTelegramCard(cms.homeContent.showTelegramCard ?? true);
        setTelegramTitle(cms.homeContent.telegramTitle || 'ارتباط با پشتیبانی در تلگرام');
        setShowEmailCard(cms.homeContent.showEmailCard ?? true);
        setEmailTitle(cms.homeContent.emailTitle || 'ارتباط از طریق ایمیل پشتیبانی');
        setShowPhoneCard(cms.homeContent.showPhoneCard ?? true);
        setPhoneTitle(cms.homeContent.phoneTitle || 'تلفن پشتیبانی');
        setTrustBadge1(cms.homeContent.trustBadge1 || 'ارسال سریع');
        setTrustBadge2(cms.homeContent.trustBadge2 || 'ضمانت اصالت');
        setTrustBadge3(cms.homeContent.trustBadge3 || '100% اورجینال');
      }

      if (cms.paymentGateway) {
        setActiveGateway(cms.paymentGateway.activeGateway || 'zarinpal');
        setMerchantId(cms.paymentGateway.merchantId || '');
        setCallbackUrl(cms.paymentGateway.callbackUrl || '/api/payment/callback');
        setIsSandbox(cms.paymentGateway.isSandbox ?? true);
        if (cms.paymentGateway.cardToCard) {
          setCardNumber(cms.paymentGateway.cardToCard.cardNumber || '');
          setBankName(cms.paymentGateway.cardToCard.bankName || '');
          setCardholderName(cms.paymentGateway.cardToCard.cardholderName || '');
          setShabaNumber(cms.paymentGateway.cardToCard.shabaNumber || '');
        }
      }
    }
  }, [cms]);

  // Database Connection Status State
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; dbId?: string; loading: boolean }>({
    connected: false,
    loading: true
  });

  // Check existing auth token and Firestore DB status
  useEffect(() => {
    const token = localStorage.getItem('omex_admin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchAdminOrders();
    }
    checkFirestoreConnection().then((res) => {
      setDbStatus({
        connected: res.connected,
        dbId: res.dbId,
        loading: false
      });
    }).catch(() => {
      setDbStatus({
        connected: false,
        loading: false
      });
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoggingIn(true);
  setLoginError('');

  // بررسی مستقیم رمز عبور (بدون نیاز به سرور)
  if (passwordInput === 'omex2025' || passwordInput === adminPassword) {
    setIsAuthenticated(true);
    localStorage.setItem('omex_admin_auth', 'true');
    setIsLoggingIn(false);
  } else {
    setLoginError('رمز عبور اشتباه است.');
    setIsLoggingIn(false);
  }
};

  const handleLogout = () => {
    localStorage.removeItem('omex_admin_token');
    setIsAuthenticated(false);
  };

  const fetchAdminOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error('Error fetching admin orders:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, status: PaymentStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: status })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: status } : o));
      }
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  const handleUpdateShippingStatus = async (orderId: string, status: ShippingStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingStatus: status })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, shippingStatus: status } : o));
      }
    } catch (err) {
      console.error('Error updating shipping status:', err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('آیا از حذف این سفارش اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      }
    } catch (err) {
      console.error('Error deleting order:', err);
    }
  };

  const handleSaveGatewaySettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingGateway(true);
    setSaveGatewaySuccess(false);

    const configPayload: PaymentGatewayConfig = {
      activeGateway,
      merchantId,
      callbackUrl,
      isSandbox,
      cardToCard: {
        cardNumber,
        bankName,
        cardholderName,
        shabaNumber
      }
    };

    // Layer 1: React Props state update
    if (cms) {
      onUpdateCms({ ...cms, paymentGateway: configPayload });
    }
    setSaveGatewaySuccess(true);

    // Layer 2: LocalStorage lock
    try {
      localStorage.setItem('sirikfit_gateway_config', JSON.stringify(configPayload));
    } catch (_e) {}

    // Layer 3: Firestore Cloud & Server API
    saveSettingsToFirestore({ paymentGateway: configPayload });
    saveCmsToFirestore({ paymentGateway: configPayload });

    try {
      const res = await fetch('/api/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload)
      });
      if (res.ok && cms) {
        onUpdateCms({ ...cms, paymentGateway: configPayload });
      }
    } catch (err) {
      console.error('Error saving gateway config:', err);
    } finally {
      setIsSavingGateway(false);
      setTimeout(() => setSaveGatewaySuccess(false), 3500);
    }
  };

  const handleExportFinancialCsv = (filteredOrdersList: Order[]) => {
    const headers = [
      'شناسه سفارش (ID)',
      'کد پیگیری (Tracking)',
      'نام مشتری (Customer)',
      'شماره تماس (Phone)',
      'تاریخ (Date)',
      'عنوان کالا (Product)',
      'قیمت پایه دبی (AED)',
      'هزینه کارگو (AED)',
      'سود دبی (تومان)',
      'مبلغ کل فاکتور (تومان)',
      'وضعیت پرداخت (Payment Status)',
      'کد مرجع تراکنش (Ref ID)'
    ];

    const rows = filteredOrdersList.map(o => {
      const cargoAed = o.weightKg * o.cargoRatePerKg;
      const profitToman = Math.round((((o.priceAed + cargoAed) * (o.profitMargin / 100)) * o.aedRate));
      return [
        o.id,
        o.trackingCode,
        `"${o.customerName}"`,
        o.phoneNumber,
        new Date(o.createdAt).toLocaleDateString('fa-IR'),
        `"${o.productTitle.replace(/"/g, '""')}"`,
        o.priceAed,
        cargoAed,
        profitToman,
        o.calculatedToman,
        o.paymentStatus === 'PAID' ? 'پرداخت شده' : o.paymentStatus === 'PENDING' ? 'در انتظار' : 'ناموفق',
        o.paymentRefId || '-'
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SIRIK-FIT-Financial-Report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Financial Settings Save with String Clean Handlers
  const handleAedRateChange = (valStr: string) => {
    const clean = valStr.replace(/^0+(?=\d)/, '');
    setAedRateInput(clean);
  };

  const handleManualAedRateChange = (valStr: string) => {
    const clean = valStr.replace(/^0+(?=\d)/, '');
    setManualAedRateInput(clean);
  };

  const handleCargoRateChange = (valStr: string) => {
    const clean = valStr.replace(/^0+(?=\d)/, '');
    setCargoRateInput(clean);
  };

  const handleProfitMarginChange = (valStr: string) => {
    const clean = valStr.replace(/^0+(?=\d)/, '');
    setProfitMarginInput(clean);
  };

  const handleTestApiRate = async () => {
    if (!currencyApiUrl) {
      setRateTestResult({ message: 'لطفاً ابتدا آدرس API استعلام نرخ را وارد کنید.', type: 'error' });
      return;
    }
    setIsTestingRateApi(true);
    setRateTestResult(null);
    try {
      const res = await fetch(`/api/currency/aed?url=${encodeURIComponent(currencyApiUrl)}&forceApi=true`);
      const data = await res.json();
      if (res.ok && data.success && data.rate) {
        setRateTestResult({
          message: `استعلام با موفقیت انجام شد. نرخ دریافتی از API: ${data.rate.toLocaleString('fa-IR')} تومان`,
          type: 'success',
          rate: data.rate
        });
        if (autoUpdateRates) {
          setAedRateInput(String(data.rate));
        }
      } else {
        setRateTestResult({
          message: data.warning || data.error || 'پاسخ نامعتبر از API استعلام نرخ. نرخ دستی جایگزین شد.',
          type: 'warning'
        });
      }
    } catch (e) {
      setRateTestResult({
        message: 'خطا در برقراری ارتباط با API استعلام نرخ. سیستم به صورت خودکار به نرخ دستی بازمی‌گردد.',
        type: 'error'
      });
    } finally {
      setIsTestingRateApi(false);
    }
  };

  const handleForceManualRate = () => {
    setAutoUpdateRates(false);
    const manualNum = parseFloat(manualAedRateInput) || 53000;
    setAedRateInput(String(manualNum));
    setRateTestResult({
      message: `سیستم قفل شد روی نرخ دستی: ${manualNum.toLocaleString('fa-IR')} تومان`,
      type: 'success'
    });
  };

  const handleSaveFinancialSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSettingsSuccess(false);

    const manualAedRate = Math.max(1, parseFloat(manualAedRateInput) || 53000);
    const aedRate = autoUpdateRates
      ? (rateTestResult?.rate || Math.max(1, parseFloat(aedRateInput) || manualAedRate))
      : manualAedRate;
    const cargoRatePerKg = Math.max(0, parseFloat(cargoRateInput) || 35);
    const profitMargin = Math.max(0, parseFloat(profitMarginInput) || 15);
    const minOrderAed = Math.max(0, parseFloat(minOrderAedInput) || 200);

    const allKeys = [geminiApiKey1, geminiApiKey2, geminiApiKey3]
      .map(k => k ? k.trim() : '')
      .filter(k => k !== '' && k !== '******');
    setEffectiveGeminiKeysList(allKeys);

    const newSettingsPayload: FinancialSettings = {
      aedRate,
      manualAedRate,
      autoUpdateRates,
      currencyApiUrl,
      cargoRatePerKg,
      profitMargin,
      minOrderAed
    };

    // Layer 1: React Props state update
    onUpdateSettings(newSettingsPayload);
    setSaveSettingsSuccess(true);

    // Layer 2: LocalStorage lock
    try {
      localStorage.setItem('sirikfit_financial_settings', JSON.stringify(newSettingsPayload));
      localStorage.setItem('omex_financial_settings', JSON.stringify(newSettingsPayload));
    } catch (_e) {}

    // Layer 3: Firestore Cloud & Server API
    saveSettingsToFirestore(newSettingsPayload);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettingsPayload)
      });

      const data = await res.json();
      if (res.ok && data.settings) {
        onUpdateSettings(data.settings);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setSaveSettingsSuccess(false), 3000);
    }
  };

  // CMS Store Handlers
  const handleAddStore = () => {
    const newStore: StoreCardItem = {
      id: 'store-' + Date.now(),
      title: 'فروشگاه جدید دبی',
      description: 'توضیحات کوتاه فروشگاه و برند‌های موجود',
      url: 'https://www.drnutrition.com',
      image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
      badge: 'ارسال سریع',
      samplePriceAed: 150,
      sampleWeightKg: 1.0
    };
    setStoresList([...storesList, newStore]);
  };

  const handleUpdateStoreField = (id: string, field: keyof StoreCardItem, value: any) => {
    setStoresList(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleDeleteStore = (id: string) => {
    setStoresList(prev => prev.filter(s => s.id !== id));
  };

  // Auto-Extract New Deal State
  const [newDealUrlInput, setNewDealUrlInput] = useState('');
  const [isExtractingNewDeal, setIsExtractingNewDeal] = useState(false);

  // Auto-Extract New Local Inventory Item State
  const [newLocalUrlInput, setNewLocalUrlInput] = useState('');
  const [isExtractingNewLocalItem, setIsExtractingNewLocalItem] = useState(false);

  const handleAutoExtractAndAddLocalItem = async () => {
    if (!newLocalUrlInput.trim()) return;
    setIsExtractingNewLocalItem(true);
    try {
      const savedKeys = getEffectiveGeminiKeysList(cms?.apiConfig?.geminiApiKeys || cms?.apiConfig?.geminiApiKey);
      let isRestricted = enableDomainRestriction;
      try {
        const savedRestricted = localStorage.getItem('enable_domain_restriction');
        if (savedRestricted !== null) {
          isRestricted = JSON.parse(savedRestricted);
        } else {
          const savedIsFree = localStorage.getItem('is_free_extraction');
          if (savedIsFree !== null) isRestricted = savedIsFree !== 'true';
        }
      } catch (_e) {}

      const scraperKeyVal = (() => {
        try { return localStorage.getItem('scraper_api_key') || cms?.apiConfig?.scraperApiKey || ''; } catch (_e) { return cms?.apiConfig?.scraperApiKey || ''; }
      })();

      const res = await fetch('/api/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newLocalUrlInput.trim(),
          apiKey: scraperKeyVal,
          scraper_api_key: scraperKeyVal,
          scraperApiKey: scraperKeyVal,
          enable_scraper_api: true,
          geminiApiKeys: savedKeys,
          geminiApiKey: savedKeys[0] || '',
          is_free_extraction: !isRestricted,
          enable_domain_restriction: isRestricted
        })
      });

      const data: any = await res.json();
      const priceAed = Number(data?.priceAed || data?.price_aed) || 150;
      const currentAedRate = settings?.aedRate || 19500;
      const calculatedPriceToman = priceAed > 0 ? Math.round(priceAed * currentAedRate) : 3500000;
      const originalPriceAed = Number(data?.originalPriceAed || data?.original_price_aed) || 0;
      const originalPriceToman = originalPriceAed > 0 ? Math.round(originalPriceAed * currentAedRate) : undefined;

      const newItem: LocalInventoryItem = {
        id: 'local-' + Date.now(),
        title: data?.title || 'محصول جدید انبار ایران',
        image: data?.image || data?.image_url || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
        priceToman: calculatedPriceToman,
        originalPriceToman: originalPriceToman && originalPriceToman > calculatedPriceToman ? originalPriceToman : undefined,
        stockQuantity: 5,
        category: data?.category || '💊 مکمل‌های ورزشی',
        description: data?.description || 'اورجینال - موجود در انبار ایران جهت ارسال فوری',
        deliveryBadge: '⚡ تحویل فوری ۲۴ ساعته',
        inStock: true
      };

      setLocalInventoryList(prev => [newItem, ...prev]);
      setNewLocalUrlInput('');
    } catch (err) {
      console.error('Error auto extracting local item:', err);
      handleAddLocalItem();
    } finally {
      setIsExtractingNewLocalItem(false);
    }
  };

  // CMS Deal Handlers
  const handleAutoExtractAndAddDeal = async () => {
    if (!newDealUrlInput.trim()) return;
    setIsExtractingNewDeal(true);
    try {
      const savedKeys = getEffectiveGeminiKeysList(cms?.apiConfig?.geminiApiKeys || cms?.apiConfig?.geminiApiKey);
      let isRestricted = enableDomainRestriction;
      try {
        const savedRestricted = localStorage.getItem('enable_domain_restriction');
        if (savedRestricted !== null) {
          isRestricted = JSON.parse(savedRestricted);
        } else {
          const savedIsFree = localStorage.getItem('is_free_extraction');
          if (savedIsFree !== null) isRestricted = savedIsFree !== 'true';
        }
      } catch (_e) {}

      const scraperKeyVal = (() => {
        try { return localStorage.getItem('scraper_api_key') || cms?.apiConfig?.scraperApiKey || ''; } catch (_e) { return cms?.apiConfig?.scraperApiKey || ''; }
      })();

      const res = await fetch('/api/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newDealUrlInput.trim(),
          apiKey: scraperKeyVal,
          scraper_api_key: scraperKeyVal,
          scraperApiKey: scraperKeyVal,
          enable_scraper_api: true,
          geminiApiKeys: savedKeys,
          geminiApiKey: savedKeys[0] || '',
          is_free_extraction: !isRestricted,
          enable_domain_restriction: isRestricted
        })
      });
      const data: any = await res.json();
      const priceAed = Number(data?.priceAed || data?.price_aed) || 150;
      const originalPriceAed = Number(data?.originalPriceAed || data?.original_price_aed) || 0;
      let discountPercent = Number(data?.discountPercent) || 0;
      if (!discountPercent && originalPriceAed > priceAed) {
        discountPercent = Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100);
      }
      const badgeText = discountPercent > 0 ? `-${discountPercent}%` : '🔥 پیشنهاد ویژه';

      const newDeal: FeaturedDeal = {
        id: 'deal-' + Date.now(),
        title: data?.title || 'محصول جدید پیشنهاد ویژه',
        brand: data?.brand || data?.storeName || 'برند معتبر',
        category: '💊 مکمل‌های ورزشی',
        priceAed,
        originalPriceAed: originalPriceAed > priceAed ? originalPriceAed : undefined,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        weightKg: Number(data?.weightKg) || 0.8,
        image: data?.image || data?.image_url || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
        url: newDealUrlInput.trim(),
        storeName: data?.storeName || 'دبی',
        badge: badgeText,
        section: 'featured',
        isFeaturedInCalculator: true,
        isActive: true
      };

      setDealsList(prev => [newDeal, ...prev]);
      setNewDealUrlInput('');
    } catch (err) {
      console.error('Error auto extracting deal:', err);
      handleAddDeal();
    } finally {
      setIsExtractingNewDeal(false);
    }
  };

  const handleAddDeal = () => {
    const newDeal: FeaturedDeal = {
      id: 'deal-' + Date.now(),
      title: 'محصول جدید دبی - پیشنهاد ویژه',
      brand: 'برند معتبر',
      category: '💊 مکمل‌های ورزشی',
      priceAed: 180,
      originalPriceAed: 220,
      discountPercent: 18,
      weightKg: 1.2,
      image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
      url: 'https://www.drnutrition.com',
      storeName: 'Dr. Nutrition',
      badge: '🔥 پیشنهاد ویژه',
      section: 'featured',
      isFeaturedInCalculator: true,
      isActive: true
    };
    setDealsList(prev => [...prev, newDeal]);
  };

  const handleUpdateDealField = (id: string, field: keyof FeaturedDeal, value: any) => {
    setDealsList(prev => prev.map(d => {
      if (d.id !== id) return d;
      const updated = { ...d, [field]: value };
      if (field === 'priceAed' || field === 'originalPriceAed') {
        const pAed = Number(updated.priceAed) || 0;
        const origAed = Number(updated.originalPriceAed) || 0;
        if (origAed > pAed && pAed > 0) {
          const disc = Math.round(((origAed - pAed) / origAed) * 100);
          updated.discountPercent = disc;
          if (!updated.badge || updated.badge.startsWith('-') || updated.badge.includes('پیشنهاد')) {
            updated.badge = `-${disc}%`;
          }
        }
      }
      return updated;
    }));
  };

  const handleDeleteDeal = (id: string) => {
    setDealsList(prev => prev.filter(d => d.id !== id));
  };

  // Local Inventory Handlers
  const handleAddLocalItem = () => {
    const newItem: LocalInventoryItem = {
      id: 'local-' + Date.now(),
      title: 'محصول جدید انبار تهران',
      image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
      priceToman: 3500000,
      originalPriceToman: 4000000,
      stockQuantity: 10,
      category: '💊 مکمل‌های ورزشی',
      description: 'تحویل ۱ تا ۲ روزه در سراسر کشور - پلمپ اورجینال',
      deliveryBadge: '⚡ تحویل فوری ۲۴ ساعته',
      inStock: true
    };
    setLocalInventoryList(prev => [...prev, newItem]);
  };

  const handleUpdateLocalItemField = (id: string, field: keyof LocalInventoryItem, value: any) => {
    setLocalInventoryList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDeleteLocalItem = (id: string) => {
    setLocalInventoryList(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateWarehouseCategoryField = (id: string, field: keyof WarehouseCategory, value: string) => {
    setWarehouseCategories(prev => prev.map(cat => cat.id === id ? { ...cat, [field]: value } : cat));
  };

  const applyHomeContentToDom = (homeSettings: HomePageSettings) => {
    try {
      // 1. Top Promo Strip
      const topPromoEl = document.getElementById('top-promo-strip');
      if (topPromoEl) {
        if (homeSettings.showTopPromo) {
          topPromoEl.classList.remove('hidden');
          topPromoEl.style.display = 'flex';
        } else {
          topPromoEl.classList.add('hidden');
          topPromoEl.style.display = 'none';
        }
      }
      const topPromoTextEl = document.getElementById('top-promo-text');
      if (topPromoTextEl) {
        topPromoTextEl.textContent = homeSettings.topPromoText;
      }

      // 2. Branding & Header
      const appTitleEl = document.getElementById('header-app-title');
      if (appTitleEl) {
        appTitleEl.textContent = homeSettings.appTitle;
      }
      const appSubtitleEl = document.getElementById('header-app-subtitle');
      if (appSubtitleEl) {
        appSubtitleEl.textContent = homeSettings.appSubtitle;
      }
      const appLogoEl = document.getElementById('header-app-logo');
      if (appLogoEl) {
        if (appLogoEl.tagName.toLowerCase() === 'img') {
          (appLogoEl as HTMLImageElement).src = homeSettings.logoUrl || '';
        } else {
          appLogoEl.textContent = (homeSettings.appSubtitle || 'OMX').slice(0, 4);
        }
      }

      // 3. Calculator Box Content
      const calcBlackBadgeEl = document.getElementById('calc-black-badge');
      if (calcBlackBadgeEl) {
        calcBlackBadgeEl.textContent = homeSettings.calcBlackBadge;
      }
      const calcHeadlineEl = document.getElementById('calc-main-headline');
      if (calcHeadlineEl) {
        calcHeadlineEl.textContent = homeSettings.calcMainHeadline;
      }
      const calcSubtitleEl = document.getElementById('calc-subtitle');
      if (calcSubtitleEl) {
        calcSubtitleEl.textContent = homeSettings.calcSubtitle;
      }
      const calcScheduleEl = document.getElementById('calc-schedule-badge');
      if (calcScheduleEl) {
        calcScheduleEl.textContent = homeSettings.calcScheduleBadge;
      }

      // 4. Support & Contact Section
      const supportSectionEl = document.getElementById('support-section');
      if (supportSectionEl) {
        supportSectionEl.style.display = homeSettings.showSupportSection ? 'block' : 'none';
      }
      const supportHeadlineEl = document.getElementById('support-headline');
      if (supportHeadlineEl) {
        supportHeadlineEl.textContent = homeSettings.supportHeadline;
      }
      const supportSubtitleEl = document.getElementById('support-subtitle');
      if (supportSubtitleEl) {
        supportSubtitleEl.textContent = homeSettings.supportSubtitle;
      }
      const telegramTextEl = document.getElementById('telegram-handle-text');
      if (telegramTextEl) {
        telegramTextEl.textContent = homeSettings.telegramHandle;
      }
      const telegramLinkEl = document.getElementById('telegram-link-element') as HTMLAnchorElement | null;
      if (telegramLinkEl) {
        telegramLinkEl.href = homeSettings.telegramLink;
      }
      const emailTextEl = document.getElementById('email-address-text');
      if (emailTextEl) {
        emailTextEl.textContent = adminDestinationEmail || 'omran.javan73@gmail.com';
      }
      const emailLinkEl = document.getElementById('email-link-element') as HTMLAnchorElement | null;
      if (emailLinkEl) {
        emailLinkEl.href = `mailto:${adminDestinationEmail || 'omran.javan73@gmail.com'}`;
      }
      const officePhoneEl = document.getElementById('office-phone-number');
      if (officePhoneEl) {
        officePhoneEl.textContent = homeSettings.officePhone;
      }
      const officePhoneLinkEl = document.getElementById('office-phone-link-element') as HTMLAnchorElement | null;
      if (officePhoneLinkEl) {
        officePhoneLinkEl.href = `tel:${homeSettings.officePhone.replace(/[^0-9+]/g, '')}`;
      }

      // 5. Trust Badges
      const trust1 = document.getElementById('trust-badge-1');
      if (trust1) trust1.textContent = homeSettings.trustBadge1;
      const trust2 = document.getElementById('trust-badge-2');
      if (trust2) trust2.textContent = homeSettings.trustBadge2;
      const trust3 = document.getElementById('trust-badge-3');
      if (trust3) trust3.textContent = homeSettings.trustBadge3;
    } catch (e) {
      console.error('Error applying home content to DOM:', e);
    }
  };

  const handleSaveHomeContent = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsSavingCms(true);
    setSaveCmsSuccess(false);

    try {
      localStorage.setItem('enable_domain_restriction', JSON.stringify(enableDomainRestriction));
      localStorage.setItem('is_free_extraction', (!enableDomainRestriction).toString());
    } catch (_e) {}

    const sanitizedTitle = (appTitleText || 'SIRIK FIT').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').replace(/PRO/gi, '').replace(/OMEX/gi, '').trim() || 'SIRIK FIT';
    const sanitizedSubtitle = (appSubtitleText || 'مکملهای ورزشی و اورجینال').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').trim() || 'مکملهای ورزشی و اورجینال';
    const sanitizedPillSlogan = (headerPillSlogan || 'مکملهای ورزشی و اورجینال').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').trim() || 'مکملهای ورزشی و اورجینال';

    const homeContentData: HomePageSettings = {
      topPromoText,
      showTopPromo,
      appTitle: sanitizedTitle,
      appSubtitle: sanitizedSubtitle,
      brandTitle: sanitizedTitle,
      brandSubtitle: sanitizedSubtitle,
      headerPillSlogan: sanitizedPillSlogan,
      logoUrl,
      heroMainHeadline,
      heroHighlightWord,
      heroSubtitle: heroBannerSubtitle,
      heroImageUrl,
      calcBlackBadge,
      calcMainHeadline,
      calcSubtitle,
      calcScheduleBadge,
      telegramHandle,
      telegramLink,
      whatsappPhone,
      whatsappLink,
      showWhatsappCard,
      officePhone,
      dubaiPhone,
      showDubaiPhone,
      supportHeadline,
      supportSubtitle,
      showSupportSection,
      showTelegramCard,
      telegramTitle,
      showEmailCard,
      emailTitle,
      showPhoneCard,
      phoneTitle,
      trustBadge1,
      trustBadge2,
      trustBadge3
    };

    const updatedCms: CmsConfig = {
      heroTitle,
      heroSubtitle,
      heroNotice,
      heroImage,
      showAnnouncementBanner,
      announcementText: announcementSlogans[0] || announcementText || 'ارسال مستقیم و تضمینی کالا از دبی تا درب منزل',
      announcementBadge,
      announcementSlogans,
      homeBanners: homeBannersList,
      stores: storesList,
      deals: dealsList,
      showLocalInventory,
      warehouseBannerTitle,
      warehouseBannerSubtitle,
      warehouseBannerTheme,
      warehouseBannerButtonText,
      localInventory: localInventoryList,
      warehouseCategories,
      homeContent: homeContentData,
      apiConfig: {
        currencyApiUrl,
        autoUpdateRates,
        scraperEndpoint,
        geminiApiKey: geminiApiKey1 || cms?.apiConfig?.geminiApiKey || '',
        geminiApiKey1: geminiApiKey1 || '',
        geminiApiKey2: geminiApiKey2 || '',
        geminiApiKey3: geminiApiKey3 || '',
        geminiApiKeys: [geminiApiKey1, geminiApiKey2, geminiApiKey3].filter(k => k && k.trim() !== '' && k !== '******'),
        telegramBotToken,
        adminChatId,
        telegramNotifyEnabled,
        adminDestinationEmail,
        emailNotifyEnabled,
        emailjsServiceId,
        emailjsTemplateId,
        emailjsPublicKey,
        resendApiKey,
        domainItems: domainItemsList,
        allowedDomains: domainItemsList.filter(d => d.enabled).map(d => d.domain),
        enableDomainRestriction: enableDomainRestriction,
        scraperApiKey: scraperApiKey,
        enableScraperApi: enableScraperApi
      }
    };

    // Immediate DOM element update for #home elements dynamically via JS
    applyHomeContentToDom(homeContentData);

    // Layer 1: React State instant update
    onUpdateCms(updatedCms);
    setSaveCmsSuccess(true);

    // Layer 2: LocalStorage lock
    try {
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(updatedCms));
      localStorage.setItem('omex_home_cms', JSON.stringify(updatedCms));
      localStorage.setItem('sirikfit_home_content', JSON.stringify(homeContentData));
    } catch (_e) {}

    // Layer 3: Firestore Cloud & Server API
    saveCmsToFirestore(updatedCms);
    saveSettingsToFirestore(updatedCms);

    try {
      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCms)
      });

      let data: any = {};
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        data = await res.json();
      }
      if (res.ok && data.cms) {
        onUpdateCms(data.cms);
      }
    } catch (err) {
      console.error('Error saving home content CMS:', err);
    } finally {
      setIsSavingCms(false);
    }
  };

  const handleSaveCms = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsSavingCms(true);
    setSaveCmsSuccess(false);

    try {
      localStorage.setItem('enable_domain_restriction', JSON.stringify(enableDomainRestriction));
      localStorage.setItem('is_free_extraction', (!enableDomainRestriction).toString());
    } catch (_e) {}

    const currentHomeContent: HomePageSettings = {
      topPromoText,
      showTopPromo,
      appTitle: appTitleText,
      appSubtitle: appSubtitleText,
      headerPillSlogan,
      logoUrl,
      heroMainHeadline,
      heroHighlightWord,
      heroSubtitle: heroBannerSubtitle,
      heroImageUrl,
      calcBlackBadge,
      calcMainHeadline,
      calcSubtitle,
      calcScheduleBadge,
      telegramHandle,
      telegramLink,
      whatsappPhone,
      whatsappLink,
      showWhatsappCard,
      officePhone,
      dubaiPhone,
      showDubaiPhone,
      supportHeadline,
      supportSubtitle,
      showSupportSection,
      showTelegramCard,
      telegramTitle,
      showEmailCard,
      emailTitle,
      showPhoneCard,
      phoneTitle,
      trustBadge1,
      trustBadge2,
      trustBadge3
    };

    const updatedCms: CmsConfig = {
      heroTitle,
      heroSubtitle,
      heroNotice,
      heroImage,
      showAnnouncementBanner,
      announcementText,
      announcementBadge,
      homeBanners: homeBannersList,
      stores: storesList,
      deals: dealsList,
      showLocalInventory,
      warehouseBannerTitle,
      warehouseBannerSubtitle,
      warehouseBannerTheme,
      warehouseBannerButtonText,
      localInventory: localInventoryList,
      warehouseCategories,
      homeContent: currentHomeContent,
      apiConfig: {
        currencyApiUrl,
        autoUpdateRates,
        scraperEndpoint,
        geminiApiKey: geminiApiKey1 || cms?.apiConfig?.geminiApiKey || '******',
        geminiApiKey1: geminiApiKey1 || '',
        geminiApiKey2: geminiApiKey2 || '',
        geminiApiKey3: geminiApiKey3 || '',
        geminiApiKeys: [geminiApiKey1, geminiApiKey2, geminiApiKey3].filter(k => k && k.trim() !== '' && k !== '******'),
        telegramBotToken,
        adminChatId,
        telegramNotifyEnabled,
        adminDestinationEmail,
        emailNotifyEnabled,
        emailjsServiceId,
        emailjsTemplateId,
        emailjsPublicKey,
        resendApiKey,
        domainItems: domainItemsList,
        allowedDomains: domainItemsList.filter(d => d.enabled).map(d => d.domain),
        enableDomainRestriction: enableDomainRestriction,
        scraperApiKey: scraperApiKey,
        enableScraperApi: enableScraperApi
      }
    };

    applyHomeContentToDom(currentHomeContent);

    // Layer 1: React Props state update
    onUpdateCms(updatedCms);
    setSaveCmsSuccess(true);

    // Layer 2: LocalStorage lock
    try {
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(updatedCms));
      localStorage.setItem('omex_home_cms', JSON.stringify(updatedCms));
      if (currentHomeContent) {
        localStorage.setItem('sirikfit_home_content', JSON.stringify(currentHomeContent));
      }
    } catch (_e) {}

    // Layer 3: Firestore Cloud & Server API
    saveCmsToFirestore(updatedCms);
    saveSettingsToFirestore(updatedCms);

    try {
      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCms)
      });

      let data: any = {};
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        data = await res.json();
      }
      if (res.ok && data.cms) {
        onUpdateCms(data.cms);
      }
    } catch (err) {
      console.error('Error saving CMS:', err);
    } finally {
      setIsSavingCms(false);
      setTimeout(() => setSaveCmsSuccess(false), 3000);
    }
  };

  // Stats for Dashboard
  const totalRevenueToman = orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.calculatedToman, 0);

  const paidOrdersCount = orders.filter(o => o.paymentStatus === 'PAID').length;
  const pendingOrdersCount = orders.filter(o => o.paymentStatus === 'PENDING').length;
  const shippedOrdersCount = orders.filter(o => o.shippingStatus === 'SHIPPED' || o.shippingStatus === 'DELIVERED').length;

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.customerName.includes(orderSearchQuery) ||
      o.phoneNumber.includes(orderSearchQuery) ||
      o.trackingCode.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.productTitle.includes(orderSearchQuery);

    if (orderStatusFilter === 'ALL') return matchesSearch;
    if (orderStatusFilter === 'PAID') return matchesSearch && o.paymentStatus === 'PAID';
    if (orderStatusFilter === 'PENDING') return matchesSearch && o.paymentStatus === 'PENDING';
    if (orderStatusFilter === 'SHIPPED') return matchesSearch && (o.shippingStatus === 'SHIPPED' || o.shippingStatus === 'DELIVERED');
    return matchesSearch;
  });

  // Login Modal / Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xl text-neutral-800 font-['Vazirmatn',sans-serif]">
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-neutral-900">ورود به پنل مدیریت SIRIK FIT</h2>
          <p className="text-xs text-neutral-500 font-medium">برای دسترسی به داشبورد و تنظیمات، رمز عبور را وارد کنید</p>
        </div>

        {loginError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1.5">رمز عبور مدیر:</label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="رمز عبور را وارد کنید (پیش‌فرض: omex2025)"
              className="w-full bg-neutral-50 border border-neutral-300 focus:border-black focus:bg-white text-neutral-900 text-sm px-4 py-2.5 rounded-xl focus:outline-none transition font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold text-sm py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoggingIn ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال بررسی...</span>
              </>
            ) : (
              <span>ورود به سامانه</span>
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-['Vazirmatn',sans-serif]">
      {/* Top Admin Header Bar - Matching Screenshot Design */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 shadow-2xs">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">پنل اختصاصی مدیریت SIRIK FIT</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">آمار، سفارشات، نرخ‌ها و محتوا</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">خروج از پنل</span>
        </button>
      </div>

      {/* Admin Sub-Tabs Navigation Menu */}
      <div className="admin-menu flex flex-wrap items-center gap-2 sm:gap-2.5 p-2 bg-slate-100/80 rounded-3xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveAdminSubTab('pricingRules')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'pricingRules'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <Calculator className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>قوانین قیمت‌گذاری</span>
          <span className="text-xs">🧮</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('orders')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'orders'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span>سفارشات</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            activeAdminSubTab === 'orders' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {toPersianDigits(orders.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('accounting')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'accounting'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>حسابداری و مالی</span>
          <span className="text-xs">📈</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('gateway')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'gateway'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0 text-rose-500" />
          <span>تنظیمات درگاه</span>
          <span className="text-xs">💳</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('dashboard')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'dashboard'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>آمار و گزارشات</span>
          <span className="text-xs">📊</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('homeContent')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'homeContent'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <Home className="w-4 h-4 shrink-0 text-sky-500" />
          <span>ظاهر و محتوای سایت</span>
          <span className="text-xs">🎨</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('deals')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'deals'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
          <span>پیشنهادها</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            activeAdminSubTab === 'deals' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {toPersianDigits(dealsList.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('inventory')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'inventory'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <PackageCheck className="w-4 h-4 shrink-0 text-amber-600" />
          <span>انبار ایران</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            activeAdminSubTab === 'inventory' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {toPersianDigits(localInventoryList.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('cms')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'cms'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
          <span>تنظیمات عمومی</span>
          <span className="text-xs">⚙️</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('apiSettings')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'apiSettings'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <Key className="w-4 h-4 shrink-0 text-amber-500" />
          <span>تنظیمات API</span>
          <span className="text-xs">🔑</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('security')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'security'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <Lock className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>رمز عبور و امنیت</span>
          <span className="text-xs">🔐</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('backup')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'backup'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <Database className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>بک‌آپ و پشتیبان‌گیری</span>
          <span className="text-xs">💾</span>
        </button>
      </div>

      {/* SUB-TAB 1: DASHBOARD & STATS */}
      {activeAdminSubTab === 'dashboard' && (
        <div className="space-y-5">
          {/* Revenue & Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">مجموع درآمد موفق</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-600">
                {formatToman(totalRevenueToman)}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-1">از سفارشات پرداخت‌شده</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">کل سفارشات ثبت شده</span>
                <ShoppingBag className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {orders.length} <span className="text-xs font-normal text-slate-500">سفارش</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-1">{paidOrdersCount} پرداخت شده</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">در انتظار پرداخت</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-600">
                {pendingOrdersCount} <span className="text-xs font-normal text-slate-500">سفارش</span>
              </div>
              <span className="text-[10px] text-amber-600 font-semibold block mt-1">نیازمند پیگیری</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">ارسال شده از دبی</span>
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-600">
                {shippedOrdersCount} <span className="text-xs font-normal text-slate-500">سفارش</span>
              </div>
              <span className="text-[10px] text-blue-600 font-semibold block mt-1">در مسیر یا تحویل شده</span>
            </div>
          </div>

          {/* Recent Activity List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              <span>آخرین سفارشات دریافتی</span>
            </h3>

            <div className="space-y-2.5">
              {orders.slice(0, 5).map(order => (
                <div key={order.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900 block">{order.customerName} ({order.phoneNumber})</span>
                    <span className="text-slate-500 line-clamp-1">{order.productTitle}</span>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="font-black text-emerald-700 block">{formatToman(order.calculatedToman)}</span>
                    <span className="text-[10px] font-mono text-slate-500 dir-ltr">{order.trackingCode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SITE VISITS & BUYERS ANALYTICS SECTION */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 font-['Vazirmatn',sans-serif]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">آمار بازدیدکنندگان و خریداران سایت (Site Visits)</h3>
                  <p className="text-[11px] text-slate-500 font-medium">تحلیل ترافیک زنده، تعداد خریداران و نرخ تبدیل تفکیک‌شده زمان</p>
                </div>
              </div>

              {/* Time Period Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setVisitorPeriod('today')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${visitorPeriod === 'today' ? 'bg-slate-900 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  امروز
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorPeriod('thisWeek')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${visitorPeriod === 'thisWeek' ? 'bg-slate-900 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  این هفته
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorPeriod('thisMonth')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${visitorPeriod === 'thisMonth' ? 'bg-slate-900 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  این ماه
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorPeriod('thisYear')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${visitorPeriod === 'thisYear' ? 'bg-slate-900 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  امسال
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorPeriod('allTime')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${visitorPeriod === 'allTime' ? 'bg-slate-900 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  کل
                </button>
              </div>
            </div>

            {/* Metric Cards for Selected Time Period */}
            {(() => {
              const periodData = visitorStatsData?.stats?.[visitorPeriod] || {
                totalVisits: visitorStatsData?.recentVisits?.length || 0,
                uniqueVisitors: 1,
                totalOrders: orders.length,
                uniqueBuyers: new Set(orders.map((o: any) => o.phoneNumber || o.id)).size,
                totalRevenueToman,
                conversionRate: '0.0'
              };

              return (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">👀 کل بازدیدها</span>
                    <span className="text-xl font-black text-slate-900 dir-ltr block">{periodData.totalVisits}</span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">ترافیک کل ثبت‌شده</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">👤 بازدیدکننده یکتا</span>
                    <span className="text-xl font-black text-indigo-600 dir-ltr block">{periodData.uniqueVisitors}</span>
                    <span className="text-[10px] text-indigo-600 font-medium mt-0.5 block">بر اساس IP / Session</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">🛒 خریداران موفق</span>
                    <span className="text-xl font-black text-emerald-600 dir-ltr block">{periodData.totalOrders}</span>
                    <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">{periodData.uniqueBuyers} مشتری منحصر به فرد</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">📈 نرخ تبدیل (Conversion)</span>
                    <span className="text-xl font-black text-amber-600 dir-ltr block">٪{periodData.conversionRate}</span>
                    <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">نسبت خریدار به بازدیدکننده</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 col-span-2 lg:col-span-1">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">💰 درآمد دوره</span>
                    <span className="text-base font-black text-rose-600 block">{formatToman(periodData.totalRevenueToman)}</span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">مجموع فاکتورها</span>
                  </div>
                </div>
              );
            })()}

            {/* Daily Trend Progress Chart */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-indigo-600" />
                  <span>بررسی مقایسه‌ای 7 روز اخیر (بازدیدها vs خریداران)</span>
                </h4>
                <button
                  type="button"
                  onClick={fetchVisitorStats}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingVisitorStats ? 'animate-spin' : ''}`} />
                  <span>به‌روزرسانی زنده</span>
                </button>
              </div>

              <div className="space-y-2">
                {(visitorStatsData?.chartData || []).map((day: any) => {
                  const maxVisits = Math.max(...(visitorStatsData?.chartData || []).map((d: any) => d.visits), 1);
                  const visitPct = Math.min(100, Math.round((day.visits / maxVisits) * 100));

                  return (
                    <div key={day.date} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="w-28 font-extrabold text-slate-800 shrink-0">{day.label}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(6, visitPct)}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-slate-600 w-16 text-left shrink-0">{day.visits} بازدید</span>
                        </div>
                      </div>
                      <div className="w-36 text-left shrink-0">
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md inline-block">
                          🛒 {day.buyers} سفارش ({formatToman(day.revenue)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Live Visits Log */}
            {visitorStatsData?.recentVisits && visitorStatsData.recentVisits.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-extrabold text-slate-800 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>آخرین ورودهای زنده به سایت (Live Visits Log)</span>
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-right text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold">
                      <tr>
                        <th className="p-2.5">شناسه / IP</th>
                        <th className="p-2.5">صفحه بازدیدشده</th>
                        <th className="p-2.5">منبع ارجاع (Referrer)</th>
                        <th className="p-2.5 text-left">زمان دقیق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {visitorStatsData.recentVisits.slice(0, 8).map((v: any) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-900 font-bold">{v.ipAddress || v.visitorId}</td>
                          <td className="p-2.5 font-extrabold text-indigo-600">{v.page}</td>
                          <td className="p-2.5 text-slate-500 truncate max-w-[160px]">{v.referrer || 'مستقیم'}</td>
                          <td className="p-2.5 text-left font-mono text-slate-400">{formatPersianDate(v.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FULL ORDERS MANAGEMENT (#admin-orders) */}
      {activeAdminSubTab === 'orders' && (
        <div id="admin-orders" className="space-y-4 font-['Vazirmatn',sans-serif]">
          {/* Top Filter & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس نام، شماره، کد پیگیری یا عنوان محصول..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs pr-9 pl-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-2.5 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="ALL">همه وضعیت‌های سفارش ({orders.length})</option>
                <option value="PAID">پرداخت شده</option>
                <option value="PENDING">در انتظار پرداخت</option>
                <option value="SHIPPED">ارسال شده / تکمیل شده</option>
              </select>

              <button
                onClick={fetchAdminOrders}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 p-2.5 rounded-xl transition text-slate-700 cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
                title="به‌روزرسانی لیست سفارشات"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin text-slate-900' : ''}`} />
                <span className="hidden sm:inline">به‌روزرسانی</span>
              </button>
            </div>
          </div>

          {/* Orders Data Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                <p>هیچ سفارشی مطابق جستجوی شما یافت نشد.</p>
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-extrabold text-[11px]">
                    <th className="p-3">کد & تاریخ سفارش</th>
                    <th className="p-3">اطلاعات خریدار</th>
                    <th className="p-3 max-w-xs">خلاصه محصول & متغیر</th>
                    <th className="p-3">لینک کالا در دبی</th>
                    <th className="p-3">مبلغ پرداختی</th>
                    <th className="p-3">تغییر وضعیت سفارش</th>
                    <th className="p-3 text-center">عملیات سریع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    let cleanPhone = order.phoneNumber.replace(/[^0-9]/g, '');
                    if (cleanPhone.startsWith('0')) cleanPhone = '98' + cleanPhone.substring(1);

                    const currentStatus = order.shippingStatus || 'PENDING_BUY';

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/90 transition group">
                        {/* Order ID & Date */}
                        <td className="p-3 align-top">
                          <span className="font-mono font-bold text-slate-900 text-xs dir-ltr block bg-slate-100 px-2 py-0.5 rounded-md w-max">
                            {order.trackingCode}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-1">
                            {formatPersianDate(order.createdAt)}
                          </span>
                        </td>

                        {/* Customer Details */}
                        <td className="p-3 align-top max-w-[200px]">
                          <div className="font-extrabold text-slate-900">{order.customerName}</div>
                          <div className="text-[11px] font-mono text-slate-600 dir-ltr">{order.phoneNumber}</div>
                          {order.deliveryAddress && (
                            <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug" title={order.deliveryAddress}>
                              📍 {order.deliveryAddress}
                            </div>
                          )}
                        </td>

                        {/* Product Summary */}
                        <td className="p-3 align-top max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-2 leading-tight">{order.productTitle}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                              🎨 متغیر: {order.selectedOption || 'اصلی (پیش‌فرض)'}
                            </span>
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                              {formatAed(order.priceAed)}
                            </span>
                          </div>
                        </td>

                        {/* Direct Source Link & One-Click Copy Button */}
                        <td className="p-3 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={order.productUrl || 'https://drnutrition.com'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl transition shadow-2xs cursor-pointer shrink-0"
                              title="باز کردن لینک اصلی کالا در دبی"
                            >
                              <ExternalLink className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>باز کردن لینک در دبی</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyProductUrl(order.productUrl || 'https://drnutrition.com', order.id)}
                              className={`relative p-1.5 rounded-xl transition border cursor-pointer shrink-0 ${
                                copiedOrderId === order.id
                                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
                              }`}
                              title={copiedOrderId === order.id ? 'کپی شد!' : 'کپی لینک کالا'}
                            >
                              {copiedOrderId === order.id ? (
                                <Check className="w-3.5 h-3.5 text-white shrink-0" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                              )}
                              {copiedOrderId === order.id && (
                                <span className="absolute -top-7 right-1/2 translate-x-1/2 bg-emerald-800 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-md whitespace-nowrap pointer-events-none animate-fade-in z-20">
                                  کپی شد!
                                </span>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Price Paid */}
                        <td className="p-3 align-top">
                          <div className="font-black text-rose-600 text-sm">
                            {formatToman(order.calculatedToman)}
                          </div>
                          <div className="mt-1">
                            {order.paymentStatus === 'PAID' ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                پرداخت شده
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                در انتظار پرداخت
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Order Status Selector Dropdown */}
                        <td className="p-3 align-top">
                          <select
                            value={currentStatus}
                            onChange={(e) => handleUpdateShippingStatus(order.id, e.target.value as ShippingStatus)}
                            className={`text-[11px] font-extrabold px-2.5 py-1.5 rounded-xl border focus:outline-none cursor-pointer w-full ${
                              currentStatus === 'COMPLETED' || currentStatus === 'DELIVERED'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : currentStatus === 'SHIPPED_IRAN' || currentStatus === 'SHIPPED'
                                ? 'bg-sky-50 border-sky-300 text-sky-800'
                                : currentStatus === 'DUBAI_WAREHOUSE'
                                ? 'bg-purple-50 border-purple-300 text-purple-800'
                                : currentStatus === 'PURCHASED' || currentStatus === 'PROCESSING'
                                ? 'bg-blue-50 border-blue-300 text-blue-800'
                                : 'bg-amber-50 border-amber-300 text-amber-800'
                            }`}
                          >
                            <option value="PENDING_BUY">⏳ در انتظار خرید از دبی</option>
                            <option value="PURCHASED">🛍️ خریداری شده</option>
                            <option value="DUBAI_WAREHOUSE">🏢 در انبار دبی</option>
                            <option value="SHIPPED_IRAN">✈️ ارسال شده به ایران</option>
                            <option value="COMPLETED">✅ تکمیل شده</option>
                          </select>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3 align-top text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <a
                              href={`tel:${cleanPhone}`}
                              className="p-1.5 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                              title="تماس تلفنی مستقیم با خریدار"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>

                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/notify/telegram', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ orderId: order.id, orderData: order })
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    alert('✅ هشدار سفارش به تلگرام ادمین ارسال شد!');
                                  } else {
                                    alert('❌ خطا در ارسال پیام تلگرام: ' + (data.error || 'پاسخ ناموفق'));
                                  }
                                } catch (e) {
                                  alert('خطا در اتصال به سرور.');
                                }
                              }}
                              className="p-1.5 text-sky-600 hover:bg-sky-50 border border-sky-200 rounded-lg transition cursor-pointer"
                              title="ارسال مجدد پیام هشدار به تلگرام ادمین"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/notify/email', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ orderId: order.id, orderData: order })
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    alert('✅ فاکتور سفارش به ایمیل ادمین ارسال شد!');
                                  } else {
                                    alert('❌ خطا در ارسال ایمیل: ' + (data.error || 'پاسخ ناموفق'));
                                  }
                                } catch (e) {
                                  alert('خطا در اتصال به سرور.');
                                }
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition cursor-pointer"
                              title="ارسال مجدد فاکتور به ایمیل ادمین"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer"
                              title="حذف سفارش"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}



      {/* SUB-TAB: IRAN IN-STOCK INVENTORY CMS MANAGEMENT (#ap-warehouse) */}
      {activeAdminSubTab === 'inventory' && (
        <div id="ap-warehouse" className="space-y-6 font-['Vazirmatn',sans-serif]">
          {saveCmsSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تنظیمات و اطلاعات انبار ایران با موفقیت ذخیره شدند.</span>
            </div>
          )}

          {/* 1. PUBLIC VISIBILITY TOGGLE SWITCH CARD (Matches Screenshot 1) */}
          <div className="bg-[#FEFDF3] border border-[#FDE68A] rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                  نمایش بخش موجودی در انبار ایران در صفحه اصلی
                </h3>
                <div>
                  {showLocalInventory ? (
                    <span className="bg-[#DCFCE7] text-[#15803D] text-[11px] font-black px-3 py-1 rounded-full border border-[#BBF7D0] inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      نمایش عمومی فعال است
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-600 text-[11px] font-black px-3 py-1 rounded-full border border-slate-300 inline-block">
                      مخفی از دید عمومی
                    </span>
                  )}
                </div>
              </div>

              {/* Orange Box Parcel Icon */}
              <div className="w-12 h-12 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Package className="w-6 h-6" />
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              در صورت فعال بودن این کلید، بنر و کارت «موجودی در انبار ایران» با نشان «تحویل فوری» در صفحه اصلی نمایش داده می‌شود. اگر غیرفعال باشد، این بخش کاملاً از دید کاربران عمومی مخفی خواهد شد.
            </p>

            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-900">
                {showLocalInventory ? 'فعال' : 'غیرفعال'}
              </span>

              {/* Red/Orange Toggle Switch matching reference screenshot */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={showLocalInventory}
                  onChange={(e) => setShowLocalInventory(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full dir-ltr peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#E11D48]"></div>
              </label>
            </div>
          </div>

          {/* 2. MANAGEMENT HEADER & ADD NEW ITEM BUTTON CARD (Matches Screenshot 1 & 2) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="space-y-1">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-amber-600" />
                <span>مدیریت کالاهای موجود در انبار ایران ({localInventoryList.length})</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                کالاهایی که فیزیک آن‌ها در ایران موجود است و برای تحویل فوری ۱ الی ۲ روزه به کاربران ارائه می‌شود
              </p>
            </div>

            {/* Auto-Extract via URL Section */}
            <div className="bg-gradient-to-r from-purple-50/80 via-indigo-50/80 to-purple-50/80 border border-purple-200/90 rounded-2xl p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-black text-xs text-purple-950">خرید/استخراج با لینک (افزودن خودکار کالا به انبار ایران با لینک محصول):</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={newLocalUrlInput}
                  onChange={(e) => setNewLocalUrlInput(e.target.value)}
                  placeholder="https://www.drnutrition.com/product/optimum-nutrition-gold-standard-100-whey..."
                  className="flex-1 bg-white border border-purple-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-purple-600 dir-ltr font-mono"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleAutoExtractAndAddLocalItem}
                  disabled={isExtractingNewLocalItem || !newLocalUrlInput.trim()}
                  className="bg-[#7C3AED] hover:bg-violet-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {isExtractingNewLocalItem ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال استخراج کالا...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>استخراج و افزودن کالا</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-purple-800 font-medium leading-relaxed">
                پس از استخراج، تمامی اطلاعات (عنوان، عکس، قیمت به تومان، موجودی، دسته‌بندی و توضیحات) به‌طور کامل قابل ویرایش دستی می‌باشند.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddLocalItem}
              className="w-full bg-[#111111] hover:bg-black text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ افزودن کالای جدید (دستی)</span>
            </button>
          </div>

          {/* 3. PRODUCT CARDS LIST (Matches Screenshot 1, 2, 3) */}
          {localInventoryList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 text-xs font-semibold">
              هیچ کالایی در انبار ایران ثبت نشده است. روی «+ افزودن کالای جدید» کلیک کنید.
            </div>
          ) : (
            <div className="space-y-4">
              {localInventoryList.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4 transition"
                >
                  {/* Card Top Header: Item title # index & status badge + trash */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-extrabold text-xs text-slate-500">
                      عنوان کالا #{index + 1}:
                    </span>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-black cursor-pointer flex items-center gap-1 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200">
                        <input
                          type="checkbox"
                          checked={item.inStock}
                          onChange={(e) => handleUpdateLocalItemField(item.id, 'inStock', e.target.checked)}
                          className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <span className={item.inStock ? 'text-emerald-700 font-black' : 'text-slate-400'}>
                          {item.inStock ? 'موجود' : 'ناموجود'}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleDeleteLocalItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="حذف کالا"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Index Number Row */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 font-black text-sm flex items-center justify-center shrink-0 border border-slate-200">
                      {index + 1}
                    </div>

                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateLocalItemField(item.id, 'title', e.target.value)}
                      placeholder="عنوان محصول (مثال: پروتئین وی ایزوله)"
                      className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white text-slate-900 font-bold text-sm px-4 py-2.5 rounded-2xl focus:outline-none focus:border-slate-900 transition"
                    />
                  </div>

                  {/* Field: Selling Price (قیمت فروش (تومان):) */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      قیمت فروش (تومان):
                    </label>
                    <input
                      type="number"
                      value={item.priceToman}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                        handleUpdateLocalItemField(item.id, 'priceToman', clean === '' ? 0 : parseFloat(clean) || 0);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white text-slate-900 font-mono font-bold text-sm px-4 py-2.5 rounded-2xl focus:outline-none focus:border-slate-900 transition"
                    />
                  </div>

                  {/* Field: Original Price (قیمت قبل (تومان):) */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      قیمت قبل (تومان):
                    </label>
                    <input
                      type="number"
                      value={item.originalPriceToman || ''}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                        handleUpdateLocalItemField(item.id, 'originalPriceToman', clean === '' ? undefined : parseFloat(clean) || undefined);
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="مثال: 7800000"
                      className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white text-slate-900 font-mono font-bold text-sm px-4 py-2.5 rounded-2xl focus:outline-none focus:border-slate-900 transition"
                    />
                  </div>

                  {/* Field: Stock Quantity (موجودی عددی:) */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      موجودی عددی:
                    </label>
                    <input
                      type="number"
                      value={item.stockQuantity}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                        handleUpdateLocalItemField(item.id, 'stockQuantity', clean === '' ? 0 : parseInt(clean, 10) || 0);
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white text-slate-900 font-mono font-bold text-sm px-4 py-2.5 rounded-2xl focus:outline-none focus:border-slate-900 transition"
                    />
                  </div>

                  {/* Field: Category (دسته‌بندی:) */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      دسته‌بندی:
                    </label>
                    <input
                      type="text"
                      value={item.category || ''}
                      onChange={(e) => handleUpdateLocalItemField(item.id, 'category', e.target.value)}
                      placeholder="ویتامین و سلامت / مکمل‌های ورزشی"
                      className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white text-slate-900 font-bold text-sm px-4 py-2.5 rounded-2xl focus:outline-none focus:border-slate-900 transition"
                    />
                  </div>

                  {/* Field: Delivery Badge (بج ارسال (مثال: تحویل فوری):) */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      بج ارسال (مثال: تحویل فوری):
                    </label>
                    <input
                      type="text"
                      value={item.deliveryBadge || ''}
                      onChange={(e) => handleUpdateLocalItemField(item.id, 'deliveryBadge', e.target.value)}
                      placeholder="تحویل فوری / تحویل ۲۴ ساعته"
                      className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white text-slate-900 font-bold text-sm px-4 py-2.5 rounded-2xl focus:outline-none focus:border-slate-900 transition"
                    />
                  </div>

                  {/* Field: Image URL with Direct File Upload */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      تصویر کالا (آدرس لینک یا آپلود فایل):
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <input
                        type="text"
                        value={item.image}
                        onChange={(e) => handleUpdateLocalItemField(item.id, 'image', e.target.value)}
                        placeholder="https://... یا فایل انتخاب شده"
                        className="flex-1 bg-slate-50/80 border border-slate-200 focus:bg-white text-slate-900 text-xs px-4 py-2.5 rounded-2xl focus:outline-none focus:border-slate-900 dir-ltr font-mono transition"
                        dir="ltr"
                      />
                      <label className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>آپلود فایل</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImageFile(file, 800, 800, 0.7);
                              if (compressed) {
                                handleUpdateLocalItemField(item.id, 'image', compressed);
                              }
                            }
                          }}
                        />
                      </label>
                      {item.image && (
                        <img
                          src={item.image}
                          alt="preview"
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Field: Short Description (توضیحات کوتاه محصول:) */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      توضیحات کوتاه محصول:
                    </label>
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => handleUpdateLocalItemField(item.id, 'description', e.target.value)}
                      placeholder="اورجینال GNC، موجود در انبار تهران"
                      className="w-full bg-slate-50/80 border border-slate-200 focus:bg-white text-slate-900 font-medium text-sm px-4 py-2.5 rounded-2xl focus:outline-none focus:border-slate-900 transition"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. WAREHOUSE CATEGORIES CMS SECTION (۶ خانه دسته‌بندی انبار ایران) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <span>تنظیمات تصویر و عنوان ۶ کادر دسته‌بندی انبار ایران (شبکه ۳×۲)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                  تصویر دلخواه، عنوان و کلید فیلتر برای ۶ خانه دسته‌بندی انبار ایران را در این قسمت تعیین کنید تا در مدیریت محتوای اصلی اعمال شود.
                </p>
              </div>

              <span className="text-xs font-black px-3 py-1 bg-slate-100 text-slate-700 rounded-xl shrink-0 self-start sm:self-center">
                ۶ خانه دسته‌بندی
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {warehouseCategories.slice(0, 6).map((cat, idx) => (
                <div key={cat.id || idx} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="font-black text-xs text-slate-900">خانه #{idx + 1}: {cat.label}</span>
                    <span className="text-[10px] font-mono text-slate-400">ID: {cat.id}</span>
                  </div>

                  {/* Category Image Preview & Input with Direct File Upload */}
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 block mb-1">تصویر / آیکون دسته‌بندی (لینک یا آپلود):</label>
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <input
                        type="text"
                        value={cat.iconUrl || ''}
                        onChange={(e) => handleUpdateWarehouseCategoryField(cat.id, 'iconUrl', e.target.value)}
                        placeholder="https://... یا فایل آیکون"
                        className="flex-1 bg-white border border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 font-mono dir-ltr"
                        dir="ltr"
                      />
                      <label className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>آپلود فایل</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImageFile(file, 600, 600, 0.7);
                              if (compressed) {
                                handleUpdateWarehouseCategoryField(cat.id, 'iconUrl', compressed);
                              }
                            }
                          }}
                        />
                      </label>
                      {cat.iconUrl ? (
                        <img
                          src={cat.iconUrl}
                          alt={cat.label}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                          آیکون
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 block mb-1">عنوان دسته (زیر کارت):</label>
                    <input
                      type="text"
                      value={cat.label}
                      onChange={(e) => handleUpdateWarehouseCategoryField(cat.id, 'label', e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 block mb-1">کلید فیلتر (Filter Key):</label>
                    <input
                      type="text"
                      value={cat.filterKey}
                      onChange={(e) => handleUpdateWarehouseCategoryField(cat.id, 'filterKey', e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-mono text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr"
                      dir="ltr"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. DYNAMIC BANNER CUSTOMIZATION (OPTIONAL CMS) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-slate-700" />
                <span>تنظیمات بنر تبلیغاتی انبار ایران (صفحه اصلی)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                متن‌ها، تم رنگی و دکمه بنر را متناسب با کمپین خود سفارشی‌سازی کنید
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  a) عنوان بنر:
                </label>
                <input
                  type="text"
                  value={warehouseBannerTitle}
                  onChange={(e) => setWarehouseBannerTitle(e.target.value)}
                  placeholder="مثال: کالاهای موجود در انبار ایران (ارسال فوری)"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  d) متن دکمه اقدام (CTA):
                </label>
                <input
                  type="text"
                  value={warehouseBannerButtonText}
                  onChange={(e) => setWarehouseBannerButtonText(e.target.value)}
                  placeholder="مثال: جستجو و مشاهده همه"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  b) زیرعنوان و توضیحات بنر:
                </label>
                <input
                  type="text"
                  value={warehouseBannerSubtitle}
                  onChange={(e) => setWarehouseBannerSubtitle(e.target.value)}
                  placeholder="مثال: تحویل ۱ تا ۲ روزه در سراسر کشور • کالاها پلمپ و اورجینال"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-medium px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-extrabold text-slate-700 block mb-2">
                  c) تم و رنگ پس‌زمینه بنر:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setWarehouseBannerTheme('light')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      warehouseBannerTheme === 'light'
                        ? 'border-slate-900 bg-white text-slate-900 ring-2 ring-slate-900/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-400"></span>
                    <span>سفید شفاف (اصلی)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWarehouseBannerTheme('dark')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      warehouseBannerTheme === 'dark'
                        ? 'border-slate-900 bg-slate-950 text-white ring-2 ring-slate-900/20 shadow-xs'
                        : 'border-slate-200 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-700"></span>
                    <span>مشکی لوکس</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWarehouseBannerTheme('emerald')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      warehouseBannerTheme === 'emerald'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/60'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-600"></span>
                    <span>سبز زمردی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWarehouseBannerTheme('amber')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      warehouseBannerTheme === 'amber'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 bg-amber-50/50 text-amber-800 hover:bg-amber-100/60'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-600"></span>
                    <span>طلایی کهربایی</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SAVE BUTTON (Matches Screenshot 2: "ذخیره تغییرات انبار ایران") */}
          <button
            type="button"
            onClick={handleSaveCms}
            disabled={isSavingCms}
            className="w-full bg-[#111111] hover:bg-black text-white font-black text-sm md:text-base py-4 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSavingCms ? (
              <RefreshCw className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <Save className="w-4.5 h-4.5" />
            )}
            <span>ذخیره تغییرات انبار ایران</span>
          </button>
        </div>
      )}

      {/* SUB-TAB: FEATURED DEALS CMS MANAGEMENT */}
      {activeAdminSubTab === 'deals' && (
        <div className="space-y-6">
          {saveCmsSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>پیشنهادها و تخفیف‌های ویژه با موفقیت به‌روزرسانی شدند.</span>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                  <span>مدیریت پیشنهادهای ویژه و پرفروش‌ترین‌ها</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  محصولاتی که در بخش «پیشنهادهای ویژه و پرفروش‌ترین‌ها» در صفحه اصلی نمایش داده می‌شوند
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddDeal}
                className="bg-slate-900 hover:bg-black text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن دستی پیشنهاد</span>
              </button>
            </div>

            {/* Quick Auto Extract & Add Deal Form */}
            <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 border border-amber-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-black text-xs text-amber-950">افزودن ۱۰۰٪ خودکار با چسباندن لینک محصول دبی (GNC / Dr. Nutrition / Sporter):</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={newDealUrlInput}
                  onChange={(e) => setNewDealUrlInput(e.target.value)}
                  placeholder="https://gnc-mena.com/products/optimum-nutrition-gold-standard-100-whey..."
                  className="flex-1 bg-white border border-amber-300 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-600 dir-ltr font-mono"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleAutoExtractAndAddDeal}
                  disabled={isExtractingNewDeal || !newDealUrlInput.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {isExtractingNewDeal ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال استخراج و محاسبه تخفیف...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>افزودن به پیشنهادها</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-amber-800 font-medium">
                سیستم به طور خودکار عنوان، عکس، قیمت اصلی، قیمت تخفیف‌خورده و درصد تخفیف (مثلا -۲۵٪) را استخراج کرده و به لیست اضافه می‌کند.
              </p>
            </div>

            {dealsList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                هیچ پیشنهادی ثبت نشده است. روی «افزودن پیشنهاد جدید» کلیک کنید.
              </div>
            ) : (
              <div className="space-y-4">
                {dealsList.map((deal, index) => (
                  <div
                    key={deal.id}
                    className={`p-4 rounded-2xl border transition space-y-3 ${
                      deal.isActive !== false
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-slate-100/70 border-slate-200/80 opacity-75'
                    }`}
                  >
                    {/* Top Row: Thumbnail, Title, Active Toggle & Delete */}
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-2.5">
                      <img
                        src={deal.image}
                        alt={deal.title}
                        className="w-12 h-12 rounded-xl border border-slate-200 object-contain bg-white shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      <div className="flex-1">
                        <label className="text-[10px] font-extrabold text-slate-500 block mb-0.5">
                          عنوان محصول #{index + 1}:
                        </label>
                        <input
                          type="text"
                          value={deal.title}
                          onChange={(e) => handleUpdateDealField(deal.id, 'title', e.target.value)}
                          placeholder="عنوان کامل محصول"
                          className="w-full bg-white border border-slate-300 text-slate-900 font-extrabold text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-slate-900"
                        />
                      </div>

                      {/* Active Toggle Switch */}
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={deal.isActive !== false}
                            onChange={(e) => handleUpdateDealField(deal.id, 'isActive', e.target.checked)}
                            className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900"
                          />
                          <span className={deal.isActive !== false ? 'text-emerald-700' : 'text-slate-400'}>
                            {deal.isActive !== false ? 'فعال' : 'غیرفعال'}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleDeleteDeal(deal.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                          title="حذف پیشنهاد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Grid Inputs: Section, Calculator toggle, Badge/Label */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-800 block mb-1">بخش در صفحه پیشنهادها:</label>
                        <select
                          value={deal.section || 'featured'}
                          onChange={(e) => handleUpdateDealField(deal.id, 'section', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-slate-900"
                        >
                          <option value="featured">⭐ پیشنهادهای ویژه (بخش ۱)</option>
                          <option value="bestseller">🔥 پرفروش‌ترین‌ها (بخش ۲)</option>
                          <option value="discount">🏷️ تخفیف‌دار و ویژه (بخش ۳)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-extrabold text-slate-800 block mb-1">عنوان دکمه دایره‌ای ماشین حساب:</label>
                        <input
                          type="text"
                          value={deal.badge || ''}
                          onChange={(e) => handleUpdateDealField(deal.id, 'badge', e.target.value)}
                          placeholder="مثلا: 💪 وی ۵ پوندی ON"
                          className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:outline-none font-bold"
                        />
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="text-xs font-extrabold text-slate-800 flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200 w-full">
                          <input
                            type="checkbox"
                            checked={deal.isFeaturedInCalculator !== false}
                            onChange={(e) => handleUpdateDealField(deal.id, 'isFeaturedInCalculator', e.target.checked)}
                            className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900"
                          />
                          <span className={deal.isFeaturedInCalculator !== false ? 'text-indigo-700 font-bold' : 'text-slate-500'}>
                            نمایش در نمونه‌های محبوب ماشین حساب
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Grid Inputs: Brand, Category, Store Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">برند / کمپانی:</label>
                        <input
                          type="text"
                          value={deal.brand || ''}
                          onChange={(e) => handleUpdateDealField(deal.id, 'brand', e.target.value)}
                          placeholder="مثلا: Optimum Nutrition"
                          className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">دسته‌بندی:</label>
                        <select
                          value={deal.category || '💊 مکمل‌های ورزشی'}
                          onChange={(e) => handleUpdateDealField(deal.id, 'category', e.target.value)}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                        >
                          <option value="💊 مکمل‌های ورزشی">💊 مکمل‌های ورزشی</option>
                          <option value="✨ ویتامین و سلامت">✨ ویتامین و سلامت</option>
                          <option value="🔥 پرفروش‌ها">🔥 پرفروش‌ها</option>
                          <option value="🏷️ تخفیف ویژه">🏷️ تخفیف ویژه</option>
                          <option value="سایر">سایر</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">فروشگاه دبی:</label>
                        <input
                          type="text"
                          value={deal.storeName || ''}
                          onChange={(e) => handleUpdateDealField(deal.id, 'storeName', e.target.value)}
                          placeholder="مثلا: Dr. Nutrition"
                          className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Grid Inputs: Price AED, Original Price, Discount %, Weight */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">قیمت ویژه (درهم):</label>
                        <input
                          type="number"
                          value={deal.priceAed}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/^0+(?=\d)/, '');
                            handleUpdateDealField(deal.id, 'priceAed', clean === '' ? 0 : parseFloat(clean) || 0);
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">قیمت قبلی (درهم):</label>
                        <input
                          type="number"
                          value={deal.originalPriceAed || ''}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/^0+(?=\d)/, '');
                            handleUpdateDealField(deal.id, 'originalPriceAed', clean === '' ? undefined : parseFloat(clean) || undefined);
                          }}
                          onFocus={(e) => e.target.select()}
                          placeholder="اختیاری"
                          className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">تخفیف (٪):</label>
                        <input
                          type="number"
                          value={deal.discountPercent || ''}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/^0+(?=\d)/, '');
                            handleUpdateDealField(deal.id, 'discountPercent', clean === '' ? undefined : parseFloat(clean) || undefined);
                          }}
                          onFocus={(e) => e.target.select()}
                          placeholder="مثلا 20"
                          className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">وزن (کیلوگرم):</label>
                        <input
                          type="number"
                          step="0.1"
                          value={deal.weightKg || 0.5}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/^0+(?=\d)/, '');
                            handleUpdateDealField(deal.id, 'weightKg', clean === '' ? 0.5 : parseFloat(clean) || 0.5);
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Image URL & Product URL */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">لینک تصویر عکس:</label>
                        <input
                          type="text"
                          value={deal.image}
                          onChange={(e) => handleUpdateDealField(deal.id, 'image', e.target.value)}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:outline-none dir-ltr font-mono"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">لینک خرید محصول در دبی:</label>
                        <input
                          type="text"
                          value={deal.url}
                          onChange={(e) => handleUpdateDealField(deal.id, 'url', e.target.value)}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:outline-none dir-ltr font-mono"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveCms}
            disabled={isSavingCms}
            className="bg-slate-900 hover:bg-black text-white font-extrabold text-sm px-8 py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer w-full"
          >
            {isSavingCms ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>ذخیره تغییرات پیشنهادها</span>
          </button>
        </div>
      )}

      {/* SUB-TAB 4: CMS & API MANAGEMENT */}
      {activeAdminSubTab === 'cms' && (
        <div className="space-y-6">
          {saveCmsSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>محتوا و تنظیمات API با موفقیت به‌روزرسانی شد.</span>
            </div>
          )}

          {/* Section 0: Rotating Slogan Announcement Banner Management */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                  <span>مدیریت شعارهای بنر متحرک (Rotating Slogan Ticker)</span>
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  تنظیم شعارهای بنر چرخشی بالای صفحه اصلی با انیمیشن تغییر بسیار آرام و خوانایی عالی
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="text-xs font-bold text-slate-700">
                  {showAnnouncementBanner ? 'فعال (در حال نمایش)' : 'غیرفعال (مخفی)'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={showAnnouncementBanner}
                    onChange={(e) => setShowAnnouncementBanner(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full dir-ltr peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
            </div>

            {/* Slogans List & Ordering Controls */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span>شعارهای چرخشی (ترتیب اولویت چرخش مداوم):</span>
                </label>
                <button
                  type="button"
                  onClick={handleResetSlogans}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>بازنشانی به شعارهای پیش‌فرض</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {announcementSlogans.map((slogan, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 transition">
                    <span className="text-xs font-black text-slate-400 w-7 text-center shrink-0">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={slogan}
                      onChange={(e) => handleUpdateSlogan(idx, e.target.value)}
                      placeholder={`شعار شماره ${idx + 1}...`}
                      className="flex-1 bg-white border border-slate-300 text-slate-900 font-bold text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveSloganUp(idx)}
                        disabled={idx === 0}
                        className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white cursor-pointer transition"
                        title="انتقال به بالا (اولویت بالاتر)"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSloganDown(idx)}
                        disabled={idx === announcementSlogans.length - 1}
                        className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white cursor-pointer transition"
                        title="انتقال به پایین (اولویت پایین‌تر)"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      {announcementSlogans.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlogan(idx)}
                          className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer transition"
                          title="حذف این شعار"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddSlogan}
                className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl border border-slate-300 flex items-center gap-1.5 transition cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4 text-slate-700" />
                <span>افزودن شعار جدید به بنر</span>
              </button>
            </div>
          </div>

          {/* Section 0.5: Homepage Slideshow Banners Management */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                  <span>مدیریت بنرهای اسلایدر صفحه اصلی (Homepage Slideshow Banners)</span>
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  افزودن و مدیریت بنرهای تبلیغاتی متحرک بالای صفحه اصلی با امکان لینک مستقیم، چرخش خودکار و آپلود عکس
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBanner}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن بنر جدید</span>
              </button>
            </div>

            <div className="space-y-3">
              {homeBannersList.map((banner, index) => (
                <div key={banner.id || index} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 transition hover:border-slate-300">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={banner.title || ''}
                        onChange={(e) => handleUpdateBanner(index, 'title', e.target.value)}
                        placeholder={`عنوان بنر شماره ${index + 1} (مثال: تخفیف ویژه مکمل‌ها)...`}
                        className="bg-white border border-slate-300 text-slate-900 font-extrabold text-xs px-3 py-1.5 rounded-xl focus:outline-none focus:border-slate-900 min-w-[200px]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          checked={banner.enabled !== false}
                          onChange={(e) => handleUpdateBanner(index, 'enabled', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-slate-900 accent-slate-900 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-slate-700">
                          {banner.enabled !== false ? 'فعال' : 'غیرفعال'}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleMoveBannerUp(index)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="انتقال به بالا"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBannerDown(index)}
                        disabled={index === homeBannersList.length - 1}
                        className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="انتقال به پایین"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBanner(index)}
                        className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        title="حذف بنر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        تصویر بنر (آدرس لینک عکس یا آپلود):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={banner.imageUrl}
                          onChange={(e) => handleUpdateBanner(index, 'imageUrl', e.target.value)}
                          placeholder="https://example.com/banner.jpg"
                          className="flex-1 bg-white border border-slate-300 text-slate-900 font-mono text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr"
                          dir="ltr"
                        />
                        <label className="bg-slate-900 hover:bg-black text-white text-[11px] font-extrabold px-3 py-2 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>آپلود</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleBannerFileUpload(index, file);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        لینک مقصد هدایت هنگام کلیک کاربر (URL Redirect):
                      </label>
                      <input
                        type="text"
                        value={banner.linkUrl}
                        onChange={(e) => handleUpdateBanner(index, 'linkUrl', e.target.value)}
                        placeholder="https://drnutrition.com یا https://lifepharmacy.com"
                        className="w-full bg-white border border-slate-300 text-slate-900 font-mono text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {banner.imageUrl && (
                    <div className="relative w-full max-h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-900/10 flex items-center justify-center">
                      <img
                        src={banner.imageUrl}
                        alt="Preview"
                        className="max-h-24 object-contain mx-auto"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 0.8: Whitelisted Allowed Domains Management */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Globe className="w-4.5 h-4.5 text-sky-600 shrink-0" />
                  <span>محدودسازی لینک‌ها و دامنه‌های مجاز جهت استخراج (Whitelisted Extraction Domains)</span>
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  تعیین لیست دامنه‌های فروشگاه‌های مجاز دبی با تیک فعال/غیرفعال، افزودن دامنه جدید و مدیریت کامل
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-700">
                  {enableDomainRestriction ? 'محدودسازی فعال 🔒' : 'غیرفعال (آزاد) 🔓'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={enableDomainRestriction}
                    onChange={(e) => handleToggleDomainRestriction(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full dir-ltr peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Globe className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDomain();
                    }
                  }}
                  placeholder="افزودن دامنه جدید (مثال: store.ae یا mynutrition.com)..."
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs pr-9 pl-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono"
                  dir="ltr"
                />
              </div>
              <button
                type="button"
                onClick={handleAddDomain}
                className="bg-slate-900 hover:bg-black text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن دامنه</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800">
                  لیست دامنه‌ها (فعال/غیرفعال با کلیک روی تیک):
                </label>
                <button
                  type="button"
                  onClick={handleResetDomains}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>بازنشانی به دامنه‌های پیش‌فرض</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {domainItemsList.map((item, index) => (
                  <div
                    key={item.domain}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition ${
                      item.enabled
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggleDomainItem(index)}
                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer shrink-0"
                      />
                      <span className="font-mono text-xs font-bold text-slate-900 truncate dir-ltr text-right" dir="ltr">
                        {item.domain}
                      </span>
                    </label>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          item.enabled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.enabled ? '✓ مجاز (فعال)' : 'غیرفعال'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDomainItem(index)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="حذف دامنه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section A: Main Header Titles */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <FileText className="w-4 h-4 text-slate-800" />
              <span>مدیریت عناوین اصلی سایت</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">عنوان اصلی هدر:</label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">زیرعنوان و توضیحات اصلی:</label>
                <input
                  type="text"
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section B: Dynamic Store Links & Cards Management */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-800" />
                <span>مدیریت کارت‌های فروشگاه‌ها و لینک‌های سریع</span>
              </h3>

              <button
                type="button"
                onClick={handleAddStore}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-800" />
                <span>افزودن فروشگاه جدید</span>
              </button>
            </div>

            <div className="space-y-4">
              {storesList.map((store, index) => (
                <div key={store.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 relative space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-xs text-slate-700">فروشگاه #{index + 1}: {store.title}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateStoreField(store.id, 'enabled', store.enabled === false ? true : false)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          store.enabled !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {store.enabled !== false ? '✓ فعال در صفحه اصلی' : '✕ غیرفعال (مخفی)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStore(store.id)}
                        className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                        title="حذف کارت فروشگاه"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">نام فروشگاه:</label>
                      <input
                        type="text"
                        value={store.title}
                        onChange={(e) => handleUpdateStoreField(store.id, 'title', e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">لینک مستقیم فروشگاه:</label>
                      <input
                        type="text"
                        value={store.url}
                        onChange={(e) => handleUpdateStoreField(store.id, 'url', e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:outline-none dir-ltr font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">تگ / بج (مثال: تخفیف ویژه):</label>
                      <input
                        type="text"
                        value={store.badge || ''}
                        onChange={(e) => handleUpdateStoreField(store.id, 'badge', e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">توضیحات کوتاه:</label>
                      <input
                        type="text"
                        value={store.description}
                        onChange={(e) => handleUpdateStoreField(store.id, 'description', e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3 bg-white p-3 rounded-xl border border-slate-200 space-y-2 mt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-700" />
                          <span>لوگوی رسمی و تصویر کارت فروشگاه (Logo URL / File Upload):</span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">
                          پیش‌نمایش در کادر ۶۴x۶۴ استاندارد
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        {/* Strict 64x64 Rounded Logo Container Box Preview */}
                        <div
                          className="shrink-0 border border-slate-200/90 shadow-2xs"
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            padding: '6px',
                            flexShrink: 0
                          }}
                        >
                          {store.image ? (
                            <img
                              src={store.image}
                              alt={store.title}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                display: 'block'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-slate-400">
                              بدون لوگو
                            </div>
                          )}
                        </div>

                        <div className="flex-1 w-full space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={store.image || ''}
                              onChange={(e) => handleUpdateStoreField(store.id, 'image', e.target.value)}
                              placeholder="آدرس URL لوگو (https://... یا data:image/...)"
                              className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-slate-800 dir-ltr font-mono"
                              dir="ltr"
                            />

                            {/* File Upload Button */}
                            <label className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" />
                              <span>آپلود فایل</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const compressed = await compressImageFile(file, 600, 600, 0.7);
                                    if (compressed) {
                                      handleUpdateStoreField(store.id, 'image', compressed);
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>

                          {/* Preset official logo buttons */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="font-bold text-slate-500">لوگوهای رسمی آماده:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateStoreField(store.id, 'image', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="115" text-anchor="middle" fill="%23E31837" font-weight="900" font-size="70" font-family="Arial,sans-serif" letter-spacing="-2">GNC</text><text x="100" y="145" text-anchor="middle" fill="%23E31837" font-weight="800" font-size="20" font-family="Arial,sans-serif" letter-spacing="4">LIVE WELL</text></svg>')}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold cursor-pointer"
                            >
                              🔴 GNC UAE
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStoreField(store.id, 'image', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><path d="M100 15 C56 15 40 42 40 70 V135 H160 V70 C160 42 144 15 100 15 Z" fill="%231C3F94"/><circle cx="100" cy="55" r="9" fill="%23FFFFFF"/><path d="M100 68 C84 80 72 84 64 110 H136 C128 84 116 80 100 68 Z" fill="%23FFFFFF"/><text x="100" y="172" text-anchor="middle" fill="%23C42582" font-weight="900" font-size="36" font-family="sans-serif">LIFE%C2%AE</text></svg>')}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold cursor-pointer"
                            >
                              🔵 Life Pharmacy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStoreField(store.id, 'image', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif" letter-spacing="-6">dnp</text><path d="M50 120 C 90 70, 135 40, 175 28 C 150 65, 110 110, 75 130 Z" fill="%2378BE20"/><path d="M60 112 Q 115 65, 163 35" stroke="%235A9614" stroke-width="3" fill="none"/></svg>')}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold cursor-pointer"
                            >
                              🟣 Dr Nutrition
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStoreField(store.id, 'image', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23232F3E"/><text x="100" y="105" text-anchor="middle" fill="%23FFFFFF" font-weight="900" font-size="38" font-family="sans-serif">amazon</text><text x="100" y="132" text-anchor="middle" fill="%23FF9900" font-weight="800" font-size="22" font-family="sans-serif">.ae</text><path d="M50 145 Q 100 165 150 145" stroke="%23FF9900" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M142 138 L 152 146 L 140 152 Z" fill="%23FF9900"/></svg>')}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold cursor-pointer"
                            >
                              🟠 Amazon AE
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section C: Complete Original Support & Contact Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">بخش پشتیبانی و اطلاعات تماس (Support & Contact)</h3>
                  <p className="text-xs text-slate-500 font-medium">مدیریت بنر مشکی، کارت‌های ۳ گانه پشتیبانی (تلگرام، ایمیل، تلفن) و نشان‌های اعتماد</p>
                </div>
              </div>

              {/* Main Section Toggle Switch */}
              <button
                type="button"
                onClick={() => setShowSupportSection(!showSupportSection)}
                className={`flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-xl border transition cursor-pointer shrink-0 ${
                  showSupportSection
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {showSupportSection ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-emerald-600" />
                    <span>کل بخش پشتیبانی فعال است</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-rose-500" />
                    <span>بخش پشتیبانی مخفی شد</span>
                  </>
                )}
              </button>
            </div>

            {/* Banner Title & Subtitle Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-2 border-b border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">عنوان بنر مشکی پشتیبانی:</label>
                <input
                  type="text"
                  value={supportHeadline}
                  onChange={(e) => setSupportHeadline(e.target.value)}
                  placeholder="پشتیبانی و مشاوره تخصصی واردات دبی"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">توضیحات زیرعنوان بنر پشتیبانی:</label>
                <input
                  type="text"
                  value={supportSubtitle}
                  onChange={(e) => setSupportSubtitle(e.target.value)}
                  placeholder="پاسخگویی ۲۴ ساعته توسط کارشناسان تغذیه و لاجستیک"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                />
              </div>
            </div>

            {/* Support Cards Management */}
            <div className="space-y-4">
              <h5 className="font-extrabold text-xs text-slate-800">تنظیمات کارت‌های پشتیبانی (نمایش / عنوان سفارشی / اطلاعات):</h5>

              {/* Card 1: Telegram */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-sky-500" />
                    <span>کارت ۱: پشتیبانی تلگرام</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTelegramCard(!showTelegramCard)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      showTelegramCard
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {showTelegramCard ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                        <span>نمایش در سایت</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-rose-500" />
                        <span>مخفی شده</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">عنوان سفارشی کارت:</label>
                    <input
                      type="text"
                      value={telegramTitle}
                      onChange={(e) => setTelegramTitle(e.target.value)}
                      placeholder="ارتباط با پشتیبانی در تلگرام"
                      className="w-full bg-white border border-slate-200 focus:border-black text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">آیدی تلگرام:</label>
                    <input
                      type="text"
                      value={telegramHandle}
                      onChange={(e) => setTelegramHandle(e.target.value)}
                      placeholder="@SIRIK_FIT_Support"
                      className="w-full bg-white border border-slate-200 focus:border-black text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none dir-ltr font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">لینک مستقیم تلگرام:</label>
                    <input
                      type="text"
                      value={telegramLink}
                      onChange={(e) => setTelegramLink(e.target.value)}
                      placeholder="https://t.me/SIRIK_FIT_Support"
                      className="w-full bg-white border border-slate-200 focus:border-black text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none dir-ltr font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Email */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-rose-500" />
                    <span>کارت ۲: پشتیبانی ایمیل</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmailCard(!showEmailCard)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      showEmailCard
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {showEmailCard ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                        <span>نمایش در سایت</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-rose-500" />
                        <span>مخفی شده</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">عنوان سفارشی کارت:</label>
                    <input
                      type="text"
                      value={emailTitle}
                      onChange={(e) => setEmailTitle(e.target.value)}
                      placeholder="ارتباط از طریق ایمیل پشتیبانی"
                      className="w-full bg-white border border-slate-200 focus:border-black text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">آدرس ایمیل پشتیبانی:</label>
                    <input
                      type="text"
                      value={adminDestinationEmail}
                      onChange={(e) => setAdminDestinationEmail(e.target.value)}
                      placeholder="omran.javan73@gmail.com"
                      className="w-full bg-white border border-slate-200 focus:border-black text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none dir-ltr font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Tehran Phone */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    <span>کارت ۳: تلفن دفتر تهران</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPhoneCard(!showPhoneCard)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      showPhoneCard
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {showPhoneCard ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                        <span>نمایش در سایت</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-rose-500" />
                        <span>مخفی شده</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">عنوان سفارشی کارت:</label>
                    <input
                      type="text"
                      value={phoneTitle}
                      onChange={(e) => setPhoneTitle(e.target.value)}
                      placeholder="تلفن پشتیبانی تهران"
                      className="w-full bg-white border border-slate-200 focus:border-black text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">شماره تلفن تهران:</label>
                    <input
                      type="text"
                      value={officePhone}
                      onChange={(e) => setOfficePhone(e.target.value)}
                      placeholder="021-91000000"
                      className="w-full bg-white border border-slate-200 focus:border-black text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none dir-ltr font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>نشان‌های اعتماد و ضمانت کالا (Trust Badges)</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">نشان اعتماد ۱ (سبز):</label>
                    <input
                      type="text"
                      value={trustBadge1}
                      onChange={(e) => setTrustBadge1(e.target.value)}
                      placeholder="اصالت ۱۰۰٪ کالا"
                      className="w-full bg-white border border-slate-200 focus:border-black text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">نشان اعتماد ۲ (آبی):</label>
                    <input
                      type="text"
                      value={trustBadge2}
                      onChange={(e) => setTrustBadge2(e.target.value)}
                      placeholder="حمل ایمن کارگو"
                      className="w-full bg-white border border-slate-200 focus:border-black text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">نشان اعتماد ۳ (نارنجی):</label>
                    <input
                      type="text"
                      value={trustBadge3}
                      onChange={(e) => setTrustBadge3(e.target.value)}
                      placeholder="تحویل ۵ تا ۷ روزه"
                      className="w-full bg-white border border-slate-200 focus:border-black text-slate-900 text-xs px-3 py-2 rounded-lg focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveCms}
            disabled={isSavingCms}
            className="bg-slate-900 hover:bg-black text-white font-extrabold text-sm px-8 py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer w-full"
          >
            {isSavingCms ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>ذخیره تنظیمات عمومی و اطلاعات تماس</span>
          </button>
        </div>
      )}

      {/* DEDICATED SUB-TAB: API & INTEGRATIONS (تنظیمات کلیدهای API و ارتباطات) */}
      {activeAdminSubTab === 'apiSettings' && (
        <div className="space-y-6 font-['Vazirmatn',sans-serif]">
          {/* Main Title Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700/50">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <Key className="w-4 h-4" />
                <span>مدیریت اتصال‌های هوشمند و کلیدهای امنیتی</span>
              </div>
              <h2 className="text-xl font-black text-white">تنظیمات کلیدهای API و سرویس‌های جانبی</h2>
              <p className="text-xs text-slate-300 max-w-xl">
                تنظیم سرویس‌های خودکار استخراج محصول، چرخش کلیدهای جمینای، کلیدهای اطلاع‌رسانی سفارشات و نرخ ارز
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveCms}
              disabled={isSavingCms}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-6 py-3 rounded-2xl transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer"
            >
              {isSavingCms ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>ذخیره تمامی کلیدها و تنظیمات API</span>
            </button>
          </div>

          {/* Database Connection Status Badge Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    وضعیت اتصال پایگاه داده (Database Connection Status)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    همگام‌سازی ابری سفارشات، کاربران و تنظیمات ادمین
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dbStatus.loading ? (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full animate-pulse flex items-center gap-1.5 border border-slate-200">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    در حال بررسی اتصال...
                  </span>
                ) : dbStatus.connected ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-2xs">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    متصل به Firebase Firestore
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    حالت محلی (Local Storage Fallback)
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDbStatus(prev => ({ ...prev, loading: true }));
                    checkFirestoreConnection().then((res) => {
                      setDbStatus({
                        connected: res.connected,
                        dbId: res.dbId,
                        loading: false
                      });
                    }).catch(() => {
                      setDbStatus({
                        connected: false,
                        loading: false
                      });
                    });
                  }}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 border border-slate-300 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>بررسی مجدد</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {dbStatus.connected
                ? `پایگاه داده ابری Firestore فعال است${dbStatus.dbId ? ` (پروژه: ${dbStatus.dbId})` : ''}. تمامی اطلاعات ثبت‌نام کاربران، سبد خرید، سفارشات و تنظیمات ادمین به‌صورت زنده همگام‌سازی می‌گردند.`
                : 'متغیرهای محیطی Firebase تنظیم نشده‌اند یا دستگاه آفلاین است. برنامه با حفظ عملکرد کامل، اطلاعات را به‌صورت محلی (Local Storage) ذخیره می‌کند.'}
            </p>
          </div>

          {/* Section 1: Core Scraper & Currency Endpoints */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Globe className="w-4 h-4 text-slate-800" />
              <span>اندپوینت‌های اصلی استخراج و قیمت‌گذاری خودکار</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">آدرس سرویس اختصاصی اسکرپر (Puppeteer Render Microservice):</label>
                <input
                  type="text"
                  value={scraperEndpoint}
                  onChange={(e) => setScraperEndpoint(e.target.value)}
                  placeholder="https://my-scraper-ycsp.onrender.com/scrape?url="
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono text-xs"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  سرویس خودکار استخراج SSR بدون نیاز به کلید برای ۵ فروشگاه بزرگ (DrNutrition, Noon, Amazon AE, LifePharmacy, GNC)
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">آدرس API دریافت نرخ ارز آنلاین (AED to IRR):</label>
                <input
                  type="text"
                  value={currencyApiUrl}
                  onChange={(e) => setCurrencyApiUrl(e.target.value)}
                  placeholder="https://api.exchangerate-api.com/v4/latest/AED"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono text-xs"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  جهت به‌روزرسانی اتوماتیک نرخ درهم امارات در سیستم برآورد قیمت
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Gemini API Multi-Key Rotation */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  چرخش خودکار کلیدهای API جمینای (Gemini API Multi-Key Rotation)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                سوئیچ هوشمند در صورت اتمام سهمیه (Quota / Rate Limit 429)
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              در صورت اتمام سهمیه روزانه یا ساعتی کلید اصلی، سیستم به طور خودکار بدون قطع خدمت و به صورت آنی به کلیدهای پشتیبان سوئیچ می‌کند.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Gemini Key 1 */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Gemini API Key 1 (اصلی):
                </label>
                <div className="relative">
                  <input
                    type={showGeminiApiKey ? 'text' : 'password'}
                    value={geminiApiKey1}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGeminiApiKey1(val);
                      const list = [val, geminiApiKey2, geminiApiKey3].filter(k => k && k.trim() !== '' && k !== '******');
                      setEffectiveGeminiKeysList(list);
                    }}
                    placeholder="AIzaSy... (کلید اصلی)"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono text-xs pr-9"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs p-1 cursor-pointer"
                    title={showGeminiApiKey ? 'مخفی‌سازی' : 'نمایش'}
                  >
                    {showGeminiApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Gemini Key 2 */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Gemini API Key 2 (رزرو ۱):
                </label>
                <div className="relative">
                  <input
                    type={showGeminiApiKey ? 'text' : 'password'}
                    value={geminiApiKey2}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGeminiApiKey2(val);
                      const list = [geminiApiKey1, val, geminiApiKey3].filter(k => k && k.trim() !== '' && k !== '******');
                      setEffectiveGeminiKeysList(list);
                    }}
                    placeholder="AIzaSy... (رزرو اول)"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono text-xs pr-9"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs p-1 cursor-pointer"
                  >
                    {showGeminiApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Gemini Key 3 */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Gemini API Key 3 (رزرو ۲):
                </label>
                <div className="relative">
                  <input
                    type={showGeminiApiKey ? 'text' : 'password'}
                    value={geminiApiKey3}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGeminiApiKey3(val);
                      const list = [geminiApiKey1, geminiApiKey2, val].filter(k => k && k.trim() !== '' && k !== '******');
                      setEffectiveGeminiKeysList(list);
                    }}
                    placeholder="AIzaSy... (رزرو دوم)"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono text-xs pr-9"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs p-1 cursor-pointer"
                  >
                    {showGeminiApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Notifications (Telegram Bot & Admin Email Invoices) */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-400" />
                <span>تنظیمات اطلاع‌رسانی سفارشات جدید (ربات تلگرام و ایمیل فاکتور)</span>
              </h3>
              <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 px-2.5 py-1 rounded-full border border-sky-500/30">
                ارسال دوگانه خودکار سفارشات (Dual Background Automation)
              </span>
            </div>

            {/* Telegram Bot Box */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-xs text-slate-200">تنظیمات ربات تلگرام (Telegram Bot API)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={telegramNotifyEnabled}
                    onChange={(e) => setTelegramNotifyEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full dir-ltr peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Telegram Bot Token:</label>
                  <div className="relative">
                    <input
                      type={showTelegramToken ? 'text' : 'password'}
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="7123456789:AA...xyz"
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-sky-500 dir-ltr font-mono pr-9"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTelegramToken(!showTelegramToken)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs p-1 cursor-pointer"
                    >
                      {showTelegramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Admin Chat ID:</label>
                  <input
                    type="text"
                    value={adminChatId}
                    onChange={(e) => setAdminChatId(e.target.value)}
                    placeholder="123456789 یا @OmexAdminGroup"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-sky-500 dir-ltr font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    if (!telegramBotToken || !adminChatId) {
                      alert('لطفاً ابتدا توکن ربات تلگرام و شناسه چت را وارد کنید.');
                      return;
                    }
                    try {
                      const testOrder = {
                        id: 'test-' + Date.now(),
                        customerName: 'خریدار تست سیستم',
                        phoneNumber: '09120000000',
                        deliveryAddress: 'تهران، خیابان ولیعصر، پلاک ۱۰۰',
                        productTitle: 'مکمل پروتئین وی اپتیموم نوتریشن ON 5lbs',
                        selectedOption: 'طعم دبل شکلات',
                        quantity: 1,
                        priceAed: 320,
                        calculatedToman: 18500000,
                        productUrl: 'https://drnutrition.com/test'
                      };
                      const res = await fetch('/api/notify/telegram', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderData: testOrder })
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        alert('✅ پیام تست با موفقیت به ربات تلگرام ادمین ارسال شد!');
                      } else {
                        alert('❌ خطا در ارسال تست تلگرام: ' + (data.error || 'پاسخ ناموفق'));
                      }
                    } catch (e) {
                      alert('خطا در ارتباط با سرور.');
                    }
                  }}
                  className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال پیام تست تلگرام</span>
                </button>
              </div>
            </div>

            {/* Email Invoices Box */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs text-slate-200">تنظیمات ایمیل فاکتور ادمین (Resend / EmailJS)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={emailNotifyEnabled}
                    onChange={(e) => setEmailNotifyEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full dir-ltr peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="font-bold text-slate-300 block mb-1">ایمیل مقصد دریافت فاکتور (Admin Email):</label>
                  <input
                    type="email"
                    value={adminDestinationEmail}
                    onChange={(e) => setAdminDestinationEmail(e.target.value)}
                    placeholder="omran.javan73@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 dir-ltr font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Resend API Key (پیشنهادی):</label>
                  <div className="relative">
                    <input
                      type={showResendKey ? 'text' : 'password'}
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder="re_123456789..."
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 dir-ltr font-mono pr-9"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResendKey(!showResendKey)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs p-1 cursor-pointer"
                    >
                      {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">EmailJS Public Key:</label>
                  <input
                    type="text"
                    value={emailjsPublicKey}
                    onChange={(e) => setEmailjsPublicKey(e.target.value)}
                    placeholder="user_xxxxxxx"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 dir-ltr font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">EmailJS Service ID:</label>
                  <input
                    type="text"
                    value={emailjsServiceId}
                    onChange={(e) => setEmailjsServiceId(e.target.value)}
                    placeholder="service_xxxxx"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 dir-ltr font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">EmailJS Template ID:</label>
                  <input
                    type="text"
                    value={emailjsTemplateId}
                    onChange={(e) => setEmailjsTemplateId(e.target.value)}
                    placeholder="template_xxxxx"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 dir-ltr font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    if (!adminDestinationEmail) {
                      alert('لطفاً ایمیل مقصد ادمین را وارد کنید.');
                      return;
                    }
                    try {
                      const testOrder = {
                        id: 'test-email-' + Date.now(),
                        trackingCode: 'OMX-TEST-1001',
                        customerName: 'خریدار تست سیستم',
                        phoneNumber: '09120000000',
                        deliveryAddress: 'تهران، خیابان ولیعصر، پلاک ۱۰۰',
                        productTitle: 'مکمل پروتئین وی اپتیموم نوتریشن ON 5lbs',
                        selectedOption: 'طعم دبل شکلات',
                        quantity: 1,
                        priceAed: 320,
                        calculatedToman: 18500000,
                        productUrl: 'https://drnutrition.com/test'
                      };
                      const res = await fetch('/api/notify/email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderData: testOrder })
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        alert(`✅ ایمیل تست فاکتور با موفقیت به ${adminDestinationEmail} ارسال / ثبت شد!`);
                      } else {
                        alert('❌ خطا در ارسال تست ایمیل: ' + (data.error || 'پاسخ ناموفق'));
                      }
                    } catch (e) {
                      alert('خطا در ارتباط با سرور.');
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>ارسال ایمیل تست</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Save Button */}
          <button
            type="button"
            onClick={handleSaveCms}
            disabled={isSavingCms}
            className="bg-slate-900 hover:bg-black text-white font-extrabold text-sm px-8 py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer w-full"
          >
            {isSavingCms ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>ذخیره تمامی کلیدها و تنظیمات API</span>
          </button>
        </div>
      )}

      {/* SUB-TAB 7: HOME PAGE CONTENT CMS (تنظیمات محتوای صفحه اصلی) */}
      {activeAdminSubTab === 'homeContent' && (
        <form onSubmit={handleSaveHomeContent} className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-6 font-['Vazirmatn',sans-serif]">
            
            {/* Header & Main Save Button Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">تنظیمات ظاهری و محتوایی سایت (#home)</h3>
                  <p className="text-xs text-slate-500 font-medium">مدیریت زنده متون، هدر، بنر اصلی، نوار اعلانات و کادر برآورد قیمت</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingCms}
                className="bg-black hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {isSavingCms ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال ذخیره...</span>
                  </>
                ) : saveCmsSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تنظیمات اعمال و بروزرسانی شد!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>ذخیره تنظیمات صفحه اصلی</span>
                  </>
                )}
              </button>
            </div>

            {saveCmsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تغییرات صفحه اصلی ذخیره شد و تمام المان‌های DOM در لحظه بروزرسانی شدند.</span>
              </div>
            )}

            {/* SECTION 1: Top Promo Strip */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                  <h4 className="font-extrabold text-sm text-slate-900">۱. نوار اعلانات بالای صفحه (Top Promo Strip)</h4>
                </div>

                {/* Show/Hide Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setShowTopPromo(!showTopPromo)}
                  className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                    showTopPromo
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {showTopPromo ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                      <span>نمایش داده می‌شود</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-rose-500" />
                      <span>مخفی شده</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">متن اعلانات بالای هدر:</label>
                <input
                  type="text"
                  value={topPromoText}
                  onChange={(e) => setTopPromoText(e.target.value)}
                  placeholder="❄ نگهداری و ارسال کنترل‌شده دما · اورجینال از دبی"
                  className="w-full bg-white border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                />
              </div>
            </div>

            {/* SECTION 2: Branding & Header */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#111111]"></span>
                <h4 className="font-extrabold text-sm text-slate-900">۲. برندینگ و هدر اصلی (Branding & Header)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">عنوان اصلی برند (Brand Title):</label>
                  <input
                    type="text"
                    value={appTitleText}
                    onChange={(e) => setAppTitleText(e.target.value)}
                    placeholder="SIRIK FIT"
                    className="w-full bg-white border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">نشان / زیرعنوان هدر (Header Subtitle):</label>
                  <input
                    type="text"
                    value={headerPillSlogan}
                    onChange={(e) => {
                      setHeaderPillSlogan(e.target.value);
                      setAppSubtitleText(e.target.value);
                    }}
                    placeholder="مکمل‌های ورزشی و اورجینال"
                    className="w-full bg-white border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              {/* Logo Direct File Upload & URL Input Container */}
              <div className="pt-3 border-t border-slate-200/80 space-y-3">
                <label className="text-xs font-bold text-slate-800 block">لوگوی سایت SIRIK FIT (Upload / URL):</label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  {/* File Upload Button */}
                  <div>
                    <label className="cursor-pointer bg-black hover:bg-neutral-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-2xs w-full">
                      <Upload className="w-4 h-4 text-[#e50914]" />
                      <span>📷 انتخاب فایل لوگو از سیستم / گوشی</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 dir-rtl text-right">
                      فرمت‌های مجاز: PNG, JPG, WEBP, SVG
                    </p>
                  </div>

                  {/* Direct URL Input Field */}
                  <div>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="یا وارد کردن آدرس مستقیم تصویر (URL)"
                      className="w-full bg-white border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium dir-ltr"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Logo Live Preview Thumbnail */}
                {logoUrl && (
                  <div className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 block">پیش‌نمایش لوگو</span>
                        <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> لوگو بهینه‌سازی و آماده شد
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition border border-rose-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف لوگو</span>
                    </button>
                  </div>
                )}
              </div>
            </div>



            {/* SECTION 3: Calculator Box Content */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                <h4 className="font-extrabold text-sm text-slate-900">۳. محتوای باکس محاسبه و برآورد قیمت (Calculator Box)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">متن نشان مشکی بالایی (Black Badge Tag):</label>
                  <input
                    type="text"
                    value={calcBlackBadge}
                    onChange={(e) => setCalcBlackBadge(e.target.value)}
                    placeholder="✦ خرید مستقیم از دبی"
                    className="w-full bg-white border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">عنوان اصلی باکس محاسبه (Main Headline):</label>
                  <input
                    type="text"
                    value={calcMainHeadline}
                    onChange={(e) => setCalcMainHeadline(e.target.value)}
                    placeholder="برآورد قیمت و ثبت سفارش"
                    className="w-full bg-white border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">توضیحات زیرعنوان باکس محاسبه (Subtitle Description):</label>
                  <input
                    type="text"
                    value={calcSubtitle}
                    onChange={(e) => setCalcSubtitle(e.target.value)}
                    placeholder="لینک محصول را وارد کنید تا قیمت تحویل در ایران فوری محاسبه شود."
                    className="w-full bg-white border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Trust Badges */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h4 className="font-extrabold text-sm text-slate-900">۴. نشان‌های اعتماد و ضمانت (Trust Badges)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">عنوان نشان اعتماد ۱ (سبز):</label>
                  <input
                    type="text"
                    value={trustBadge1}
                    onChange={(e) => setTrustBadge1(e.target.value)}
                    placeholder="اصالت ۱۰۰٪ کالا"
                    className="w-full bg-white border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">عنوان نشان اعتماد ۲ (آبی):</label>
                  <input
                    type="text"
                    value={trustBadge2}
                    onChange={(e) => setTrustBadge2(e.target.value)}
                    placeholder="حمل ایمن کارگو"
                    className="w-full bg-white border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">عنوان نشان اعتماد ۳ (نارنجی):</label>
                  <input
                    type="text"
                    value={trustBadge3}
                    onChange={(e) => setTrustBadge3(e.target.value)}
                    placeholder="تحویل ۵ تا ۷ روزه"
                    className="w-full bg-white border border-slate-300 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingCms}
                className="w-full sm:w-auto bg-black hover:bg-slate-800 text-white font-extrabold text-xs px-8 py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSavingCms ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال بروزرسانی صفحه اصلی...</span>
                  </>
                ) : saveCmsSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تنظیمات ذخیره و اعمال شد!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>ذخیره تنظیمات صفحه اصلی</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      )}

      {/* SUB-TAB: ACCOUNTING & FINANCIAL MANAGEMENT (بخش حسابداری و مالی) */}
      {activeAdminSubTab === 'accounting' && (() => {
        // Accounting Filters & Calculations
        const filteredAccountingOrders = orders.filter((order) => {
          if (accountingStatusFilter !== 'ALL' && order.paymentStatus !== accountingStatusFilter) {
            return false;
          }
          if (accountingPeriodFilter !== 'ALL') {
            const orderDate = new Date(order.createdAt);
            const now = new Date();
            if (accountingPeriodFilter === 'TODAY') {
              if (orderDate.toDateString() !== now.toDateString()) return false;
            } else if (accountingPeriodFilter === 'WEEK') {
              const diffMs = now.getTime() - orderDate.getTime();
              if (diffMs > 7 * 86400000) return false;
            } else if (accountingPeriodFilter === 'MONTH') {
              if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
            }
          }
          if (accountingSearchQuery.trim()) {
            const q = accountingSearchQuery.trim().toLowerCase();
            const matchTrack = order.trackingCode.toLowerCase().includes(q);
            const matchCustomer = order.customerName.toLowerCase().includes(q);
            const matchPhone = order.phoneNumber.toLowerCase().includes(q);
            const matchProd = order.productTitle.toLowerCase().includes(q);
            if (!matchTrack && !matchCustomer && !matchPhone && !matchProd) return false;
          }
          return true;
        });

        const paidOrdersList = filteredAccountingOrders.filter(o => o.paymentStatus === 'PAID');
        const totalSalesToman = paidOrdersList.reduce((acc, o) => acc + (o.calculatedToman || 0), 0);
        const totalAedSpent = paidOrdersList.reduce((acc, o) => acc + (o.priceAed || 0), 0);
        const totalCargoAed = paidOrdersList.reduce((acc, o) => acc + ((o.weightKg || 0.5) * (o.cargoRatePerKg || settings.cargoRatePerKg)), 0);
        const totalCargoToman = Math.round(totalCargoAed * settings.aedRate);
        const totalWeightKg = paidOrdersList.reduce((acc, o) => acc + (o.weightKg || 0.5), 0);

        const totalCostToman = Math.round(paidOrdersList.reduce((acc, o) => {
          const cargoAed = (o.weightKg || 0.5) * (o.cargoRatePerKg || settings.cargoRatePerKg);
          return acc + ((o.priceAed + cargoAed) * o.aedRate);
        }, 0));

        const totalNetProfitToman = Math.max(0, totalSalesToman - totalCostToman);
        const profitMarginPercentage = totalSalesToman > 0 ? ((totalNetProfitToman / totalSalesToman) * 100).toFixed(1) : settings.profitMargin;
        const averageOrderValue = paidOrdersList.length > 0 ? Math.round(totalSalesToman / paidOrdersList.length) : 0;

        return (
          <div className="space-y-6">
            {/* Header Action Bar */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span>بخش حسابداری و مدیریت مالی (Real-time Ledger)</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      بروزرسانی زنده
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    تحلیل سود واقعی، هزینه‌های کارگو، خرید درهمی دبی و خروجی گزارش فاکتورها
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportFinancialCsv(filteredAccountingOrders)}
                  className="bg-[#111111] hover:bg-black text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer border border-[#111111]"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>دریافت خروجی گزارش CSV</span>
                </button>

                <button
                  type="button"
                  onClick={fetchAdminOrders}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold p-2.5 rounded-xl transition cursor-pointer"
                  title="به‌روزرسانی اطلاعات"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin text-slate-900' : ''}`} />
                </button>
              </div>
            </div>

            {/* Period Filter Tabs & Status Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <span className="text-xs font-extrabold text-slate-600 flex items-center gap-1 shrink-0 ml-1">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>فیلتر زمان:</span>
                </span>
                {(
                  [
                    { id: 'ALL', label: 'همه زمان‌ها' },
                    { id: 'TODAY', label: 'امروز' },
                    { id: 'WEEK', label: 'هفته جاری' },
                    { id: 'MONTH', label: 'ماه جاری' }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAccountingPeriodFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      accountingPeriodFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={accountingSearchQuery}
                  onChange={e => setAccountingSearchQuery(e.target.value)}
                  placeholder="جستجو نام، کد پیگیری یا محصول..."
                  className="w-full sm:w-64 bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 font-medium"
                />
                <select
                  value={accountingStatusFilter}
                  onChange={e => setAccountingStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold px-2.5 py-2 rounded-xl focus:outline-none shrink-0 cursor-pointer"
                >
                  <option value="ALL">همه پرداخت‌ها</option>
                  <option value="PAID">پرداخت موفق</option>
                  <option value="PENDING">در انتظار</option>
                  <option value="FAILED">ناموفق</option>
                </select>
              </div>
            </div>

            {/* Real-time Ledger Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Sales */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold">کل فروش فاکتور شده</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-600">
                  {formatToman(totalSalesToman)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center justify-between">
                  <span>از {toPersianDigits(paidOrdersList.length)} سفارش پرداخت‌شده</span>
                  <span className="text-emerald-700 font-bold">میانگین: {formatToman(averageOrderValue)}</span>
                </div>
              </div>

              {/* Card 2: Total AED Spent */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold">خرید درهمی کالا (دبی)</span>
                  <Coins className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-600">
                  {formatAed(totalAedSpent)}
                </div>
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  معادل {formatToman(Math.round(totalAedSpent * settings.aedRate))}
                </span>
              </div>

              {/* Card 3: Cargo Expenses */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold">هزینه حمل و کارگو هوایی</span>
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-blue-600">
                  {formatAed(totalCargoAed)}
                </div>
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  معادل {formatToman(totalCargoToman)} ({toPersianDigits(totalWeightKg.toFixed(1))} کیلوگرم)
                </span>
              </div>

              {/* Card 4: Net Profit Margin */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold">سود خالص تخمینی (تومان)</span>
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600">
                  {formatToman(totalNetProfitToman)}
                </div>
                <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                  حاشیه سود: ٪{toPersianDigits(profitMarginPercentage)}
                </span>
              </div>
            </div>

            {/* Transactions Table / Ledger List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs overflow-x-auto">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <span>دفتر روزنامه تراکنش‌ها و جزئیات فاکتورها</span>
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  نمایش {toPersianDigits(filteredAccountingOrders.length)} تراکنش
                </span>
              </div>

              {filteredAccountingOrders.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-medium">
                  هیچ تراکنشی مطابق با فیلترهای انتخاب شده یافت نشد.
                </div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                      <th className="p-3">کد پیگیری & تاریخ</th>
                      <th className="p-3">نام مشتری</th>
                      <th className="p-3">محصول سفارشی</th>
                      <th className="p-3">قیمت پایه (درهم)</th>
                      <th className="p-3">سهم کارگو</th>
                      <th className="p-3">سود دبی</th>
                      <th className="p-3">مبلغ فاکتور (تومان)</th>
                      <th className="p-3 text-center">وضعیت پرداخت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredAccountingOrders.map(order => {
                      const cargoAed = (order.weightKg || 0.5) * (order.cargoRatePerKg || settings.cargoRatePerKg);
                      const cargoToman = Math.round(cargoAed * order.aedRate);
                      const profitToman = Math.round(((order.priceAed + cargoAed) * (order.profitMargin / 100)) * order.aedRate);

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3">
                            <div className="font-extrabold text-slate-900 dir-ltr text-left sm:text-right">{order.trackingCode}</div>
                            <div className="text-[10px] text-slate-500">{formatPersianDate(order.createdAt)}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{order.customerName}</div>
                            <div className="text-[11px] text-slate-500">{order.phoneNumber}</div>
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="font-medium text-slate-800 line-clamp-1">{order.productTitle}</div>
                            <div className="text-[10px] text-slate-400">{order.storeName || 'دبی'}</div>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{formatAed(order.priceAed)}</td>
                          <td className="p-3 text-slate-700">
                            {formatAed(cargoAed)}
                            <span className="text-[10px] text-slate-400 block">({formatToman(cargoToman)})</span>
                          </td>
                          <td className="p-3 font-bold text-emerald-700">{formatToman(profitToman)}</td>
                          <td className="p-3 font-black text-rose-600">{formatToman(order.calculatedToman)}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : order.paymentStatus === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {order.paymentStatus === 'PAID' ? 'پرداخت شده' : order.paymentStatus === 'PENDING' ? 'در انتظار' : 'ناموفق'}
                            </span>
                            {order.paymentRefId && (
                              <div className="text-[9px] font-mono text-slate-400 dir-ltr mt-0.5">{order.paymentRefId}</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black text-xs">
                      <td colSpan={3} className="p-3 text-right">
                        مجموع گزارش جاری ({toPersianDigits(paidOrdersList.length)} سفارش پرداخت شده)
                      </td>
                      <td className="p-3">{formatAed(totalAedSpent)}</td>
                      <td className="p-3">{formatAed(totalCargoAed)}</td>
                      <td className="p-3 text-emerald-400">{formatToman(totalNetProfitToman)}</td>
                      <td className="p-3 text-rose-300">{formatToman(totalSalesToman)}</td>
                      <td className="p-3 text-center">-</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        );
      })()}

      {/* SUB-TAB: PAYMENT GATEWAY SETTINGS (تنظیمات درگاه پرداخت) */}
      {activeAdminSubTab === 'gateway' && (
        <form onSubmit={handleSaveGatewaySettings} className="space-y-6">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-black shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>تنظیمات درگاه پرداخت آنلاین و کارت‌به‌کارت</span>
                  <span className="bg-slate-100 text-slate-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-slate-200">
                    شاپرک و واریز مستقیم
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  پیکربندی درگاه‌های زرین‌پال، زیبال، نکست‌پی، آیدی‌پال و اطلاعات حساب کارت به کارت
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingGateway}
              className="bg-[#111111] hover:bg-black text-white text-xs font-extrabold px-6 py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer border border-[#111111]"
            >
              {isSavingGateway ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Save className="w-4 h-4 text-emerald-400" />
              )}
              <span>ذخیره تنظیمات درگاه</span>
            </button>
          </div>

          {saveGatewaySuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-extrabold flex items-center gap-2.5 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>تنظیمات درگاه پرداخت با موفقیت در سیستم و سرور ذخیره شد.</span>
            </div>
          )}

          {/* Gateway Selector Cards Grid */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Wallet className="w-4.5 h-4.5 text-slate-700" />
                <span>انتخاب درگاه پرداخت فعال در سایت:</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                درگاه انتخاب شده به عنوان روش اصلی تسویه‌حساب سفارشات به کاربران نمایش داده می‌شود.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { id: 'zarinpal', name: 'زرین‌پال', badge: 'ZarinPal' },
                { id: 'zibal', name: 'زیبال', badge: 'Zibal' },
                { id: 'nextpay', name: 'نکست‌پی', badge: 'NextPay' },
                { id: 'idpay', name: 'آیدی‌پال', badge: 'IDPay' },
                { id: 'card_to_card', name: 'کارت به کارت', badge: 'Manual' }
              ].map(gw => {
                const isSelected = activeGateway === gw.id;
                return (
                  <button
                    key={gw.id}
                    type="button"
                    onClick={() => setActiveGateway(gw.id as GatewayProvider)}
                    className={`p-4 rounded-2xl border-2 transition text-right cursor-pointer flex flex-col justify-between h-28 relative ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {gw.badge}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-extrabold text-sm block">{gw.name}</span>
                      <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {gw.id === 'card_to_card' ? 'واریز دستی بانکی' : 'درگاه پرداخت آنلاین'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Online Gateway Credentials Form (Show if not card-to-card) */}
          {activeGateway !== 'card_to_card' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Key className="w-4.5 h-4.5 text-slate-700" />
                    <span>کلیدها و اطلاعات فنی درگاه {activeGateway.toUpperCase()}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">اطلاعات اتصال به ای‌پی‌ای (API Key / Merchant ID)</p>
                </div>
                <span className="text-xs font-extrabold px-3 py-1 bg-slate-100 rounded-xl text-slate-700">
                  سرویس: {activeGateway}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Merchant ID / API Key Input */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">
                    کد مرچنت یا کلید API اختصاصی (Merchant ID / API Key):
                  </label>
                  <div className="relative">
                    <input
                      type={showMerchantSecret ? 'text' : 'password'}
                      value={merchantId}
                      onChange={e => setMerchantId(e.target.value)}
                      placeholder="e.g. zarin_merchant_8841920"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none transition pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMerchantSecret(!showMerchantSecret)}
                      className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showMerchantSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    این کد پین یا کلید از پنل کاربری درگاه بانکی اخذ می‌شود.
                  </span>
                </div>

                {/* Callback URL */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">
                    آدرس بازگشت تراکنش (Callback URL):
                  </label>
                  <input
                    type="text"
                    value={callbackUrl}
                    onChange={e => setCallbackUrl(e.target.value)}
                    placeholder="/api/payment/callback"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none transition dir-ltr text-left font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    آدرسی که بانک پس از انجام تراکنش، کاربر را به آن هدایت می‌کند.
                  </span>
                </div>
              </div>

              {/* Sandbox / Test Mode Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">حالت تست و آزمایش (Sandbox / Test Mode)</span>
                  <span className="text-[11px] text-slate-500 block">
                    در حالت تست، کارت‌های بانکی به صورت شبیه‌سازی شده پردازش می‌شوند و مبلغ واقعی کسر نمی‌گردد.
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isSandbox}
                    onChange={e => setIsSandbox(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full dir-ltr peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* Manual Card-to-Card Details Panel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-slate-700" />
                <span>اطلاعات حساب و واریز کارت به کارت (کارت بانکی مدیریت)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                برای واریز مستقیم یا جایگزین درگاه بانکی، اطلاعات کارت را وارد کنید.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card Number */}
              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">شماره کارت ۱۶ رقمی (Card Number):</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  placeholder="6037-9918-4421-9876"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none transition dir-ltr text-center font-mono"
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">نام بانک صادرکننده (Bank Name):</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="مثال: بانک ملی ایران"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                />
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">نام و خانوادگی صاحب حساب:</label>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={e => setCardholderName(e.target.value)}
                  placeholder="به نام مدیریت بازرگانی سیریک فیت پرو"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">شماره شبا (اختیاری):</label>
              <input
                type="text"
                value={shabaNumber}
                onChange={e => setShabaNumber(e.target.value)}
                placeholder="IR680170000000109988772001"
                className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none transition dir-ltr text-left font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingGateway}
              className="w-full bg-[#111111] hover:bg-black text-white font-extrabold text-sm py-4 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer border border-[#111111]"
            >
              {isSavingGateway ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5 text-emerald-400" />
              )}
              <span>ذخیره نهایی تنظیمات درگاه پرداخت</span>
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB: PRICING RULES */}
      {activeAdminSubTab === 'pricingRules' && (
        <PricingRulesAdmin
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          cms={cms}
          onUpdateCms={onUpdateCms}
          onSavePricingRules={(newRules) => {
            if (cms) {
              onUpdateCms({ ...cms, pricingRules: newRules });
            }
          }}
        />
      )}

      {/* SUB-TAB: PASSWORD MANAGEMENT & SECURITY (رمز عبور و امنیت) */}
      {activeAdminSubTab === 'security' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-black shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>مدیریت کلمه عبور و امنیت پنل مدیریت</span>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200">
                    امنیت بالارتبه
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  تغییر رمز عبور ورود به سیستم، تنظیم ایمیل بازیابی و مشاهده لاگ‌های فعالیت امنیتی (Audit Trail)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchAuditLogs}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              <span>به‌روزرسانی لاگ‌های امنیتی</span>
            </button>
          </div>

          {/* Password Change Feedback Messages */}
          {passMessage && (
            <div
              className={`p-4 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 shadow-2xs ${
                passMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border border-rose-300 text-rose-800'
              }`}
            >
              {passMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{passMessage.text}</span>
            </div>
          )}

          {/* 2-Column Grid: Change Password & Password Recovery */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Form 1: Change Admin Password */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-extrabold text-sm text-slate-900">تغییر کلمه عبور مدیر سیستم</h4>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">حداقل ۶ کاراکتر</span>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">کلمه عبور فعلی:</label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="رمز عبور کنونی مدیر را وارد کنید"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-3 rounded-xl focus:outline-none transition pr-3 pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">کلمه عبور جدید:</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="کلمه عبور جدید معتبر"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-3 rounded-xl focus:outline-none transition pr-3 pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">قدرت کلمه عبور:</span>
                        <span
                          className={`font-black ${
                            newPassword.length >= 8
                              ? 'text-emerald-600'
                              : newPassword.length >= 6
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {newPassword.length >= 8 ? 'قوی (عالی)' : newPassword.length >= 6 ? 'متوسط' : 'ضعیف (کاهش امنیت)'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            newPassword.length >= 8
                              ? 'w-full bg-emerald-500'
                              : newPassword.length >= 6
                              ? 'w-2/3 bg-amber-500'
                              : 'w-1/3 bg-rose-500'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">تکرار کلمه عبور جدید:</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="مجدداً کلمه عبور جدید را وارد نمایید"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-3 rounded-xl focus:outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full bg-[#111111] hover:bg-black text-white font-extrabold text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {isChangingPass ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  ) : (
                    <Save className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>ثبت و ذخیره کلمه عبور جدید</span>
                </button>
              </form>
            </div>

            {/* Form 2: Recovery Email & Forgot Password System */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-extrabold text-sm text-slate-900">بازیابی کلمه عبور و کد تایید OTP</h4>
                </div>
                <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                  انقضا: ۱۵ دقیقه
                </span>
              </div>

              {forgotMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    forgotMessage.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{forgotMessage.text}</span>
                </div>
              )}

              {forgotStep === 'REQUEST' ? (
                <form onSubmit={handleRequestForgotCode} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    در صورت فراموشی کلمه عبور، آدرس ایمیل ثبت‌شده مدیریت را وارد کنید تا یک کد ۶ رقمی تایید یک‌بارمصرف (OTP) جهت بازنشانی ارسال گردد.
                  </p>

                  <div>
                    <label className="text-xs font-extrabold text-slate-800 block mb-1">آدرس ایمیل پشتیبان مدیر:</label>
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="omran.javan73@gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-3 rounded-xl focus:outline-none transition dir-ltr text-left font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingForgot}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isSendingForgot ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>ارسال کد ۶ رقمی بازیابی به ایمیل</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-xs text-indigo-900 font-medium">
                    کد تایید ارسال شده به ایمیل <strong className="font-bold">{recoveryEmail}</strong> را وارد نمایید.
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-800 block mb-1">کد تایید ۶ رقمی OTP:</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtpCode}
                      onChange={(e) => setForgotOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 text-slate-900 text-center font-black text-lg tracking-widest py-2.5 rounded-xl focus:outline-none transition font-mono dir-ltr"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-800 block mb-1">کلمه عبور جدید:</label>
                    <input
                      type="password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="رمز عبور جدید را وارد کنید"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 text-slate-900 text-xs font-bold px-3.5 py-3 rounded-xl focus:outline-none transition"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep('REQUEST')}
                      className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3.5 rounded-xl transition"
                    >
                      بازگشت
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingForgot}
                      className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSendingForgot ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>تایید و بازنشانی رمز</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Audit Trail & Security Event Logs Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-indigo-600" />
                  <span>لاگ رویدادهای امنیتی و تغییرات سیستم (Audit Trail)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">ثبت زنده تمام تغییرات رمز، بک‌آپ‌ها و دسترسی‌های مدیر</p>
              </div>

              {/* Log Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['ALL', 'SECURITY', 'BACKUP', 'AUTH'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLogFilterCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                      logFilterCategory === cat
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'همه' : cat === 'SECURITY' ? 'امنیتی' : cat === 'BACKUP' ? 'پشتیبان' : 'احراز هویتی'}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="py-8 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>در حال دریافت لاگ‌های امنیتی سرور...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                هنوز لاگ جدیدی ثبت نشده است. با انجام تغییرات کلمه عبور یا ایجاد بک‌آپ، رویدادها اینجا نمایش داده می‌شوند.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-3.5 font-extrabold">تاریخ و زمان</th>
                      <th className="py-3 px-3.5 font-extrabold">رویداد</th>
                      <th className="py-3 px-3.5 font-extrabold">دسته‌بندی</th>
                      <th className="py-3 px-3.5 font-extrabold">انجام‌دهنده</th>
                      <th className="py-3 px-3.5 font-extrabold">جزئیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs
                      .filter((l) => logFilterCategory === 'ALL' || l.category === logFilterCategory)
                      .slice(0, 15)
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                            {formatPersianDate(log.timestamp)}
                          </td>
                          <td className="py-3 px-3.5 font-extrabold text-slate-900">
                            <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-mono">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                log.category === 'SECURITY'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : log.category === 'BACKUP'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}
                            >
                              {log.category === 'SECURITY' ? 'امنیتی' : log.category === 'BACKUP' ? 'بک‌آپ' : 'احراز هویت'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-800">{log.performedBy || 'مدیر'}</td>
                          <td className="py-3 px-3.5 text-slate-600 font-medium max-w-xs truncate">{log.details}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB: BACKUP & RESTORE (مدیریت پشتیبان‌گیری، ایمیل و بازگردانی) */}
      {activeAdminSubTab === 'backup' && (
        <div className="space-y-6">
          {/* Header Banner & Global Actions */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base sm:text-lg text-slate-900">
                    مدیریت بک‌آپ و پشتیبان‌گیری دیتابیس
                  </h3>
                  <span className="bg-emerald-50 text-emerald-700 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    فرمت JSON استاندارد
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  امکان دریافت خروجی مستقیم، ارسال به ایمیل (Gmail)، پشتیبان‌گیری ابری خودکار و بازیابی کامل اطلاعات
                </p>
              </div>
            </div>

            {/* Quick Actions & Multi-device Badges */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200">
                <span>سازگار با دسکتاپ و موبایل</span>
                <span className="text-emerald-600">📱💻</span>
              </div>

              <button
                type="button"
                onClick={handleCreateManualSnapshot}
                disabled={isCreatingSnapshot}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 sm:py-3 rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isCreatingSnapshot ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>ایجاد بک‌آپ ابری</span>
              </button>

              <button
                type="button"
                onClick={handleExportBackup}
                className="bg-slate-900 hover:bg-black text-white text-xs font-extrabold px-4 py-2.5 sm:py-3 rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>دانلود مستقیم JSON</span>
              </button>
            </div>
          </div>

          {/* Feedback Message Alert */}
          {backupMessage && (
            <div
              className={`p-4 rounded-2xl text-xs font-extrabold flex items-center justify-between gap-3 shadow-2xs transition ${
                backupMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {backupMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span className="leading-relaxed">{backupMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setBackupMessage(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>
          )}

          {/* Core Feature Cards (Grid Layout - Multi-device Compatible) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            
            {/* CARD 1: Email / Gmail Backup System */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-black shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">پشتیبان‌گیری و ارسال به ایمیل (Gmail)</h4>
                      <p className="text-[11px] text-slate-500 font-medium">دریافت گزارش کامل و فایل پشتیبان در صندوق ورودی ایمیل</p>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-200">
                    Gmail & Mail
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-extrabold text-slate-800 block mb-1">
                      آدرس ایمیل دریافت‌کننده بک‌آپ:
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={emailBackupTarget}
                        onChange={(e) => setEmailBackupTarget(e.target.value)}
                        placeholder="omran.javan73@gmail.com"
                        className="w-full bg-slate-50 border border-slate-300 focus:border-slate-800 text-slate-900 text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl focus:outline-none dir-ltr text-left font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-500">
                      <span>پیشنهاد:</span>
                      <button
                        type="button"
                        onClick={() => setEmailBackupTarget('omran.javan73@gmail.com')}
                        className="text-indigo-600 font-bold hover:underline font-mono"
                      >
                        omran.javan73@gmail.com
                      </button>
                    </div>
                  </div>

                  {/* Gmail Result Actions (If generated) */}
                  {lastEmailBackupResult && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-amber-600" />
                          <span>نسخه پشتیبان جدید آماده ارسال می‌باشد</span>
                        </span>
                        {lastEmailBackupResult.gmailUrl && (
                          <a
                            href={lastEmailBackupResult.gmailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1 rounded-lg text-[11px] transition inline-flex items-center gap-1"
                          >
                            <span>باز کردن Gmail</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {lastEmailBackupResult.emailBody && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${lastEmailBackupResult.emailSubject}\n\n${lastEmailBackupResult.emailBody}`
                              );
                              setCopiedEmailBackupText(true);
                              setTimeout(() => setCopiedEmailBackupText(false), 2500);
                            }}
                            className="w-full bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 font-bold py-1.5 px-3 rounded-xl transition text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {copiedEmailBackupText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedEmailBackupText ? 'خلاصه متن در حافظه کپی شد' : 'کپی خلاصه متن گزارش برای ارسال'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleSendEmailBackup(true)}
                  disabled={isSendingEmailBackup}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold py-3 px-3 rounded-xl transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSendingEmailBackup ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>ارسال و باز کردن در Gmail</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendEmailBackup(false)}
                  disabled={isSendingEmailBackup}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-extrabold py-3 px-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-slate-600" />
                  <span>ثبت و دریافت لینک ایمیل</span>
                </button>
              </div>
            </div>

            {/* CARD 2: Scheduled Automated Backups Config */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-black shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">تنظیمات پشتیبان‌گیری خودکار</h4>
                      <p className="text-[11px] text-slate-500 font-medium">زمان‌بندی تکرار ایجاد بک‌آپ در سرور</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                    backupSchedule.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {backupSchedule.enabled ? 'سیستم فعال' : 'غیرفعال'}
                  </span>
                </div>

                <form onSubmit={handleSaveBackupSchedule} className="space-y-3.5 pt-2">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-xs font-extrabold text-slate-800">فعال‌سازی بک‌آپ خودکار:</span>
                    <button
                      type="button"
                      onClick={() => setBackupSchedule({ ...backupSchedule, enabled: !backupSchedule.enabled })}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        backupSchedule.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                          backupSchedule.enabled ? 'right-6' : 'right-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-extrabold text-slate-800 block mb-1">بازه تکرار:</label>
                      <select
                        value={backupSchedule.intervalHours}
                        onChange={(e) =>
                          setBackupSchedule({ ...backupSchedule, intervalHours: Number(e.target.value) })
                        }
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold px-3 py-2.5 rounded-xl focus:outline-none"
                      >
                        <option value={4}>هر ۴ ساعت</option>
                        <option value={6}>هر ۶ ساعت</option>
                        <option value={12}>هر ۱۲ ساعت</option>
                        <option value={24}>هر ۲۴ ساعت (روزانه)</option>
                        <option value={168}>هر ۷ روز (هفتگی)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-800 block mb-1">زمان اجرای ترجیحی:</label>
                      <input
                        type="text"
                        value={backupSchedule.preferredTime}
                        onChange={(e) => setBackupSchedule({ ...backupSchedule, preferredTime: e.target.value })}
                        placeholder="02:00"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold px-3 py-2.5 rounded-xl focus:outline-none text-center font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-800 block mb-1">ایمیل اطلاع‌رسانی سیستم:</label>
                    <input
                      type="email"
                      value={backupSchedule.notifyEmail}
                      onChange={(e) => setBackupSchedule({ ...backupSchedule, notifyEmail: e.target.value })}
                      placeholder="omran.javan73@gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none dir-ltr text-left font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSchedule}
                    className="w-full bg-slate-900 hover:bg-black text-white text-xs font-extrabold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    {isSavingSchedule ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Save className="w-4 h-4 text-emerald-400" />}
                    <span>ذخیره تنظیمات زمان‌بندی</span>
                  </button>
                </form>
              </div>
            </div>

            {/* CARD 3: Quick Direct Export & Data Summary */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-black shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">خروجی مستقیم دیتابیس (JSON)</h4>
                      <p className="text-[11px] text-slate-500 font-medium">دانلود آنی نسخه خام برای نگهداری محلی</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-mono font-bold">
                    .JSON
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[11px] text-slate-500 font-bold block mb-0.5">تعداد سفارشات:</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      {toPersianDigits(orders.length)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[11px] text-slate-500 font-bold block mb-0.5">محصولات انبار:</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      {toPersianDigits(localInventoryList.length)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  فایل پشتیبان حاوی کلیه اطلاعات سفارشات، موجودی انبار ایران، تنظیمات نرخ درهم، پیشنهادهای ویژه و ساختار عمومی سامانه است.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-3 px-4 rounded-xl transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>دانلود آنی فایل پشتیبان (JSON)</span>
                </button>
              </div>
            </div>

            {/* CARD 4: Manual File Restore */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center font-black shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">بازگردانی از فایل پشتیبان</h4>
                      <p className="text-[11px] text-slate-500 font-medium">بارگذاری فایل JSON جهت بازگردانی دیتابیس</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md font-mono font-bold">
                    Restore
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed my-3">
                  اگر فایل پشتیبان <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">sirikfit-backup.json</code> دارید، آن را بارگذاری نمایید تا داده‌ها به‌روزرسانی شوند.
                </p>
              </div>

              <div>
                <label className="w-full bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl p-5 transition flex flex-col items-center justify-center cursor-pointer text-center group">
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportBackup(file);
                    }}
                    disabled={isRestoringBackup}
                  />
                  {isRestoringBackup ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 py-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                      <span>در حال پردازش و بازگردانی اطلاعات...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-700 mb-1.5 transition" />
                      <span className="text-xs font-extrabold text-slate-800">انتخاب یا رهاسازی فایل JSON پشتیبان</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">قابل استفاده روی گوشی موبایل و کامپیوتر</span>
                    </>
                  )}
                </label>
              </div>
            </div>

          </div>

          {/* Cloud Snapshots History Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-emerald-600" />
                  <span>تاریخچه نسخه‌های پشتیبان ابری (Cloud Snapshots)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">نسخه‌های ذخیره‌شده در فایربیس با قابلیت دانلود و بازیابی مستقیم</p>
              </div>

              <button
                type="button"
                onClick={fetchBackupsList}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                <span>بروزرسانی لیست</span>
              </button>
            </div>

            {isLoadingBackups ? (
              <div className="py-8 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>در حال فراخوانی لیست نسخه‌های پشتیبان...</span>
              </div>
            ) : backupList.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                هنوز هیچ نسخه پشتیبان ابری ثبت نشده است. با کلیک بر روی «ایجاد بک‌آپ ابری» یا «ارسال به ایمیل» نسخه جدیدی ایجاد نمایید.
              </div>
            ) : (
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">عنوان نسخه</th>
                      <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">تاریخ و زمان ایجاد</th>
                      <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">نوع</th>
                      <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">حجم</th>
                      <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">خلاصه آیتم‌ها</th>
                      <th className="py-3 px-3.5 font-extrabold text-center whitespace-nowrap">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backupList.map((bk) => (
                      <tr key={bk.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-3.5 font-extrabold text-slate-900 whitespace-nowrap">{bk.title || bk.id}</td>
                        <td className="py-3.5 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {formatPersianDate(bk.createdAt)}
                        </td>
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              bk.type === 'AUTOMATIC'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : bk.type === 'EMAIL_BACKUP'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {bk.type === 'AUTOMATIC' ? 'خودکار' : bk.type === 'EMAIL_BACKUP' ? 'ایمیلی' : 'دستی'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 font-mono text-slate-700 font-bold whitespace-nowrap">
                          {((bk.sizeBytes || 0) / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-3.5 px-3.5 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span>سفارشات: <strong>{toPersianDigits(bk.itemsCount?.orders || 0)}</strong></span>
                            <span>انبار: <strong>{toPersianDigits(bk.itemsCount?.localInventory || 0)}</strong></span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bk.data, null, 2));
                                const a = document.createElement('a');
                                a.href = dataStr;
                                a.download = `${bk.id}.json`;
                                a.click();
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition cursor-pointer"
                              title="دانلود فایل JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedBackupForRestore(bk)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>بازیابی</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSnapshot(bk.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg transition cursor-pointer"
                              title="حذف پشتیبان"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Database Health Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                  <span>وضعیت اتصال و سلامت دیتابیس فایربیس (Firestore)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">وضعیت همگام‌سازی ابری همزمان روی کلیه دستگاه‌ها</p>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                وضعیت: فعال و متصل
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="text-slate-500 font-medium block mb-1">اتصال به دیتابیس فایربیس:</span>
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${dbStatus.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {dbStatus.connected ? 'متصل به Firestore (Real-time Sync)' : 'در حال بررسی اتصال...'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="text-slate-500 font-medium block mb-1">شناسه دیتابیس پروژه:</span>
                <span className="font-extrabold text-slate-900 font-mono text-[11px] truncate block">
                  {dbStatus.dbId || 'ai-studio-omexdubaiimportp'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="text-slate-500 font-medium block mb-1">آخرین چک آنلاین:</span>
                <span className="font-extrabold text-slate-900">
                  {formatPersianDate(new Date().toISOString())}
                </span>
              </div>
            </div>
          </div>

          {/* Modal for Restore Confirmation */}
          {selectedBackupForRestore && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dir-rtl">
                <div className="flex items-center gap-3 text-rose-600">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <h3 className="font-black text-base text-slate-900">هشدار بازگردانی دیتابیس</h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  شما در حال بازگردانی داده‌های دیتابیس به نسخه پشتیبان <strong className="font-bold text-slate-900">{selectedBackupForRestore.title || selectedBackupForRestore.id}</strong> هستید. کلیه سفارشات و اطلاعات موجود همگام خواهند شد. آیا مطمئن هستید؟
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBackupForRestore(null)}
                    className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRestoreSelectedSnapshot(selectedBackupForRestore)}
                    className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isRestoringBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>تایید و بازگردانی</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
