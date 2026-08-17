import React from 'react';
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

  // If master toggle is off, or no badges are enabled, return null
  if (showTrust === false) return null;
  if (!showEnamad && !showSamandehi) return null;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 my-4 font-['Vazirmatn',sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <h3 className="text-slate-800 font-bold text-sm sm:text-base">
          نمادهای اعتماد و مجوزهای رسمی
        </h3>
      </div>

      {/* Badges Grid */}
      <div className={`grid ${showEnamad && showSamandehi ? 'grid-cols-2 gap-3 max-w-md mx-auto' : 'grid-cols-1 max-w-[220px] mx-auto'} w-full`}>
        {/* Enamad Badge */}
        {showEnamad && (
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-center p-1.5 mb-2 overflow-hidden hover:border-blue-400 transition-colors">
              {/* Official Enamad Badge Link & Authentic Logo */}
              <a 
                href="https://trustseal.enamad.ir/?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-full flex items-center justify-center"
                title="مشاهده نماد اعتماد الکترونیکی معتبر"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Enamad_Logo.png" 
                  alt="نماد اعتماد الکترونیکی (اینماد)" 
                  loading="lazy"
                  className="w-full h-full object-contain cursor-pointer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/enamad.png';
                  }}
                />
              </a>
            </div>
            <span className="text-slate-800 font-semibold text-xs sm:text-sm text-center">اینماد (نماد اعتماد)</span>
            <span className="text-slate-500 text-[11px] mt-0.5 text-center">احراز هویت و مجوز رسمی</span>
          </div>
        )}

        {/* Samandehi Badge */}
        {showSamandehi && (
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center p-1 mb-2 overflow-hidden">
              <a
                referrerPolicy="origin"
                target="_blank"
                rel="noopener noreferrer"
                href="https://samandehi.ir"
                className="w-full h-full flex items-center justify-center"
              >
                <img
                  referrerPolicy="origin"
                  src="https://samandehi.ir/assets/images/logo.png"
                  alt="ساماندهی (نشان ملی)"
                  style={{ cursor: 'pointer' }}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/samandehi.png';
                  }}
                />
              </a>
            </div>
            <span className="text-slate-800 font-semibold text-xs sm:text-sm text-center">ساماندهی (نشان ملی)</span>
            <span className="text-slate-500 text-[11px] mt-0.5 text-center">ثبت رسانه‌های دیجیتال</span>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <p className="text-slate-500 text-[11px] text-center mt-3 leading-relaxed">
        تمامی فعالیت‌های این مجموعه دارای مجوز رسمی و تحت نظارت مراجع ذی‌صلاح می‌باشند.
      </p>
    </div>
  );
};

