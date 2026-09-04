import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Zap, Plus, Trash2, RefreshCw, Save, Layers,
  Check, Scale, Eye, EyeOff, ChevronDown, ChevronUp,
  Search, Globe, Percent, Upload, Image as ImageIcon, Star,
  CheckSquare, Square, ArrowUpDown, X
} from 'lucide-react';
import type { FeaturedDeal, ProductVariant, FinancialSettings } from '../../types';
import { formatToman, toPersianDigits, getEffectiveAedRate, normalizeProductImageUrl, extractCleanUrl, deduplicateImageUrls, getNormalizedTime } from '../../utils/formatters';
import { bulkDeleteProductsFromFirestore, bulkToggleVisibilityInFirestore, bulkTogglePopularInFirestore } from '../../services/productService';
import { sanitizeProductTitle } from '../../utils/textSanitizer';
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
import { deleteDoc, doc, setDoc, updateDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase';
import { storage } from '../../config/firebase';
import { parseWeightKg, calculateProductTomanPrice } from '../../utils/pricingCalculator';
import { saveSpecialDeals } from '../../services/adminService';
import { sanitizePayloadForFirestore } from '../../utils/adminSaveHelper';
import { universalScraperService } from '../../services/scraperService';
import { parseProductLinkUniversal, generateBilingualProductTitle, cleanProductTitle, extractDraftProduct } from '../../utils/parseLink';
import { extractProductShared } from '../../services/sharedExtractor';
import { getEffectiveGeminiKeysList } from '../../utils/geminiKey';
import { 
  addPopularProductToBeginning, 
  removePopularProduct,
  normalizeProductId 
} from '../../services/popularProductsService';

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

  const titleFa = String(prod.titleFa || prod.title || prod.titleEn || '').trim();
  const titleEn = String(prod.titleEn || prod.rawTitle || '');
  const rawMainImg = String(prod.imageUrl || prod.image || '');
  const mainImage = normalizeProductImageUrl(rawMainImg, String(prod.url || ''));

  const rawImages: string[] = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images.filter(Boolean).map(String) : (mainImage ? [mainImage] : []);
  const rawGallery: string[] = Array.isArray(prod.galleryImages) && prod.galleryImages.length > 0 ? prod.galleryImages.filter(Boolean).map(String) : (mainImage ? [mainImage] : []);
  const normImages = Array.from(new Set([mainImage, ...rawImages.map((img: string) => normalizeProductImageUrl(img, String(prod.url || '')))].filter(Boolean)));
  const normGallery = Array.from(new Set([mainImage, ...rawGallery.map((img: string) => normalizeProductImageUrl(img, String(prod.url || '')))].filter(Boolean)));

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
    storeName: String(prod.storeName || 'فروشگاه دبی'),
    targetSection: 'deals' as const,
    isActive: prod.isActive !== undefined ? Boolean(prod.isActive) : (prod.isPublished !== undefined ? Boolean(prod.isPublished) : true),
    isPopular: Boolean(prod.isPopular),
    isPopularSample: Boolean(prod.isPopularSample ?? prod.isPopular),
    popularOrder: prod.isPopular
      ? (typeof prod.popularOrder === 'number' && prod.popularOrder > 0 ? prod.popularOrder : Date.now())
      : -1,
    isFeatured: Boolean(prod.isFeatured || prod.isPopular),
    inStock: prod.inStock !== false,
    allowedFlavors: cleanFlavors,
    flavors: cleanFlavors,
    allowedSizes: cleanSizes,
    sizes: cleanSizes,
    variants: cleanVariants,
    createdAt: typeof prod.createdAt === 'number' && !isNaN(prod.createdAt) && prod.createdAt > 0
      ? prod.createdAt
      : (prod.createdAt ? new Date(prod.createdAt).getTime() : Date.now()),
    updatedAt: Date.now()
  };
};

export const isCorruptedProduct = (p: any): boolean => {
  if (!p || !p.id) return true;
  const tFa = (p.titleFa || '').trim();
  const tEn = (p.titleEn || p.title || '').trim();
  const name = (p.name || '').trim();
  const fullTitle = tFa || tEn || name;

  const isExplicitGhostTitle =
    !fullTitle ||
    fullTitle === 'محصول بدون عنوان' ||
    fullTitle === 'بدون عنوان' ||
    fullTitle === 'محصول پرطرفدار' ||
    fullTitle.toLowerCase() === 'popular product' ||
    fullTitle.toLowerCase() === 'untitled product';

  const hasPrice = Number(p.priceAed || p.price || p.priceToman || p.manualPriceToman || 0) > 0;
  const hasImage = Boolean(p.imageUrl || p.image || (Array.isArray(p.images) && p.images.length > 0));

  if (isExplicitGhostTitle) return true;
  if (!hasPrice && !hasImage && (!p.variants || p.variants.length === 0)) return true;

  return false;
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
  const [deals, setDeals] = useState<FeaturedDeal[]>(() => {
    return (initialDeals || [])
      .filter(d => !isCorruptedProduct(d))
      .sort((a, b) => {
        const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
        const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
        return timeB - timeA;
      });
  });

  useEffect(() => {
    if (Array.isArray(initialDeals)) {
      setDeals(initialDeals.filter(d => !isCorruptedProduct(d)).sort((a, b) => {
        const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
        const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
        return timeB - timeA;
      }));
    }
  }, [initialDeals]);
  const [categoriesTree, setCategoriesTree] = useState<TaxonomyCategory[]>(DEFAULT_TAXONOMY);
  const [newDealUrl, setNewDealUrl] = useState('');
  const [newDealCategory, setNewDealCategory] = useState('');
  const [newDealSubCategory, setNewDealSubCategory] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [auxLinks, setAuxLinks] = useState<Record<string, string>>({});
  const [auxLoading, setAuxLoading] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetPosition, setTargetPosition] = useState<string>('');
  const [isBulkOperating, setIsBulkOperating] = useState<boolean>(false);

  const handleManualDealImageUpload = async (dealId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Immediately set a local preview via URL.createObjectURL(file)
    const localPreviewUrl = URL.createObjectURL(file);
    updateDeal(dealId, {
      imageUrl: localPreviewUrl,
      image: localPreviewUrl,
      images: [localPreviewUrl]
    } as any);

    // 2. Upload file binary to Firebase Storage under products/images/${Date.now()}_${file.name}
    setUploadingImageIds(prev => ({ ...prev, [dealId]: true }));
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `products/images/${Date.now()}_${cleanName}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);

      updateDeal(dealId, {
        imageUrl: downloadUrl,
        image: downloadUrl,
        images: [downloadUrl]
      } as any);
      if (showToast) showToast('تصویر پیشنهاد با موفقیت در فضای ابری ذخیره شد', 'success');
    } catch (uploadErr: any) {
      console.error('[Storage Upload Error]:', uploadErr);
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          updateDeal(dealId, {
            imageUrl: b64,
            image: b64,
            images: [b64]
          } as any);
          if (showToast) showToast('تصویر به صورت محلی ذخیره شد', 'info');
        };
        reader.readAsDataURL(file);
      } catch (_fbErr) {
        if (showToast) showToast('خطا در بارگذاری تصویر', 'error');
      }
    } finally {
      setUploadingImageIds(prev => ({ ...prev, [dealId]: false }));
      e.target.value = '';
    }
  };

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
    const matched = deals.filter(deal => {
      if (isCorruptedProduct(deal)) return false;
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
        filterStatus === 'active' ? (deal.isActive === true || expandedIds.has(deal.id)) :
        filterStatus === 'popular' ? ((deal as any).isPopular === true || expandedIds.has(deal.id)) :
        filterStatus === 'draft' ? (deal.isActive !== true || expandedIds.has(deal.id)) : true;
      return matchSearch && matchCat && matchStatus;
    });

    // Newest deals appear first at the top of the table
    return matched.sort((a, b) => {
      const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
      const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
      return timeB - timeA;
    });
  }, [deals, searchTerm, filterCategory, filterStatus, expandedIds]);

  const calcToman = (priceAed: number, marginVal?: number) =>
    calculateProductTomanPrice({
      priceAed,
      profitMarginPercent: marginVal !== undefined ? marginVal : defaultMargin,
      aedToTomanRate: aedRate,
      baseShippingAed: 20
    });

  useEffect(() => {
    if (Array.isArray(initialDeals)) {
      setDeals(prev => {
        // Keep active unsaved drafts in memory so incoming snapshot updates never wipe user work
        const unsavedDrafts = prev.filter(p => !initialDeals.some(init => init.id === p.id) && !isCorruptedProduct(p));
        const cleanInitial = initialDeals.filter(d => !isCorruptedProduct(d));
        const merged = [...unsavedDrafts, ...cleanInitial];
        return merged.sort((a, b) => {
          const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
          const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
          return timeB - timeA;
        });
      });
    }
  }, [initialDeals]);

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleTogglePopular = async (productId: string) => {
    const target = deals.find(d => d.id === productId);
    if (!target) return;
    const currentPop = Boolean((target as any)?.isPopular);
    const nextPop = !currentPop;
    const now = Date.now();
    // Millisecond timestamp for popular sort ensures most recently starred is placed first
    const nextOrder = nextPop ? now : -1;

    // Optimistic local update
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id === productId) {
          return { ...d, isPopular: nextPop, isFeatured: nextPop, popularOrder: nextOrder };
        }
        return d;
      })
    );

    // Identify if target is an unsaved draft (not yet persisted in database)
    const isSavedInFirestore = initialDeals.some(item => item.id === productId);

    if (!isSavedInFirestore) {
      if (showToast) {
        showToast(nextPop ? 'وضعیت پیش‌نویس: پرطرفدار (با ذخیره سراسری در دیتابیس ثبت می‌شود)' : 'وضعیت پیش‌نویس: عادی', 'info');
      }
      return;
    }

    try {
      const patch = {
        isPopular: nextPop,
        isPopularSample: nextPop,
        isFeatured: nextPop,
        popularOrder: nextOrder,
        updatedAt: serverTimestamp()
      };

      if (db) {
        await Promise.all([
          updateDoc(doc(db, COLLECTION_NAME, productId), patch).catch((err) => {
            console.warn('[Popular Toggle Deals] Update in collection skipped/failed:', err);
          }),
          updateDoc(doc(db, 'products', productId), patch).catch((err) => {
            console.warn('[Popular Toggle Deals] Update in products skipped/failed:', err);
          })
        ]);
      }

      if (showToast) showToast(nextPop ? 'به لیست پرطرفدارها افزوده شد' : 'از لیست پرطرفدارها حذف شد', 'success');
    } catch (err: any) {
      console.error('[Popular Toggle DB Error]:', err);
      // Revert optimistic update
      setDeals((prev) =>
        prev.map((d) => (d.id === productId ? { ...d, isPopular: currentPop } : d))
      );
      if (showToast) showToast('خطا در ذخیره وضعیت در دیتابیس', 'error');
    }
  };

  // ── Multi-Select Bulk Actions Handlers ──
  const handleToggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = filteredDeals.map(d => d.id).filter(Boolean);
      setSelectedIds(Array.from(new Set([...selectedIds, ...allFilteredIds])));
    } else {
      const currentFilteredSet = new Set(filteredDeals.map(d => d.id));
      setSelectedIds(prev => prev.filter(id => !currentFilteredSet.has(id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`آیا از حذف دائمی ${toPersianDigits(selectedIds.length)} محصول انتخاب شده اطمینان دارید؟`)) return;

    setIsBulkOperating(true);
    const idsToDelete = [...selectedIds];
    const updated = deals.filter(d => !idsToDelete.includes(d.id));
    setDeals(updated);
    setSelectedIds([]);

    try {
      await bulkDeleteProductsFromFirestore(COLLECTION_NAME, idsToDelete);
      await onSaveDeals(updated);
      if (showToast) showToast(`${toPersianDigits(idsToDelete.length)} محصول با موفقیت حذف شدند`, 'success');
    } catch (err: any) {
      console.error('[Bulk Delete Error]:', err);
      if (showToast) showToast('خطا در حذف گروهی محصولات', 'error');
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkToggleVisibility = async (nextVisibility: boolean) => {
    if (selectedIds.length === 0) return;
    setIsBulkOperating(true);
    const ids = [...selectedIds];

    setDeals(prev => prev.map(d => ids.includes(d.id) ? { ...d, isActive: nextVisibility, isPublished: nextVisibility } : d));

    try {
      await bulkToggleVisibilityInFirestore(COLLECTION_NAME, ids, nextVisibility);
      if (showToast) showToast(`وضعیت نمایش ${toPersianDigits(ids.length)} محصول تغییر یافت`, 'success');
    } catch (err: any) {
      console.error('[Bulk Visibility Error]:', err);
      if (showToast) showToast('خطا در بروزرسانی گروهی وضعیت نمایش', 'error');
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkTogglePopular = async (nextPopular: boolean) => {
    if (selectedIds.length === 0) return;
    setIsBulkOperating(true);
    const ids = [...selectedIds];
    const now = Date.now();

    setDeals(prev => prev.map(d => ids.includes(d.id) ? {
      ...d,
      isPopular: nextPopular,
      isFeatured: nextPopular,
      popularOrder: nextPopular ? now : -1
    } : d));

    try {
      await bulkTogglePopularInFirestore(COLLECTION_NAME, ids, nextPopular);
      if (showToast) showToast(`وضعیت پرطرفدار ${toPersianDigits(ids.length)} محصول تغییر یافت`, 'success');
    } catch (err: any) {
      console.error('[Bulk Popular Error]:', err);
      if (showToast) showToast('خطا در بروزرسانی گروهی وضعیت پرطرفدار', 'error');
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleMoveToPosition = async () => {
    const pos = parseInt(targetPosition, 10);
    if (isNaN(pos) || pos < 1) {
      if (showToast) showToast('شماره ردیف معتبر وارد کنید (از ۱ به بعد)', 'error');
      return;
    }
    if (selectedIds.length === 0) return;

    setIsBulkOperating(true);
    try {
      // 1. Get items to move and remaining items
      const selectedSet = new Set(selectedIds);
      const itemsToMove = deals.filter(d => selectedSet.has(d.id));
      const remainingItems = deals.filter(d => !selectedSet.has(d.id));

      // 2. Insert items at target index (1-indexed -> clamp between 0 and remainingItems.length)
      const insertIndex = Math.min(Math.max(0, pos - 1), remainingItems.length);
      const reordered = [
        ...remainingItems.slice(0, insertIndex),
        ...itemsToMove,
        ...remainingItems.slice(insertIndex)
      ];

      // 3. Assign descending normalized timestamps so this exact order persists
      const baseTime = Date.now() + 10000000;
      const cleanList: FeaturedDeal[] = reordered.map((deal, idx) => {
        const assignedTime = baseTime - (idx * 1000);
        return {
          ...deal,
          createdAt: assignedTime,
          sectionAddedAt: new Date(assignedTime).toISOString(),
          updatedAt: Date.now()
        };
      });

      setDeals(cleanList);
      await onSaveDeals(cleanList);

      // Persist reordered timestamps to Firestore
      if (db) {
        await Promise.all(
          cleanList.map(item => {
            const patch = {
              createdAt: item.createdAt,
              sectionAddedAt: item.sectionAddedAt,
              updatedAt: item.updatedAt
            };
            return Promise.all([
              setDoc(doc(db, 'products', item.id), patch, { merge: true }).catch(() => {}),
              setDoc(doc(db, COLLECTION_NAME, item.id), patch, { merge: true }).catch(() => {})
            ]);
          })
        );
      }

      setTargetPosition('');
      if (showToast) showToast(`${toPersianDigits(itemsToMove.length)} محصول به ردیف ${toPersianDigits(pos)} منتقل شدند`, 'success');
    } catch (err: any) {
      console.error('[Move to Position Error]:', err);
      if (showToast) showToast('خطا در تغییر جایگاه محصولات', 'error');
    } finally {
      setIsBulkOperating(false);
    }
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
    const pAed = Number(deal?.priceAed || deal?.basePriceAed || deal?.price) || 0;
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

  // ── Unified Primary Scraper (Direct, faithful copy of Homepage extraction) ───────────
  const handleExtract = async () => {
    const targetUrl = extractCleanUrl(newDealUrl.trim());
    if (!targetUrl) { if (showToast) showToast('لینک وارد کنید', 'error'); return; }
    setIsExtracting(true);
    try {
      console.log('[Scraper Engine] Initiating extraction from caller: DealsAdmin', { targetUrl });
      const extracted = await extractProductShared(targetUrl, cms, { bypassCache: true, forceFresh: true });

      // STRICT PRE-DRAFT VALIDATION GUARD (Anti-Corruption Invariant)
      const isValidPayload = Boolean(
        extracted &&
        extracted.success &&
        (extracted.titleFa || extracted.titleEn || extracted.title) &&
        (extracted.titleFa !== 'محصول بدون عنوان' && extracted.title !== 'محصول بدون عنوان') &&
        Number(extracted.priceAed || extracted.price || 0) > 0
      );

      if (!isValidPayload) {
        if (showToast) showToast('خطا: اطلاعات کالا به درستی دریافت نشد. ایجاد پیش‌نویس متوقف شد.', 'error');
        setIsExtracting(false);
        return;
      }

      const pAed = Number(extracted.priceAed || extracted.price);

      // 1:1 Logic Clone from HeroCalculator for Absolute HTTPS CDN Image Resolution
      const rawImage = extracted.imageUrl || extracted.image || (extracted.images && extracted.images[0]) || '';
      let resolvedImageUrl = rawImage.trim();
      if (resolvedImageUrl.startsWith('//')) {
        resolvedImageUrl = `https:${resolvedImageUrl}`;
      } else if (resolvedImageUrl.startsWith('/')) {
        const domain = targetUrl.includes('drnutrition') ? 'https://drnutrition.com' : 'https://www.lifepharmacy.com';
        resolvedImageUrl = `${domain}${resolvedImageUrl}`;
      }
      const normMainImg = normalizeProductImageUrl(resolvedImageUrl, targetUrl) || resolvedImageUrl;

      const mainCat = newDealCategory || categoriesTree[0]?.name || 'مکمل‌های ورزشی';
      const subCat = newDealSubCategory || categoriesTree[0]?.subCategories?.[0]?.name || '';

      const defSize = extracted.sizes[0] || '';
      const wt = defSize ? parseWeightKg(defSize, extracted.weightKg) : extracted.weightKg;

      const dynamicVariants: ProductVariant[] = extracted.variants.map((v, idx) => {
        const vPrice = v.priceAed || pAed;
        return {
          ...v,
          id: v.id || `var-${idx}-${Date.now()}`,
          priceToman: vPrice > 0 ? calcToman(vPrice, defaultMargin) : 0,
          image: v.image ? (normalizeProductImageUrl(v.image, targetUrl) || v.image) : normMainImg,
          imageUrl: v.imageUrl ? (normalizeProductImageUrl(v.imageUrl, targetUrl) || v.imageUrl) : normMainImg
        };
      });

      const cleanTitleEn = sanitizeProductTitle(extracted.titleEn || extracted.title || '');
      const cleanTitleFa = sanitizeProductTitle(extracted.titleFa || extracted.title || '');
      const cleanTitle = cleanTitleFa || cleanTitleEn;

      const newDeal: FeaturedDeal = {
        id: extracted.id || `deal-${Date.now()}`,
        title: cleanTitle,
        titleFa: cleanTitleFa || cleanTitle,
        titleEn: cleanTitleEn,
        brand: extracted.brand || 'Dr. Nutrition',
        category: mainCat,
        mainCategory: mainCat,
        subcategory: subCat,
        subCategory: subCat,
        priceAed: pAed,
        basePriceAed: pAed,
        profitMargin: defaultMargin,
        originalPriceAed: extracted.originalPriceAed,
        weightKg: wt,
        priceToman: pAed > 0 ? calcToman(pAed, defaultMargin) : 0,
        manualPriceToman: null,
        isManualPrice: false,
        originalPriceToman: 0,
        stockQuantity: 10,
        stockCount: 10,
        image: normMainImg,
        imageUrl: normMainImg,
        images: extracted.images.length > 0 ? extracted.images : (normMainImg ? [normMainImg] : []),
        galleryImages: extracted.galleryImages.length > 0 ? extracted.galleryImages : (normMainImg ? [normMainImg] : []),
        url: targetUrl,
        storeName: extracted.storeName || 'Dr. Nutrition',
        inStock: true,
        isActive: true,
        isPopular: false,
        isFeatured: false,
        flavors: extracted.flavors as any,
        allowedFlavors: extracted.flavors as any,
        sizes: extracted.sizes as any,
        allowedSizes: extracted.sizes as any,
        variants: dynamicVariants,
        createdAt: Date.now(),
        sectionAddedAt: new Date().toISOString(),
        updatedAt: Date.now()
      };

      setDeals(prev => [newDeal, ...prev.filter(d => d.id !== newDeal.id && !isCorruptedProduct(d))]);
      setExpandedIds(prev => new Set([newDeal.id, ...prev]));
      setNewDealUrl('');
      if (showToast) showToast('محصول با موفقیت استخراج و به عنوان پیش‌نویس در صدر لیست ثبت شد.', 'success');

    } catch (err: any) {
      if (showToast) showToast('خطا در استخراج: ' + err.message, 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Manual Deal Creation ──
  const handleCreateManualDeal = () => {
    const mainCat = newDealCategory || categoriesTree[0]?.name || 'مکمل‌های ورزشی';
    const subCat = newDealSubCategory || categoriesTree[0]?.subCategories?.[0]?.name || '';
    const now = Date.now();
    const manualDeal: FeaturedDeal = {
      id: `manual_deal_${now}_${Math.random().toString(36).substring(2, 6)}`,
      title: '',
      titleFa: '',
      titleEn: '',
      brand: 'سیریک فیت',
      category: mainCat,
      mainCategory: mainCat,
      subcategory: subCat,
      subCategory: subCat,
      priceAed: 0,
      basePriceAed: 0,
      originalPriceAed: 0,
      profitMargin: 20,
      weightKg: 1,
      priceToman: 0,
      manualPriceToman: null,
      isManualPrice: false,
      originalPriceToman: 0,
      imageUrl: '',
      image: '',
      images: [],
      galleryImages: [],
      url: 'https://sirikfit.ir/deals',
      storeName: 'سیریک فیت',
      inStock: true,
      isActive: true,
      isPopular: false,
      isFeatured: false,
      variants: [],
      createdAt: now,
      sectionAddedAt: new Date(now).toISOString(),
      updatedAt: now
    };
    setDeals(prev => [manualDeal, ...prev.filter(d => d.id !== manualDeal.id)]);
    setExpandedIds(prev => new Set([manualDeal.id, ...prev]));
    if (showToast) showToast('محصول دستی جدید به پیشنهادهای ویژه اضافه شد (ردیف اول باز شد)', 'success');
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

  // ── Delete item (Atomic Multi-Collection Firestore Deletion) ───────────
  const handleDelete = async (dealId: string) => {
    if (!dealId) {
      if (showToast) showToast('شناسه محصول نامعتبر است', 'error');
      return;
    }
    if (!window.confirm('آیا از حذف دائمی این محصول از پایگاه داده اطمینان دارید؟')) return;
    const updated = deals.filter(d => d.id !== dealId);
    setDeals(updated);
    try {
      const rawId = normalizeProductId(dealId);
      const collectionsToPurge = [COLLECTION_NAME, 'products', 'inventory', 'deals', 'iran_warehouse'];
      await Promise.all([
        ...collectionsToPurge.map(col => deleteDoc(doc(db, col, dealId)).catch(() => {})),
        ...(rawId && rawId !== dealId ? collectionsToPurge.map(col => deleteDoc(doc(db, col, rawId)).catch(() => {})) : []),
        removePopularProduct(rawId || dealId, COLLECTION_NAME).catch(() => {})
      ]);
      await onSaveDeals(updated);
      if (showToast) showToast('محصول با موفقیت از پایگاه داده حذف شد', 'success');
    } catch (err: any) {
      console.error('[Firestore Delete Error]:', err);
      if (showToast) showToast(`خطا در حذف محصول: ${err.message || 'خطای سرور'}`, 'error');
    }
  };

  // ── Direct Native Firestore Save Handler (Bypasses legacy service) ──
  const handleSaveAll = async () => {
    if (isSaving) return;

    // Filter deals BEFORE sending to Firestore: Only keep items that have a valid title.
    // If an item is an unpopulated blank draft, drop it from the payload and active state.
    const populatedDeals = deals.filter(d => Boolean(d.titleFa?.trim() || d.title?.trim() || d.titleEn?.trim()));
    if (populatedDeals.length === 0 && deals.length > 0) {
      if (showToast) showToast('هیچ محصول معتبری برای ذخیره وجود ندارد. لطفاً عنوان محصول را وارد کنید.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const now = Date.now();
      const cleanList: FeaturedDeal[] = [];

      for (const deal of populatedDeals) {
        if (!deal.id) continue;
        if (isCorruptedProduct(deal)) continue;

        const rawCreated = deal.createdAt || deal.sectionAddedAt;
        const createdAtMs = rawCreated ? (
          typeof rawCreated === 'number' && !isNaN(rawCreated) && rawCreated > 0
            ? rawCreated
            : (new Date(rawCreated).getTime() || now)
        ) : now;

        const cleanDoc = sanitizeProductPayload({
          ...deal,
          createdAt: createdAtMs,
          updatedAt: now,
          targetSection: 'deals'
        }, aedRate, defaultMargin);

        if (!cleanDoc.titleFa && !cleanDoc.title && !cleanDoc.titleEn) continue;

        cleanList.push(cleanDoc as any);

        if (db) {
          const finalId = deal.id;
          const cleanPayload = {
            ...cleanDoc,
            id: finalId,
            createdAt: createdAtMs,
            updatedAt: now,
            targetSection: 'deals' as const,
            isActive: cleanDoc.isActive ?? true,
            isPopular: Boolean(cleanDoc.isPopular),
            popularOrder: cleanDoc.isPopular ? (typeof cleanDoc.popularOrder === 'number' && cleanDoc.popularOrder > 0 ? cleanDoc.popularOrder : now) : -1,
          };
          const safePayload = sanitizePayloadForFirestore(cleanPayload);
          await Promise.all([
            setDoc(doc(db, 'products', finalId), safePayload, { merge: true }),
            setDoc(doc(db, COLLECTION_NAME, finalId), safePayload, { merge: true })
          ]);
        }
      }

      // Universal Descending Sort (Newest-First / LIFO)
      cleanList.sort((a, b) => {
        const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
        const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
        return timeB - timeA;
      });

      // Immediate reactive local state update
      setDeals(cleanList);
      await onSaveDeals(cleanList);

      // Execute auxiliary bulk save across LocalStorage, and Server REST API
      saveSpecialDeals(cleanList, aedRate, defaultMargin).catch(() => {});

      if (showToast) showToast('محصولات پیشنهادهای ویژه با موفقیت ذخیره و در صدر لیست درج شدند', 'success');
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-black text-amber-900 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>استخراج پیشنهاد ویژه از لینک خارجی یا ایجاد دستی کالا:</span>
          </p>
          <button
            type="button"
            onClick={handleCreateManualDeal}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن دستی کالا</span>
          </button>
        </div>
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
            <option value="">همه زیردسته‌ها</option>
            {categoriesTree.find(c => c.name === newDealCategory)?.subCategories?.map((sc, scIdx) => (
              <option key={sc.id || sc.slug || sc.name || `sub-cat-${scIdx}`} value={sc.name}>{sc.name}</option>
            ))}
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

      {/* ── Search & Filter Bar with Master Checkbox ── */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-2xl px-4 py-3">
        {/* Master Checkbox */}
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 shrink-0 select-none pl-2 border-l border-slate-200" title="انتخاب همه">
          <input
            type="checkbox"
            checked={filteredDeals.length > 0 && filteredDeals.every(d => selectedIds.includes(d.id))}
            onChange={e => handleSelectAll(e.target.checked)}
            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
          />
          <span className="text-xs font-black">انتخاب همه</span>
        </label>

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
        {filteredDeals
          .slice()
          .sort((a, b) => {
            const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
            const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
            return timeB - timeA;
          })
          .map((deal, idx) => {
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
              <div
                className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('input') || target.closest('label') || target.closest('select') || target.closest('a')) {
                    return;
                  }
                  toggleExpand(deal.id);
                }}
              >
                {/* Row Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(deal.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleToggleSelect(deal.id, e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600 shrink-0"
                />

                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                  {toPersianDigits(idx + 1)}
                </span>

                <div className="w-14 h-14 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {(deal.imageUrl || deal.image) ? (
                    <img
                      src={deal.imageUrl || deal.image}
                      alt={(deal as any).titleEn || (deal as any).titleFa || deal.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain p-0.5"
                      loading="lazy"
                      onError={(e) => {
                        const failedUrl = deal.imageUrl || deal.image;
                        console.error('[Image Load Failed - Deal]:', failedUrl);
                        if (failedUrl && !failedUrl.includes('images.weserv.nl') && !failedUrl.startsWith('data:')) {
                          e.currentTarget.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(failedUrl);
                        } else {
                          e.currentTarget.classList.add('opacity-40');
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[10px] text-slate-400">
                      بدون تصویر
                    </div>
                  )}
                </div>

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
                  {/* Eye Icon (Visibility / Publish Toggle) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleTogglePublished(deal.id);
                    }}
                    title={(deal.isPublished !== false && deal.isActive !== false) ? 'نمایش در سایت (فعال)' : 'مخفی از سایت (غیرفعال)'}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      (deal.isPublished !== false && deal.isActive !== false)
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-400'
                    }`}
                  >
                    {(deal.isPublished !== false && deal.isActive !== false) ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  {/* Star Icon (Popular Toggle) */}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!deal.id) return;
                      const nextPopular = !deal.isPopular;
                      const nextOrder = nextPopular ? 0 : -1;
                      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, isPopular: nextPopular, isFeatured: nextPopular, popularOrder: nextOrder } : d));

                      const isSaved = initialDeals.some(i => i.id === deal.id);
                      if (!isSaved) {
                        if (showToast) showToast(nextPopular ? 'وضعیت پیش‌نویس: پرطرفدار (با ذخیره سراسری در دیتابیس ثبت می‌شود)' : 'وضعیت پیش‌نویس: عادی', 'info');
                        return;
                      }

                      try {
                        const patch = {
                          isPopular: nextPopular,
                          isPopularSample: nextPopular,
                          isFeatured: nextPopular,
                          popularOrder: nextOrder,
                          updatedAt: new Date().toISOString()
                        };
                        await Promise.all([
                          setDoc(doc(db, 'products', deal.id), patch, { merge: true }),
                          setDoc(doc(db, COLLECTION_NAME, deal.id), patch, { merge: true })
                        ]);
                        if (showToast) showToast(nextPopular ? 'به پرطرفدارها اضافه شد' : 'از پرطرفدارها حذف شد', 'success');
                      } catch (err: any) {
                        console.error('[Popular Toggle Error]:', err);
                        if (showToast) showToast('خطا در ذخیره وضعیت پرطرفدار', 'error');
                      }
                    }}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      deal.isPopular
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                        : 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-400'
                    }`}
                    title={deal.isPopular ? 'پرطرفدار (فعال)' : 'پرطرفدار (غیرفعال)'}
                  >
                    <Star className={`w-4 h-4 ${deal.isPopular ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                  </button>

                  <button type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(deal.id);
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-100 hover:text-rose-700 active:scale-95 rounded-lg transition cursor-pointer"
                    title="حذف / لغو پیش‌نویس"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleExpand(deal.id);
                    }}
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

                  {/* ── تنظیم تصویر محصول (Product Image Settings) ── */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-black text-slate-900">تنظیم تصویر محصول (Product Image Settings)</span>
                      </div>
                      {uploadingImageIds[deal.id] && (
                        <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5 animate-pulse bg-amber-100/70 px-2.5 py-1 rounded-lg">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>در حال بارگذاری در Firebase Storage...</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                      {/* Reactive Visual Preview */}
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        {(deal.imageUrl || deal.image) ? (
                          <img
                            src={deal.imageUrl || deal.image}
                            alt={deal.title || 'تصویر پیشنهاد'}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            className="w-full h-full object-contain p-1 transition"
                            onError={(e) => {
                              e.currentTarget.classList.add('opacity-40');
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-[10px] text-slate-400 font-bold p-1 text-center">
                            <ImageIcon className="w-4 h-4 text-slate-300 mb-0.5" />
                            <span>بدون تصویر</span>
                          </div>
                        )}
                      </div>

                      {/* Dual Source: Direct URL + Device File Upload */}
                      <div className="flex-1 w-full space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          لینک مستقیم تصویر یا انتخاب فایل از موبایل / لپ‌تاپ:
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={deal.imageUrl || deal.image || ''}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              updateDeal(deal.id, {
                                imageUrl: val,
                                image: val,
                                images: val ? [val, ...(deal.images || []).filter(i => i !== val)] : []
                              } as any);
                            }}
                            placeholder="لینک تصویر را وارد کنید..."
                            className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 dir-ltr text-right"
                          />
                          <label className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-98">
                            <Upload className="w-3.5 h-3.5 text-amber-400" />
                            <span>انتخاب فایل</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleManualDealImageUpload(deal.id, e)}
                              disabled={uploadingImageIds[deal.id]}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
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
                        قیمت نهایی فروش (تومان):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={deal.priceToman || ''}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                            updateDeal(deal.id, {
                              priceToman: val,
                              manualPriceToman: val,
                              isManualPrice: true
                            });
                          }}
                          placeholder="قیمت دستی به تومان"
                          className="w-full bg-white border border-amber-400 rounded-xl px-3 py-2 text-xs font-black text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dir-ltr text-center"
                        />
                        <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-bold">تومان</span>
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
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
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

      {/* Floating Multi-Select Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-36 inset-x-0 flex justify-center z-50 px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="pointer-events-auto bg-slate-900/95 text-white border border-slate-700 shadow-2xl rounded-2xl p-3 flex flex-wrap items-center gap-3 backdrop-blur-md max-w-4xl w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-black">
                {toPersianDigits(selectedIds.length)} محصول انتخاب شده
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition text-xs flex items-center gap-1 cursor-pointer"
                title="لغو انتخاب"
              >
                <X className="w-3.5 h-3.5" />
                <span>انصراف</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Move to Position input */}
              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-300 font-bold">انتقال به ردیف:</span>
                <input
                  type="number"
                  min="1"
                  max={deals.length}
                  value={targetPosition}
                  onChange={e => setTargetPosition(e.target.value)}
                  placeholder="ردیف"
                  className="w-14 bg-slate-950 text-white text-xs px-1.5 py-0.5 rounded border border-slate-600 text-center font-bold"
                  disabled={isBulkOperating}
                />
                <button
                  type="button"
                  onClick={handleMoveToPosition}
                  disabled={isBulkOperating || !targetPosition}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold px-2 py-0.5 rounded transition cursor-pointer"
                >
                  برو
                </button>
              </div>

              {/* Bulk Visibility */}
              <button
                type="button"
                onClick={() => handleBulkToggleVisibility(true)}
                disabled={isBulkOperating}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                title="نمایش در سایت"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>نمایش</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkToggleVisibility(false)}
                disabled={isBulkOperating}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                title="عدم نمایش در سایت"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>عدم نمایش</span>
              </button>

              {/* Bulk Popular */}
              <button
                type="button"
                onClick={() => handleBulkTogglePopular(true)}
                disabled={isBulkOperating}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                title="افزودن به پرطرفدارها"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>پرطرفدار</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkTogglePopular(false)}
                disabled={isBulkOperating}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                title="حذف از پرطرفدارها"
              >
                <Star className="w-3.5 h-3.5 text-slate-400" />
                <span>عادی</span>
              </button>

              {/* Bulk Delete */}
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkOperating}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                title="حذف کلی محصولات انتخاب شده"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف ({toPersianDigits(selectedIds.length)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

