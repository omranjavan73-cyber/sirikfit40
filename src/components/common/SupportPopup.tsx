import React, { useEffect, useRef } from 'react';
import { X, Headphones, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import { useSupport } from '../../context/SupportContext';

interface SupportPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportPopup: React.FC<SupportPopupProps> = ({ isOpen, onClose }) => {
  const { supportConfig } = useSupport();
  const popupRef = useRef<HTMLDivElement>(null);

  // Format WhatsApp deep link URL safely
  const getWhatsAppUrl = () => {
    let cleaned = (supportConfig.whatsappNumber || '+971501234567').replace(/[^0-9]/g, '');
    if (cleaned.startsWith('09')) {
      cleaned = '98' + cleaned.slice(1);
    }
    const defaultMsg =
      supportConfig.whatsappDefaultMessage || 'سلام، در رابطه با خرید از سیریک فیت راهنمایی میخواستم';
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(defaultMsg)}`;
  };

  // Format Telegram deep link URL safely
  const getTelegramUrl = () => {
    const username = (supportConfig.telegramBotUsername || 'SIRIK_FIT_Support_bot')
      .replace(/^@/, '')
      .trim();
    return `https://t.me/${username || 'SIRIK_FIT_Support_bot'}`;
  };

  const telegramHandle = (supportConfig.telegramBotUsername || 'SIRIK_FIT_Support_bot').replace(/^@/, '');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('#floating-support-trigger')
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      id="floating-support-drawer"
      dir="rtl"
      className="fixed bottom-40 left-4 sm:bottom-22 sm:left-6 md:bottom-24 md:left-8 max-w-xs w-80 rounded-3xl bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-zinc-800 shadow-2xl p-4 z-50 backdrop-blur-md font-['Vazirmatn',sans-serif] animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Headphones className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
              پشتیبانی و مشاوره خرید سیریک فیت
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {supportConfig.responseTimeText || '🟢 پاسخگویی کمتر از ۱۵ دقیقه'}
              </span>
            </div>
          </div>
        </div>
        <button
          id="close-support-popup-btn"
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          title="بستن پنجره پشتیبانی"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-slate-600 dark:text-zinc-400 mb-3 leading-relaxed">
        جهت مشاوره تخصصی، استعلام موجودی دبی و ثبت سریع سفارش، درگاه مورد نظر را انتخاب فرمایید:
      </p>

      {/* Direct Contact Buttons */}
      <div className="space-y-2.5">
        {/* Telegram Button */}
        <a
          id="support-telegram-channel-btn"
          href={getTelegramUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between p-3 rounded-2xl bg-sky-50/90 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-950/60 border border-sky-200/90 dark:border-sky-800/60 transition-all duration-200 cursor-pointer shadow-xs active:scale-98"
        >
          <div className="flex items-center gap-3">
            {/* Telegram SVG Logo */}
            <div className="w-9 h-9 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                ارتباط در تلگرام
              </div>
              <div className="text-[10px] font-bold text-sky-700 dark:text-sky-300 dir-ltr text-right">
                @{telegramHandle}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-[#229ED9] text-white flex items-center gap-1 shadow-xs">
            <span>گفتگو</span>
            <ExternalLink className="w-3 h-3" />
          </span>
        </a>

        {/* WhatsApp Button */}
        <a
          id="support-whatsapp-channel-btn"
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between p-3 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 border border-emerald-200/90 dark:border-emerald-800/60 transition-all duration-200 cursor-pointer shadow-xs active:scale-98"
        >
          <div className="flex items-center gap-3">
            {/* WhatsApp SVG Logo */}
            <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.41a8.17 8.17 0 012.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.44 0-2.86-.38-4.11-1.1l-.29-.17-3.05.8.82-2.98-.19-.3a8.196 8.196 0 01-1.25-4.48c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.13-1.07-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.3z"/>
              </svg>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                ارتباط در واتساپ
              </div>
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                مشاوره و استعلام سفارش
              </div>
            </div>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-[#25D366] text-white flex items-center gap-1 shadow-xs">
            <span>پیام</span>
            <ExternalLink className="w-3 h-3" />
          </span>
        </a>
      </div>

      {/* Footer Note */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          {supportConfig.supportHours || '۹ صبح الی ۲۴ شب'}
        </span>
        <span className="flex items-center gap-1 font-bold text-slate-500 dark:text-zinc-400">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          تضمین اصالت دبی
        </span>
      </div>
    </div>
  );
};

export default SupportPopup;
