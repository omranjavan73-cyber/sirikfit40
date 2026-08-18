import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { CmsConfig } from '../types';

interface TrustBadgesSectionProps {
  cms?: CmsConfig | null;
  settings?: any;
}

export const TrustBadgesSection: React.FC<TrustBadgesSectionProps> = ({ cms, settings }) => {
  const home = cms?.homeContent;
  const showTrust =
    cms?.features?.showTrustBadges ??
    cms?.showTrustBadges ??
    home?.showTrustBadges ??
    settings?.showTrustBadges ??
    true;

  if (showTrust === false) return null;

  const customBadgeImg = cms?.customBadgeImg || home?.customBadgeImg || settings?.customBadgeImg || '';
  const customBadgeLink = cms?.customBadgeLink || home?.customBadgeLink || settings?.customBadgeLink || '';

  return (
    <div id="trust-badges-section" className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-2xs space-y-4 text-center font-['Vazirmatn',sans-serif]">
      <div className="flex items-center justify-center gap-2 border-b border-slate-100 pb-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <h3 className="font-black text-sm md:text-base text-slate-900 tracking-tight">نمادهای اعتماد و مجوزهای رسمی</h3>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-3 sm:gap-6 pt-1">
        {/* Non-Blocking Official Enamad Component */}
        <a
          href="https://trustseal.enamad.ir/?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200/90 hover:border-slate-800 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer w-full sm:w-44 text-center group active:scale-[0.98]"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-1.5 flex items-center justify-center group-hover:scale-105 transition-transform">
            <img
              src="/enamad.png"
              alt="اینماد"
              onError={(e) => {
                e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/1/1b/Enamad_Logo.png";
              }}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[11px] sm:text-xs font-black text-slate-800">نماد اعتماد الکترونیکی</span>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5">جهت استعلام کلیک کنید</span>
        </a>

        {/* Samandehi Digital Media Badge */}
        <a
          href="https://samandehi.ir"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200/90 hover:border-slate-800 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer w-full sm:w-44 text-center group active:scale-[0.98]"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col items-center justify-center p-1 relative">
              <span className="text-xl font-extrabold text-amber-700">رسانه</span>
              <span className="text-[8px] font-bold text-amber-800 mt-0.5">دیجیتال</span>
              <span className="absolute -bottom-1 text-[8px] font-black bg-amber-600 text-white px-1.5 py-0.2 rounded-full">
                ساماندهی
              </span>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-black text-slate-900">ساماندهی رسانه‌های دیجیتال</span>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5">نشان ملی ثبت</span>
        </a>

        {/* Optional Custom Badge */}
        {customBadgeImg && (
          <a
            href={customBadgeLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200/90 hover:border-slate-800 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer w-full sm:w-44 text-center group active:scale-[0.98]"
          >
            <img
              src={customBadgeImg}
              alt="نماد اختصاصی"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-1.5 group-hover:scale-105 transition-transform"
            />
            <span className="text-[11px] sm:text-xs font-black text-slate-900">مجوز صنفی واردات</span>
          </a>
        )}
      </div>

      <p className="text-[11px] text-slate-500 font-medium">
        تمامی فعالیت‌های این مجموعه دارای مجوز رسمی و تحت نظارت مراجع ذی‌صلاح می‌باشند.
      </p>
    </div>
  );
};

export default TrustBadgesSection;
