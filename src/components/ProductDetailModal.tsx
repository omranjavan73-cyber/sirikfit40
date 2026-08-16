import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ShoppingCart,
  ShieldCheck,
  Check,
  Sparkles,
  ExternalLink,
  Weight,
  Coins,
  Layers,
  Zap,
  Maximize2,
  ZoomIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { FinancialSettings } from '../types';
import { formatToman, formatAed, toPersianDigits, getEffectiveAedRate } from '../utils/formatters';

export interface ProductDetailModalProduct {
  id?: string;
  title: string;
  url?: string;
  priceAed: number;
  originalPriceAed?: number;
  priceToman?: number;
  originalPriceToman?: number;
  calculatedTomanOverride?: number;
  profitMargin?: number;
  marginPercent?: number;
  isLocalInventory?: boolean;
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
  deliveryBadge?: string;
  flavors?: string[];
  sizes?: string[];
  selectedFlavor?: string;
  selectedSize?: string;
  variants?: {
    id: string;
    flavor?: string;
    size?: string;
    priceAed?: number;
    priceToman?: number;
    weightKg?: number;
  }[];
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDetailModalProduct | null;
  settings: FinancialSettings;
  onAddToCart: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  settings,
  onAddToCart
}) => {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  const [selectedFlavor, setSelectedFlavor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  // Interactive Hover Zoom Lens States (Desktop)
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Lightbox Modal States (Mobile tap & Desktop expand)
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxZoom, setLightboxZoom] = useState<boolean>(false);

  // Gallery list construction
  const rawList = product ? (product.images || product.galleryImages || (product.image ? [product.image] : [])) : [];
  const fallbackImg = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600';
  
  const galleryList = Array.from(
    new Set(rawList.filter(Boolean))
  );

  // Derive flavors and sizes from product.flavors/sizes or product.variantGroups/variants
  const extractedFlavors = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.flavors) && product.flavors.length > 0) {
      return product.flavors.filter(f => f && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal'].includes(f.trim().toLowerCase()));
    }
    const flavorGroup = product.variantGroups?.find((g: any) => g.type === 'flavor' || g.id === 'flavors' || (g.name && (g.name.includes('طعم') || g.name.toLowerCase().includes('flavor'))));
    if (flavorGroup && Array.isArray(flavorGroup.options)) {
      return flavorGroup.options.map((opt: any) => typeof opt === 'string' ? opt : (opt.name || opt.label || '')).filter(Boolean);
    }
    return [];
  }, [product]);

  const extractedSizes = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      return product.sizes.filter(s => s && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal'].includes(s.trim().toLowerCase()));
    }
    const sizeGroup = product.variantGroups?.find((g: any) => g.type === 'size' || g.id === 'sizes' || (g.name && (g.name.includes('وزن') || g.name.includes('سایز') || g.name.toLowerCase().includes('size'))));
    if (sizeGroup && Array.isArray(sizeGroup.options)) {
      return sizeGroup.options.map((opt: any) => typeof opt === 'string' ? opt : (opt.name || opt.label || '')).filter(Boolean);
    }
    return [];
  }, [product]);

  useEffect(() => {
    if (product) {
      setSelectedFlavor(product.selectedFlavor || extractedFlavors[0] || '');
      setSelectedSize(product.selectedSize || extractedSizes[0] || '');
      const initialImg = galleryList[0] || product.image || fallbackImg;
      setSelectedImage(initialImg);
      setQuantity(1);
      setIsAdded(false);
      setIsHovered(false);
      setIsLightboxOpen(false);
    }
  }, [product, extractedFlavors, extractedSizes]);

  if (!isOpen || !product) return null;

  const isLocal = product.isLocalInventory === true || product.storeName?.includes('انبار ایران') || product.brand?.includes('انبار ایران');
  const basePriceAed = product.priceAed || 100;
  const baseWeightKg = product.weightKg || 0.5;
  const originalPriceAed = product.originalPriceAed;
  
  // Rate & Financial parameters
  const activeAedRate = getEffectiveAedRate(settings) || settings?.aedRate || 55000;
  const cargoRatePerKg = settings?.cargoRatePerKg || 35;
  const effectiveMargin = (product.profitMargin !== undefined && product.profitMargin !== null && !isNaN(Number(product.profitMargin)))
    ? Number(product.profitMargin)
    : ((product.marginPercent !== undefined && product.marginPercent !== null && !isNaN(Number(product.marginPercent)))
      ? Number(product.marginPercent)
      : (settings?.profitMargin || 20));

  // Find selected variant details if user selected specific size/flavor
  const matchedVariant = product.variants?.find(v => 
    (selectedSize && v.size === selectedSize) || 
    (selectedFlavor && v.flavor === selectedFlavor) ||
    (selectedSize && selectedFlavor && v.size === selectedSize && v.flavor === selectedFlavor)
  );

  const currentPriceAed = matchedVariant?.priceAed || basePriceAed;
  const currentWeightKg = matchedVariant?.weightKg || baseWeightKg;

  // Single Source of Truth for Unit Price (Toman):
  let unitToman: number;
  if (matchedVariant?.priceToman && matchedVariant.priceToman > 0) {
    unitToman = matchedVariant.priceToman;
  } else if (matchedVariant?.priceAed && matchedVariant.priceAed !== basePriceAed) {
    const shippingFee = (currentWeightKg * cargoRatePerKg) * activeAedRate;
    unitToman = Math.round((currentPriceAed * activeAedRate * (1 + effectiveMargin / 100) + shippingFee) / 1000) * 1000;
  } else if (product.priceToman && product.priceToman > 0) {
    unitToman = product.priceToman;
  } else if (product.calculatedTomanOverride && product.calculatedTomanOverride > 0) {
    unitToman = product.calculatedTomanOverride;
  } else {
    const shippingFee = (baseWeightKg * cargoRatePerKg) * activeAedRate;
    unitToman = Math.round((basePriceAed * activeAedRate * (1 + effectiveMargin / 100) + shippingFee) / 1000) * 1000;
  }

  const discountVal = (originalPriceAed && originalPriceAed > currentPriceAed)
    ? Math.round(((originalPriceAed - currentPriceAed) / originalPriceAed) * 100)
    : (product.discountPercent || 0);

  const totalToman = unitToman * quantity;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const openLightbox = (index?: number) => {
    const targetIdx = index !== undefined ? index : galleryList.indexOf(selectedImage);
    setLightboxIndex(targetIdx >= 0 ? targetIdx : 0);
    setLightboxZoom(false);
    setIsLightboxOpen(true);
  };

  const handleLightboxNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLightboxIndex((prev) => (prev + 1) % galleryList.length);
    setLightboxZoom(false);
  };

  const handleLightboxPrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLightboxIndex((prev) => (prev - 1 + galleryList.length) % galleryList.length);
    setLightboxZoom(false);
  };

  const handleAdd = () => {
    const itemPayload = {
      ...product,
      id: product.id || product.url || product.title,
      title: product.title,
      url: product.url || 'https://www.drnutrition.com',
      priceAed: currentPriceAed,
      weightKg: currentWeightKg,
      image: selectedImage || product.image || fallbackImg,
      storeName: product.storeName || product.brand || (isLocal ? 'انبار ایران (تحویل فوری)' : 'دبی'),
      brand: product.brand || product.storeName,
      quantity: quantity,
      priceToman: unitToman,
      calculatedToman: unitToman,
      calculatedTomanOverride: unitToman,
      profitMargin: effectiveMargin,
      isLocalInventory: isLocal,
      selectedFlavor: selectedFlavor || undefined,
      selectedSize: selectedSize || undefined
    };

    onAddToCart(itemPayload, selectedFlavor, selectedSize);

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 1000);
  };

  // Dynamic Structure 1: Composition & Formulation (ترکیبات و فرمولاسیون)
  const titleLower = (product.title || '').toLowerCase();
  const getCompositionBullets = () => {
    if (titleLower.includes('protein') || titleLower.includes('وی') || titleLower.includes('whey') || titleLower.includes('iso')) {
      return [
        'پروتئین وی ایزوله و کنسانتره میکروفیلتر شده با خلوص بالا',
        'پروفایل کامل آمینو اسیدهای شاخه‌دار و ضروری (BCAA & EAA)',
        'فاقد شکر افزوده، چربی ترانس و ناخالصی‌های غیرمجاز'
      ];
    }
    if (titleLower.includes('creatine') || titleLower.includes('کراتین')) {
      return [
        'کراتین مونوهیدرات ۱۰۰٪ خالص میکرونایز شده با انحلال‌پذیری فوری',
        'درجه خلوص دارویی (Pharmaceutical Grade) بدون طعم‌دهنده مصنوعی',
        'فاقد فیلر، کربوهیدرات اضافه و نگه‌دارنده شیمیایی'
      ];
    }
    if (titleLower.includes('c4') || titleLower.includes('پمپ') || titleLower.includes('pre-workout') || titleLower.includes('preworkout')) {
      return [
        'فرمولاسیون سینرژیک بتا-آلانین، سیترولین مالات و ال-تیروزین',
        'حاوی کافئین آنهیدروس خالص جهت افزایش حداکثری تمرکز و هوشیاری',
        'ماتریکس الکترولیت‌های هیدراتاسیون جهت حفظ تعادل یونی عضلات'
      ];
    }
    if (titleLower.includes('gainer') || titleLower.includes('گینر') || titleLower.includes('mass')) {
      return [
        'نسبت استاندارد کربوهیدرات‌های پیچیده به پروتئین با ارزش بیولوژیکی بالا',
        'غنی‌شده با مالتودکسترین مرغوب و آنزیم‌های گوارشی جهت هضم آسان',
        'تامین زنجیره کامل ویتامین‌ها و مواد معدنی مورد نیاز رشد'
      ];
    }
    if (titleLower.includes('collagen') || titleLower.includes('biotin') || titleLower.includes('کلاژن') || titleLower.includes('بیوتین')) {
      return [
        'پپتیدهای کلاژن هیدرولیز شده نوع ۱ و ۳ با جذب سلولی سریع',
        'ترکیب هم‌افزا با ویتامین C و هیالورونیک اسید برای سنتز کلاژن',
        'دوز استاندارد بیوتین خالص جهت تقویت فولیکول‌های مو و ناخن'
      ];
    }
    if (titleLower.includes('omega') || titleLower.includes('امگا')) {
      return [
        'روغن ماهی فوق تصفیه شده با دوز بالای EPA و DHA فعال',
        'عاری از جیوه، فلزات سنگین و توکسین‌های صنعتی (Molecularly Distilled)',
        'کپسول‌های ژلاتینی نرم با پوشش انتریک جهت جلوگیری از طعم نامطلوب'
      ];
    }
    if (titleLower.includes('multi') || titleLower.includes('مولتی') || titleLower.includes('vitamin') || titleLower.includes('ویتامین')) {
      return [
        'مجموعه کامل ویتامین‌های گروه B، ویتامین D3، زینک و منیزیم کلاته',
        'حاوی عصاره‌های گیاهی و آنتی‌اکسیدان‌های قوی محافظت سلولی',
        'فرمول زیست‌دسترس‌پذیر با حداکثر راندمان جذب گوارشی'
      ];
    }
    return [
      'فرمولاسیون استاندارد با مواد اولیه مرغوب بین‌المللی گرید A',
      'تولید مطابق بالاترین استانداردهای کنترل کیفیت جهانی GMP',
      'فاقد ترکیبات غیرمجاز، محرک‌های مضر و افزودنی‌های نامطلوب'
    ];
  };

  // Dynamic Structure 2: Key Benefits & Usage (کارایی و عملکرد)
  const getPerformanceBullets = () => {
    if (titleLower.includes('protein') || titleLower.includes('وی') || titleLower.includes('whey') || titleLower.includes('iso')) {
      return [
        'تسریع رشد و ریکاوری فیبرهای عضلانی پس از تمرینات سنگین',
        'جلوگیری از کاتابولیسم و تحلیل عضلات در دوره‌های رژیم',
        'هضم سریع و روان بدون ایجاد نفخ و سنگینی معده'
      ];
    }
    if (titleLower.includes('creatine') || titleLower.includes('کراتین')) {
      return [
        'افزایش توان انفجاری و بازسازی سریع ذخایر فسفاژن ATP',
        'افزایش حجم سلولی و هیدراتاسیون مفید داخل عضلات',
        'بهبود رکوردها و افزایش استقامت در ست‌های سنگین تمرینی'
      ];
    }
    if (titleLower.includes('c4') || titleLower.includes('پمپ') || titleLower.includes('pre-workout') || titleLower.includes('preworkout')) {
      return [
        'ایجاد دم عضلانی شدید (Muscle Pump) با افزایش نیتریک اکساید خون',
        'تاخیر چشمگیر در بروز خستگی و سوزش عضلانی حین تمرین',
        'افزایش حداکثری انگیزه و تمرکز ذهنی ورزشکار'
      ];
    }
    if (titleLower.includes('gainer') || titleLower.includes('گینر') || titleLower.includes('mass')) {
      return [
        'افزایش اصولی وزن و حجم عضلانی در افراد لاغراندام',
        'بازسازی سریع ذخایر گلیکوژن عضلانی پس از تمرین',
        'تامین انرژی پایدار در طول روز بدون افت قند خون'
      ];
    }
    if (titleLower.includes('collagen') || titleLower.includes('biotin') || titleLower.includes('کلاژن') || titleLower.includes('بیوتین')) {
      return [
        'افزایش خاصیت کشسانی و رطوبت طبیعی لایه‌های پوست',
        'کاهش ریزش مو و تقویت استحکام و ضخامت تارهای مو و ناخن',
        'کمک به حفظ سلامت مفاصل و تاندون‌های بدن'
      ];
    }
    if (titleLower.includes('omega') || titleLower.includes('امگا')) {
      return [
        'تقویت سلامت قلب و عروق و کمک به تنظیم چربی خون',
        'کاهش التهابات مفصلی و بازیابی تاندون‌ها پس از تمرین',
        'بهبود عملکرد شناختی، حافظه و تمرکز ذهنی'
      ];
    }
    if (titleLower.includes('multi') || titleLower.includes('مولتی') || titleLower.includes('vitamin') || titleLower.includes('ویتامین')) {
      return [
        'تقویت سیستم دفاعی بدن و محافظت در برابر خستگی مفرط',
        'افزایش سطح انرژی روزانه و بهبود متابولیسم طبیعی',
        'تامین ۱۰۰٪ نیاز روزانه به ریزمغذی‌های ضروری'
      ];
    }
    return [
      'افزایش شادابی، انرژی و حفظ سلامت عمومی بدن در طول روز',
      'حفظ بالاترین راندمان زیستی با فرمولاسیون تخصصی و جذب بهینه',
      'مناسب برای استفاده منظم ورزشکاران و علاقه‌مندان به تناسب اندام'
    ];
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn font-['Vazirmatn',sans-serif]">
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
            {product.badge && (
              <span className="text-[11px] bg-sky-50 text-sky-800 font-extrabold px-2.5 py-1 rounded-full border border-sky-200">
                {product.badge}
              </span>
            )}
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* INTERACTIVE GALLERY & HOVER ZOOM LENS */}
          {/* ------------------------------------------------------------------ */}
          <div className="space-y-3 select-none">
            {/* Main Stage with Hover Zoom Lens (Desktop) & Tap-to-Expand (Mobile) */}
            <div
              ref={imageContainerRef}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onMouseMove={handleMouseMove}
              onClick={() => openLightbox()}
              className="relative w-full h-56 sm:h-64 bg-slate-50 rounded-[22px] border border-slate-200/90 overflow-hidden flex items-center justify-center p-2 shadow-inner group cursor-zoom-in"
            >
              <img
                src={selectedImage || fallbackImg}
                alt={product.title}
                referrerPolicy="no-referrer"
                style={{
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transform: isHovered ? 'scale(2.2)' : 'scale(1)'
                }}
                className="w-full h-full object-contain object-center rounded-[18px] transition-transform duration-100 ease-out will-change-transform"
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

              {/* Desktop Hover Hint Pill */}
              <div className={`absolute bottom-2.5 right-2.5 hidden sm:flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full pointer-events-none transition-opacity duration-200 ${
                isHovered ? 'opacity-20' : 'opacity-90'
              }`}>
                <ZoomIn className="w-3 h-3 text-amber-400" />
                <span>بزرگنمایی با حرکت موس</span>
              </div>

              {/* Maximize Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox();
                }}
                className="absolute top-2.5 left-2.5 bg-white/90 hover:bg-white text-slate-800 p-1.5 rounded-xl shadow-xs border border-slate-200 transition cursor-pointer z-10"
                title="مشاهده تمام صفحه"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-700" />
              </button>
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

          {/* PRODUCT TITLE */}
          <div className="space-y-1">
            <h2 className="font-black text-base sm:text-lg text-slate-900 leading-snug">
              {product.title}
            </h2>
          </div>

          {/* TRANSPARENT PRICING & WEIGHT BREAKDOWN */}
          <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-[20px] p-3.5 space-y-2.5">
            {isLocal ? (
              <>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-bold flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    محل تحویل کالا:
                  </span>
                  <span className="font-black text-emerald-700 font-extrabold">موجود در ایران (تحویل فوری ۲۴ الی ۴۸ ساعته)</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                  <span className="font-bold flex items-center gap-1">
                    <Weight className="w-3.5 h-3.5 text-sky-600" />
                    مدت زمان ارسال:
                  </span>
                  <span className="font-black text-slate-800">⚡ تحویل فوری درب منزل ۲۴ الی ۴۸ ساعته</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-bold flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    قیمت پایه در دبی:
                  </span>
                  <div className="font-black text-slate-900 dir-ltr flex items-center gap-1.5">
                    {originalPriceAed && originalPriceAed > currentPriceAed && (
                      <span className="line-through text-slate-400 text-[11px]">
                        {formatAed(originalPriceAed)}
                      </span>
                    )}
                    <span className="text-emerald-700 font-black">{formatAed(currentPriceAed)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                  <span className="font-bold flex items-center gap-1">
                    <Weight className="w-3.5 h-3.5 text-sky-600" />
                    نوع ارسال و تحویل:
                  </span>
                  <span className="font-black text-slate-800">ارسال سفارشی از دبی (تحویل ۷ الی ۱۴ روز کاری درب منزل)</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
              <span className="font-extrabold text-xs text-slate-900">
                قیمت نهایی تحویل فوری:
              </span>
              <span className="font-black text-sm sm:text-base text-[#D31027]">
                {formatToman(totalToman)}
              </span>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* 3. STRUCTURED PRODUCT DESCRIPTION CARDS (2 CLEAN BOXES) */}
          {/* ------------------------------------------------------------------ */}
          <div className="space-y-3 pt-1">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>مشخصات و مزایای برجسته محصول</span>
            </h3>

            {/* Box 1: ترکیبات و فرمولاسیون (Ingredients & Composition) */}
            <div className="bg-sky-50/60 border border-sky-200/90 rounded-2xl p-3.5 space-y-2 text-right">
              <div className="flex items-center gap-1.5 text-sky-950 font-black text-xs border-b border-sky-100 pb-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                <span>ترکیبات و فرمولاسیون (Ingredients & Composition)</span>
              </div>
              <div className="space-y-1.5">
                {getCompositionBullets().map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1.5 shrink-0"></span>
                    <span className="leading-relaxed font-medium">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 2: کارایی و عملکرد (Key Benefits & Usage) */}
            <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-3.5 space-y-2 text-right">
              <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs border-b border-amber-100 pb-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>کارایی و عملکرد (Key Benefits & Usage)</span>
              </div>
              <div className="space-y-1.5">
                {getPerformanceBullets().map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0"></span>
                    <span className="leading-relaxed font-medium">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* CONCISE 1-LINE AUTHENTICITY & GUARANTEE VERIFICATION BADGE */}
            {/* ------------------------------------------------------------------ */}
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl py-2.5 px-3.5 flex items-center justify-center gap-2 text-emerald-800 text-xs sm:text-sm font-bold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>✓ تضمین ۱۰۰٪ اصالت کالا و ارسال مستقیم و اورجینال</span>
            </div>
          </div>

          {/* FLAVOR & SIZE SELECTORS */}
          {(() => {
            const validFlavors = extractedFlavors;
            const validSizes = extractedSizes;

            if (validFlavors.length === 0 && validSizes.length === 0) return null;

            return (
              <div className="space-y-3 pt-1 border-t border-slate-100">
                {/* Flavor Selector */}
                {validFlavors.length > 0 && (
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-slate-900 block">
                      انتخاب طعم (Flavor):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {validFlavors.map((flv) => (
                        <button
                          key={flv}
                          type="button"
                          onClick={() => setSelectedFlavor(flv)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                            selectedFlavor === flv
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {flv}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Selector */}
                {validSizes.length > 0 && (
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-slate-900 block">
                      انتخاب حجم / تعداد (Size):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {validSizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                            selectedSize === sz
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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

            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleAdd();
              }}
              className="w-full bg-slate-900 hover:bg-[#D31027] text-white font-black py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isAdded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
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

      {/* ------------------------------------------------------------------ */}
      {/* LIGHTBOX FULLSCREEN MODAL (MOBILE TAP & DESKTOP EXPAND) */}
      {/* ------------------------------------------------------------------ */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-fadeIn select-none"
        >
          {/* Top Controls Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white z-10 pt-2 px-2">
            <span className="text-xs sm:text-sm font-bold bg-white/10 px-3 py-1 rounded-full">
              تصویر {toPersianDigits(lightboxIndex + 1)} از {toPersianDigits(galleryList.length || 1)}
            </span>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              title="بستن تصویر"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Stage with Zoom Toggle */}
          <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center overflow-hidden my-auto">
            {galleryList.length > 1 && (
              <button
                onClick={handleLightboxPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white transition cursor-pointer z-10"
                title="تصویر قبلی"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={galleryList[lightboxIndex] || selectedImage || fallbackImg}
              alt={product.title}
              referrerPolicy="no-referrer"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxZoom(!lightboxZoom);
              }}
              style={{
                transform: lightboxZoom ? 'scale(2.2)' : 'scale(1)',
                cursor: lightboxZoom ? 'zoom-out' : 'zoom-in'
              }}
              className="max-h-[75vh] max-w-[90vw] object-contain transition-transform duration-300 rounded-2xl will-change-transform"
            />

            {galleryList.length > 1 && (
              <button
                onClick={handleLightboxNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white transition cursor-pointer z-10"
                title="تصویر بعدی"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Zoom & Details Hint */}
          <div className="text-center text-slate-300 text-xs py-2">
            <span>برای بزرگنمایی روی تصویر کلیک یا تپ کنید</span>
          </div>
        </div>
      )}
    </>
  );
};
