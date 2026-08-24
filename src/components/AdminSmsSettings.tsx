import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Key, 
  Phone, 
  Check, 
  Save, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle,
  Settings,
  Zap,
  CheckCircle2,
  Lock,
  ShoppingBag
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SmsConfig {
  apiKey: string;
  adminMobile: string;
  otpPattern: string;
  otpTemplateId?: string;
  resetPasswordPattern: string;
  resetPasswordTemplateId?: string;
  orderSuccessCustomerPattern: string;
  orderSuccessTemplateId?: string;
  enabled: boolean;
  provider?: string;
}

const DEFAULT_SMS_CONFIG: SmsConfig = {
  apiKey: 'NxE8MgW74US6JDbMM6Gcd5JvERuacKTZ6rSaqTw1YTRtqcuZ',
  adminMobile: '',
  otpPattern: '256428',
  resetPasswordPattern: '664247',
  orderSuccessCustomerPattern: '595534',
  enabled: true,
  provider: 'smsir'
};

interface AdminSmsSettingsProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminSmsSettings: React.FC<AdminSmsSettingsProps> = ({ showToast }) => {
  const [config, setConfig] = useState<SmsConfig>(DEFAULT_SMS_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Test SMS State
  const [testMobile, setTestMobile] = useState<string>('');
  const [testType, setTestType] = useState<'otp' | 'reset_password' | 'order'>('otp');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    const fetchSmsConfig = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'settings', 'sms');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConfig({
            ...DEFAULT_SMS_CONFIG,
            ...data,
            otpPattern: data.otpPattern || data.otpTemplateId || DEFAULT_SMS_CONFIG.otpPattern,
            resetPasswordPattern: data.resetPasswordPattern || data.resetPasswordTemplateId || DEFAULT_SMS_CONFIG.resetPasswordPattern,
            orderSuccessCustomerPattern: data.orderSuccessCustomerPattern || data.orderSuccessTemplateId || DEFAULT_SMS_CONFIG.orderSuccessCustomerPattern
          });
        }
      } catch (err) {
        console.error('Error loading SMS settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSmsConfig();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const docRef = doc(db, 'settings', 'sms');
      const updatedConfig = {
        ...config,
        otpTemplateId: config.otpPattern,
        resetPasswordTemplateId: config.resetPasswordPattern,
        orderSuccessTemplateId: config.orderSuccessCustomerPattern,
        provider: 'smsir',
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, updatedConfig, { merge: true });

      // Also persist to backend cache/API
      await fetch('/api/admin/sms-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      }).catch(() => {});

      setSaveSuccess(true);
      if (showToast) showToast('تنظیمات ۳ قالب سامانه پیامکی sms.ir با موفقیت ذخیره شد.', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving SMS config:', err);
      if (showToast) showToast('خطا در ذخیره‌سازی تنظیمات پیامک.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!testMobile || testMobile.trim().length < 10) {
      alert('لطفاً شماره موبایل معتبر جهت دریافت پیامک آزمایشی وارد نمایید.');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: testMobile.trim(),
          config: {
            ...config,
            otpTemplateId: config.otpPattern,
            resetPasswordTemplateId: config.resetPasswordPattern,
            orderSuccessTemplateId: config.orderSuccessCustomerPattern
          },
          type: testType
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message || 'پیامک تست با موفقیت ارسال شد!' });
        if (showToast) showToast('پیامک آزمایشی با موفقیت ارسال گردید.', 'success');
      } else {
        setTestResult({ success: false, message: data.error || 'خطا در ارسال پیامک آزمایشی.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'خطا در اتصال به سرور پیامک.' });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
        <span>در حال بارگذاری تنظیمات پیامک...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-right">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg text-white">
                  تنظیمات سامانه پیامک اختصاصی sms.ir (Fast-Send)
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  ۳ قالب تایید شده خدماتی
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                ارسال خودکار کدهای ورود یکبار مصرف (OTP)، بازیابی رمز عبور و تایید ثبت سفارش به خریدار از طریق وب‌سرویس پترن sms.ir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-bold text-slate-300">
              {config.enabled ? 'سامانه فعال' : 'سامانه غیرفعال'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full dir-ltr peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: API Key & 3 Official Templates */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card 1: API Key & Admin Mobile */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Key className="w-4 h-4 text-slate-700" />
              <span>کلید دسترسی و شماره مدیریت</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-extrabold text-slate-800 block mb-1">
                  کلید وب‌سرویس (API Key):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="NxE8MgW74US6JDbMM6Gcd5JvERuacKTZ6rSaqTw1YTRtqcuZ"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-3 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono"
                    dir="ltr"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  کلید دسترسی دریافتی از پنل کاربری sms.ir (در هدر x-api-key ارسال می‌شود).
                </span>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-800 block mb-1">
                  شماره موبایل مدیریت (دریافت هشدارهای سفارش جدید):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={config.adminMobile}
                    onChange={(e) => setConfig({ ...config, adminMobile: e.target.value })}
                    placeholder="09121234567"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-3 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono"
                    dir="ltr"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  اختیاری: شماره موبایل مدیر جهت دریافت هشدار ثبت سفارشات جدید.
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: 3 Official Pattern Code Mappings */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>شناسه‌های ۳ قالب پیامک تایید شده (Template IDs)</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-bold">Fast Send Verification</span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Template 1: OTP Login */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>قالب ۱: تایید هویت / ورود با پیامک (OTP Login):</span>
                  </label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                    متغیر: CODE
                  </span>
                </div>
                <input
                  type="text"
                  value={config.otpPattern}
                  onChange={(e) => setConfig({ ...config, otpPattern: e.target.value })}
                  placeholder="256428"
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono font-bold"
                  dir="ltr"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>شناسه قالب تایید هویت در sms.ir (پیش‌فرض: ۲۵۶۴۲۸)</span>
                  <span className="font-mono text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded">کد ورود شما به سیریک فیت: #CODE#</span>
                </div>
              </div>

              {/* Template 2: Password Reset */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    <span>قالب ۲: بازیابی کلمه عبور (Password Reset):</span>
                  </label>
                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-bold">
                    متغیر: CODE
                  </span>
                </div>
                <input
                  type="text"
                  value={config.resetPasswordPattern}
                  onChange={(e) => setConfig({ ...config, resetPasswordPattern: e.target.value })}
                  placeholder="664247"
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono font-bold"
                  dir="ltr"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>شناسه قالب بازیابی رمز عبور در sms.ir (پیش‌فرض: ۶۶۴۲۴۷)</span>
                  <span className="font-mono text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded">کد بازیابی رمز عبور شما: #CODE#</span>
                </div>
              </div>

              {/* Template 3: Order Confirmation */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-800 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    <span>قالب ۳: تایید ثبت سفارش خریدار (Order Success):</span>
                  </label>
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                    متغیرها: NAME , ORDER_ID
                  </span>
                </div>
                <input
                  type="text"
                  value={config.orderSuccessCustomerPattern}
                  onChange={(e) => setConfig({ ...config, orderSuccessCustomerPattern: e.target.value })}
                  placeholder="595534"
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono font-bold"
                  dir="ltr"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>شناسه قالب پیامک تایید سفارش در sms.ir (پیش‌فرض: ۵۹۵۵۳۴)</span>
                  <span className="font-mono text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded">#NAME# عزیز، سفارش شما با موفقیت ثبت شد. شناسه: #ORDER_ID#</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Testing Tool & Save Action */}
        <div className="space-y-5">
          {/* Card 3: Live SMS Test Tool */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Send className="w-4 h-4 text-emerald-600" />
              <span>ابزار تست زنده ارسال پیامک</span>
            </h3>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                جهت تست و صحت اتصال به وب‌سرویس sms.ir، شماره موبایل را وارد کرده و قالب مدنظر را انتخاب کنید:
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">نوع قالب آزمایشی:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTestType('otp')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition cursor-pointer text-center ${
                      testType === 'otp'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    ۱. ورود (OTP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestType('reset_password')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition cursor-pointer text-center ${
                      testType === 'reset_password'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    ۲. بازیابی رمز
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestType('order')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition cursor-pointer text-center ${
                      testType === 'order'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    ۳. تایید سفارش
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">شماره موبایل گیرنده تست:</label>
                <input
                  type="text"
                  value={testMobile}
                  onChange={(e) => setTestMobile(e.target.value)}
                  placeholder="09121234567"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr font-mono"
                  dir="ltr"
                />
              </div>

              <button
                type="button"
                disabled={isSendingTest || !config.apiKey}
                onClick={handleSendTestSms}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>در حال ارسال پیامک آزمایشی...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ارسال پیامک آزمایشی</span>
                  </>
                )}
              </button>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-[11px] font-bold ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {testResult.success ? '✓ ' : '✕ '}
                  {testResult.message}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Action Save */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveConfig}
              className="w-full bg-slate-900 hover:bg-black text-white text-xs font-black py-3.5 px-4 rounded-2xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>در حال ذخیره تنظیمات...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>تنظیمات ۳ قالب ذخیره شد</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>ذخیره تنظیمات سامانه پیامک</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
