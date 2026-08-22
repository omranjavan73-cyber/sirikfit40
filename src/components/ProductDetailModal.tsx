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
  ChevronRight,
  Loader2
} from 'lucide-react';
import type { FinancialSettings, ProductVariantMatrix, ProductVariantItem } from '../types';
import { formatToman, formatAed, formatPrice, toPersianDigits, getEffectiveAedRate, deduplicateImageUrls } from '../utils/formatters';
import { formatPersianSize, translateFlavor, generatePersianProductCaption } from '../utils/supplementLocalization';
import { TouchImageMagnifier } from './TouchImageMagnifier';

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
  variantMatrix?: ProductVariantMatrix;
  variantGroups?: any[];
  variants?: {
    id: string;
    flavor?: string;
    size?: string;
    priceAed?: number;
    priceAED?: number;
    priceToman?: number;
    weightKg?: number;
    image?: string;
    imageThumbnail?: string;
    inStock?: boolean;
    url?: string;
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
  const [activeProduct, setActiveProduct] = useState<ProductDetailModalProduct | null>(product);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  const [selectedFlavor, setSelectedFlavor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isVariantLoading, setIsVariantLoading] = useState<boolean>(false);

  // Synchronize activeProduct when prop changes
  useEffect(() => {
    setActiveProduct(product);
  }, [product]);

  const currentProd = activeProduct || product;

  // Interactive Hover Zoom Lens States (Desktop)
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Lightbox Modal States (Mobile tap & Desktop expand)
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxZoom, setLightboxZoom] = useState<boolean>(false);

  // Gallery list construction
  const rawList = currentProd ? (currentProd.images || currentProd.galleryImages || (currentProd.image ? [currentProd.image] : [])) : [];
  const fallbackImg = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600';
  
  const galleryList = deduplicateImageUrls(rawList, currentProd?.image || fallbackImg);

  // Derive flavors and sizes from currentProd.variantMatrix or currentProd.flavors/sizes or currentProd.variantGroups/variants
  const extractedFlavors = useMemo(() => {
    if (!currentProd) return [];
    const rawFlavors = (currentProd.variantMatrix?.flavors && currentProd.variantMatrix.flavors.length > 0)
      ? currentProd.variantMatrix.flavors
      : (Array.isArray(currentProd.flavors) && currentProd.flavors.length > 0)
        ? currentProd.flavors
        : [];
    
    if (rawFlavors.length > 0) {
      return rawFlavors.map((f: any) => {
        const name = typeof f === 'string' ? f : (f?.flavor || f?.name || '');
        return String(name).trim();
      }).filter(f => f && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal'].includes(f.toLowerCase()));
    }

    const flavorGroup = currentProd.variantGroups?.find((g: any) => g.type === 'flavor' || g.id === 'flavors' || (g.name && (g.name.includes('طعم') || g.name.toLowerCase().includes('flavor'))));
    if (flavorGroup && Array.isArray(flavorGroup.options)) {
      return flavorGroup.options.map((opt: any) => typeof opt === 'string' ? opt : (opt.name || opt.label || '')).filter(Boolean);
    }
    return [];
  }, [currentProd]);

  const extractedSizes = useMemo(() => {
    if (!currentProd) return [];
    const rawSizes = (currentProd.variantMatrix?.sizes && currentProd.variantMatrix.sizes.length > 0)
      ? currentProd.variantMatrix.sizes
      : (Array.isArray(currentProd.sizes) && currentProd.sizes.length > 0)
        ? currentProd.sizes
        : [];

    if (rawSizes.length > 0) {
      return rawSizes.map((s: any) => {
        const name = typeof s === 'string' ? s : (s?.size || s?.name || '');
        return String(name).trim();
      }).filter(s => s && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal'].includes(s.toLowerCase()));
    }

    const sizeGroup = currentProd.variantGroups?.find((g: any) => g.type === 'size' || g.id === 'sizes' || (g.name && (g.name.includes('وزن') || g.name.includes('سایز') || g.name.toLowerCase().includes('size'))));
    if (sizeGroup && Array.isArray(sizeGroup.options)) {
      return sizeGroup.options.map((opt: any) => typeof opt === 'string' ? opt : (opt.name || opt.label || '')).filter(Boolean);
    }
    return [];
  }, [currentProd]);

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
  }, [product]);

  // Find selected variant details from variantMatrix or currentProd.variants
  const matchedVariant = useMemo(() => {
    if (!currentProd) return null;
    if (currentProd.variantMatrix?.items && currentProd.variantMatrix.items.length > 0) {
      if (selectedSize && selectedFlavor) {
        const exact = currentProd.variantMatrix.items.find(
          v => (v.size === selectedSize || v.title?.toLowerCase().includes(selectedSize.toLowerCase())) &&
               (v.flavor === selectedFlavor || v.title?.toLowerCase().includes(selectedFlavor.toLowerCase()))
        );
        if (exact) return exact;
      }
      if (selectedSize) {
        const sizeMatch = currentProd.variantMatrix.items.find(
          v => v.size === selectedSize || v.title === selectedSize || v.title?.toLowerCase().includes(selectedSize.toLowerCase())
        );
        if (sizeMatch) return sizeMatch;
      }
      if (selectedFlavor) {
        const flavorMatch = currentProd.variantMatrix.items.find(
          v => v.flavor === selectedFlavor || v.title === selectedFlavor || v.title?.toLowerCase().includes(selectedFlavor.toLowerCase())
        );
        if (flavorMatch) return flavorMatch;
      }
    }

    return currentProd.variants?.find(v => 
      (selectedSize && selectedFlavor && v.size === selectedSize && v.flavor === selectedFlavor) ||
      (selectedSize && v.size === selectedSize) || 
      (selectedFlavor && v.flavor === selectedFlavor)
    );
  }, [currentProd, selectedSize, selectedFlavor]);

  // Synchronize variant-specific image immediately upon variant selection
  useEffect(() => {
    if (matchedVariant?.image && matchedVariant.image !== selectedImage) {
      setSelectedImage(matchedVariant.image);
    }
  }, [matchedVariant?.image]);

  const localizedCaption = useMemo(() => {
    if (!currentProd) return '';
    return generatePersianProductCaption({
      title: currentProd.title,
      selectedFlavor: selectedFlavor || undefined,
      selectedSize: selectedSize || undefined
    });
  }, [currentProd?.title, selectedFlavor, selectedSize]);

  if (!isOpen || !currentProd) return null;

  const isLocal = currentProd.isLocalInventory === true || currentProd.storeName?.includes('انبار ایران') || currentProd.brand?.includes('انبار ایران');
  const basePriceAed = currentProd.priceAed || 100;
  const baseWeightKg = currentProd.weightKg || 0.5;
  const originalPriceAed = currentProd.originalPriceAed;
  
  // Rate & Financial parameters
  const activeAedRate = getEffectiveAedRate(settings) || settings?.aedRate || 55000;
  const cargoRatePerKg = settings?.cargoRatePerKg || 35;
  const effectiveMargin = (currentProd.profitMargin !== undefined && currentProd.profitMargin !== null && !isNaN(Number(currentProd.profitMargin)))
    ? Number(currentProd.profitMargin)
    : ((currentProd.marginPercent !== undefined && currentProd.marginPercent !== null && !isNaN(Number(currentProd.marginPercent)))
      ? Number(currentProd.marginPercent)
      : (settings?.profitMargin || 20));

  const currentPriceAed = (matchedVariant as any)?.priceAED ?? (matchedVariant as any)?.priceAed ?? basePriceAed;
  const currentWeightKg = (matchedVariant as any)?.weightKg || baseWeightKg;

  // Single Source of Truth for Unit Price (Toman):
  let unitToman: number;
  if ((matchedVariant as any)?.priceToman && (matchedVariant as any).priceToman > 0) {
    unitToman = (matchedVariant as any).priceToman;
  } else if ((matchedVariant as any)?.priceAed && (matchedVariant as any).priceAed !== basePriceAed) {
    const shippingFee = (currentWeightKg * cargoRatePerKg) * activeAedRate;
    unitToman = Math.round((currentPriceAed * activeAedRate * (1 + effectiveMargin / 100) + shippingFee) / 1000) * 1000;
  } else if (currentProd.priceToman && currentProd.priceToman > 0) {
    unitToman = currentProd.priceToman;
  } else if (currentProd.calculatedTomanOverride && currentProd.calculatedTomanOverride > 0) {
    unitToman = currentProd.calculatedTomanOverride;
  } else {
    const shippingFee = (baseWeightKg * cargoRatePerKg) * activeAedRate;
    unitToman = Math.round((basePriceAed * activeAedRate * (1 + effectiveMargin / 100) + shippingFee) / 1000) * 1000;
  }

  const discountVal = (originalPriceAed && originalPriceAed > currentPriceAed)
    ? Math.round(((originalPriceAed - currentPriceAed) / originalPriceAed) * 100)
    : (currentProd.discountPercent || 0);

  const totalToman = unitToman * quantity;

  // Handler to fetch on-demand variant when user clicks a variant with a distinct URL
  const handleVariantSelect = async (newFlavor?: string, newSize?: string) => {
    const targetFlavor = newFlavor !== undefined ? newFlavor : selectedFlavor;
    const targetSize = newSize !== undefined ? newSize : selectedSize;

    if (newFlavor !== undefined) setSelectedFlavor(newFlavor);
    if (newSize !== undefined) setSelectedSize(newSize);

    // Look for target variant item with a distinct url
    let targetVariantUrl: string | undefined;

    if (currentProd.variantMatrix?.items && currentProd.variantMatrix.items.length > 0) {
      const match = currentProd.variantMatrix.items.find(v => {
        const matchSize = !targetSize || v.size === targetSize || v.title?.toLowerCase().includes(targetSize.toLowerCase());
        const matchFlavor = !targetFlavor || v.flavor === targetFlavor || v.title?.toLowerCase().includes(targetFlavor.toLowerCase());
        return matchSize && matchFlavor;
      }) || currentProd.variantMatrix.items.find(v => {
        if (targetSize && (v.size === targetSize || v.title === targetSize)) return true;
        if (targetFlavor && (v.flavor === targetFlavor || v.title === targetFlavor)) return true;
        return false;
      });

      if (match?.url) {
        targetVariantUrl = match.url;
      }
    }

    if (!targetVariantUrl && Array.isArray(currentProd.variants)) {
      const vMatch = currentProd.variants.find(v => {
        const matchSize = !targetSize || v.size === targetSize;
        const matchFlavor = !targetFlavor || v.flavor === targetFlavor;
        return matchSize && matchFlavor;
      });
      if (vMatch?.url) {
        targetVariantUrl = vMatch.url;
      }
    }

    // Also check dimensions options for url
    if (!targetVariantUrl && Array.isArray((currentProd as any).dimensions)) {
      for (const dim of (currentProd as any).dimensions) {
        for (const opt of dim.options || []) {
          if ((opt.name === targetFlavor || opt.name === targetSize) && opt.url) {
            targetVariantUrl = opt.url;
            break;
          }
        }
        if (targetVariantUrl) break;
      }
    }

    if (targetVariantUrl && targetVariantUrl !== currentProd.url && targetVariantUrl.startsWith('http')) {
      try {
        setIsVariantLoading(true);
        const res = await fetch('/api/parse-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetVariantUrl })
        });
        if (res.ok) {
          const data = await res.json();
          const parsed = data.product || data;
          if (parsed && (parsed.priceAed || parsed.priceAED)) {
            const newPrice = parsed.priceAed || parsed.priceAED;
            const newOrig = parsed.originalPriceAed || parsed.originalPriceAED;
            const newImg = parsed.image || (parsed.images && parsed.images[0]) || (parsed.galleryImages && parsed.galleryImages[0]);
            
            setActiveProduct(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                ...parsed,
                url: targetVariantUrl,
                priceAed: newPrice,
                originalPriceAed: newOrig || prev.originalPriceAed,
                image: newImg || prev.image,
                images: parsed.images || parsed.galleryImages || prev.images,
                galleryImages: parsed.galleryImages || prev.galleryImages,
                variantMatrix: parsed.variantMatrix || prev.variantMatrix
              };
            });

            if (newImg) {
              setSelectedImage(newImg);
            }
          }
        }
      } catch (err) {
        console.warn('Could not lazy-load variant URL:', err);
      } finally {
        setIsVariantLoading(false);
      }
    }
  };

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
          className="bg-white rounded-[28px] max-w-lg w-full p-5 sm:p-6 shadow-2xl relative space-y-5 border border-slate-100 max-h-[92vh] overflow-y-auto text-right dir-rtl pb-28 sm:pb-6"
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
          {/* INTERACTIVE GALLERY & TOUCH/HOVER MAGNIFIER */}
          {/* ------------------------------------------------------------------ */}
          <div className="space-y-3 select-none">
            {/* Main Stage with Interactive Touch Magnifier & Desktop Hover Lens */}
            <TouchImageMagnifier
              src={selectedImage || fallbackImg}
              alt={product.title}
              fallbackSrc={fallbackImg}
              onExpandFullscreen={() => openLightbox()}
              zoomScale={2.4}
              className="h-56 sm:h-64 bg-slate-50 rounded-[22px] border border-slate-200/90 p-2 shadow-inner"
              imageClassName="rounded-[18px]"
            />

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
              {localizedCaption || product.title}
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
                  <span className="font-black text-emerald-700 font-extrabold">{product.badge || 'موجود در انبار ایران (تحویل فوری)'}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                  <span className="font-bold flex items-center gap-1">
                    <Weight className="w-3.5 h-3.5 text-sky-600" />
                    نوع و مدت زمان ارسال:
                  </span>
                  <span className="font-black text-slate-800">{product.deliveryBadge || product.badge || '⚡ ارسال فوری (پست پیشتاز / تیپاکس)'}</span>
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
                    {isVariantLoading ? (
                      <span className="flex items-center gap-1 text-slate-400 text-xs animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>در حال استعلام...</span>
                      </span>
                    ) : (
                      <>
                        {originalPriceAed && originalPriceAed > currentPriceAed && (
                          <span className="line-through text-slate-400 text-[11px]">
                            {formatAed(originalPriceAed)}
                          </span>
                        )}
                        <span className="text-emerald-700 font-black">{formatAed(currentPriceAed)}</span>
                      </>
                    )}
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
                {isLocal ? 'قیمت نهایی تحویل فوری:' : 'قیمت نهایی تحویل در ایران:'}
              </span>
              <div className="flex items-baseline gap-1 text-red-600 font-black text-sm sm:text-base whitespace-nowrap">
                {isVariantLoading ? (
                  <span className="flex items-center gap-1 text-slate-400 text-xs animate-pulse font-normal">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D31027]" />
                    <span>محاسبه مجدد...</span>
                  </span>
                ) : (
                  <>
                    <span>{formatPrice(totalToman)}</span>
                    <span className="text-[11px] sm:text-xs font-bold">تومان</span>
                  </>
                )}
              </div>
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
                      {validFlavors.map((flv) => {
                        const itemMatch = currentProd.variantMatrix?.items?.find(it => it.flavor === flv || it.title === flv || it.name === flv);
                        const isAvailable = itemMatch ? itemMatch.inStock !== false : true;
                        const itemPrice = itemMatch ? (itemMatch.priceAED ?? itemMatch.priceAed) : null;
                        const hasDiffPrice = itemPrice && itemPrice > 0 && itemPrice !== basePriceAed;
                        const isSelected = selectedFlavor === flv;
                        const translated = translateFlavor(flv);

                        return (
                          <button
                            key={flv}
                            type="button"
                            disabled={!isAvailable || isVariantLoading}
                            onClick={() => handleVariantSelect(flv, undefined)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                              !isAvailable
                                ? 'bg-slate-100/80 text-slate-400 border-slate-200 cursor-not-allowed opacity-50 line-through'
                                : isVariantLoading
                                ? 'opacity-60 cursor-wait bg-slate-50 text-slate-500 border-slate-200'
                                : isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs cursor-pointer'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400 cursor-pointer'
                            }`}
                          >
                            <span>{translated}</span>
                            {!isAvailable && (
                              <span className="text-[10px] text-rose-500 font-normal no-underline mr-0.5">
                                (ناموجود)
                              </span>
                            )}
                            {isAvailable && hasDiffPrice && (
                              <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                ({itemPrice} AED)
                              </span>
                            )}
                          </button>
                        );
                      })}
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
                      {validSizes.map((sz) => {
                        const itemMatch = currentProd.variantMatrix?.items?.find(it => it.size === sz || it.title === sz || it.name === sz);
                        const isAvailable = itemMatch ? itemMatch.inStock !== false : true;
                        const itemPrice = itemMatch ? (itemMatch.priceAED ?? itemMatch.priceAed) : null;
                        const hasDiffPrice = itemPrice && itemPrice > 0 && itemPrice !== basePriceAed;
                        const isSelected = selectedSize === sz;
                        const formattedSize = formatPersianSize(sz);

                        return (
                          <button
                            key={sz}
                            type="button"
                            disabled={!isAvailable || isVariantLoading}
                            onClick={() => handleVariantSelect(undefined, sz)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                              !isAvailable
                                ? 'bg-slate-100/80 text-slate-400 border-slate-200 cursor-not-allowed opacity-50 line-through'
                                : isVariantLoading
                                ? 'opacity-60 cursor-wait bg-slate-50 text-slate-500 border-slate-200'
                                : isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs cursor-pointer'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400 cursor-pointer'
                            }`}
                          >
                            <span>{formattedSize}</span>
                            {!isAvailable && (
                              <span className="text-[10px] text-rose-500 font-normal no-underline mr-0.5">
                                (ناموجود)
                              </span>
                            )}
                            {isAvailable && hasDiffPrice && (
                              <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                ({itemPrice} AED)
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Ultra-Compact Bottom Action Dock */}
          <div className="w-full flex items-center gap-2 pt-2 pb-6 sm:pb-2 px-2 max-w-lg mx-auto">
            {/* Compact Quantity Counter */}
            <div className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 px-2 py-1.5 gap-2 shadow-xs">
              <button 
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-7 flex items-center justify-center text-base font-bold text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 cursor-pointer"
              >
                -
              </button>
              <span className="text-xs font-black text-gray-900 dark:text-white min-w-[16px] text-center dir-ltr">
                {toPersianDigits(quantity)}
              </span>
              <button 
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 flex items-center justify-center text-base font-bold text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Compact Add to Cart Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAdd();
              }}
              className="flex-1 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-xs transition-all cursor-pointer"
            >
              {isAdded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>به سبد خرید اضافه شد!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 text-white"/>
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
