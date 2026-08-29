import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ShoppingCart,
  ShieldCheck,
  Check,
  CheckCircle2,
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
  Loader2,
  AlertCircle
} from 'lucide-react';
import type { FinancialSettings, ProductVariantMatrix, ProductVariantItem } from '../types';
import { formatToman, formatAed, formatPrice, toPersianDigits, getEffectiveAedRate, deduplicateImageUrls, getStoreBadgeTheme, sanitizeVariantLabel, isArtificialFallback } from '../utils/formatters';
import { formatPersianSize, translateFlavor, generatePersianProductCaption } from '../utils/supplementLocalization';
import { getActivePrices } from '../utils/pricingCalculator';
import {
  getActiveVariants,
  getAllFlavors,
  getAllSizes,
  getAvailableSizesForFlavor,
  findExactVariant,
  isFlavorAvailable,
  isSizeAvailableForFlavor,
  handleFlavorChange,
  handleSizeChange,
  areVariantsMatching
} from '../utils/variantMatrixEngine';
import {
  isMatchVariant,
  matchVariantAttr,
  cleanVariantKey,
  resolveCompoundVariant,
  resolveVariantHeroImage
} from '../utils/variantHelpers';
import { TouchImageMagnifier } from './TouchImageMagnifier';
import { MetaTags } from './seo/MetaTags';

export interface ProductDetailModalProduct {
  id?: string;
  title: string;
  englishTitle?: string;
  url?: string;
  priceAed: number;
  price?: number;
  originalPriceAed?: number;
  priceToman?: number;
  originalPriceToman?: number;
  calculatedTomanOverride?: number;
  profitMargin?: number;
  marginPercent?: number;
  isLocalInventory?: boolean;
  isIranWarehouse?: boolean;
  discountPercent?: number;
  weightKg?: number;
  image?: string;
  images?: string[];
  galleryImages?: string[];
  sourceUrl?: string;
  storeName?: string;
  brand?: string;
  category?: string;
  description?: string;
  specifications?: any;
  badge?: string;
  deliveryBadge?: string;
  flavors?: string[];
  allowedFlavors?: any[];
  sizes?: string[];
  allowedSizes?: any[];
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

export interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDetailModalProduct | null;
  settings: FinancialSettings;
  onAddToCart: (product: any, selectedFlavor?: string | null, selectedSize?: string | null) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  settings,
  onAddToCart
}) => {
  const [activeProduct, setActiveProduct] = useState<ProductDetailModalProduct | null>(product);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
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

  // Derive active variants from current product
  const activeVariants = useMemo(() => {
    return getActiveVariants(currentProd?.variants);
  }, [currentProd?.variants]);

  // Dynamically extract unique selectable chips from product.variants[] using raw strings
  const availableFlavors = useMemo(() => {
    const list = currentProd?.variants || product?.variants || [];
    const fromVariants = list.map((v: any) => v.flavor?.trim()).filter(Boolean);
    if (fromVariants.length > 0) {
      const unique: string[] = [];
      for (const flv of fromVariants) {
        if (!unique.some(u => isMatchVariant(u, flv))) {
          unique.push(flv);
        }
      }
      return unique;
    }
    const fromFlavors = (currentProd?.flavors || product?.flavors || currentProd?.allowedFlavors || [])
      .map((f: any) => (typeof f === 'string' ? f.trim() : f?.flavor || f?.name || '').trim())
      .filter(Boolean);
    return Array.from(new Set(fromFlavors));
  }, [currentProd?.variants, product?.variants, currentProd?.flavors, product?.flavors]);

  const availableSizes = useMemo(() => {
    const list = currentProd?.variants || product?.variants || [];
    const fromVariants = list.map((v: any) => v.size?.trim()).filter(Boolean);
    if (fromVariants.length > 0) {
      const unique: string[] = [];
      for (const sz of fromVariants) {
        if (!unique.some(u => isMatchVariant(u, sz))) {
          unique.push(sz);
        }
      }
      return unique;
    }
    const fromSizes = (currentProd?.sizes || product?.sizes || currentProd?.allowedSizes || [])
      .map((s: any) => (typeof s === 'string' ? s.trim() : s?.size || s?.name || '').trim())
      .filter(Boolean);
    return Array.from(new Set(fromSizes));
  }, [currentProd?.variants, product?.variants, currentProd?.sizes, product?.sizes]);

  // Sizes available specifically for the currently selected flavor
  const sizesForFlavor = useMemo(() => {
    const list = currentProd?.variants || product?.variants || [];
    if (!selectedFlavor || list.length === 0) return availableSizes;
    const matching = list
      .filter((v: any) => isMatchVariant(v.flavor, selectedFlavor))
      .map((v: any) => v.size?.trim())
      .filter(Boolean);
    if (matching.length === 0) return availableSizes;
    const unique: string[] = [];
    for (const sz of matching) {
      if (!unique.some(u => isMatchVariant(u, sz))) {
        unique.push(sz);
      }
    }
    return unique;
  }, [currentProd?.variants, product?.variants, selectedFlavor, availableSizes]);

  useEffect(() => {
    if (product) {
      const variantsList = product.variants || [];
      const flavorsList: string[] = [];
      const sizesList: string[] = [];
      variantsList.forEach((v: any) => {
        if (v.flavor && !flavorsList.some(f => isMatchVariant(f, v.flavor))) {
          flavorsList.push(v.flavor.trim());
        }
        if (v.size && !sizesList.some(s => isMatchVariant(s, v.size))) {
          sizesList.push(v.size.trim());
        }
      });

      const initialFlavor = product.selectedFlavor?.trim()
        || flavorsList[0]
        || (product.flavors?.[0] ? String(product.flavors[0]).trim() : null);

      const matchingSizes = variantsList
        .filter((v: any) => isMatchVariant(v.flavor, initialFlavor))
        .map((v: any) => v.size?.trim())
        .filter(Boolean);

      const initialSize = product.selectedSize?.trim()
        || matchingSizes[0]
        || sizesList[0]
        || (product.sizes?.[0] ? String(product.sizes[0]).trim() : null);

      setSelectedFlavor(initialFlavor);
      setSelectedSize(initialSize);
      setSelectedGalleryImage(null);
      setQuantity(1);
      setIsAdded(false);
      setIsHovered(false);
      setIsLightboxOpen(false);
    }
  }, [product]);

  // 1. Exact Match: Variant matching both selected flavor AND size
  const exactVariant = useMemo(() => {
    const list = currentProd?.variants || product?.variants || [];
    return list.find(
      (v: any) => matchVariantAttr(v.flavor, selectedFlavor) && matchVariantAttr(v.size, selectedSize)
    ) || null;
  }, [currentProd?.variants, product?.variants, selectedFlavor, selectedSize]);

  // 2. Flavor Match: Any variant with matching flavor containing an image
  const flavorVariant = useMemo(() => {
    const list = currentProd?.variants || product?.variants || [];
    return list.find(
      (v: any) => matchVariantAttr(v.flavor, selectedFlavor) && ((v.image && v.image.trim() !== '') || ((v as any).imageUrl && (v as any).imageUrl.trim() !== ''))
    ) || null;
  }, [currentProd?.variants, product?.variants, selectedFlavor]);

  // Active variant for pricing and specifications: exact -> flavor match -> compound resolution -> first
  const activeVariant = useMemo(() => {
    if (exactVariant) return exactVariant;
    const list = currentProd?.variants || product?.variants || [];
    return resolveCompoundVariant(list, selectedFlavor, selectedSize);
  }, [exactVariant, currentProd?.variants, product?.variants, selectedFlavor, selectedSize]);

  // 3. Fallback resolution: Gallery Override -> Exact Variant Image Link -> Flavor Variant Image Link -> Size Variant Image Link -> Product Main Image -> Placeholder
  const resolvedHeroImage = useMemo(() => {
    if (selectedGalleryImage && selectedGalleryImage.trim() !== '') {
      return selectedGalleryImage.trim();
    }
    const list = currentProd?.variants || product?.variants || [];
    const fallback = (currentProd?.image && currentProd.image.trim() !== '')
      ? currentProd.image.trim()
      : (product?.image && product.image.trim() !== '')
      ? product.image.trim()
      : '/placeholder-supplement.png';

    return resolveVariantHeroImage(list, selectedFlavor, selectedSize, fallback);
  }, [selectedGalleryImage, currentProd?.variants, product?.variants, selectedFlavor, selectedSize, currentProd?.image, product?.image]);

  const activeHeroImage = resolvedHeroImage;

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
  const basePriceAed = currentProd.priceAed || currentProd.price || 0;
  const baseWeightKg = currentProd.weightKg || 0.5;
  const originalPriceAed = currentProd.originalPriceAed;
  const isAvailable = activeVariant ? (activeVariant as any).inStock !== false : ((currentProd as any).inStock !== false);
  
  // Rate & Financial parameters
  const activeAedRate = getEffectiveAedRate(settings) || settings?.aedRate || 55000;
  const cargoRatePerKg = settings?.cargoRatePerKg || 35;
  const effectiveMargin = (currentProd.profitMargin !== undefined && currentProd.profitMargin !== null && !isNaN(Number(currentProd.profitMargin)))
    ? Number(currentProd.profitMargin)
    : ((currentProd.marginPercent !== undefined && currentProd.marginPercent !== null && !isNaN(Number(currentProd.marginPercent)))
      ? Number(currentProd.marginPercent)
      : (settings?.profitMargin || 20));

  // Centralized Single Source of Truth for Dynamic Variant Pricing
  const activePricing = useMemo(() => {
    return getActivePrices({
      product: currentProd,
      selectedFlavorName: selectedFlavor,
      selectedSizeName: selectedSize,
      settings: {
        aedRate: activeAedRate,
        cargoRatePerKg: cargoRatePerKg,
        profitMargin: effectiveMargin
      }
    });
  }, [currentProd, selectedFlavor, selectedSize, activeAedRate, cargoRatePerKg, effectiveMargin]);

  const currentPriceAed = (activeVariant?.priceAed && Number(activeVariant.priceAed) > 0)
    ? Number(activeVariant.priceAed)
    : (activeVariant?.price && Number(activeVariant.price) > 0)
      ? Number(activeVariant.price)
      : (activePricing.priceAED || currentProd.priceAed || 0);

  const currentWeightKg = activePricing.weightKg;

  const unitToman = (activeVariant?.priceToman && Number(activeVariant.priceToman) > 0)
    ? Number(activeVariant.priceToman)
    : (activePricing.priceToman || currentProd.priceToman || 0);
  const discountVal = (originalPriceAed && originalPriceAed > currentPriceAed)
    ? Math.round(((originalPriceAed - currentPriceAed) / originalPriceAed) * 100)
    : (currentProd.discountPercent || 0);

  const totalToman = unitToman * quantity;

  // Handler to fetch on-demand variant when user clicks a variant with a distinct URL
  const handleVariantSelect = async (newFlavor?: string, newSize?: string) => {
    let targetFlavor = newFlavor !== undefined ? newFlavor : selectedFlavor;
    let targetSize = newSize !== undefined ? newSize : selectedSize;

    if (newFlavor !== undefined) {
      setSelectedFlavor(newFlavor);
      setSelectedGalleryImage(null);

      // Check dependent sizes for this flavor
      const list = currentProd?.variants || product?.variants || [];
      const sizesForThisFlavor = list
        .filter((v: any) => isMatchVariant(v.flavor, newFlavor))
        .map((v: any) => v.size?.trim())
        .filter(Boolean);

      if (sizesForThisFlavor.length > 0 && !sizesForThisFlavor.some(s => isMatchVariant(s, targetSize))) {
        targetSize = sizesForThisFlavor[0];
        setSelectedSize(targetSize);
      }
    }

    if (newSize !== undefined) {
      setSelectedSize(newSize);
      setSelectedGalleryImage(null);
    }

    // Find matching variant
    const list = currentProd?.variants || product?.variants || [];
    const matchingVar = resolveCompoundVariant(list, targetFlavor, targetSize);

    // Look for target variant item with a distinct url
    let targetVariantUrl: string | undefined = matchingVar?.url;

    if (!targetVariantUrl && Array.isArray(currentProd.variants)) {
      const vMatch = currentProd.variants.find(v => {
        const matchSize = !targetSize || isMatchVariant(v.size, targetSize);
        const matchFlavor = !targetFlavor || isMatchVariant(v.flavor, targetFlavor);
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
          if ((isMatchVariant(opt.name, targetFlavor) || isMatchVariant(opt.name, targetSize)) && opt.url) {
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
                priceAed: newPrice,
                originalPriceAed: newOrig,
                image: newImg || prev.image,
                images: parsed.images || prev.images,
                galleryImages: parsed.galleryImages || prev.galleryImages,
                weightKg: parsed.weightKg || prev.weightKg,
                description: parsed.description || prev.description,
                specifications: parsed.specifications || prev.specifications
              };
            });
          }
        }
      } catch (err) {
        console.warn('Failed to parse on-demand variant URL:', err);
      } finally {
        setIsVariantLoading(false);
      }
    }
  };

  const handleTouchMoveLens = (x: number, y: number) => {
    setZoomPos({ x, y });
  };

  const openLightbox = (index?: number) => {
    const targetIdx = index !== undefined ? index : galleryList.indexOf(activeHeroImage);
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
      image: activeHeroImage || product.image || fallbackImg,
      storeName: product.storeName || product.brand || (isLocal ? 'انبار ایران (تحویل فوری)' : 'دبی'),
      brand: product.brand || product.storeName,
      quantity: quantity,
      priceToman: unitToman,
      calculatedToman: unitToman,
      calculatedTomanOverride: unitToman,
      profitMargin: effectiveMargin,
      isLocalInventory: isLocal,
      selectedFlavor: selectedFlavor || null,
      selectedSize: selectedSize || null
    };

    onAddToCart(itemPayload, selectedFlavor || null, selectedSize || null);

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
      <MetaTags product={product} />
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn font-['Vazirmatn',sans-serif]">
        <div 
          className="w-full max-w-lg mx-auto bg-white rounded-3xl p-5 border border-gray-200 shadow-2xl flex flex-col gap-4 text-right relative max-h-[92vh] overflow-y-auto"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button & Origin Badge Row */}
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              title="بستن"
              aria-label="بستن"
            >
              ✕
            </button>
            <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-200">
              {isLocal ? 'موجود در انبار ایران' : 'خرید مستقیم از دبی'}
            </span>
          </div>

          {/* 1. PRODUCT IMAGE CONTAINER */}
          <div className="space-y-3 select-none">
            <div className="relative w-full aspect-square max-h-72 bg-gray-50 rounded-2xl p-4 flex items-center justify-center border border-gray-100 overflow-hidden">
              {/* Dynamic Official Store Badge */}
              {(() => {
                const isIherb = (product.storeName || '').toLowerCase().includes('iherb') || (product.sourceUrl || product.url || '').toLowerCase().includes('iherb');
                const storeTheme = getStoreBadgeTheme(isIherb ? 'iHerb' : (product.storeName || product.brand));
                return (
                  <div className={`absolute top-3 right-3 z-10 ${storeTheme.bg} rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm shadow-sm`}>
                    <span className={`inline-block w-2 h-2 rounded-full ${storeTheme.dot} animate-pulse ml-1.5 shrink-0`} />
                    <span>{storeTheme.name}</span>
                  </div>
                );
              })()}

              <img
                src={activeHeroImage}
                alt={product.title}
                className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = currentProd?.image || product.image || '/placeholder-supplement.png';
                }}
              />

              {/* Single Clean Zoom Button (Bottom Left) */}
              <button 
                type="button" 
                onClick={() => openLightbox()}
                className="absolute bottom-3 left-3 bg-black/60 hover:bg-black/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[10px] font-bold transition-all shadow-xs z-10 cursor-pointer"
                title="بزرگنمایی تصویر"
              >
                <ZoomIn className="w-3.5 h-3.5 text-white" />
                <span>بزرگنمایی</span>
              </button>
            </div>

            {/* Interactive Thumbnails Row (3-5 items) */}
            {galleryList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 dir-ltr justify-center no-scrollbar">
                {galleryList.slice(0, 5).map((imgUrl, idx) => {
                  const isActive = activeHeroImage === imgUrl;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedGalleryImage(imgUrl)}
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 overflow-hidden bg-white shrink-0 transition cursor-pointer ${
                        isActive 
                          ? 'border-red-600 ring-2 ring-red-600/20 shadow-sm scale-105' 
                          : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`تصویر ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
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

          {/* 2. PRODUCT TITLES (Persian & English) */}
          <div className="flex flex-col gap-1 text-right">
            <h1 className="text-base sm:text-lg font-black text-gray-950 leading-snug">
              {localizedCaption || product.title}
            </h1>
            {(product.englishTitle || (product.title && localizedCaption && product.title !== localizedCaption)) && (
              <span className="text-xs font-semibold text-gray-400 dir-ltr text-right">
                {product.englishTitle || product.title}
              </span>
            )}
          </div>

          {/* 3. DYNAMIC VARIANT SELECTOR (Red Active State) */}
          {((availableSizes && availableSizes.length > 0) || (availableFlavors && availableFlavors.length > 0)) && (
            <div className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl flex flex-col gap-3.5">
              
              {/* Size Selector */}
              {availableSizes && availableSizes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-black text-gray-900">
                    انتخاب حجم / بسته‌بندی:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((sz: string, idx: number) => {
                      const isSelected = isMatchVariant(selectedSize, sz);
                      const isAvailable = sizesForFlavor.length === 0 || sizesForFlavor.some((s: any) => isMatchVariant(s, sz));
                      const formattedSize = formatPersianSize(sz);

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleVariantSelect(undefined, sz)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-red-600 text-white border-red-600 shadow-md scale-102 font-black'
                              : isAvailable
                                ? 'bg-white text-gray-800 border-gray-300 hover:border-red-400'
                                : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50 hover:border-gray-300'
                          }`}
                          title={!isAvailable ? 'این سایز برای طعم انتخابی پیکربندی نشده است' : undefined}
                        >
                          <span>{formattedSize}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Flavor Selector */}
              {availableFlavors && availableFlavors.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-black text-gray-900">
                    انتخاب طعم:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {availableFlavors.map((flv: string, idx: number) => {
                      const isSelected = isMatchVariant(selectedFlavor, flv);
                      const translated = translateFlavor(flv);

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleVariantSelect(flv, undefined)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-red-600 text-white border-red-600 shadow-md scale-102 font-black'
                              : 'bg-white text-gray-800 border-gray-300 hover:border-red-400'
                          }`}
                        >
                          <span>{translated}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. REAL-TIME PRICING CARD (Clean White with Red Toman) */}
          <div className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-bold text-gray-500">
                {isLocal ? 'قیمت نهایی تحویل فوری:' : 'قیمت نهایی تحویل در ایران:'}
              </span>
              <span className="text-lg font-black text-red-600">
                {isVariantLoading ? 'در حال محاسبه...' : `${formatPrice(totalToman)} تومان`}
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-gray-500">قیمت پایه امارات:</span>
              <span className="text-xs font-black text-gray-900 dir-ltr text-left">
                {formatAed(currentPriceAed)}
              </span>
            </div>
          </div>

          {/* 5. LIGHT HIGH-CONTRAST SPECIFICATION CARDS */}
          <div className="w-full flex flex-col gap-2.5 my-1">
            {/* Ingredients Card */}
            <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex flex-col gap-1.5">
              <span className="text-xs font-black text-gray-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                ترکیبات و مشخصات فنی (Specifications & Ingredients)
              </span>
              <div className="space-y-1 pr-3.5">
                {getCompositionBullets().map((bullet, idx) => (
                  <p key={idx} className="text-xs leading-relaxed text-gray-700 font-medium">
                    • {bullet}
                  </p>
                ))}
              </div>
            </div>

            {/* Benefits Card */}
            <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex flex-col gap-1.5">
              <span className="text-xs font-black text-gray-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-black" />
                کارایی و عملکرد (Key Benefits)
              </span>
              <div className="space-y-1 pr-3.5">
                {getPerformanceBullets().map((bullet, idx) => (
                  <p key={idx} className="text-xs leading-relaxed text-gray-700 font-medium">
                    • {bullet}
                  </p>
                ))}
              </div>
            </div>

            {/* Authenticity Guarantee Card */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl p-3 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"/>
                <span>تضمین ۱۰۰٪ اصالت کالا و ارسال مستقیم و اورجینال</span>
              </span>
              <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                پلمپ اورجینال ✅
              </span>
            </div>
          </div>

          {/* 6. BOTTOM ACTION BAR (Quantity + Black Add to Cart Button) */}
          <div className="w-full flex items-center gap-2 pt-2">
            {/* Quantity Counter */}
            <div className="flex items-center justify-between border border-gray-300 rounded-2xl bg-gray-50 px-3 py-2.5 gap-4">
              <button 
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="text-lg font-bold text-gray-700 w-6 h-6 flex items-center justify-center active:scale-90 cursor-pointer"
              >
                -
              </button>
              <span className="text-sm font-black text-gray-950 min-w-[20px] text-center dir-ltr">
                {toPersianDigits(quantity)}
              </span>
              <button 
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="text-lg font-bold text-gray-700 w-6 h-6 flex items-center justify-center active:scale-90 cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              type="button"
              disabled={!isAvailable}
              onClick={(e) => {
                e.stopPropagation();
                if (isAvailable) handleAdd();
              }}
              className={`flex-1 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg text-xs sm:text-sm transition-all ${
                !isAvailable 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                  : 'bg-black hover:bg-gray-900 active:scale-95 text-white cursor-pointer'
              }`}
            >
              {!isAvailable ? (
                <>
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  <span>ناموجود در انبار مبدأ</span>
                </>
              ) : isAdded ? (
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
                className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-gray-700 transition"
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
              src={galleryList[lightboxIndex] || activeHeroImage || fallbackImg}
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
