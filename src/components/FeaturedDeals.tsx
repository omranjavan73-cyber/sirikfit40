import React, { useState } from 'react';
import type { FeaturedDeal, FinancialSettings } from '../types';
import { formatToman, formatAed, toPersianDigits, calculateFinalToman } from '../utils/formatters';
import { ProductDetailModal } from './ProductDetailModal';

interface FeaturedDealsProps {
  deals?: FeaturedDeal[];
  settings: FinancialSettings;
  onSelectDeal: (deal: FeaturedDeal) => void;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'همه' },
  { id: 'featured', label: '⭐ پیشنهادهای ویژه' },
  { id: 'bestseller', label: '🔥 پرفروش‌ترین‌ها' },
  { id: 'discount', label: '🏷️ تخفیف‌دار و ویژه' },
  { id: 'sport', label: '💪 مکمل ورزشی' },
  { id: 'vitamin', label: '✨ ویتامین و سلامت' },
];

const DEFAULT_DEALS: FeaturedDeal[] = [
  {
    id: 'deal-1',
    title: 'پروتئین وی ON Gold Standard 5lb',
    brand: 'Optimum',
    category: 'مکمل ورزشی',
    priceAed: 280,
    originalPriceAed: 350,
    discountPercent: 20,
    weightKg: 2.27,
    storeName: 'Dr. Nutrition',
    isActive: true,
    section: 'featured',
    isFeaturedInCalculator: true,
    badge: '💪 وی ۵ پوندی ON',
    url: 'https://www.drnutrition.com'
  },
  {
    id: 'deal-2',
    title: 'پمپ C4 Extreme Pre-Workout',
    brand: 'Cellucor',
    category: 'تخفیف ویژه',
    priceAed: 135,
    originalPriceAed: 170,
    discountPercent: 20,
    weightKg: 0.6,
    storeName: 'Dr. Nutrition',
    isActive: true,
    section: 'discount',
    isFeaturedInCalculator: true,
    badge: '⚡ پمپ C4',
    url: 'https://www.drnutrition.com'
  },
  {
    id: 'deal-3',
    title: 'امگا ۳ Pharmacy Omega-3',
    brand: 'GNC',
    category: 'ویتامین',
    priceAed: 95,
    originalPriceAed: 115,
    discountPercent: 15,
    weightKg: 0.35,
    storeName: 'Life Pharmacy',
    isActive: true,
    section: 'bestseller',
    isFeaturedInCalculator: true,
    badge: '🐟 امگا ۳ GNC',
    url: 'https://www.lifepharmacy.com'
  },
  {
    id: 'deal-4',
    title: 'مولتی روزانه One Daily Men',
    brand: 'GNC',
    category: 'مولتی‌ویتامین',
    priceAed: 110,
    originalPriceAed: 125,
    discountPercent: 10,
    weightKg: 0.35,
    storeName: 'GNC UAE',
    isActive: true,
    section: 'featured',
    isFeaturedInCalculator: true,
    badge: '💊 مولتی GNC',
    url: 'https://gnc-mena.com'
  }
];

export const FeaturedDeals: React.FC<FeaturedDealsProps> = ({
  deals = [],
  settings,
  onSelectDeal
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedDealForModal, setSelectedDealForModal] = useState<FeaturedDeal | null>(null);

  const rawDeals = deals.length > 0 ? deals : DEFAULT_DEALS;
  const activeDeals = rawDeals.filter((d) => d.isActive !== false);

  const filteredDeals = activeDeals.filter((deal) => {
    if (activeTab === 'all') return true;
    const cat = deal.category?.toLowerCase() || '';
    const title = deal.title?.toLowerCase() || '';
    const sec = deal.section || '';

    if (activeTab === 'featured' && (sec === 'featured' || deal.isFeaturedInCalculator)) return true;
    if (activeTab === 'bestseller' && (sec === 'bestseller' || (deal.badge && deal.badge.includes('پرفروش')))) return true;
    if (activeTab === 'discount' && (sec === 'discount' || (deal.discountPercent && deal.discountPercent > 0))) return true;
    if (activeTab === 'sport' && (cat.includes('ورزش') || title.includes('ورزش') || title.includes('c4') || title.includes('پمپ'))) return true;
    if (activeTab === 'vitamin' && (cat.includes('ویتامین') || cat.includes('سلامت') || title.includes('ویتامین') || title.includes('امگا'))) return true;

    return true;
  });

  // Section 1: Featured Deals (پیشنهادهای ویژه)
  const featuredSectionDeals = activeDeals.filter(d => 
    d.section === 'featured' || d.isFeaturedInCalculator || (d.badge && d.badge.includes('ویژه'))
  );

  // Section 2: Bestseller Deals (پرفروش‌ترین‌ها)
  const bestsellerSectionDeals = activeDeals.filter(d => 
    d.section === 'bestseller' || (d.badge && d.badge.includes('پرفروش')) || d.title.includes('ON') || d.title.includes('GNC')
  );

  // Section 3: Discounted Deals (تخفیف‌دار و ویژه)
  const discountSectionDeals = activeDeals.filter(d => 
    d.section === 'discount' || (d.discountPercent && d.discountPercent > 0) || (d.originalPriceAed && d.originalPriceAed > d.priceAed)
  );

  return (
    <div className="space-y-5 font-['Vazirmatn',sans-serif] animate-fade-in pb-16">
      
      {/* Top Announcement Banner */}
      <div className="bg-[#111111] text-white text-[11px] font-extrabold py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-1.5 shadow-2xs">
        <span>❄️ نگهداری و ارسال کنترل‌شده دما • اورجینال از دبی</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-2xs space-y-2">
        <div className="inline-flex items-center bg-[#111111] text-white text-[10px] font-black px-3 py-1 rounded-lg">
          پیشنهادهای ویژه
        </div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          پیشنهادهای خرید از دبی
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          محبوب‌ترین مکمل‌های ورزشی، ویتامین‌ها و کالاهای تخفیف‌دار با تحویل فوری ایران
        </p>

        {/* Horizontal Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 no-scrollbar dir-rtl">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#111111] text-white shadow-xs border-none'
                    : 'bg-[#F8FAFC] border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Sections Ordered: 1. Featured Deals -> 2. Bestsellers -> 3. Discounted */}
      {activeTab === 'all' ? (
        <div className="space-y-6">
          {/* Section 1: Featured Deals (پیشنهادهای ویژه) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                <span className="text-amber-500">⭐</span>
                <span>پیشنهادهای ویژه</span>
              </h3>
              <button
                onClick={() => setActiveTab('featured')}
                className="text-xs font-extrabold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>مشاهده همه</span>
                <span className="text-sm">←</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(featuredSectionDeals.length > 0 ? featuredSectionDeals.slice(0, 4) : activeDeals.slice(0, 2)).map((deal) => (
                <ProductCard key={deal.id} deal={deal} settings={settings} onSelect={onSelectDeal} onCardClick={() => setSelectedDealForModal(deal)} />
              ))}
            </div>
          </div>

          {/* Section 2: Bestsellers (پرفروش‌ترین‌ها) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                <span className="text-rose-500">🔥</span>
                <span>پرفروش‌ترین‌ها</span>
              </h3>
              <button
                onClick={() => setActiveTab('bestseller')}
                className="text-xs font-extrabold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>مشاهده همه</span>
                <span className="text-sm">←</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(bestsellerSectionDeals.length > 0 ? bestsellerSectionDeals.slice(0, 4) : activeDeals.slice(2, 4)).map((deal) => (
                <ProductCard key={deal.id} deal={deal} settings={settings} onSelect={onSelectDeal} onCardClick={() => setSelectedDealForModal(deal)} />
              ))}
            </div>
          </div>

          {/* Section 3: Discounted Items (تخفیف‌دار و ویژه) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                <span className="text-emerald-600">🏷️</span>
                <span>تخفیف‌دار و ویژه</span>
              </h3>
              <button
                onClick={() => setActiveTab('discount')}
                className="text-xs font-extrabold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>مشاهده همه</span>
                <span className="text-sm">←</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(discountSectionDeals.length > 0 ? discountSectionDeals.slice(0, 4) : activeDeals).map((deal) => (
                <ProductCard key={deal.id} deal={deal} settings={settings} onSelect={onSelectDeal} onCardClick={() => setSelectedDealForModal(deal)} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pt-2">
          {filteredDeals.map((deal) => (
            <ProductCard key={deal.id} deal={deal} settings={settings} onSelect={onSelectDeal} onCardClick={() => setSelectedDealForModal(deal)} />
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={!!selectedDealForModal}
        onClose={() => setSelectedDealForModal(null)}
        product={selectedDealForModal ? {
          title: selectedDealForModal.title,
          url: selectedDealForModal.url,
          priceAed: selectedDealForModal.priceAed,
          originalPriceAed: selectedDealForModal.originalPriceAed,
          discountPercent: selectedDealForModal.discountPercent,
          weightKg: selectedDealForModal.weightKg,
          image: selectedDealForModal.image,
          storeName: selectedDealForModal.storeName,
          brand: selectedDealForModal.brand,
          category: selectedDealForModal.category,
          badge: selectedDealForModal.badge
        } : null}
        settings={settings}
        onAddToCart={(item) => {
          onSelectDeal({
            id: selectedDealForModal?.id || 'modal-deal',
            title: item.title,
            priceAed: item.priceAed,
            weightKg: item.weightKg,
            image: item.image,
            storeName: item.storeName,
            url: item.url || 'https://www.drnutrition.com',
            isActive: true,
            category: selectedDealForModal?.category || 'محصول دبی'
          });
        }}
      />

    </div>
  );
};

// Reusable Product Card EXACTLY Matching Screenshot 1 & 2
const ProductCard: React.FC<{
  deal: FeaturedDeal;
  settings: FinancialSettings;
  onSelect: (deal: FeaturedDeal) => void;
  onCardClick?: () => void;
}> = ({ deal, settings, onSelect, onCardClick }) => {
  const [isAdded, setIsAdded] = useState(false);
  const weight = deal.weightKg || 0.5;

  const finalToman = calculateFinalToman(
    deal.priceAed,
    weight,
    settings.cargoRatePerKg,
    settings.profitMargin,
    settings.aedRate
  );

  const discountVal =
    deal.discountPercent ||
    (deal.originalPriceAed
      ? Math.round(((deal.originalPriceAed - deal.priceAed) / deal.originalPriceAed) * 100)
      : 20);

  // Visual styling for Brand Logo Container & Badges (Matching Screenshot 1 & 2)
  const getBrandVisual = (title: string, brandName?: string) => {
    const t = title.toLowerCase();
    const b = (brandName || '').toLowerCase();

    if (t.includes('c4') || b.includes('cellucor')) {
      return {
        logoText: 'C4',
        brandPill: 'Cellucor',
        bgClass: 'bg-[#E0F2FE]',
        textClass: 'text-[#0284C7]',
        tagText: deal.category || 'تخفیف ویژه',
        tagClass: 'text-[#D97706]'
      };
    }
    if (t.includes('omega') || t.includes('امگا')) {
      return {
        logoText: 'Ω3',
        brandPill: 'GNC',
        bgClass: 'bg-[#DBEAFE]',
        textClass: 'text-[#2563EB]',
        tagText: deal.category || 'ویتامین',
        tagClass: 'text-[#059669]'
      };
    }
    if (t.includes('one daily') || t.includes('مولتی') || b.includes('gnc')) {
      return {
        logoText: 'GNC',
        brandPill: 'GNC',
        bgClass: 'bg-[#FEF3C7]',
        textClass: 'text-[#D97706]',
        tagText: deal.category || 'مولتی‌ویتامین',
        tagClass: 'text-[#059669]'
      };
    }
    return {
      logoText: 'ON',
      brandPill: 'Optimum',
      bgClass: 'bg-[#DCFCE7]',
      textClass: 'text-[#16A34A]',
      tagText: deal.category || 'مکمل ورزشی',
      tagClass: 'text-[#111111]'
    };
  };

  const style = getBrandVisual(deal.title, deal.brand);

  return (
    <div
      onClick={onCardClick || (() => onSelect(deal))}
      className="product-card bg-white border border-slate-200/90 rounded-[22px] p-3.5 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between relative space-y-3 overflow-hidden"
    >
      {/* Top Left Floating Discount Badge (-20%, -10%, etc) */}
      {discountVal > 0 && (
        <span className="discount-badge absolute top-3 left-3 bg-[#E11D48] text-white text-[10px] font-black px-2 py-0.5 rounded-full z-20 dir-ltr shadow-2xs">
          -{toPersianDigits(discountVal)}٪
        </span>
      )}

      {/* Center Pastel Logo Box / Image Container with Overlapping Brand Pill */}
      <div className="img-wrap relative w-full h-[130px] overflow-hidden rounded-[18px]">
        <div className={`w-full h-full ${style.bgClass} flex items-center justify-center relative overflow-hidden rounded-[18px]`}>
          {deal.image ? (
            <img
              src={deal.image}
              alt={deal.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center block"
              onError={(e) => {
                const target = e.currentTarget;
                const currentSrc = target.src || '';
                if (deal.image && !currentSrc.includes('images.weserv.nl') && !deal.image.startsWith('data:')) {
                  target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(deal.image);
                } else {
                  target.style.display = 'none';
                }
              }}
            />
          ) : null}

          {!deal.image && (
            <span className={`font-black text-2xl md:text-3xl ${style.textClass} tracking-tight`}>
              {style.logoText}
            </span>
          )}

          {/* Bottom Right Overlapping Dark Brand Badge Pill */}
          <span className="brand-badge absolute bottom-1.5 right-1.5 bg-[#27272A] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs z-20">
            {style.brandPill}
          </span>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="space-y-1 text-center">
        {/* Category Tag */}
        <span className={`text-[11px] font-extrabold block ${style.tagClass}`}>
          {style.tagText}
        </span>

        {/* Product Title */}
        <h4 className="font-extrabold text-xs md:text-sm text-slate-900 leading-tight line-clamp-2 h-9">
          {deal.title}
        </h4>

        {/* Compact Prices Section */}
        <div className="pt-1 space-y-1">
          {/* Main Toman Price */}
          <span className="text-xs md:text-sm font-black text-[#111111] block dir-rtl">
            تحویل ایران: <span className="text-[#D31027] font-black">{formatToman(finalToman)}</span>
          </span>

          {/* Ultra-compact AED Base Price Pill */}
          <div className="flex items-center justify-center gap-1">
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-slate-200/80 dir-ltr shadow-2xs">
              {deal.originalPriceAed && deal.originalPriceAed > deal.priceAed && (
                <span className="line-through text-slate-400 text-[9px] mr-0.5">
                  {deal.originalPriceAed}
                </span>
              )}
              <span>{formatAed(deal.priceAed)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Full-width Crimson Red Action Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(deal);
          setIsAdded(true);
          setTimeout(() => setIsAdded(false), 1500);
        }}
        className={`w-full font-extrabold text-xs py-2.5 rounded-[14px] transition cursor-pointer text-center ${
          isAdded
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-[#111111] hover:bg-[#D31027] text-white border border-[#111111] hover:border-[#D31027] shadow-2xs'
        }`}
      >
        {isAdded ? '✓ اضافه شد!' : 'افزودن به سبد خرید'}
      </button>

    </div>
  );
};
