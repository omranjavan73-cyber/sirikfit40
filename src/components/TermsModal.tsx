import React from 'react';
import { X, ShieldCheck, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import type { CmsConfig, LandingContentSettings, TermItem } from '../types';
import { DEFAULT_LANDING_CONTENT } from '../types';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cms?: CmsConfig | null;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, cms }) => {
  if (!isOpen) return null;

  const landing: LandingContentSettings = {
    ...DEFAULT_LANDING_CONTENT,
    ...(cms?.landingContent || {})
  };

  const title = landing.termsTitle || DEFAULT_LANDING_CONTENT.termsTitle;
  const subtitle = landing.termsSubtitle || DEFAULT_LANDING_CONTENT.termsSubtitle;
  const termsList: TermItem[] = (landing.termsList && landing.termsList.length > 0)
    ? landing.termsList
    : DEFAULT_LANDING_CONTENT.termsList;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-['Vazirmatn',sans-serif] dir-rtl animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900">{title}</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition shadow-2xs cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal Body - Scrollable Terms List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-right">
          {termsList.map((item, idx) => (
            <div
              key={item.id || idx}
              className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 transition-all hover:border-slate-800"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <h4 className="font-black text-sm sm:text-base text-slate-900">
                  {item.title}
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pr-8 font-normal">
                {item.description}
              </p>
            </div>
          ))}

          {/* Verification & Trust Note */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-emerald-900 text-xs font-semibold leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              هدف سیریک فیت ایجاد بستری امن، شفاف و بدون واسطه برای تهیه مکمل‌های اورجینال از نمایندگی‌های دبی می‌باشد. در صورت هرگونه سوال یا نیاز به پشتیبانی، تیم پشتیبانی ما آماده پاسخگویی است.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-[#F8FAFC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-black rounded-xl transition shadow-xs cursor-pointer"
          >
            متوجه شدم و قبول دارم
          </button>
        </div>
      </div>
    </div>
  );
};
