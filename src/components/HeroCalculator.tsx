import React, { useState, useEffect, useRef } from 'react';
import { Link2, Sparkles, ArrowLeft, Weight, Coins, PackageCheck, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Info, ShieldCheck, ShoppingCart, CheckCircle2, Trash2, X } from 'lucide-react';
import { FinancialSettings, ParsedProduct, CmsConfig, ProductVariantMatrix, ProductVariantItem } from '../types';
import { formatToman, formatAed, toPersianDigits, extractCleanUrl, getEffectiveAedRate } from '../utils/formatters';
import { calculateOrderPricing } from '../utils/pricingEngine';
import { getEffectiveGeminiKeysList, extractProductWithGeminiAI } from '../utils/geminiKey';
import { parseProductLinkUniversal } from '../utils/parseLink';
import { SpeedboatLoader } from './SpeedboatLoader';

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
        const galleryList = (result.images && result.images.length > 0) ? result.images : [mainImg];
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

      {/* URL Input Box */}
      <div className="relative z-10 mb-4">
        <div className="flex items-center gap-2 bg-[#F8FAFC] border-[1.5px] border-[#E5E5E5] focus-within:border-[#111111] rounded-[12px] px-3.5 py-2.5 mb-2.5 transition dir-ltr">
          <div className="flex items-center gap-1.5 shrink-0">
            <Link2 className="w-4 h-4 text-neutral-400" />
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

      {/* Extracted Product Rich Card */}
      {!isParsing && showResult && (
        <div ref={resultRef} id="compact-preview-card" className="mt-4 pt-3.5 border-t border-[#E5E5E5] relative z-10">
          <div className="bg-[#F8FAFC] border-[1.5px] border-[#E5E5E5] rounded-[16px] p-4 shadow-2xs space-y-4">
            
            {/* Main Product Info & Multi-Image Gallery */}
            <div className="flex flex-col sm:flex-row items-start gap-3.5">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <img
                  src={productImage}
                  alt={productTitle}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-[#E5E5E5] bg-white shadow-2xs shrink-0"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const currentSrc = target.src || '';
                    if (productImage && !currentSrc.includes('images.weserv.nl') && !productImage.startsWith('data:')) {
                      target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(productImage);
                    } else {
                      target.src = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600';
                    }
                  }}
                />

                {/* Thumbnails row if multiple images exist */}
                {productGallery.length > 1 && (
                  <div className="flex items-center gap-1 overflow-x-auto max-w-[160px] pb-1 dir-ltr">
                    {productGallery.slice(0, 5).map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProductImage(imgUrl)}
                        className={`w-7 h-7 rounded-md border overflow-hidden bg-white shrink-0 cursor-pointer transition ${
                          productImage === imgUrl ? 'border-[#D31027] ring-2 ring-[#D31027]/20 scale-105' : 'border-slate-200 opacity-60 hover:opacity-100'
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
                              target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(imgUrl);
                            }
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] bg-slate-200 text-slate-800 font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">
                    {storeName}
                  </span>
                  {/* Conditional Discount Badge ONLY when original price exists */}
                  {originalPriceAed && originalPriceAed > priceAed && (
                    <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-md dir-ltr">
                      -{Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100)}%
                    </span>
                  )}
                </div>

                <h3 className="font-black text-sm sm:text-base text-[#111111] leading-snug">
                  {productTitle}
                </h3>

                {/* Dynamic Specifications Grid (مشخصات واقعی کالا) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-neutral-400 block font-bold">وزن محاسباتی:</span>
                    <span className="text-[#111111] font-black">{weightKg} کیلوگرم</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-neutral-400 block font-bold">قیمت دبی:</span>
                    <span className="text-[#111111] font-black dir-ltr">{formatAed(priceAed)}</span>
                  </div>
                  {(brandName || storeName) && (
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-neutral-400 block font-bold">برند / فروشگاه:</span>
                      <span className="text-[#111111] font-black truncate block">{brandName || storeName}</span>
                    </div>
                  )}
                  {categoryName && (
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-neutral-400 block font-bold">دسته‌بندی:</span>
                      <span className="text-[#111111] font-black truncate block">{categoryName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Variant Selection UI (گزینه‌های قابل انتخاب) */}
            {(() => {
              const validOptions = (productOptions || []).filter(
                (opt) => opt && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal', 'default title'].includes(opt.trim().toLowerCase())
              );
              if (validOptions.length === 0) return null;
              return (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#111111] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900 inline-block"></span>
                      <span>گزینه‌های قابل انتخاب:</span>
                    </span>
                    {selectedOption && validOptions.includes(selectedOption) && (
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md dir-rtl">
                        انتخاب‌شده: <span className="text-slate-900 font-black">{selectedOption}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5 dir-ltr">
                    {validOptions.map((opt) => {
                      const isSelected = selectedOption === opt;
                      // Check if this option has a specific price in productVariantItems
                      const matchedItem = productVariantItems.find(v =>
                        v.title?.toLowerCase() === opt.toLowerCase() ||
                        v.name?.toLowerCase() === opt.toLowerCase() ||
                        v.size?.toLowerCase() === opt.toLowerCase() ||
                        v.flavor?.toLowerCase() === opt.toLowerCase()
                      );
                      const optPrice = matchedItem ? (matchedItem.priceAED ?? matchedItem.priceAed) : null;
                      const hasDifferentPrice = optPrice && optPrice > 0;

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-slate-900 text-white border-2 border-slate-900 shadow-xs scale-[1.02]'
                              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          <span>{opt}</span>
                          {hasDifferentPrice && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
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

            {/* Product Features & Description Box (ویژگی‌های محصول) */}
            {productDescription && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-1.5">
                <span className="text-xs font-black text-[#111111] flex items-center gap-1.5">
                  <span className="text-amber-500">✨</span>
                  <span>ویژگی‌های محصول</span>
                </span>
                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100/90">
                  {productDescription}
                </p>
              </div>
            )}

            {/* Pre-Add Quantity Selector & Live Total Price Tag */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold text-slate-700">تعداد کالا:</span>
                <div className="flex items-center gap-2.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center cursor-pointer transition text-base border border-slate-200"
                  >
                    -
                  </button>
                  <span className="font-black text-sm text-slate-900 w-5 text-center dir-ltr">
                    {toPersianDigits(quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center cursor-pointer transition text-base border border-slate-200"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Live Bulk Discount Tier Badge */}
              {(pricingResult.commissionPercent < 20 || quantity > 1) && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>✨</span>
                    <span>کارمزد تخفیفی {toPersianDigits(pricingResult.commissionPercent)}٪</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700">
                    ({quantity > 1 ? 'تخفیف خرید چندتایی' : 'تخفیف پله‌ای حجم'})
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-bold text-neutral-500 block">جمع کل قابل پرداخت:</span>
                  {quantity > 1 && (
                    <span className="text-[10px] text-neutral-400 font-medium block">
                      (میانگین هر واحد: {formatToman(Math.round(finalToman / quantity))})
                    </span>
                  )}
                </div>
                <div className="text-lg sm:text-xl font-black text-[#E11D48] tracking-tight">
                  {formatToman(finalToman)}
                </div>
              </div>

              <button
                onClick={handleAddToCartClick}
                className={`w-full font-extrabold text-sm py-3.5 px-5 rounded-[12px] transition flex items-center justify-center gap-2 cursor-pointer border-none shadow-2xs ${
                  isAdded ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-[#111111] hover:bg-black text-white'
                }`}
              >
                {isAdded ? (
                  <>
                    <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                    <span>✓ اضافه شد!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4.5 h-4.5" />
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
      )}
    </section>
  );
};
