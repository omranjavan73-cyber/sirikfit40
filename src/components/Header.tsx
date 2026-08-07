import React from 'react';
import type { FinancialSettings, CmsConfig, User } from '../types';
import { formatToman } from '../utils/formatters';
import { ShoppingCart, User as UserIcon, RefreshCw, ShieldCheck } from 'lucide-react';

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
  currentUser,
  cartCount = 0,
  onRefreshSettings,
  isLoadingSettings,
  onOpenAuthModal,
  onLogout,
  onOpenCart,
  onOpenAccountTab,
  onOpenAdmin,
  isCartActive,
  isAccountActive,
  isAdminActive
}) => {
  const brandTitle = cms?.homeContent?.brandTitle || cms?.homeContent?.appTitle || 'SIRIK FIT';
  const brandSubtitle = cms?.homeContent?.brandSubtitle || cms?.homeContent?.appSubtitle || 'مکمل‌های ورزشی و اورجینال';
  const logoUrl = cms?.logoUrl || cms?.homeContent?.logoUrl || '';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 font-['Vazirmatn',sans-serif] shadow-2xs">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        
        {/* Right Side: Price Rate Badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshSettings}
            disabled={isLoadingSettings}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-2xl transition cursor-pointer"
            title="به‌روزرسانی نرخ درهم"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingSettings ? 'animate-spin' : ''}`} />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block leading-none">نرخ درهم</span>
              <span className="text-xs font-black text-slate-900 dir-ltr block leading-tight font-mono">
                {formatToman(settings.aedRate)}
              </span>
            </div>
          </button>

          <button
            onClick={onOpenCart}
            className={`relative p-2 rounded-2xl border transition cursor-pointer flex items-center justify-center ${
              isCartActive ? 'bg-black text-white border-black' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="سبد خرید"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Center/Left Side: Brand Logo and Title */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onOpenAdmin}>
          <div className="text-right">
            <h1 className="font-black text-sm md:text-base text-slate-900 leading-none tracking-tight">
              {brandTitle}
            </h1>
            <span className="text-[10px] font-extrabold text-emerald-600 block pt-0.5">
              {brandSubtitle}
            </span>
          </div>

          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandTitle}
              className="h-10 w-auto max-w-[120px] object-contain rounded-xl border border-slate-100 p-0.5 bg-white shadow-2xs"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-black text-white font-black text-xs flex items-center justify-center shadow-2xs">
              SF
            </div>
          )}
        </div>

      </div>
    </header>
  );
};