import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plane, ShieldCheck, Check, Sparkles, ExternalLink, Weight, Coins, Info } from 'lucide-react';
import type { FinancialSettings } from '../types';
import { formatToman, formatAed, toPersianDigits, calculateFinalToman } from '../utils/formatters';

export interface ProductDetailModalProduct {
  title: string;
  url?: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg?: number;
  image?: string;
  images?: string[];
  galleryImages?: string[];
  storeName?: string;
  brand?: string;
  category?: string;
  description?: string;
  badge?: string;
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDetailModalProduct | null;
  settings: FinancialSettings;
  onAddToCart: (item: {
    title: string;
    url?: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    quantity?: number;
  }) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  settings,
  onAddToCart
}) => {
  if (!isOpen || !product) return null;

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // Gallery list construction
  const rawList = product.images || product.galleryImages || (product.image ? [product.image] : []);
  const fallbackImg = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600';
  
  const galleryList = Array.from(
    new Set(rawList.filter(Boolean))
  );

  useEffect(() => {
    const initialImg = galleryList[0] || product.image || fallbackImg;
    setSelectedImage(initialImg);
    setQuantity(1);
    setIsAdded(false);
  }, [product]);

  const priceAed = product.priceAed || 100;
  const weightKg = product.weightKg || 0.8;
  const originalPriceAed = product.originalPriceAed;
  
  const discountVal = (originalPriceAed && originalPriceAed > priceAed)
    ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100)
    : (product.discountPercent || 0);

  const unitToman = calculateFinalToman(
    priceAed,
    weightKg,
    settings.cargoRatePerKg,
    settings.profitMargin,
    settings.aedRate
  );

  const totalToman = unitToman * quantity;

  const handleAdd = () => {
    onAddToCart({
      title: product.title,
      url: product.url || 'https://www.drnutrition.com',
      priceAed: priceAed,
      weightKg: weightKg,
      image: selectedImage || product.image || fallbackImg,
      storeName: product.storeName || product.brand || 'دبی',
      quantity: quantity
    });

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white rounded-[28px] max-w-lg w-full p-5 sm:p-6 shadow-2xl relative space-y-5 border border-slate-100 max-h-[92vh] overflow-y-auto text-right dir-rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 left-4 z-20 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition cursor-pointer"
          title="بستن"
          aria-label="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Store & Brand Badges */}
        <div className="flex items-center gap-2 flex-wrap pt-1 pl-10">
          <span className="text-[11px] bg-[#111111] text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            {product.storeName || 'فروشگاه دبی'}
          </span>
          {product.brand && (
            <span className="text-[11px] bg-slate-100 text-slate-700 font-extrabold px-2.5 py-1 rounded-full border border-slate-200">
              {product.brand}
            </span>
          )}
          {product.category && (
            <span className="text-[11px] bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-200">
              {product.category}
            </span>
          )}
          {discountVal > 0 && (
            <span className="text-[11px] bg-rose-600 text-white font-black px-2.5 py-1 rounded-full dir-ltr shadow-2xs">
              -{toPersianDigits(discountVal)}٪ تخفیف
            </span>
          )}
        </div>

        {/* GALLERY SECTION */}
        <div className="space-y-3">
          {/* Main Large Display Image */}
          <div className="relative w-full h-56 sm:h-64 bg-slate-50 rounded-[22px] border border-slate-200/90 overflow-hidden flex items-center justify-center p-2 shadow-inner group">
            <img
              src={selectedImage || fallbackImg}
              alt={product.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain object-center rounded-[18px] transition duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.currentTarget;
                const currentSrc = target.src || '';
                if (selectedImage && !currentSrc.includes('images.weserv.nl') && !selectedImage.startsWith('data:')) {
                  target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(selectedImage);
                } else {
                  target.src = fallbackImg;
                }
              }}
            />

            <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 dir-ltr">
              <Plane className="w-3 h-3 text-sky-400" />
              تحویل ۷ الی ۱۴ روز
            </span>
          </div>

          {/* Interactive Thumbnails Row (3-5 items) */}
          {galleryList.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 dir-ltr justify-center">
              {galleryList.slice(0, 5).map((imgUrl, idx) => {
                const isActive = selectedImage === imgUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 overflow-hidden bg-slate-50 shrink-0 transition cursor-pointer ${
                      isActive 
                        ? 'border-[#D31027] ring-2 ring-[#D31027]/20 shadow-sm scale-105' 
                        : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`تصویر ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('images.weserv.nl')) {
                          target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(String(imgUrl));
                        } else {
                          target.src = fallbackImg;
                        }
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* PRODUCT TITLE & EXTRACTED DESCRIPTION */}
        <div className="space-y-2">
          <h2 className="font-black text-base sm:text-lg text-slate-900 leading-snug">
            {product.title}
          </h2>

          {product.description ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 leading-relaxed max-h-32 overflow-y-auto">
              <p className="font-medium">{product.description}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 font-medium">
              محصول اورجینال مستقیم از فروشگاه رسمی {product.storeName || 'امارات'} ارسال با پست سریع هوایی.
            </p>
          )}
        </div>

        {/* TRANSPARENT PRICING & WEIGHT BREAKDOWN */}
        <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-[20px] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-bold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              قیمت پایه در دبی:
            </span>
            <div className="font-black text-slate-900 dir-ltr flex items-center gap-1.5">
              {originalPriceAed && originalPriceAed > priceAed && (
                <span className="line-through text-slate-400 text-[11px]">
                  {formatAed(originalPriceAed)}
                </span>
              )}
              <span className="text-emerald-700 font-black">{formatAed(priceAed)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-2">
            <span className="font-bold flex items-center gap-1">
              <Weight className="w-3.5 h-3.5 text-sky-600" />
              وزن تخمینی / باربری:
            </span>
            <span className="font-black text-slate-800 dir-ltr">
              {toPersianDigits(weightKg)} کیلوگرم
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
            <span className="font-extrabold text-xs text-slate-900">
              قیمت تحویل درب منزل در ایران:
            </span>
            <span className="font-black text-sm sm:text-base text-[#D31027]">
              {formatToman(totalToman)}
            </span>
          </div>
        </div>

        {/* QUANTITY & PRIMARY ACTION BUTTON */}
        <div className="pt-2 flex items-center gap-3">
          {/* Quantity Selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-xl bg-white text-slate-900 font-black text-sm flex items-center justify-center shadow-2xs hover:bg-slate-200 cursor-pointer"
            >
              -
            </button>
            <span className="font-black text-sm text-slate-900 w-6 text-center dir-ltr">
              {toPersianDigits(quantity)}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-xl bg-white text-slate-900 font-black text-sm flex items-center justify-center shadow-2xs hover:bg-slate-200 cursor-pointer"
            >
              +
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAdd}
            className={`flex-1 font-black text-xs sm:text-sm py-3 px-4 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md ${
              isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-[#111111] hover:bg-[#D31027] text-white'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4" />
                <span>به سبد خرید اضافه شد!</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>افزودن به سبد خرید</span>
              </>
            )}
          </button>
        </div>

        {/* Original Product Link */}
        {product.url && (
          <div className="text-center pt-1">
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 transition"
            >
              <span>مشاهده صفحه اصلی در {product.storeName || 'امارات'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
