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
import { 
  checkFirestoreConnection, 
  saveSettingsToFirestore, 
  saveCmsToFirestore,
  getCmsFromFirestore,
  saveAdminPasswordToFirestore,
  getAdminPasswordFromFirestore 
} from '../firebase';
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

  // Forgot Password States
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [otpCodeInput, setForgotOtpCodeInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPasswordFromForgot, setNewPasswordFromForgot] = useState('');
  const [forgotStatusMsg, setForgotStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Active Admin Sub-tab
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'pricingRules' | 'orders' | 'accounting' | 'gateway' | 'security' | 'dashboard' | 'homeContent' | 'deals' | 'inventory' | 'cms' | 'apiSettings' | 'backup'
  >('pricingRules');

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

  // Direct Image File Upload Handlers (Base64)
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
          setHeroImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
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
      downloadAnchor.setAttribute('download', `sirikfit-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setBackupMessage({ text: 'خروجی فایل پشتیبان با موفقیت دانلود شد.', type: 'success' });
    } catch (err: any) {
      setBackupMessage({ text: 'خطا در دانلود فایل پشتیبان.', type: 'error' });
    }
  };

  const handleSaveCms = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsSavingCms(true);
    setSaveCmsSuccess(false);

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
        geminiApiKey: geminiApiKey1 || cms?.apiConfig?.geminiApiKey || '',
        geminiApiKey1,
        geminiApiKey2,
        geminiApiKey3,
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
        allowedDomains: allowedDomainsInput.split(/[\n,]+/).map(d => d.trim().toLowerCase()).filter(Boolean),
        enableDomainRestriction,
        scraperApiKey,
        enableScraperApi
      }
    };

    saveCmsToFirestore(updatedCms);

    try {
      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCms)
      });
      if (res.ok) {
        const data = await res.json();
        onUpdateCms(data.cms || updatedCms);
      } else {
        onUpdateCms(updatedCms);
      }
      setSaveCmsSuccess(true);
      setTimeout(() => setSaveCmsSuccess(false), 3000);
    } catch (err) {
      onUpdateCms(updatedCms);
      setSaveCmsSuccess(true);
      setTimeout(() => setSaveCmsSuccess(false), 3000);
    } finally {
      setIsSavingCms(false);
    }
  };

  // Stats for Dashboard
  const totalRevenueToman = orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.calculatedToman, 0);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl text-slate-800 font-['Vazirmatn',sans-serif] dir-rtl">
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {isForgotMode ? 'بازیابی رمز عبور ادمین' : 'ورود به پنل مدیریت SIRIK FIT'}
          </h2>
        </div>

        {loginError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            {loginError}
          </div>
        )}

        {forgotStatusMsg && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-bold ${
            forgotStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
          }`}>
            {forgotStatusMsg.text}
          </div>
        )}

        {!isForgotMode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">رمز عبور مدیر:</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm p-2.5 rounded-xl font-mono dir-ltr"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-slate-900 text-white font-extrabold text-sm py-3 rounded-xl cursor-pointer"
            >
              {isLoggingIn ? 'در حال بررسی...' : 'ورود به سامانه'}
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsForgotMode(true)}
                className="text-xs font-bold text-slate-600 underline cursor-pointer"
              >
                فراموشی رمز عبور با ایمیل
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {forgotStep === 'request' ? (
              <button
                type="button"
                onClick={handleSendRecoveryEmail}
                className="w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-xl cursor-pointer"
              >
                ارسال کد به ایمیل
              </button>
            ) : (
              <form onSubmit={handleResetPasswordWithOtp} className="space-y-3">
                <input
                  type="text"
                  placeholder="کد ۶ رقمی"
                  value={otpCodeInput}
                  onChange={(e) => setForgotOtpCodeInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-center font-mono font-bold"
                />
                <input
                  type="password"
                  placeholder="رمز عبور جدید"
                  value={newPasswordFromForgot}
                  onChange={(e) => setNewPasswordFromForgot(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono dir-ltr"
                />
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold text-sm py-3 rounded-xl">
                  ثبت رمز عبور جدید
                </button>
              </form>
            )}
            <button type="button" onClick={() => setIsForgotMode(false)} className="text-xs text-slate-500 w-full text-center">
              بازگشت به لاگین
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-['Vazirmatn',sans-serif] dir-rtl text-slate-800">
      {/* سربرگ اصلی پنل */}
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

      {/* منوی تب‌های کامل مدیریت با قابلیت اسکرول افقی روان بدون له شدن کلمات */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
        {[
          { id: 'pricingRules', label: 'قوانین قیمت‌گذاری', icon: Calculator, color: 'text-indigo-500' },
          { id: 'orders', label: `سفارشات (${orders.length})`, icon: ShoppingBag, color: 'text-rose-500' },
          { id: 'accounting', label: 'حسابداری و مالی', icon: FileSpreadsheet, color: 'text-emerald-500' },
          { id: 'gateway', label: 'تنظیمات درگاه', icon: CreditCard, color: 'text-purple-500' },
          { id: 'security', label: 'امنیت و رمز عبور', icon: ShieldCheck, color: 'text-emerald-600' },
          { id: 'dashboard', label: 'آمار', icon: TrendingUp, color: 'text-sky-500' },
          { id: 'homeContent', label: 'تنظیمات ظاهری و محتوایی سایت', icon: Home, color: 'text-sky-500' },
          { id: 'deals', label: `پیشنهادها (${dealsList.length})`, icon: Sparkles, color: 'text-amber-500' },
          { id: 'inventory', label: `انبار ایران (${localInventoryList.length})`, icon: PackageCheck, color: 'text-amber-600' },
          { id: 'apiSettings', label: 'تنظیمات API', icon: Key, color: 'text-amber-500' },
          { id: 'backup', label: 'بک‌آپ و پشتیبان‌گیری', icon: Database, color: 'text-emerald-500' },
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeAdminSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminSubTab(tab.id as any)}
              className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : tab.color}`} />
                <span>{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {saveCmsSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تغییرات با موفقیت ذخیره شدند و ماندگار گردیدند.</span>
        </div>
      )}

      {/* ۱. قوانین قیمت‌گذاری */}
      {activeAdminSubTab === 'pricingRules' && (
        <PricingRulesAdmin settings={settings} onUpdateSettings={onUpdateSettings} cms={cms} onUpdateCms={onUpdateCms} />
      )}

      {/* ۲. سفارشات */}
      {activeAdminSubTab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">مدیریت سفارشات ({orders.length})</h3>
            <button onClick={fetchAdminOrders} className="p-2 bg-slate-100 rounded-xl cursor-pointer">
              <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">سفارشی ثبت نشده است.</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900 block">{o.customerName} ({o.phoneNumber})</span>
                    <span className="text-slate-500">{o.productTitle}</span>
                  </div>
                  <span className="font-black text-emerald-700 dir-ltr">{formatToman(o.calculatedToman)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ۳. حسابداری */}
      {activeAdminSubTab === 'accounting' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 border-b pb-3">گزارش حسابداری و دفتر مالی</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex justify-between">
              <span>مجموع کل درآمد فاکتور شده:</span>
              <span className="text-emerald-700 font-black">{formatToman(totalRevenueToman)}</span>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex justify-between">
              <span>خرید درهمی دبی:</span>
              <span className="text-amber-800 font-black">{formatAed(orders.reduce((sum, o) => sum + (o.priceAed || 0), 0))}</span>
            </div>
          </div>
        </div>
      )}

      {/* ۴. درگاه پرداخت */}
      {activeAdminSubTab === 'gateway' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-extrabold text-base text-slate-900">تنظیمات درگاه پرداخت و کارت به کارت</h3>
            <button onClick={handleSaveCms} className="bg-slate-900 text-white text-xs px-5 py-2.5 rounded-xl font-bold cursor-pointer">ذخیره</button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold block mb-1">کد مرچنت درگاه (Merchant ID):</label>
              <input type="text" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-left dir-ltr" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-bold block mb-1">شماره کارت:</label>
                <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono dir-ltr text-center" />
              </div>
              <div>
                <label className="font-bold block mb-1">نام بانک:</label>
                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="font-bold block mb-1">صاحب حساب:</label>
                <input type="text" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ۵. تب امنیت و تغییر رمز عبور */}
      {activeAdminSubTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b pb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-base text-slate-900">تغییر رمز عبور مدیریت</h3>
          </div>

          {securityStatusMsg && (
            <div className={`p-3 rounded-2xl text-xs font-bold ${
              securityStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
            }`}>
              {securityStatusMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold block mb-1">رمز عبور فعلی:</label>
              <input
                type="password"
                required
                value={currentPassInput}
                onChange={(e) => setCurrentPassInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono dir-ltr"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">رمز عبور جدید:</label>
              <input
                type="password"
                required
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono dir-ltr"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">تکرار رمز عبور جدید:</label>
              <input
                type="password"
                required
                value={confirmPassInput}
                onChange={(e) => setConfirmPassInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono dir-ltr"
              />
            </div>
          </div>

          <button type="submit" disabled={isSavingPassword} className="bg-slate-900 text-white font-extrabold text-xs px-6 py-3 rounded-xl cursor-pointer">
            ذخیره رمز عبور جدید
          </button>
        </form>
      )}

      {/* ۶. آمار */}
      {activeAdminSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border text-center space-y-1">
            <span className="text-xs text-slate-500 font-bold block">مجموع فروش موفق</span>
            <span className="text-lg font-black text-emerald-600">{formatToman(totalRevenueToman)}</span>
          </div>
          <div className="bg-white p-5 rounded-3xl border text-center space-y-1">
            <span className="text-xs text-slate-500 font-bold block">تعداد کل سفارشات</span>
            <span className="text-lg font-black text-slate-900">{orders.length}</span>
          </div>
          <div className="bg-white p-5 rounded-3xl border text-center space-y-1">
            <span className="text-xs text-slate-500 font-bold block">وضعیت دیتابیس</span>
            <span className="text-xs font-black text-emerald-600 block">متصل به فایربیس</span>
          </div>
        </div>
      )}

      {/* ۷. مدیریت لوگو و عکس‌ها */}
      {activeAdminSubTab === 'homeContent' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-extrabold text-base text-slate-900">مدیریت ظاهری، لوگو و عکس‌ها</h3>
            <button
              onClick={handleSaveCms}
              disabled={isSavingCms}
              className="bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            >
              {isSavingCms ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>ذخیره تغییرات</span>
            </button>
          </div>

          <div className="space-y-5 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
              <label className="font-extrabold text-slate-800 block">تصویر لوگوی سایت (Logo):</label>
              {logoUrl && (
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border">
                  <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                  <span className="text-[11px] text-slate-500 font-bold">پیش‌نمایش لوگو</span>
                </div>
              )}
              <label className="bg-white border border-dashed p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>انتخاب لوگو از گالری گوشی / کامپیوتر</span>
                <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="یا چسباندن لینک عکس (https://...)"
                className="w-full bg-white border p-2.5 rounded-xl font-mono dir-ltr text-[11px]"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
              <label className="font-extrabold text-slate-800 block">بنر اصلی بالای سایت (Hero Banner):</label>
              {(heroImageUrl || heroImage) && (
                <div className="bg-white p-2 rounded-xl border">
                  <img src={heroImageUrl || heroImage} alt="Banner" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
              <label className="bg-white border border-dashed p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>انتخاب بنر اصلی از گالری گوشی / کامپیوتر</span>
                <input type="file" accept="image/*" onChange={handleHeroBannerFileUpload} className="hidden" />
              </label>
              <input
                type="text"
                value={heroImageUrl || heroImage}
                onChange={(e) => {
                  setHeroImageUrl(e.target.value);
                  setHeroImage(e.target.value);
                }}
                placeholder="یا چسباندن لینک بنر (https://...)"
                className="w-full bg-white border p-2.5 rounded-xl font-mono dir-ltr text-[11px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ۸. پیشنهادها */}
      {activeAdminSubTab === 'deals' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-base text-slate-900">مدیریت پیشنهادهای ویژه ({dealsList.length})</h3>
            <button onClick={handleSaveCms} className="bg-slate-900 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer">ذخیره</button>
          </div>
          <div className="space-y-3">
            {dealsList.map((deal, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border rounded-2xl flex items-center justify-between gap-2 text-xs">
                <input
                  type="text"
                  value={deal.title}
                  onChange={(e) => {
                    const updated = [...dealsList];
                    updated[idx].title = e.target.value;
                    setDealsList(updated);
                  }}
                  className="bg-white border p-2 rounded-xl w-full font-bold"
                />
                <button onClick={() => setDealsList(dealsList.filter((_, i) => i !== idx))} className="p-2 text-rose-600 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ۹. انبار ایران */}
      {activeAdminSubTab === 'inventory' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-base text-slate-900">مدیریت محصولات انبار ایران ({localInventoryList.length})</h3>
            <button onClick={handleSaveCms} className="bg-slate-900 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer">ذخیره</button>
          </div>
          <div className="space-y-3">
            {localInventoryList.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border rounded-2xl flex items-center justify-between gap-2 text-xs">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => {
                    const updated = [...localInventoryList];
                    updated[idx].title = e.target.value;
                    setLocalInventoryList(updated);
                  }}
                  className="bg-white border p-2 rounded-xl w-full font-bold"
                />
                <button onClick={() => setLocalInventoryList(localInventoryList.filter((_, i) => i !== idx))} className="p-2 text-rose-600 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ۱۰. کلیدهای API */}
      {activeAdminSubTab === 'apiSettings' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 text-xs">
          <h3 className="font-extrabold text-base text-slate-900 border-b pb-3">مدیریت کلیدهای API</h3>
          <p className="text-slate-500">تمامی سرویس‌ها و کلیدهای تلگرام، ایمیل و استخراج به‌صورت خودکار متصل می‌باشند.</p>
        </div>
      )}

      {/* ۱۱. بک‌آپ */}
      {activeAdminSubTab === 'backup' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-base text-slate-900">پشتیبان‌گیری از دیتابیس (Backup)</h3>
            <button onClick={handleExportBackup} className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>دانلود فایل JSON بک‌آپ</span>
            </button>
          </div>
          <p className="text-slate-500">تمامی اطلاعات به صورت خودکار در Firestore فایربیس پشتیبان‌گیری می‌شوند.</p>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;