import React from 'react';
import { ShieldCheck, CheckCircle2, Sparkles, Building2 } from 'lucide-react';
import type { CmsConfig, LandingContentSettings } from '../types';
import { DEFAULT_LANDING_CONTENT } from '../types';

interface AboutUsSectionProps {
  cms?: CmsConfig | null;
}

export const AboutUsSection: React.FC<AboutUsSectionProps> = ({ cms }) => {
  const landing: LandingContentSettings = {
    ...DEFAULT_LANDING_CONTENT,
    ...(cms?.landingContent || {})
  };

  if (!landing.showAboutUs) return null;

  const title = landing.aboutUsTitle || DEFAULT_LANDING_CONTENT.aboutUsTitle;
  const subtitle = landing.aboutUsSubtitle || DEFAULT_LANDING_CONTENT.aboutUsSubtitle;
  const description = landing.aboutUsDescription || DEFAULT_LANDING_CONTENT.aboutUsDescription;
  const badge = landing.aboutUsBadge || DEFAULT_LANDING_CONTENT.aboutUsBadge;

  const highlights = [
    landing.aboutUsHighlight1 || DEFAULT_LANDING_CONTENT.aboutUsHighlight1,
    landing.aboutUsHighlight2 || DEFAULT_LANDING_CONTENT.aboutUsHighlight2,
    landing.aboutUsHighlight3 || DEFAULT_LANDING_CONTENT.aboutUsHighlight3,
    landing.aboutUsHighlight4 || DEFAULT_LANDING_CONTENT.aboutUsHighlight4,
  ].filter(Boolean) as string[];

  return (
    <section
      id="about-us-section"
      className="w-full bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs font-['Vazirmatn',sans-serif] scroll-mt-20 transition-all"
    >
      {/* Header Pill & Title */}
      <div className="flex flex-col items-start gap-2 border-b border-slate-100 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-extrabold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{badge}</span>
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
          <span>{title}</span>
        </h2>

        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {/* Main Narrative Description */}
      <div className="mt-5 text-slate-700 leading-relaxed text-xs sm:text-sm md:text-base font-normal text-justify bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 sm:p-5">
        <p>{description}</p>
      </div>

      {/* 4 Feature Highlights Grid */}
      {highlights.length > 0 && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {highlights.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 bg-white border border-slate-200/90 hover:border-slate-800 hover:shadow-xs rounded-2xl p-3.5 sm:p-4 transition-all duration-200"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-xs sm:text-sm text-slate-800 font-semibold leading-snug">
                {item}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-slate-100">
          <span className="block text-base sm:text-xl font-black text-slate-900">۱۰۰٪</span>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">ضمانت اصالت فیزیکی</span>
        </div>
        <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-slate-100">
          <span className="block text-base sm:text-xl font-black text-slate-900">۵ تا ۱۰ روز</span>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">تحویل سریع کارگو</span>
        </div>
        <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-slate-100">
          <span className="block text-base sm:text-xl font-black text-slate-900">نرخ زنده</span>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">محاسبه بدون واسطه</span>
        </div>
        <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-slate-100">
          <span className="block text-base sm:text-xl font-black text-slate-900">۲۴/۷</span>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">پشتیبانی و پیگیری</span>
        </div>
      </div>
    </section>
  );
};
