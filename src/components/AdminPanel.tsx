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
  Database,
  Shield
} from 'lucide-react';
import { 
  checkFirestoreConnection, 
  saveSettingsToFirestore, 
  saveCmsToFirestore,
  getCmsFromFirestore,
  saveAdminPasswordToFirestore,
  getAdminPasswordFromFirestore 
} from '../firebase';
import { FinancialSettings, CmsConfig, Order, GatewayProvider } from '../types';
import { formatToman, formatAed, formatPersianDate, toPersianDigits } from '../utils/formatters';
import { PricingRulesAdmin } from './PricingRulesAdmin';

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

  // Active Tab
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'pricingRules' | 'orders' | 'accounting' | 'gateway' | 'security' | 'dashboard' | 'homeContent' | 'deals' | 'inventory' | 'apiSettings' | 'backup'
  >('pricingRules');

  // Security Tab Inputs
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [securityStatusMsg, setSecurityStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Shared CMS States
  const [logoUrl, setLogoUrl] = useState(cms?.logoUrl || cms?.homeContent?.logoUrl || '');
  const [heroImage, setHeroImage] = useState(cms?.heroImage || cms?.homeContent?.heroImageUrl || '');
  const [aedRate, setAedRate] = useState<number>(settings.aedRate || 53000);
  const [dealsList, setDealsList] = useState<any[]>(cms?.deals || []);
  const [localInventoryList, setLocalInventoryList] = useState<any[]>(cms?.localInventory || []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isSavingCms, setIsSavingCms] = useState(false);
  const [saveCmsSuccess, setSaveCmsSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('omex_admin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchAdminOrders();
    }
  }, []);

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
        text: `کد یک‌بارمصرف به ایمیل ${adminEmail} ارسال شد. (کد تست: ${otp})`,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 4) {
        alert('حجم تصویر نباید بیشتر از ۴ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAllCms = async () => {
    setIsSavingCms(true);
    setSaveCmsSuccess(false);

    const updatedCms = {
      ...cms,
      logoUrl,
      heroImage,
      homeContent: {
        ...cms?.homeContent,
        logoUrl,
        heroImageUrl: heroImage
      },
      deals: dealsList,
      localInventory: localInventoryList
    };

    try {
      await saveCmsToFirestore(updatedCms);
      onUpdateCms(updatedCms as any);
      setSaveCmsSuccess(true);
      setTimeout(() => setSaveCmsSuccess(false), 3000);
    } catch (e) {
      alert('خطا در ذخیره‌سازی.');
    } finally {
      setIsSavingCms(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('omex_admin_token');
    setIsAuthenticated(false);
  };

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
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-slate-900">پنل اختصاصی مدیریت SIRIK FIT</h2>
            <p className="text-xs text-slate-500 font-medium">مدیریت سفارشات، قیمت‌ها، تنظیمات و محتوا</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج</span>
        </button>
      </div>

      {/* منوی تب‌های کامل مدیریت با قابلیت اسکرول روان بدون له شدن کلمات */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
        {[
          { id: 'pricingRules', label: 'قوانین قیمت‌گذاری', icon: Calculator, color: 'text-amber-500' },
          { id: 'orders', label: `سفارشات (${orders.length})`, icon: ShoppingBag, color: 'text-rose-500' },
          { id: 'accounting', label: 'حسابداری', icon: FileSpreadsheet, color: 'text-emerald-500' },
          { id: 'gateway', label: 'درگاه پرداخت', icon: CreditCard, color: 'text-purple-500' },
          { id: 'security', label: 'امنیت و رمز', icon: ShieldCheck, color: 'text-emerald-600' },
          { id: 'dashboard', label: 'آمار', icon: TrendingUp, color: 'text-sky-500' },
          { id: 'homeContent', label: 'مدیریت لوگو و عکس‌ها', icon: ImageIcon, color: 'text-indigo-500' },
          { id: 'deals', label: `پیشنهادها (${dealsList.length})`, icon: Sparkles, color: 'text-amber-400' },
          { id: 'inventory', label: `انبار ایران (${localInventoryList.length})`, icon: PackageCheck, color: 'text-emerald-500' },
          { id: 'apiSettings', label: 'کلیدهای API', icon: Key, color: 'text-amber-600' },
          { id: 'backup', label: 'بک‌آپ دیتابیس', icon: Database, color: 'text-blue-500' },
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeAdminSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer shrink-0 whitespace-nowrap border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <IconComp className={`w-4 h-4 ${isActive ? 'text-amber-400' : tab.color}`} />
              <span>{tab.label}</span>
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

      {/* ۱. تب قوانین قیمت‌گذاری */}
      {activeAdminSubTab === 'pricingRules' && (
        <PricingRulesAdmin settings={settings} onUpdateSettings={onUpdateSettings} cms={cms} onUpdateCms={onUpdateCms} />
      )}

      {/* ۲. تب سفارشات */}
      {activeAdminSubTab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">لیست کلی سفارشات ({orders.length})</h3>
            <button onClick={fetchAdminOrders} className="p-2 bg-slate-100 rounded-xl cursor-pointer">
              <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">سفارشی یافت نشد.</p>
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

      {/* ۳. تب امنیت و رمز عبور */}
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

      {/* ۴. تب مدیریت ظاهر، لوگو و عکس‌ها */}
      {activeAdminSubTab === 'homeContent' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-extrabold text-base text-slate-900">مدیریت لوگو، بنر اصلی و عکس‌ها</h3>
            <button
              onClick={handleSaveAllCms}
              disabled={isSavingCms}
              className="bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            >
              {isSavingCms ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>ذخیره نهایی تغییرات</span>
            </button>
          </div>

          <div className="space-y-5 text-xs">
            {/* لوگوی سایت */}
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
                <span>انتخاب لوگو از گالری گوشی/کامپیوتر</span>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setLogoUrl)} className="hidden" />
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="یا چسباندن لینک عکس (https://...)"
                className="w-full bg-white border p-2.5 rounded-xl font-mono dir-ltr text-[11px]"
              />
            </div>

            {/* بنر اصلی بالای سایت */}
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
              <label className="font-extrabold text-slate-800 block">بنر اصلی بالای سایت (Hero Banner):</label>
              {heroImage && (
                <div className="bg-white p-2 rounded-xl border">
                  <img src={heroImage} alt="Banner" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
              <label className="bg-white border border-dashed p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>انتخاب بنر اصلی از گالری گوشی/کامپیوتر</span>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setHeroImage)} className="hidden" />
              </label>
              <input
                type="text"
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                placeholder="یا چسباندن لینک بنر (https://...)"
                className="w-full bg-white border p-2.5 rounded-xl font-mono dir-ltr text-[11px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ۵. بقیه تب‌ها (آمار، حسابداری، درگاه، پیشنهادها، انبار ایران، کلیدها، بک‌آپ) */}
      {(activeAdminSubTab === 'dashboard' || activeAdminSubTab === 'accounting' || activeAdminSubTab === 'gateway' || activeAdminSubTab === 'deals' || activeAdminSubTab === 'inventory' || activeAdminSubTab === 'apiSettings' || activeAdminSubTab === 'backup') && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-center text-xs space-y-3">
          <p className="font-extrabold text-slate-800 text-sm">تب فعال: {activeAdminSubTab}</p>
          <p className="text-slate-500">اطلاعات این بخش با فایربیس همگام است و پس از به‌روزرسانی فعال خواهد بود.</p>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;