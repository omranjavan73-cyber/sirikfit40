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
import { TouchImageMagnifier } from './TouchImageMagnifier';
import { MetaTags } from './seo/MetaTags';

export interface ProductDetailModalProduct {
  id?: string;
  title: string;
  englishTitle?: string;
  url?: string;
  priceAed: number;
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
  const [selectedImage, setSelectedImage] = useState<string>('');
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

  // Derive flavors and sizes from currentProd.variants (Single Source of Truth) or variantMatrix or fallback
  const extractedFlavors = useMemo(() => {
    if (!currentProd) return [];
    if (activeVariants.length > 0) {
      return getAllFlavors(activeVariants).filter(f => f && !isArtificialFallback(f));
    }
    const rawFlavors = (currentProd.variantMatrix?.flavors && currentProd.variantMatrix.flavors.length > 0)
      ? currentProd.variantMatrix.flavors
      : (Array.isArray(currentProd.flavors) && currentProd.flavors.length > 0)
        ? currentProd.flavors
        : [];
    
    if (rawFlavors.length > 0) {
      return rawFlavors.map((f: any) => {
        const name = typeof f === 'string' ? f : (f?.flavor || f?.name || '');
        return sanitizeVariantLabel(name);
      }).filter(f => f && !isArtificialFallback(f));
    }

    const flavorGroup = currentProd.variantGroups?.find((g: any) => g.type === 'flavor' || g.id === 'flavors' || (g.name && (g.name.includes('طعم') || g.name.toLowerCase().includes('flavor'))));
    if (flavorGroup && Array.isArray(flavorGroup.options)) {
      return flavorGroup.options.map((opt: any) => sanitizeVariantLabel(typeof opt === 'string' ? opt : (opt.name || opt.label || ''))).filter(f => f && !isArtificialFallback(f));
    }
    return [];
  }, [currentProd, activeVariants]);

  const extractedSizes = useMemo(() => {
    if (!currentProd) return [];
    if (activeVariants.length > 0) {
      return getAllSizes(activeVariants).filter(s => s && !isArtificialFallback(s));
    }
    const rawSizes = (currentProd.variantMatrix?.sizes && currentProd.variantMatrix.sizes.length > 0)
      ? currentProd.variantMatrix.sizes
      : (Array.isArray(currentProd.sizes) && currentProd.sizes.length > 0)
        ? currentProd.sizes
        : [];

    if (rawSizes.length > 0) {
      return rawSizes.map((s: any) => {
        const name = typeof s === 'string' ? s : (s?.size || s?.name || '');
        return sanitizeVariantLabel(name);
      }).filter(s => s && !isArtificialFallback(s));
    }

    const sizeGroup = currentProd.variantGroups?.find((g: any) => g.type === 'size' || g.id === 'sizes' || (g.name && (g.name.includes('وزن') || g.name.includes('سایز') || g.name.toLowerCase().includes('size'))));
    if (sizeGroup && Array.isArray(sizeGroup.options)) {
      return sizeGroup.options.map((opt: any) => sanitizeVariantLabel(typeof opt === 'string' ? opt : (opt.name || opt.label || ''))).filter(s => s && !isArtificialFallback(s));
    }
    return [];
  }, [currentProd, activeVariants]);

  useEffect(() => {
    if (product) {
      if (activeVariants.length > 0) {
        const first = activeVariants[0];
        setSelectedFlavor(first.flavor && !isArtificialFallback(first.flavor) ? first.flavor : (extractedFlavors.length > 0 ? extractedFlavors[0] : null));
        setSelectedSize(first.size && !isArtificialFallback(first.size) ? first.size : (first.name && !isArtificialFallback(first.name) ? first.name : (extractedSizes.length > 0 ? extractedSizes[0] : null)));
      } else {
        const initialFlavor = product.selectedFlavor && !isArtificialFallback(product.selectedFlavor)
          ? product.selectedFlavor
          : (extractedFlavors.length > 0 ? extractedFlavors[0] : null);
        const initialSize = product.selectedSize && !isArtificialFallback(product.selectedSize)
          ? product.selectedSize
          : (extractedSizes.length > 0 ? extractedSizes[0] : null);
        setSelectedFlavor(initialFlavor);
        setSelectedSize(initialSize);
      }
      const initialImg = galleryList[0] || product.image || fallbackImg;
      setSelectedImage(initialImg);
      setQuantity(1);
      setIsAdded(false);
      setIsHovered(false);
      setIsLightboxOpen(false);
    }
  }, [product, activeVariants, extractedFlavors, extractedSizes]);

  // Find selected variant details from variantMatrix or currentProd.variants
  const matchedVariant = useMemo(() => {
    if (!currentProd) return null;
    if (activeVariants.length > 0) {
      return findExactVariant(activeVariants, selectedFlavor || undefined, selectedSize || undefined);
    }
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
  }, [currentProd, activeVariants, selectedSize, selectedFlavor]);

  // Synchronize variant-specific image immediately upon variant selection
  useEffect(() => {
    const variantImg = matchedVariant?.image?.trim() || matchedVariant?.imageThumbnail?.trim();
    if (variantImg) {
      if (variantImg !== selectedImage) {
        setSelectedImage(variantImg);
      }
    } else {
      const defaultImg = currentProd?.image || galleryList[0] || fallbackImg;
      if (defaultImg && !galleryList.includes(selectedImage) && selectedImage !== defaultImg) {
        setSelectedImage(defaultImg);
      }
    }
  }, [matchedVariant?.image, matchedVariant?.imageThumbnail, selectedFlavor, selectedSize, currentProd?.image]);

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
  const isAvailable = matchedVariant ? (matchedVariant as any).inStock !== false : ((currentProd as any).inStock !== false);
  
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

  const currentPriceAed = activePricing.priceAED;
  const currentWeightKg = activePricing.weightKg;
  const unitToman = activePricing.priceToman;

  const discountVal = (originalPriceAed && originalPriceAed > currentPriceAed)
    ? Math.round(((originalPriceAed - currentPriceAed) / originalPriceAed) * 100)
    : (currentProd.discountPercent || 0);

  const totalToman = unitToman * quantity;

  // Handler to fetch on-demand variant when user clicks a variant with a distinct URL
  const handleVariantSelect = async (newFlavor?: string, newSize?: string) => {
    let targetFlavor = newFlavor !== undefined ? newFlavor : selectedFlavor;
    let targetSize = newSize !== undefined ? newSize : selectedSize;

    if (activeVariants.length > 0) {
      if (newFlavor !== undefined) {
        const res = handleFlavorChange(activeVariants, newFlavor, selectedSize);
        targetFlavor = res.flavor;
        targetSize = res.size;
        setSelectedFlavor(res.flavor);
        setSelectedSize(res.size);
      } else if (newSize !== undefined) {
        const res = handleSizeChange(activeVariants, newSize, selectedFlavor);
        targetSize = res.size;
        setSelectedSize(res.size);
      }
    } else {
      if (newFlavor !== undefined) setSelectedFlavor(newFlavor);
      if (newSize !== undefined) setSelectedSize(newSize);
    }

    if (newFlavor !== undefined) {
      // If the selected flavor has a dedicated image, switch to it immediately
      if (Array.isArray(currentProd?.flavors)) {
        const flvObj = currentProd.flavors.find((f: any) => {
          if (!f) return false;
          const name = typeof f === 'string' ? f : (f?.flavor || f?.name || '');
          return name.toLowerCase() === newFlavor.toLowerCase();
        });
        if (flvObj && typeof flvObj === 'object') {
          const customImg = (flvObj as any).imageUrl || (flvObj as any).image;
          if (customImg) {
            setSelectedImage(customImg);
          }
        }
      }
    }

    // Look for target variant item with a distinct url
    let targetVariantUrl: string | undefined;

    if (activeVariants.length > 0) {
      const vMatch = findExactVariant(activeVariants, targetFlavor, targetSize);
      if (vMatch?.url) {
        targetVariantUrl = vMatch.url;
      }
      if (vMatch?.imageThumbnail || vMatch?.image) {
        setSelectedImage(vMatch.imageThumbnail || vMatch.image);
      }
    } else if (currentProd?.variantMatrix?.items && currentProd.variantMatrix.items.length > 0) {
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
                const storeTheme = getStoreBadgeTheme(product.storeName || product.brand);
                return (
                  <div className={`absolute top-3 right-3 z-10 ${storeTheme.bg} rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm shadow-sm`}>
                    <span className={`inline-block w-2 h-2 rounded-full ${storeTheme.dot} animate-pulse ml-1.5 shrink-0`} />
                    <span>{storeTheme.name}</span>
                  </div>
                );
              })()}

              <TouchImageMagnifier
                src={selectedImage || fallbackImg}
                alt={product.title}
                fallbackSrc={fallbackImg}
                zoomScale={2.4}
                showHints={false}
                className="h-full w-full bg-transparent flex items-center justify-center"
                imageClassName="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
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
                  const isActive = selectedImage === imgUrl;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImage(imgUrl)}
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
          {((extractedSizes && extractedSizes.length > 0) || (extractedFlavors && extractedFlavors.length > 0)) && (
            <div className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl flex flex-col gap-3.5">
              
              {/* Size Selector */}
              {extractedSizes && extractedSizes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-black text-gray-900">
                    انتخاب حجم / بسته‌بندی:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {extractedSizes.map((sz: string, idx: number) => {
                      const itemMatch = activeVariants.length > 0
                        ? findExactVariant(activeVariants, selectedFlavor, sz) || activeVariants.find(v => areVariantsMatching(v.size || v.name, sz))
                        : currentProd.variantMatrix?.items?.find(it => it.size === sz || it.title === sz || it.name === sz);
                      const isAvailable = activeVariants.length > 0
                        ? isSizeAvailableForFlavor(activeVariants, sz, selectedFlavor)
                        : (itemMatch ? itemMatch.inStock !== false : true);
                      const itemPrice = itemMatch ? (itemMatch.priceAED ?? itemMatch.priceAed) : null;
                      const hasDiffPrice = itemPrice && itemPrice > 0 && itemPrice !== basePriceAed;
                      const isSelected = areVariantsMatching(selectedSize, sz);
                      const formattedSize = formatPersianSize(sz);

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isAvailable || isVariantLoading}
                          onClick={() => handleVariantSelect(undefined, sz)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            !isAvailable
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50 line-through'
                              : isSelected
                              ? 'bg-red-600 text-white border-red-600 shadow-md scale-102'
                              : 'bg-white text-gray-800 border-gray-300 hover:border-red-400'
                          }`}
                        >
                          <span>{formattedSize}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Flavor Selector */}
              {extractedFlavors && extractedFlavors.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-black text-gray-900">
                    انتخاب طعم:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {extractedFlavors.map((flv: string, idx: number) => {
                      const itemMatch = activeVariants.length > 0
                        ? findExactVariant(activeVariants, flv, selectedSize) || activeVariants.find(v => areVariantsMatching(v.flavor, flv))
                        : currentProd.variantMatrix?.items?.find(it => it.flavor === flv || it.title === flv || it.name === flv);
                      const isAvailable = activeVariants.length > 0
                        ? isFlavorAvailable(activeVariants, flv)
                        : (itemMatch ? itemMatch.inStock !== false : true);
                      const isSelected = areVariantsMatching(selectedFlavor, flv);
                      const translated = translateFlavor(flv);

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isAvailable || isVariantLoading}
                          onClick={() => handleVariantSelect(flv, undefined)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            !isAvailable
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50 line-through'
                              : isSelected
                              ? 'bg-red-600 text-white border-red-600 shadow-md scale-102'
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
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 p-3 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/>
                <span>تضمین ۱۰۰٪ اصالت کالا و ارسال مستقیم و اورجینال</span>
              </span>
              <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/40 rounded-full px-2.5 py-0.5 text-xs font-medium inline-flex items-center gap-1">
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
