import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, ArrowRight, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { sendForgotPasswordOtp, resetPasswordWithOtp } from '../../services/smsService';
import { toPersianDigits } from '../../utils/formatters';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRedirectToLogin?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessRedirectToLogin,
  showToast
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [mobile, setMobile] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(120);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    let interval: any;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMobile('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setSuccessMessage('');
      setTimer(120);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanMobile = mobile.trim().replace(/\s+/g, '').replace(/[^0-9]/g, '');
    let formattedMobile = cleanMobile;
    if (formattedMobile.startsWith('98')) formattedMobile = '0' + formattedMobile.substring(2);
    if (!formattedMobile.startsWith('0')) formattedMobile = '0' + formattedMobile;

    if (!/^09\d{9}$/.test(formattedMobile)) {
      const err = 'لطفاً شماره موبایل معتبر ۱۱ رقمی ایران را وارد نمایید (مثال: 09123456789)';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendForgotPasswordOtp(formattedMobile);
      if (res.success) {
        setMobile(formattedMobile);
        setStep(2);
        setTimer(res.expiresIn || 120);
        const msg = 'کد تایید ۶ رقمی بازیابی رمز عبور پیامک شد.';
        setSuccessMessage(msg);
        if (showToast) showToast(msg, 'success');
      } else {
        setErrorMessage(res.error || 'خطا در ارسال پیامک بازیابی رمز عبور.');
        if (showToast) showToast(res.error || 'خطا در ارسال پیامک', 'error');
      }
    } catch (_err) {
      setErrorMessage('خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanOtp = otpCode.trim().replace(/[^0-9]/g, '');
    if (cleanOtp.length < 5) {
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
      const err = 'کلمه عبور جدید و تکرار آن با یکدیگر مطابقت ندارند.';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPasswordWithOtp(mobile, cleanOtp, newPassword);
      if (res.success) {
        const msg = 'رمز عبور با موفقیت تغییر یافت. اکنون می‌توانید وارد شوید.';
        setSuccessMessage(msg);
        if (showToast) showToast(msg, 'success');
        setTimeout(() => {
          onClose();
          if (onSuccessRedirectToLogin) onSuccessRedirectToLogin();
        }, 1500);
      } else {
        setErrorMessage(res.error || 'کد تایید اشتباه یا منقضی شده است.');
        if (showToast) showToast(res.error || 'خطا در تغییر رمز عبور', 'error');
      }
    } catch (_err) {
      setErrorMessage('خطای ارتباط با سرور.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="forgot-password-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-['Vazirmatn',sans-serif]"
    >
      <div
        id="forgot-password-modal-container"
        className="bg-white border border-gray-200 w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden my-auto text-slate-800 animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 text-center relative">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/30 inline-flex">
              <KeyRound className="w-7 h-7" />
            </div>
          </div>
          <h3 className="text-base font-black text-white">
            بازیابی رمز عبور با پیامک (SMS.ir)
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            ارسال سریع کد تایید تایید هویت به شماره همراه شما
          </p>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-start gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-red-600" />
                  <span>شماره موبایل ثبت‌شده در سامانه:</span>
                </label>
                <input
                  type="tel"
                  id="forgot-pass-mobile-input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="09123456789"
                  className="w-full p-3.5 text-sm bg-gray-50 border border-gray-300 rounded-2xl outline-none focus:border-red-600 dir-ltr text-center font-mono font-bold"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                id="forgot-pass-send-btn"
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>ارسال کد بازیابی پیامکی</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 font-medium">
                  کد پیامک‌شده به <span className="font-mono font-bold text-gray-900 dir-ltr inline-block">{mobile}</span>:
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-red-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <ArrowRight className="w-3 h-3" />
                  ویرایش شماره
                </button>
              </div>

              <input
                type="text"
                id="forgot-pass-otp-input"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="— — — — — —"
                className="w-full p-3 text-lg font-black tracking-widest text-center bg-gray-50 border-2 border-red-500 rounded-2xl outline-none dir-ltr font-mono"
                required
                autoFocus
              />

              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-gray-500" />
                    <span>کلمه عبور جدید:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="حداقل ۶ کاراکتر"
                      className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-red-600 dir-ltr text-center font-mono font-bold pl-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-gray-500" />
                    <span>تکرار کلمه عبور جدید:</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="تکرار کلمه عبور"
                    className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-red-600 dir-ltr text-center font-mono font-bold"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
                {timer > 0 ? (
                  <span>زمان باقیمانده: {toPersianDigits(Math.floor(timer / 60))}:{toPersianDigits((timer % 60).toString().padStart(2, '0'))}</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-red-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    ارسال مجدد کد پیامکی
                  </button>
                )}
              </div>

              <button
                type="submit"
                id="forgot-pass-confirm-btn"
                disabled={isLoading}
                className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>ثبت رمز عبور جدید و تایید</span>
                )}
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-900 font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>انصراف و بازگشت</span>
            </button>

            <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>ارسال امن با سرشماره ۱۰۰۰</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
