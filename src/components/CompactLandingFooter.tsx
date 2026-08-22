import React, { useState, useEffect } from 'react';
import type { LandingSettings } from '../types';
import { defaultLandingSettings } from '../types';
import { getLandingSettings } from '../services/settingsService';
import { AboutModal, BenefitsModal, ContactModal, RulesModal, FaqModal } from './LandingModals';
import { ENamadBadge } from './ENamadBadge';

interface FooterProps {
  settings?: LandingSettings | null;
}

export const CompactLandingFooter: React.FC<FooterProps> = ({ settings: customSettings }) => {
  const [activeModal, setActiveModal] = useState<'about' | 'benefits' | 'contact' | 'rules' | 'faq' | null>(null);
  const [currentSettings, setCurrentSettings] = useState<LandingSettings>(() => ({
    ...defaultLandingSettings,
    ...(customSettings || {})
  }));

  // Sync settings when customSettings changes or on mount
  useEffect(() => {
    if (customSettings) {
      setCurrentSettings(prev => ({ ...prev, ...customSettings }));
    } else {
      getLandingSettings().then((fetched) => {
        if (fetched) setCurrentSettings(fetched);
      });
    }
  }, [customSettings]);

  // Listen for real-time landing settings updates
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e?.detail) {
        setCurrentSettings(e.detail);
      }
    };
    window.addEventListener('landingSettingsUpdated', handleUpdate);
    return () => window.removeEventListener('landingSettingsUpdated', handleUpdate);
  }, []);

  const settings = currentSettings;
  const telegramUser = (settings.telegramId || 'SIRIK_FIT_Support').replace('@', '').replace('https://t.me/', '');

  return (
    <>
      <footer id="compact-landing-footer" className="w-full !bg-white border-t border-gray-200 pt-8 pb-24 px-3 sm:px-4 text-right font-['Vazirmatn',sans-serif]" dir="rtl">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">

          {/* 3-Column Clean Pure-White / Light-Gray Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 !bg-[#f8fafc] p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs">
            
            {/* Col 1: Brand & About Summary */}
            {settings.showAbout && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    SF
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-gray-950 truncate">
                      {settings.brandName || 'سیریک فیت | SIRIK FIT'}
                    </span>
                    <span className="text-[11px] font-bold text-red-600 truncate">
                      {settings.brandSubtitle || 'تأمین و واردات مستقیم مکمل از دبی'}
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-gray-600 font-medium">
                  {settings.aboutText || 'سیریک فیت (SIRIK FIT) مرجع تخصصی تأمین و واردات مستقیم مکمل‌های ورزشی و غذایی اورجینال از معتبرترین برندهای جهانی و نمایندگی‌های امارات متحده عربی است.'}
                </p>
                <div className="flex items-center gap-2 mt-auto pt-2 text-[11px] font-extrabold text-emerald-600 flex-wrap">
                  <span>✓ تضمین ۱۰۰٪ اصالت کالا</span>
                  <span>•</span>
                  <span>ارسال مستقیم و پلمپ دبی</span>
                </div>
              </div>
            )}

            {/* Col 2: Quick Links & Dedicated Modals */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-black text-gray-950 border-r-2 border-red-600 pr-2">
                دسترسی سریع و بخش‌ها
              </span>
              <div className="flex flex-col gap-2 text-xs font-bold text-gray-700">
                {settings.showAbout && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('about')}
                    className="text-right text-gray-700 hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <span className="text-red-500">✦</span> درباره سیریک فیت
                  </button>
                )}
                {settings.showBenefits && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('benefits')}
                    className="text-right text-gray-700 hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <span className="text-red-500">✦</span> خدمات و مزایای خرید
                  </button>
                )}
                {settings.showContact && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('contact')}
                    className="text-right text-gray-700 hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <span className="text-red-500">✦</span> اطلاعات تماس و پشتیبانی
                  </button>
                )}
                {settings.showRules && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('rules')}
                    className="text-right text-gray-700 hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <span className="text-red-500">✦</span> قوانین و مقررات خرید
                  </button>
                )}
                {settings.showFaq && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('faq')}
                    className="text-right text-gray-700 hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <span className="text-red-500">✦</span> سوالات متداول (FAQ)
                  </button>
                )}
              </div>
            </div>

            {/* Col 3: Direct Contact Channels */}
            {settings.showContact && (
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-black text-gray-950 border-r-2 border-red-600 pr-2">
                  راه‌های ارتباط و پشتیبانی
                </span>
                <div className="flex flex-col gap-2">
                  {/* Telegram */}
                  {settings.showTelegram !== false && (
                    <a
                      href={`https://t.me/${telegramUser}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 !bg-white rounded-xl border border-gray-200 hover:border-sky-400 transition-all text-xs font-bold shadow-2xs group"
                    >
                      <span className="text-gray-900 dir-ltr group-hover:text-sky-600 transition-colors">@{telegramUser}</span>
                      <span className="text-[11px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md font-extrabold">{settings.telegramActionText || 'تلگرام آنلاین'}</span>
                    </a>
                  )}

                  {/* Email */}
                  {settings.showEmail !== false && (
                    <a
                      href={`mailto:${settings.supportEmail || 'info@sirikfit.ir'}`}
                      className="flex items-center justify-between p-2.5 !bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-all text-xs font-bold shadow-2xs group"
                    >
                      <span className="text-gray-900 dir-ltr group-hover:text-red-600 transition-colors">{settings.supportEmail || 'info@sirikfit.ir'}</span>
                      <span className="text-[11px] text-gray-500 font-extrabold">{settings.emailActionText || 'ایمیل پشتیبانی'}</span>
                    </a>
                  )}

                  {/* Phone */}
                  {settings.showPhone !== false && (
                    <a
                      href={`tel:${settings.supportPhone || '02191000000'}`}
                      className="flex items-center justify-between p-2.5 !bg-white rounded-xl border border-gray-200 hover:border-emerald-400 transition-all text-xs font-bold shadow-2xs group"
                    >
                      <span className="text-gray-900 dir-ltr group-hover:text-emerald-600 transition-colors">{settings.supportPhone || '021-91000000'}</span>
                      <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-extrabold">{settings.phoneActionText || 'تماس تلفنی'}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Clean Permanent Enamad Container */}
          {settings.showTrustBadges && settings.showEnamad !== false && (
            <div className="flex flex-col items-center justify-center p-5 !bg-gray-50 rounded-3xl border border-gray-200 gap-2 mt-2">
              <span className="text-xs font-black text-gray-900">
                نماد اعتماد الکترونیکی
              </span>

              <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-center min-h-[90px] min-w-[90px]">
                <a
                  referrerPolicy="origin"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://trustseal.enamad.ir/?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8"
                >
                  <img
                    referrerPolicy="origin"
                    src="https://trustseal.enamad.ir/logo.aspx?id=7355626&Code=jj9HCtmWurzgveMEKQyc6iOcMamK4RG8"
                    alt="نماد تجارت الکترونیکی اینماد"
                    className="cursor-pointer max-h-20 w-auto object-contain hover:scale-105 transition-transform"
                  />
                </a>
              </div>
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
