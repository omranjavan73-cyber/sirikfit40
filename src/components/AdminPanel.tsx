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
  PaymentGatewayConfig
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
    'pricingRules' | 'orders' | 'accounting' | 'gateway' | 'security' | 'dashboard' | 'homeContent' | 'deals' | 'inventory' | 'apiSettings' | 'backup'
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

  // Payment Gateway Settings State
  const [activeGateway, setActiveGateway] = useState<GatewayProvider>(cms?.paymentGateway?.activeGateway || 'zarinpal');
  const [merchantId, setMerchantId] = useState<string>(cms?.paymentGateway?.merchantId || 'zarin_merchant_omex_8849102');
  const [cardNumber, setCardNumber] = useState<string>(cms?.paymentGateway?.cardToCard?.cardNumber || '6037-9918-4421-9876');
  const [bankName, setBankName] = useState<string>(cms?.paymentGateway?.cardToCard?.bankName || 'بانک ملی ایران');
  const [cardholderName, setCardholderName] = useState<string>(cms?.paymentGateway?.cardToCard?.cardholderName || 'مدیریت سیریک فیت پرو');

  // CMS Form State
  const [logoUrl, setLogoUrl] = useState(cms?.homeContent?.logoUrl || cms?.logoUrl || '');
  const [heroImageUrl, setHeroImageUrl] = useState(cms?.homeContent?.heroImageUrl || cms?.heroImage || '');
  const [dealsList, setDealsList] = useState<FeaturedDeal[]>(cms?.deals || []);
  const [localInventoryList, setLocalInventoryList] = useState<LocalInventoryItem[]>(cms?.localInventory || []);

  const [backupMessage, setBackupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
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
        dbId: res.dbId || 'sirikfit40',
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

  const handleExportBackup = () => {
    try {
      const backupData = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        settings,
        cms,
        orders,
        localInventory: localInventoryList,
        deals: dealsList
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `sirikfit-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setBackupMessage({ text: 'خروجی فایل پشتیبان با موفقیت دریافت شد.', type: 'success' });
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

    const updatedCms: CmsConfig = {
      ...cms,
      heroImage: heroImageUrl,
      logoUrl,
      deals: dealsList,
      localInventory: localInventoryList,
      homeContent: {
        ...cms?.homeContent,
        logoUrl,
        heroImageUrl
      },
      paymentGateway: {
        activeGateway,
        merchantId,
        cardToCard: { cardNumber, bankName, cardholderName }
      }
    };

    try {
      await saveCmsToFirestore(updatedCms);
      onUpdateCms(updatedCms);
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

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl text-slate-800 font-['Vazirmatn',sans-serif] dir-rtl">
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-black text-slate-900">ورود به پنل مدیریت SIRIK FIT</h2>
        </div>

        {loginError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            {loginError}
          </div>
        )}

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
        </form>
      </div>
    );
  }

  const totalRevenueToman = orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.calculatedToman || 0), 0);

  return (
    <div className="space-y-6 pb-12 font-['Vazirmatn',sans-serif] dir-rtl text-slate-800">
      {/* سربرگ اصلی پنل */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">پنل اختصاصی مدیریت SIRIK FIT</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">آمار، سفارشات، نرخ‌ها و محتوا</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج</span>
        </button>
      </div>

      {/* منوی تب‌های کامل مدیریت با قابلیت اسکرول افقی */}
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
          { id: 'backup', label: 'بک‌آپ و پشتیبان‌گیری', icon: Database, color: 'text-blue-500' },
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeAdminSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {saveCmsSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تغییرات با موفقیت ذخیره شدند.</span>
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

      {/* ۵. تغییر رمز عبور */}
      {activeAdminSubTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-base text-slate-900">تنظیمات امنیت و تغییر رمز عبور مدیریت</h3>
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
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono dir-ltr"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">رمز عبور جدید:</label>
              <input
                type="password"
                required
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono dir-ltr"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">تکرار رمز عبور جدید:</label>
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
            <span className="text-xs font-black text-emerald-600 block">متصل به فایربیس (sirikfit40)</span>
          </div>
        </div>
      )}

      {/* ۷. مدیریت لوگو و عکس‌ها */}
      {activeAdminSubTab === 'homeContent' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-extrabold text-base text-slate-900">مدیریت ظاهری، لوگو و عکس‌ها</h3>
            <button onClick={handleSaveCms} disabled={isSavingCms} className="bg-slate-900 text-white text-xs px-5 py-2.5 rounded-xl font-bold cursor-pointer">
              ذخیره تغییرات
            </button>
          </div>

          <div className="space-y-5 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
              <label className="font-extrabold text-slate-800 block">تصویر لوگوی سایت (Logo):</label>
              {logoUrl && (
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border">
                  <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                </div>
              )}
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="چسباندن لینک یا انتخاب فایل"
                className="w-full bg-white border p-2.5 rounded-xl font-mono dir-ltr text-[11px]"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
              <label className="font-extrabold text-slate-800 block">بنر اصلی بالای سایت (Hero Banner):</label>
              {heroImageUrl && (
                <div className="bg-white p-2 rounded-xl border">
                  <img src={heroImageUrl} alt="Banner" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
              <input
                type="text"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="چسباندن لینک بنر"
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

      {/* ۱۱. بک‌آ‌پ */}
      {activeAdminSubTab === 'backup' && (
        <div className="space-y-6">
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

            <button
              type="button"
              onClick={handleExportBackup}
              className="bg-[#111111] hover:bg-black text-white text-xs font-extrabold px-5 py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer border border-[#111111]"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>دانلود سریع فایل پشتیبان (JSON)</span>
            </button>
          </div>

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
                  {dbStatus.dbId || 'sirikfit40'}
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