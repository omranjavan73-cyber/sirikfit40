import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { CmsConfig } from '../types';

interface TrustBadgesSectionProps {
  cms?: CmsConfig | null;
  settings?: any;
}

export const TrustBadgesSection: React.FC<TrustBadgesSectionProps> = ({ cms, settings }) => {
  let showTrust = true;
  try {
    const home = cms?.homeContent;
    const resolvedVal = cms?.features?.showTrustBadges ?? cms?.showTrustBadges ?? home?.showTrustBadges ?? settings?.showTrustBadges;
    if (resolvedVal !== undefined && resolvedVal !== null) {
      showTrust = Boolean(resolvedVal);
    }
  } catch (e) {
    console.warn('Error reading showTrustBadges setting:', e);
  }

  if (showTrust === false) return null;

  let customBadgeImg = '';
  let customBadgeLink = '';

  try {
    const imgPotential = cms?.customBadgeImg || cms?.homeContent?.customBadgeImg || settings?.customBadgeImg;
    if (typeof imgPotential === 'string') customBadgeImg = imgPotential.trim();

    const linkPotential = cms?.customBadgeLink || cms?.homeContent?.customBadgeLink || settings?.customBadgeLink;
    if (typeof linkPotential === 'string') customBadgeLink = linkPotential.trim();
  } catch (_e) {}

  return (
    <div
      id="trust-badges-section"
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xs space-y-4 text-center font-['Vazirmatn',sans-serif]"
    >
      <div className="flex items-center justify-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <h3 className="font-black text-sm md:text-base text-slate-900 dark:text-white tracking-tight">
          نمادهای اعتماد و مجوزهای رسمی
        </h3>
      </div>

      {/* Side-by-Side 2-Column Badges Grid for Mobile, Tablet, and Desktop */}
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto w-full px-2">
        {/* Enamad Badge */}
        <a
          id="enamad-trust-badge"
          referrerPolicy="origin"
          target="_blank"
          rel="noopener noreferrer"
          href="https://trustseal.enamad.ir/?id=774774&Code=QLX3GJJuDLNIXNEEocH7c14ry1CHCK1T"
          className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-center min-h-[145px] group active:scale-[0.98]"
        >
          <img
            referrerPolicy="origin"
            src="https://trustseal.enamad.ir/logo.aspx?id=774774&Code=QLX3GJJuDLNIXNEEocH7c14ry1CHCK1T"
            alt="اینماد (نماد اعتماد)"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain cursor-pointer mb-1 group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/enamad.png';
            }}
          />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2">اینماد (نماد اعتماد)</span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">احراز هویت و مجوز رسمی</span>
        </a>

        {/* Samandehi Badge */}
        <a
          id="samandehi-trust-badge"
          referrerPolicy="origin"
          target="_blank"
          rel="noopener noreferrer"
          href="https://samandehi.ir"
          className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-center min-h-[145px] group active:scale-[0.98]"
        >
          <img
            referrerPolicy="origin"
            src="https://samandehi.ir/assets/images/logo.png"
            alt="ساماندهی (نشان ملی)"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain cursor-pointer mb-1 group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/samandehi.png';
            }}
          />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2">ساماندهی (نشان ملی)</span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">ثبت رسانه‌های دیجیتال</span>
        </a>
      </div>

      {/* Optional Custom Badge if provided */}
      {customBadgeImg && (
        <div className="flex justify-center pt-1">
          <a
            id="custom-trust-badge"
            href={customBadgeLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="origin"
            className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all max-w-[200px] w-full text-center group active:scale-[0.98]"
          >
            <img
              src={customBadgeImg}
              alt="نماد اختصاصی"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain cursor-pointer mb-1 group-hover:scale-105 transition-transform"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2">نماد اختصاصی</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">جهت اطمینان کلیک کنید</span>
          </a>
        </div>
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        تمامی فعالیت‌های این مجموعه دارای مجوز رسمی و تحت نظارت مراجع ذی‌صلاح می‌باشند.
      </p>
    </div>
  );
};

