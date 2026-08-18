import React, { useState } from 'react';
import { Search, X, Tag, Dumbbell, Pill, Flame, Zap, Sparkles } from 'lucide-react';
import type { FeaturedDeal, FinancialSettings, WarehouseCategory } from '../types';
import { formatToman, formatAed, toPersianDigits, calculateFinalToman, getEffectiveAedRate } from '../utils/formatters';
import { ProductDetailModal } from './ProductDetailModal';
import { CategoryGridSection } from './CategoryGridSection';

interface FeaturedDealsProps {
  deals?: FeaturedDeal[];
  categories?: WarehouseCategory[];
  settings: FinancialSettings;
  onSelectDeal: (deal: FeaturedDeal) => void;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
}

const DEFAULT_CATEGORY_TILES: WarehouseCategory[] = [
  { id: 'all', label: 'همه پیشنهادها', filterKey: 'all', iconUrl: '' },
  { id: 'protein', label: 'پروتئین', filterKey: 'protein', iconUrl: '' },
  { id: 'vitamin', label: 'ویتامین', filterKey: 'vitamin', iconUrl: '' },
  { id: 'pre', label: 'قبل تمرین', filterKey: 'pre', iconUrl: '' },
  { id: 'omega', label: 'امگا ۳', filterKey: 'omega', iconUrl: '' },
  { id: 'hot', label: 'پرفروش', filterKey: 'hot', iconUrl: '' },
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
  categories = [],
  settings,
  onSelectDeal,
  onAddToCart
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [failedCatImages, setFailedCatImages] = useState<Record<string, boolean>>({});
  const [selectedDealForModal, setSelectedDealForModal] = useState<FeaturedDeal | null>(null);

  const rawDeals = (deals && deals.length > 0) ? deals : DEFAULT_DEALS;
  const activeDeals = (rawDeals || []).filter((d) => d && d.isActive !== false);

  const categoryList = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORY_TILES;

  const filteredDeals = activeDeals.filter((deal) => {
    const q = searchQuery.trim().toLowerCase();
    const title = (deal.title || '').toLowerCase();
    const cat = (deal.category || '').toLowerCase();
    const brand = (deal.brand || '').toLowerCase();
    const store = (deal.storeName || '').toLowerCase();

    const matchesSearch = !q || title.includes(q) || cat.includes(q) || brand.includes(q) || store.includes(q);

    let matchesCat = true;
    if (selectedCat !== 'all' && selectedCat !== 'همه') {
      const matchedTile = categoryList.find(c => c.id === selectedCat || (c.filterKey && c.filterKey === selectedCat));
      const filterTerm = (matchedTile?.filterKey || matchedTile?.label || selectedCat).toLowerCase();

      matchesCat = cat.includes(filterTerm) || filterTerm.includes(cat) || title.includes(filterTerm) || brand.includes(filterTerm);
    }

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-5 font-['Vazirmatn',sans-serif] animate-fade-in pb-16">
      
      {/* Top Header */}
      <div className="text-right pb-1">
        <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
          پیشنهاد خرید از دبی
        </h1>
      </div>

      {/* Shared CategoryGridSection (Search Bar + Circular Category Row + All Categories Modal) */}
      <CategoryGridSection
        categories={categories}
        selectedCat={selectedCat}
        onSelectCategory={setSelectedCat}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="...جستجوی پیشنهاد، برند یا دسته"
        itemsCount={filteredDeals.length}
      />

      {/* Filtered Products List Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h3 className="font-extrabold text-sm text-[#111111]">پیشنهادهای یافت‌شده</h3>
        <span className="text-xs font-extrabold text-[#111111] bg-[#F8FAFC] border-[1.5px] border-[#E5E5E5] px-3 py-0.5 rounded-full">
          {filteredDeals.length} کالا
        </span>
      </div>

      {/* Main Deals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredDeals.map((deal) => (
          <ProductCard
            key={deal.id}
            deal={deal}
            settings={settings}
            onSelect={onSelectDeal}
            onCardClick={() => setSelectedDealForModal(deal)}
          />
        ))}
      </div>

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
        onAddToCart={(productPayload, flavor, size) => {
          if (onAddToCart) {
            onAddToCart(productPayload, flavor, size);
          } else {
            onSelectDeal({
              id: selectedDealForModal?.id || 'modal-deal',
              title: productPayload.title,
              priceAed: productPayload.priceAed,
              weightKg: productPayload.weightKg,
              image: productPayload.image,
              storeName: productPayload.storeName,
              url: productPayload.url || 'https://www.drnutrition.com',
              isActive: true,
              category: selectedDealForModal?.category || 'محصول دبی'
            });
          }
          setSelectedDealForModal(null);
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
    getEffectiveAedRate(settings)
  );

  const computedDiscount = (deal.originalPriceAed && deal.originalPriceAed > deal.priceAed)
    ? Math.round(((deal.originalPriceAed - deal.priceAed) / deal.originalPriceAed) * 100)
    : 0;

  const discountVal = (deal.discountPercent && deal.discountPercent > 0)
    ? deal.discountPercent
    : (computedDiscount > 0 ? computedDiscount : 0);

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
      {/* Top Left Floating Discount Badge or Custom Badge */}
      {discountVal > 0 ? (
        <span className="discount-badge absolute top-3 left-3 bg-[#E11D48] text-white text-[10px] font-black px-2 py-0.5 rounded-full z-20 dir-ltr shadow-2xs">
          -{toPersianDigits(discountVal)}٪
        </span>
      ) : deal.badge ? (
        <span className="discount-badge absolute top-3 left-3 bg-[#E11D48] text-white text-[10px] font-black px-2 py-0.5 rounded-full z-20 dir-rtl shadow-2xs">
          {deal.badge}
        </span>
      ) : null}

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

      {/* Full-width Action Button - Opens Product Details Modal */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onCardClick) {
            onCardClick();
          } else {
            onSelect(deal);
          }
        }}
        className="w-full font-extrabold text-xs py-2.5 rounded-[14px] transition cursor-pointer text-center bg-[#111111] hover:bg-[#D31027] text-white border border-[#111111] hover:border-[#D31027] shadow-2xs"
      >
        افزودن به سبد خرید
      </button>

    </div>
  );
};
