import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Zap, Plus, Trash2, RefreshCw, Save, Layers,
  Check, Scale, Eye, EyeOff, ChevronDown, ChevronUp,
  Search, Globe, Percent
} from 'lucide-react';
import type { FeaturedDeal, ProductVariant, FinancialSettings } from '../../types';
import { formatToman, toPersianDigits, getEffectiveAedRate } from '../../utils/formatters';
import {
  PRESET_FLAVORS, PRESET_SIZES, STANDARD_SIZE_OPTIONS,
  convertLbsToKg
} from '../../utils/variantPresets';
import { FlavorAutocompleteInput } from '../../components/admin/FlavorAutocompleteInput';
import { VariantImagePopover } from '../../components/admin/VariantImagePopover';
import {
  TaxonomyCategory, DEFAULT_TAXONOMY, fetchTaxonomyFromFirestore
} from '../../utils/taxonomyHelper';
import { generatePersianTitle } from '../../utils/supplementLocalization';
import { deleteDoc, doc, setDoc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { parseWeightKg, calculateProductTomanPrice } from '../../utils/pricingCalculator';
import { saveSpecialDeals } from '../../services/adminService';

interface DealsAdminProps {
  deals: FeaturedDeal[];
  settings?: FinancialSettings;
  cms?: any;
  taxonomyList?: any[];
  onSaveDeals: (updatedDeals: FeaturedDeal[]) => Promise<void>;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const COLLECTION_NAME = 'special_deals';

export { parseWeightKg };
export const parseSizeWeightKg = parseWeightKg;

// Store Pricing Policy formula (Base AED cost + Fixed item shipping fee + Configurable Profit Margin %)
export function computeTomanSellingPrice(
  priceAed: number,
  _weightKg: number,
  aedRate: number,
  _cargoRatePerKg: number,
  profitMargin: number
): number {
  if (!priceAed || priceAed <= 0) return 0;
  return calculateProductTomanPrice({
    priceAed,
    profitMarginPercent: profitMargin,
    aedToTomanRate: aedRate,
    baseShippingAed: 20
  });
}

// Strict Data Sanitizer: forces valid fallbacks and purges any undefined values
export const sanitizeProductPayload = (prod: any, globalRate: number = 54500, defaultMargin: number = 20) => {
  const margin = Number(prod.profitMargin !== undefined && prod.profitMargin !== null && !isNaN(Number(prod.profitMargin)) ? prod.profitMargin : defaultMargin);
  const baseAed = Number(prod.basePriceAed || prod.priceAed || prod.price || 0);
  const baseWeight = Number(prod.weightKg || 0.8);

  const rawVariants = Array.isArray(prod.variants) ? prod.variants : [];
  const cleanVariants = rawVariants
    .filter((v: any) => v && ((v.size && String(v.size).trim()) || (v.flavor && String(v.flavor).trim())))
    .map((v: any) => {
      const vAed = Number(v.priceAed ?? v.price ?? v.priceAED ?? baseAed ?? 0);
      const vToman = Number(v.priceToman || calculateProductTomanPrice({
        priceAed: vAed,
        profitMarginPercent: margin,
        aedToTomanRate: globalRate,
        baseShippingAed: 20
      }));

      const cleanFlavor = (v.flavor && !String(v.flavor).includes('+ طعم سفارشی') && v.flavor !== '__custom__')
        ? String(v.flavor).trim()
        : 'پیش‌فرض';
      const cleanSize = (v.size && !String(v.size).includes('+ تایپ سایز') && v.size !== '__custom__')
        ? String(v.size).trim()
        : 'استاندارد';

      const cleanVar: Record<string, any> = {
        id: String(v.id || `var-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`),
        flavor: cleanFlavor,
        size: cleanSize,
        priceAed: vAed,
        price: vAed,
        priceAED: vAed,
        priceToman: vToman,
        weightKg: parseWeightKg(cleanSize, Number(v.weightKg) || baseWeight),
        image: (v.image && String(v.image).trim() !== '') ? String(v.image).trim() : ((v.imageUrl && String(v.imageUrl).trim() !== '') ? String(v.imageUrl).trim() : null),
        imageUrl: (v.image && String(v.image).trim() !== '') ? String(v.image).trim() : ((v.imageUrl && String(v.imageUrl).trim() !== '') ? String(v.imageUrl).trim() : null),
        inStock: v.inStock !== false
      };

      if (v.url) {
        cleanVar.url = String(v.url);
      }

      return cleanVar;
    });

  const cleanFlavors = Array.from(new Set(cleanVariants.map((v: any) => v.flavor)));
  const cleanSizes = Array.from(new Set(cleanVariants.map((v: any) => v.size)));

  const productPriceToman = Number(prod.priceToman) || calculateProductTomanPrice({
    priceAed: baseAed,
    profitMarginPercent: margin,
    aedToTomanRate: globalRate,
    baseShippingAed: 20
  });

  const titleFa = String(prod.titleFa || prod.title || prod.titleEn || 'بدون عنوان');
  const titleEn = String(prod.titleEn || prod.rawTitle || '');
  const mainImage = String(prod.imageUrl || prod.image || '');

  return {
    id: String(prod.id || `deal-${Date.now()}`),
    title: titleFa,
    titleFa,
    titleEn,
    brand: String(prod.brand || ''),
    category: String(prod.category || prod.mainCategory || 'مکمل‌های ورزشی'),
    mainCategory: String(prod.mainCategory || prod.category || 'مکمل‌های ورزشی'),
    subcategory: String(prod.subcategory || prod.subCategory || ''),
    subCategory: String(prod.subCategory || prod.subcategory || ''),
    caption: String(prod.caption || ''),
    description: String(prod.description || ''),
    imageUrl: mainImage,
    image: mainImage,
    images: Array.isArray(prod.images) && prod.images.length > 0 ? prod.images.filter(Boolean).map(String) : (mainImage ? [mainImage] : []),
    galleryImages: Array.isArray(prod.galleryImages) && prod.galleryImages.length > 0 ? prod.galleryImages.filter(Boolean).map(String) : (mainImage ? [mainImage] : []),
    basePriceAed: baseAed,
    priceAed: Number(prod.priceAed ?? baseAed),
    originalPriceAed: Number(prod.originalPriceAed || 0),
    profitMargin: margin,
    weightKg: baseWeight,
    priceToman: productPriceToman,
    originalPriceToman: Number(prod.originalPriceToman || 0),
    stockQuantity: Number(prod.stockQuantity !== undefined ? prod.stockQuantity : (prod.stockCount !== undefined ? prod.stockCount : 10)),
    stockCount: Number(prod.stockCount !== undefined ? prod.stockCount : (prod.stockQuantity !== undefined ? prod.stockQuantity : 10)),
    url: String(prod.url || ''),
    storeName: String(prod.storeName || 'فروشگاه دبی'),
    isActive: prod.isActive !== undefined ? Boolean(prod.isActive) : (prod.isPublished !== undefined ? Boolean(prod.isPublished) : true),
    isPublished: prod.isPublished !== undefined ? Boolean(prod.isPublished) : (prod.isActive !== undefined ? Boolean(prod.isActive) : true),
    isPopular: Boolean(prod.isPopular),
    isFeatured: Boolean(prod.isFeatured || prod.isPopular),
    inStock: prod.inStock !== false,
    allowedFlavors: cleanFlavors,
    flavors: cleanFlavors,
    allowedSizes: cleanSizes,
    sizes: cleanSizes,
    variants: cleanVariants,
    updatedAt: new Date().toISOString()
  };
};

export const sanitizeProductDoc = sanitizeProductPayload;

export const DealsAdmin: React.FC<DealsAdminProps> = ({
  deals: initialDeals = [],
  settings,
  cms,
  taxonomyList = [],
  onSaveDeals,
  showToast
}) => {
  const [deals, setDeals] = useState<FeaturedDeal[]>(initialDeals);
  const [categoriesTree, setCategoriesTree] = useState<TaxonomyCategory[]>(DEFAULT_TAXONOMY);
  const [newDealUrl, setNewDealUrl] = useState('');
  const [newDealCategory, setNewDealCategory] = useState('');
  const [newDealSubCategory, setNewDealSubCategory] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [auxLinks, setAuxLinks] = useState<Record<string, string>>({});
  const [auxLoading, setAuxLoading] = useState<Record<string, boolean>>({});
  const [customFlavors, setCustomFlavors] = useState<Record<string, string>>({});
  const [customSizes, setCustomSizes] = useState<Record<string, { val: string; unit: string }>>({});
  const [customRowMode, setCustomRowMode] = useState<Record<string, { customSize?: boolean; customFlavor?: boolean }>>({});
  const [editingVariantImage, setEditingVariantImage] = useState<{ itemId: string; variantId: string; variantTitle?: string; currentUrl?: string; mainImage?: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'popular' | 'draft'>('all');

  const aedRate = getEffectiveAedRate(settings, cms) || 54500;
  const defaultMargin = Number(settings?.profitMargin || 20);

  useEffect(() => {
    fetchTaxonomyFromFirestore().then(loaded => {
      if (Array.isArray(loaded) && loaded.length > 0) {
        setCategoriesTree(loaded);
        if (!newDealCategory) {
          setNewDealCategory(loaded[0].name);
          setNewDealSubCategory(loaded[0].subCategories?.[0]?.name || '');
        }
      } else if (taxonomyList.length > 0) {
        setCategoriesTree(taxonomyList);
        if (!newDealCategory) setNewDealCategory(taxonomyList[0]?.name || '');
      }
    }).catch(() => {});
  }, []);

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        deal.title?.toLowerCase().includes(q) ||
        (deal as any).titleFa?.toLowerCase().includes(q) ||
        (deal as any).titleEn?.toLowerCase().includes(q) ||
        deal.brand?.toLowerCase().includes(q) ||
        deal.id?.toLowerCase().includes(q);
      const matchCat = filterCategory === 'all' || deal.mainCategory === filterCategory || deal.category === filterCategory;
      const matchStatus =
        filterStatus === 'all' ? true :
        filterStatus === 'active' ? deal.isActive === true :
        filterStatus === 'popular' ? (deal as any).isPopular === true :
        filterStatus === 'draft' ? deal.isActive !== true : true;
      return matchSearch && matchCat && matchStatus;
    });
  }, [deals, searchTerm, filterCategory, filterStatus]);

  const calcToman = (priceAed: number, marginVal?: number) =>
    calculateProductTomanPrice({
      priceAed,
      profitMarginPercent: marginVal !== undefined ? marginVal : defaultMargin,
      aedToTomanRate: aedRate,
      baseShippingAed: 20
    });

  useEffect(() => {
    if (initialDeals && initialDeals.length > 0) {
      setDeals(initialDeals);
    }
  }, [initialDeals]);

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleTogglePopular = (productId: string) => {
    const target = deals.find(d => d.id === productId);
    const nextPop = !Boolean((target as any)?.isPopular);
    setDeals((prev) =>
      prev.map((d) => (d.id === productId ? { ...d, isPopular: nextPop, isFeatured: nextPop } : d))
    );
    try {
      updateDoc(doc(db, COLLECTION_NAME, productId), {
        isPopular: nextPop,
        isFeatured: nextPop,
        updatedAt: new Date().toISOString()
      }).catch((e) => console.warn('Instant popular toggle notice:', e));
    } catch (_e) {}
  };

  const handleTogglePublished = (productId: string) => {
    const target = deals.find(d => d.id === productId);
    const currentPub = target?.isPublished !== undefined ? target.isPublished : target?.isActive;
    const nextPub = !currentPub;
    setDeals((prev) =>
      prev.map((d) => (d.id === productId ? { ...d, isPublished: nextPub, isActive: nextPub } : d))
    );
    try {
      updateDoc(doc(db, COLLECTION_NAME, productId), {
        isPublished: nextPub,
        isActive: nextPub,
        updatedAt: new Date().toISOString()
      }).catch((e) => console.warn('Instant publish toggle notice:', e));
    } catch (_e) {}
  };

  const updateDeal = (id: string, patch: Partial<FeaturedDeal>) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== id) return d;
      const up = { ...d, ...patch };

      if ('profitMargin' in patch) {
        const newMargin = Number(patch.profitMargin !== undefined ? patch.profitMargin : defaultMargin);
        up.profitMargin = newMargin;
        const baseAed = Number(up.basePriceAed || up.priceAed || 0);
        up.priceToman = calcToman(baseAed, newMargin);
        up.variants = (up.variants || []).map(v => ({
          ...v,
          priceToman: calcToman(Number(v.priceAed || v.price || 0), newMargin)
        }));
      }

      if ('priceAed' in patch || 'basePriceAed' in patch) {
        const pAed = Number(patch.priceAed ?? patch.basePriceAed ?? up.priceAed);
        up.priceAed = pAed;
        up.basePriceAed = pAed;
        const curMargin = up.profitMargin !== undefined ? up.profitMargin : defaultMargin;
        up.priceToman = calcToman(pAed, curMargin);
      }

      if ('mainCategory' in patch) {
        const cat = categoriesTree.find(c => c.name === patch.mainCategory);
        up.category = patch.mainCategory as string;
        up.subcategory = cat?.subCategories?.[0]?.name || '';
        up.subCategory = cat?.subCategories?.[0]?.name || '';
      }
      if ('subcategory' in patch) up.subCategory = patch.subcategory as string;
      return up;
    }));
  };

  const updateVariant = (dealId: string, varId: string, field: string, value: any) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const dealMargin = d.profitMargin !== undefined ? d.profitMargin : defaultMargin;

      const variants = (d.variants || []).map(v => {
        if (v.id !== varId) return v;
        const up: any = { ...v, [field]: value };
        if (field === 'price' || field === 'priceAed') {
          const p = value === '' ? 0 : parseFloat(value) || 0;
          up.price = p;
          up.priceAed = p;
          up.priceAED = p;
          up.priceToman = calcToman(p, dealMargin);
        } else if (field === 'size') {
          const wt = parseSizeWeightKg(value, d.weightKg || 0.8);
          up.weightKg = wt;
          const p = Number(v.priceAed || v.price || d.priceAed || 0);
          up.priceToman = calcToman(p, dealMargin);
        } else if (field === 'priceToman') {
          up.priceToman = value === '' ? 0 : parseInt(value) || 0;
        }
        return up;
      });
      return { ...d, variants };
    }));
  };

  const addVariantRow = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    const pAed = Number(deal?.priceAed || deal?.basePriceAed) || 100;
    const defFlavor = (deal?.flavors as any)?.[0] || 'بدون طعم (Unflavored)';
    const defSize = (deal?.sizes as any)?.[0] || '2.45 kg';
    const wt = parseSizeWeightKg(defSize, deal?.weightKg || 0.8);
    const dealMargin = deal?.profitMargin !== undefined ? deal.profitMargin : defaultMargin;
    const newV: ProductVariant = {
      id: `var-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      size: defSize,
      flavor: defFlavor,
      price: pAed,
      priceAed: pAed,
      priceAED: pAed,
      weightKg: wt,
      priceToman: calcToman(pAed, dealMargin),
      inStock: true,
      image: deal?.image || deal?.imageUrl || ''
    };
    setDeals(prev => prev.map(d => d.id !== dealId ? d : { ...d, variants: [...(d.variants || []), newV] }));
  };

  const deleteVariant = (dealId: string, varId: string) =>
    setDeals(prev => prev.map(d => d.id !== dealId ? d : { ...d, variants: (d.variants || []).filter(v => v.id !== varId) }));

  const toggleFlavor = (dealId: string, flavor: string) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const cur = (d.flavors as any as string[]) || [];
      const upd = cur.includes(flavor) ? cur.filter(f => f !== flavor) : [...cur, flavor];
      return { ...d, flavors: upd as any, allowedFlavors: upd as any };
    }));
  };

  const addCustomFlavor = (dealId: string) => {
    const f = (customFlavors[dealId] || '').trim();
    if (!f) return;
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const cur = (d.flavors as any as string[]) || [];
      if (cur.includes(f)) return d;
      const upd = [...cur, f];
      return { ...d, flavors: upd as any, allowedFlavors: upd as any };
    }));
    setCustomFlavors(p => ({ ...p, [dealId]: '' }));
    if (showToast) showToast(`طعم "${f}" اضافه شد`, 'success');
  };

  const toggleSize = (dealId: string, size: string) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const cur = (d.sizes as any as string[]) || [];
      const upd = cur.includes(size) ? cur.filter(s => s !== size) : [...cur, size];
      return { ...d, sizes: upd as any, allowedSizes: upd as any };
    }));
  };

  const addCustomSize = (dealId: string) => {
    const inp = customSizes[dealId] || { val: '', unit: 'kg' };
    const num = parseFloat(inp.val);
    if (!num || isNaN(num)) { if (showToast) showToast('مقدار عددی معتبر وارد کنید', 'error'); return; }
    let label = '';
    if (inp.unit === 'lbs') label = `${num} lbs (${convertLbsToKg(num)} kg)`;
    else if (inp.unit === 'sachets') label = `${num} ساشه`;
    else if (inp.unit === 'caps') label = `${num} کپسول / قرص`;
    else label = `${num} kg`;
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const cur = (d.sizes as any as string[]) || [];
      if (cur.includes(label)) return d;
      const upd = [...cur, label];
      return { ...d, sizes: upd as any, allowedSizes: upd as any };
    }));
    setCustomSizes(p => ({ ...p, [dealId]: { val: '', unit: 'kg' } }));
    if (showToast) showToast(`سایز "${label}" اضافه شد`, 'success');
  };

  // ── Primary Scraper (Extracts Dual English + Persian Titles) ───────────
  const handleExtract = async () => {
    if (!newDealUrl.trim()) { if (showToast) showToast('لینک وارد کنید', 'error'); return; }
    setIsExtracting(true);
    try {
      const res = await fetch('/api/scrape-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newDealUrl.trim() })
      });
      const data = await res.json();
      if (!data?.title && !data?.priceAED && !data?.price) throw new Error('استخراج ناموفق');

      const pAed = parseFloat(data.priceAed || data.priceAED || data.price) || 0;
      const img = data.mainImage || data.image || data.imageUrl || '';
      const gallery = Array.isArray(data.galleryImages) && data.galleryImages.length > 0
        ? data.galleryImages
        : (img ? [img] : []);

      const mainCat = newDealCategory || categoriesTree[0]?.name || 'مکمل‌های ورزشی';
      const subCat = newDealSubCategory || categoriesTree[0]?.subCategories?.[0]?.name || '';

      const rawTitleEn = data.titleEn || data.title || '';
      const brand = data.brand || 'دبی';
      const localizedFa = data.titleFa || generatePersianTitle(rawTitleEn, brand);

      const extractedFlavors: string[] = Array.isArray(data.flavors) && data.flavors.length > 0
        ? data.flavors
        : ['شکلات (Chocolate)'];
      const extractedSizes: string[] = Array.isArray(data.sizes) && data.sizes.length > 0
        ? data.sizes
        : ['2.45 kg'];

      const defSize = extractedSizes[0] || '2.45 kg';
      const wt = parseWeightKg(defSize, parseFloat(data.weightKg) || 0.8);

      const dynamicVariants: ProductVariant[] = [];
      if (Array.isArray(data.variants) && data.variants.length > 0) {
        data.variants.forEach((v: any, idx: number) => {
          const vPrice = parseFloat(v.priceAED || v.priceAed || v.price || pAed) || pAed;
          const vSize = v.size || defSize;
          const vFlavor = v.flavor || extractedFlavors[0] || 'شکلات (Chocolate)';
          const vWeight = parseWeightKg(vSize, parseFloat(v.weightKg || data.weightKg) || 0.8);
          dynamicVariants.push({
            id: `var-${idx}-${Date.now()}`,
            size: vSize,
            flavor: vFlavor,
            price: vPrice,
            priceAed: vPrice,
            priceAED: vPrice,
            weightKg: vWeight,
            priceToman: vPrice > 0 ? calcToman(vPrice, defaultMargin) : 0,
            inStock: v.inStock !== false,
            image: v.image || img
          });
        });
      } else {
        dynamicVariants.push({
          id: `var-init-${Date.now()}`,
          size: defSize,
          flavor: extractedFlavors[0] || 'شکلات (Chocolate)',
          price: pAed,
          priceAed: pAed,
          priceAED: pAed,
          weightKg: wt,
          priceToman: pAed > 0 ? calcToman(pAed, defaultMargin) : 0,
          inStock: true,
          image: img
        });
      }

      const newDeal: FeaturedDeal = {
        id: `deal-${Date.now()}`,
        title: localizedFa || rawTitleEn,
        titleFa: localizedFa,
        titleEn: rawTitleEn,
        brand,
        category: mainCat,
        mainCategory: mainCat,
        subcategory: subCat,
        subCategory: subCat,
        priceAed: pAed,
        basePriceAed: pAed,
        profitMargin: defaultMargin,
        originalPriceAed: parseFloat(data.originalPriceAed || data.originalPriceAED || 0) || 0,
        weightKg: wt,
        priceToman: pAed > 0 ? calcToman(pAed, defaultMargin) : 0,
        originalPriceToman: 0,
        stockQuantity: 10,
        stockCount: 10,
        image: img,
        imageUrl: img,
        images: gallery,
        galleryImages: gallery,
        url: newDealUrl.trim(),
        storeName: data.storeName || '',
        inStock: true,
        isActive: false, // DRAFT
        isPopular: false,
        isFeatured: false,
        flavors: extractedFlavors as any,
        allowedFlavors: extractedFlavors as any,
        sizes: extractedSizes as any,
        allowedSizes: extractedSizes as any,
        variants: dynamicVariants
      };

      setDeals(prev => [newDeal, ...prev]);
      setExpandedIds(prev => new Set([newDeal.id, ...prev]));
      setNewDealUrl('');
      if (showToast) showToast('محصول و ماتریس متغیرها با موفقیت استخراج و به عنوان پیش‌نویس ذخیره شد.', 'success');

    } catch (err: any) {
      if (showToast) showToast('خطا در استخراج: ' + err.message, 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractAux = async (dealId: string) => {
    const url = (auxLinks[dealId] || '').trim();
    if (!url) { if (showToast) showToast('لینک کمکی وارد کنید', 'error'); return; }
    setAuxLoading(p => ({ ...p, [dealId]: true }));
    try {
      const res = await fetch('/api/scrape-variant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!data?.priceAED && !data?.price) throw new Error('استخراج واریانت ناموفق');

      const pAed = parseFloat(data.priceAED || data.priceAed || data.price || 0);
      const deal = deals.find(d => d.id === dealId);
      const sz = data.size || '2.45 kg';
      const flv = data.flavor || 'اصلی';
      const wt = parseSizeWeightKg(sz, deal?.weightKg || 0.8);
      const img = data.image || data.imageUrl || '';
      const dealMargin = deal?.profitMargin !== undefined ? deal.profitMargin : defaultMargin;

      const newV: ProductVariant = {
        id: `var-aux-${Date.now()}`,
        size: sz,
        flavor: flv,
        price: pAed,
        priceAed: pAed,
        priceAED: pAed,
        weightKg: wt,
        priceToman: calcToman(pAed, dealMargin),
        inStock: true,
        image: img,
        url
      };

      setDeals(prev => prev.map(d => {
        if (d.id !== dealId) return d;
        const flavors = Array.from(new Set([...(d.flavors as any as string[] || []), flv]));
        const sizes = Array.from(new Set([...(d.sizes as any as string[] || []), sz]));
        return { ...d, variants: [...(d.variants || []), newV], flavors: flavors as any, sizes: sizes as any };
      }));
      setAuxLinks(p => ({ ...p, [dealId]: '' }));
      if (showToast) showToast(`واریانت "${flv} - ${sz}" اضافه شد`, 'success');
    } catch (err: any) {
      if (showToast) showToast('خطا در استخراج کمکی: ' + err.message, 'error');
    } finally {
      setAuxLoading(p => ({ ...p, [dealId]: false }));
    }
  };

  const handleDelete = async (dealId: string) => {
    if (!confirm('آیا از حذف این محصول مطمئن هستید؟')) return;
    const updated = deals.filter(d => d.id !== dealId);
    setDeals(updated);
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, dealId));
      await onSaveDeals(updated);
      if (showToast) showToast('محصول با موفقیت حذف شد', 'success');
    } catch (err: any) {
      console.error('Error deleting deal:', err);
      if (showToast) showToast('خطا در حذف: ' + (err.message || 'نامشخص'), 'error');
    }
  };

  // ── Direct Native Firestore Save Handler (Bypasses legacy service) ──
  const handleSaveAll = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const cleanList: FeaturedDeal[] = [];

      for (const deal of deals) {
        if (!deal.id) continue;
        const cleanDoc = sanitizeProductPayload(deal, aedRate, defaultMargin);
        cleanList.push(cleanDoc as any);
      }

      // Execute bulk save across Firestore, LocalStorage, and Server REST API
      const result = await saveSpecialDeals(cleanList, aedRate, defaultMargin);

      // Immediately refetch from Firestore to ensure state reflects Firestore
      try {
        const snap = await getDocs(collection(db, COLLECTION_NAME));
        const freshList: FeaturedDeal[] = [];
        snap.forEach((d) => freshList.push({ id: d.id, ...d.data() } as FeaturedDeal));
        if (freshList.length > 0) {
          setDeals(freshList);
          await onSaveDeals(freshList);
        } else {
          await onSaveDeals(cleanList);
        }
      } catch (_refetchErr) {
        await onSaveDeals(cleanList);
      }

      if (showToast) showToast(result.message || 'تمامی آفرها، ماتریس واریانت‌ها و تنظیمات با موفقیت ذخیره شدند', 'success');
    } catch (err: any) {
      console.error('Error saving Deals:', err);
      if (showToast) showToast('خطا در ذخیره‌سازی: ' + (err.message || 'نامشخص'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 font-['Vazirmatn',sans-serif] text-right pb-36" dir="rtl">
      {/* ── Header (Clean UI with single consolidated save pipeline) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
        <div>
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>مدیریت پیشنهادهای ویژه ({toPersianDigits(deals.length)} محصول)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">فرمول قیمت‌گذاری فروشگاهی (هزینه ثابت حمل ۲۰ درهم + درصد سود اختصاصی) و ذخیره مستقیم در دیتابیس</p>
        </div>
      </div>

      {/* ── URL Extractor Bar ── */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-5 space-y-3">
        <p className="text-xs font-black text-amber-900 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>استخراج محصول جدید به عنوان پیش‌نویس (تولید خودکار عنوان فارسی و انگلیسی):</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="relative flex items-center sm:col-span-5 w-full">
            <input
              type="text"
              value={newDealUrl}
              onChange={e => setNewDealUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleExtract()}
              placeholder="https://www.drnutrition.com/..."
              className="w-full bg-white border border-amber-300 text-slate-900 text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-600 dir-ltr font-mono"
            />
            {newDealUrl && (
              <button
                type="button"
                onClick={() => setNewDealUrl('')}
                className="absolute left-2.5 p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="پاک کردن لینک"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={newDealCategory}
            onChange={e => {
              setNewDealCategory(e.target.value);
              const cat = categoriesTree.find(c => c.name === e.target.value);
              setNewDealSubCategory(cat?.subCategories?.[0]?.name || '');
            }}
            className="sm:col-span-3 bg-white border border-amber-300 text-slate-800 text-xs px-3 py-2.5 rounded-xl font-bold"
          >
            {categoriesTree.map((c, cIdx) => <option key={c.id || c.slug || c.name || `cat-opt-${cIdx}`} value={c.name}>{c.name}</option>)}
          </select>
          <select
            value={newDealSubCategory}
            onChange={e => setNewDealSubCategory(e.target.value)}
            className="sm:col-span-2 bg-white border border-amber-300 text-slate-800 text-xs px-3 py-2.5 rounded-xl font-bold"
          >
            {(categoriesTree.find(c => c.name === newDealCategory)?.subCategories || []).map((s, sIdx) =>
              <option key={s.id || s.slug || s.name || `sub-opt-${sIdx}`} value={s.name}>{s.name}</option>
            )}
          </select>
          <button
            type="button" onClick={handleExtract}
            disabled={isExtracting || !newDealUrl.trim()}
            className="sm:col-span-2 bg-slate-900 hover:bg-black text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isExtracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isExtracting ? 'استخراج...' : 'استخراج پیش‌نویس'}</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="جستجو در عنوان فارسی، انگلیسی، برند..."
            className="flex-1 text-xs bg-transparent outline-none text-slate-900 placeholder-slate-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs px-3 py-1.5 rounded-xl font-bold text-slate-700 focus:outline-none"
        >
          <option value="all">همه دسته‌ها</option>
          {categoriesTree.map((c, cIdx) => <option key={c.id || c.slug || c.name || `filter-cat-${cIdx}`} value={c.name}>{c.name}</option>)}
        </select>
        <div className="flex gap-1">
          {(['all', 'active', 'popular', 'draft'] as const).map(s => (
            <button key={s} type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${filterStatus === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s === 'all' ? 'همه' : s === 'active' ? 'فعالها' : s === 'popular' ? '★ پرطرفدار' : 'پیشنویس'}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-400 font-bold">{toPersianDigits(filteredDeals.length)} مورد</span>
      </div>

      {/* ── Deal Accordion List ── */}
      <div className="space-y-2">
        {filteredDeals.map((deal, idx) => {
          const dealKey = deal.id ? `deal-${deal.id}` : `deal-idx-${idx}`;
          const isOpen = expandedIds.has(deal.id);
          const flavorsPool = (deal.flavors as any as string[]) || [];
          const sizesPool = (deal.sizes as any as string[]) || [];
          const subCats = categoriesTree.find(c => c.name === (deal.mainCategory || deal.category))?.subCategories || [];
          const currentMargin = deal.profitMargin !== undefined ? deal.profitMargin : defaultMargin;

          return (
            <div key={dealKey}
              className={`rounded-2xl border transition-all ${deal.isActive ? 'border-slate-200 bg-white' : 'border-dashed border-amber-300 bg-amber-50/30'}`}
            >
              {/* ── Compact Header Row ── */}
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                  {toPersianDigits(idx + 1)}
                </span>

                {(deal.image || deal.imageUrl) && (
                  <img
                    src={deal.image || deal.imageUrl}
                    alt={deal.title}
                    className="w-10 h-10 object-contain rounded-xl border border-slate-200 bg-white p-0.5 shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{deal.title}</p>
                  {(deal as any).titleEn && (
                    <p className="text-[10px] text-slate-400 font-mono truncate dir-ltr text-right">
                      {(deal as any).titleEn}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {deal.brand && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">{deal.brand}</span>
                    )}
                    <span className="text-[10px] text-slate-500 font-medium">واریانت: {toPersianDigits(deal.variants?.length || 0)}</span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">{deal.priceAed} AED</span>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md">
                      سود: {toPersianDigits(currentMargin)}٪
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(deal.id);
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-100 hover:text-rose-700 active:scale-95 rounded-lg transition cursor-pointer"
                    title="حذف / لغو پیش‌نویس"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button type="button"
                    onClick={() => toggleExpand(deal.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-[11px] font-bold cursor-pointer"
                  >
                    {isOpen ? <><ChevronUp className="w-3.5 h-3.5" /><span>بستن</span></> : <><ChevronDown className="w-3.5 h-3.5" /><span>ویرایش</span></>}
                  </button>
                </div>
              </div>

              {/* ── Expandable Body ── */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                  {/* Dual Title Editors: Persian & English */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        عنوان فارسی محصول (Title FA):
                      </label>
                      <input
                        type="text"
                        value={(deal as any).titleFa || deal.title || ''}
                        onChange={e => updateDeal(deal.id, { titleFa: e.target.value, title: e.target.value } as any)}
                        placeholder="نام و عنوان محصول به فارسی..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>عنوان انگلیسی محصول (Title EN):</span>
                      </label>
                      <input
                        type="text"
                        value={(deal as any).titleEn || ''}
                        onChange={e => updateDeal(deal.id, { titleEn: e.target.value } as any)}
                        placeholder="Original English Product Name..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-600 dir-ltr"
                      />
                    </div>
                  </div>

                  {/* Base Pricing & Dedicated Profit Margin Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        قیمت پایه امارات (AED):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={deal.basePriceAed || deal.priceAed || ''}
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          updateDeal(deal.id, { basePriceAed: val, priceAed: val });
                        }}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 dir-ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-amber-600" />
                        <span>درصد سود (پیش‌فرض: ۲۰٪):</span>
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={deal.profitMargin !== undefined ? deal.profitMargin : 20}
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          updateDeal(deal.id, { profitMargin: val });
                        }}
                        placeholder="20"
                        className="w-full bg-white border border-amber-400 rounded-xl px-3 py-2 text-xs font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dir-ltr text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        قیمت محاسبه‌شده تومان:
                      </label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-emerald-700 flex items-center justify-between">
                        <span>{formatToman(deal.priceToman || 0)}</span>
                        <span className="text-[10px] text-slate-500 font-bold">تومان</span>
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">دسته‌بندی اصلی:</label>
                      <select
                        value={deal.mainCategory || deal.category || ''}
                        onChange={e => updateDeal(deal.id, { mainCategory: e.target.value } as any)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      >
                        {categoriesTree.map((c, cIdx) => <option key={c.id || c.slug || c.name || `cat-tree-${cIdx}`} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">زیردسته:</label>
                      <select
                        value={deal.subcategory || deal.subCategory || ''}
                        onChange={e => updateDeal(deal.id, { subcategory: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      >
                        {subCats.map((s, sIdx) => <option key={s.id || s.slug || s.name || `subcat-opt-${sIdx}`} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>


                  {/* Allowed Flavors Pool */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-black text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2 list-none select-none hover:bg-amber-100 transition">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>انتخاب طعم‌های مجاز ({toPersianDigits(flavorsPool.length)} طعم)</span>
                      <ChevronDown className="w-3.5 h-3.5 mr-auto text-amber-600 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-2 p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_FLAVORS.map((f, fIdx) => {
                          const checked = flavorsPool.includes(f.name) || flavorsPool.includes(f.nameEn);
                          return (
                            <button key={f.id || `preset-flavor-${f.name}-${fIdx}`} type="button"
                              onClick={() => toggleFlavor(deal.id, f.name)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition ${checked ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'}`}
                            >
                              {checked && <Check className="w-3 h-3" />}{f.name}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <FlavorAutocompleteInput
                          value={customFlavors[deal.id] || ''}
                          onChange={val => setCustomFlavors(p => ({ ...p, [deal.id]: val }))}
                          onSelect={selectedName => {
                            setCustomFlavors(p => ({ ...p, [deal.id]: selectedName }));
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              addCustomFlavor(deal.id);
                            }
                          }}
                          placeholder="طعم سفارشی (فارسی / انگلیسی)..."
                          inputClassName="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500 font-bold"
                        />
                        <button type="button" onClick={() => addCustomFlavor(deal.id)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0">+ افزودن</button>
                      </div>
                    </div>
                  </details>

                  {/* Allowed Sizes Pool */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-black text-blue-900 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center gap-2 list-none select-none hover:bg-blue-100 transition">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      <span>انتخاب سایزها ({toPersianDigits(sizesPool.length)} سایز)</span>
                      <ChevronDown className="w-3.5 h-3.5 mr-auto text-blue-600 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-2 p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_SIZES.map((sz, szIdx) => {
                          const checked = sizesPool.includes(sz.label);
                          return (
                            <button key={sz.id || `preset-size-${sz.label}-${szIdx}`} type="button"
                              onClick={() => toggleSize(deal.id, sz.label)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition ${checked ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'}`}
                            >
                              {checked && <Check className="w-3 h-3" />}{sz.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <input type="number" step="0.1"
                          value={customSizes[deal.id]?.val || ''}
                          onChange={e => setCustomSizes(p => ({ ...p, [deal.id]: { val: e.target.value, unit: p[deal.id]?.unit || 'kg' } }))}
                          placeholder="مقدار..."
                          className="w-28 bg-white border border-blue-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                        />
                        <select value={customSizes[deal.id]?.unit || 'kg'}
                          onChange={e => setCustomSizes(p => ({ ...p, [deal.id]: { val: p[deal.id]?.val || '', unit: e.target.value } }))}
                          className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none">
                          <option value="kg">kg</option>
                          <option value="lbs">lbs</option>
                          <option value="sachets">ساشه</option>
                          <option value="caps">کپسول</option>
                        </select>
                        <button type="button" onClick={() => addCustomSize(deal.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0">+ افزودن</button>
                      </div>
                    </div>
                  </details>

                  {/* Single Unified Status Control Toolbar */}
                  <div className="flex items-center gap-2 py-2 w-full">
                    {/* 1. Publication State Toggle (isPublished) */}
                    <button
                      type="button"
                      onClick={() => handleTogglePublished(deal.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        (deal.isPublished !== false && deal.isActive !== false)
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      <span>{(deal.isPublished !== false && deal.isActive !== false) ? '✓ منتشر شده در سایت (عمومی)' : '⊘ پیشنویس (مخفی از سایت)'}</span>
                    </button>

                    {/* 2. Homepage Featured Toggle (isPopular) */}
                    <button
                      type="button"
                      onClick={() => handleTogglePopular(deal.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        Boolean((deal as any).isPopular)
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      <span>{Boolean((deal as any).isPopular) ? '★ پرطرفدار (نمایش در خانه)' : '☆ پرطرفدار (غیرفعال)'}</span>
                    </button>
                  </div>

                  {/* Variant Matrix */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-600" />
                        <span>ماتریس واریانت‌ها ({toPersianDigits(deal.variants?.length || 0)} ردیف):</span>
                      </span>
                      <button type="button" onClick={() => addVariantRow(deal.id)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs">
                        <Plus className="w-3.5 h-3.5" /><span>+ افزودن سطر</span>
                      </button>
                    </div>
                      {/* Aux scraper */}
                    <div className="flex gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                      <input type="url"
                        value={auxLinks[deal.id] || ''}
                        onChange={e => setAuxLinks(p => ({ ...p, [deal.id]: e.target.value }))}
                        placeholder="لینک کمکی طعم یا سایز دیگر..."
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 dir-ltr"
                      />
                      <button type="button"
                        onClick={() => handleExtractAux(deal.id)}
                        disabled={auxLoading[deal.id] || !(auxLinks[deal.id] || '').trim()}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0">
                        {auxLoading[deal.id] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        <span>استخراج</span>
                      </button>
                    </div>

                    {(!deal.variants || deal.variants.length === 0) && (
                      <p className="text-[11px] text-slate-400 py-2">واریانتی ثبت نشده — «افزودن سطر» را بزنید.</p>
                    )}

                    {(deal.variants || []).map((v, vIdx) => {
                      const variantKey = v.id || `var-${deal.id || idx}-${v.flavor || 'flavor'}-${v.size || 'size'}-${vIdx}`;
                      const modeKey = `${deal.id}_${v.id || vIdx}`;
                      const isCustFlavor = Boolean(customRowMode[modeKey]?.customFlavor);
                      const availableRowSizes = Array.from(new Set([
                        ...STANDARD_SIZE_OPTIONS,
                        ...sizesPool.filter(Boolean),
                        ...(v.size ? [v.size] : [])
                      ]));
                      const isCustSize = Boolean(customRowMode[modeKey]?.customSize);

                      return (
                        <div key={variantKey}
                          className="grid grid-cols-12 gap-1.5 items-center bg-white border border-slate-200 p-2 rounded-xl text-xs">
                          {/* Thumb & Optional Variant Image */}
                          <div className="col-span-3 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingVariantImage({
                                itemId: deal.id,
                                variantId: v.id || `var-${vIdx}`,
                                variantTitle: `${deal.title || ''} - ${v.flavor || ''} ${v.size || ''}`.trim(),
                                currentUrl: v.image,
                                mainImage: deal.image
                              })}
                              className="cursor-pointer hover:ring-2 hover:ring-amber-500 rounded-lg transition-all shrink-0 select-none group/thumb relative focus:outline-none"
                              title="ویرایش عکس اختصاصی واریانت"
                            >
                              {v.image || deal.image ? (
                                <img
                                  src={v.image || deal.image}
                                  alt=""
                                  className="w-9 h-9 object-contain rounded-lg border border-slate-200 p-0.5 shrink-0 bg-white shadow-2xs group-hover/thumb:brightness-95"
                                  onError={(e) => {
                                    if (deal.image && (e.target as HTMLImageElement).src !== deal.image) {
                                      (e.target as HTMLImageElement).src = deal.image;
                                    } else {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-9 h-9 bg-slate-100 rounded-lg text-[9px] text-slate-400 flex items-center justify-center shrink-0 group-hover/thumb:bg-slate-200 transition">تصویر</div>
                              )}
                            </button>
                            <input
                              type="text"
                              value={v.image || ''}
                              onChange={e => {
                                const val = e.target.value.trim() || undefined;
                                updateVariant(deal.id, v.id, 'image', val);
                                updateVariant(deal.id, v.id, 'imageUrl', val);
                              }}
                              placeholder="لینک عکس اختصاصی..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono focus:bg-white focus:outline-none dir-ltr"
                              dir="ltr"
                              title="لینک تصویر اختصاصی واریانت (اختیاری)"
                            />
                          </div>

                          {/* Flavor */}
                          <div className="col-span-2">
                            {isCustFlavor
                              ? <div className="flex items-center gap-1">
                                  <FlavorAutocompleteInput
                                    value={v.flavor || ''}
                                    onChange={val => updateVariant(deal.id, v.id, 'flavor', val)}
                                    placeholder="طعم سفارشی..."
                                    inputClassName="w-full bg-slate-50 border border-amber-300 rounded-lg px-2 py-1 font-bold focus:bg-white focus:outline-none text-xs"
                                  />
                                  <button type="button" onClick={() => setCustomRowMode(p => ({ ...p, [modeKey]: { ...p[modeKey], customFlavor: false } }))} className="text-[10px] text-amber-600 font-bold shrink-0">لیست</button>
                                </div>
                              : <select value={v.flavor || (flavorsPool[0] || '')}
                                  onChange={e => {
                                    if (e.target.value === '__custom__') setCustomRowMode(p => ({ ...p, [modeKey]: { ...p[modeKey], customFlavor: true } }));
                                    else updateVariant(deal.id, v.id, 'flavor', e.target.value);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold focus:bg-white focus:outline-none">
                                  {flavorsPool.map((f, fIdx) => <option key={`flavor-opt-${f}-${fIdx}`} value={f}>{f}</option>)}
                                  <option value="__custom__">+ طعم سفارشی...</option>
                                </select>}
                          </div>

                          {/* Size Dropdown */}
                          <div className="col-span-2">
                            {isCustSize
                              ? <div className="flex items-center gap-1">
                                  <input type="text" value={v.size || ''}
                                    onChange={e => updateVariant(deal.id, v.id, 'size', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold focus:bg-white focus:outline-none" />
                                  <button type="button" onClick={() => setCustomRowMode(p => ({ ...p, [modeKey]: { ...p[modeKey], customSize: false } }))} className="text-[10px] text-amber-600 font-bold">لیست</button>
                                </div>
                              : <select
                                  value={v.size || (availableRowSizes[0] || '')}
                                  onChange={e => {
                                    if (e.target.value === '__custom__') setCustomRowMode(p => ({ ...p, [modeKey]: { ...p[modeKey], customSize: true } }));
                                    else updateVariant(deal.id, v.id, 'size', e.target.value);
                                  }}
                                  className="w-full bg-slate-50 hover:bg-white border border-slate-200 focus:border-amber-500 rounded-lg px-2 py-1.5 font-bold focus:outline-none cursor-pointer text-xs"
                                  dir="ltr"
                                >
                                  {sizesPool.length > 0 && (
                                    <optgroup label="✨ سایزهای فعال">
                                      {sizesPool.map((opt, optIdx) => <option key={`pool-${opt}-${optIdx}`} value={opt}>{opt}</option>)}
                                    </optgroup>
                                  )}
                                  <optgroup label="📋 تمامی سایزهای استاندارد">
                                    {STANDARD_SIZE_OPTIONS.filter(opt => !sizesPool.includes(opt)).map((opt, optIdx) => <option key={`std-${opt}-${optIdx}`} value={opt}>{opt}</option>)}
                                  </optgroup>
                                  {v.size && !STANDARD_SIZE_OPTIONS.includes(v.size) && !sizesPool.includes(v.size) && (
                                    <option key={`custom-opt-size-${v.size}`} value={v.size}>{v.size}</option>
                                  )}
                                  <option value="__custom__">+ سایر (تایپ دستی)...</option>
                                </select>}
                          </div>
                          {/* Price AED */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.01"
                              value={v.priceAed === 0 || v.priceAed === undefined || v.priceAed === '' ? '' : v.priceAed}
                              placeholder="0"
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                const numVal = rawVal === '' ? 0 : parseFloat(rawVal);
                                updateVariant(deal.id, v.id, 'priceAed', numVal);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 dir-ltr text-center"
                            />
                          </div>

                          {/* Price Toman */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              value={v.priceToman === 0 || v.priceToman === undefined || v.priceToman === '' ? '' : v.priceToman}
                              placeholder="0"
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                const numVal = rawVal === '' ? 0 : parseInt(rawVal);
                                updateVariant(deal.id, v.id, 'priceToman', numVal);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 dir-ltr text-center"
                            />
                          </div>

                          <div className="col-span-1 flex items-center justify-center gap-1">
                            <button type="button"
                              onClick={() => updateVariant(deal.id, v.id, 'inStock', v.inStock === false)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition ${v.inStock !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button type="button"
                              onClick={() => deleteVariant(deal.id, v.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredDeals.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
              ? 'هیچ محصولی با این فیلترها یافت نشد'
              : 'هنوز محصولی ثبت نشده است'}
          </div>
        )}
      </div>

      {/* Single Unified Floating Save Trigger */}
      <div className="fixed bottom-20 inset-x-0 flex justify-center z-40 px-4 pointer-events-none">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="pointer-events-auto flex items-center justify-center gap-2.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/30 backdrop-blur-sm"
        >
          <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
          <span>{isSaving ? 'در حال ذخیره‌سازی...' : 'ذخیره سراسری تنظیمات و محصولات'}</span>
        </button>
      </div>

      {/* Floating Variant Image Popover Modal */}
      <VariantImagePopover
        isOpen={editingVariantImage !== null}
        onClose={() => setEditingVariantImage(null)}
        imageUrl={editingVariantImage?.currentUrl}
        onSave={(newUrl) => {
          if (editingVariantImage) {
            updateVariant(editingVariantImage.itemId, editingVariantImage.variantId, 'image', newUrl);
          }
        }}
        mainProductImage={editingVariantImage?.mainImage}
        variantTitle={editingVariantImage?.variantTitle}
      />
    </div>
  );
};

