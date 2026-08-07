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

  // حالت فراموشی رمز عبور
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [otpCodeInput, setForgotOtpCodeInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPasswordFromForgot, setNewPasswordFromForgot] = useState('');
  const [forgotStatusMsg, setForgotStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // تب فعال در پنل مدیریت شامل تب جدید 'security'
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'dashboard' | 'orders' | 'accounting' | 'gateway' | 'pricingRules' | 'homeContent' | 'deals' | 'inventory' | 'cms' | 'apiSettings' | 'backup' | 'security'
  >('dashboard');

  // متغیرهای فرم امنیت
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [securityStatusMsg, setSecurityStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

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

  // بررسی رمز عبور موقع لاگین (ابتدا فایربیس، در غیر این صورت omex2025)
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

  // ارسال کد بازیابی به ایمیل ادمین
  const handleSendRecoveryEmail = async () => {
    setForgotStatusMsg(null);
    const adminEmail = cms?.apiConfig?.adminDestinationEmail || 'omran.javan73@gmail.com';
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    try {
      const res = await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderData: {
            id: 'RESET-' + Date.now(),
            customerName: 'مدیریت محترم SIRIK FIT',
            phoneNumber: adminEmail,
            productTitle: `کد یک‌بارمصرف بازیابی رمز عبور ادمین: ${otp}`,
            calculatedToman: 0
          }
        })
      });

      setForgotStatusMsg({
        text: `کد یک‌بارمصرف ۶ رقمی بازیابی به ایمیل ${adminEmail} ارسال گردید. (کد جهت تست: ${otp})`,
        type: 'success'
      });
      setForgotStep('verify');
    } catch (e) {
      setForgotStatusMsg({ text: 'خطا در ارسال ایمیل بازیابی.', type: 'error' });
    }
  };

  // تأیید کد و ثبت رمز عبور جدید از طریق ایمیل
  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCodeInput.trim() !== generatedOtp) {
      setForgotStatusMsg({ text: 'کد واردشده اشتباه است.', type: 'error' });
      return;
    }
    if (newPasswordFromForgot.length < 6) {
      setForgotStatusMsg({ text: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.', type: 'error' });
      return;
    }

    await saveAdminPasswordToFirestore(newPasswordFromForgot);
    setForgotStatusMsg({ text: 'رمز عبور با موفقیت تغییر یافت. اکنون وارد شوید.', type: 'success' });
    setTimeout(() => {
      setIsForgotMode(false);
      setForgotStep('request');
      setPasswordInput(newPasswordFromForgot);
    }, 2000);
  };

  // تغییر رمز عبور از داخل پنل مدیریت
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
      setSecurityStatusMsg({ text: 'رمز عبور جدید و تکرار آن یکسان نیستند.', type: 'error' });
      return;
    }

    setIsSavingPassword(true);
    try {
      await saveAdminPasswordToFirestore(newPassInput);
      setSecurityStatusMsg({ text: 'رمز عبور مدیریت با موفقیت در فایربیس به‌روزرسانی شد.', type: 'success' });
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
    } catch (err) {
      setSecurityStatusMsg({ text: 'خطا در ذخیره‌سازی رمز عبور جدید.', type: 'error' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('omex_admin_token');
    setIsAuthenticated(false);
  };

  // صفحه ورود / بازیابی رمز عبور
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
          <p className="text-xs text-slate-500 font-medium">
            {isForgotMode ? 'ارسال کد تایید به ایمیل ثبت‌شده ادمین' : 'برای دسترسی به پنل ادمین، رمز عبور را وارد کنید'}
          </p>
        </div>

        {loginError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        {forgotStatusMsg && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            forgotStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{forgotStatusMsg.text}</span>
          </div>
        )}

        {!isForgotMode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">رمز عبور مدیر:</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="رمز عبور را وارد کنید"
                className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-sm px-4 py-2.5 rounded-xl focus:outline-none transition font-mono dir-ltr"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-slate-900 hover:bg-black text-white font-extrabold text-sm py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>ورود به سامانه</span>}
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

  return (
    <div className="space-y-6 pb-12 font-['Vazirmatn',sans-serif] dir-rtl">
      {/* سربرگ پنل مدیریت */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0 shadow-2xs">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">پنل اختصاصی مدیریت SIRIK FIT</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">مدیریت سفارشات، قیمت‌ها، امنیت و محتوا</p>
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

      {/* منوی تب‌های کامل مدیریت شامل تب جدید «امنیت و دسترسی» */}
      <div className="admin-menu grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-2">
        <button
          onClick={() => setActiveAdminSubTab('pricingRules')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'pricingRules' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="truncate">قوانین قیمت‌گذاری</span>
          <span>🧮</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('orders')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'orders' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="truncate">سفارشات</span>
          <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{orders.length}</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('accounting')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'accounting' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="truncate">حسابداری</span>
          <span>📈</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('gateway')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'gateway' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="truncate">درگاه پرداخت</span>
          <span>💳</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('security')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'security' ? 'bg-slate-900 text-white border-slate-900' : 'bg-emerald-50 text-emerald-900 border-emerald-300'
          }`}
        >
          <span className="truncate font-black">امنیت و رمز عبور</span>
          <span>🔐</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('dashboard')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'dashboard' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="truncate">آمار</span>
          <span>📊</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('homeContent')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'homeContent' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="truncate">ظاهر و خانه</span>
          <span>🎨</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('deals')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'deals' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="truncate">پیشنهادها</span>
          <span>✨</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('inventory')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'inventory' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="truncate">انبار ایران</span>
          <span>📦</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('apiSettings')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'apiSettings' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="truncate">کلیدهای API</span>
          <span>🔑</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('backup')}
          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer border ${
            activeAdminSubTab === 'backup' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border-slate-200'
          }`}
        >
          <span className="truncate">پشتیبان‌گیری</span>
          <span>💾</span>
        </button>
      </div>

      {/* تب جدید اختصاصی: امنیت و رمز عبور (#security) */}
      {activeAdminSubTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
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
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-slate-900"
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
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-slate-900"
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
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-slate-900"
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

    {/* تب قوانین قیمت‌گذاری */}
      {activeAdminSubTab === 'pricingRules' && (
        <PricingRulesAdmin settings={settings} onUpdateSettings={onUpdateSettings} cms={cms}
onUpdateCms={onUpdateCms} />
      )}
    </div>
  );
};
export default AdminPanel;