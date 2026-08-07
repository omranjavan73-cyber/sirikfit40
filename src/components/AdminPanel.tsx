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
  Building2,
  FileSpreadsheet,
  Check,
  Database
} from 'lucide-react';
import { checkFirestoreConnection, saveSettingsToFirestore, fetchSettingsFromFirestore } from '../firebase';
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
  PricingRulesConfig
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

  // Active Admin Sub-tab
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'dashboard' | 'orders' | 'accounting' | 'gateway' | 'pricingRules' | 'homeContent' | 'deals' | 'inventory' | 'cms' | 'apiSettings' | 'backup' | 'security'
  >('dashboard');

  // Forgot Password States
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [otpCodeInput, setForgotOtpCodeInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPasswordFromForgot, setNewPasswordFromForgot] = useState('');
  const [forgotStatusMsg, setForgotStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Security Tab Inputs
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [securityStatusMsg, setSecurityStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

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

  // Financial Form String Inputs
  const [aedRateInput, setAedRateInput] = useState<string>(String(settings.aedRate));
  const [manualAedRateInput, setManualAedRateInput] = useState<string>(String(settings.manualAedRate || settings.aedRate || 53000));
  const [cargoRateInput, setCargoRateInput] = useState<string>(String(settings.cargoRatePerKg));
  const [profitMarginInput, setProfitMarginInput] = useState<string>(String(settings.profitMargin));
  const [minOrderAedInput, setMinOrderAedInput] = useState<string>(String(settings.minOrderAed || 200));

  const [isTestingRateApi, setIsTestingRateApi] = useState<boolean>(false);
  const [rateTestResult, setRateTestResult] = useState<{ message: string; type: 'success' | 'error' | 'warning'; rate?: number } | null>(null);

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // CMS Form State
  const [heroTitle, setHeroTitle] = useState(cms?.heroTitle || '');
  const [heroSubtitle, setHeroSubtitle] = useState(cms?.heroSubtitle || '');
  const [heroNotice, setHeroNotice] = useState(cms?.heroNotice || '');
  const [heroImage, setHeroImage] = useState(cms?.heroImage || '');
  const [storesList, setStoresList] = useState<StoreCardItem[]>(cms?.stores || []);
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

  const [currencyApiUrl, setCurrencyApiUrl] = useState(cms?.apiConfig?.currencyApiUrl || '');
  const [scraperEndpoint, setScraperEndpoint] = useState(cms?.apiConfig?.scraperEndpoint || '');
  const [scraperApiKey, setScraperApiKey] = useState<string>(() => {
    try { return localStorage.getItem('scraper_api_key') || cms?.apiConfig?.scraperApiKey || ''; } catch (_e) { return cms?.apiConfig?.scraperApiKey || ''; }
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

  // Domain Whitelist & Restrictions State
  const DEFAULT_ALLOWED_DOMAINS = ['gnc-mena.com', 'drnutrition.com', 'lifepharmacy.com', 'sporter.com', 'amazon.ae'];
  const initialAllowedDomains = cms?.apiConfig?.allowedDomains?.length ? cms.apiConfig.allowedDomains : DEFAULT_ALLOWED_DOMAINS;
  const [allowedDomainsInput, setAllowedDomainsInput] = useState<string>(initialAllowedDomains.join('\n'));
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
  const [logoUrl, setLogoUrl] = useState(cms?.homeContent?.logoUrl || cms?.logoUrl || '');

  const [heroMainHeadline, setHeroMainHeadline] = useState(cms?.homeContent?.heroMainHeadline || 'فقط اورجینال، فقط');
  const [heroHighlightWord, setHeroHighlightWord] = useState(cms?.homeContent?.heroHighlightWord || 'نتیجه.');
  const [heroBannerSubtitle, setHeroBannerSubtitle] = useState(cms?.homeContent?.heroSubtitle || 'تضمین اصالت کالا، تضمین کیفیت.');
  const [heroImageUrl, setHeroImageUrl] = useState(cms?.homeContent?.heroImageUrl || cms?.heroImage || '');

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

  const [backupMessage, setBackupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isSavingCms, setIsSavingCms] = useState(false);
  const [saveCmsSuccess, setSaveCmsSuccess] = useState(false);

  // Database Connection Status State
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
      const savedPassInDb = await getAdminPasswordFromFirestore();
      const validPass = savedPassInDb || 'omex2025';

      if (passwordInput === validPass) {
        localStorage.setItem('omex_admin_token', 'token_' + Date.now());
        setIsAuthenticated(true);
        fetchAdminOrders();
      } else {
        setLoginError('رمز عبور اشتباه است.');
      }
    } catch (err) {
      setLoginError('خطا در بررسی رمز عبور.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSendRecoveryEmail = async () => {
    setForgotStatusMsg(null);
    const adminEmail = cms?.apiConfig?.adminDestinationEmail || 'omran.javan73@gmail.com';
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    try {
      await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderData: {
            id: 'RESET-' + Date.now(),
            customerName: 'مدیریت SIRIK FIT',
            phoneNumber: adminEmail,
            productTitle: `کد یک‌بارمصرف بازیابی رمز عبور: ${otp}`,
            calculatedToman: 0
          }
        })
      });

      setForgotStatusMsg({
        text: `کد ۶ رقمی بازیابی به ایمیل ${adminEmail} ارسال شد. (کد تست: ${otp})`,
        type: 'success'
      });
      setForgotStep('verify');
    } catch (e) {
      setForgotStatusMsg({ text: 'خطا در ارسال ایمیل بازیابی.', type: 'error' });
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCodeInput.trim() !== generatedOtp) {
      setForgotStatusMsg({ text: 'کد واردشده اشتباه است.', type: 'error' });
      return;
    }
    if (newPasswordFromForgot.length < 6) {
      setForgotStatusMsg({ text: 'رمز عبور باید حداقل ۶ کاراکتر باشد.', type: 'error' });
      return;
    }

    await saveAdminPasswordToFirestore(newPasswordFromForgot);
    setForgotStatusMsg({ text: 'رمز عبور با موفقیت تغییر یافت. اکنون وارد شوید.', type: 'success' });
    setTimeout(() => {
      setIsForgotMode(false);
      setForgotStep('request');
      setPasswordInput(newPasswordFromForgot);
    }, 1500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityStatusMsg(null);

    const savedPassInDb = await getAdminPasswordFromFirestore();
    const currentPass = savedPassInDb || 'omex2025';

    if (currentPassInput !== currentPass) {
      setSecurityStatusMsg({ text: 'رمز عبور فعلی اشتباه است.', type: 'error' });
      return;
    }
    if (newPassInput.length < 6) {
      setSecurityStatusMsg({ text: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.', type: 'error' });
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setSecurityStatusMsg({ text: 'تکرار رمز عبور جدید مطابقت ندارد.', type: 'error' });
      return;
    }

    setIsSavingPassword(true);
    try {
      await saveAdminPasswordToFirestore(newPassInput);
      setSecurityStatusMsg({ text: 'رمز عبور جدید با موفقیت در فایربیس ذخیره شد.', type: 'success' });
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
    } catch (err) {
      setSecurityStatusMsg({ text: 'خطا در ثبت رمز عبور.', type: 'error' });
    } finally {
      setIsSavingPassword(false);
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

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aedRate,
          manualAedRate,
          autoUpdateRates,
          currencyApiUrl,
          cargoRatePerKg,
          profitMargin,
          minOrderAed,
          geminiApiKey: geminiApiKey1 || allKeys[0] || '',
          geminiApiKey1,
          geminiApiKey2,
          geminiApiKey3,
          geminiApiKeys: allKeys
        })
      });

      const data = await res.json();
      if (res.ok && data.settings) {
        onUpdateSettings(data.settings);
        setSaveSettingsSuccess(true);
        setTimeout(() => setSaveSettingsSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSavingSettings(false);
    }
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
      const appTitleEl = document.getElementById('header-app-title');
      if (appTitleEl) appTitleEl.textContent = homeSettings.appTitle;
      const appSubtitleEl = document.getElementById('header-app-subtitle');
      if (appSubtitleEl) appSubtitleEl.textContent = homeSettings.appSubtitle;
      const appLogoEl = document.getElementById('header-app-logo');
      if (appLogoEl) {
        if (appLogoEl.tagName.toLowerCase() === 'img') {
          (appLogoEl as HTMLImageElement).src = homeSettings.logoUrl || '';
        } else {
          appLogoEl.textContent = (homeSettings.appSubtitle || 'OMX').slice(0, 4);
        }
      }
      const calcBlackBadgeEl = document.getElementById('calc-black-badge');
      if (calcBlackBadgeEl) calcBlackBadgeEl.textContent = homeSettings.calcBlackBadge;
      const calcHeadlineEl = document.getElementById('calc-main-headline');
      if (calcHeadlineEl) calcHeadlineEl.textContent = homeSettings.calcMainHeadline;
      const calcSubtitleEl = document.getElementById('calc-subtitle');
      if (calcSubtitleEl) calcSubtitleEl.textContent = homeSettings.calcSubtitle;
      const calcScheduleEl = document.getElementById('calc-schedule-badge');
      if (calcScheduleEl) calcScheduleEl.textContent = homeSettings.calcScheduleBadge;
      const supportSectionEl = document.getElementById('support-section');
      if (supportSectionEl) supportSectionEl.style.display = homeSettings.showSupportSection ? 'block' : 'none';
      const supportHeadlineEl = document.getElementById('support-headline');
      if (supportHeadlineEl) supportHeadlineEl.textContent = homeSettings.supportHeadline;
      const supportSubtitleEl = document.getElementById('support-subtitle');
      if (supportSubtitleEl) supportSubtitleEl.textContent = homeSettings.supportSubtitle;
      const telegramTextEl = document.getElementById('telegram-handle-text');
      if (telegramTextEl) telegramTextEl.textContent = homeSettings.telegramHandle;
      const telegramLinkEl = document.getElementById('telegram-link-element') as HTMLAnchorElement | null;
      if (telegramLinkEl) telegramLinkEl.href = homeSettings.telegramLink;
      const emailTextEl = document.getElementById('email-address-text');
      if (emailTextEl) emailTextEl.textContent = adminDestinationEmail || 'omran.javan73@gmail.com';
      const emailLinkEl = document.getElementById('email-link-element') as HTMLAnchorElement | null;
      if (emailLinkEl) emailLinkEl.href = `mailto:${adminDestinationEmail || 'omran.javan73@gmail.com'}`;
      const officePhoneEl = document.getElementById('office-phone-number');
      if (officePhoneEl) officePhoneEl.textContent = homeSettings.officePhone;
      const officePhoneLinkEl = document.getElementById('office-phone-link-element') as HTMLAnchorElement | null;
      if (officePhoneLinkEl) officePhoneLinkEl.href = `tel:${homeSettings.officePhone.replace(/[^0-9+]/g, '')}`;
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
      heroImage: heroImageUrl || heroImage,
      logoUrl,
      showAnnouncementBanner,
      announcementText,
      announcementBadge,
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
      paymentGateway: {
        activeGateway,
        merchantId,
        callbackUrl,
        isSandbox,
        cardToCard: { cardNumber, bankName, cardholderName, shabaNumber }
      },
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
        allowedDomains: allowedDomainsInput
          .split(/[\n,]+/)
          .map(d => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
          .filter(d => d.length > 0),
        enableDomainRestriction: enableDomainRestriction,
        scraperApiKey: scraperApiKey,
        enableScraperApi: enableScraperApi
      }
    };

    applyHomeContentToDom(currentHomeContent);
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
        setSaveCmsSuccess(true);
        setTimeout(() => setSaveCmsSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving CMS:', err);
    } finally {
      setIsSavingCms(false);
    }
  };

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

        {forgotStatusMsg && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            forgotStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{forgotStatusMsg.text}</span>
          </div>
        )}

        {!isForgotMode ? (
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

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsForgotMode(true)}
                className="text-xs font-extrabold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                رمز عبور را فراموش کرده‌اید؟ (بازیابی با ایمیل)
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {forgotStep === 'request' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  یک کد ۶ رقمی بازیابی به ایمیل ادمین (<strong>{cms?.apiConfig?.adminDestinationEmail || 'omran.javan73@gmail.com'}</strong>) ارسال می‌شود.
                </p>
                <button
                  type="button"
                  onClick={handleSendRecoveryEmail}
                  className="w-full bg-slate-900 hover:bg-black text-white font-extrabold text-sm py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>ارسال کد بازیابی به ایمیل</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordWithOtp} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">کد ۶ رقمی دریافتی در ایمیل:</label>
                  <input
                    type="text"
                    required
                    value={otpCodeInput}
                    onChange={(e) => setForgotOtpCodeInput(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm px-4 py-2 rounded-xl text-center font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">رمز عبور جدید:</label>
                  <input
                    type="password"
                    required
                    value={newPasswordFromForgot}
                    onChange={(e) => setNewPasswordFromForgot(e.target.value)}
                    placeholder="حداقل ۶ کاراکتر"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm px-4 py-2 rounded-xl font-mono dir-ltr"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3 rounded-xl transition cursor-pointer"
                >
                  ذخیره رمز عبور جدید
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setForgotStep('request');
                }}
                className="text-xs font-extrabold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ← بازگشت به صفحه ورود
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

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
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
        <button
          onClick={() => setActiveAdminSubTab('pricingRules')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'pricingRules'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <Calculator className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'pricingRules' ? 'text-amber-400' : 'text-indigo-500'}`} />
          <span>قوانین قیمت‌گذاری</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('orders')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'orders'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <ShoppingBag className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'orders' ? 'text-amber-400' : 'text-rose-500'}`} />
          <span>سفارشات</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            activeAdminSubTab === 'orders' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('accounting')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'accounting'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <FileSpreadsheet className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'accounting' ? 'text-amber-400' : 'text-emerald-500'}`} />
          <span>حسابداری و مالی</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('gateway')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'gateway'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <CreditCard className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'gateway' ? 'text-amber-400' : 'text-purple-500'}`} />
          <span>تنظیمات درگاه</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('security')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'security'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'security' ? 'text-amber-400' : 'text-emerald-600'}`} />
          <span>امنیت و رمز عبور</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('dashboard')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'dashboard'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <TrendingUp className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'dashboard' ? 'text-amber-400' : 'text-sky-500'}`} />
          <span>آمار</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('homeContent')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'homeContent'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <Home className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'homeContent' ? 'text-amber-400' : 'text-sky-500'}`} />
          <span>تنظیمات ظاهری و محتوایی سایت</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('deals')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'deals'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <Sparkles className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'deals' ? 'text-amber-400' : 'text-amber-500'}`} />
          <span>پیشنهادها</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            activeAdminSubTab === 'deals' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {dealsList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('inventory')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'inventory'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <PackageCheck className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'inventory' ? 'text-amber-400' : 'text-emerald-500'}`} />
          <span>انبار ایران</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            activeAdminSubTab === 'inventory' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {localInventoryList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('apiSettings')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'apiSettings'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <Key className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'apiSettings' ? 'text-amber-400' : 'text-amber-600'}`} />
          <span>تنظیمات API</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('backup')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
            activeAdminSubTab === 'backup'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <Database className={`w-4 h-4 shrink-0 ${activeAdminSubTab === 'backup' ? 'text-amber-400' : 'text-blue-500'}`} />
          <span>بک‌آپ و پشتیبان‌گیری</span>
        </button>
      </div>

      {saveCmsSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تغییرات با موفقیت ذخیره و در دیتابیس ثبت شدند.</span>
        </div>
      )}

      {/* SUB-TAB: SECURITY (امنیت و رمز عبور) */}
      {activeAdminSubTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">تنظیمات امنیت و تغییر رمز عبور مدیریت</h3>
              <p className="text-xs text-slate-500 font-medium">تعیین رمز عبور جدید و ماندگار در دیتابیس آنلاین فایربیس</p>
            </div>
          </div>

          {securityStatusMsg && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              securityStatusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{securityStatusMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">رمز عبور فعلی:</label>
              <input
                type="password"
                required
                value={currentPassInput}
                onChange={(e) => setCurrentPassInput(e.target.value)}
                placeholder="رمز عبور فعلی را وارد کنید"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-slate-900 dir-ltr"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">رمز عبور جدید:</label>
              <input
                type="password"
                required
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                placeholder="حداقل ۶ کاراکتر"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-slate-900 dir-ltr"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">تکرار رمز عبور جدید:</label>
              <input
                type="password"
                required
                value={confirmPassInput}
                onChange={(e) => setConfirmPassInput(e.target.value)}
                placeholder="تکرار رمز عبور جدید"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-slate-900 dir-ltr"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingPassword}
              className="bg-slate-900 hover:bg-black text-white font-extrabold text-xs px-6 py-3 rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              {isSavingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-400" />}
              <span>ذخیره نهایی رمز عبور جدید</span>
            </button>
          </div>
        </form>
      )}

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

                        {/* Direct Source Link Button */}
                        <td className="p-3 align-top">
                          <a
                            href={order.productUrl || 'https://drnutrition.com'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition shadow-2xs cursor-pointer whitespace-nowrap"
                            title="باز کردن لینک اصلی کالا در دبی"
                          >
                            <ExternalLink className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>🔗 باز کردن لینک کالا در دبی</span>
                          </a>
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
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 8 * 1024 * 1024) {
                                alert('حجم تصویر نباید بیشتر از ۸ مگابایت باشد.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  handleUpdateLocalItemField(item.id, 'image', reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
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
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert('حجم تصویر دسته‌بندی نباید بیشتر از ۵ مگابایت باشد.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  handleUpdateWarehouseCategoryField(cat.id, 'iconUrl', reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
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
      {activeAdminSubTab === 'apiSettings' && (
        <div className="space-y-6">
          {saveCmsSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>محتوا و تنظیمات API با موفقیت به‌روزرسانی شد.</span>
            </div>
          )}

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

          {/* Section 3: Allowed Domains Whitelist */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <label className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-sky-600" />
                <span>محدودسازی لینک‌ها و دامنه‌های مجاز جهت استخراج:</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-300 transition">
                <input
                  type="checkbox"
                  checked={enableDomainRestriction}
                  onChange={(e) => handleToggleDomainRestriction(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">
                  🔒 محدودسازی به دامنه‌های مجاز
                </span>
              </label>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {enableDomainRestriction
                ? 'فقط لینک‌های مربوط به دامنه‌های مجاز ثبت‌شده در زیر قابل استخراج و برآورد قیمت خواهند بود.'
                : 'توجه: محدودسازی لینک غیرفعال است و کاربران می‌توانند از هر وبسایتی لینک محصول وارد کنند.'}
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                دامنه‌های مجاز جهت استخراج (allowed_domains_list):
              </label>
              <textarea
                rows={4}
                value={allowedDomainsInput}
                onChange={(e) => setAllowedDomainsInput(e.target.value)}
                disabled={!enableDomainRestriction}
                placeholder="gnc-mena.com&#10;drnutrition.com&#10;lifepharmacy.com&#10;sporter.com&#10;amazon.ae"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono text-xs disabled:opacity-50 disabled:bg-slate-200"
                dir="ltr"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                <span className="text-[10px] text-slate-500">
                  دامنه‌های پیش‌فرض: gnc-mena.com, drnutrition.com, lifepharmacy.com, sporter.com, amazon.ae
                </span>
                <button
                  type="button"
                  onClick={() => setAllowedDomainsInput(DEFAULT_ALLOWED_DOMAINS.join('\n'))}
                  className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  بازنشانی به دامنه‌های پیش‌فرض
                </button>
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

      {/* SUB-TAB: BACKUP & RESTORE (پشتیبان‌گیری و بازگردانی) */}
      {activeAdminSubTab === 'backup' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-black shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>مدیریت بک‌آپ و پشتیبان‌گیری کامل دیتابیس</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    فرمت JSON استاندارد
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  دانلود نسخه پشتیبان کامل از تمامی تنظیمات، سفارشات، محصولات انبار و محتوای سایت
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="bg-[#111111] hover:bg-black text-white text-xs font-extrabold px-5 py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer border border-[#111111]"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>دانلود سریع فایل پشتیبان (JSON)</span>
              </button>
            </div>
          </div>

          {backupMessage && (
            <div
              className={`p-4 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 shadow-2xs ${
                backupMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border border-rose-300 text-rose-800'
              }`}
            >
              {backupMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{backupMessage.text}</span>
            </div>
          )}

          {/* Cards Grid for Export and Import Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Download / Export Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 mb-1">دانلود فایل پشتیبان (Export System Data)</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  با کلیک روی دکمه زیر، تمام داده‌های فعلی سیستم از جمله قیمت‌ها، تنظیمات مالی، سفارشات خریداران، محصولات انبار ایران و محتوای سفارشی سایت به فرمت یک فایل ساختاریافته <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">sirikfit-backup.json</code> دانلود می‌شود.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>تعداد سفارشات ثبت شده:</span>
                  <span className="font-bold text-slate-900">{toPersianDigits(orders.length)} عدد</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>محصولات انبار ایران:</span>
                  <span className="font-bold text-slate-900">{toPersianDigits(localInventoryList.length)} عدد</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>وضعیت دیتابیس پایدار:</span>
                  <span className="font-bold text-emerald-600">پایدار و متصل</span>
                </div>

                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full mt-2 bg-slate-900 hover:bg-black text-white text-xs font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>دریافت خروجی دیتابیس (sirikfit-backup.json)</span>
                </button>
              </div>
            </div>

            {/* Upload / Import Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 mb-1">بازگردانی و بازیابی فایل بک‌آپ (Restore System Data)</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  فایل قبلی مانند <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">sirikfit-backup.json</code> را بارگذاری کنید تا تمام داده‌های دیتابیس و تنظیمات با آن فایل جایگزین و همگام‌سازی شوند.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="w-full bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl p-4 transition flex flex-col items-center justify-center cursor-pointer text-center group">
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
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      <span>در حال پردازش و بازیابی اطلاعات دیتابیس...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-700 mb-1 transition" />
                      <span className="text-xs font-extrabold text-slate-800">انتخاب فایل پشتیبان (JSON)</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">فایل .json را کشیده و اینجا رها کنید یا کلیک کنید</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Database Health & Auto-Backup Configuration */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                  <span>تنظیمات پشتیبان‌گیری خودکار و وضعیت سلامت دیتابیس</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">وضعیت اتصال به فایربیس و همگام‌سازی ابری</p>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                وضعیت: فعال
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
                <span className="text-slate-500 font-medium block mb-1">نام دیتابیس پروژه:</span>
                <span className="font-extrabold text-slate-900 font-mono">
                  {dbStatus.dbId || 'ai-studio-omexdubaiimportp'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="text-slate-500 font-medium block mb-1">آخرین برچسب زبانی فایل پشتیبان:</span>
                <span className="font-extrabold text-slate-900">
                  {formatPersianDate(new Date().toISOString())}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;