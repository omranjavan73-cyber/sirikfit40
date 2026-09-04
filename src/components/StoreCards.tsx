import React, { useState, useEffect } from 'react';
import { ExternalLink, Sparkles, ArrowLeft } from 'lucide-react';
import { CmsConfig } from '../types';
import { GncSquareLogo, LifePharmacySquareLogo, DoctorNutritionSquareLogo, IherbSquareLogo } from './CompanyLogos';
import { getStoresFromFirestore } from '../services/storeService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { isFirestoreGrpcNoise } from '../firebase';

interface StoreCardsProps {
  stores?: any[];
  cms?: CmsConfig | null;
  onSelectStoreSample?: (storeName: string, defaultUrl: string) => void;
}

export const StoreCards: React.FC<StoreCardsProps> = ({ stores: propsStores, cms, onSelectStoreSample }) => {
  const showStores = cms?.features?.showStores ?? cms?.showStores ?? true;
  const [loadedStores, setLoadedStores] = useState<any[]>(() => {
    if (Array.isArray(propsStores) && propsStores.length > 0) return propsStores;
    if (Array.isArray(cms?.stores) && cms.stores.length > 0) return cms.stores;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_stores_list');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => loadedStores.length === 0);

  // Sync with props if provided
  useEffect(() => {
    if (Array.isArray(propsStores) && propsStores.length > 0) {
      setLoadedStores(propsStores);
      setIsLoading(false);
    } else if (Array.isArray(cms?.stores) && cms.stores.length > 0) {
      setLoadedStores(cms.stores);
      setIsLoading(false);
    }
  }, [propsStores, cms?.stores]);

  // Real-time listener on settings/home & settings/stores
  useEffect(() => {
    if (!db) return;

    // Fetch initial stores if not present
    if (loadedStores.length === 0) {
      getStoresFromFirestore().then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setLoadedStores(res);
        }
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    }

    let unsubHome: (() => void) | null = null;
    let unsubStores: (() => void) | null = null;

    try {
      unsubHome = onSnapshot(doc(db, 'settings', 'home'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const s = data.partnerStores || data.stores;
          if (Array.isArray(s) && s.length > 0) {
            setLoadedStores(s);
            setIsLoading(false);
          }
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('StoreCards settings/home listener notice:', err);
      });

      unsubStores = onSnapshot(doc(db, 'settings', 'stores'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.stores) && data.stores.length > 0) {
            setLoadedStores(data.stores);
            setIsLoading(false);
          }
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('StoreCards settings/stores listener notice:', err);
      });
    } catch (_e) {}

    return () => {
      if (unsubHome) unsubHome();
      if (unsubStores) unsubStores();
    };
  }, []);

  if (!showStores) return null;

  const activeStores = (loadedStores || []).filter(
    (s: any) => s && s.enabled !== false && s.active !== false && s.isActive !== false
  );

  // If loading and no stores available yet, show skeleton cards
  if (isLoading && activeStores.length === 0) {
    return (
      <section className="mb-6 font-['Vazirmatn',sans-serif] dir-rtl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-100 rounded-[20px] p-4.5 space-y-4 shadow-xs animate-pulse"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0" />
              </div>
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-200 rounded-[14px]" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (activeStores.length === 0) return null;

  const getLogoComponent = (store: any) => {
    if (store.id === 'store-gnc' || store.title?.includes('GNC') || store.url?.includes('gnc')) return GncSquareLogo;
    if (store.id === 'store-life' || store.title?.includes('Life') || store.url?.includes('lifepharmacy')) return LifePharmacySquareLogo;
    if (store.id === 'store-dnp' || store.title?.includes('Doctor') || store.title?.includes('Nutrition') || store.url?.includes('drnutrition')) return DoctorNutritionSquareLogo;
    if (store.id === 'store-iherb' || store.title?.includes('iHerb') || store.url?.includes('iherb')) return IherbSquareLogo;
    return null;
  };

  const getStoreBrandColor = (store: any) => {
    if (store.brandColor) return store.brandColor;
    if (store.id === 'store-gnc' || store.title?.includes('GNC') || store.url?.includes('gnc')) return '#dc2626';
    if (store.id === 'store-life' || store.title?.includes('Life') || store.url?.includes('lifepharmacy')) return '#1e40af';
    if (store.id === 'store-dnp' || store.title?.includes('Doctor') || store.title?.includes('Nutrition') || store.url?.includes('drnutrition')) return '#9333ea';
    if (store.id === 'store-iherb' || store.title?.includes('iHerb') || store.url?.includes('iherb')) return '#458500';
    if (store.id === 'store-sporter' || store.title?.includes('Sporter') || store.title?.includes('SPORTER') || store.url?.includes('sporter')) return '#f59e0b';
    if (store.id === 'store-amazon' || store.title?.includes('Amazon') || store.url?.includes('amazon')) return '#d97706';
    return '#111111';
  };

  return (
    <section className="mb-6 font-['Vazirmatn',sans-serif]">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-extrabold text-base md:text-lg text-slate-900">
          فروشگاه‌های معتبر طرف قرارداد امارات و دبی
        </h3>
      </div>

      {/* Grid Cards for Partner Stores: Responsive multi-column layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {activeStores.map((store: any) => {
          const Logo = getLogoComponent(store);
          const shortTitle = store.shortTitle || store.title || 'فروشگاه';
          const imageUrl = store.image || store.logoUrl || store.logo;
          const brandColor = getStoreBrandColor(store);
          const ctaText = store.ctaText || `محاسبه و خرید از ${shortTitle}`;

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
                    <h4
                      className="font-black text-[17px] md:text-[18px] leading-snug tracking-tight"
                      style={{ color: brandColor }}
                    >
                      {store.title}
                    </h4>
                    {store.badge && (
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md mt-1.5"
                        style={{
                          backgroundColor: `${brandColor}12`,
                          color: brandColor,
                          border: `1px solid ${brandColor}33`
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: brandColor }}></span>
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

              <div
                className="w-full text-white text-xs md:text-sm font-black py-3 px-3 rounded-[14px] transition-all duration-200 flex items-center justify-center gap-2 shadow-2xs group-hover:shadow-md group-hover:brightness-110"
                style={{ backgroundColor: brandColor }}
              >
                <span>{ctaText}</span>
                <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};
