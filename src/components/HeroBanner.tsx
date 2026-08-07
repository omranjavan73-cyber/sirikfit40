import React from 'react';
import type { CmsConfig } from '../types';

interface HeroBannerProps {
  cms?: CmsConfig | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ cms }) => {
  const home = cms?.homeContent;
  const bannerUrl = home?.heroImageUrl || '';

  return (
    <div id="sports-hero-banner" className="w-full rounded-2xl overflow-hidden shadow-xl border border-neutral-800 bg-[#0d0d0d] my-2 transition-all">
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt="SIRIK FIT Banner"
          className="w-full h-auto max-h-[220px] sm:max-h-[280px] object-cover sm:object-contain mx-auto block"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        /* Default SVG Banner matching the black/red Sirik Fit wide graphic banner */
        <div className="relative w-full aspect-[21/8] max-h-[240px] bg-[#09090b] text-white p-4 sm:p-6 flex items-center justify-between dir-rtl overflow-hidden">
          {/* Subtle Glows */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#e50914]/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-black/80 rounded-full blur-2xl pointer-events-none"></div>

          {/* Right Side in RTL: Products Visual Representation */}
          <div className="relative z-10 flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="w-20 h-28 sm:w-32 sm:h-40 bg-gradient-to-b from-neutral-800 to-black rounded-xl border border-neutral-700/80 shadow-2xl flex flex-col items-center justify-center p-2 text-center">
              <span className="text-[9px] sm:text-xs font-black text-[#e50914]">100% WHEY</span>
              <span className="text-[10px] sm:text-sm font-black text-white mt-1">GOLD STANDARD</span>
              <div className="w-8 h-1 bg-[#e50914] rounded-full mt-2"></div>
            </div>
            <div className="w-14 h-24 sm:w-20 sm:h-32 bg-gradient-to-b from-neutral-900 to-neutral-950 rounded-lg border border-neutral-800 shadow-xl flex flex-col items-center justify-center p-1 text-center">
              <span className="text-[8px] sm:text-[10px] font-extrabold text-white">CREATINE</span>
              <span className="text-[7px] sm:text-[9px] text-neutral-400">MONOHYDRATE</span>
            </div>
          </div>

          {/* Left Side in RTL: Text */}
          <div className="relative z-10 text-right space-y-1.5 sm:space-y-2 max-w-[60%]">
            <h2 className="text-sm sm:text-xl md:text-2xl font-black text-white leading-snug">
              مکمل‌های ورزشی <span className="text-[#e50914]">اورجینال و اصل</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-neutral-300 font-bold">
              تضمین اصالت کالا، تضمین کیفیت.
            </p>
            <div className="pt-2 flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[11px] font-extrabold text-neutral-300">
              <span className="bg-neutral-900/90 border border-neutral-800 px-2 py-0.5 rounded-md">✓ ۱۰۰٪ اورجینال</span>
              <span className="bg-neutral-900/90 border border-neutral-800 px-2 py-0.5 rounded-md">✓ ضمانت اصالت</span>
              <span className="bg-neutral-900/90 border border-neutral-800 px-2 py-0.5 rounded-md">✓ ارسال سریع</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

