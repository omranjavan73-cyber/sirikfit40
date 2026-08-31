import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Zap, Plus, Trash2, RefreshCw, Save, Layers,
  Check, Scale, Eye, EyeOff, ChevronDown, ChevronUp,
  Search, Building2, Globe, Percent
} from 'lucide-react';
import type { LocalInventoryItem, ProductVariant, FinancialSettings } from '../../types';
import { formatToman, toPersianDigits, getEffectiveAedRate, normalizeProductImageUrl } from '../../utils/formatters';
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
import { calculateProductTomanPrice, parseWeightKg, computeVariantToman } from '../../utils/pricingCalculator';
import { saveIranWarehouseItems } from '../../services/adminService';

interface IranWarehouseAdminProps {
  items: LocalInventoryItem[];
  settings?: FinancialSettings;
  cms?: any;
  taxonomyList?: any[];
  onSaveItems: (updatedItems: LocalInventoryItem[]) => Promise<void>;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const COLLECTION_NAME = 'iran_warehouse';

export { parseWeightKg };
export const parseSizeWeightKg = parseWeightKg;

// Store Pricing Policy Toman selling price formula (Flat 20 AED item fee + profit margin %)
export function computeTomanSellingPrice(
  priceAed: number,
  _weightKg: number,
  aedRate: number,
  _cargoRatePerKg: number,
  profitMargin: number
): number {
  return calculateProductTomanPrice({
    priceAed,
    profitMarginPercent: profitMargin !== undefined ? profitMargin : 20,
    aedToTomanRate: aedRate || 54500,
    baseShippingAed: 20
  });
}

// Strict Data Sanitizer: forces valid fallback values and completely purges undefined properties
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

      const rawVarImg = (v.image && String(v.image).trim() !== '') ? String(v.image).trim() : ((v.imageUrl && String(v.imageUrl).trim() !== '') ? String(v.imageUrl).trim() : '');
      const normVarImg = normalizeProductImageUrl(rawVarImg, String(prod.url || '')) || null;

      const cleanVar: Record<string, any> = {
        id: String(v.id || `var-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`),
        flavor: cleanFlavor,
        size: cleanSize,
        priceAed: vAed,
        price: vAed,
        priceAED: vAed,
        priceToman: vToman,
        weightKg: parseWeightKg(cleanSize, Number(v.weightKg) || baseWeight),
        image: normVarImg,
        imageUrl: normVarImg,
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
  const rawMainImg = String(prod.imageUrl || prod.image || '');
  const mainImage = normalizeProductImageUrl(rawMainImg, String(prod.url || ''));

  const rawImages: string[] = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images.filter(Boolean).map(String) : (mainImage ? [mainImage] : []);
  const rawGallery: string[] = Array.isArray(prod.galleryImages) && prod.galleryImages.length > 0 ? prod.galleryImages.filter(Boolean).map(String) : (mainImage ? [mainImage] : []);
  const normImages = Array.from(new Set([mainImage, ...rawImages.map((img: string) => normalizeProductImageUrl(img, String(prod.url || '')))].filter(Boolean)));
  const normGallery = Array.from(new Set([mainImage, ...rawGallery.map((img: string) => normalizeProductImageUrl(img, String(prod.url || '')))].filter(Boolean)));

  return {
    id: String(prod.id || `local-${Date.now()}`),
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
    images: normImages,
    galleryImages: normGallery,
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
    storeName: String(prod.storeName || 'انبار ایران'),
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

export const IranWarehouseAdmin: React.FC<IranWarehouseAdminProps> = ({
  items: initialItems = [],
  settings,
  cms,
  taxonomyList = [],
  onSaveItems,
  showToast
}) => {
  const [items, setItems] = useState<LocalInventoryItem[]>(initialItems);
  const [categoriesTree, setCategoriesTree] = useState<TaxonomyCategory[]>(DEFAULT_TAXONOMY);
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemSubCategory, setNewItemSubCategory] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Per-item accordion expand state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Per-item aux link input
  const [auxLinks, setAuxLinks] = useState<Record<string, string>>({});
  const [auxLoading, setAuxLoading] = useState<Record<string, boolean>>({});
  // Per-item custom flavor/size inputs
  const [customFlavors, setCustomFlavors] = useState<Record<string, string>>({});
  const [customSizes, setCustomSizes] = useState<Record<string, { val: string; unit: string }>>({});
  // Per-variant custom row mode
  const [customRowMode, setCustomRowMode] = useState<Record<string, { customSize?: boolean; customFlavor?: boolean }>>({});
  const [editingVariantImage, setEditingVariantImage] = useState<{ itemId: string; variantId: string; variantTitle?: string; currentUrl?: string; mainImage?: string } | null>(null);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'popular' | 'draft'>('all');

  const aedRate = getEffectiveAedRate(settings, cms) || 54500;
  const cargoRate = settings?.cargoRatePerKg || 35;
  const margin = settings?.profitMargin || 20;

  useEffect(() => {
    fetchTaxonomyFromFirestore().then(loaded => {
      if (Array.isArray(loaded) && loaded.length > 0) {
        setCategoriesTree(loaded);
        if (!newItemCategory) {
          setNewItemCategory(loaded[0].name);
          setNewItemSubCategory(loaded[0].subCategories?.[0]?.name || '');
        }
      } else if (taxonomyList.length > 0) {
        setCategoriesTree(taxonomyList);
        if (!newItemCategory) setNewItemCategory(taxonomyList[0]?.name || '');
      }
    }).catch(() => {});
  }, []);

  // ── Filtering ──────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        item.title?.toLowerCase().includes(q) ||
        (item as any).titleFa?.toLowerCase().includes(q) ||
        (item as any).titleEn?.toLowerCase().includes(q) ||
        item.brand?.toLowerCase().includes(q) ||
        item.id?.toLowerCase().includes(q);
      const matchCat = filterCategory === 'all' || item.mainCategory === filterCategory || item.category === filterCategory;
      const matchStatus =
        filterStatus === 'all' ? true :
        filterStatus === 'active' ? item.isActive === true :
        filterStatus === 'popular' ? (item as any).isPopular === true :
        filterStatus === 'draft' ? item.isActive !== true : true;
      return matchSearch && matchCat && matchStatus;
    });
  }, [items, searchTerm, filterCategory, filterStatus]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const calcToman = (priceAed: number, profitMarginVal?: number) =>
    calculateProductTomanPrice({
      priceAed,
      profitMarginPercent: profitMarginVal !== undefined ? profitMarginVal : margin,
      aedToTomanRate: aedRate,
      baseShippingAed: 20
    });

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleTogglePopular = (productId: string) => {
    const target = items.find(i => i.id === productId);
    const nextPop = !Boolean((target as any)?.isPopular);
    setItems((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isPopular: nextPop, isFeatured: nextPop } : p))
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
    const target = items.find(i => i.id === productId);
    const currentPub = target?.isPublished !== undefined ? target.isPublished : target?.isActive;
    const nextPub = !currentPub;
    setItems((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isPublished: nextPub, isActive: nextPub } : p))
    );
    try {
      updateDoc(doc(db, COLLECTION_NAME, productId), {
        isPublished: nextPub,
        isActive: nextPub,
        updatedAt: new Date().toISOString()
      }).catch((e) => console.warn('Instant publish toggle notice:', e));
    } catch (_e) {}
  };

  // ── Field update helpers with automatic variant pricing sync ────────────
  const updateItem = (id: string, patch: Partial<LocalInventoryItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated: any = { ...item, ...patch };
      if ('mainCategory' in patch) {
        const cat = categoriesTree.find(c => c.name === patch.mainCategory);
        updated.category = patch.mainCategory as string;
        updated.subcategory = cat?.subCategories?.[0]?.name || '';
        updated.subCategory = cat?.subCategories?.[0]?.name || '';
      }
      if ('subcategory' in patch) {
        updated.subCategory = patch.subcategory as string;
      }

      const pAed = updated.basePriceAed !== undefined ? updated.basePriceAed : (updated.priceAed !== undefined ? updated.priceAed : (updated.priceAED ?? updated.price ?? 0));
      const marginVal = updated.profitMargin !== undefined ? updated.profitMargin : (item.profitMargin !== undefined ? item.profitMargin : 20);

      if ('basePriceAed' in patch || 'priceAed' in patch || 'profitMargin' in patch) {
        updated.priceAed = pAed;
        updated.basePriceAed = pAed;
        updated.priceAED = pAed;
        updated.profitMargin = marginVal;
        updated.priceToman = calculateProductTomanPrice({
          priceAed: pAed,
          profitMarginPercent: marginVal,
          aedToTomanRate: aedRate,
          baseShippingAed: 20
        });

        if (updated.variants && updated.variants.length > 0) {
          updated.variants = updated.variants.map((v: any) => {
            const vAed = Number(v.priceAed ?? v.priceAED ?? v.price ?? pAed);
            return {
              ...v,
              priceAed: vAed,
              priceAED: vAed,
              price: vAed,
              priceToman: calculateProductTomanPrice({
                priceAed: vAed,
                profitMarginPercent: marginVal,
                aedToTomanRate: aedRate,
                baseShippingAed: 20
              })
            };
          });
        }
      }
      return updated;
    }));
  };

  const updateVariant = (itemId: string, varId: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const marginVal = item.profitMargin !== undefined ? item.profitMargin : 20;
      const variants = (item.variants || []).map(v => {
        if (v.id !== varId) return v;
        const up: any = { ...v, [field]: value };
        if (field === 'price' || field === 'priceAed') {
          const p = value === '' ? 0 : parseFloat(value) || 0;
          up.price = p;
          up.priceAed = p;
          up.priceAED = p;
          up.priceToman = calculateProductTomanPrice({
            priceAed: p,
            profitMarginPercent: marginVal,
            aedToTomanRate: aedRate,
            baseShippingAed: 20
          });
        } else if (field === 'priceToman') {
          up.priceToman = value === '' ? 0 : parseInt(value) || 0;
        }
        return up;
      });
      return { ...item, variants };
    }));
  };

  const addVariantRow = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    const pAed = Number(item?.priceAed ?? item?.basePriceAed ?? item?.priceAED ?? item?.price ?? 100);
    const marginVal = item?.profitMargin !== undefined ? item.profitMargin : 20;
    const defFlavor = (item?.flavors as any)?.[0] || 'بدون طعم (Unflavored)';
    const defSize = (item?.sizes as any)?.[0] || '2.45 kg';
    const wt = parseSizeWeightKg(defSize, item?.weightKg || 0.8);
    const newV: ProductVariant = {
      id: `var-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      size: defSize,
      flavor: defFlavor,
      price: pAed,
      priceAed: pAed,
      priceAED: pAed,
      weightKg: wt,
      priceToman: calculateProductTomanPrice({
        priceAed: pAed,
        profitMarginPercent: marginVal,
        aedToTomanRate: aedRate,
        baseShippingAed: 20
      }),
      inStock: true,
      image: item?.image || item?.imageUrl || ''
    };
    setItems(prev => prev.map(i => i.id !== itemId ? i : { ...i, variants: [...(i.variants || []), newV] }));
  };

  const deleteVariant = (itemId: string, varId: string) =>
    setItems(prev => prev.map(i => i.id !== itemId ? i : { ...i, variants: (i.variants || []).filter(v => v.id !== varId) }));

  const toggleFlavor = (itemId: string, flavor: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const cur = (item.flavors as any as string[]) || [];
      const upd = cur.includes(flavor) ? cur.filter(f => f !== flavor) : [...cur, flavor];
      return { ...item, flavors: upd as any, allowedFlavors: upd as any };
    }));
  };

  const addCustomFlavor = (itemId: string) => {
    const f = (customFlavors[itemId] || '').trim();
    if (!f) return;
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const cur = (item.flavors as any as string[]) || [];
      if (cur.includes(f)) return item;
      const upd = [...cur, f];
      return { ...item, flavors: upd as any, allowedFlavors: upd as any };
    }));
    setCustomFlavors(p => ({ ...p, [itemId]: '' }));
    if (showToast) showToast(`طعم "${f}" اضافه شد`, 'success');
  };

  const toggleSize = (itemId: string, size: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const cur = (item.sizes as any as string[]) || [];
      const upd = cur.includes(size) ? cur.filter(s => s !== size) : [...cur, size];
      return { ...item, sizes: upd as any, allowedSizes: upd as any };
    }));
  };

  const addCustomSize = (itemId: string) => {
    const inp = customSizes[itemId] || { val: '', unit: 'kg' };
    const num = parseFloat(inp.val);
    if (!num || isNaN(num)) { if (showToast) showToast('مقدار عددی معتبر وارد کنید', 'error'); return; }
    let label = '';
    if (inp.unit === 'lbs') label = `${num} lbs (${convertLbsToKg(num)} kg)`;
    else if (inp.unit === 'sachets') label = `${num} ساشه`;
    else if (inp.unit === 'caps') label = `${num} کپسول / قرص`;
    else label = `${num} kg`;
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const cur = (item.sizes as any as string[]) || [];
      if (cur.includes(label)) return item;
      const upd = [...cur, label];
      return { ...item, sizes: upd as any, allowedSizes: upd as any };
    }));
    setCustomSizes(p => ({ ...p, [itemId]: { val: '', unit: 'kg' } }));
    if (showToast) showToast(`سایز "${label}" اضافه شد`, 'success');
  };

  // ── Primary Scraper (Extracts Dual English + Persian Titles) ───────────
  const handleExtract = async () => {
    if (!newItemUrl.trim()) { if (showToast) showToast('لینک وارد کنید', 'error'); return; }
    setIsExtracting(true);
    try {
      const res = await fetch('/api/scrape-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newItemUrl.trim() })
      });
      const data = await res.json();
      if (!data?.title && !data?.priceAED && !data?.price) throw new Error('استخراج ناموفق');

      const pAed = parseFloat(data.priceAed || data.priceAED || data.price) || 0;
      const defMargin = 20;
      const calcPriceToman = pAed > 0 ? calculateProductTomanPrice({
        priceAed: pAed,
        profitMarginPercent: defMargin,
        aedToTomanRate: aedRate,
        baseShippingAed: 20
      }) : 0;
      const rawImg = data.mainImage || data.image || data.imageUrl || '';
      const img = normalizeProductImageUrl(rawImg, newItemUrl.trim());
      const rawGalleryList: string[] = Array.isArray(data.galleryImages) && data.galleryImages.length > 0
        ? data.galleryImages
        : (Array.isArray(data.images) ? data.images : (rawImg ? [rawImg] : []));
      const gallery = Array.from(
        new Set([img, ...rawGalleryList.map((g: string) => normalizeProductImageUrl(g, newItemUrl.trim()))].filter(Boolean))
      );

      const mainCat = newItemCategory || categoriesTree[0]?.name || 'مکمل‌های ورزشی';
      const subCat = newItemSubCategory || categoriesTree[0]?.subCategories?.[0]?.name || '';

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

      // Build populated variants from extracted data
      const dynamicVariants: ProductVariant[] = [];
      if (Array.isArray(data.variants) && data.variants.length > 0) {
        data.variants.forEach((v: any, idx: number) => {
          const vPrice = parseFloat(v.priceAED || v.priceAed || v.price || pAed) || pAed;
          const vSize = v.size || defSize;
          const vFlavor = v.flavor || extractedFlavors[0] || 'شکلات (Chocolate)';
          const vWeight = parseWeightKg(vSize, parseFloat(v.weightKg || data.weightKg) || 0.8);
          const rawVImg = v.image || v.imageUrl || v.imageThumbnail || rawImg;
          const normVImg = normalizeProductImageUrl(rawVImg, newItemUrl.trim()) || img;
          dynamicVariants.push({
            id: `var-${idx}-${Date.now()}`,
            size: vSize,
            flavor: vFlavor,
            price: vPrice,
            priceAed: vPrice,
            priceAED: vPrice,
            weightKg: vWeight,
            priceToman: vPrice > 0 ? calculateProductTomanPrice({
              priceAed: vPrice,
              profitMarginPercent: defMargin,
              aedToTomanRate: aedRate,
              baseShippingAed: 20
            }) : 0,
            inStock: v.inStock !== false,
            image: normVImg
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
          priceToman: calcPriceToman,
          inStock: true,
          image: img
        });
      }

      const newItem: LocalInventoryItem = {
        id: `local-${Date.now()}`,
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
        originalPriceAed: parseFloat(data.originalPriceAed || data.originalPriceAED || 0) || 0,
        profitMargin: defMargin,
        weightKg: wt,
        priceToman: calcPriceToman,
        originalPriceToman: 0,
        stockQuantity: 10,
        stockCount: 10,
        image: img,
        imageUrl: img,
        images: gallery,
        galleryImages: gallery,
        url: newItemUrl.trim(),
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

      setItems(prev => [newItem, ...prev]);
      setExpandedIds(prev => new Set([newItem.id, ...prev]));
      setNewItemUrl('');
      if (showToast) showToast('محصول و ماتریس متغیرها با موفقیت استخراج و به عنوان پیش‌نویس ذخیره شد.', 'success');

    } catch (err: any) {
      if (showToast) showToast('خطا در استخراج: ' + err.message, 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Auxiliary Scraper ─────────────────────────────────────────────────
  const handleExtractAux = async (itemId: string) => {
    const url = (auxLinks[itemId] || '').trim();
    if (!url) { if (showToast) showToast('لینک کمکی وارد کنید', 'error'); return; }
    setAuxLoading(p => ({ ...p, [itemId]: true }));
    try {
      const res = await fetch('/api/scrape-variant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!data?.priceAED && !data?.price) throw new Error('استخراج واریانت ناموفق');

      const pAed = parseFloat(data.priceAED || data.priceAed || data.price || 0);
      const item = items.find(i => i.id === itemId);
      const sz = data.size || '2.45 kg';
      const flv = data.flavor || 'اصلی';
      const wt = parseSizeWeightKg(sz, item?.weightKg || 0.8);
      const img = data.image || data.imageUrl || '';
      const marginVal = item?.profitMargin !== undefined ? item.profitMargin : 20;

      const newV: ProductVariant = {
        id: `var-aux-${Date.now()}`,
        size: sz,
        flavor: flv,
        price: pAed,
        priceAed: pAed,
        priceAED: pAed,
        weightKg: wt,
        priceToman: calculateProductTomanPrice({
          priceAed: pAed,
          profitMarginPercent: marginVal,
          aedToTomanRate: aedRate,
          baseShippingAed: 20
        }),
        inStock: true,
        image: img,
        url
      };

      setItems(prev => prev.map(i => {
        if (i.id !== itemId) return i;
        const flavors = Array.from(new Set([...(i.flavors as any as string[] || []), flv]));
        const sizes = Array.from(new Set([...(i.sizes as any as string[] || []), sz]));
        return { ...i, variants: [...(i.variants || []), newV], flavors: flavors as any, sizes: sizes as any };
      }));
      setAuxLinks(p => ({ ...p, [itemId]: '' }));
      if (showToast) showToast(`واریانت "${flv} - ${sz}" اضافه شد`, 'success');
    } catch (err: any) {
      if (showToast) showToast('خطا در استخراج کمکی: ' + err.message, 'error');
    } finally {
      setAuxLoading(p => ({ ...p, [itemId]: false }));
    }
  };

  // ── Delete item ────────────────────────────────────────────────────────
  const handleDelete = async (itemId: string) => {
    if (!confirm('آیا از حذف این محصول مطمئن هستید؟')) return;
    const updated = items.filter(i => i.id !== itemId);
    setItems(updated);
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, itemId));
      await onSaveItems(updated);
      if (showToast) showToast('محصول با موفقیت حذف شد', 'success');
    } catch (err: any) {
      console.error('Error deleting iran warehouse item:', err);
      if (showToast) showToast('خطا در حذف: ' + (err.message || 'نامشخص'), 'error');
    }
  };

  // ── Direct Native Firestore Save Handler (Bypasses legacy service) ──
  const handleSaveAll = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const cleanList: LocalInventoryItem[] = [];

      for (const item of items) {
        if (!item.id) continue;
        const cleanDoc = sanitizeProductPayload(item, aedRate, margin);
        cleanList.push(cleanDoc as any);
      }

      // Execute bulk save across Firestore, LocalStorage and Server backend
      const result = await saveIranWarehouseItems(cleanList, aedRate, margin);

      // Immediately refetch from Firestore to ensure state reflects Firestore
      try {
        const snap = await getDocs(collection(db, COLLECTION_NAME));
        const freshList: LocalInventoryItem[] = [];
        snap.forEach((d) => freshList.push({ id: d.id, ...d.data() } as LocalInventoryItem));
        if (freshList.length > 0) {
          setItems(freshList);
          await onSaveItems(freshList);
        } else {
          await onSaveItems(cleanList);
        }
      } catch (_refetchErr) {
        await onSaveItems(cleanList);
      }

      if (showToast) showToast(result.message || 'تمامی محصولات و تنظیمات انبار ایران با موفقیت ذخیره شدند', 'success');
    } catch (err: any) {
      console.error('Error saving IranWarehouse items:', err);
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
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>مدیریت انبار ایران ({toPersianDigits(items.length)} محصول)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">مدیریت موجودی تحویل فوری، عناوین دوزبانه (FA/EN) و ذخیره مطمئن در Firestore</p>
        </div>
      </div>

      {/* ── URL Extractor Bar ── */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-5 space-y-3">
        <p className="text-xs font-black text-emerald-900 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>استخراج محصول جدید به عنوان پیش‌نویس (تولید خودکار عنوان فارسی و انگلیسی):</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="relative flex items-center sm:col-span-5 w-full">
            <input
              type="text"
              value={newItemUrl}
              onChange={e => setNewItemUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleExtract()}
              placeholder="https://www.drnutrition.com/..."
              className="w-full bg-white border border-emerald-300 text-slate-900 text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-600 dir-ltr font-mono"
            />
            {newItemUrl && (
              <button
                type="button"
                onClick={() => setNewItemUrl('')}
                className="absolute left-2.5 p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="پاک کردن لینک"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={newItemCategory}
            onChange={e => {
              setNewItemCategory(e.target.value);
              const cat = categoriesTree.find(c => c.name === e.target.value);
              setNewItemSubCategory(cat?.subCategories?.[0]?.name || '');
            }}
            className="sm:col-span-3 bg-white border border-emerald-300 text-slate-800 text-xs px-3 py-2.5 rounded-xl font-bold"
          >
            {categoriesTree.map(c => <option key={c.id || c.slug} value={c.name}>{c.name}</option>)}
          </select>
          <select
            value={newItemSubCategory}
            onChange={e => setNewItemSubCategory(e.target.value)}
            className="sm:col-span-2 bg-white border border-emerald-300 text-slate-800 text-xs px-3 py-2.5 rounded-xl font-bold"
          >
            {(categoriesTree.find(c => c.name === newItemCategory)?.subCategories || []).map(s =>
              <option key={s.id || s.slug} value={s.name}>{s.name}</option>
            )}
          </select>
          <button
            type="button" onClick={handleExtract}
            disabled={isExtracting || !newItemUrl.trim()}
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
          {categoriesTree.map(c => <option key={c.id || c.slug} value={c.name}>{c.name}</option>)}
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
        <span className="text-[11px] text-slate-400 font-bold">{toPersianDigits(filteredItems.length)} مورد</span>
      </div>

      {/* ── Product Accordion List ── */}
      <div className="space-y-2">
        {filteredItems.map((item, idx) => {
          const isOpen = expandedIds.has(item.id);
          const flavorsPool = (item.flavors as any as string[]) || [];
          const sizesPool = (item.sizes as any as string[]) || [];
          const subCats = categoriesTree.find(c => c.name === (item.mainCategory || item.category))?.subCategories || [];

          return (
            <div key={item.id}
              className={`rounded-2xl border transition-all ${item.isActive ? 'border-slate-200 bg-white' : 'border-dashed border-amber-300 bg-amber-50/30'}`}
            >
              {/* ── Compact Header Row ── */}
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                  {toPersianDigits(idx + 1)}
                </span>

                {(item.image || item.imageUrl) && (
                  <img
                    src={item.image || item.imageUrl}
                    alt={item.title}
                    className="w-10 h-10 object-contain rounded-xl border border-slate-200 bg-white p-0.5 shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{item.title}</p>
                  {(item as any).titleEn && (
                    <p className="text-[10px] text-slate-400 font-mono truncate dir-ltr text-right">
                      {(item as any).titleEn}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.brand && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">{item.brand}</span>
                    )}
                    <span className="text-[10px] text-slate-500 font-medium">واریانت: {toPersianDigits(item.variants?.length || 0)}</span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">{item.priceAed} AED</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-100 hover:text-rose-700 active:scale-95 rounded-lg transition cursor-pointer"
                    title="حذف / لغو پیش‌نویس"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button type="button"
                    onClick={() => toggleExpand(item.id)}
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
                        value={(item as any).titleFa || item.title || ''}
                        onChange={e => updateItem(item.id, { titleFa: e.target.value, title: e.target.value } as any)}
                        placeholder="نام و عنوان محصول به فارسی..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>عنوان انگلیسی محصول (Title EN):</span>
                      </label>
                      <input
                        type="text"
                        value={(item as any).titleEn || ''}
                        onChange={e => updateItem(item.id, { titleEn: e.target.value } as any)}
                        placeholder="Original English Product Name..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 dir-ltr"
                      />
                    </div>
                  </div>

                  {/* Pricing & Profit Margin (Store Pricing Policy) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        قیمت پایه امارات (AED):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.basePriceAed || item.priceAed || ''}
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          updateItem(item.id, { basePriceAed: val, priceAed: val });
                        }}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 dir-ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-emerald-600" />
                        <span>درصد سود (پیش‌فرض: ۲۰٪):</span>
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={item.profitMargin !== undefined ? item.profitMargin : 20}
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          updateItem(item.id, { profitMargin: val });
                        }}
                        placeholder="20"
                        className="w-full bg-white border border-emerald-400 rounded-xl px-3 py-2 text-xs font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        قیمت محاسبه‌شده تومان:
                      </label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-emerald-700 flex items-center justify-between">
                        <span>{formatToman(item.priceToman || 0)}</span>
                        <span className="text-[10px] text-slate-500 font-bold">تومان</span>
                      </div>
                    </div>
                  </div>

                  {/* Category & Subcategory */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">دسته‌بندی اصلی:</label>
                      <select
                        value={item.mainCategory || item.category || ''}
                        onChange={e => updateItem(item.id, { mainCategory: e.target.value } as any)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      >
                        {categoriesTree.map(c => <option key={c.id || c.slug} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">زیردسته:</label>
                      <select
                        value={item.subcategory || item.subCategory || ''}
                        onChange={e => updateItem(item.id, { subcategory: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      >
                        {subCats.map(s => <option key={s.id || s.slug} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>


                  {/* Allowed Flavors Pool */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-black text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2 list-none select-none hover:bg-amber-100 transition">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>انتخاب طعم‌های مجاز ({toPersianDigits(flavorsPool.length)} طعم انتخاب شده)</span>
                      <ChevronDown className="w-3.5 h-3.5 mr-auto text-amber-600 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-2 p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_FLAVORS.map(f => {
                          const checked = flavorsPool.includes(f.name) || flavorsPool.includes(f.nameEn);
                          return (
                            <button key={f.id} type="button"
                              onClick={() => toggleFlavor(item.id, f.name)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition ${checked ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'}`}
                            >
                              {checked && <Check className="w-3 h-3" />}
                              {f.name}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <FlavorAutocompleteInput
                          value={customFlavors[item.id] || ''}
                          onChange={val => setCustomFlavors(p => ({ ...p, [item.id]: val }))}
                          onSelect={selectedName => {
                            setCustomFlavors(p => ({ ...p, [item.id]: selectedName }));
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              addCustomFlavor(item.id);
                            }
                          }}
                          placeholder="طعم سفارشی (فارسی / انگلیسی)..."
                          inputClassName="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500 font-bold"
                        />
                        <button type="button" onClick={() => addCustomFlavor(item.id)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0">
                          + افزودن
                        </button>
                      </div>
                    </div>
                  </details>

                  {/* Allowed Sizes Pool */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-black text-blue-900 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center gap-2 list-none select-none hover:bg-blue-100 transition">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      <span>انتخاب سایزها و وزن‌های مجاز ({toPersianDigits(sizesPool.length)} سایز)</span>
                      <ChevronDown className="w-3.5 h-3.5 mr-auto text-blue-600 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-2 p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_SIZES.map(sz => {
                          const checked = sizesPool.includes(sz.label);
                          return (
                            <button key={sz.id} type="button"
                              onClick={() => toggleSize(item.id, sz.label)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition ${checked ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'}`}
                            >
                              {checked && <Check className="w-3 h-3" />}
                              {sz.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <input type="number" step="0.1"
                          value={customSizes[item.id]?.val || ''}
                          onChange={e => setCustomSizes(p => ({ ...p, [item.id]: { val: e.target.value, unit: p[item.id]?.unit || 'kg' } }))}
                          placeholder="مقدار (مثال: 5)"
                          className="w-28 bg-white border border-blue-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                        />
                        <select
                          value={customSizes[item.id]?.unit || 'kg'}
                          onChange={e => setCustomSizes(p => ({ ...p, [item.id]: { val: p[item.id]?.val || '', unit: e.target.value } }))}
                          className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
                        >
                          <option value="kg">kg</option>
                          <option value="lbs">lbs</option>
                          <option value="sachets">ساشه</option>
                          <option value="caps">کپسول</option>
                        </select>
                        <button type="button" onClick={() => addCustomSize(item.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0">
                          + افزودن
                        </button>
                      </div>
                    </div>
                  </details>

                  {/* Single Unified Status Control Toolbar */}
                  <div className="flex items-center gap-2 py-2 w-full">
                    {/* 1. Publication State Toggle (isPublished) */}
                    <button
                      type="button"
                      onClick={() => handleTogglePublished(item.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        (item.isPublished !== false && item.isActive !== false)
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      <span>{(item.isPublished !== false && item.isActive !== false) ? '✓ منتشر شده در سایت (عمومی)' : '⊘ پیشنویس (مخفی از سایت)'}</span>
                    </button>

                    {/* 2. Homepage Featured Toggle (isPopular) */}
                    <button
                      type="button"
                      onClick={() => handleTogglePopular(item.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        Boolean((item as any).isPopular)
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      <span>{Boolean((item as any).isPopular) ? '★ پرطرفدار (نمایش در خانه)' : '☆ پرطرفدار (غیرفعال)'}</span>
                    </button>
                  </div>

                  {/* Variant Matrix */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        <span>ماتریس واریانت‌ها ({toPersianDigits(item.variants?.length || 0)} ردیف):</span>
                      </span>
                      <button type="button" onClick={() => addVariantRow(item.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ افزودن سطر</span>
                      </button>
                    </div>

                    {/* Aux scraper */}
                    <div className="flex gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                      <input type="url"
                        value={auxLinks[item.id] || ''}
                        onChange={e => setAuxLinks(p => ({ ...p, [item.id]: e.target.value }))}
                        placeholder="لینک کمکی طعم یا سایز دیگر..."
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 dir-ltr"
                      />
                      <button type="button"
                        onClick={() => handleExtractAux(item.id)}
                        disabled={auxLoading[item.id] || !(auxLinks[item.id] || '').trim()}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0">
                        {auxLoading[item.id] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        <span>استخراج</span>
                      </button>
                    </div>

                    {(!item.variants || item.variants.length === 0) && (
                      <p className="text-[11px] text-slate-400 py-2">واریانتی ثبت نشده — دکمه «افزودن سطر» را بزنید.</p>
                    )}

                    {(item.variants || []).map(v => {
                      const modeKey = `${item.id}_${v.id}`;
                      const isCustFlavor = Boolean(customRowMode[modeKey]?.customFlavor);
                      const availableRowSizes = Array.from(new Set([
                        ...STANDARD_SIZE_OPTIONS,
                        ...sizesPool.filter(Boolean),
                        ...(v.size ? [v.size] : [])
                      ]));
                      const isCustSize = Boolean(customRowMode[modeKey]?.customSize);

                      return (
                        <div key={v.id}
                          className="grid grid-cols-12 gap-1.5 items-center bg-white border border-slate-200 p-2 rounded-xl text-xs">
                          {/* Thumb & Optional Variant Image */}
                          <div className="col-span-3 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingVariantImage({
                                itemId: item.id,
                                variantId: v.id,
                                variantTitle: `${item.title || ''} - ${v.flavor || ''} ${v.size || ''}`.trim(),
                                currentUrl: v.image,
                                mainImage: item.image
                              })}
                              className="cursor-pointer hover:ring-2 hover:ring-amber-500 rounded-lg transition-all shrink-0 select-none group/thumb relative focus:outline-none"
                              title="ویرایش عکس اختصاصی واریانت"
                            >
                              {v.image || item.image ? (
                                <img
                                  src={v.image || item.image}
                                  alt=""
                                  className="w-9 h-9 object-contain rounded-lg border border-slate-200 p-0.5 shrink-0 bg-white shadow-2xs group-hover/thumb:brightness-95"
                                  onError={(e) => {
                                    if (item.image && (e.target as HTMLImageElement).src !== item.image) {
                                      (e.target as HTMLImageElement).src = item.image;
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
                                updateVariant(item.id, v.id, 'image', val);
                                updateVariant(item.id, v.id, 'imageUrl', val);
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
                                    onChange={val => updateVariant(item.id, v.id, 'flavor', val)}
                                    placeholder="طعم سفارشی..."
                                    inputClassName="w-full bg-slate-50 border border-amber-300 rounded-lg px-2 py-1 font-bold focus:bg-white focus:outline-none text-xs"
                                  />
                                  <button type="button" onClick={() => setCustomRowMode(p => ({ ...p, [modeKey]: { ...p[modeKey], customFlavor: false } }))} className="text-[10px] text-blue-600 font-bold shrink-0">لیست</button>
                                </div>
                              : <select value={v.flavor || (flavorsPool[0] || '')}
                                  onChange={e => {
                                    if (e.target.value === '__custom__') setCustomRowMode(p => ({ ...p, [modeKey]: { ...p[modeKey], customFlavor: true } }));
                                    else updateVariant(item.id, v.id, 'flavor', e.target.value);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold focus:bg-white focus:outline-none cursor-pointer">
                                  {flavorsPool.map(f => <option key={f} value={f}>{f}</option>)}
                                  <option value="__custom__">+ طعم سفارشی...</option>
                                </select>
                              }
                          </div>

                          {/* Size Dropdown */}
                          <div className="col-span-2">
                            {isCustSize
                              ? <div className="flex items-center gap-1">
                                  <input type="text" value={v.size || ''}
                                    onChange={e => updateVariant(item.id, v.id, 'size', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold focus:bg-white focus:outline-none" />
                                  <button type="button" onClick={() => setCustomRowMode(p => ({ ...p, [modeKey]: { ...p[modeKey], customSize: false } }))} className="text-[10px] text-blue-600 font-bold">لیست</button>
                                </div>
                              : <select
                                  value={v.size || (availableRowSizes[0] || '')}
                                  onChange={e => {
                                    if (e.target.value === '__custom__') setCustomRowMode(p => ({ ...p, [modeKey]: { ...p[modeKey], customSize: true } }));
                                    else updateVariant(item.id, v.id, 'size', e.target.value);
                                  }}
                                  className="w-full bg-slate-50 hover:bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2 py-1.5 font-bold focus:outline-none cursor-pointer text-xs"
                                  dir="ltr"
                                >
                                  {sizesPool.length > 0 && (
                                    <optgroup label="✨ سایزهای فعال">
                                      {sizesPool.map(opt => <option key={`pool-${opt}`} value={opt}>{opt}</option>)}
                                    </optgroup>
                                  )}
                                  <optgroup label="📋 تمامی سایزهای استاندارد">
                                    {STANDARD_SIZE_OPTIONS.filter(opt => !sizesPool.includes(opt)).map(opt => <option key={`std-${opt}`} value={opt}>{opt}</option>)}
                                  </optgroup>
                                  {v.size && !STANDARD_SIZE_OPTIONS.includes(v.size) && !sizesPool.includes(v.size) && (
                                    <option value={v.size}>{v.size}</option>
                                  )}
                                  <option value="__custom__">+ سایر (تایپ دستی)...</option>
                                </select>
                            }
                          </div>

                          {/* Price AED (Zero-padding bug fix) */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.01"
                              value={v.priceAed === 0 || v.priceAed === undefined || v.priceAed === '' ? '' : v.priceAed}
                              placeholder="0"
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                const numVal = rawVal === '' ? 0 : parseFloat(rawVal);
                                updateVariant(item.id, v.id, 'priceAed', numVal);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-center"
                            />
                          </div>

                          {/* Price Toman (Zero-padding bug fix) */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              value={v.priceToman === 0 || v.priceToman === undefined || v.priceToman === '' ? '' : v.priceToman}
                              placeholder="0"
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                const numVal = rawVal === '' ? 0 : parseInt(rawVal);
                                updateVariant(item.id, v.id, 'priceToman', numVal);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-center"
                            />
                          </div>

                          {/* Stock + Delete */}
                          <div className="col-span-1 flex items-center justify-center gap-1">
                            <button type="button"
                              onClick={() => updateVariant(item.id, v.id, 'inStock', v.inStock === false ? true : false)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition ${v.inStock !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button type="button"
                              onClick={() => deleteVariant(item.id, v.id)}
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

        {filteredItems.length === 0 && (
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
