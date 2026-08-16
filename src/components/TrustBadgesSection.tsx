import React, { useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { CmsConfig } from '../types';

interface TrustBadgesSectionProps {
  cms?: CmsConfig | null;
  settings?: any;
}

/**
 * Bulletproof Enamad Badge Component
 * Parses raw settings inputs safely, extracting `id` and `Code` via Regex inside try-catch.
 */
const SmartEnamadBadge: React.FC<{
  settings?: any;
  cms?: CmsConfig | null;
}> = ({ settings, cms }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  let enamadId = '';
  let enamadCode = '';
  let rawBadge = '';

  try {
    const potentialRaw =
      settings?.enamadCode ||
      settings?.enamadUrl ||
      settings?.enamadHtml ||
      cms?.enamadCode ||
      cms?.enamadUrl ||
      cms?.enamadHtml ||
      cms?.homeContent?.enamadCode ||
      cms?.homeContent?.enamadUrl ||
      cms?.homeContent?.enamadHtml ||
      '';

    if (typeof potentialRaw === 'string') {
      rawBadge = potentialRaw.trim();
    } else if (potentialRaw) {
      rawBadge = String(potentialRaw).trim();
    }

    if (rawBadge && rawBadge.length > 0) {
      const idMatch = rawBadge.match(/id=([a-zA-Z0-9]+)/i);
      const codeMatch = rawBadge.match(/Code=([a-zA-Z0-9]+)/i);
      if (idMatch && idMatch[1]) enamadId = idMatch[1];
      if (codeMatch && codeMatch[1]) enamadCode = codeMatch[1];
    }
  } catch (e) {
    console.warn('Failed to parse Enamad safely', e);
  }

  // Fallback defaults if no custom ID/Code is provided
  const finalId = enamadId || '774774';
  const finalCode = enamadCode || 'QLX3GJJuDLNIXNEEocH7c14ry1CHCK1T';

  useEffect(() => {
    // If raw HTML contains script/iframe tags and wasn't extracted as standard ID/Code
    if (!enamadId && !enamadCode && rawBadge && rawBadge.includes('<') && containerRef.current) {
      try {
        containerRef.current.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-center';
        wrapper.innerHTML = rawBadge;

        const scripts = wrapper.querySelectorAll('script');
        scripts.forEach((oldScript) => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });

        const imgs = wrapper.querySelectorAll('img');
        imgs.forEach((img) => {
          img.onerror = () => {
            img.src = 'https://cdn.zarinpal.com/badges/trust-logos/enamad.png';
          };
        });

        containerRef.current.appendChild(wrapper);
      } catch (_e) {}
    }
  }, [rawBadge, enamadId, enamadCode]);

  // Case A: ID & Code exist (custom or default fallback)
  if (finalId && finalCode) {
    const sealUrl = `https://trustseal.enamad.ir/?id=${finalId}&Code=${finalCode}`;
    const logoUrl = `https://trustseal.enamad.ir/logo.aspx?id=${finalId}&Code=${finalCode}`;

    return (
      <a
        id="enamad-trust-badge"
        referrerPolicy="origin"
        target="_blank"
        rel="noopener noreferrer"
        href={sealUrl}
        className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all h-full w-full sm:w-52 text-center group active:scale-[0.98]"
      >
        <img
          referrerPolicy="origin"
          src={logoUrl}
          alt="نماد تجارت الکترونیکی اینماد"
          className="w-20 h-20 object-contain cursor-pointer mb-1 group-hover:scale-105 transition-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/enamad.png';
          }}
        />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2">اینماد (نماد اعتماد الکترونیکی)</span>
        <span className="text-[10px] text-slate-400 font-medium mt-0.5">احراز هویت کسب‌وکار</span>
      </a>
    );
  }

  // Case B: Direct Image URL
  if (rawBadge && (rawBadge.startsWith('http://') || rawBadge.startsWith('https://')) && !rawBadge.includes('<')) {
    return (
      <a
        id="enamad-image-badge"
        referrerPolicy="origin"
        href={rawBadge}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all h-full w-full sm:w-52 text-center group active:scale-[0.98]"
      >
        <img
          referrerPolicy="origin"
          src={rawBadge}
          alt="نماد تجارت الکترونیکی اینماد"
          className="w-20 h-20 object-contain cursor-pointer mb-1 group-hover:scale-105 transition-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/enamad.png';
          }}
        />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2">اینماد (نماد اعتماد الکترونیکی)</span>
        <span className="text-[10px] text-slate-400 font-medium mt-0.5">احراز هویت کسب‌وکار</span>
      </a>
    );
  }

  // Case C: Raw HTML container
  if (rawBadge && rawBadge.includes('<')) {
    return (
      <div className="flex items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all h-full w-full sm:w-52 min-h-[140px]">
        <div ref={containerRef} />
      </div>
    );
  }

  return null;
};

/**
 * Bulletproof Samandehi Badge Component
 */
const SmartSamandehiBadge: React.FC<{
  settings?: any;
  cms?: CmsConfig | null;
}> = ({ settings, cms }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  let rawSamandehi = '';

  try {
    const potential =
      settings?.samandehiHtml ||
      settings?.samandehiCode ||
      cms?.samandehiHtml ||
      cms?.samandehiCode ||
      cms?.homeContent?.samandehiHtml ||
      '';

    if (typeof potential === 'string') {
      rawSamandehi = potential.trim();
    } else if (potential) {
      rawSamandehi = String(potential).trim();
    }
  } catch (e) {
    console.warn('Failed to parse Samandehi safely', e);
  }

  useEffect(() => {
    if (rawSamandehi && rawSamandehi.includes('<') && containerRef.current) {
      try {
        containerRef.current.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-center';
        wrapper.innerHTML = rawSamandehi;

        const scripts = wrapper.querySelectorAll('script');
        scripts.forEach((oldScript) => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });

        const imgs = wrapper.querySelectorAll('img');
        imgs.forEach((img) => {
          img.onerror = () => {
            img.src = 'https://cdn.zarinpal.com/badges/trust-logos/samandehi.png';
          };
        });

        containerRef.current.appendChild(wrapper);
      } catch (_e) {}
    }
  }, [rawSamandehi]);

  if (rawSamandehi && (rawSamandehi.startsWith('http://') || rawSamandehi.startsWith('https://')) && !rawSamandehi.includes('<')) {
    return (
      <a
        id="samandehi-trust-badge"
        referrerPolicy="origin"
        href="https://samandehi.ir"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all h-full w-full sm:w-52 text-center group active:scale-[0.98]"
      >
        <img
          referrerPolicy="origin"
          src={rawSamandehi}
          alt="ساماندهی پایگاه‌های اینترنتی"
          className="w-20 h-20 object-contain cursor-pointer mb-1 group-hover:scale-105 transition-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/samandehi.png';
          }}
        />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2">ساماندهی (نشان ملی ثبت)</span>
        <span className="text-[10px] text-slate-400 font-medium mt-0.5">ثبت رسمی در رسانه‌های دیجیتال</span>
      </a>
    );
  }

  if (rawSamandehi && rawSamandehi.includes('<')) {
    return (
      <div className="flex items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all h-full w-full sm:w-52 min-h-[140px]">
        <div ref={containerRef} />
      </div>
    );
  }

  // Standard Samandehi Badge
  return (
    <a
      id="samandehi-default-badge"
      referrerPolicy="origin"
      href="https://samandehi.ir"
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all h-full w-full sm:w-52 text-center group active:scale-[0.98]"
    >
      <img
        referrerPolicy="origin"
        src="https://cdn.zarinpal.com/badges/trust-logos/samandehi.png"
        alt="ساماندهی پایگاه‌های اینترنتی"
        className="w-20 h-20 object-contain cursor-pointer mb-1 group-hover:scale-105 transition-transform"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/samandehi.png';
        }}
      />
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2">ساماندهی (نشان ملی ثبت)</span>
      <span className="text-[10px] text-slate-400 font-medium mt-0.5">ثبت رسمی در رسانه‌های دیجیتال</span>
    </a>
  );
};

export const TrustBadgesSection: React.FC<TrustBadgesSectionProps> = ({ cms, settings }) => {
  let showTrust = true;
  try {
    const home = cms?.homeContent;
    const resolvedVal = cms?.features?.showTrustBadges ?? cms?.showTrustBadges ?? home?.showTrustBadges ?? settings?.showTrustBadges;
    if (resolvedVal !== undefined && resolvedVal !== null) {
      showTrust = Boolean(resolvedVal);
    }
  } catch (e) {
    console.warn('Error reading showTrustBadges setting:', e);
  }

  if (showTrust === false) return null;

  let customBadgeImg = '';
  let customBadgeLink = '';

  try {
    const imgPotential = cms?.customBadgeImg || cms?.homeContent?.customBadgeImg || settings?.customBadgeImg;
    if (typeof imgPotential === 'string') customBadgeImg = imgPotential.trim();

    const linkPotential = cms?.customBadgeLink || cms?.homeContent?.customBadgeLink || settings?.customBadgeLink;
    if (typeof linkPotential === 'string') customBadgeLink = linkPotential.trim();
  } catch (_e) {}

  return (
    <div
      id="trust-badges-section"
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xs space-y-4 text-center font-['Vazirmatn',sans-serif]"
    >
      <div className="flex items-center justify-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <h3 className="font-black text-sm md:text-base text-slate-900 dark:text-white tracking-tight">
          نمادهای اعتماد (اینماد و ساماندهی)
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center justify-center gap-4 pt-1">
        {/* eNamad Badge with Safe Smart Parser */}
        <SmartEnamadBadge settings={settings} cms={cms} />

        {/* Samandehi Badge */}
        <SmartSamandehiBadge settings={settings} cms={cms} />

        {/* Optional Custom Badge */}
        {customBadgeImg && (
          <a
            id="custom-trust-badge"
            href={customBadgeLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all h-full w-full sm:w-52 text-center group active:scale-[0.98]"
          >
            <img
              src={customBadgeImg}
              alt="نماد اختصاصی"
              className="w-20 h-20 object-contain cursor-pointer mb-1 group-hover:scale-105 transition-transform"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2">نماد اختصاصی</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">جهت اطمینان کلیک کنید</span>
          </a>
        )}
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        تمامی فعالیت‌های این مجموعه دارای مجوز رسمی و تحت نظارت مراجع ذی‌صلاح می‌باشند.
      </p>
    </div>
  );
};
