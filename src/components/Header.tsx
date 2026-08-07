import React, { useRef } from 'react';
import { ShoppingBag } from 'lucide-react';
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

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 px-3 sm:px-4 py-2.5 sm:py-3 transition-all shadow-xs font-['Vazirmatn',sans-serif] dir-rtl w-full max-w-[100vw] overflow-hidden">
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

          {/* LEFT SIDE UTILITY AREA (سبد خرید و نرخ درهم) */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0 dir-ltr">
            
            {/* Shopping Cart Block */}
            <div className="flex flex-col items-center justify-center">
              {onOpenCart && (
                <button
                  onClick={onOpenCart}
                  title="سبد خرید"
                  className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-black flex items-center justify-center transition cursor-pointer shadow-2xs ${
                    isCartActive
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-white hover:bg-slate-50 text-[#111111]'
                  }`}
                >
                  <ShoppingBag className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#e50914] text-white text-[10px] sm:text-[11px] font-black w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                      {toPersianDigits(cartCount)}
                    </span>
                  )}
                </button>
              )}
              <span className="text-[11px] sm:text-[12px] font-bold text-[#111111] text-center block mt-1 leading-tight">
                سبد خرید
              </span>
            </div>

            {/* Dirham Rate & Pulsing LED indicator */}
            {settings && (
              <div className="flex flex-col items-center justify-center leading-none">
                <div className="flex items-center justify-center gap-1 dir-rtl bg-slate-50 border border-slate-200/90 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl shadow-2xs">
                  <span className="font-extrabold text-[#111111] text-[11px] sm:text-[12.5px] whitespace-nowrap">
                    {formatToman(settings.aedRate)}
                  </span>
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#ff3b30] animate-pulse-dot shrink-0 shadow-[0_0_6px_rgba(255,59,48,0.7)]"></span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-[#8e8e93] text-center block mt-1">
                  نرخ درهم
                </span>
              </div>
            )}

          </div>

        </div>
      </header>
    </>
  );
};

