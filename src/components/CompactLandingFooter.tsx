import React from 'react';
import type { LandingSettings } from '../types';
import { defaultLandingSettings } from '../types';

interface CompactLandingFooterProps {
  settings?: LandingSettings | null;
  onOpenAbout?: () => void;
  onOpenBenefits?: () => void;
  onOpenContact?: () => void;
  onOpenRules?: () => void;
  onOpenFaq?: () => void;
  onOpenTerms?: () => void;
}

export const CompactLandingFooter: React.FC<CompactLandingFooterProps> = ({
  settings: customSettings,
  onOpenAbout,
  onOpenBenefits,
  onOpenContact,
  onOpenRules,
  onOpenFaq,
  onOpenTerms
}) => {
  const settings: LandingSettings = {
    ...defaultLandingSettings,
    ...(customSettings || {})
  };

  const telegramUser = (settings.telegramId || '@SIRIK_FIT_Support').replace('@', '').replace('https://t.me/', '');

  return (
    <footer className="w-full bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pt-8 pb-24 px-3 sm:px-4 text-right transition-colors font-['Vazirmatn',sans-serif]" dir="rtl">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* 3-Column Compact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/90 dark:bg-gray-900/60 p-5 sm:p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
          
          {/* Col 1: About & Brand Summary */}
          {settings.showAbout && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  SF
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black text-gray-950 dark:text-white truncate">{settings.brandName || 'سیریک فیت | SIRIK FIT'}</span>
                  <span className="text-[11px] font-bold text-red-600 truncate">{settings.brandSubtitle || 'تأمین و واردات مستقیم مکمل از دبی'}</span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
                {settings.aboutText || 'سیریک فیت (SIRIK FIT) مرجع تخصصی تأمین و واردات مستقیم مکمل‌های ورزشی و غذایی اورجینال از معتبرترین برندهای جهانی و نمایندگی‌های امارات متحده عربی است.'}
              </p>
              <div className="flex items-center gap-2 mt-auto pt-2 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 flex-wrap">
                <span>✓ تضمین اصالت ۱۰۰٪</span>
                <span>•</span>
                <span>ارسال مستقیم از دبی</span>
              </div>
            </div>
          )}

          {/* Col 2: Quick Links & Modal Launchers */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black text-gray-950 dark:text-white border-r-2 border-red-600 pr-2">
              دسترسی سریع و بخش‌ها
            </span>
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
              {settings.showAbout && (
                <button
                  type="button"
                  onClick={onOpenAbout || (() => {
                    const el = document.getElementById('about-us-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  })}
                  className="text-right hover:text-red-600 transition-colors cursor-pointer py-0.5"
                >
                  ✦ درباره سیریک فیت
                </button>
              )}
              {settings.showBenefits && (
                <button
                  type="button"
                  onClick={onOpenBenefits || (() => {
                    const el = document.getElementById('services-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  })}
                  className="text-right hover:text-red-600 transition-colors cursor-pointer py-0.5"
                >
                  ✦ خدمات و مزایای خرید
                </button>
              )}
              {settings.showContact && (
                <button
                  type="button"
                  onClick={onOpenContact || (() => {
                    const el = document.getElementById('contact-support-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  })}
                  className="text-right hover:text-red-600 transition-colors cursor-pointer py-0.5"
                >
                  ✦ اطلاعات تماس و پشتیبانی
                </button>
              )}
              {settings.showRules && (
                <button
                  type="button"
                  onClick={onOpenRules || onOpenTerms || (() => {
                    const el = document.getElementById('terms-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  })}
                  className="text-right hover:text-red-600 transition-colors cursor-pointer py-0.5"
                >
                  ✦ قوانین و مقررات خرید
                </button>
              )}
              {settings.showFaq && (
                <button
                  type="button"
                  onClick={onOpenFaq || (() => {
                    window.location.hash = '#faq';
                  })}
                  className="text-right hover:text-red-600 transition-colors cursor-pointer py-0.5"
                >
                  ✦ سوالات متداول (FAQ)
                </button>
              )}
            </div>
          </div>

          {/* Col 3: Direct Support Channels */}
          {settings.showContact && (
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-black text-gray-950 dark:text-white border-r-2 border-red-600 pr-2">
                راه‌های ارتباط و پشتیبانی
              </span>
              <div className="flex flex-col gap-2">
                {/* Telegram */}
                <a
                  href={`https://t.me/${telegramUser}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sky-400 transition-all text-xs font-bold shadow-2xs group"
                >
                  <span className="text-gray-800 dark:text-gray-200 dir-ltr group-hover:text-sky-600 transition-colors">@{telegramUser}</span>
                  <span className="text-[11px] text-sky-600 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md font-extrabold">تلگرام آنلاین</span>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${settings.supportEmail || 'info@sirikfit.ir'}`}
                  className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 transition-all text-xs font-bold shadow-2xs group"
                >
                  <span className="text-gray-800 dark:text-gray-200 dir-ltr group-hover:text-red-600 transition-colors">{settings.supportEmail || 'info@sirikfit.ir'}</span>
                  <span className="text-[11px] text-gray-500 font-extrabold">ایمیل رسمی</span>
                </a>

                {/* Phone */}
                <a
                  href={`tel:${settings.supportPhone || '02191000000'}`}
                  className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-400 transition-all text-xs font-bold shadow-2xs group"
                >
                  <span className="text-gray-800 dark:text-gray-200 dir-ltr group-hover:text-emerald-600 transition-colors">{settings.supportPhone || '021-91000000'}</span>
                  <span className="text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md font-extrabold">تماس تلفنی</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Optional Trust Badges Container */}
        {settings.showTrustBadges && (
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50/60 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-800 gap-2 text-center">
            <span className="text-xs font-bold text-gray-500">نمادهای اعتماد و مجوزهای رسمی</span>
            <div className="flex items-center justify-center gap-4 text-xs font-semibold text-gray-400 flex-wrap">
              <span>🛡️ اصالت تضمین‌شده کالا</span>
              <span>•</span>
              <span>🔒 پرداخت امن و مطمئن</span>
              <span>•</span>
              <span>📦 ترخیص و تحویل مستقیم</span>
            </div>
          </div>
        )}

      </div>
    </footer>
  );
};
