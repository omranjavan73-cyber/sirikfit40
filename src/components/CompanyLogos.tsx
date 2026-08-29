import React from 'react';

export interface CompanyLogoProps {
  className?: string;
}

// 1. GNC Square Logo Icon
export const GncSquareLogo: React.FC<CompanyLogoProps> = ({ className = 'w-12 h-12' }) => (
  <div className={`bg-white border border-slate-200/90 shadow-2xs rounded-xl flex flex-col items-center justify-center p-1.5 shrink-0 select-none overflow-hidden ${className}`}>
    <div className="flex flex-col items-center justify-center h-full w-full">
      <span className="font-black tracking-tighter text-[#E31837] text-base md:text-lg leading-none font-sans scale-y-95">
        GNC
      </span>
      <span className="text-[6.5px] md:text-[7.5px] font-extrabold tracking-widest text-[#E31837] uppercase mt-0.5 scale-90">
        LIVE WELL
      </span>
    </div>
  </div>
);

// 2. Life Pharmacy Square Logo Icon
export const LifePharmacySquareLogo: React.FC<CompanyLogoProps> = ({ className = 'w-12 h-12' }) => (
  <div className={`bg-white border border-slate-200/90 shadow-2xs rounded-xl flex flex-col items-center justify-center p-1 shrink-0 select-none overflow-hidden ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Blue Arch cathedral shape */}
      <path d="M50 8 C28 8 20 22 20 36 V68 H80 V36 C80 22 72 8 50 8 Z" fill="#1C3F94" />
      {/* White Silhouette figure with arms open */}
      <circle cx="50" cy="28" r="4.5" fill="#FFFFFF" />
      <path d="M50 35 C42 41 36 43 32 56 H68 C64 43 58 41 50 35 Z" fill="#FFFFFF" />
      <path d="M30 38 Q 40 32 46 36 M70 38 Q 60 32 54 36" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arch Curves */}
      <path d="M28 68 C35 50 44 42 50 40 M72 68 C65 50 56 42 50 40" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
      {/* Pink LIFE Text */}
      <text x="50" y="88" textAnchor="middle" fill="#C42582" fontWeight="900" fontSize="21" fontFamily="serif" letterSpacing="0.5">
        LIFE®
      </text>
    </svg>
  </div>
);

// 3. Doctor Nutrition (DNP) Square Logo Icon
export const DoctorNutritionSquareLogo: React.FC<CompanyLogoProps> = ({ className = 'w-12 h-12' }) => (
  <div className={`bg-[#0A0A0C] border border-slate-800 shadow-2xs rounded-xl flex items-center justify-center p-1 shrink-0 select-none overflow-hidden ${className}`}>
    <svg viewBox="0 0 110 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* DNP Purple stylized lowercase letters */}
      <text x="8" y="68" fill="#8B2FC9" fontWeight="900" fontSize="56" fontFamily="sans-serif" letterSpacing="-2">
        d
      </text>
      <text x="38" y="68" fill="#8B2FC9" fontWeight="900" fontSize="56" fontFamily="sans-serif" letterSpacing="-2">
        n
      </text>
      <text x="68" y="68" fill="#8B2FC9" fontWeight="900" fontSize="56" fontFamily="sans-serif" letterSpacing="-2">
        p
      </text>
      {/* Green Leaf cutting across diagonally */}
      <path
        d="M26 62 C 45 38, 68 22, 88 16 C 75 35, 55 58, 38 68 Z"
        fill="#78BE20"
      />
      <path
        d="M30 58 Q 58 35 82 20"
        stroke="#5A9614"
        strokeWidth="1.8"
        fill="none"
      />
    </svg>
  </div>
);

// 4. iHerb Square Logo Icon
export const IherbSquareLogo: React.FC<CompanyLogoProps> = ({ className = 'w-12 h-12' }) => (
  <div className={`bg-[#458500] border border-emerald-700 shadow-2xs rounded-xl flex items-center justify-center p-1 shrink-0 select-none overflow-hidden ${className}`}>
    <div className="flex items-center justify-center font-black tracking-tight text-white text-sm md:text-base font-sans">
      <span className="text-white font-extrabold text-xs mr-0.5">🌿</span>
      <span className="font-black text-white text-[13px] md:text-[15px]">iHerb</span>
    </div>
  </div>
);

// Introduction Logo Bar displaying all 3 in required order: GNC -> Life Pharmacy -> Doctor Nutrition
export const IntroductionLogosBar: React.FC = () => {
  return (
    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 mb-5 shadow-2xs">
      <div className="text-[11px] font-extrabold text-slate-500 mb-2.5 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse"></span>
        <span>فروشگاه‌های معتبر طرف قرارداد جهت استخراج و خرید مستقیم:</span>
      </div>

      {/* Small square icons in strict requested order: 1) GNC 2) Life Pharmacy 3) Doctor Nutrition */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* 1. GNC */}
        <div className="bg-white border border-slate-200 hover:border-purple-300 rounded-xl p-2 flex items-center gap-2 transition shadow-2xs group">
          <GncSquareLogo className="w-9 h-9 md:w-10 md:h-10" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold block leading-none">۱. اولویت اول</span>
            <span className="font-extrabold text-xs text-slate-900 truncate block mt-0.5 group-hover:text-[#7C3AED] transition">
              GNC UAE
            </span>
          </div>
        </div>

        {/* 2. Life Pharmacy */}
        <div className="bg-white border border-slate-200 hover:border-purple-300 rounded-xl p-2 flex items-center gap-2 transition shadow-2xs group">
          <LifePharmacySquareLogo className="w-9 h-9 md:w-10 md:h-10" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold block leading-none">۲. اولویت دوم</span>
            <span className="font-extrabold text-xs text-slate-900 truncate block mt-0.5 group-hover:text-[#7C3AED] transition">
              Life Pharmacy
            </span>
          </div>
        </div>

        {/* 3. Doctor Nutrition */}
        <div className="bg-white border border-slate-200 hover:border-purple-300 rounded-xl p-2 flex items-center gap-2 transition shadow-2xs group">
          <DoctorNutritionSquareLogo className="w-9 h-9 md:w-10 md:h-10" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold block leading-none">۳. اولویت سوم</span>
            <span className="font-extrabold text-xs text-slate-900 truncate block mt-0.5 group-hover:text-[#7C3AED] transition">
              Doctor Nutrition
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
