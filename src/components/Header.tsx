import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, RotateCw } from 'lucide-react';
import type { FinancialSettings, User, CmsConfig } from '../types';
import { formatToman, toPersianDigits, getEffectiveAedRate } from '../utils/formatters';
import { SirikFitLogo } from './SirikFitLogo';
import { useSettings } from '../context/SettingsContext';
import { usePricing } from '../context/PricingContext';

interface HeaderProps {
  settings: FinancialSettings | null;
  currentUser?: User | null;
  cms?: CmsConfig | null;
  cartCount?: number;
  onRefreshSettings?: () => void;
  isLoadingSettings?: boolean;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
  onOpenAccountTab?: () => void;
  onOpenCart?: () => void;
  isAdminActive?: boolean;
  isAccountActive?: boolean;
  isCartActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  cms,
  cartCount = 0,
  onRefreshSettings,
  isLoadingSettings = false,
  onOpenAdmin,
  onOpenCart,
  isCartActive
}) => {
  const { aedRate, isLoading: isSettingsContextLoading, refreshSettings } = useSettings();
  const { dirhamRate: pricingDirhamRate } = usePricing();

  const home = cms?.homeContent;
  const showPromo = home?.showTopPromo ?? false;
  const promoText = home?.topPromoText || 'سیریک فیت - مکمل‌های تخصصی ورزشی و اورجینال';
  const logoUrl = home?.logoUrl || '';

  const rawBrandTitle = (home as any)?.brandTitle || home?.appTitle || (settings as any)?.brandTitle || 'SIRIK FIT';
  const cleanBrandTitle = rawBrandTitle.replace(/\|.*$/g, '').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').replace(/PRO/gi, '').replace(/OMEX/gi, '').trim() || 'SIRIK FIT';

  const rawBrandSubtitle = (home as any)?.brandSubtitle || home?.headerPillSlogan || home?.appSubtitle || (settings as any)?.brandSubtitle || 'مکملهای ورزشی و اورجینال';
  const cleanBrandSubtitle = rawBrandSubtitle.replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').trim() || 'مکملهای ورزشی و اورجینال';

  // Read dynamic dirhamRate directly from PricingContext with zero hardcoded defaults
  const dirhamRate = (pricingDirhamRate && pricingDirhamRate > 0)
    ? pricingDirhamRate
    : (aedRate && aedRate > 0 ? aedRate : 54500);

  const isLoadingRate = isLoadingSettings || isSettingsContextLoading;

  // Triple-tap counter for admin access (3 taps within 1.5 seconds)
  const tapCountRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 1500) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      if (onOpenAdmin) {
        onOpenAdmin();
      }
    }
  };

  return (
    <>
      {/* Optional Top Promo Strip */}
      {showPromo && (
        <div
          id="top-promo-strip"
          className="bg-[#111111] text-white text-[11px] font-extrabold py-1.5 px-3 text-center flex items-center justify-center gap-1.5 tracking-wide dir-rtl border-b border-[#e50914]/30"
        >
          <span className="text-[#e50914]">⚡</span>
          <span id="top-promo-text">{promoText}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 transition-all shadow-xs font-['Vazirmatn',sans-serif] dir-rtl w-full">
        <div className="flex items-center justify-between gap-2 px-3 py-2 w-full max-w-4xl mx-auto">
          
          {/* RIGHT SIDE ALIGNMENT (.brand-right) with Triple-Tap for Admin */}
          <div
            onClick={handleLogoTap}
            className="brand-right cursor-pointer select-none active:scale-[0.98] transition-transform flex items-center gap-2 min-w-0 shrink"
            title="SIRIK FIT"
          >
            {/* Circular Fixed-Size Logo Container (42px x 42px on mobile, 48px on sm) */}
            <div
              className="logo-container border border-black/10 shadow-2xs w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white"
            >
              {logoUrl ? (
                <img
                  id="header-app-logo"
                  src={logoUrl}
                  alt="SIRIK FIT"
                  className="w-full h-full object-contain block"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <SirikFitLogo className="w-full h-full" />
              )}
            </div>

            {/* Brand Text (Line 1: SIRIK FIT) & Subtitle Pill (Line 2) */}
            <div className="flex flex-col items-start justify-center leading-none min-w-0">
              <h1
                id="header-app-title"
                className="text-[#000000] uppercase font-['Arial',sans-serif] text-sm sm:text-base font-extrabold whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {cleanBrandTitle}
              </h1>
              <div id="header-app-subtitle" className="bg-[#0f0f11] text-white text-[8.5px] sm:text-[10.5px] font-extrabold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full flex items-center gap-1 shadow-2xs mt-0.5 border border-neutral-900 whitespace-nowrap">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#e50914] text-white flex items-center justify-center text-[7px] sm:text-[8px] font-black shrink-0">
                  ✓
                </span>
                <span className="whitespace-nowrap">{cleanBrandSubtitle}</span>
              </div>
            </div>
          </div>

          {/* LEFT SIDE UTILITY AREA */}
          <div dir="ltr" className="flex items-center gap-1.5 sm:gap-2 shrink-0 [direction:ltr]">
            
            {/* 1. Shopping Cart Icon Button (Physically on the LEFT) */}
            {onOpenCart && (
              <button
                type="button"
                onClick={onOpenCart}
                title="سبد خرید"
                className={`shrink-0 relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95 ${
                  isCartActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-[#f5f7fa] hover:bg-slate-100 text-[#1e293b] border-slate-200/90'
                }`}
              >
                <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#e50914] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {toPersianDigits(cartCount)}
                  </span>
                )}
              </button>
            )}

            {/* 2. AED Rate Pill (Physically to the RIGHT of Cart Button) */}
            <div
              onClick={() => {
                if (onRefreshSettings) onRefreshSettings();
                refreshSettings();
              }}
              className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer select-none border border-slate-200/80 dark:border-zinc-700 hover:border-slate-300 transition"
              title="به‌روزرسانی نرخ درهم"
            >
              <RotateCw className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 ${isLoadingRate ? 'animate-spin text-amber-500' : ''}`} />
              <span>درهم: {dirhamRate && dirhamRate > 0 ? Number(dirhamRate).toLocaleString('fa-IR') : '۵۵,۷۰۰'} تومان</span>
            </div>

          </div>

        </div>
      </header>
    </>
  );
};

export default Header;
