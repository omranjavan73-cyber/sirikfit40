import React, { useState } from 'react';
import type { FinancialSettings, CmsConfig, User } from '../types';
import { formatToman } from '../utils/formatters';
import { ShoppingCart, RefreshCw } from 'lucide-react';

interface HeaderProps {
  settings: FinancialSettings;
  cms?: CmsConfig | null;
  currentUser?: User | null;
  cartCount?: number;
  onRefreshSettings?: () => void;
  isLoadingSettings?: boolean;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onOpenCart?: () => void;
  onOpenAccountTab?: () => void;
  onOpenAdmin?: () => void;
  isCartActive?: boolean;
  isAccountActive?: boolean;
  isAdminActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  cms,
  cartCount = 0,
  onRefreshSettings,
  isLoadingSettings,
  onOpenCart,
  onOpenAdmin,
  isCartActive
}) => {
  const [clickCount, setClickCount] = useState(0);

  // لوگو و متون
  const brandTitle = cms?.homeContent?.brandTitle || cms?.homeContent?.appTitle || 'SIRIK FIT';
  const brandSubtitle = cms?.homeContent?.brandSubtitle || cms?.homeContent?.appSubtitle || 'مکمل‌های ورزشی و اورجینال';
  const logoUrl = cms?.logoUrl || cms?.homeContent?.logoUrl || '';

  // ورود به پنل مدیریت با ۳ کلیک پشت سر هم
  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 3) {
      setClickCount(0);
      if (onOpenAdmin) onOpenAdmin();
    }
    setTimeout(() => setClickCount(0), 1000);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 font-['Vazirmatn',sans-serif]">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between dir-rtl">
        
        {/* سمت راست: لوگو و تیتر برند (بازگشت به جایگاه اصلی) */}
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleLogoClick}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandTitle}
              className="h-10 w-auto max-w-[110px] object-contain rounded-xl p-0.5 bg-white border border-slate-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
              SF
            </div>
          )}

          <div className="text-right">
            <h1 className="font-black text-sm md:text-base text-slate-900 leading-none">
              {brandTitle}
            </h1>
            <span className="text-[10px] font-bold text-emerald-600 block pt-1">
              {brandSubtitle}
            </span>
          </div>
        </div>

        {/* سمت چپ: نرخ درهم و سبد خرید (بازگشت به رنگ و استایل اصلی) */}
        <div className="flex items-center gap-2.5 dir-ltr">
          <button
            onClick={onRefreshSettings}
            disabled={isLoadingSettings}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-2xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoadingSettings ? 'animate-spin' : ''}`} />
            <div className="text-right dir-rtl">
              <span className="text-[9px] text-slate-400 font-bold block leading-none">نرخ درهم</span>
              <span className="text-xs font-black text-slate-900 font-mono block leading-tight">
                {formatToman(settings.aedRate)}
              </span>
            </div>
          </button>

          <button
            onClick={onOpenCart}
            className={`relative p-2.5 rounded-2xl border transition cursor-pointer ${
              isCartActive ? 'bg-slate-900 text-white border-black' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};