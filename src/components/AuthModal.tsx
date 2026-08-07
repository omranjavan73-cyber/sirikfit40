import React, { useState } from 'react';
import { User as UserIcon, Phone, Mail, X, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import type { User } from '../types';
import { saveUserProfileToFirestore } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, showToast }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validation: If Name or Phone is empty
    if (!name.trim() || !phone.trim()) {
      const err = 'لطفاً نام و شماره تماس را وارد کنید';
      setErrorMessage(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    setIsLoading(true);

    try {
      const newUser: User = {
        id: 'usr-' + Date.now(),
        name: name.trim(),
        phoneNumber: phone.trim(),
        email: email.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      // Store in localStorage
      localStorage.setItem('omex_current_user', JSON.stringify(newUser));

      // Save user profile to Firebase Firestore "users" collection
      await saveUserProfileToFirestore(newUser);

      const msg = 'ورود با موفقیت انجام شد';
      setSuccessMessage(msg);
      if (showToast) showToast(msg, 'success');

      setTimeout(() => {
        onLoginSuccess(newUser);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMessage('خطا در ورود به سامانه.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-['Vazirmatn',sans-serif]">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden my-auto text-slate-800 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#F8FAFC] p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#111111] text-white flex items-center justify-center font-black text-lg shadow-2xs">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                ورود / ثبت‌نام در سامانه SIRIK FIT
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                مشاهده و پیگیری آنلاین سفارشات مکمل‌های ورزشی اورجینال
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
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

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Field 1: Name (Required) */}
            <div>
              <label className="font-extrabold text-slate-900 block mb-1.5 text-right">
                نام و نام خانوادگی <span className="text-rose-600">* (الزامی)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: علیرضا حسینی"
                  className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#111111] focus:bg-white text-slate-900 text-xs font-bold p-3 pr-9 rounded-xl focus:outline-none transition"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Field 2: Phone Number (Required) */}
            <div>
              <label className="font-extrabold text-slate-900 block mb-1.5 text-right">
                شماره تماس <span className="text-rose-600">* (الزامی)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09121234567"
                  className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#111111] focus:bg-white text-slate-900 text-xs font-bold p-3 pr-9 rounded-xl focus:outline-none text-left dir-ltr transition"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
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
                  className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#111111] focus:bg-white text-slate-900 text-xs font-medium p-3 pr-9 rounded-xl focus:outline-none text-left dir-ltr transition"
                  dir="ltr"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#111111] hover:bg-black text-white font-black text-xs md:text-sm py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {isLoading ? (
                <span>در حال ورود...</span>
              ) : (
                <span>ورود / ثبت‌نام در سامانه</span>
              )}
            </button>
          </form>

          <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            با ورود به سامانه، تمام سفارشات اختصاصی شما به‌صورت خودکار همگام‌سازی می‌شوند.
          </div>
        </div>

      </div>
    </div>
  );
};
