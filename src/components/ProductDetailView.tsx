import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Tag,
  X,
  Sparkles,
  Layers,
  Check,
  Video,
  ShieldCheck,
  Maximize2,
  Zap,
  ZoomIn
} from 'lucide-react';
import type { FinancialSettings, Order, User, CartItem, CmsConfig, VariantDimension, VariantOption } from '../types';
import { formatToman, formatAed, toPersianDigits, calculateFinalToman, getEffectiveAedRate } from '../utils/formatters';
import { calculateOrderPricing } from '../utils/pricingEngine';
import { validateDiscountCode, incrementDiscountUsage, type ValidationResult } from '../utils/discountHelper';

/**
 * Utility to strip raw HTML tags and markdown formatting from scraped text
 */
function cleanHtmlAndMarkdown(text?: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/#+\s?/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ProductDetailViewProps {
  product: {
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    images?: string[];
    galleryImages?: string[];
    videos?: string[];
    features?: string[];
    storeName?: string;
    storeOrigin?: string;
    calculatedTomanOverride?: number;
    brand?: string;
    category?: string;
    discountPercent?: number;
    originalPriceAed?: number;
    servings?: string;
    origin?: string;
    selectedOption?: string;
    options?: string[];
    flavors?: string[];
    sizes?: string[];
    dimensions?: VariantDimension[];
    variantGroups?: any[];
    variants?: any[];
    description?: string;
    descriptionFa?: string;
    isLocalInventory?: boolean;
  };
  cartItems?: CartItem[];
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  onUpdateCartQuantity?: (id: string, delta: number) => void;
  onRemoveCartItem?: (id: string) => void;
  onClearCart?: () => void;
  settings: FinancialSettings;
  cms?: CmsConfig | null;
  currentUser?: User | null;
  onBackToMain: () => void;
  onOrderCreated: (order: Order) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  cartItems,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onClearCart,
  settings,
  cms,
  currentUser,
  onBackToMain,
  onOrderCreated
}) => {
  // Step 1: Product / Cart detail view. Step 2: Recipient details & order checkout
  const [step, setStep] = useState<1 | 2>(1);
  const [qty, setQty] = useState<number>(1);
  const [isAddedToCart, setIsAddedToCart] = useState<boolean>(false);

  // Gallery and Image States
  const rawGalleryList = Array.isArray(product.galleryImages) && product.galleryImages.length > 0
    ? product.galleryImages
    : (Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : (product.image ? [product.image] : []));
  const galleryList = Array.from(new Set(rawGalleryList.filter(Boolean)));

  const [activeImage, setActiveImage] = useState<string>(galleryList[0] || product.image || '');

  useEffect(() => {
    if (galleryList.length > 0) {
      if (!activeImage || !galleryList.includes(activeImage)) {
        setActiveImage(galleryList[0]);
      }
    }
  }, [product.image, galleryList]);

  // Interactive Hover Zoom Lens States (Desktop)
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Lightbox Modal States (Mobile tap & Desktop expand)
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxZoom, setLightboxZoom] = useState<boolean>(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const openLightbox = (index?: number) => {
    const targetIdx = index !== undefined ? index : galleryList.indexOf(activeImage);
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

  // Variant selector states
  const [selectedVariants, setSelectedVariants] = useState<Record<string, VariantOption>>({});
  const [selectedOptionFallback] = useState<string>(product.selectedOption || product.options?.[0] || '');

  // Extract dimensions or fallback to flavors/sizes
  const dimensions: VariantDimension[] = React.useMemo(() => {
    if (Array.isArray(product.dimensions) && product.dimensions.length > 0) {
      return product.dimensions;
    }
    if (Array.isArray(product.variantGroups) && product.variantGroups.length > 0) {
      return product.variantGroups.map((vg: any) => ({
        id: vg.id || 'group',
        name: vg.name || 'انتخاب گزینه',
        type: vg.type || 'generic',
        options: (vg.options || []).map((opt: any, idx: number) => ({
          id: opt.id || `opt-${idx}`,
          name: opt.name || String(opt),
          nameFa: opt.nameFa,
          priceAed: opt.priceAed !== undefined ? Number(opt.priceAed) : product.priceAed,
          image: opt.image,
          inStock: opt.inStock !== false
        }))
      }));
    }

    const dims: VariantDimension[] = [];
    if (Array.isArray(product.flavors) && product.flavors.length > 0) {
      dims.push({
        id: 'flavors',
        name: 'طعم (Flavor)',
        type: 'flavor',
        options: product.flavors.map((f, idx) => ({
          id: `flv-${idx}`,
          name: f,
          priceAed: product.priceAed,
          inStock: true
        }))
      });
    }
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      dims.push({
        id: 'sizes',
        name: 'وزن / سایز (Size)',
        type: 'size',
        options: product.sizes.map((s, idx) => ({
          id: `sz-${idx}`,
          name: s,
          priceAed: product.priceAed,
          inStock: true
        }))
      });
    }
    if (dims.length === 0 && Array.isArray(product.variants) && product.variants.length > 0) {
      const flavorItems: VariantOption[] = [];
      const sizeItems: VariantOption[] = [];
      const genericItems: VariantOption[] = [];

      product.variants.forEach((v: any, idx: number) => {
        const vName = typeof v === 'string' ? v : (v.name || '');
        if (!vName) return;
        const vPrice = v.priceAED !== undefined ? Number(v.priceAED) : (v.priceAed !== undefined ? Number(v.priceAed) : product.priceAed);
        const vOpt: VariantOption = {
          id: v.id || `var-${idx}`,
          name: vName,
          priceAed: vPrice,
          image: v.imageThumbnail || v.image,
          inStock: v.inStock !== false
        };

        const lower = vName.toLowerCase();
        if (lower.includes('kg') || lower.includes('lb') || lower.includes('gram') || lower.includes('oz') || lower.includes('serving') || lower.includes('سروینگ') || lower.includes('عددی') || lower.includes('کپسول') || lower.includes('قرص')) {
          sizeItems.push(vOpt);
        } else if (lower.includes('flavor') || lower.includes('chocolate') || lower.includes('vanilla') || lower.includes('strawberry') || lower.includes('طعم') || lower.includes('شکلات') || lower.includes('توت') || lower.includes('موز') || lower.includes('کوکی')) {
          flavorItems.push(vOpt);
        } else {
          genericItems.push(vOpt);
        }
      });

      if (flavorItems.length > 0) {
        dims.push({ id: 'flavor', name: 'طعم (Flavor)', type: 'flavor', options: flavorItems });
      }
      if (sizeItems.length > 0) {
        dims.push({ id: 'size', name: 'وزن / سایز (Size)', type: 'size', options: sizeItems });
      }
      if (genericItems.length > 0) {
        dims.push({ id: 'variants', name: 'انتخاب نوع کالا', type: 'generic', options: genericItems });
      }
    }

    if (dims.length === 0 && Array.isArray(product.options) && product.options.length > 0) {
      const validOpts = product.options.filter(o => o && !['default', 'standard', 'پیش‌فرض'].includes(o.toLowerCase()));
      if (validOpts.length > 0) {
        dims.push({
          id: 'options',
          name: 'گزینه‌های کالا',
          type: 'generic',
          options: validOpts.map((o, idx) => ({
            id: `opt-${idx}`,
            name: o,
            priceAed: product.priceAed,
            inStock: true
          }))
        });
      }
    }
    return dims;
  }, [product]);

  // Initialize selected variants
  useEffect(() => {
    if (dimensions.length > 0) {
      const initial: Record<string, VariantOption> = {};
      dimensions.forEach(dim => {
        if (dim.options.length > 0 && !selectedVariants[dim.id]) {
          const firstInStock = dim.options.find(o => o.inStock !== false) || dim.options[0];
          initial[dim.id] = firstInStock;
        }
      });
      if (Object.keys(initial).length > 0) {
        setSelectedVariants(prev => ({ ...initial, ...prev }));
      }
    }
  }, [dimensions]);

  // Dynamically calculate effective Price AED based on selected variant
  const selectedVariantPriceAed = React.useMemo(() => {
    let p = product.priceAed || 280;
    Object.values(selectedVariants).forEach((v: VariantOption) => {
      if (v?.priceAed && v.priceAed > 0) {
        p = v.priceAed;
      }
    });
    return p;
  }, [product.priceAed, selectedVariants]);

  // Recipient Form States
  const [customerName, setCustomerName] = useState<string>(currentUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(currentUser?.phoneNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Promo Code States
  const [promoInput, setPromoInput] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<ValidationResult | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState<boolean>(false);
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !customerName) setCustomerName(currentUser.name);
      if (currentUser.phoneNumber && !phoneNumber) setPhoneNumber(currentUser.phoneNumber);
    }
  }, [currentUser]);

  const hasCart = Array.isArray(cartItems) && cartItems.length > 0;

  // Single Product Calculations
  const priceAed = selectedVariantPriceAed || product.priceAed || 280;
  const originalPriceAed = product.originalPriceAed;
  const weightKg = product.weightKg || 0.5;

  const activeAedRate = getEffectiveAedRate(settings, cms);

  const singleToman = product.calculatedTomanOverride
    ? product.calculatedTomanOverride
    : calculateFinalToman(
        priceAed,
        weightKg,
        settings.cargoRatePerKg,
        settings.profitMargin,
        activeAedRate
      );

  // Aggregate Cart Calculations
  const cartTotalAed = hasCart
    ? cartItems.reduce((sum, item) => sum + item.priceAed * item.quantity, 0)
    : priceAed * qty;

  const cartTotalWeightKg = hasCart
    ? Math.round(cartItems.reduce((sum, item) => sum + item.weightKg * item.quantity, 0) * 100) / 100
    : Math.round(weightKg * qty * 100) / 100;

  const totalItemCount = hasCart
    ? cartItems.reduce((sum, item) => sum + item.quantity, 0)
    : qty;

  // Dynamic Bulk Order Pricing Engine
  const pricingResult = calculateOrderPricing(
    cartTotalAed,
    totalItemCount,
    activeAedRate,
    cms?.pricingRules,
    cartTotalWeightKg,
    settings.cargoRatePerKg
  );

  const cartTotalToman = (!hasCart && product.calculatedTomanOverride)
    ? product.calculatedTomanOverride * qty
    : pricingResult.finalTotalToman;

  // Effective Total with Discount Code Applied
  const discountAmountToman = (appliedDiscount && appliedDiscount.isValid) ? appliedDiscount.discountAmountToman : 0;
  const effectiveTotalToman = Math.max(0, cartTotalToman - discountAmountToman);

  const baseGoodsToman = Math.round(cartTotalAed * activeAedRate);
  const cargoShippingToman = Math.round(pricingResult.shippingCostAed * activeAedRate);
  const commissionToman = Math.round(pricingResult.commissionAmountAed * activeAedRate);

  // User Savings from Volume Tier Commission and Combined Shipping Cap
  const baselineAed = cartTotalAed + (cartTotalAed * 0.20) + (totalItemCount * 20);
  const baselineToman = Math.round(baselineAed * activeAedRate);
  const savingsToman = Math.max(0, baselineToman - cartTotalToman);

  const getItemUnitToman = (item: CartItem) => {
    if (cartTotalAed > 0 && item.priceAed > 0) {
      const share = (item.priceAed * item.quantity) / cartTotalAed;
      return Math.round((cartTotalToman * share) / item.quantity);
    }
    if (item.calculatedToman) return item.calculatedToman;
    return calculateFinalToman(item.priceAed, item.weightKg, settings.cargoRatePerKg, settings.profitMargin, activeAedRate);
  };

  const handleApplyPromoCode = async () => {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoMessage(null);
    try {
      const itemsList = hasCart ? cartItems : undefined;
      const singleProd = !hasCart ? product : undefined;
      const res = await validateDiscountCode(promoInput, cartTotalToman, undefined, itemsList, singleProd);
      if (res.isValid) {
        setAppliedDiscount(res);
        setPromoMessage({ text: res.message, type: 'success' });
      } else {
        setAppliedDiscount(null);
        setPromoMessage({ text: res.message, type: 'error' });
      }
    } catch (_e) {
      setPromoMessage({ text: 'خطا در بررسی کد تخفیف.', type: 'error' });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedDiscount(null);
    setPromoInput('');
    setPromoMessage(null);
  };

  const handleSubmitOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const dynamicMinOrderToman = settings.minOrderAmountToman && Number(settings.minOrderAmountToman) > 0
      ? Number(settings.minOrderAmountToman)
      : (settings.minOrderAed && Number(settings.minOrderAed) > 0 ? Number(settings.minOrderAed) * activeAedRate : 0);

    if (dynamicMinOrderToman > 0 && effectiveTotalToman < dynamicMinOrderToman) {
      setErrorMessage(`حداقل مبلغ سفارش برای ارسال، ${formatToman(dynamicMinOrderToman)} می‌باشد. لطفاً محصولات بیشتری به سبد خود اضافه کنید.`);
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('لطفاً نام و نام خانوادگی تحویل‌گیرنده را وارد کنید.');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      setErrorMessage('لطفاً شماره تماس معتبر (مثلاً ۰۹۱۲۱۲۳۴۵۶۷) وارد کنید.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setErrorMessage('لطفاً آدرس دقیق تحویل در ایران را وارد کنید.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const orderProductTitle = hasCart
        ? cartItems.map((i) => `${toPersianDigits(i.quantity)} × ${i.title}`).join(' | ')
        : `${toPersianDigits(qty)} × ${product.title}`;

      const orderProductUrl = hasCart ? cartItems[0]?.url || product.url : product.url;
      const orderProductImage = hasCart ? cartItems[0]?.image || product.image : product.image;
      const orderStoreName = hasCart ? cartItems[0]?.storeName || product.storeName : product.storeName;

      const activeVariantSummary = Object.entries(selectedVariants)
        .map(([_, v]) => {
          const opt = v as VariantOption;
          return opt?.nameFa || opt?.name || '';
        })
        .filter(Boolean)
        .join(' - ');

      const orderSelectedOption = hasCart
        ? cartItems.map((i) => i.selectedOption ? `${i.title} (${i.selectedOption})` : null).filter(Boolean).join(' | ')
        : (activeVariantSummary || product.selectedOption);

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          customerName: customerName.trim(),
          phoneNumber: phoneNumber.trim(),
          deliveryAddress: deliveryAddress.trim(),
          notes: notes.trim(),
          productTitle: orderProductTitle,
          productUrl: orderProductUrl,
          productImage: orderProductImage,
          storeName: orderStoreName || 'فروشگاه دبی',
          priceAed: cartTotalAed,
          weightKg: cartTotalWeightKg,
          calculatedToman: effectiveTotalToman,
          selectedOption: orderSelectedOption || undefined,
          discountCode: appliedDiscount?.discountCodeObj?.code,
          discountAmountToman: discountAmountToman > 0 ? discountAmountToman : undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.order) {
        if (appliedDiscount?.discountCodeObj?.id) {
          incrementDiscountUsage(appliedDiscount.discountCodeObj.id);
        }
        if (hasCart && onClearCart) {
          onClearCart();
        }
        onOrderCreated(data.order);
      } else {
        setErrorMessage(data.error || 'خطا در ثبت سفارش.');
      }
    } catch (e) {
      console.error('Error submitting order:', e);
      setErrorMessage('خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSingleProductToCart = () => {
    if (!onAddToCart) return;

    const selectedFlavorOpt = Object.entries(selectedVariants).find(([dimId]) => dimId.toLowerCase().includes('flavor') || dimId === 'flavors')?.[1] as VariantOption | undefined;
    const selectedSizeOpt = Object.entries(selectedVariants).find(([dimId]) => dimId.toLowerCase().includes('size') || dimId === 'sizes')?.[1] as VariantOption | undefined;
    
    const selectedFlavorName = selectedFlavorOpt?.nameFa || selectedFlavorOpt?.name || (product.flavors && product.flavors.length > 0 ? product.flavors[0] : undefined);
    const selectedSizeName = selectedSizeOpt?.nameFa || selectedSizeOpt?.name || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);

    const activeVariantSummary = Object.entries(selectedVariants)
      .map(([_, v]) => {
        const opt = v as VariantOption;
        return opt?.nameFa || opt?.name || '';
      })
      .filter(Boolean)
      .join(' - ');

    const payload = {
      id: product.url || product.title,
      title: product.title,
      url: product.url || 'https://www.drnutrition.com',
      priceAed: priceAed,
      originalPriceAed: originalPriceAed,
      discountPercent: product.discountPercent,
      weightKg: weightKg,
      image: activeImage || product.image,
      images: galleryList.length > 0 ? galleryList : (product.image ? [product.image] : []),
      galleryImages: galleryList.length > 0 ? galleryList : (product.image ? [product.image] : []),
      storeName: product.storeName || 'فروشگاه دبی',
      brand: product.brand,
      quantity: qty,
      calculatedTomanOverride: product.calculatedTomanOverride,
      calculatedToman: Math.round(singleToman),
      selectedOption: activeVariantSummary || selectedOptionFallback || undefined,
      selectedFlavor: selectedFlavorName,
      selectedSize: selectedSizeName,
      selectedVariants: selectedVariants,
      flavors: product.flavors,
      sizes: product.sizes,
      options: product.options,
      dimensions: dimensions,
      isLocalInventory: product.isLocalInventory
    };

    onAddToCart(payload, selectedFlavorName, selectedSizeName);
    setIsAddedToCart(true);
    setTimeout(() => setIsAddedToCart(false), 2200);
  };

  // Clean description and extract structured benefits
  const cleanDescription = cleanHtmlAndMarkdown(product.description || product.descriptionFa || '');
  const titleLower = (product.title || '').toLowerCase();

  // Dynamic Structure 1: Composition & Formulation (ترکیبات و ساختار)
  const getCompositionBullets = () => {
    if (titleLower.includes('protein') || titleLower.includes('وی') || titleLower.includes('whey') || titleLower.includes('iso')) {
      return [
        'پروتئین وی ایزوله و کنسانتره میکروفیلتر شده با خلوص بیش از ۸۰٪',
        'پروفایل کامل آمینو اسیدهای ضروری و شاخه‌دار (BCAA & EAA)',
        'فاقد شکر افزوده، چربی ترانس و ناخالصی‌های غیرمجاز'
      ];
    }
    if (titleLower.includes('creatine') || titleLower.includes('کراتین')) {
      return [
        'کراتین مونوهیدرات ۱۰۰٪ خالص میکرونایز شده با انحلال‌پذیری بالا',
        'درجه خلوص دارویی (Pharmaceutical Grade) بدون طعم‌دهنده مصنوعی',
        'فاقد فیلر، کربوهیدرات اضافه و مواد نگه‌دارنده شیمیایی'
      ];
    }
    if (titleLower.includes('c4') || titleLower.includes('پمپ') || titleLower.includes('pre-workout') || titleLower.includes('preworkout')) {
      return [
        'فرمولاسیون سینرژیک بتا-آلانین، سیترولین مالات و ال-تیروزین',
        'حاوی کافئین آنهیدروس خالص برای افزایش فوری تمرکز و هوشیاری',
        'ماتریکس الکترولیت‌های هیدراتاسیون جهت تعادل یونی عضلات'
      ];
    }
    if (titleLower.includes('gainer') || titleLower.includes('گینر') || titleLower.includes('mass')) {
      return [
        'نسبت طلایی کربوهیدرات‌های پیچیده به پروتئین با ارزش بیولوژیکی بالا',
        'غنی‌شده با مالتودکسترین استاندارد و آنزیم‌های هضم گوارشی',
        'تامین زنجیره کامل ویتامین‌ها و مواد معدنی مورد نیاز رشد'
      ];
    }
    if (titleLower.includes('collagen') || titleLower.includes('biotin') || titleLower.includes('کلاژن') || titleLower.includes('بیوتین')) {
      return [
        'پپتیدهای کلاژن هیدرولیز شده نوع ۱ و ۳ با جذب سلولی سریع',
        'ترکیب هم‌افزا با ویتامین C و هیالورونیک اسید برای سنتز بهینه',
        'دوز استاندارد بیوتین خالص جهت تقویت فولیکول‌های مو و بافت ناخن'
      ];
    }
    if (titleLower.includes('omega') || titleLower.includes('امگا')) {
      return [
        'روغن ماهی فوق تصفیه شده با دوز بالای EPA و DHA فعال',
        'عاری از جیوه، فلزات سنگین و توکسین‌های صنعتی (Molecularly Distilled)',
        'کپسول‌های ژلاتینی نرم با پوشش انتریک برای جلوگیری از طعم نامطلوب'
      ];
    }
    if (titleLower.includes('multi') || titleLower.includes('مولتی') || titleLower.includes('vitamin') || titleLower.includes('ویتامین')) {
      return [
        'مجموعه جامع ویتامین‌های گروه B، ویتامین D3، زینک و منیزیم کلاته',
        'حاوی عصاره‌های گیاهی و آنتی‌اکسیدان‌های قوی محافظت سلولی',
        'فرمول زیست‌دسترس‌پذیر با حداکثر جذب در دستگاه گوارش'
      ];
    }
    return [
      'فرمولاسیون استاندارد با مواد اولیه مرغوب بین‌المللی گرید A',
      'تولید مطابق بالاترین استانداردهای کنترل کیفیت GMP و cGMP',
      'فاقد ترکیبات غیرمجاز، محرک‌های مضر و مواد افزودنی غیراستاندارد'
    ];
  };

  // Dynamic Structure 2: Key Benefits & Performance (کارایی و عملکرد)
  const getPerformanceBullets = () => {
    if (titleLower.includes('protein') || titleLower.includes('وی') || titleLower.includes('whey') || titleLower.includes('iso')) {
      return [
        'تسریع رشد و ریکاوری فیبرهای عضلانی پس از تمرینات سنگین',
        'جلوگیری از فرآیند کاتابولیسم و تحلیل عضلات در دوره‌های رژیم',
        'هضم سریع و روان بدون ایجاد نفخ و سنگینی در معده'
      ];
    }
    if (titleLower.includes('creatine') || titleLower.includes('کراتین')) {
      return [
        'افزایش توان انفجاری و بازسازی سریع ذخایر فسفاژن ATP',
        'افزایش حجم سلولی و هیدراتاسیون مفید داخل سلول‌های عضلانی',
        'بهبود رکوردها و افزایش استقامت در ست‌های پرفشار تمرینی'
      ];
    }
    if (titleLower.includes('c4') || titleLower.includes('پمپ') || titleLower.includes('pre-workout') || titleLower.includes('preworkout')) {
      return [
        'ایجاد پمپ عضلانی شدید (دم عضلانی) با افزایش اکسید نیتریک خون',
        'تاخیر چشمگیر در خستگی و سوزش عضلانی حین تمرینات شدید',
        'افزایش حداکثری انگیزه، تمرکز ذهنی و تمرکز ورزشی'
      ];
    }
    if (titleLower.includes('gainer') || titleLower.includes('گینر') || titleLower.includes('mass')) {
      return [
        'افزایش وزن و حجم عضلانی اصولی در افراد لاغراندام (Hardgainers)',
        'بازسازی سریع ذخایر گلیکوژن کبد و عضلات پس از تمرینات سخت',
        'تامین انرژی متوالی در طول روز بدون ایجاد احساس افت قند'
      ];
    }
    if (titleLower.includes('collagen') || titleLower.includes('biotin') || titleLower.includes('کلاژن') || titleLower.includes('بیوتین')) {
      return [
        'افزایش خاصیت ارتجاعی، سفتی و رطوبت طبیعی لایه‌های پوست',
        'کاهش ریزش مو، افزایش ضخامت تارهای مو و تقویت استحکام ناخن‌ها',
        'کمک به حفظ سلامت مفاصل، تاندون‌ها و بافت‌های پیوندی بدن'
      ];
    }
    if (titleLower.includes('omega') || titleLower.includes('امگا')) {
      return [
        'تقویت سلامت قلب و عروق و کمک به تنظیم سطح چربی خون',
        'کاهش التهابات مفصلی و بهبود سرعت بازیابی تاندون‌ها پس از ورزش',
        'بهبود عملکرد شناختی، حافظه و سلامت سیستم عصبی'
      ];
    }
    if (titleLower.includes('multi') || titleLower.includes('مولتی') || titleLower.includes('vitamin') || titleLower.includes('ویتامین')) {
      return [
        'تقویت سیستم دفاعی بدن و محافظت در برابر بیماری‌ها و خستگی',
        'افزایش سطح انرژی روزانه و بهبود سوخت‌وساز طبیعی بدن',
        'تامین صددرصدی نیاز روزانه ورزشکاران به ریزمغذی‌های حیاتی'
      ];
    }
    return [
      'افزایش شادابی، انرژی و حفظ سلامت عمومی بدن در طول روز',
      'حفظ بالاترین راندمان زیستی با فرمولاسیون تخصصی و جذب بهینه',
      'مناسب برای استفاده منظم ورزشکاران و عموم علاقه‌مندان به سلامتی'
    ];
  };

  // EMPTY CART VIEW (Only when no cart items AND no product was provided)
  if ((!cartItems || cartItems.length === 0) && (!product || !product.title)) {
    return (
      <div id="detail" className="space-y-4 font-['Vazirmatn',sans-serif] max-w-lg mx-auto pb-20 animate-fade-in text-center">
        <div className="bg-white border border-slate-200/90 rounded-[24px] p-8 shadow-2xs space-y-4 my-6">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">سبد خرید شما خالی است</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
            می‌توانید لینک کالا از فروشگاه‌های دبی را استخراج کنید یا از بخش پیشنهادهای ویژه محصول مورد نظر را به سبد اضافه نمایید.
          </p>
          <button
            onClick={onBackToMain}
            className="w-full bg-[#111111] hover:bg-black text-white font-extrabold text-xs py-3.5 px-5 rounded-[14px] transition cursor-pointer border-none shadow-xs flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به صفحه اصلی و برآورد قیمت</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="detail" className="space-y-4 font-['Vazirmatn',sans-serif] max-w-lg mx-auto pb-20 animate-fade-in">
      
      {/* ------------------------------------------------------------------ */}
      {/* STEP 1: CART ITEMS OR SINGLE PRODUCT VIEW */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div className="space-y-4">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-[20px] p-3.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-slate-800" />
              <h2 className="font-black text-sm md:text-base text-slate-900">
                {hasCart ? 'سبد خرید شما' : 'مشخصات کالا'}
              </h2>
              <span className="bg-[#111111] text-white text-[10px] font-black px-2 py-0.5 rounded-full dir-ltr">
                {toPersianDigits(totalItemCount)} کالا
              </span>
            </div>
            <button
              onClick={onBackToMain}
              className="text-xs font-extrabold text-slate-600 hover:text-black flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <span>افزودن کالای دیگر</span>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* MULTI-ITEM CART LIST */}
          {hasCart ? (
            <div className="space-y-3">
              {cartItems.map((item) => {
                const itemUnitToman = getItemUnitToman(item);
                const itemSubtotal = itemUnitToman * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/90 rounded-[20px] p-4 shadow-2xs space-y-3 relative transition hover:border-slate-300"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400'}
                        alt={item.title}
                        className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl border border-slate-200 bg-slate-50 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-md">
                            {item.storeName || 'فروشگاه دبی'}
                          </span>
                          {/* TRASH / DELETE BUTTON */}
                          <button
                            onClick={() => onRemoveCartItem && onRemoveCartItem(item.id)}
                            className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0"
                            title="حذف از سبد خرید"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px]">حذف</span>
                          </button>
                        </div>
                        <h3 className="font-extrabold text-xs md:text-sm text-slate-900 leading-snug line-clamp-2">
                          {item.title}
                        </h3>
                        {item.selectedOption && (
                          <div className="text-[10px] font-bold text-slate-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md inline-block">
                            گزینه: <span className="font-extrabold text-amber-900">{item.selectedOption}</span>
                          </div>
                        )}
                        {(item.selectedFlavor || item.selectedSize) && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {item.selectedFlavor && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                طعم: <span className="font-extrabold">{item.selectedFlavor}</span>
                              </span>
                            )}
                            {item.selectedSize && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                سایز: <span className="font-extrabold">{item.selectedSize}</span>
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 font-medium dir-ltr">
                          قیمت واحد: <span className="font-bold text-slate-800">{formatToman(itemUnitToman)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Modifiers & Item Subtotal */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => onUpdateCartQuantity && onUpdateCartQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-900 font-black flex items-center justify-center cursor-pointer transition shadow-2xs border border-slate-200"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-sm text-slate-900 w-6 text-center dir-ltr">
                          {toPersianDigits(item.quantity)}
                        </span>
                        <button
                          onClick={() => onUpdateCartQuantity && onUpdateCartQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-900 font-black flex items-center justify-center cursor-pointer transition shadow-2xs border border-slate-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 font-medium block text-right">جمع کالا:</span>
                        <span className="font-black text-slate-900 text-sm md:text-base text-left block">
                          {formatToman(itemSubtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* SINGLE PRODUCT VIEW WITH HIGH-RES GALLERY & HOVER ZOOM LENS */
            <div className="bg-white border border-slate-200/90 rounded-[28px] p-4 sm:p-5 shadow-2xs space-y-5">
              
              {/* Store Origin Pill & Stock Status */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-2xs">
                  <span>🇦🇪</span>
                  <span>مبدا سفارش:</span>
                  <span className="text-amber-400 font-extrabold">{product.storeName || 'انبار دبی'}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>موجود در انبار امارات</span>
                </div>
              </div>

              {/* ------------------------------------------------------------------ */}
              {/* FULL-SIZE PROFESSIONAL PRODUCT GALLERY WITH HOVER ZOOM LENS */}
              {/* ------------------------------------------------------------------ */}
              <div className="space-y-3 select-none">
                {/* Main High-Resolution Viewport Stage */}
                <div
                  ref={imageContainerRef}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onMouseMove={handleMouseMove}
                  onClick={() => openLightbox()}
                  className="relative w-full h-[380px] sm:h-[440px] md:h-[460px] bg-slate-50 border border-slate-200/90 rounded-[24px] overflow-hidden flex items-center justify-center p-4 shadow-sm cursor-zoom-in group"
                >
                  {activeImage ? (
                    <img
                      src={activeImage}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      style={{
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        transform: isHovered ? 'scale(2.3)' : 'scale(1)'
                      }}
                      className="w-full h-full object-contain object-center block rounded-[20px] transition-transform duration-100 ease-out will-change-transform"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (String(target.src || '').includes('images.weserv.nl') === false && activeImage) {
                          target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(String(activeImage));
                        }
                      }}
                    />
                  ) : (
                    <span className="font-black text-4xl text-slate-800 tracking-tighter">
                      OMEX
                    </span>
                  )}

                  {/* Desktop Hover Hint Pill */}
                  <div className={`absolute bottom-3 right-3 hidden sm:flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full pointer-events-none transition-opacity duration-200 ${
                    isHovered ? 'opacity-20' : 'opacity-90'
                  }`}>
                    <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                    <span>جهت بزرگنمایی نشانگر را روی تصویر ببرید</span>
                  </div>

                  {/* Tap to Expand Button (Mobile & Desktop Lightbox Trigger) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightbox();
                    }}
                    className="absolute top-3 left-3 bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-2xl shadow-sm border border-slate-200 transition active:scale-95 cursor-pointer z-10"
                    title="مشاهده تمام صفحه تصویر"
                    aria-label="مشاهده تمام صفحه تصویر"
                  >
                    <Maximize2 className="w-4 h-4 text-slate-700" />
                  </button>

                  {/* Image Counter Badge if multiple images exist */}
                  {galleryList.length > 1 && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-200/80 shadow-2xs">
                      تصویر {toPersianDigits(galleryList.indexOf(activeImage) + 1)} از {toPersianDigits(galleryList.length)}
                    </div>
                  )}
                </div>

                {/* Horizontal Interactive Thumbnail Strip */}
                {galleryList.length > 1 && (
                  <div className="flex items-center justify-center gap-2.5 overflow-x-auto pb-1 pt-1 px-1 dir-ltr">
                    {galleryList.map((imgUrl, imgIdx) => {
                      const isSelected = activeImage === imgUrl;
                      return (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => setActiveImage(imgUrl)}
                          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white cursor-pointer shrink-0 ${
                            isSelected
                              ? 'border-slate-900 shadow-sm scale-105 ring-2 ring-slate-900/20'
                              : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Preview ${imgIdx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain rounded-xl"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (String(target.src || '').includes('images.weserv.nl') === false && imgUrl) {
                                target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(String(imgUrl));
                              }
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Badges & Product Title */}
              <div className="space-y-2 text-center pt-1">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {originalPriceAed && originalPriceAed > priceAed && (
                    <span className="bg-rose-100 text-rose-700 text-xs font-black px-3 py-1 rounded-full dir-ltr">
                      -{toPersianDigits(Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100))}٪ تخفیف ویژه
                    </span>
                  )}
                  {product.brand && (
                    <span className="bg-slate-100 text-slate-800 text-xs font-black px-3 py-1 rounded-full border border-slate-200">
                      برند: {product.brand}
                    </span>
                  )}
                  <span className="bg-emerald-50 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-200">
                    تضمین ۱۰۰٪ اصالت
                  </span>
                </div>

                <h1 className="font-black text-base sm:text-lg text-slate-900 leading-snug px-2">
                  {product.title}
                </h1>
              </div>

              {/* Dynamic Variant Selector Rows (ابعاد انتخابی کالا مثل طعم و سایز) */}
              {dimensions.length > 0 && (
                <div className="space-y-3 pt-2 pb-1 border-t border-slate-100">
                  {dimensions.map((dim) => {
                    const currentSelected = selectedVariants[dim.id] || dim.options[0];
                    return (
                      <div key={dim.id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-right">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 inline-block"></span>
                            <span>{dim.name}</span>
                          </span>
                          {currentSelected && (
                            <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md">
                              انتخاب‌شده: <span className="text-slate-900 font-black">{currentSelected.nameFa || currentSelected.name}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-0.5 dir-ltr">
                          {dim.options.map((opt) => {
                            const isSelected = (currentSelected?.id === opt.id) || (currentSelected?.name === opt.name);
                            const isAvailable = opt.inStock !== false;

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => {
                                  if (!isAvailable) return;
                                  setSelectedVariants(prev => ({
                                    ...prev,
                                    [dim.id]: opt
                                  }));
                                  if (opt.image) {
                                    setActiveImage(opt.image);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                                  !isAvailable
                                    ? 'bg-slate-100/80 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50 line-through'
                                    : isSelected
                                    ? 'bg-slate-900 text-white border-2 border-slate-900 shadow-xs scale-[1.02] cursor-pointer'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-100 cursor-pointer'
                                }`}
                              >
                                {isSelected && isAvailable && <Check className="w-3 h-3 text-emerald-400" />}
                                <span>{opt.nameFa || opt.name}</span>
                                {!isAvailable && (
                                  <span className="text-[10px] text-rose-500 font-normal no-underline mr-1">
                                    (ناموجود)
                                  </span>
                                )}
                                {isAvailable && opt.priceAed && opt.priceAed !== product.priceAed && (
                                  <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                                    ({opt.priceAed} د.إ)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pricing Cards */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-[#F0FDF4] border border-emerald-100 rounded-[20px] p-3.5 text-center space-y-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold block">تحویل ایران</span>
                  <span className="font-black text-emerald-600 text-base md:text-lg block">
                    {formatToman(singleToman)}
                  </span>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-200 rounded-[20px] p-3.5 text-center space-y-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold block">قیمت درهم (دبی)</span>
                  <span className="font-black text-slate-900 text-base md:text-lg block dir-ltr">
                    {formatAed(priceAed)}
                  </span>
                </div>
              </div>

              {/* Quantity Selector & Add to Cart Action */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 font-['Vazirmatn',sans-serif]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">تعداد سفارش:</span>
                  <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      disabled={qty <= 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-black text-slate-900 w-6 text-center dir-ltr">
                      {toPersianDigits(qty)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(qty + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary Add to Cart Button */}
                <button
                  type="button"
                  onClick={handleAddSingleProductToCart}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer border-none ${
                    isAddedToCart
                      ? 'bg-emerald-600 text-white scale-[0.99]'
                      : 'bg-[#111111] hover:bg-black text-white active:scale-95'
                  }`}
                >
                  {isAddedToCart ? (
                    <>
                      <Check className="w-4.5 h-4.5 text-white" />
                      <span>✓ محصول به سبد خرید اضافه شد</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4.5 h-4.5" />
                      <span>افزودن به سبد خرید</span>
                    </>
                  )}
                </button>
              </div>

              {/* ------------------------------------------------------------------ */}
              {/* STRUCTURED PRODUCT HIGHLIGHTS & BENEFIT CARDS (3 CLEAN DISTINCT BLOCKS) */}
              {/* ------------------------------------------------------------------ */}
              <div className="space-y-3 pt-2 border-t border-slate-100 text-right">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>ویژگی‌ها و مزایای برجسته محصول</span>
                </h3>

                {/* Block 1: ترکیبات و ساختار (Composition & Formulation) */}
                <div className="bg-sky-50/50 border border-sky-200/80 rounded-2xl p-4 space-y-2.5 text-right">
                  <div className="flex items-center gap-2 text-sky-900 font-black text-xs sm:text-sm border-b border-sky-100 pb-1.5">
                    <Layers className="w-4 h-4 text-sky-600" />
                    <span>ترکیبات و ساختار (Composition & Formulation)</span>
                  </div>
                  <div className="space-y-2">
                    {getCompositionBullets().map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1.5 shrink-0"></span>
                        <span className="leading-relaxed font-medium">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Block 2: کارایی و عملکرد (Key Benefits & Performance) */}
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-2.5 text-right">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs sm:text-sm border-b border-amber-100 pb-1.5">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>کارایی و عملکرد (Key Benefits & Performance)</span>
                  </div>
                  <div className="space-y-2">
                    {getPerformanceBullets().map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0"></span>
                        <span className="leading-relaxed font-medium">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Block 3: تضمین اصالت و سلامت (Trust & Authenticity Badges) */}
                <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-2xl p-4 space-y-2.5 text-right">
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-xs sm:text-sm border-b border-emerald-100 pb-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>تضمین اصالت و سلامت فیزیکی کالا</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-xs text-emerald-950 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">۱۰۰٪ اورجینال و واردات مستقیم از نمایندگی‌های معتبر دبی</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-emerald-950 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">تضمین سلامت فیزیکی، بسته‌بندی پلمپ شرکتی و کنترل بارکد اصالت</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-emerald-950 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">دارای تاریخ انقضای معتبر و نگهداری در شرایط دمایی استاندارد</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Clean Description if available */}
                {cleanDescription && cleanDescription.length > 20 && (
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-2 text-right">
                    <span className="text-xs font-black text-slate-800 block">توضیحات تکمیلی کالا:</span>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-line">
                      {cleanDescription}
                    </p>
                  </div>
                )}
              </div>

              {/* EMBEDDED PRODUCT VIDEOS (ویدیوهای معرفی کالا) */}
              {Array.isArray(product.videos) && product.videos.length > 0 && (
                <div className="space-y-2 text-right pt-2 border-t border-slate-100">
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-indigo-600" />
                    <span>ویدیوهای معرفی کالا (Product Videos)</span>
                  </h3>
                  <div className="space-y-3">
                    {product.videos.map((vidUrl, vIdx) => (
                      <div key={vIdx} className="bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-800">
                        {vidUrl.includes('youtube.com') || vidUrl.includes('youtu.be') ? (
                          <iframe
                            src={vidUrl.replace('watch?v=', 'embed/')}
                            title={`Video ${vIdx + 1}`}
                            className="w-full aspect-video border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={vidUrl}
                            controls
                            className="w-full aspect-video bg-black"
                            poster={product.image}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* PROMO CODE INPUT BOX */}
          <div className="bg-white border border-slate-200/90 rounded-[20px] p-4 shadow-2xs space-y-3 font-['Vazirmatn',sans-serif]">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-xs text-slate-900">ورود کد تخفیف</h3>
            </div>

            {appliedDiscount && appliedDiscount.isValid ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>کد تخفیف <span className="uppercase tracking-wider font-extrabold">{appliedDiscount.discountCodeObj?.code}</span> اعمال شد</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                    تخفیف کسرشده: {formatToman(appliedDiscount.discountAmountToman)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromoCode}
                  className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  title="حذف کد تخفیف"
                >
                  <X className="w-4 h-4" />
                  <span>حذف</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="کد تخفیف را وارد کنید (مثال: OFF10)"
                    className="flex-1 p-2.5 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-black text-slate-900 focus:outline-none bg-[#F8FAFC] uppercase text-left dir-ltr"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromoCode}
                    disabled={isApplyingPromo || !promoInput.trim()}
                    className="bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shrink-0 border-none"
                  >
                    {isApplyingPromo ? 'در حال بررسی...' : 'اعمال کد'}
                  </button>
                </div>

                {promoMessage && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                    promoMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {promoMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{promoMessage.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CART TOTAL SUMMARY BOX - DETAILED FINANCIAL BREAKDOWN */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-4.5 shadow-2xs space-y-3 font-['Vazirmatn',sans-serif]">
            {(cms?.features?.showBreakdown ?? cms?.showPriceBreakdown ?? cms?.showBreakdown ?? true) && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-xs md:text-sm text-slate-900">
                    مشاهده ریز قیمت
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2.5 py-0.5 rounded-full">
                    {pricingResult.ruleDescription}
                  </span>
                </div>

                {/* 1. مجموع قیمت پایه کالاها (درهم / تومان) */}
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>مجموع قیمت پایه کالاها (دبی):</span>
                  <span className="font-bold text-slate-900 dir-ltr">
                    {toPersianDigits(cartTotalAed)} درهم ({formatToman(baseGoodsToman)})
                  </span>
                </div>

                {/* 2. کرایه کارگو ترکیبی */}
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>کرایه کارگو ترکیبی ({toPersianDigits(cartTotalWeightKg)} کیلوگرم):</span>
                  <span className="font-bold text-slate-900 dir-ltr">
                    {toPersianDigits(pricingResult.shippingCostAed)} درهم ({formatToman(cargoShippingToman)})
                  </span>
                </div>

                {/* 3. کارمزد اعمال‌شده با نمایش درصد فعلی */}
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>کارمزد سیستم ({toPersianDigits(pricingResult.commissionPercent)}٪):</span>
                  <span className="font-bold text-slate-900 dir-ltr">
                    {toPersianDigits(Math.round(pricingResult.commissionAmountAed * 10) / 10)} درهم ({formatToman(commissionToman)})
                  </span>
                </div>

                {/* 4. 🔥 میزان تخفیف سود شما */}
                {savingsToman > 0 ? (
                  <div className="flex justify-between items-center text-xs bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl text-emerald-900">
                    <span className="font-black flex items-center gap-1">
                      <span>🔥</span>
                      <span>میزان تخفیف سود شما (تخفیف پله‌ای):</span>
                    </span>
                    <span className="font-black text-emerald-700 dir-ltr">
                      {formatToman(savingsToman)} ({toPersianDigits(20 - pricingResult.commissionPercent)}٪ کارمزد کمتر)
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg font-medium text-right">
                    💡 با افزایش مبلغ سفارش به بالای ۵۰۰ درهم یا اضافه کردن کالاهای بیشتر، کارمزد سفارش از ۲۰٪ به ۱۸٪ و ۱۶٪ کاهش می‌یابد.
                  </div>
                )}

                {/* 4.5. 🎟️ کد تخفیف اعمال‌شده */}
                {discountAmountToman > 0 && (
                  <div className="flex justify-between items-center text-xs bg-emerald-100/80 border border-emerald-300 p-2.5 rounded-xl text-emerald-900">
                    <span className="font-black flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-emerald-700" />
                      <span>کد تخفیف ({appliedDiscount?.discountCodeObj?.code}):</span>
                    </span>
                    <span className="font-black text-emerald-800 dir-ltr">
                      -{formatToman(discountAmountToman)}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* 5. مبلغ کل قابل پرداخت (تومان) */}
            <div className={`pt-2 flex items-center justify-between ${(cms?.features?.showBreakdown ?? cms?.showPriceBreakdown ?? cms?.showBreakdown ?? true) ? 'border-t border-slate-100' : ''}`}>
              <div>
                <span className="text-xs font-black text-slate-900 block">مبلغ کل قابل پرداخت تحویل در ایران:</span>
                <span className="text-[10px] text-slate-400 font-medium block">شامل کالا + کارمزد {toPersianDigits(pricingResult.commissionPercent)}٪ + ارسال هوایی</span>
              </div>
              <div className="text-left">
                {discountAmountToman > 0 && (
                  <span className="text-xs text-slate-400 line-through block font-bold dir-ltr">
                    {formatToman(cartTotalToman)}
                  </span>
                )}
                <span className="font-black text-lg sm:text-xl text-[#E11D48] tracking-tight">{formatToman(effectiveTotalToman)}</span>
              </div>
            </div>
          </div>

          {/* RECIPIENT DETAILS FORM & DIRECT PAYMENT BUTTON */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-4.5 shadow-2xs space-y-3 font-['Vazirmatn',sans-serif]">
            <h3 className="font-extrabold text-xs md:text-sm text-slate-900 border-b border-slate-100 pb-2">
              اطلاعات تحویل‌گیرنده سفارش در ایران
            </h3>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-900 mb-1 text-right">
                  نام و نام خانوادگی تحویل‌گیرنده <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: علیرضا حسینی"
                  className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-[12px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-900 mb-1 text-right">
                  شماره تماس جهت هماهنگی پیک <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="09121234567"
                  className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-[12px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-left dir-ltr"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-900 mb-1 text-right">
                آدرس دقیق تحویل در ایران <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={2}
                placeholder="شهر، خیابان، کوچه، پلاک، واحد..."
                className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-[12px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition resize-none text-right"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-900 mb-1 text-right">
                توضیحات تکمیلی (اختیاری)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="طعم، زمان تحویل و غیره..."
                className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-[12px] text-xs font-medium text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-right"
              />
            </div>

            {/* Minimum Order Warning & Direct Payment Action Button */}
            {(() => {
              const dynamicMinOrderToman = settings.minOrderAmountToman && Number(settings.minOrderAmountToman) > 0
                ? Number(settings.minOrderAmountToman)
                : (settings.minOrderAed && Number(settings.minOrderAed) > 0 ? Number(settings.minOrderAed) * activeAedRate : 0);
              const isBelowMin = dynamicMinOrderToman > 0 && effectiveTotalToman < dynamicMinOrderToman;

              return (
                <>
                  {isBelowMin && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-[16px] text-amber-900 text-xs font-bold flex items-center gap-2 text-right dir-rtl">
                      <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                      <span>
                        حداقل مبلغ سفارش برای ارسال، {formatToman(dynamicMinOrderToman)} می‌باشد. لطفاً محصولات بیشتری به سبد خود اضافه کنید.
                      </span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleSubmitOrder()}
                      disabled={isSubmitting || isBelowMin}
                      className={`w-full font-black text-xs md:text-sm py-3.5 rounded-[16px] transition shadow-md border-none text-center flex items-center justify-center gap-2 ${
                        isBelowMin
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-[#111111] hover:bg-black text-white cursor-pointer'
                      }`}
                    >
                      <span>
                        {isSubmitting ? 'در حال اتصال به درگاه...' : 'تأیید و پرداخت نهایی ←'}
                      </span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2: RECEIVER INFO FORM & CHECKOUT */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && (
        <form onSubmit={handleSubmitOrder} className="space-y-4 animate-fade-in">
          
          {/* Back to Step 1 Button */}
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 bg-white hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت و اصلاح مشخصات سبد خرید</span>
          </button>

          {/* Card 1: Order Summary */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 text-center shadow-2xs space-y-1">
            <span className="text-xs text-slate-500 font-semibold block">مبلغ نهایی کل سفارش</span>
            <div className="text-2xl md:text-3xl font-black text-[#E11D48] my-1">
              {formatToman(cartTotalToman)}
            </div>
            <span className="text-xs text-slate-600 font-medium block dir-rtl leading-relaxed">
              {hasCart
                ? cartItems.map((i) => `${toPersianDigits(i.quantity)} × ${i.title}`).join(' | ')
                : `${toPersianDigits(qty)} × ${product.title}`}
            </span>
          </div>

          {/* Card 2: Recipient Details Form */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-2xs space-y-4">
            
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-right">
                نام و نام خانوادگی تحویل‌گیرنده <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: علیرضا حسینی"
                className="w-full p-3.5 border border-slate-300 focus:border-slate-900 rounded-[14px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-right">
                شماره تماس جهت هماهنگی پیک <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09121234567"
                className="w-full p-3.5 border border-slate-300 focus:border-slate-900 rounded-[14px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-left dir-ltr"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-right">
                آدرس دقیق تحویل در ایران <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
                placeholder="شهر، خیابان، کوچه، پلاک، واحد..."
                className="w-full p-3.5 border border-slate-300 focus:border-slate-900 rounded-[14px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition resize-none text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-right">
                توضیحات تکمیلی (اختیاری)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="طعم، زمان تحویل و غیره..."
                className="w-full p-3.5 border border-slate-300 focus:border-slate-900 rounded-[14px] text-xs font-medium text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-right"
              />
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#111111] hover:bg-black text-white font-black text-sm md:text-base py-4 rounded-[18px] transition shadow-md flex items-center justify-center gap-2 cursor-pointer border-none mt-3"
            >
              <span>
                {isSubmitting ? 'در حال ثبت سفارش...' : 'تأیید و پرداخت نهایی ←'}
              </span>
            </button>
          </div>

        </form>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* FULLSCREEN LIGHTBOX MODAL (TAP-TO-EXPAND & PINCH-TO-ZOOM) */}
      {/* ------------------------------------------------------------------ */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 select-none animate-fade-in"
        >
          {/* Top Bar Controls */}
          <div className="flex items-center justify-between z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="bg-white/15 text-white text-xs font-black px-3 py-1.5 rounded-full border border-white/20">
                {product.brand || product.storeName || 'فروشگاه دبی'}
              </span>
              {galleryList.length > 1 && (
                <span className="text-white/80 text-xs font-extrabold bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
                  تصویر {toPersianDigits(lightboxIndex + 1)} از {toPersianDigits(galleryList.length)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="text-white/90 hover:text-white bg-white/20 hover:bg-white/30 p-2.5 rounded-full transition cursor-pointer"
              title="بستن گالری"
              aria-label="بستن گالری"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Main Stage with Zoom Toggle */}
          <div
            className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden cursor-zoom-in"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxZoom(!lightboxZoom);
            }}
          >
            {galleryList[lightboxIndex] && (
              <img
                src={galleryList[lightboxIndex]}
                alt={product.title}
                referrerPolicy="no-referrer"
                className={`max-w-full max-h-[75vh] object-contain transition-transform duration-200 select-none ${
                  lightboxZoom ? 'scale-175 cursor-zoom-out' : 'scale-100'
                }`}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (String(target.src || '').includes('images.weserv.nl') === false && galleryList[lightboxIndex]) {
                    target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(String(galleryList[lightboxIndex]));
                  }
                }}
              />
            )}

            {/* Navigation Arrows for Multiple Images */}
            {galleryList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handleLightboxPrev}
                  className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition cursor-pointer"
                  title="تصویر قبلی"
                  aria-label="تصویر قبلی"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleLightboxNext}
                  className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition cursor-pointer"
                  title="تصویر بعدی"
                  aria-label="تصویر بعدی"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 dir-ltr" onClick={(e) => e.stopPropagation()}>
            {galleryList.length > 1 && galleryList.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxZoom(false);
                }}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                  lightboxIndex === idx ? 'border-white ring-2 ring-white/50 scale-110' : 'border-white/30 opacity-50 hover:opacity-100'
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`Thumb ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain bg-white/5 p-0.5"
                />
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
