import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Phone, Mail, X, CheckCircle2, AlertCircle, LogIn, ArrowRight, RefreshCw, KeyRound, ShieldCheck, Edit3 } from 'lucide-react';
import type { User } from '../types';
import { saveUserProfileToFirestore } from '../firebase';
import { sendOtp, verifyOtp } from '../services/smsService';
import { toPersianDigits } from '../utils/formatters';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, showToast }) => {
  // Step 1: Mobile & Name input. Step 2: 6-digit OTP verification
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // 6-digit OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer & Loading states
  const [countdown, setCountdown] = useState<number>(120);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Countdown effect
  useEffect(() => {
    let timer: any;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      setStep(1);
      setOtpDigits(['', '', '', '', '', '']);
      setCountdown(120);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format timer as MM:SS (e.g. 02:00)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Send OTP
  const handleSendOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanMobile = phone.replace(/[^0-9]/g, '');
    let formattedMobile = cleanMobile;
    if (formattedMobile.startsWith('98')) formattedMobile = '0' + formattedMobile.substring(2);
    if (!formattedMobile.startsWith('0')) formattedMobile = '0' + formattedMobile;

    if (!name.trim()) {
      const err = 'لطفاً نام و نام خانوادگی خود را وارد کنید';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    if (!/^09\d{9}$/.test(formattedMobile)) {
      const err = 'لطفاً شماره موبایل معتبر ۱۱ رقمی وارد نمایید (مثال: 09121234567)';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendOtp(formattedMobile, name);
      if (res.success) {
        setPhone(formattedMobile);
        setStep(2);
        setCountdown(res.expiresIn || 120);
        setOtpDigits(['', '', '', '', '', '']);
        const msg = 'کد تایید ۶ رقمی به شماره شما پیامک شد.';
        setSuccessMessage(msg);
        if (showToast) showToast(msg, 'success');

        // Focus first OTP input
        setTimeout(() => {
          if (otpInputsRef.current[0]) {
            otpInputsRef.current[0].focus();
          }
        }, 100);
      } else {
        setErrorMessage(res.error || 'خطا در ارسال کد تایید. لطفاً بعداً تلاش فرمایید.');
        if (showToast) showToast(res.error || 'خطا در ارسال پیامک', 'error');
      }
    } catch (err: any) {
      setErrorMessage('خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle OTP input changes
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleanVal.length > 1) {
      // Handle paste of multiple digits
      const pasted = cleanVal.slice(0, 6).split('');
      pasted.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setOtpDigits(newDigits);
      const nextFocus = Math.min(5, index + pasted.length);
      otpInputsRef.current[nextFocus]?.focus();
    } else {
      newDigits[index] = cleanVal;
      setOtpDigits(newDigits);
      if (cleanVal && index < 5) {
        otpInputsRef.current[index + 1]?.focus();
      }
    }

    // Auto submit if all 6 digits entered
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      handleVerifyOtpDirect(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtpDirect = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('لطفاً کد تایید ۶ رقمی را کامل وارد نمایید.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await verifyOtp(phone, fullCode, {
        name: name.trim() || undefined,
        email: email.trim() || undefined
      });

      if (res.success && res.user) {
        const verifiedUser: User = {
          id: res.user.id || 'usr-' + Date.now(),
          name: name.trim() || res.user.name || 'کاربر گرامی',
          phoneNumber: phone,
          email: email.trim() || res.user.email || undefined,
          createdAt: res.user.createdAt || new Date().toISOString()
        };

        localStorage.setItem('omex_current_user', JSON.stringify(verifiedUser));
        if (res.token) {
          localStorage.setItem('omex_auth_token', res.token);
        }

        await saveUserProfileToFirestore(verifiedUser).catch(() => {});

        const msg = 'ورود با موفقیت انجام شد';
        setSuccessMessage(msg);
        if (showToast) showToast(msg, 'success');

        setTimeout(() => {
          onLoginSuccess(verifiedUser);
          onClose();
        }, 500);
      } else {
        setErrorMessage(res.error || 'کد تایید وارد شده نامعتبر یا منقضی است.');
        if (showToast) showToast(res.error || 'کد نامعتبر است', 'error');
      }
    } catch (err: any) {
      setErrorMessage('خطا در اعتبارسنجی کد تایید.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || isLoading) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await sendOtp(phone, name);
      if (res.success) {
        setCountdown(res.expiresIn || 120);
        setOtpDigits(['', '', '', '', '', '']);
        const msg = 'کد تایید جدید ارسال شد.';
        setSuccessMessage(msg);
        if (showToast) showToast(msg, 'success');
        otpInputsRef.current[0]?.focus();
      } else {
        setErrorMessage(res.error || 'خطا در ارسال مجدد کد.');
      }
    } catch (_err) {
      setErrorMessage('خطا در اتصال به سرور پیامک.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-['Vazirmatn',sans-serif]">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden my-auto text-slate-800 animate-in fade-in zoom-in-95 text-right dir-rtl">
        
        {/* Header */}
        <div className="bg-[#F8FAFC] p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#111111] text-white flex items-center justify-center font-black text-lg shadow-2xs">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {step === 1 ? 'ورود / ثبت‌نام با پیامک (OTP)' : 'تایید شماره موبایل'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {step === 1 
                  ? 'سامانه هوشمند پیامکی sms.ir با تحویل فوری کد' 
                  : `کد تایید ۶ رقمی به شماره ${toPersianDigits(phone)} ارسال شد`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-4">
          
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* STEP 1: MOBILE & USER DETAILS */}
          {/* ---------------------------------------------------- */}
          {step === 1 && (
            <form onSubmit={handleSendOtpSubmit} className="space-y-4 text-xs">
              {/* Field 1: Phone Number (Required) */}
              <div>
                <label className="font-extrabold text-slate-900 block mb-1.5 text-right">
                  شماره موبایل <span className="text-rose-600">* (الزامی)</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09121234567"
                    maxLength={11}
                    autoFocus
                    required
                    className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#111111] focus:bg-white text-slate-900 text-sm font-bold p-3 pr-10 rounded-xl focus:outline-none text-left dir-ltr transition font-mono"
                    dir="ltr"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  کد تایید ۶ رقمی به این شماره ارسال خواهد شد.
                </span>
              </div>

              {/* Field 2: Name (Required) */}
              <div>
                <label className="font-extrabold text-slate-900 block mb-1.5 text-right">
                  نام و نام خانوادگی <span className="text-rose-600 font-extrabold">* (الزامی)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: علیرضا حسینی"
                    required
                    className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#111111] focus:bg-white text-slate-900 text-xs font-bold p-3 pr-10 rounded-xl focus:outline-none transition"
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                </div>
              </div>

              {/* Field 3: Email (Optional) */}
              <div>
                <label className="font-extrabold text-slate-900 block mb-1.5 text-right">
                  ایمیل <span className="text-slate-400 font-semibold">(اختیاری)</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#111111] focus:bg-white text-slate-900 text-xs font-medium p-3 pr-10 rounded-xl focus:outline-none text-left dir-ltr transition"
                    dir="ltr"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#111111] hover:bg-black text-white font-black text-xs md:text-sm py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>در حال ارسال پیامک...</span>
                  </>
                ) : (
                  <>
                    <span>دریافت کد تایید یکبار مصرف</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ---------------------------------------------------- */}
          {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
          {/* ---------------------------------------------------- */}
          {step === 2 && (
            <div className="space-y-4 text-xs text-center">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-2 text-right">
                  <Phone className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-slate-900 dir-ltr font-mono">{phone}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>ویرایش شماره</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="font-black text-slate-900 block text-right">
                  کد تایید ۶ رقمی را وارد کنید:
                </label>
                
                {/* 6 Discrete Digit Inputs */}
                <div className="flex items-center justify-center gap-2 dir-ltr" dir="ltr">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputsRef.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-lg font-black font-mono border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:bg-slate-50 focus:outline-none transition shadow-2xs"
                    />
                  ))}
                </div>
              </div>

              {/* Countdown Timer & Resend Button */}
              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || isLoading}
                  className={`font-bold flex items-center gap-1 cursor-pointer transition ${
                    countdown === 0 
                      ? 'text-slate-900 hover:text-black underline' 
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>ارسال مجدد کد</span>
                </button>

                <div className="text-slate-500 font-mono font-bold flex items-center gap-1 dir-ltr" dir="ltr">
                  <span>{formatTimer(countdown)}</span>
                  <span className="text-[10px] text-slate-400 font-sans">تا ارسال مجدد</span>
                </div>
              </div>

              {/* Submit Verification Button */}
              <button
                type="button"
                onClick={() => handleVerifyOtpDirect()}
                disabled={isLoading || otpDigits.join('').length !== 6}
                className="w-full bg-[#111111] hover:bg-black text-white font-black text-xs md:text-sm py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>در حال اعتبارسنجی...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>تایید و ورود به حساب کاربری</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

