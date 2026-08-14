import React, { useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { CmsConfig } from '../types';

interface TrustBadgesSectionProps {
  cms?: CmsConfig | null;
  settings?: any;
}

/**
 * Safe HTML render container that injects HTML and executes embedded <script> tags
 * required for official eNamad & Samandehi verification popups.
 */
const SafeHtmlBadgeContainer: React.FC<{
  html: string;
  defaultTitle: string;
  badgeType: 'enamad' | 'samandehi' | 'custom';
  defaultImage?: string;
  linkUrl?: string;
}> = ({ html, defaultTitle, badgeType, defaultImage, linkUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !html || !html.trim()) return;

    // Clear previous contents
    containerRef.current.innerHTML = '';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = "flex items-center justify-center";
    wrapper.innerHTML = html.trim();

    // Extract and re-execute scripts so eNamad/Samandehi popup functions properly
    const scripts = wrapper.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    containerRef.current.appendChild(wrapper);
  }, [html]);

  const rawHtml = (html || '').trim();
  const hasContent = rawHtml.length > 0;

  // Case A: User provided custom HTML/Script/Iframe
  if (hasContent) {
    // If it's a direct URL to an image or link
    if ((rawHtml.startsWith('http://') || rawHtml.startsWith('https://')) && !rawHtml.includes('<')) {
      return (
        <a
          href={linkUrl || rawHtml}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200/90 hover:border-slate-800 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer w-full sm:w-44 text-center group active:scale-[0.98]"
        >
          <img
            src={rawHtml}
            alt={defaultTitle}
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-1.5 group-hover:scale-105 transition-transform"
          />
          <span className="text-[11px] sm:text-xs font-black text-slate-800">{defaultTitle}</span>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5">جهت اطمینان کلیک کنید</span>
        </a>
      );
    }

    // Render innerHTML container with script execution support
    return (
      <div className="flex items-center justify-center p-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-xs transition w-full sm:w-44 min-h-[120px]">
        <div ref={containerRef} />
      </div>
    );
  }

  // Case B: Default visual badges when no HTML is set yet
  if (badgeType === 'enamad') {
    return (
      <a
        href={linkUrl || "https://trustseal.enamad.ir"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200/90 hover:border-slate-800 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer w-full sm:w-44 text-center group active:scale-[0.98]"
      >
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
          {/* Custom eNamad Badge Graphic */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-50 border border-sky-100 flex flex-col items-center justify-center p-1 relative">
            <span className="text-2xl font-black text-sky-600 tracking-tighter">e</span>
            <div className="flex items-center justify-center gap-0.5 text-amber-400 text-[8px] mt-0.5">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
            </div>
            <span className="absolute -bottom-1 text-[8px] font-black bg-sky-600 text-white px-1.5 py-0.2 rounded-full">
              اینماد
            </span>
          </div>
        </div>
        <span className="text-[11px] sm:text-xs font-black text-slate-900">{defaultTitle}</span>
        <span className="text-[10px] text-slate-500 font-semibold mt-0.5">جهت اطمینان کلیک کنید</span>
      </a>
    );
  }

  if (badgeType === 'samandehi') {
    return (
      <a
        href={linkUrl || "https://samandehi.ir"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200/90 hover:border-slate-800 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer w-full sm:w-44 text-center group active:scale-[0.98]"
      >
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
          {/* Custom Samandehi Emblem Graphic */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col items-center justify-center p-1 relative">
            <span className="text-xl font-extrabold text-amber-700">رسانه</span>
            <span className="text-[8px] font-bold text-amber-800 mt-0.5">دیجیتال</span>
            <span className="absolute -bottom-1 text-[8px] font-black bg-amber-600 text-white px-1.5 py-0.2 rounded-full">
              ساماندهی
            </span>
          </div>
        </div>
        <span className="text-[11px] sm:text-xs font-black text-slate-900">{defaultTitle}</span>
        <span className="text-[10px] text-slate-500 font-semibold mt-0.5">نشان ملی ثبت</span>
      </a>
    );
  }

  if (defaultImage) {
    return (
      <a
        href={linkUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200/90 hover:border-slate-800 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer w-full sm:w-44 text-center group active:scale-[0.98]"
      >
        <img
          src={defaultImage}
          alt={defaultTitle}
          className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-1 group-hover:scale-105 transition-transform"
        />
        <span className="text-[11px] sm:text-xs font-black text-slate-900">{defaultTitle}</span>
      </a>
    );
  }

  return null;
};

export const TrustBadgesSection: React.FC<TrustBadgesSectionProps> = ({ cms, settings }) => {
  const home = cms?.homeContent;
  const showTrust = cms?.features?.showTrustBadges ?? cms?.showTrustBadges ?? home?.showTrustBadges ?? settings?.showTrustBadges ?? true;

  if (showTrust === false) return null;

  const enamadHtml = cms?.enamadHtml || home?.enamadHtml || settings?.enamadHtml || '';
  const samandehiHtml = cms?.samandehiHtml || home?.samandehiHtml || settings?.samandehiHtml || '';
  const customBadgeImg = cms?.customBadgeImg || home?.customBadgeImg || settings?.customBadgeImg || '';
  const customBadgeLink = cms?.customBadgeLink || home?.customBadgeLink || settings?.customBadgeLink || '';

  return (
    <div id="trust-badges-section" className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-2xs space-y-4 text-center font-['Vazirmatn',sans-serif]">
      <div className="flex items-center justify-center gap-2 border-b border-slate-100 pb-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <h3 className="font-black text-sm md:text-base text-slate-900 tracking-tight">نمادهای اعتماد (اینماد و ساماندهی)</h3>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-3 sm:gap-6 pt-1">
        {/* eNamad Badge */}
        <SafeHtmlBadgeContainer
          html={enamadHtml}
          defaultTitle="نماد اعتماد الکترونیکی"
          badgeType="enamad"
          linkUrl="https://trustseal.enamad.ir"
        />

        {/* Samandehi Badge */}
        <SafeHtmlBadgeContainer
          html={samandehiHtml}
          defaultTitle="ساماندهی رسانه‌های دیجیتال"
          badgeType="samandehi"
          linkUrl="https://samandehi.ir"
        />

        {/* Optional Custom Badge */}
        {customBadgeImg && (
          <SafeHtmlBadgeContainer
            html=""
            defaultTitle="نماد اختصاصی"
            badgeType="custom"
            defaultImage={customBadgeImg}
            linkUrl={customBadgeLink || '#'}
          />
        )}
      </div>

      <p className="text-[11px] text-slate-500 font-medium">
        تمامی فعالیت‌های این مجموعه دارای مجوز رسمی و تحت نظارت مراجع ذی‌صلاح می‌باشند.
      </p>
    </div>
  );
};
