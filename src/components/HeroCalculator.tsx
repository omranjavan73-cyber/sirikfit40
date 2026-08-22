import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link2, Sparkles, ArrowLeft, Weight, Coins, PackageCheck, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Info, ShieldCheck, ShoppingCart, CheckCircle2, Trash2, X, Layers, Zap, Check } from 'lucide-react';
import { FinancialSettings, ParsedProduct, CmsConfig, ProductVariantMatrix, ProductVariantItem } from '../types';
import { formatToman, formatAed, toPersianDigits, extractCleanUrl, getEffectiveAedRate, deduplicateImageUrls } from '../utils/formatters';
import { formatPersianSize, translateFlavor, generatePersianProductCaption } from '../utils/supplementLocalization';
import { calculateOrderPricing } from '../utils/pricingEngine';
import { getEffectiveGeminiKeysList, extractProductWithGeminiAI } from '../utils/geminiKey';
import { parseProductLinkUniversal } from '../utils/parseLink';
import { SpeedboatLoader } from './SpeedboatLoader';
import { ImageMagnifier } from './ImageMagnifier';

interface HeroCalculatorProps {
  settings: FinancialSettings;
  cms?: CmsConfig | null;
  selectedDealProduct?: {
    title: string;
    url: string;
    priceAed: number;
    originalPriceAed?: number;
    weightKg: number;
    image?: string;
    storeName?: string;
  } | null;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  onProceedToOrder?: (product: {
    title: string;
    url: string;
    priceAed: number;
    originalPriceAed?: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    calculatedToman?: number;
    quantity?: number;
    selectedOption?: string;
    options?: string[];
    description?: string;
  }) => void;
}

export const HeroCalculator: React.FC<HeroCalculatorProps> = ({
  settings,
  cms,
  selectedDealProduct,
  onAddToCart,
  onProceedToOrder
}) => {
  const [urlInput, setUrlInput] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleClearUrl = () => {
    setUrlInput('');
    setErrorMessage('');
    setSuccessMessage('');
    if (urlInputRef.current) {
      urlInputRef.current.focus();
    }
  };

  // Active extracted or manual product state
  const [productTitle, setProductTitle] = useState('مکمل پروتئین وی ON Gold Standard 100% (۵ پوندی)');
  const [priceAed, setPriceAed] = useState<number>(320);
  const [originalPriceAed, setOriginalPriceAed] = useState<number | undefined>(undefined);
  const [weightKg, setWeightKg] = useState<number>(2.3);
  const [brandName, setBrandName] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Product variants (flavors/sizes) & description
  const [productOptions, setProductOptions] = useState<string[]>([
    "NEPOLITAN ICE CREAM",
    "TIRAMISU CAKE",
    "BLUEBERRY MUFFIN",
    "DOUBLE RICH CHOCOLATE"
  ]);
  const [selectedOption, setSelectedOption] = useState<string>("NEPOLITAN ICE CREAM");
  const [productDescription, setProductDescription] = useState<string>(
    "پروتئین وی ایزوله با خلوص بالا، هضم سریع و طعم بی‌نظیر. مناسب برای بازسازی سریع عضلات، افزایش حجم خشک و تامین نیازمندی‌های روزانه ورزشکاران."
  );

  // String state for input fields to allow graceful empty state and prevent 025 leading zeros bug
  const [priceInput, setPriceInput] = useState<string>('320');
  const [weightInput, setWeightInput] = useState<string>('2.3');

  const [productImage, setProductImage] = useState<string>(
    cms?.heroImage || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600'
  );
  const [productGallery, setProductGallery] = useState<string[]>([]);
  const [productVariantGroups, setProductVariantGroups] = useState<any[]>([]);
  const [productVariantMatrix, setProductVariantMatrix] = useState<ProductVariantMatrix | null>(null);
  const [productVariantItems, setProductVariantItems] = useState<ProductVariantItem[]>([]);
  const [productFlavors, setProductFlavors] = useState<string[]>([]);
  const [productSizes, setProductSizes] = useState<string[]>([]);
  const [storeName, setStoreName] = useState<string>('Dr. Nutrition');
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (selectedDealProduct) {
      setUrlInput(selectedDealProduct.url || '');
      setProductTitle(selectedDealProduct.title);
      setPriceAed(selectedDealProduct.priceAed);
      setOriginalPriceAed(selectedDealProduct.originalPriceAed);
      setPriceInput(String(selectedDealProduct.priceAed));
      setWeightKg(selectedDealProduct.weightKg);
      setWeightInput(String(selectedDealProduct.weightKg));
      if (selectedDealProduct.image) {
        setProductImage(selectedDealProduct.image);
      }
      if (selectedDealProduct.storeName) setStoreName(selectedDealProduct.storeName);

      const defaultVariants = selectedDealProduct.title.includes('ویتامین') || selectedDealProduct.title.includes('GNC')
        ? ["بسته‌بندی ۶۰ عددی", "بسته‌بندی ۱۲۰ عددی", "بسته‌بندی ۲۴۰ عددی"]
        : ["NEPOLITAN ICE CREAM", "TIRAMISU CAKE", "BLUEBERRY MUFFIN", "DOUBLE RICH CHOCOLATE"];
      setProductOptions(defaultVariants);
      setSelectedOption(defaultVariants[0]);

      setShowResult(true);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedDealProduct]);

  useEffect(() => {
    setPriceInput(String(priceAed));
  }, [priceAed]);

  useEffect(() => {
    setWeightInput(String(weightKg));
  }, [weightKg]);

  // Pricing Engine Formula Calculation for current Quantity
  const totalAed = priceAed * quantity;
  const totalWeightKg = Math.round(weightKg * quantity * 100) / 100;
  const pricingResult = calculateOrderPricing(
    totalAed,
    quantity,
    getEffectiveAedRate(settings, cms),
    cms?.pricingRules,
    totalWeightKg,
    settings.cargoRatePerKg
  );
  const finalToman = pricingResult.finalTotalToman;

  const handleParseLink = async (overrideUrl?: string) => {
    const rawTargetUrl = overrideUrl || urlInput;
    const targetUrl = extractCleanUrl(rawTargetUrl);
    if (!targetUrl || !targetUrl.trim()) {
      setErrorMessage('لطفاً لینک محصول را وارد کنید.');
      return;
    }
    setUrlInput(targetUrl);

    let isRestricted = true;
    try {
      const savedRestricted = localStorage.getItem('enable_domain_restriction');
      if (savedRestricted !== null) {
        isRestricted = JSON.parse(savedRestricted);
      } else {
        const savedIsFree = localStorage.getItem('is_free_extraction');
        if (savedIsFree !== null) {
          isRestricted = savedIsFree !== 'true';
        } else {
          isRestricted = cms?.apiConfig?.enableDomainRestriction ?? true;
        }
      }
    } catch (_e) {}

    if (isRestricted) {
      const defaultAllowedDomains = ['noon.com', 'amazon.ae', 'lifepharmacy.com', 'sporter.com', 'drnutrition.com', 'gnc-mena.com'];
      const configuredAllowed = (cms?.apiConfig?.allowedDomains && cms.apiConfig.allowedDomains.length > 0)
        ? cms.apiConfig.allowedDomains
        : defaultAllowedDomains;

      let activeAllowedDomains = configuredAllowed;
      if (cms?.stores && Array.isArray(cms.stores)) {
        const disabledStoreUrls = cms.stores
          .filter((s: any) => s && (s.enabled === false || s.active === false))
          .map((s: any) => (s.url || '').toLowerCase());

        activeAllowedDomains = (configuredAllowed || []).filter(domain => {
          const isStoreDisabled = disabledStoreUrls.some((u: string) => u.includes(domain));
          return !isStoreDisabled;
        });
      }

      const isAllowedDomain = activeAllowedDomains.some(domain => targetUrl.toLowerCase().includes(domain));
      if (!isAllowedDomain) {
        setErrorMessage('استخراج خودکار از این سایت در حال حاضر پشتیبانی نمیشود.');
        setIsParsing(false);
        return;
      }
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsParsing(true);

    const savedKeys = getEffectiveGeminiKeysList(cms?.apiConfig?.geminiApiKeys || cms?.apiConfig?.geminiApiKey);

    try {
      const result = await parseProductLinkUniversal({
        url: targetUrl,
        geminiKeys: savedKeys,
        cmsConfig: cms
      });

      if (result.success && result.priceAed && result.priceAed > 0) {
        setProductTitle(result.title || 'محصول استخراج شده');
        setUrlInput(targetUrl);
        setPriceAed(result.priceAed);
        setOriginalPriceAed(result.originalPriceAed);
        setPriceInput(String(result.priceAed));
        setWeightKg(result.weightKg || 0.8);
        setWeightInput(String(result.weightKg || 0.8));
        const fallbackImage = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600';
        const mainImg = result.image || cms?.heroImage || fallbackImage;
        setProductImage(mainImg);
        const rawList = (result.images && result.images.length > 0) ? result.images : (result.galleryImages || [mainImg]);
        const galleryList = deduplicateImageUrls([mainImg, ...rawList], mainImg);
        setProductGallery(galleryList);
        if (result.storeName) setStoreName(result.storeName);
        if (result.brand) setBrandName(result.brand);
        if (result.category) setCategoryName(result.category);

        if (Array.isArray(result.variantGroups)) {
          setProductVariantGroups(result.variantGroups);
        } else {
          setProductVariantGroups([]);
        }
        if (Array.isArray(result.flavors)) {
          setProductFlavors(result.flavors);
        }
        if (Array.isArray(result.sizes)) {
          setProductSizes(result.sizes);
        }

        // Store variant matrix & flat items
        if (result.variantMatrix) {
          setProductVariantMatrix(result.variantMatrix);
          setProductVariantItems(result.variantMatrix.items || []);
        } else if (Array.isArray(result.variants) && result.variants.length > 0) {
          const vItems: ProductVariantItem[] = result.variants.map((v: any, idx: number) => ({
            id: v.id || `var-${idx}`,
            title: v.name || v.label || `گزینه ${idx + 1}`,
            name: v.name || v.label,
            flavor: v.flavor || (v.type === 'flavor' ? v.name : undefined),
            size: v.size || (v.type === 'size' ? v.name : undefined),
            priceAED: v.priceAED ?? v.priceAed ?? v.price ?? result.priceAed ?? 0,
            priceAed: v.priceAed ?? v.priceAED ?? v.price ?? result.priceAed ?? 0,
            weightKg: v.weightKg,
            originalPriceAED: v.originalPriceAED ?? v.originalPriceAed,
            image: v.imageUrl || v.imageThumbnail || v.image,
            inStock: v.inStock !== false
          }));
          setProductVariantItems(vItems);
          setProductVariantMatrix({
            sizes: result.sizes || [],
            flavors: result.flavors || [],
            items: vItems,
            selectedVariant: vItems[0]
          });
        } else {
          setProductVariantMatrix(null);
          setProductVariantItems([]);
        }

        const validExtractedOptions = (result.options || []).filter(
          (opt) => opt && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal', 'default title'].includes(opt.trim().toLowerCase())
        );
        if (validExtractedOptions.length > 0) {
          setProductOptions(validExtractedOptions);
          setSelectedOption(validExtractedOptions[0]);
        } else {
          setProductOptions([]);
          setSelectedOption('');
        }

        if (result.description) {
          setProductDescription(result.description);
        } else {
          setProductDescription("محصول اورجینال سفارش داده شده مستقیماً از نمایندگی‌های معتبر دبی. دارای بالاترین استانداردهای کیفیت، سلامت و بسته‌بندی ایمن کارگو.");
        }

        setQuantity(1);
        setShowResult(true);
        setErrorMessage('');
        setSuccessMessage(`اطلاعات محصول با موفقیت استخراج شد (${result.priceAed} درهم)`);
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      } else {
        setShowResult(false);
        setErrorMessage(result.message || result.error || 'در حال حاضر امکان استخراج خودکار اطلاعات این لینک وجود ندارد. لطفاً چند لحظه بعد مجدداً تلاش فرمایید.');
      }
    } catch (err) {
      console.error('Error parsing link:', err);
      setShowResult(false);
      setErrorMessage('در حال حاضر امکان استخراج خودکار اطلاعات این لینک وجود ندارد. لطفاً چند لحظه بعد مجدداً تلاش فرمایید.');
    } finally {
      setIsParsing(false);
    }
  };

  // Helper to handle dynamic variant selection and price mapping
  const handleSelectOption = (optName: string) => {
    setSelectedOption(optName);

    // Look for matching variant item in productVariantItems or productVariantMatrix
    const matched = productVariantItems.find(v => 
      v.title?.toLowerCase() === optName.toLowerCase() ||
      v.name?.toLowerCase() === optName.toLowerCase() ||
      v.size?.toLowerCase() === optName.toLowerCase() ||
      v.flavor?.toLowerCase() === optName.toLowerCase() ||
      optName.toLowerCase().includes(v.title?.toLowerCase() || '') ||
      (v.title && optName.toLowerCase().includes(v.title.toLowerCase()))
    );

    if (matched) {
      const vPrice = matched.priceAED ?? matched.priceAed;
      if (vPrice && vPrice > 0) {
        setPriceAed(vPrice);
        setPriceInput(String(vPrice));
      }
      if (matched.originalPriceAED ?? matched.originalPriceAed) {
        setOriginalPriceAed(matched.originalPriceAED ?? matched.originalPriceAed);
      }
      if (matched.weightKg && matched.weightKg > 0) {
        setWeightKg(matched.weightKg);
        setWeightInput(String(matched.weightKg));
      }
      if (matched.image) {
        setProductImage(matched.image);
      }
    } else {
      // Check in productVariantGroups options
      for (const vg of productVariantGroups) {
        const foundOpt = (vg.options || []).find((o: any) => {
          const name = typeof o === 'string' ? o : (o.name || o.label || '');
          return name.toLowerCase() === optName.toLowerCase();
        });
        if (foundOpt && typeof foundOpt === 'object') {
          const optPrice = foundOpt.priceAED ?? foundOpt.priceAed ?? foundOpt.price;
          if (optPrice && Number(optPrice) > 0) {
            setPriceAed(Number(optPrice));
            setPriceInput(String(optPrice));
          }
          if (foundOpt.image || foundOpt.imageUrl || foundOpt.imageThumbnail) {
            setProductImage(foundOpt.image || foundOpt.imageUrl || foundOpt.imageThumbnail);
          }
          break;
        }
      }
    }
  };

  const handleQuickSample = (sample: { title: string; priceAed: number; originalPriceAed?: number; weightKg: number; image: string; storeName: string; url: string }) => {
    setUrlInput(extractCleanUrl(sample.url));
    setProductTitle(sample.title);
    setPriceAed(sample.priceAed);
    setOriginalPriceAed(sample.originalPriceAed);
    setPriceInput(String(sample.priceAed));
    setWeightKg(sample.weightKg);
    setWeightInput(String(sample.weightKg));
    setProductImage(sample.image);
    setStoreName(sample.storeName);

    const sampleOptions = sample.title.includes('ویتامین') || sample.title.includes('GNC')
      ? ["بسته‌بندی ۶۰ عددی", "بسته‌بندی ۱۲۰ عددی", "بسته‌بندی ۲۴۰ عددی"]
      : (sample.title.includes('وی') || sample.title.includes('Whey') || sample.title.includes('ON')
          ? ["NEPOLITAN ICE CREAM", "TIRAMISU CAKE", "BLUEBERRY MUFFIN", "DOUBLE RICH CHOCOLATE"]
          : ["BLUE RASPBERRY", "FRUIT PUNCH", "WATERMELON CRUSH", "GREEN APPLE"]);

    setProductOptions(sampleOptions);
    setSelectedOption(sampleOptions[0]);
    setProductDescription(
      sample.title.includes('وی') || sample.title.includes('Whey')
        ? "پروتئین وی ایزوله با خلوص بالا، هضم سریع و طعم بی‌نظیر. مناسب برای بازسازی سریع عضلات، افزایش حجم خشک و تامین نیازمندی‌های روزانه ورزشکاران."
        : "محصول اورجینال استخراج شده از فروشگاه‌های رسمی امارات با ضمانت اصالت ۱۰۰٪ دبی."
    );

    setQuantity(1);
    setShowResult(true);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleAddToCartClick = () => {
    const productPayload = {
      title: productTitle,
      url: urlInput || 'https://www.drnutrition.com',
      priceAed,
      originalPriceAed,
      weightKg,
      image: productImage,
      images: productGallery.length > 0 ? productGallery : [productImage],
      galleryImages: productGallery.length > 0 ? productGallery : [productImage],
      storeName,
      calculatedToman: Math.round(finalToman / quantity),
      quantity: quantity,
      selectedOption: selectedOption || undefined,
      options: productOptions,
      variantGroups: productVariantGroups.length > 0 ? productVariantGroups : undefined,
      variants: productVariantItems.length > 0 ? productVariantItems : undefined,
      variantMatrix: productVariantMatrix || undefined,
      flavors: productFlavors.length > 0 ? productFlavors : undefined,
      sizes: productSizes.length > 0 ? productSizes : undefined,
      description: productDescription
    };

    if (onAddToCart) {
      onAddToCart(productPayload, selectedOption || undefined, undefined);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1500);
    } else if (onProceedToOrder) {
      onProceedToOrder(productPayload);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[16px] p-4 md:p-6 text-slate-800 border-[1.5px] border-[#E5E5E5] shadow-xs bg-white mb-5 font-['Vazirmatn',sans-serif]">
      {/* Background Subtle Accent Glow */}
      <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-slate-100/50 blur-3xl pointer-events-none"></div>

      {/* Header Compact Title & Subtitle */}
      <div className="relative z-10 mb-3.5">
        <div className="inline-flex items-center gap-1.5 bg-[#111111] text-white text-[11px] font-extrabold px-3 py-1 rounded-md mb-2 border-none">
          <span id="calc-black-badge">{cms?.homeContent?.calcBlackBadge || 'خرید مستقیم از دبی ✦'}</span>
        </div>
        <h2 id="calc-main-headline" className="text-xl md:text-2xl font-black text-[#111111] tracking-tight mb-1">
          {cms?.homeContent?.calcMainHeadline || 'برآورد قیمت و ثبت سفارش'}
        </h2>
        <p id="calc-subtitle" className="text-xs text-neutral-500 font-medium mb-3 leading-relaxed">
          {cms?.homeContent?.calcSubtitle || 'لینک محصول مورد نظر را از سایتهای معتبر دبی را وارد کنید تا قیمت نهایی به تومان و هزینه ارسال محاسبه شود.'}
        </p>
      </div>

      {/* URL Input Box with Orbiting Red Dot Indicator */}
      <div className="relative z-10 mb-4">
        <div className="orbit-container relative flex items-center gap-2 bg-[#F8FAFC] border-[1.5px] border-[#E5E5E5] focus-within:border-[#111111] rounded-[12px] px-3.5 py-2.5 mb-2.5 transition dir-ltr">
          {/* Glowing Orbiting Red Dot Traveling Around Input Border */}
          <div className="orbiting-red-dot" aria-hidden="true" />
          
          <div className="flex items-center gap-1.5 shrink-0">
            <Link2 className="w-5 h-5 text-red-500 shrink-0" />
            {urlInput.length > 0 && (
              <button
                type="button"
                onClick={handleClearUrl}
                title="پاک کردن لینک"
                aria-label="پاک کردن لینک"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full p-1 transition-all cursor-pointer border-none flex items-center justify-center shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <input
            ref={urlInputRef}
            type="text"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (errorMessage) setErrorMessage('');
              if (successMessage) setSuccessMessage('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleParseLink();
              }
            }}
            placeholder="... لینک محصول را اینجا paste کنید"
            className="w-full bg-transparent text-xs text-[#111111] placeholder:text-[#9ca3af] focus:outline-none font-sans font-medium text-right dir-rtl focus:text-left focus:dir-ltr placeholder:text-right"
            dir={urlInput ? "ltr" : "rtl"}
          />
        </div>

        {/* Extract Button */}
        <button
          onClick={() => handleParseLink()}
          disabled={isParsing}
          className="w-full bg-[#111111] hover:bg-black text-white font-extrabold text-xs md:text-sm py-3 px-4 rounded-[12px] transition flex items-center justify-center gap-2 mb-1 cursor-pointer shadow-xs border-none active:scale-[0.99]"
        >
          {isParsing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>در حال استخراج...</span>
            </>
          ) : (
            <>
              <ArrowLeft className="w-4 h-4" />
              <span>استخراج و محاسبه</span>
            </>
          )}
        </button>

        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 mb-2 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 mb-2 font-extrabold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Speedboat Loading Animation during URL Scraping */}
        {isParsing && (
          <SpeedboatLoader statusText="🛥️ در حال استخراج و تحلیل کالا از دبی..." />
        )}
      </div>

      {/* Extracted Product Rich Card - 2-Column Responsive Layout */}
      {!isParsing && showResult && (
        <div ref={resultRef} id="compact-preview-card" className="mt-4 pt-3.5 border-t border-gray-200 dark:border-gray-800 relative z-10">
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl p-4 md:p-6 shadow-sm space-y-4 font-['Vazirmatn',sans-serif] text-right" dir="rtl">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* ==================================================================== */}
              {/* COLUMN 1: LARGE IMAGE SHOWCASE WITH HOVER/TOUCH MAGNIFIER (Cols 1-5) */}
              {/* ==================================================================== */}
              <div className="md:col-span-5 flex flex-col items-center gap-3 w-full">
                {/* Main Magnifier Container with Floating Store Badges */}
                <div className="w-full relative rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex justify-center">
                  {/* Floating Store Badge (Top Right) */}
                  <div className="absolute top-3 right-3 z-20 bg-black/80 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>{brandName || storeName || 'خرید مستقیم از دبی'}</span>
                  </div>

                  {/* Delivery Origin Tag (Top Left) */}
                  <div className="absolute top-3 left-3 z-20 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 pointer-events-none">
                    ارسال مستقیم دبی
                  </div>

                  <ImageMagnifier
                    src={productImage}
                    alt={productTitle}
                    fallbackSrc="https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600"
                    zoomScale={2.2}
                    showHints={true}
                    badge={
                      originalPriceAed && originalPriceAed > priceAed ? (
                        <span className="bg-red-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full shadow-sm dir-ltr">
                          -{Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100)}%
                        </span>
                      ) : null
                    }
                    className="w-full max-w-[320px] h-[300px] md:max-w-none md:h-auto md:min-h-[380px] lg:min-h-[420px] bg-transparent p-4 flex items-center justify-center relative overflow-hidden"
                    imageClassName="object-contain w-full h-full max-h-[360px] drop-shadow-md transition-transform duration-300 hover:scale-105"
                  />
                </div>

                {/* Conditional Thumbnails Row: STRICTLY HIDDEN IF ONLY 1 IMAGE */}
                {(() => {
                  const cleanThumbnails = deduplicateImageUrls(
                    productGallery.length > 0 ? productGallery : [productImage],
                    productImage
                  );
                  if (cleanThumbnails.length <= 1) return null;

                  return (
                    <div className="w-full flex items-center justify-center gap-2 overflow-x-auto py-1 px-1 dir-ltr no-scrollbar">
                      {cleanThumbnails.slice(0, 6).map((imgUrl, idx) => {
                        const isActive = productImage === imgUrl;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setProductImage(imgUrl)}
                            className={`relative w-13 h-13 sm:w-15 sm:h-15 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shrink-0 cursor-pointer transition-all duration-200 p-1 flex items-center justify-center ${
                              isActive
                                ? 'border-2 border-red-600 ring-2 ring-red-600/20 shadow-sm scale-105'
                                : 'border border-gray-200 dark:border-gray-700 hover:border-gray-400 opacity-70 hover:opacity-100'
                            }`}
                            title={`تصویر ${idx + 1}`}
                          >
                            <img
                              src={imgUrl}
                              alt={`تصویر ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.src.includes('images.weserv.nl')) {
                                  target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(imgUrl);
                                }
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* ==================================================================== */}
              {/* COLUMN 2: SPECS, PRICING, VARIANTS & ACTIONS (Cols 6-12)             */}
              {/* ==================================================================== */}
              <div className="md:col-span-7 flex flex-col space-y-4 w-full text-right dir-rtl">
                
                {/* Title */}
                <div className="space-y-1">
                  <h3 className="font-black text-base sm:text-lg lg:text-xl text-gray-950 dark:text-white leading-snug">
                    {productTitle}
                  </h3>
                </div>

                {/* Dynamic Specifications Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-bold mb-0.5 flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-500" />
                      قیمت در امارات:
                    </span>
                    <span className="text-gray-900 dark:text-white font-black text-sm dir-ltr block text-left">
                      {formatAed(priceAed)}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-bold mb-0.5 flex items-center gap-1">
                      <Weight className="w-3 h-3 text-sky-500" />
                      وزن تخمینی:
                    </span>
                    <span className="text-gray-900 dark:text-white font-black text-sm block">
                      {weightKg} کیلوگرم
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 bg-white dark:bg-gray-900 p-3 rounded-2xl border-2 border-gray-100 dark:border-gray-800 shadow-2xs">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-bold mb-0.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-red-600" />
                      قیمت تمام‌شده در ایران:
                    </span>
                    <span className="text-red-600 dark:text-red-500 font-black text-sm sm:text-base block">
                      {formatToman(Math.round(finalToman / quantity))}
                    </span>
                  </div>
                </div>

                {/* Interactive Variant Selection UI (گزینه‌های قابل انتخاب) */}
                {(() => {
                  const validOptions = (productOptions || []).filter(
                    (opt) => opt && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal', 'default title'].includes(opt.trim().toLowerCase())
                  );
                  if (validOptions.length === 0) return null;
                  return (
                    <div className="bg-gray-50 dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-950 dark:text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                          <span>گزینه‌های قابل انتخاب:</span>
                        </span>
                        {selectedOption && validOptions.includes(selectedOption) && (
                          <span className="text-[10px] text-gray-600 dark:text-gray-300 font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md dir-rtl">
                            انتخاب‌شده: <span className="text-gray-950 dark:text-white font-black">{translateFlavor(selectedOption) !== selectedOption ? translateFlavor(selectedOption) : formatPersianSize(selectedOption)}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-0.5 dir-ltr">
                        {validOptions.map((opt) => {
                          const isSelected = selectedOption === opt;
                          const matchedItem = productVariantItems.find(v =>
                            v.title?.toLowerCase() === opt.toLowerCase() ||
                            v.name?.toLowerCase() === opt.toLowerCase() ||
                            v.size?.toLowerCase() === opt.toLowerCase() ||
                            v.flavor?.toLowerCase() === opt.toLowerCase()
                          );
                          const isAvailable = matchedItem ? matchedItem.inStock !== false : true;
                          const optPrice = matchedItem ? (matchedItem.priceAED ?? matchedItem.priceAed) : null;
                          const hasDifferentPrice = optPrice && optPrice > 0 && optPrice !== priceAed;
                          const localizedLabel = translateFlavor(opt) !== opt ? translateFlavor(opt) : formatPersianSize(opt);

                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => {
                                if (!isAvailable) return;
                                handleSelectOption(opt);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all inline-flex items-center gap-1.5 cursor-pointer border ${
                                !isAvailable
                                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50 line-through'
                                  : isSelected
                                  ? 'bg-red-600 text-white border-red-600 shadow-md scale-[1.02]'
                                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:border-red-400'
                              }`}
                            >
                              <span>{localizedLabel}</span>
                              {!isAvailable && (
                                <span className="text-[10px] text-rose-500 font-normal no-underline mr-0.5">
                                  (ناموجود)
                                </span>
                              )}
                              {isAvailable && hasDifferentPrice && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                }`}>
                                  {optPrice} AED
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Clean High-Contrast Product Specifications */}
                <div className="w-full flex flex-col gap-2.5 my-1">
                  {/* Ingredients Box */}
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3.5 rounded-2xl flex flex-col gap-1.5">
                    <span className="text-xs font-black text-gray-950 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                      ترکیبات و فرمولاسیون (Formulation)
                    </span>
                    <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 font-medium pr-3.5">
                      حاوی پروتئین و پپتیدهای کلاژن خالص با بالاترین درجه جذب بیولوژیکی، بدون شکر افزوده و فاقد ناخالصی.
                    </p>
                  </div>

                  {/* Benefits Box */}
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3.5 rounded-2xl flex flex-col gap-1.5">
                    <span className="text-xs font-black text-gray-950 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-100" />
                      کارایی و عملکرد (Performance & Benefits)
                    </span>
                    <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 font-medium pr-3.5">
                      تقویت شادابی پوست و مو، بهبود انعطاف‌پذیری مفاصل و تسریع بازسازی بافت‌های همبند.
                    </p>
                  </div>

                  {/* Authenticity Badge */}
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 dark:text-white">
                      ✓ تضمین ۱۰۰٪ اصالت کالا و ارسال مستقیم و اورجینال
                    </span>
                    <span className="text-[11px] font-extrabold text-red-600 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                      پلمپ اورجینال ✅
                    </span>
                  </div>
                </div>

                {/* Quantity Selector & Live Total Price Tag */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">تعداد کالا:</span>
                    <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-black flex items-center justify-center cursor-pointer transition text-base border border-gray-200 dark:border-gray-600"
                      >
                        -
                      </button>
                      <span className="font-black text-sm text-gray-900 dark:text-white w-5 text-center dir-ltr">
                        {toPersianDigits(quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-black flex items-center justify-center cursor-pointer transition text-base border border-gray-200 dark:border-gray-600"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Live Bulk Discount Tier Badge */}
                  {(pricingResult.commissionPercent < 20 || quantity > 1) && (
                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span className="text-red-600">✨</span>
                        <span>کارمزد تخفیفی {toPersianDigits(pricingResult.commissionPercent)}٪</span>
                      </span>
                      <span className="text-[10px] font-bold text-red-600">
                        ({quantity > 1 ? 'تخفیف خرید چندتایی' : 'تخفیف پله‌ای حجم'})
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">جمع کل قابل پرداخت:</span>
                      {quantity > 1 && (
                        <span className="text-[10px] text-gray-400 font-medium block">
                          (میانگین هر واحد: {formatToman(Math.round(finalToman / quantity))})
                        </span>
                      )}
                    </div>
                    <div className="text-lg sm:text-xl font-black text-red-600 dark:text-red-500 tracking-tight">
                      {formatToman(finalToman)}
                    </div>
                  </div>

                  <button
                    onClick={handleAddToCartClick}
                    className={`w-full font-black text-sm py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg ${
                      isAdded ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-black hover:bg-gray-900 text-white'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                        <span>✓ اضافه شد!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4.5 h-4.5 text-white" />
                        <span>افزودن به سبد خرید</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Price Breakdown Toggle */}
                {(cms?.features?.showBreakdown ?? cms?.showPriceBreakdown ?? cms?.showBreakdown ?? true) && (
                  <div className="border-t border-slate-200 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowBreakdown(!showBreakdown)}
                      className="flex items-center justify-between w-full text-xs font-black text-slate-700 hover:text-black transition cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-600" />
                        <span>مشاهده ریز قیمت</span>
                      </div>
                      {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showBreakdown && (
                      <div className="mt-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 animate-fadeIn">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>قیمت پایه کالا در دبی:</span>
                          <span className="font-bold dir-ltr">{formatAed(totalAed)} ({formatToman(totalAed * settings.aedRate)})</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>نرخ تبدیل درهم روز:</span>
                          <span className="font-bold">{formatToman(settings.aedRate)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>کارمزد سفارش:</span>
                          <span className="font-bold text-amber-700">{toPersianDigits(pricingResult.commissionPercent)}% ({formatToman(pricingResult.commissionAmountAed * settings.aedRate)})</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>هزینه ارسال دبی به ایران ({toPersianDigits(totalWeightKg)} کیلوگرم):</span>
                          <span className="font-bold dir-ltr">
                            {formatAed(pricingResult.shippingCostAed)} ({formatToman(pricingResult.shippingCostAed * settings.aedRate)})
                          </span>
                        </div>
                        <div className="border-t border-slate-100 pt-2 flex justify-between items-center font-black text-slate-900 text-sm">
                          <span>مبلغ قابل پرداخت نهایی:</span>
                          <span className="text-[#E11D48]">{formatToman(finalToman)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};
