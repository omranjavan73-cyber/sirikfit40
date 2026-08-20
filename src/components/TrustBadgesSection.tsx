import React from 'react';
import { ShieldCheck, Award, ExternalLink } from 'lucide-react';
import type { CmsConfig } from '../types';
import { useSettings } from '../context/SettingsContext';

interface TrustBadgesSectionProps {
  cms?: CmsConfig | null;
  settings?: any;
}

export const TrustBadgesSection: React.FC<TrustBadgesSectionProps> = ({ cms, settings: propSettings }) => {
  let contextSettings: any = null;
  try {
    const ctx = useSettings();
    contextSettings = ctx?.settings;
  } catch (_e) {}

  const effectiveSettings = propSettings || contextSettings || {};
  const home = cms?.homeContent;

  // Resolve Master Show/Hide Toggle
  let showTrust = true;
  try {
    const resolvedVal =
      (cms as any)?.showTrustSection ??
      cms?.features?.showTrustBadges ??
      cms?.showTrustBadges ??
      home?.showTrustBadges ??
      effectiveSettings?.showTrustBadges;
    if (resolvedVal !== undefined && resolvedVal !== null) {
      showTrust = Boolean(resolvedVal);
    }
  } catch (e) {
    console.warn('Error reading showTrustBadges setting:', e);
  }

  // Resolve individual badge visibility toggles
  let showEnamad = true;
  try {
    const enamadVal =
      cms?.features?.showEnamad ??
      cms?.showEnamad ??
      home?.showEnamad ??
      effectiveSettings?.showEnamad;
    if (enamadVal !== undefined && enamadVal !== null) {
      showEnamad = Boolean(enamadVal);
    }
  } catch (_e) {}

  let showSamandehi = true;
  try {
    const samandehiVal =
      cms?.features?.showSamandehi ??
      cms?.showSamandehi ??
      home?.showSamandehi ??
      effectiveSettings?.showSamandehi;
    if (samandehiVal !== undefined && samandehiVal !== null) {
      showSamandehi = Boolean(samandehiVal);
    }
  } catch (_e) {}

  let showCustomBadge = false;
  try {
    const customVal =
      (cms as any)?.features?.showCustomBadge ??
      (cms as any)?.showCustomBadge ??
      (cms as any)?.homeContent?.showCustomBadge ??
      effectiveSettings?.showCustomBadge;
    if (customVal !== undefined && customVal !== null) {
      showCustomBadge = Boolean(customVal);
    }
  } catch (_e) {}

  let enamadCodeOrUrl = '';
  let samandehiCodeOrUrl = '';
  let customBadgeImg = '';
  let customBadgeLink = '';
  let customBadgeTitle = 'مجوز و نماد اختصاصی';

  try {
    enamadCodeOrUrl = ((cms as any)?.enamadCodeOrUrl || cms?.enamadHtml || home?.enamadHtml || effectiveSettings?.enamadHtml || '').trim();
    samandehiCodeOrUrl = ((cms as any)?.samandehiCodeOrUrl || cms?.samandehiHtml || home?.samandehiHtml || effectiveSettings?.samandehiHtml || '').trim();
    
    const imgPotential = cms?.customBadgeImg || (cms as any)?.customBadgeImage || home?.customBadgeImg || effectiveSettings?.customBadgeImg;
    if (typeof imgPotential === 'string') customBadgeImg = imgPotential.trim();

    const linkPotential = cms?.customBadgeLink || home?.customBadgeLink || effectiveSettings?.customBadgeLink;
    if (typeof linkPotential === 'string') customBadgeLink = linkPotential.trim();

    const titlePotential = (cms as any)?.customBadgeTitle || (cms as any)?.homeContent?.customBadgeTitle;
    if (typeof titlePotential === 'string' && titlePotential.trim()) customBadgeTitle = titlePotential.trim();
    
    if (customBadgeImg && showCustomBadge === false && (cms as any)?.showCustomBadge === undefined) {
      showCustomBadge = true;
    }
  } catch (_e) {}

  // If master toggle is off, or no badges are enabled, return null
  if (showTrust === false) return null;
  if (!showEnamad && !showSamandehi && !(showCustomBadge && customBadgeImg)) return null;

  // Helper to determine if input is HTML iframe or URL
  const isHtmlSnippet = (str: string) => str.includes('<') && str.includes('>');
  const enamadUrl = (!isHtmlSnippet(enamadCodeOrUrl) && enamadCodeOrUrl.startsWith('http'))
    ? enamadCodeOrUrl
    : 'https://trustseal.enamad.ir/?id=774774&Code=QLX3GJJuDLNIXNEEocH7c14ry1CHCK1T';

  const samandehiUrl = (!isHtmlSnippet(samandehiCodeOrUrl) && samandehiCodeOrUrl.startsWith('http'))
    ? samandehiCodeOrUrl
    : 'https://samandehi.ir';

  return (
    <div
      id="trust-badges-section"
      className="bg-white border border-slate-200/80 shadow-xs rounded-3xl p-5 sm:p-6 md:p-7 space-y-5 text-center font-['Vazirmatn',sans-serif] transition-all"
    >
      <div className="flex items-center justify-center gap-2 border-b border-slate-100 pb-3.5">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <h3 className="font-black text-sm md:text-base text-slate-900 tracking-tight">
          نمادهای اعتماد و مجوزهای رسمی
        </h3>
      </div>

      {/* Badges Grid: Strict 2-Column Grid on all viewports (Mobile & Desktop) */}
      <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-xl mx-auto items-stretch">
        {/* 1. Enamad Badge */}
        {showEnamad && (
          <div className="w-full flex">
            {isHtmlSnippet(enamadCodeOrUrl) ? (
              <div
                dangerouslySetInnerHTML={{ __html: enamadCodeOrUrl }}
                className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col items-center justify-center text-center hover:shadow-md transition min-h-[140px]"
              />
            ) : (
              <a
                id="enamad-trust-badge"
                referrerPolicy="origin"
                target="_blank"
                rel="noopener noreferrer"
                href={enamadUrl}
                className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col items-center justify-center text-center min-h-[140px] group active:scale-[0.98]"
              >
                <div className="w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center bg-white rounded-xl p-1.5 border border-slate-100 shadow-2xs mb-2 group-hover:scale-105 transition-transform">
                  <img
                    referrerPolicy="origin"
                    src="https://trustseal.enamad.ir/logo.aspx?id=774774&Code=QLX3GJJuDLNIXNEEocH7c14ry1CHCK1T"
                    alt="اینماد (نماد اعتماد)"
                    className="max-h-full max-w-full object-contain cursor-pointer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/enamad.png';
                    }}
                  />
                </div>
                <span className="text-[11px] sm:text-xs font-black text-slate-900 line-clamp-1">نماد اعتماد (اینماد)</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1">احراز هویت وزارت صمت</span>
              </a>
            )}
          </div>
        )}

        {/* 2. Samandehi Badge */}
        {showSamandehi && (
          <div className="w-full flex">
            {isHtmlSnippet(samandehiCodeOrUrl) ? (
              <div
                dangerouslySetInnerHTML={{ __html: samandehiCodeOrUrl }}
                className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col items-center justify-center text-center hover:shadow-md transition min-h-[140px]"
              />
            ) : (
              <a
                id="samandehi-trust-badge"
                referrerPolicy="origin"
                target="_blank"
                rel="noopener noreferrer"
                href={samandehiUrl}
                className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col items-center justify-center text-center min-h-[140px] group active:scale-[0.98]"
              >
                <div className="w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center bg-white rounded-xl p-1.5 border border-slate-100 shadow-2xs mb-2 group-hover:scale-105 transition-transform">
                  <img
                    referrerPolicy="origin"
                    src="https://samandehi.ir/assets/images/logo.png"
                    alt="ساماندهی (نشان ملی)"
                    className="max-h-full max-w-full object-contain cursor-pointer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/samandehi.png';
                    }}
                  />
                </div>
                <span className="text-[11px] sm:text-xs font-black text-slate-900 line-clamp-1">نشان ملی ساماندهی</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1">رسانه‌های دیجیتال ارشاد</span>
              </a>
            )}
          </div>
        )}

        {/* 3. Custom Badge (if enabled, span 2 if lone or stay in grid) */}
        {showCustomBadge && customBadgeImg && (
          <div className={`w-full flex ${!showEnamad || !showSamandehi ? '' : 'col-span-2 sm:col-span-1'}`}>
            <a
              id="custom-trust-badge"
              href={customBadgeLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="origin"
              className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col items-center justify-center text-center min-h-[140px] group active:scale-[0.98]"
            >
              <div className="w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center bg-white rounded-xl p-1.5 border border-slate-100 shadow-2xs mb-2 group-hover:scale-105 transition-transform">
                <img
                  src={customBadgeImg}
                  alt={customBadgeTitle}
                  className="max-h-full max-w-full object-contain cursor-pointer"
                />
              </div>
              <span className="text-[11px] sm:text-xs font-black text-slate-900 line-clamp-1">{customBadgeTitle}</span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                {customBadgeLink ? 'جهت بررسی و استعلام کلیک کنید' : 'دارای اعتبار و اصالت رسمی'}
              </span>
            </a>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500 font-medium pt-1 max-w-lg mx-auto">
        تمامی فعالیت‌های فروشگاه سیریک‌فیت دارای مجوز رسمی و تحت نظارت کامل مراجع ذی‌صلاح قانونی می‌باشد.
      </p>
    </div>
  );
};
