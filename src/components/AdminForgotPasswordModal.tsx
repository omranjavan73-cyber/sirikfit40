import React, { useState, useEffect } from 'react';
import { Mail, Key, Lock, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Send, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { SirikFitLogo } from './SirikFitLogo';
import { getAdminSecurityFromFirestore } from '../firebase';

interface AdminForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const AdminForgotPasswordModal: React.FC<AdminForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onBackToLogin,
  showToast
}) => {
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [email, setEmail] = useState('omran.javan73@gmail.com');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch registered backup email on mount
  useEffect(() => {
    if (isOpen) {
      setStep('REQUEST');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setSuccessMessage('');

      // Try fetching backup email from server or Firestore
      fetch('/api/admin/security')
        .then((res) => res.json())
        .then((data) => {
          if (data && (data.backupEmail || data.recoveryEmail)) {
            setEmail(data.backupEmail || data.recoveryEmail);
          }
        })
        .catch(async () => {
          const sec = await getAdminSecurityFromFirestore();
          if (sec && sec.backupEmail) {
            setEmail(sec.backupEmail);
          }
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Step 1: Request 6-digit OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      const err = 'لطفاً آدرس ایمیل پشتیبان مدیریت را وارد کنید.';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/request-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage(data.message || 'کد تایید ۶ رقمی به ایمیل ارسال شد.');
        if (showToast) showToast('کد تایید ۶ رقمی با موفقیت ارسال شد', 'success');
        setStep('VERIFY');
      } else {
        const err = data.error || 'خطا در ارسال کد تایید. لطفاً مجدداً تلاش کنید.';
        setErrorMessage(err);
        if (showToast) showToast(err, 'error');
      }
    } catch (_err) {
      setErrorMessage('خطای اتصال به سرور جهت ارسال کد تایید.');
      if (showToast) showToast('خطای اتصال به سرور', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      const err = 'لطفاً کد تایید ۶ رقمی را به صورت کامل وارد کنید.';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      const err = 'کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      const err = 'تکرار کلمه عبور با کلمه عبور جدید مطابقت ندارد.';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otpCode: otpCode.trim(),
          newPassword: newPassword.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const msg = data.message || 'کلمه عبور جدید با موفقیت ذخیره شد.';
        setSuccessMessage(msg);
        if (showToast) showToast('کلمه عبور با موفقیت به‌روزرسانی شد', 'success');

        // Cache locally too
        localStorage.setItem('sirikfit_admin_password', newPassword.trim());

        setTimeout(() => {
          onBackToLogin();
        }, 1200);
      } else {
        const err = data.error || 'کد تایید نامعتبر یا منقضی شده است.';
        setErrorMessage(err);
        if (showToast) showToast(err, 'error');
      }
    } catch (_err) {
      setErrorMessage('خطای اتصال به سرور در ثبت کلمه عبور.');
      if (showToast) showToast('خطای اتصال به سرور', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="admin-forgot-password-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-['Vazirmatn',sans-serif]"
    >
      <div
        id="admin-forgot-password-container"
        className="bg-white border border-slate-200/90 w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden my-auto text-slate-800 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-7 text-center relative">
          <div className="flex justify-center mb-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 shadow-inner inline-flex">
              <SirikFitLogo className="h-10 w-auto" light />
            </div>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight">
            بازیابی کلمه عبور پنل مدیریت
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {step === 'REQUEST'
              ? 'مرحله ۱ از ۲: درخواست کد تایید OTP'
              : 'مرحله ۲ از ۲: تایید کد و ثبت کلمه عبور جدید'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="px-7 pt-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                step === 'REQUEST' || step === 'VERIFY' ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            />
            <div
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                step === 'VERIFY' ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            />
          </div>
        </div>

        {/* Form Body */}
        <div className="p-7 pt-3 space-y-5">
          {/* Error Alert */}
          {errorMessage && (
            <div
              id="admin-forgot-error-alert"
              className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 text-xs text-rose-700 font-bold flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div
              id="admin-forgot-success-alert"
              className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-emerald-700 font-bold flex items-center gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === 'REQUEST' ? (
            /* STEP 1: REQUEST OTP */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                جهت دریافت کد تایید ۶ رقمی، آدرس ایمیل پشتیبان ثبت‌شده مدیر سیستم را وارد نمایید. کد ارسالی به مدت ۱۵ دقیقه معتبر خواهد بود.
              </p>

              <div>
                <label
                  htmlFor="recovery-email-input"
                  className="text-xs font-black text-slate-800 block mb-2 flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>آدرس ایمیل پشتیبان مدیریت:</span>
                </label>

                <input
                  id="recovery-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  dir="ltr"
                  placeholder="omran.javan73@gmail.com"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-sm font-bold px-4 py-3.5 rounded-2xl focus:outline-none transition font-mono text-left shadow-2xs placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                id="send-otp-btn"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg disabled:opacity-70 mt-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ارسال کد تایید ۶ رقمی به ایمیل</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: VERIFY OTP & RESET PASSWORD */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 text-xs text-indigo-950 font-medium">
                کد تایید ۶ رقمی به ایمیل <strong className="font-mono font-bold">{email}</strong> ارسال گردید.
              </div>

              <div>
                <label
                  htmlFor="otp-code-input"
                  className="text-xs font-black text-slate-800 block mb-2 flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>کد تایید ۶ رقمی (OTP):</span>
                </label>

                <input
                  id="otp-code-input"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, ''));
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoFocus
                  dir="ltr"
                  placeholder="• • • • • •"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white text-slate-900 text-xl font-black text-center tracking-[8px] py-3 rounded-2xl focus:outline-none transition font-mono shadow-2xs placeholder:text-slate-300 placeholder:tracking-widest"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password-input"
                  className="text-xs font-black text-slate-800 block mb-2 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-700" />
                  <span>کلمه عبور جدید:</span>
                </label>

                <div className="relative">
                  <input
                    id="new-password-input"
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="کلمه عبور جدید (حداقل ۶ کاراکتر)"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-sm font-bold px-4 py-3 rounded-2xl focus:outline-none transition pl-11 pr-4 shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    tabIndex={-1}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password-input"
                  className="text-xs font-black text-slate-800 block mb-2 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-700" />
                  <span>تکرار کلمه عبور جدید:</span>
                </label>

                <div className="relative">
                  <input
                    id="confirm-password-input"
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="تکرار کلمه عبور جدید"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-sm font-bold px-4 py-3 rounded-2xl focus:outline-none transition pl-11 pr-4 shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    tabIndex={-1}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  id="back-to-step1-btn"
                  onClick={() => setStep('REQUEST')}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3.5 rounded-2xl transition cursor-pointer"
                >
                  ارسال مجدد
                </button>

                <button
                  type="submit"
                  id="confirm-reset-btn"
                  disabled={isLoading}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-70"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تایید و ثبت کلمه عبور جدید</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer Back Link */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              id="back-to-login-btn"
              onClick={onBackToLogin}
              className="text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-1.5 cursor-pointer py-1"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>بازگشت به فرم ورود</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 font-medium transition cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
