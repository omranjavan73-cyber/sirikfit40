import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Truck,
  Coins,
  Headphones,
  Send,
  Mail,
  Phone,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  HelpCircle,
  Building2,
  CheckCircle2
} from 'lucide-react';
import type { LandingSettings } from '../types';
import { defaultLandingSettings } from '../types';

interface ModalBaseProps {
  onClose: () => void;
  settings?: LandingSettings | null;
}

// -------------------------------------------------------------
// 1. ABOUT US MODAL (درباره ما | سیریک فیت)
// -------------------------------------------------------------
export const AboutModal: React.FC<ModalBaseProps> = ({ onClose, settings: customSettings }) => {
  const settings: LandingSettings = { ...defaultLandingSettings, ...(customSettings || {}) };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-['Vazirmatn',sans-serif]"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xl flex flex-col gap-4 text-right relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-gray-950">درباره {settings.brandName || 'سیریک فیت'}</h3>
              {settings.brandSubtitle && (
                <span className="text-[11px] font-bold text-red-600 block">{settings.brandSubtitle}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Brand Statement */}
        {settings.aboutText && (
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl space-y-2">
            <span className="text-xs font-black text-gray-900 block flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              {settings.brandName || 'سیریک فیت'}
            </span>
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              {settings.aboutText}
            </p>
          </div>
        )}

        {/* Highlight Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-black text-gray-900 block">اصالت ۱۰۰٪ تضمینی</span>
              <span className="text-[10px] text-gray-500 block">پلمپ نمایندگی دبی</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-sky-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-black text-gray-900 block">تحویل ۵ تا ۱۰ روز کاری</span>
              <span className="text-[10px] text-gray-500 block">ارسال مستقیم درب منزل</span>
            </div>
          </div>
        </div>

        {/* Guarantee Badge Box */}
        {settings.deliveryGuaranteeBadge && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-black text-emerald-900">
              {settings.deliveryGuaranteeBadge}
            </span>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
              تایید شده
            </span>
          </div>
        )}

        {/* Close CTA */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-black hover:bg-gray-900 text-white text-xs font-black rounded-2xl transition cursor-pointer"
        >
          متوجه شدم
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. BENEFITS MODAL (خدمات و مزایای خرید)
// -------------------------------------------------------------
export const BenefitsModal: React.FC<ModalBaseProps> = ({ onClose, settings: customSettings }) => {
  const settings: LandingSettings = { ...defaultLandingSettings, ...(customSettings || {}) };
  const benefits = settings.benefits && settings.benefits.length > 0 ? settings.benefits : defaultLandingSettings.benefits;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-['Vazirmatn',sans-serif]"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xl flex flex-col gap-4 text-right relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-gray-950">خدمات و مزایای خرید از سیریک فیت</h3>
              <span className="text-[11px] font-bold text-gray-500 block">چرا ورزشکاران خرید از دبی را ترجیح می‌دهند؟</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benefits List */}
        <div className="space-y-2.5">
          {benefits.map((b, idx) => (
            <div
              key={b.id || idx}
              className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-start gap-3 transition hover:border-red-300"
            >
              <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-red-600 shrink-0 shadow-2xs">
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-xs text-gray-950">{b.title}</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed font-medium mt-0.5">{b.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-black hover:bg-gray-900 text-white text-xs font-black rounded-2xl transition cursor-pointer"
        >
          بستن پنجره
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. CONTACT & SUPPORT MODAL (اطلاعات تماس و پشتیبانی)
// -------------------------------------------------------------
export const ContactModal: React.FC<ModalBaseProps> = ({ onClose, settings: customSettings }) => {
  const settings: LandingSettings = { ...defaultLandingSettings, ...(customSettings || {}) };
  const tgUser = (settings.telegramId || 'SIRIK_FIT_Support').replace('@', '').replace('https://t.me/', '');

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-['Vazirmatn',sans-serif]"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xl flex flex-col gap-4 text-right relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-gray-950">اطلاعات تماس و پشتیبانی</h3>
              <span className="text-[11px] font-bold text-gray-500 block">پاسخگویی سریع همه‌روزه ۹ صبح الی ۲۳</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contact Cards */}
        <div className="flex flex-col gap-3 text-right" dir="rtl">
          {/* Telegram Card */}
          {settings.showTelegram !== false && settings.telegramId && (
            <a
              href={`https://t.me/${tgUser}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-200 hover:border-sky-400 shadow-xs transition-all cursor-pointer gap-2 group"
            >
              <span className="shrink-0 bg-sky-500 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-2xs">
                {settings.telegramActionText || 'چت آنلاین'}
              </span>
              <div className="flex-1 flex flex-col text-right min-w-0 pr-1">
                <span className="text-xs font-black text-gray-900 truncate">تلگرام پشتیبانی و سفارش</span>
                <span className="text-[11px] text-gray-500 font-semibold dir-ltr text-right font-mono truncate">
                  {settings.telegramId.startsWith('@') ? settings.telegramId : `@${settings.telegramId}`}
                </span>
              </div>
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
                <Send className="w-5 h-5" />
              </div>
            </a>
          )}

          {/* Email Card */}
          {settings.showEmail !== false && settings.supportEmail && (
            <a
              href={`mailto:${settings.supportEmail}`}
              className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-200 hover:border-red-400 shadow-xs transition-all cursor-pointer gap-2 group"
            >
              <span className="shrink-0 bg-gray-100 text-gray-700 text-[11px] font-black px-3 py-1.5 rounded-xl border border-gray-200">
                {settings.emailActionText || 'ارسال ایمیل'}
              </span>
              <div className="flex-1 flex flex-col text-right min-w-0 pr-1">
                <span className="text-xs font-black text-gray-900 truncate">ایمیل رسمی پشتیبانی</span>
                <span className="text-[11px] text-gray-500 font-semibold dir-ltr text-right font-mono truncate">{settings.supportEmail}</span>
              </div>
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                <Mail className="w-5 h-5" />
              </div>
            </a>
          )}

          {/* Phone Card */}
          {settings.showPhone !== false && settings.supportPhone && (
            <a
              href={`tel:${settings.supportPhone.replace(/[^0-9+]/g, '')}`}
              className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-200 hover:border-emerald-400 shadow-xs transition-all cursor-pointer gap-2 group"
            >
              <span className="shrink-0 bg-emerald-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-2xs">
                {settings.phoneActionText || 'تماس تلفنی'}
              </span>
              <div className="flex-1 flex flex-col text-right min-w-0 pr-1">
                <span className="text-xs font-black text-gray-900 truncate">شماره تماس پشتیبانی</span>
                <span className="text-[11px] text-gray-500 font-semibold dir-ltr text-right font-mono truncate">{settings.supportPhone}</span>
              </div>
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Phone className="w-5 h-5" />
              </div>
            </a>
          )}

          {/* Working Hours & Office Location */}
          {((settings.showHours !== false && settings.supportHours) || (settings.showAddress !== false && settings.officeLocation)) && (
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-2 text-xs text-gray-700">
              {settings.showHours !== false && settings.supportHours && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-bold">{settings.supportHours}</span>
                </div>
              )}
              {settings.showAddress !== false && settings.officeLocation && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="font-medium">{settings.officeLocation}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-black hover:bg-gray-900 text-white text-xs font-black rounded-2xl transition cursor-pointer"
        >
          بستن پنجره
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. RULES & TERMS MODAL (قوانین و مقررات خرید)
// -------------------------------------------------------------
export const RulesModal: React.FC<ModalBaseProps> = ({ onClose, settings: customSettings }) => {
  const settings: LandingSettings = { ...defaultLandingSettings, ...(customSettings || {}) };
  const rules = settings.rules && settings.rules.length > 0 ? settings.rules : defaultLandingSettings.rules;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-['Vazirmatn',sans-serif]"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xl flex flex-col gap-4 text-right relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-gray-950">قوانین و مقررات خرید | سیریک فیت</h3>
              <span className="text-[11px] font-bold text-gray-500 block">ضوابط اصالت، حمل و شرایط مرجوعی</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rules Accordion */}
        <div className="space-y-2.5">
          {rules.map((rule, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={rule.id || idx}
                className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-3.5 flex items-center justify-between gap-3 text-right cursor-pointer hover:bg-gray-100/70 transition"
                >
                  <span className="text-xs font-black text-gray-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    <span>{rule.title}</span>
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 text-xs leading-relaxed text-gray-700 font-medium border-t border-gray-200/60 pt-2.5">
                    {rule.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-black hover:bg-gray-900 text-white text-xs font-black rounded-2xl transition cursor-pointer"
        >
          قبول قوانین و بستن
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 5. FAQ MODAL (سوالات متداول)
// -------------------------------------------------------------
export const FaqModal: React.FC<ModalBaseProps> = ({ onClose, settings: customSettings }) => {
  const settings: LandingSettings = { ...defaultLandingSettings, ...(customSettings || {}) };
  const faqs = settings.faqs && settings.faqs.length > 0 ? settings.faqs : defaultLandingSettings.faqs;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in font-['Vazirmatn',sans-serif]"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-lg mx-auto bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xl flex flex-col gap-4 text-right relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-gray-950">سوالات متداول (FAQ)</h3>
              <span className="text-[11px] font-bold text-gray-500 block">پاسخ سریع به پرسش‌های رایج کاربران</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.id || idx}
                className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-3.5 flex items-center justify-between gap-3 text-right cursor-pointer hover:bg-gray-100/70 transition"
                >
                  <span className="text-xs font-black text-gray-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>{faq.question}</span>
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 text-xs leading-relaxed text-gray-700 font-medium border-t border-gray-200/60 pt-2.5">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Callout */}
        {settings.showTelegram !== false && settings.telegramId && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] font-bold text-amber-900 flex items-center justify-between">
            <span>سوال دیگری دارید؟</span>
            <a
              href={`https://t.me/${settings.telegramId.replace('@', '').replace('https://t.me/', '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-800 underline font-black"
            >
              ارتباط با پشتیبانی در تلگرام
            </a>
          </div>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-black hover:bg-gray-900 text-white text-xs font-black rounded-2xl transition cursor-pointer"
        >
          بستن
        </button>
      </div>
    </div>
  );
};
