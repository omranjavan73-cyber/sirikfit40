import React from 'react';
import { TrustBadgesSection } from './TrustBadgesSection';
import { SirikFitLogo } from './SirikFitLogo';
import {
  ShieldCheck,
  Headphones,
  Mail,
  Send,
  Phone,
  FileText,
  HelpCircle,
  Package,
  Flame,
  ArrowUp,
  Sparkles,
  MapPin,
  Clock
} from 'lucide-react';
import type { CmsConfig, LandingContentSettings } from '../types';
import { DEFAULT_LANDING_CONTENT } from '../types';

interface FooterProps {
  cms?: CmsConfig | null;
  settings?: any;
  onOpenTerms?: () => void;
  onOpenFAQ?: () => void;
  onOpenInventory?: () => void;
  onOpenDeals?: () => void;
  onOpenAbout?: () => void;
  onOpenServices?: () => void;
  onOpenContact?: () => void;
}

const TelegramIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-2.02 9.52c-.15.68-.55.84-1.12.52l-3.1-2.29-1.5 1.44c-.17.17-.31.31-.63.31l.22-3.17 5.77-5.21c.25-.22-.05-.34-.39-.12l-7.14 4.5-3.07-.96c-.67-.21-.68-.67.14-.99l12.01-4.63c.56-.21 1.05.13.83.98z"/>
  </svg>
);

export const Footer: React.FC<FooterProps> = ({
  cms,
  settings,
  onOpenTerms,
  onOpenFAQ,
  onOpenInventory,
  onOpenDeals,
  onOpenAbout,
  onOpenServices,
  onOpenContact
}) => {
  const landing: LandingContentSettings = {
    ...DEFAULT_LANDING_CONTENT,
    ...(cms?.landingContent || {})
  };

  const home = cms?.homeContent;
  const logoUrl = home?.logoUrl || '';

  const email = landing.supportEmail || home?.adminDestinationEmail || 'info@sirikfit.ir';
  const telegramHandle = landing.supportTelegram || home?.telegramHandle || '@SIRIK_FIT_Support';
  const telegramLink = landing.supportTelegramLink || `https://t.me/${telegramHandle.replace('@', '')}`;
  const phone = landing.supportPhone || home?.officePhone || '021-91000000';
  const hours = landing.supportHours || 'پاسخگویی همه‌روزه ۹ الی ۲۳';

  const scrollToSection = (id: string, fallbackFn?: () => void) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (fallbackFn) {
      fallbackFn();
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="main-footer" className="w-full mt-14 font-['Vazirmatn',sans-serif] dir-rtl text-right">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        
        {/* Main Footer Box */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs space-y-8">
          
          {/* Top Section: Brand + Direct Contact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-100">
            
            {/* Column 1: Brand & About Statement (5 cols) */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-black/10 shadow-2xs overflow-hidden flex items-center justify-center bg-white shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="SIRIK FIT" className="w-full h-full object-contain" />
                  ) : (
                    <SirikFitLogo className="w-full h-full" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 tracking-tight">
                    سیریک فیت | SIRIK FIT
                  </h3>
                  <span className="text-[11px] font-extrabold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                    تأمین و واردات مستقیم مکمل از دبی
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal text-justify">
                {landing.aboutUsDescription || DEFAULT_LANDING_CONTENT.aboutUsDescription}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تضمین اصالت ۱۰۰٪</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>ارسال ۵ تا ۱۰ روز کاری</span>
                </span>
              </div>
            </div>

            {/* Column 2: Quick Links & Landing Sections (3 cols) */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="font-black text-sm text-slate-900 border-r-2 border-red-600 pr-2">
                دسترسی سریع و بخش‌ها
              </h4>
              <ul className="space-y-2 text-xs font-semibold text-slate-600">
                {landing.showAboutUs && (
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('about-us-section', onOpenAbout)}
                      className="hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-slate-300">✦</span>
                      <span>درباره سیریک فیت</span>
                    </button>
                  </li>
                )}

                {landing.showServices && (
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('services-section', onOpenServices)}
                      className="hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-slate-300">✦</span>
                      <span>خدمات و مزایای خرید</span>
                    </button>
                  </li>
                )}

                {landing.showContactSupport && (
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('contact-support-section', onOpenContact)}
                      className="hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-slate-300">✦</span>
                      <span>اطلاعات تماس و پشتیبانی</span>
                    </button>
                  </li>
                )}

                {landing.showTerms && (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenTerms) onOpenTerms();
                        else scrollToSection('terms-section');
                      }}
                      className="hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer text-slate-800 font-bold"
                    >
                      <span className="text-red-500">✦</span>
                      <span>قوانین و مقررات خرید</span>
                    </button>
                  </li>
                )}

                {onOpenFAQ && (
                  <li>
                    <button
                      type="button"
                      onClick={onOpenFAQ}
                      className="hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-slate-300">✦</span>
                      <span>سوالات متداول (FAQ)</span>
                    </button>
                  </li>
                )}

                {onOpenInventory && (
                  <li>
                    <button
                      type="button"
                      onClick={onOpenInventory}
                      className="hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-slate-300">✦</span>
                      <span>کالاهای موجود در انبار ایران</span>
                    </button>
                  </li>
                )}

                {onOpenDeals && (
                  <li>
                    <button
                      type="button"
                      onClick={onOpenDeals}
                      className="hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-slate-300">✦</span>
                      <span>تخفیف‌ها و پیشنهادهای ویژه</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Column 3: Contact Channels & Support (4 cols) */}
            <div className="md:col-span-4 space-y-3">
              <h4 className="font-black text-sm text-slate-900 border-r-2 border-red-600 pr-2">
                راه‌های ارتباط و پشتیبانی
              </h4>

              <div className="space-y-2.5">
                {/* Telegram */}
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 hover:border-sky-400 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      <TelegramIcon />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">پشتیبانی تلگرام</span>
                      <span className="text-xs font-black text-slate-800 dir-ltr block group-hover:text-sky-600 transition-colors">
                        {telegramHandle}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-lg border border-sky-100">
                    آنلاین
                  </span>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${email}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 hover:border-slate-800 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">ایمیل پشتیبانی</span>
                      <span className="text-xs font-bold text-slate-800 dir-ltr block group-hover:text-red-600 transition-colors">
                        {email}
                      </span>
                    </div>
                  </div>
                </a>

                {/* Phone */}
                <a
                  href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 hover:border-emerald-400 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">تلفن پشتیبانی ({hours})</span>
                      <span className="text-xs font-bold text-slate-800 dir-ltr block group-hover:text-emerald-600 transition-colors">
                        {phone}
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            </div>

          </div>

          {/* Embedded Official Trust Badges & Certifications */}
          <TrustBadgesSection cms={cms} settings={settings} />

          {/* Bottom Copyright & Back to Top */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <p>
              © ۲۰۲۶ تمامی حقوق مادی و معنوی محفوظ و متعلق به فروشگاه آنلاین <strong className="text-slate-900 font-black">سیریک فیت (sirikfit.ir)</strong> می‌باشد.
            </p>

            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-red-600 font-bold transition-colors cursor-pointer px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200"
            >
              <span>بازگشت به بالای صفحه</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </footer>
  );
};

export default Footer;
