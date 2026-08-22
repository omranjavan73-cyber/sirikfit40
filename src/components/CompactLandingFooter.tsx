import React, { useState } from 'react';
import type { LandingSettings } from '../types';
import { defaultLandingSettings } from '../types';
import { AboutModal, BenefitsModal, ContactModal, RulesModal, FaqModal } from './LandingModals';

interface FooterProps {
  settings?: LandingSettings | null;
}

export const CompactLandingFooter: React.FC<FooterProps> = ({ settings: customSettings }) => {
  const [activeModal, setActiveModal] = useState<'about' | 'benefits' | 'contact' | 'rules' | 'faq' | null>(null);

  const settings: LandingSettings = {
    ...defaultLandingSettings,
    ...(customSettings || {})
  };

  const telegramUser = (settings.telegramId || 'SIRIK_FIT_Support').replace('@', '').replace('https://t.me/', '');

  return (
    <>
      <footer id="compact-landing-footer" className="w-full bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pt-8 pb-24 px-3 sm:px-4 text-right transition-colors font-['Vazirmatn',sans-serif]" dir="rtl">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">

          {/* 3-Column Clean Light Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 dark:bg-gray-900/60 p-5 sm:p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
            
            {/* Col 1: Brand & About Summary */}
            {settings.showAbout && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    SF
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-gray-950 dark:text-white truncate">
                      {settings.brandName || 'سیریک فیت | SIRIK FIT'}
                    </span>
                    <span className="text-[11px] font-bold text-red-600 truncate">
                      {settings.brandSubtitle || 'تأمین و واردات مستقیم مکمل از دبی'}
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
                  {settings.aboutText || 'سیریک فیت (SIRIK FIT) مرجع تخصصی تأمین و واردات مستقیم مکمل‌های ورزشی و غذایی اورجینال از معتبرترین برندهای جهانی و نمایندگی‌های امارات متحده عربی است.'}
                </p>
                <div className="flex items-center gap-2 mt-auto pt-2 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 flex-wrap">
                  <span>✓ تضمین ۱۰۰٪ اصالت کالا</span>
                  <span>•</span>
                  <span>ارسال مستقیم و پلمپ دبی</span>
                </div>
              </div>
            )}

            {/* Col 2: Quick Links & Dedicated Modals */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-black text-gray-950 dark:text-white border-r-2 border-red-600 pr-2">
                دسترسی سریع و بخش‌ها
              </span>
              <div className="flex flex-col gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                {settings.showAbout && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('about')}
                    className="text-right hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <span className="text-red-500">✦</span> درباره سیریک فیت
                  </button>
                )}
                {settings.showBenefits && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('benefits')}
                    className="text-right hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <span className="text-red-500">✦</span> خدمات و مزایای خرید
                  </button>
                )}
                {settings.showContact && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('contact')}
                    className="text-right hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <span className="text-red-500">✦</span> اطلاعات تماس و پشتیبانی
                  </button>
                )}
                {settings.showRules && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('rules')}
                    className="text-right hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <span className="text-red-500">✦</span> قوانین و مقررات خرید
                  </button>
                )}
                {settings.showFaq && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('faq')}
                    className="text-right hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <span className="text-red-500">✦</span> سوالات متداول (FAQ)
                  </button>
                )}
              </div>
            </div>

            {/* Col 3: Direct Contact Channels */}
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

          {/* Clean Trust Badges & Official Enamad Container */}
          {settings.showTrustBadges && (
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900/60 rounded-3xl border border-gray-200 dark:border-gray-800 gap-4">
              <span className="text-xs font-black text-gray-900 dark:text-white">
                نمادهای اعتماد و مجوزهای رسمی
              </span>

              {/* Minimal Trust Highlights */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  اصالت تضمین‌شده کالا
                </span>
                <span className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  پرداخت امن بانکی
                </span>
                <span className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  ترخیص و ارسال مستقیم از دبی
                </span>
              </div>

              {/* Official Enamad Badge */}
              <div 
                className="p-3 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-center min-h-[90px] min-w-[90px]"
                dangerouslySetInnerHTML={{ __html: settings.enamadCode || '<a referrerpolicy=\'origin\' target=\'_blank\' href=\'https://trustseal.enamad.ir/?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8\'><img referrerpolicy=\'origin\' src=\'https://trustseal.enamad.ir/logo.aspx?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8\' alt=\'نماد اعتماد الکترونیکی\' style=\'cursor:pointer\' code=\'jj9HCtmWurzgveMEKQyc6iOcMamK4RG8\'></a>' }}
              />
            </div>
          )}

        </div>
      </footer>

      {/* Modals for Each Specific Topic */}
      {activeModal === 'about' && <AboutModal onClose={() => setActiveModal(null)} settings={settings} />}
      {activeModal === 'benefits' && <BenefitsModal onClose={() => setActiveModal(null)} settings={settings} />}
      {activeModal === 'contact' && <ContactModal onClose={() => setActiveModal(null)} settings={settings} />}
      {activeModal === 'rules' && <RulesModal onClose={() => setActiveModal(null)} settings={settings} />}
      {activeModal === 'faq' && <FaqModal onClose={() => setActiveModal(null)} settings={settings} />}
    </>
  );
};
