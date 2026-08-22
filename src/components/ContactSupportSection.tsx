import React from 'react';
import { Headphones, Mail, PhoneCall, Clock, MapPin, Send, HelpCircle, ArrowLeft } from 'lucide-react';
import type { CmsConfig, LandingContentSettings } from '../types';
import { DEFAULT_LANDING_CONTENT } from '../types';

interface ContactSupportSectionProps {
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

export const ContactSupportSection: React.FC<ContactSupportSectionProps> = ({ cms, onOpenFAQ }) => {
  const landing: LandingContentSettings = {
    ...DEFAULT_LANDING_CONTENT,
    ...(cms?.landingContent || {})
  };

  const home = cms?.homeContent;

  if (!landing.showContactSupport) return null;

  const title = landing.contactTitle || DEFAULT_LANDING_CONTENT.contactTitle;
  const subtitle = landing.contactSubtitle || DEFAULT_LANDING_CONTENT.contactSubtitle;
  const email = landing.supportEmail || home?.adminDestinationEmail || DEFAULT_LANDING_CONTENT.supportEmail;
  const telegramHandle = landing.supportTelegram || home?.telegramHandle || DEFAULT_LANDING_CONTENT.supportTelegram;
  const telegramLink = formatTelegramUrl(landing.supportTelegramLink || home?.telegramLink, telegramHandle);
  const phone = landing.supportPhone || home?.officePhone || DEFAULT_LANDING_CONTENT.supportPhone;
  const hours = landing.supportHours || DEFAULT_LANDING_CONTENT.supportHours;
  const address = landing.officeAddress || DEFAULT_LANDING_CONTENT.officeAddress;

  return (
    <section
      id="contact-support-section"
      className="w-full bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs font-['Vazirmatn',sans-serif] scroll-mt-20 transition-all space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col items-start gap-2 border-b border-slate-100 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold">
          <Clock className="w-3.5 h-3.5" />
          <span>{hours}</span>
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Headphones className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
          <span>{title}</span>
        </h2>

        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {/* Contact Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Telegram Support */}
        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-[#F8FAFC] hover:bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-4.5 transition-all duration-200 flex items-center justify-between gap-3 shadow-2xs hover:shadow-md cursor-pointer"
        >
          <div className="text-right min-w-0 flex-1">
            <span className="text-[11px] font-bold text-sky-600 block mb-0.5">پشتیبانی آنلاین و مشاوره فوری</span>
            <h4 className="font-black text-sm text-slate-900 group-hover:text-sky-600 transition-colors">
              ارتباط مستقیم در تلگرام
            </h4>
            <span className="text-xs text-slate-500 font-bold dir-ltr block mt-1 truncate">
              {telegramHandle}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white border border-sky-100 shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <TelegramIcon />
          </div>
        </a>

        {/* Card 2: Email Support */}
        <a
          href={`mailto:${email}`}
          className="group bg-[#F8FAFC] hover:bg-white border border-slate-200/90 hover:border-slate-800 rounded-2xl p-4.5 transition-all duration-200 flex items-center justify-between gap-3 shadow-2xs hover:shadow-md cursor-pointer"
        >
          <div className="text-right min-w-0 flex-1">
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">مکاتبات رسمی و سازمانی</span>
            <h4 className="font-black text-sm text-slate-900 group-hover:text-red-600 transition-colors">
              ایمیل رسمی پشتیبانی
            </h4>
            <span className="text-xs text-slate-500 font-bold dir-ltr block mt-1 truncate">
              {email}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Mail className="w-6 h-6 text-slate-700" />
          </div>
        </a>

        {/* Card 3: Phone Support */}
        <a
          href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
          className="group bg-[#F8FAFC] hover:bg-white border border-slate-200/90 hover:border-slate-800 rounded-2xl p-4.5 transition-all duration-200 flex items-center justify-between gap-3 shadow-2xs hover:shadow-md cursor-pointer"
        >
          <div className="text-right min-w-0 flex-1">
            <span className="text-[11px] font-bold text-emerald-600 block mb-0.5">تماس تلفنی با کارشناسان</span>
            <h4 className="font-black text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
              تلفن پشتیبانی و پیگیری
            </h4>
            <span className="text-xs text-slate-500 font-bold dir-ltr block mt-1 truncate">
              {phone}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <PhoneCall className="w-6 h-6 text-emerald-600" />
          </div>
        </a>
      </div>

      {/* Office & Logistics Row */}
      <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h4 className="font-black text-xs sm:text-sm text-slate-900">دفتر هماهنگی و لاجستیک</h4>
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5">{address}</p>
          </div>
        </div>

        {onOpenFAQ && (
          <button
            type="button"
            onClick={onOpenFAQ}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition shadow-2xs hover:border-slate-800 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>مشاهده سوالات متداول (FAQ)</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </section>
  );
};
