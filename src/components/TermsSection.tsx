import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import type { CmsConfig, LandingContentSettings, TermItem } from '../types';
import { DEFAULT_LANDING_CONTENT } from '../types';

interface TermsSectionProps {
  cms?: CmsConfig | null;
}

export const TermsSection: React.FC<TermsSectionProps> = ({ cms }) => {
  const landing: LandingContentSettings = {
    ...DEFAULT_LANDING_CONTENT,
    ...(cms?.landingContent || {})
  };

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!landing.showTerms) return null;

  const title = landing.termsTitle || DEFAULT_LANDING_CONTENT.termsTitle;
  const subtitle = landing.termsSubtitle || DEFAULT_LANDING_CONTENT.termsSubtitle;
  const termsList: TermItem[] = (landing.termsList && landing.termsList.length > 0)
    ? landing.termsList
    : DEFAULT_LANDING_CONTENT.termsList;

  const toggleExpand = (idx: number) => {
    setExpandedIndex(prev => prev === idx ? null : idx);
  };

  return (
    <section
      id="terms-section"
      className="w-full bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs font-['Vazirmatn',sans-serif] scroll-mt-20 transition-all space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col items-start gap-2 border-b border-slate-100 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-extrabold">
          <FileText className="w-3.5 h-3.5 text-slate-900" />
          <span>شفافیت و قوانین خرید</span>
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>

        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {/* Accordion / List */}
      <div className="space-y-3">
        {termsList.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <div
              key={item.id || idx}
              className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                isExpanded ? 'border-slate-800 bg-[#F8FAFC]' : 'border-slate-200/90 bg-white hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleExpand(idx)}
                className="w-full p-4 sm:p-4.5 flex items-center justify-between gap-3 text-right cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <h4 className="font-black text-xs sm:text-sm md:text-base text-slate-900">
                    {item.title}
                  </h4>
                </div>

                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 sm:px-4.5 sm:pb-4.5 pt-0 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal border-t border-slate-200/60 mt-1">
                  <p className="pt-3 pr-9">{item.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
