import React from 'react';
import { Mail, PhoneCall, ShieldCheck, Truck, Clock, HelpCircle, ArrowLeft } from 'lucide-react';
import { SupportHeadsetLogo } from './common/SupportHeadsetLogo';
import type { CmsConfig } from '../types';

interface SupportSectionProps {
  cms?: CmsConfig | null;
  onOpenFAQ?: () => void;
}

const TelegramIcon = () => (
  <svg className="w-5 h-5 text-[#0088cc] fill-current" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-2.02 9.52c-.15.68-.55.84-1.12.52l-3.1-2.29-1.5 1.44c-.17.17-.31.31-.63.31l.22-3.17 5.77-5.21c.25-.22-.05-.34-.39-.12l-7.14 4.5-3.07-.96c-.67-.21-.68-.67.14-.99l12.01-4.63c.56-.21 1.05.13.83.98z"/>
  </svg>
);

const formatTelegramUrl = (rawLink?: string, handle?: string) => {
  const val = rawLink || handle || '@SIRIK_FIT_Support';
  const trimmed = val.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const clean = trimmed.replace('@', '');
  return `https://t.me/${clean}`;
};

export const SupportSection: React.FC<SupportSectionProps> = ({ cms, onOpenFAQ }) => {
  const home = cms?.homeContent;
  const showSupport = cms?.features?.showSupportSection ?? home?.showSupportSection ?? cms?.showSupportSection ?? true;

  if (!showSupport) return null;

  const supportHeadline = home?.supportHeadline || 'پشتیبانی و مشاوره تخصصی واردات دبی';
  const supportSubtitle = home?.supportSubtitle || 'پاسخگویی ۲۴ ساعته توسط کارشناسان تغذیه و لاجستیک';
  const showTelegramCard = home?.showTelegramCard ?? true;
  const telegramTitle = home?.telegramTitle || 'ارتباط با پشتیبانی در تلگرام';
  const telegramHandle = home?.telegramHandle || '@SIRIK_FIT_Support';
  const telegramLink = formatTelegramUrl(home?.telegramLink, telegramHandle);
  
  const showEmailCard = home?.showEmailCard ?? true;
  const emailTitle = home?.emailTitle || 'ارتباط از طریق ایمیل پشتیبانی';
  const emailAddress = home?.adminDestinationEmail || cms?.apiConfig?.adminDestinationEmail || 'omran.javan73@gmail.com';

  const showPhoneCard = home?.showPhoneCard ?? true;
  const phoneTitle = home?.phoneTitle || 'تلفن پشتیبانی';
  const officePhone = home?.officePhone || '021-91000000';

  const showFaqSection = (cms?.features?.showFaqSection ?? cms?.showFaqSection) !== false;

  const trustBadge1 = home?.trustBadge1 || 'اصالت ۱۰۰٪ کالا';
  const trustBadge2 = home?.trustBadge2 || 'حمل ایمن کارگو';
  const trustBadge3 = home?.trustBadge3 || 'تحویل ۵ تا ۷ روزه';

  const enabledCardsCount = (showTelegramCard ? 1 : 0) + (showEmailCard ? 1 : 0) + (showPhoneCard ? 1 : 0);

  return (
    <div id="support-section" className="space-y-3 font-['Vazirmatn',sans-serif]">
      {/* Support Hero Header - Solid Black Card */}
      <div className="bg-[#111111] text-white rounded-[18px] p-4.5 flex items-center justify-between gap-3 shadow-2xs">
        <div className="text-right flex-1">
          <h3 id="support-headline" className="font-extrabold text-sm md:text-base text-white">{supportHeadline}</h3>
          <p id="support-subtitle" className="text-[11px] md:text-xs text-neutral-300 font-medium mt-0.5">{supportSubtitle}</p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 p-1.5">
          <SupportHeadsetLogo className="w-8 h-8" />
        </div>
      </div>

      {/* Grid of Enabled Support Contact Cards */}
      {enabledCardsCount > 0 && (
        <div className={`grid grid-cols-1 ${enabledCardsCount > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : ''} gap-3`}>
          {/* Card 1: Telegram Support */}
          {showTelegramCard && (
            <a
              id="telegram-link-element"
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-800 rounded-[18px] p-4 transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.99]"
            >
              <div className="text-right flex-1 min-w-0">
                <h4 className="font-black text-xs md:text-sm text-[#111111]">{telegramTitle}</h4>
                <span id="telegram-handle-text" className="text-[11px] text-slate-500 font-semibold dir-ltr block mt-0.5 truncate">
                  {telegramHandle}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                <TelegramIcon />
              </div>
            </a>
          )}

          {/* Card 2: Email Support */}
          {showEmailCard && (
            <a
              id="email-link-element"
              href={`mailto:${emailAddress}`}
              className="group bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-800 rounded-[18px] p-4 transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.99]"
            >
              <div className="text-right flex-1 min-w-0">
                <h4 className="font-black text-xs md:text-sm text-[#111111]">{emailTitle}</h4>
                <span id="email-address-text" className="text-[11px] text-slate-500 font-semibold dir-ltr block mt-0.5 truncate">
                  {emailAddress}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Mail className="w-5 h-5 text-slate-700" />
              </div>
            </a>
          )}

          {/* Card 3: Office Phone Contact Card */}
          {showPhoneCard && (
            <a
              id="office-phone-link-element"
              href={`tel:${officePhone.replace(/[^0-9+]/g, '')}`}
              className="group bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-800 rounded-[18px] p-4 transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.99]"
            >
              <div className="text-right flex-1 min-w-0">
                <h4 className="font-extrabold text-xs md:text-sm text-[#111111]">{phoneTitle}</h4>
                <span id="office-phone-number" className="text-[11px] text-slate-500 font-semibold dir-ltr block mt-0.5 truncate">{officePhone}</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#111111] shrink-0 group-hover:scale-105 transition-transform duration-200">
                <PhoneCall className="w-5 h-5 text-slate-700" />
              </div>
            </a>
          )}
        </div>
      )}

      {/* 🟢 FAQ TRIGGER CARD (Redesigned to match Support Cards) */}
      {showFaqSection && (
        <div>
          <button
            type="button"
            id="faq-navigation-button"
            onClick={() => {
              if (onOpenFAQ) {
                onOpenFAQ();
              }
            }}
            className="w-full group bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800 hover:border-slate-800 dark:hover:border-slate-600 rounded-[18px] p-4 transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 text-right flex-1 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-xs md:text-sm text-slate-800 dark:text-white">
                    سوالات متداول و راهنمای خرید (FAQ)
                  </h4>
                  <span className="text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20 hidden sm:inline-block">
                    راهنمای کامل
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                  پاسخ به سوالات پرتکرار اصالت کالا، نحوه ارسال و سفارش از دبی
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:-translate-x-0.5 transition-all shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Trust Badges - Light Outer Border #E5E5E5 & Rounded 16px */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-[16px] p-3 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#111111]">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <span id="trust-badge-1" className="font-extrabold text-[#111111] text-[10px] md:text-xs block">{trustBadge1}</span>
        </div>

        <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-[16px] p-3 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#111111]">
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <span id="trust-badge-2" className="font-extrabold text-[#111111] text-[10px] md:text-xs block">{trustBadge2}</span>
        </div>

        <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-[16px] p-3 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#111111]">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <span id="trust-badge-3" className="font-extrabold text-[#111111] text-[10px] md:text-xs block">{trustBadge3}</span>
        </div>
      </div>
    </div>
  );
};


