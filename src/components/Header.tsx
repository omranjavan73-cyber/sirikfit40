import React, { useRef } from 'react';
import { ShoppingCart, RotateCw } from 'lucide-react';
import type { FinancialSettings, User, CmsConfig } from '../types';
import { formatToman, toPersianDigits } from '../utils/formatters';
import { SirikFitLogo } from './SirikFitLogo';

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
  const home = cms?.homeContent;
  const showPromo = home?.showTopPromo ?? false;
  const promoText = home?.topPromoText || 'سیریک فیت - مکمل‌های تخصصی ورزشی و اورجینال';
  const logoUrl = home?.logoUrl || '';

  const rawBrandTitle = (home as any)?.brandTitle || home?.appTitle || (settings as any)?.brandTitle || 'SIRIK FIT';
  const cleanBrandTitle = rawBrandTitle.replace(/\|.*$/g, '').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').replace(/PRO/gi, '').replace(/OMEX/gi, '').trim() || 'SIRIK FIT';

  const rawBrandSubtitle = (home as any)?.brandSubtitle || home?.headerPillSlogan || home?.appSubtitle || (settings as any)?.brandSubtitle || 'مکملهای ورزشی و اورجینال';
  const cleanBrandSubtitle = rawBrandSubtitle.replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').trim() || 'مکملهای ورزشی و اورجینال';

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

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 px-3 sm:px-4 py-2 sm:py-2.5 transition-all shadow-xs font-['Vazirmatn',sans-serif] dir-rtl w-full max-w-[100vw] overflow-hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2 w-full max-w-[100vw] overflow-hidden">
          
          {/* RIGHT SIDE ALIGNMENT (.brand-right) with Triple-Tap for Admin */}
          <div
            onClick={handleLogoTap}
            className="brand-right cursor-pointer select-none active:scale-[0.98] transition-transform"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '60%', flexShrink: 0 }}
            title="SIRIK FIT"
          >
            {/* Circular Fixed-Size Logo Container (48px x 48px) */}
            <div
              className="logo-container border border-black/10 shadow-2xs"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff'
              }}
            >
              {logoUrl ? (
                <img
                  id="header-app-logo"
                  src={logoUrl}
                  alt="SIRIK FIT"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block'
                  }}
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
                className="text-[#000000] uppercase font-['Arial',sans-serif]"
                style={{ fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {cleanBrandTitle}
              </h1>
              <div id="header-app-subtitle" className="bg-[#0f0f11] text-white text-[9px] sm:text-[11px] font-extrabold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full flex items-center gap-1 sm:gap-1.5 shadow-2xs mt-0.5 sm:mt-1 border border-neutral-900 whitespace-nowrap">
                <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#e50914] text-white flex items-center justify-center text-[8px] sm:text-[9px] font-black shrink-0">
                  ✓
                </span>
                <span className="whitespace-nowrap">{cleanBrandSubtitle}</span>
              </div>
            </div>
          </div>

          {/* LEFT SIDE UTILITY AREA (Shopping Cart physically on LEFT, AED Rate physically on RIGHT) */}
          <div dir="ltr" className="flex items-center gap-1.5 sm:gap-2 shrink-0 [direction:ltr]">
            
            {/* 1. Shopping Cart Icon Button (Physically on the LEFT) */}
            {onOpenCart && (
              <button
                type="button"
                onClick={onOpenCart}
                title="سبد خرید"
                className={`relative w-10 h-10 sm:w-10.5 sm:h-10.5 rounded-2xl border flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0 ${
                  isCartActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-[#f5f7fa] hover:bg-slate-100 text-[#1e293b] border-slate-200/90'
                }`}
              >
                <ShoppingCart className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#e50914] text-white text-[9.5px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {toPersianDigits(cartCount)}
                  </span>
                )}
              </button>
            )}

            {/* 2. AED Rate Pill (Physically to the RIGHT of Cart Button) */}
            {settings && (
              <div
                onClick={onRefreshSettings}
                className="flex flex-col items-center justify-center dir-rtl bg-white border border-slate-200 hover:border-slate-300 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-2xl shadow-2xs cursor-pointer select-none transition min-w-[78px] sm:min-w-[95px] shrink-0"
                title="به‌روزرسانی نرخ درهم"
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[9px] sm:text-[9.5px] font-bold text-slate-400 whitespace-nowrap leading-none">
                    نرخ درهم
                  </span>
                  <RotateCw className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 ${isLoadingSettings ? 'animate-spin text-amber-500' : ''}`} />
                </div>
                <span className="font-extrabold text-slate-900 text-[9.5px] sm:text-[11px] whitespace-nowrap leading-tight mt-0.5">
                  {toPersianDigits(formatToman(settings.aedRate))}
                </span>
              </div>
            )}

          </div>

        </div>
      </header>
    </>
  );
};

