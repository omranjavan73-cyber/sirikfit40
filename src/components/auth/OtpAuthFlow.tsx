import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, UserCheck, ArrowRight, RefreshCw, KeyRound, Smartphone, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sendOtp, verifyOtp } from '../../services/smsService';
import { toPersianDigits } from '../../utils/formatters';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface OtpAuthFlowProps {
  onAuthSuccess: (user: any) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const OtpAuthFlow: React.FC<OtpAuthFlowProps> = ({ onAuthSuccess, showToast }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  useEffect(() => {
    let interval: any;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!fullName.trim()) {
      const err = 'لطفاً نام و نام خانوادگی خود را وارد کنید';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    const cleanMobile = mobile.trim().replace(/\s+/g, '').replace(/[^0-9]/g, '');
    let formattedMobile = cleanMobile;
    if (formattedMobile.startsWith('98')) formattedMobile = '0' + formattedMobile.substring(2);
    if (!formattedMobile.startsWith('0')) formattedMobile = '0' + formattedMobile;

    if (!/^09\d{9}$/.test(formattedMobile)) {
      const err = 'لطفاً شماره موبایل معتبر ۱۱ رقمی ایران را وارد کنید (مثال: 09123456789)';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(formattedMobile, fullName.trim());
      if (res.success) {
        setMobile(formattedMobile);
        setStep('otp');
        setTimer(res.expiresIn || 120);
        setOtpDigits(['', '', '', '', '', '']);
        const msg = 'کد ورود شما به سیریک فیت با پیامک ارسال شد.';
        setSuccessMessage(msg);
        if (showToast) showToast(msg, 'success');

        setTimeout(() => {
          if (otpInputsRef.current[0]) {
            otpInputsRef.current[0].focus();
          }
        }, 100);
      } else {
        const err = res.error || 'خطا در ارسال پیامک کد تایید';
        setErrorMessage(err);
        if (showToast) showToast(err, 'error');
      }
    } catch (_err) {
      setErrorMessage('خطا در برقراری ارتباط با سامانه پیامکی');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleanVal.length > 1) {
      // If pasted multiple digits
      const pastedChars = cleanVal.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedChars[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pastedChars.length, 5);
      if (otpInputsRef.current[nextIdx]) {
        otpInputsRef.current[nextIdx]?.focus();
      }
      return;
    }

    newDigits[index] = cleanVal.slice(-1);
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const fullCode = otpDigits.join('').trim();
    if (fullCode.length < 5) {
      const err = 'لطفاً کد تایید ۶ رقمی را به صورت کامل وارد کنید';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(mobile, fullCode, { name: fullName, fullName });
      if (res.success && res.user) {
        localStorage.setItem('sirikfit_user', JSON.stringify(res.user));
        localStorage.setItem('omex_current_user', JSON.stringify(res.user));
        if (res.token) localStorage.setItem('sirikfit_token', res.token);

        const msg = 'ورود موفقیت‌آمیز بود.';
        setSuccessMessage(msg);
        if (showToast) showToast(msg, 'success');
        onAuthSuccess(res.user);
      } else {
        const err = res.error || 'کد تایید وارد شده نامعتبر یا منقضی شده است';
        setErrorMessage(err);
        if (showToast) showToast(err, 'error');
      }
    } catch (_err) {
      setErrorMessage('خطای ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-xl text-right font-['Vazirmatn',sans-serif]" dir="rtl">
        {/* Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-start gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-right">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-red-600" />
                ورود یا ثبت‌نام سریع با پیامک (SMS.ir)
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                ارسال آنی کد تایید ۶ رقمی به شماره همراه
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700">
                نام و نام خانوادگی <span className="text-red-600 font-extrabold">* (الزامی)</span>
              </label>
              <input
                type="text"
                id="otp-auth-fullname-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: علیرضا حسینی"
                className="p-3 text-xs bg-gray-50 border border-gray-300 rounded-2xl outline-none focus:border-black font-bold"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700">شماره موبایل:</label>
              <div className="relative">
                <input
                  type="tel"
                  id="otp-auth-mobile-input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="09123456789"
                  className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-2xl outline-none focus:border-black dir-ltr text-center font-bold font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>فراموشی رمز عبور (بازیابی با پیامک)</span>
              </button>
            </div>

            <button
              type="submit"
              id="otp-auth-send-btn"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-black py-3.5 rounded-2xl text-xs shadow-md transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <span>دریافت کد تأیید ورود (پیامک سریع)</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                کد تأیید ۶ رقمی را وارد کنید
              </h2>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 font-bold cursor-pointer"
              >
                ویرایش شماره <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              کد ۶ رقمی ارسال‌شده به شماره <span className="font-bold text-gray-900 dir-ltr inline-block font-mono">{mobile}</span>:
            </p>

            {/* 6-Digit Inputs Grid */}
            <div className="flex items-center justify-center gap-2 dir-ltr">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpInputsRef.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-11 h-12 text-center text-lg font-black bg-gray-50 border-2 border-red-500/80 rounded-xl outline-none focus:border-red-600 focus:bg-white font-mono shadow-xs"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 font-bold mt-1">
              {timer > 0 ? (
                <span>زمان باقیمانده: {toPersianDigits(Math.floor(timer / 60))}:{toPersianDigits((timer % 60).toString().padStart(2, '0'))}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-red-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ارسال مجدد کد
                </button>
              )}
            </div>

            <button
              type="submit"
              id="otp-auth-verify-btn"
              disabled={loading}
              className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white font-black py-3.5 rounded-2xl text-xs shadow-md transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <span>تأیید کد و ورود به حساب کاربری</span>
              )}
            </button>
          </form>
        )}
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccessRedirectToLogin={() => {
          setIsForgotPasswordOpen(false);
          setStep('phone');
        }}
        showToast={showToast}
      />
    </>
  );
};

export default OtpAuthFlow;
