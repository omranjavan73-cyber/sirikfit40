import React, { useState, useEffect } from 'react';
import type { CmsConfig } from '../types';

interface AnnouncementBannerProps {
  cms?: CmsConfig | null;
}

const DEFAULT_SLOGANS = [
  '⚡ ارسال مستقیم و تضمینی کالا از دبی تا درب منزل',
  '💯 تضمین ۱۰۰٪ اصالت مکملها و ضمانت بازگشت',
  '🚀 تحویل سریع و ایمن بین ۵ تا ۷ روز کاری'
];

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ cms }) => {
  if (cms?.showAnnouncementBanner === false) {
    return null;
  }

  const slogans = (cms?.announcementSlogans && cms.announcementSlogans.filter(s => s && s.trim().length > 0).length > 0)
    ? cms.announcementSlogans.filter(s => s && s.trim().length > 0)
    : DEFAULT_SLOGANS;

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slogans.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slogans.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [slogans.length]);

  const activeSlogan = slogans[currentIndex % slogans.length] || slogans[0] || DEFAULT_SLOGANS[0];

  // Check if slogan already starts with an energy symbol
  const hasIcon = /^[\u1F300-\u1F9FF\u2600-\u26FF\u2700-\u27BF⚡✨💯🚀]/u.test(activeSlogan.trim());

  return (
    <div
      id="announcement-banner"
      className="w-full bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs font-['Vazirmatn',sans-serif] overflow-hidden my-2.5 select-none transition-all"
    >
      <style>{`
        @keyframes smoothSloganFade {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          15% {
            opacity: 1;
            transform: translateY(0);
          }
          85% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-6px);
          }
        }
        .animate-smooth-slogan {
          animation: smoothSloganFade 4.5s ease-in-out infinite;
        }
      `}</style>

      <div className="flex items-center justify-center text-center min-h-[28px] dir-rtl">
        <div
          key={`${currentIndex}-${activeSlogan}`}
          className="animate-smooth-slogan flex items-center justify-center gap-2 text-slate-900 font-bold text-[13px] sm:text-[14px] leading-snug tracking-wide"
        >
          {!hasIcon && <span className="text-amber-500 font-black text-sm shrink-0">⚡</span>}
          <span>{activeSlogan}</span>
        </div>
      </div>
    </div>
  );
};
