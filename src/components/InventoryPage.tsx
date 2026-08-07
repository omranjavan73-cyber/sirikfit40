import React, { useState } from 'react';
import type { LocalInventoryItem, WarehouseCategory } from '../types';
import { formatToman } from '../utils/formatters';
import { Search, Globe, Package, Shield, Zap, Droplet, Star, X } from 'lucide-react';

interface InventoryPageProps {
  items: LocalInventoryItem[];
  categories?: WarehouseCategory[];
  onSelectLocalProduct: (item: LocalInventoryItem) => void;
}

const DEFAULT_CATEGORY_TILES = [
  { id: 'all', label: 'همه کالاها', filterKey: 'all', icon: Globe },
  { id: 'protein', label: 'پروتئین', filterKey: 'protein', icon: Package },
  { id: 'vitamin', label: 'ویتامین', filterKey: 'vitamin', icon: Shield },
  { id: 'pre', label: 'قبل تمرین', filterKey: 'pre', icon: Zap },
  { id: 'omega', label: 'امگا ۳', filterKey: 'omega', icon: Droplet },
  { id: 'hot', label: 'پرفروش', filterKey: 'hot', icon: Star },
];

export const InventoryPage: React.FC<InventoryPageProps> = ({
  items,
  categories,
  onSelectLocalProduct
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  const categoryList = (categories && categories.length >= 6)
    ? categories
    : DEFAULT_CATEGORY_TILES;

  const visibleItems = items.filter(item => item.inStock !== false);

  const filteredItems = visibleItems.filter(item => {
    const q = searchQuery.trim().toLowerCase();
    const title = (item.title || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();

    const matchesSearch = !q || title.includes(q) || cat.includes(q) || desc.includes(q);

    let matchesCat = true;
    if (selectedCat === 'protein') matchesCat = cat.includes('پروتئین') || title.includes('وی') || title.includes('ایزوله') || title.includes('whey');
    if (selectedCat === 'vitamin') matchesCat = cat.includes('ویتامین') || title.includes('مولتی') || title.includes('daily') || title.includes('سی') || title.includes('c');
    if (selectedCat === 'pre') matchesCat = cat.includes('تمرین') || title.includes('پمپ') || title.includes('c4') || title.includes('کراتین') || title.includes('پرفروش');
    if (selectedCat === 'omega') matchesCat = cat.includes('امگا') || title.includes('امگا') || title.includes('fish') || title.includes('omega');
    if (selectedCat === 'hot') matchesCat = true;

    return matchesSearch && matchesCat;
  });

  // Short brand tag (3-4 uppercase letters) helper for exact screenshot replica
  const getItemBrandCode = (title: string, category?: string) => {
    const t = title.toLowerCase();
    if (t.includes('myprotein') || t.includes('مای پروتئین') || t.includes('myp')) return 'MYP';
    if (t.includes('gnc') || t.includes('جی ان سی')) return 'GNC';
    if (t.includes('cellucor') || t.includes('c4') || t.includes('سلکور')) return 'CEL';
    if (t.includes('doctor') || t.includes('doc')) return 'DOC';
    if (t.includes('optimum') || t.includes('on ') || t.includes('وی')) return 'ON';
    if (t.includes('dymatize') || t.includes('iso')) return 'ISO';
    if (t.includes('life')) return 'LIFE';
    return 'ON';
  };

  const getFallbackIcon = (id: string) => {
    if (id === 'protein') return Package;
    if (id === 'vitamin') return Shield;
    if (id === 'pre') return Zap;
    if (id === 'omega') return Droplet;
    if (id === 'hot') return Star;
    return Globe;
  };

  return (
    <div className="space-y-4 font-['Vazirmatn',sans-serif] animate-fade-in pb-12">
      {/* Top Header without extra back button */}
      <div className="text-right pb-1">
        <h2 className="text-lg md:text-xl font-black text-neutral-900 tracking-tight">
          موجودی انبار ایران (تحویل فوری)
        </h2>
        <p className="text-xs text-neutral-500 font-medium pt-0.5">
          کالاهای موجود و آماده ارسال ۱ الی ۲ روزه با پیک/پست
        </p>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <div className="relative flex items-center bg-[#F8FAFC] border-[1.5px] border-[#E5E5E5] focus-within:border-[#111111] rounded-[12px] transition">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="...جستجوی مکمل، برند یا دسته"
            className="w-full bg-transparent py-3 pr-10 pl-4 text-xs text-[#111111] placeholder-neutral-400 focus:outline-none text-right dir-rtl font-medium"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute right-3 shrink-0 pointer-events-none" />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 text-neutral-400 hover:text-neutral-700 text-xs cursor-pointer p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3x2 Grid Category Cards with OUTSIDE BOLD LABELS & CENTERED GRAY CIRCLE */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {categoryList.slice(0, 6).map((tile) => {
          const filterKey = tile.filterKey || tile.id;
          const isActive = selectedCat === filterKey || selectedCat === tile.id;
          const IconComp = getFallbackIcon(tile.id);

          return (
            <div key={tile.id} className="flex flex-col items-center cursor-pointer group" onClick={() => setSelectedCat(filterKey)}>
              {/* Card Container */}
              <div
                className={`w-full aspect-[4/3] sm:aspect-square rounded-[16px] bg-white transition-all flex items-center justify-center relative ${
                  isActive
                    ? 'border-[1.5px] border-[#111111] shadow-2xs'
                    : 'border-[1.5px] border-[#E5E5E5] group-hover:border-slate-400'
                }`}
              >
                {/* Gray Circle Background inside Card */}
                <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-[#F1F5F9] border border-slate-200/50 flex items-center justify-center p-2.5 overflow-hidden shadow-2xs">
                  {tile.iconUrl ? (
                    <img
                      src={tile.iconUrl}
                      alt={tile.label}
                      className="w-[60%] h-[60%] object-contain block"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <IconComp
                      className={`w-6 h-6 transition ${
                        isActive ? 'text-[#111111] stroke-[2.2]' : 'text-slate-700 stroke-[1.8]'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* OUTSIDE BOLD LABEL DIRECTLY BELOW THE CARD */}
              <span
                className={`mt-2 block text-xs md:text-sm text-center transition-all ${
                  isActive ? 'font-black text-[#111111]' : 'font-extrabold text-slate-700 group-hover:text-slate-900'
                }`}
              >
                {tile.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stock Items List Header */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="font-extrabold text-sm text-[#111111]">موجودی انبار</h3>
        <span className="text-xs font-extrabold text-[#111111] bg-[#F8FAFC] border-[1.5px] border-[#E5E5E5] px-3 py-0.5 rounded-full">
          {filteredItems.length} کالا
        </span>
      </div>

      {/* Stock Items Grid (2 Columns) */}
      <div className="grid grid-cols-2 gap-3">
        {filteredItems.map((item) => {
          const brandCode = getItemBrandCode(item.title, item.category);

          return (
            <div
              key={item.id}
              onClick={() => onSelectLocalProduct(item)}
              className="product-card bg-white border border-slate-200/90 hover:border-[#111111] rounded-[22px] p-3.5 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between relative space-y-3 overflow-hidden"
            >
              {/* Product Image Container */}
              <div className="img-wrap relative w-full h-[120px] rounded-[18px] bg-[#F8FAFC] border border-slate-100 flex items-center justify-center overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover object-center block"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}

                {!item.image && (
                  <span className="font-black text-2xl text-[#111111] tracking-tight">{brandCode}</span>
                )}

                {/* Stock Badge on top of Image */}
                <span className="badge absolute bottom-1.5 right-1.5 bg-[#111111] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs z-20">
                  {item.deliveryBadge || 'تحویل فوری'}
                </span>
              </div>

              {/* Product Title & Stock Status */}
              <div className="space-y-1.5 text-right flex-1 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold text-emerald-600 block">
                  موجود در ایران ({item.stockCount || 4} عدد)
                </span>

                <h4 className="font-extrabold text-xs md:text-sm text-slate-900 leading-snug line-clamp-2 min-h-[32px]">
                  {item.title}
                </h4>

                {/* Price */}
                <div className="pt-1">
                  <span className="font-black text-xs md:text-sm text-[#E11D48] block dir-rtl">
                    {formatToman(item.priceToman)}
                  </span>
                </div>
              </div>

              {/* Full-width Order Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLocalProduct(item);
                  setAddedItemId(item.id);
                  setTimeout(() => setAddedItemId(null), 1500);
                }}
                className={`w-full font-extrabold text-xs py-2 rounded-[12px] transition cursor-pointer text-center ${
                  addedItemId === item.id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white hover:bg-[#111111] hover:text-white border-[1.5px] border-[#111111] text-[#111111]'
                }`}
              >
                {addedItemId === item.id ? '✓ اضافه شد!' : 'افزودن به سبد خرید'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
