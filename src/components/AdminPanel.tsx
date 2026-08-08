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
import { checkFirestoreConnection, saveSettingsToFirestore } from '../firebase';
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
    id: 'store-1',
    title: 'Doctor Nutrition Dubai',
    description: 'بزرگترین مرجع تخصصی مکمل‌های ورزشی، ویتامین و پروتئین ایزوله در امارات و خاورمیانه',
    url: 'https://www.drnutrition.com/en-ae',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif">dnp</text></svg>',
    badge: 'تخفیف ویژه دبی',
    samplePriceAed: 320,
    sampleWeightKg: 2.3,
    enabled: true
  },
  {
    id: 'store-2',
    title: 'Life Pharmacy UAE',
    description: 'بزرگترین زنجیره داروخانه آنلاین دبی - داروها، ویتامین‌ها، مکمل‌ها و محصولات آرایشی بهداشتی معتبر',
    url: 'https://www.lifepharmacy.com',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="172" text-anchor="middle" fill="%23C42582" font-weight="900" font-size="36" font-family="sans-serif">LIFE%C2%AE</text></svg>',
    badge: 'داروخانه آنلاین دبی',
    samplePriceAed: 150,
    sampleWeightKg: 0.5,
    enabled: true
  },
  {
    id: 'store-3',
    title: 'GNC UAE',
    description: 'نمایندگی رسمی برند جهانی GNC در امارات - انواع مولتی‌ویتامین‌ها، امگا ۳ و مکمل‌های سلامتی اورجینال',
    url: 'https://gnc-mena.com',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="115" text-anchor="middle" fill="%23E31837" font-weight="900" font-size="70" font-family="Arial,sans-serif">GNC</text></svg>',
    badge: 'ضمانت ۱۰۰٪ اورجینال',
    samplePriceAed: 180,
    sampleWeightKg: 0.8,
    enabled: true
  }
];

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

  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'dashboard' | 'orders' | 'financial' | 'cms' | 'deals' | 'inventory' | 'homeContent' | 'accounting' | 'gateway' | 'pricingRules' | 'backup' | 'security' | 'apiSettings'
  >('dashboard');

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

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

  const [accountingPeriodFilter, setAccountingPeriodFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [accountingSearchQuery, setAccountingSearchQuery] = useState<string>('');
  const [accountingStatusFilter, setAccountingStatusFilter] = useState<string>('ALL');

  const [aedRateInput, setAedRateInput] = useState<string>(String(settings.aedRate));
  const [manualAedRateInput, setManualAedRateInput] = useState<string>(String(settings.manualAedRate || settings.aedRate || 53000));
  const [cargoRateInput, setCargoRateInput] = useState<string>(String(settings.cargoRatePerKg));
  const [profitMarginInput, setProfitMarginInput] = useState<string>(String(settings.profitMargin));
  const [minOrderAedInput, setMinOrderAedInput] = useState<string>(String(settings.minOrderAed || 200));

  const [rateTestResult, setRateTestResult] = useState<{ message: string; type: 'success' | 'error' | 'warning'; rate?: number } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [heroTitle, setHeroTitle] = useState(cms?.heroTitle || '');
  const [heroSubtitle, setHeroSubtitle] = useState(cms?.heroSubtitle || '');
  const [heroNotice, setHeroNotice] = useState(cms?.heroNotice || '');
  const [heroImage, setHeroImage] = useState(cms?.heroImage || '');
  const [storesList, setStoresList] = useState<StoreCardItem[]>(() => {
    if (cms?.stores && cms.stores.length > 0) {
      return cms.stores;
    }
    return DEFAULT_STORES;
  });
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

  const handleBannerFileUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        handleUpdateBanner(index, 'imageUrl', result);
      }
    };
    reader.readAsDataURL(file);
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

  const [telegramBotToken, setTelegramBotToken] = useState<string>(cms?.apiConfig?.telegramBotToken || cms?.homeContent?.telegramBotToken || '');
  const [adminChatId, setAdminChatId] = useState<string>(cms?.apiConfig?.adminChatId || cms?.homeContent?.adminChatId || '');
  const [telegramNotifyEnabled, setTelegramNotifyEnabled] = useState<boolean>(cms?.apiConfig?.telegramNotifyEnabled ?? true);

  const [adminDestinationEmail, setAdminDestinationEmail] = useState<string>(cms?.apiConfig?.adminDestinationEmail || cms?.homeContent?.adminDestinationEmail || 'omran.javan73@gmail.com');
  const [emailNotifyEnabled, setEmailNotifyEnabled] = useState<boolean>(cms?.apiConfig?.emailNotifyEnabled ?? true);
  const [emailjsServiceId, setEmailjsServiceId] = useState<string>(cms?.apiConfig?.emailjsServiceId || '');
  const [emailjsTemplateId, setEmailjsTemplateId] = useState<string>(cms?.apiConfig?.emailjsTemplateId || '');
  const [emailjsPublicKey, setEmailjsPublicKey] = useState<string>(cms?.apiConfig?.emailjsPublicKey || '');
  const [resendApiKey, setResendApiKey] = useState<string>(cms?.apiConfig?.resendApiKey || '');

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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState('omran.javan73@gmail.com');
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [forgotMessage, setForgotMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSendingForgot, setIsSendingForgot] = useState(false);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilterCategory, setLogFilterCategory] = useState<string>('ALL');

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

  const [emailBackupTarget, setEmailBackupTarget] = useState('omran.javan73@gmail.com');
  const [isSendingEmailBackup, setIsSendingEmailBackup] = useState(false);
  const [copiedEmailBackupText, setCopiedEmailBackupText] = useState(false);
  const [lastEmailBackupResult, setLastEmailBackupResult] = useState<{
    gmailUrl?: string;
    mailtoUrl?: string;
    emailSubject?: string;
    emailBody?: string;
  } | null>(null);

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

      if (importedData.settings) {
        onUpdateSettings(importedData.settings);
        await saveSettingsToFirestore(importedData.settings);
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedData.settings)
        }).catch(() => {});
      }

      if (importedData.cms) {
        onUpdateCms(importedData.cms);
        await saveSettingsToFirestore(importedData.cms);
        await fetch('/api/cms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedData.cms)
        }).catch(() => {});
      }

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

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('حجم فایل تصویر لوگو نباید بیشتر از ۸ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeroBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert('حجم فایل تصویر بنر نباید بیشتر از ۱۵ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setHeroImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [isSavingCms, setIsSavingCms] = useState(false);
  const [saveCmsSuccess, setSaveCmsSuccess] = useState(false);

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

  const [dbStatus, setDbStatus] = useState<{ connected: boolean; dbId?: string; loading: boolean }>({
    connected: false,
    loading: true
  });

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
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });

      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('omex_admin_token', data.token);
        setIsAuthenticated(true);
        fetchAdminOrders();
      } else {
        setLoginError(data.error || 'رمز عبور اشتباه است.');
      }
    } catch (err) {
      setLoginError('خطا در برقراری ارتباط با سرور.');
    } finally {
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

    try {
      const res = await fetch('/api/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload)
      });

      if (res.ok) {
        setSaveGatewaySuccess(true);
        setTimeout(() => setSaveGatewaySuccess(false), 3500);
        if (cms) {
          onUpdateCms({ ...cms, paymentGateway: configPayload });
        }
      }
    } catch (err) {
      console.error('Error saving gateway config:', err);
    } finally {
      setIsSavingGateway(false);
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

  const handleAddStore = () => {
    const newStore: StoreCardItem = {
      id: 'store-' + Date.now(),
      title: 'فروشگاه جدید دبی',
      description: 'توضیحات کوتاه فروشگاه و برند‌های موجود',
      url: 'https://www.drnutrition.com',
      image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
      badge: 'ارسال سریع',
      samplePriceAed: 150,
      sampleWeightKg: 1.0,
      enabled: true
    };
    setStoresList([...storesList, newStore]);
  };

  const handleUpdateStoreField = (id: string, field: keyof StoreCardItem, value: any) => {
    setStoresList(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleDeleteStore = (id: string) => {
    setStoresList(prev => prev.filter(s => s.id !== id));
  };

  const [newDealUrlInput, setNewDealUrlInput] = useState('');
  const [isExtractingNewDeal, setIsExtractingNewDeal] = useState(false);

  const [newLocalUrlInput, setNewLocalUrlInput] = useState('');
  const [isExtractingNewLocalItem, setIsExtractingNewLocalItem] = useState(false);

  const handleAutoExtractAndAddLocalItem = async () => {
    if (!newLocalUrlInput.trim()) return;
    setIsExtractingNewLocalItem(true);
    try {
      const savedKeys = getEffectiveGeminiKeysList(cms?.apiConfig?.geminiApiKeys || cms?.apiConfig?.geminiApiKey);
      let isRestricted = enableDomainRestriction;

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

  const handleAutoExtractAndAddDeal = async () => {
    if (!newDealUrlInput.trim()) return;
    setIsExtractingNewDeal(true);
    try {
      const savedKeys = getEffectiveGeminiKeysList(cms?.apiConfig?.geminiApiKeys || cms?.apiConfig?.geminiApiKey);
      let isRestricted = enableDomainRestriction;

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
      const topPromoEl = document.getElementById('top-promo-strip');
      if (topPromoEl) {
        topPromoEl.style.display = homeSettings.showTopPromo ? 'flex' : 'none';
      }
      const topPromoTextEl = document.getElementById('top-promo-text');
      if (topPromoTextEl) {
        topPromoTextEl.textContent = homeSettings.topPromoText;
      }

      const appTitleEl = document.getElementById('header-app-title');
      if (appTitleEl) {
        appTitleEl.textContent = homeSettings.appTitle;
      }
      const appSubtitleEl = document.getElementById('header-app-subtitle');
      if (appSubtitleEl) {
        appSubtitleEl.textContent = homeSettings.appSubtitle;
      }
    } catch (e) {
      console.error('Error applying home content to DOM:', e);
    }
  };

  const handleSaveHomeContent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingCms(true);
    setSaveCmsSuccess(false);

    const sanitizedTitle = (appTitleText || 'SIRIK FIT').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').replace(/PRO/gi, '').replace(/OMEX/gi, '').trim() || 'SIRIK FIT';
    const sanitizedSubtitle = (appSubtitleText || 'مکملهای ورزشی و اورجینال').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').trim() || 'مکملهای ورزشی و اورجینال';

    const homeContentData: HomePageSettings = {
      topPromoText,
      showTopPromo,
      appTitle: sanitizedTitle,
      appSubtitle: sanitizedSubtitle,
      brandTitle: sanitizedTitle,
      brandSubtitle: sanitizedSubtitle,
      headerPillSlogan: headerPillSlogan || sanitizedSubtitle,
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
      announcementText: announcementSlogans[0] || announcementText,
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
        enableDomainRestriction,
        scraperApiKey,
        enableScraperApi
      }
    };

    applyHomeContentToDom(homeContentData);
    saveSettingsToFirestore(updatedCms);

    try {
      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCms)
      });

      let data: any = {};
      if (res.headers.get('content-type')?.includes('application/json')) {
        data = await res.json();
      }
      if (res.ok && data.cms) {
        onUpdateCms(data.cms);
      } else {
        onUpdateCms(updatedCms);
      }
      setSaveCmsSuccess(true);
      setTimeout(() => setSaveCmsSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving home content CMS:', err);
      onUpdateCms(updatedCms);
      setSaveCmsSuccess(true);
      setTimeout(() => setSaveCmsSuccess(false), 3000);
    } finally {
      setIsSavingCms(false);
    }
  };

  const handleSaveCms = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsSavingCms(true);
    setSaveCmsSuccess(false);

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
      homeContent: cms?.homeContent,
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
        enableDomainRestriction,
        scraperApiKey,
        enableScraperApi
      }
    };

    saveSettingsToFirestore(updatedCms);

    try {
      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCms)
      });

      let data: any = {};
      if (res.headers.get('content-type')?.includes('application/json')) {
        data = await res.json();
      }
      if (res.ok && data.cms) {
        onUpdateCms(data.cms);
        setSaveCmsSuccess(true);
        setTimeout(() => setSaveCmsSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving CMS:', err);
    } finally {
      setIsSavingCms(false);
    }
  };

  const totalRevenueToman = orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.calculatedToman, 0);

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
              placeholder="رمز عبور را وارد کنید"
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
      {/* Top Admin Header Bar */}
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
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
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
        </button>
      </div>

      {/* SUB-TAB 1: DASHBOARD & STATS */}
      {activeAdminSubTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 block mb-2">مجموع درآمد موفق</span>
              <div className="text-xl sm:text-2xl font-black text-rose-600">{formatToman(totalRevenueToman)}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 block mb-2">کل سفارشات ثبت شده</span>
              <div className="text-2xl font-black text-slate-900">{orders.length}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 block mb-2">در انتظار پرداخت</span>
              <div className="text-2xl font-black text-amber-600">{pendingOrdersCount}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 block mb-2">ارسال شده از دبی</span>
              <div className="text-2xl font-black text-blue-600">{shippedOrdersCount}</div>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default AdminPanel;