import React from 'react';
import { ShieldCheck, Truck, Coins, Check, Sparkles } from 'lucide-react';
import { SupportHeadsetLogo } from './common/SupportHeadsetLogo';
import type { CmsConfig, LandingContentSettings, ServicePillarItem } from '../types';
import { DEFAULT_LANDING_CONTENT } from '../types';

interface ServicesFeaturesSectionProps {
  cms?: CmsConfig | null;
}

const getPillarIcon = (iconName?: string, index: number = 0) => {
  switch (iconName?.toLowerCase()) {
    case 'shieldcheck':
    case 'shield':
    case 'authenticity':
      return <ShieldCheck className="w-6 h-6 text-emerald-600" />;
    case 'truck':
    case 'shipping':
    case 'cargo':
      return <Truck className="w-6 h-6 text-blue-600" />;
    case 'coins':
    case 'price':
    case 'pricing':
    case 'calculator':
      return <Coins className="w-6 h-6 text-amber-600" />;
    case 'headphones':
    case 'support':
    case 'consult':
      return <SupportHeadsetLogo className="w-6 h-6" />;
    default:
      if (index === 0) return <ShieldCheck className="w-6 h-6 text-emerald-600" />;
      if (index === 1) return <Truck className="w-6 h-6 text-blue-600" />;
      if (index === 2) return <Coins className="w-6 h-6 text-amber-600" />;
      return <SupportHeadsetLogo className="w-6 h-6" />;
  }
};

export const ServicesFeaturesSection: React.FC<ServicesFeaturesSectionProps> = ({ cms }) => {
  const landing: LandingContentSettings = {
    ...DEFAULT_LANDING_CONTENT,
    ...(cms?.landingContent || {})
  };

  if (!landing.showServices) return null;

  const title = landing.servicesTitle || DEFAULT_LANDING_CONTENT.servicesTitle;
  const subtitle = landing.servicesSubtitle || DEFAULT_LANDING_CONTENT.servicesSubtitle;
  const list: ServicePillarItem[] = (landing.servicesList && landing.servicesList.length > 0)
    ? landing.servicesList
    : DEFAULT_LANDING_CONTENT.servicesList;

  return (
    <section
      id="services-section"
      className="w-full bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs font-['Vazirmatn',sans-serif] scroll-mt-20 transition-all"
    >
      {/* Header */}
      <div className="flex flex-col items-start gap-2 border-b border-slate-100 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-extrabold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>خدمات و تمایزهای اختصاصی</span>
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>

        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {/* 4 Core Pillars Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {list.map((item, idx) => (
          <div
            key={item.id || idx}
            className="bg-[#F8FAFC] border border-slate-200/90 hover:border-slate-800 hover:bg-white rounded-2xl p-4.5 sm:p-5 flex flex-col justify-between transition-all duration-200 group shadow-2xs hover:shadow-sm"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                {getPillarIcon(item.icon, idx)}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                  {idx + 1}
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-red-600 transition-colors">
                  {item.title}
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>استاندارد تضمین‌شده سیریک فیت</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
