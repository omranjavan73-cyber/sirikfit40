import React, { useState, useEffect } from 'react';
import { Send, Mail, Phone } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
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
  const [currentSettings, setCurrentSettings] = useState<LandingSettings>(() => {
    if (customSettings) return { ...defaultLandingSettings, ...customSettings };
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_landing_settings');
        if (cached) return { ...defaultLandingSettings, ...JSON.parse(cached) };
      } catch (_) {}
    }
    return defaultLandingSettings;
  });

  // Direct real-time Firestore onSnapshot subscription
  useEffect(() => {
    let unsubscribeLanding: (() => void) | null = null;

    if (db) {
      // Listen strictly to settings/landing
      try {
        unsubscribeLanding = onSnapshot(doc(db, 'settings', 'landing'), (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Partial<LandingSettings>;
            if (data) {
              setCurrentSettings(prev => ({ ...prev, ...data }));
              try {
                localStorage.setItem('sirikfit_landing_settings', JSON.stringify(data));
              } catch (_) {}
            }
          }
        });
      } catch (err) {
        console.error('Error listening to settings/landing:', err);
      }
    } else {
      getLandingSettings().then((fetched) => {
        if (fetched) setCurrentSettings(fetched);
      });
    }

    // Local custom event listener
    const handleUpdate = (e: any) => {
      if (e?.detail) {
        setCurrentSettings(prev => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('landingSettingsUpdated', handleUpdate);

    return () => {
      if (unsubscribeLanding) unsubscribeLanding();
      window.removeEventListener('landingSettingsUpdated', handleUpdate);
    };
  }, []);

  // Update when prop changes
  useEffect(() => {
    if (customSettings) {
      setCurrentSettings(prev => ({ ...prev, ...customSettings }));
    }
  }, [customSettings]);

  const settings = currentSettings;
  const rawTg = settings.telegramId || '';
  const telegramUser = rawTg.replace('@', '').replace('https://t.me/', '');

  return (
    <>
      <footer id="compact-landing-footer" className="w-full !bg-white border-t border-gray-200 pt-8 pb-24 px-3 sm:px-4 text-right font-['Vazirmatn',sans-serif]" dir="rtl">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">

          {/* 3-Column Clean Pure-White / Light-Gray Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 !bg-[#f8fafc] p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-xs">
            
            {/* Col 1: Brand & About Summary */}
            {settings.showAbout && (
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black text-gray-950 truncate">
                    {settings.brandName}
                  </span>
                  {settings.brandSubtitle && (
                    <span className="text-[11px] font-bold text-red-600 truncate mt-0.5">
                      {settings.brandSubtitle}
                    </span>
                  )}
                </div>
                {settings.aboutText && (
                  <p className="text-xs leading-relaxed text-gray-600 font-medium">
                    {settings.aboutText}
                  </p>
                )}
                {settings.deliveryGuaranteeBadge && (
                  <div className="flex items-center gap-2 mt-auto pt-2 text-[11px] font-extrabold text-emerald-600 flex-wrap">
                    <span>✓ {settings.deliveryGuaranteeBadge}</span>
                  </div>
                )}
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
                    <span className="text-red-500">✦</span> درباره {settings.brandName || 'سیریک فیت'}
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

            {/* Col 3: Direct Contact Channels - Matching Modal Style */}
            {settings.showContact !== false && (
              <div className="flex flex-col gap-2.5 w-full">
                <span className="text-xs font-black text-gray-950 border-r-2 border-red-600 pr-2">
                  راههای ارتباط و پشتیبانی
                </span>

                <div className="flex flex-col gap-2 w-full">
                  {/* 1. Telegram Card */}
                  {settings.showTelegram !== false && (
                    <a
                      href={`https://t.me/${(settings.telegramId || '').replace('@', '').replace('https://t.me/', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-200 hover:border-sky-400 shadow-xs transition-all gap-2 w-full"
                    >
                      {/* Action Badge (Left) */}
                      <span className="shrink-0 bg-sky-500 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-xs">
                        {settings.telegramActionText || 'چت آنلاین'}
                      </span>

                      {/* Info Text (Center) */}
                      <div className="flex-1 flex flex-col text-right min-w-0 pr-1">
                        <span className="text-xs font-black text-gray-900 truncate">
                          تلگرام پشتیبانی و سفارش
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium truncate dir-ltr text-right">
                          {settings.telegramId || 'پاسخگویی سریع'}
                        </span>
                      </div>

                      {/* Icon (Right) */}
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                        </svg>
                      </div>
                    </a>
                  )}

                  {/* 2. Official Email Card */}
                  {settings.showEmail !== false && (
                    <a
                      href={`mailto:${settings.supportEmail || 'info@sirikfit.ir'}`}
                      className="flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-200 hover:border-red-400 shadow-xs transition-all gap-2 w-full"
                    >
                      {/* Action Badge (Left) */}
                      <span className="shrink-0 bg-gray-100 text-gray-700 text-[10px] font-black px-2.5 py-1 rounded-xl">
                        {settings.emailActionText || 'ارسال ایمیل'}
                      </span>

                      {/* Info Text (Center) */}
                      <div className="flex-1 flex flex-col text-right min-w-0 pr-1">
                        <span className="text-xs font-black text-gray-900 truncate">
                          ایمیل رسمی پشتیبانی
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium truncate dir-ltr text-right">
                          {settings.supportEmail || 'info@sirikfit.ir'}
                        </span>
                      </div>

                      {/* Icon (Right) */}
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                        <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </div>
                    </a>
                  )}

                  {/* 3. Phone Support Card */}
                  {settings.showPhone !== false && (
                    <a
                      href={`tel:${settings.supportPhone || '09174670046'}`}
                      className="flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-200 hover:border-emerald-400 shadow-xs transition-all gap-2 w-full"
                    >
                      {/* Action Badge (Left) */}
                      <span className="shrink-0 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-xs">
                        {settings.phoneActionText || 'تماس تلفنی'}
                      </span>

                      {/* Info Text (Center) */}
                      <div className="flex-1 flex flex-col text-right min-w-0 pr-1">
                        <span className="text-xs font-black text-gray-900 truncate">
                          شماره تماس پشتیبانی
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold truncate dir-ltr text-right">
                          {settings.supportPhone || '09174670046'}
                        </span>
                      </div>

                      {/* Icon (Right) */}
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                        </svg>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Pure White Official eNAMAD Container */}
          {settings.showEnamad !== false && (
            <div className="w-full flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-200 shadow-xs gap-2 mt-4 text-center" dir="rtl">
              <span className="text-xs font-black text-gray-950">
                نماد اعتماد الکترونیکی (اینماد)
              </span>
              <p className="text-[11px] text-gray-500 max-w-sm mb-2">
                دارای مجوز رسمی از مرکز توسعه تجارت الکترونیکی (جهت استعلام کلیک کنید)
              </p>

              {/* Dynamic Official eNAMAD Badge */}
              <ENamadBadge />
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
