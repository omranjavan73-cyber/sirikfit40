import React from 'react';
import { ExternalLink, Sparkles, ArrowLeft } from 'lucide-react';
import { CmsConfig } from '../types';
import { GncSquareLogo, LifePharmacySquareLogo, DoctorNutritionSquareLogo } from './CompanyLogos';

interface StoreCardsProps {
  stores?: any[];
  cms?: CmsConfig | null;
  onSelectStoreSample?: (storeName: string, defaultUrl: string) => void;
}

export const StoreCards: React.FC<StoreCardsProps> = ({ stores, cms, onSelectStoreSample }) => {
  // Strictly ordered 3 partner stores as default fallbacks:
  const defaultPartnerStores = [
    {
      id: 'store-gnc',
      title: 'GNC UAE',
      shortTitle: 'GNC',
      subtitle: 'نمایندگی رسمی GNC',
      description: 'نمایندگی رسمی برند جهانی GNC در امارات - انواع مولتی‌ویتامین‌ها، امگا ۳ و مکمل‌های سلامتی اورجینال',
      url: 'https://gnc-mena.com/',
      badge: 'ضمانت ۱۰۰٪ اورجینال',
      enabled: true,
      image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="115" text-anchor="middle" fill="%23E31837" font-weight="900" font-size="70" font-family="Arial,sans-serif" letter-spacing="-2">GNC</text><text x="100" y="145" text-anchor="middle" fill="%23E31837" font-weight="800" font-size="20" font-family="Arial,sans-serif" letter-spacing="4">LIVE WELL</text></svg>',
      LogoComponent: GncSquareLogo,
    },
    {
      id: 'store-life',
      title: 'Life Pharmacy UAE',
      shortTitle: 'Life Pharmacy',
      subtitle: 'داروخانه آنلاین دبی',
      description: 'بزرگترین زنجیره داروخانه آنلاین دبی - داروها، ویتامین‌ها، مکمل‌ها و محصولات آرایشی بهداشتی معتبر',
      url: 'https://www.lifepharmacy.com',
      badge: 'داروخانه آنلاین دبی',
      enabled: true,
      image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><path d="M100 15 C56 15 40 42 40 70 V135 H160 V70 C160 42 144 15 100 15 Z" fill="%231C3F94"/><circle cx="100" cy="55" r="9" fill="%23FFFFFF"/><path d="M100 68 C84 80 72 84 64 110 H136 C128 84 116 80 100 68 Z" fill="%23FFFFFF"/><text x="100" y="172" text-anchor="middle" fill="%23C42582" font-weight="900" font-size="36" font-family="sans-serif">LIFE%C2%AE</text></svg>',
      LogoComponent: LifePharmacySquareLogo,
    },
    {
      id: 'store-dnp',
      title: 'Doctor Nutrition Dubai',
      shortTitle: 'Dr. Nutrition',
      subtitle: 'بزرگترین مرجع مکمل دبی',
      description: 'بزرگترین مرجع تخصصی مکمل‌های ورزشی، ویتامین و پروتئین ایزوله در امارات و خاورمیانه',
      url: 'https://www.drnutrition.com/en-ae',
      badge: 'تخفیف ویژه دبی',
      enabled: true,
      image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif" letter-spacing="-6">dnp</text><path d="M50 120 C 90 70, 135 40, 175 28 C 150 65, 110 110, 75 130 Z" fill="%2378BE20"/><path d="M60 112 Q 115 65, 163 35" stroke="%235A9614" stroke-width="3" fill="none"/></svg>',
      LogoComponent: DoctorNutritionSquareLogo,
    }
  ];

  const rawStores = (cms?.stores && cms.stores.length > 0) ? cms.stores : defaultPartnerStores;
  const activeStores = rawStores.filter((s: any) => s.enabled !== false && s.active !== false);

  if (activeStores.length === 0) return null;

  const getLogoComponent = (store: any) => {
    if (store.id === 'store-gnc' || store.title?.includes('GNC') || store.url?.includes('gnc')) return GncSquareLogo;
    if (store.id === 'store-life' || store.title?.includes('Life') || store.url?.includes('lifepharmacy')) return LifePharmacySquareLogo;
    if (store.id === 'store-dnp' || store.title?.includes('Doctor') || store.title?.includes('Nutrition') || store.url?.includes('drnutrition')) return DoctorNutritionSquareLogo;
    return null;
  };

  return (
    <section className="mb-6 font-['Vazirmatn',sans-serif]">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-extrabold text-base md:text-lg text-slate-900">
          فروشگاه‌های معتبر طرف قرارداد امارات و دبی
        </h3>
      </div>

      {/* Grid Cards for Partner Stores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {activeStores.map((store: any) => {
          const Logo = getLogoComponent(store);
          const shortTitle = store.shortTitle || store.title || 'فروشگاه';
          const imageUrl = store.image || store.logoUrl || store.logo;

          return (
            <a
              key={store.id || store.title}
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white border border-slate-200/90 rounded-[20px] p-4.5 transition-all duration-200 hover:border-slate-400 hover:shadow-md flex flex-col justify-between cursor-pointer text-right block"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="text-right flex-1 min-w-0">
                    <h4 className="font-black text-[17px] md:text-[18px] text-[#111111] leading-snug tracking-tight">
                      {store.title}
                    </h4>
                    {store.badge && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                        {store.badge}
                      </span>
                    )}
                  </div>

                  {/* Strict 64x64 Rounded Logo Container Box */}
                  <div
                    className="shrink-0 border border-slate-200/80"
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      padding: '6px',
                      flexShrink: 0
                    }}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={store.title}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          display: 'block'
                        }}
                      />
                    ) : Logo ? (
                      <Logo className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600">
                        {shortTitle.slice(0, 2)}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed text-right line-clamp-3 font-medium">
                  {store.description}
                </p>
              </div>

              <div className="w-full bg-[#111111] group-hover:bg-black text-white text-xs md:text-sm font-black py-3 px-3 rounded-[14px] transition-all duration-200 flex items-center justify-center gap-2 shadow-2xs group-hover:shadow-md">
                <span>محاسبه و خرید از {shortTitle}</span>
                <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};
