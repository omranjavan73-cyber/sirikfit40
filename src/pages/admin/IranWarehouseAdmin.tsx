import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Zap, Plus, Trash2, RefreshCw, Save, Layers,
  Check, Scale, Eye, EyeOff, ChevronDown, ChevronUp,
  Search, Building2, Globe, Percent, Upload, Image as ImageIcon, Star,
  CheckSquare, Square, ArrowUpDown, X, Package
} from 'lucide-react';
import type { LocalInventoryItem, ProductVariant, FinancialSettings } from '../../types';
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
import { calculateProductTomanPrice, parseWeightKg, computeVariantToman } from '../../utils/pricingCalculator';
import { saveIranWarehouseItems } from '../../services/adminService';
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

  const titleFa = String(prod.titleFa || prod.title || prod.titleEn || '').trim();
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
    targetSection: 'iran_warehouse' as const,
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

  const hasPrice = Number(p.priceAed || p.price || p.priceToman || p.manualPriceToman || p.basePriceAed || 0) > 0;
  const hasImage = Boolean(p.imageUrl || p.image || (Array.isArray(p.images) && p.images.length > 0));

  if (isExplicitGhostTitle) return true;
  if (!hasPrice && !hasImage && (!p.variants || p.variants.length === 0)) return true;

  return false;
};

export const IranWarehouseAdmin: React.FC<IranWarehouseAdminProps> = ({
  items: initialItems = [],
  settings,
  cms,
  taxonomyList = [],
  onSaveItems,
  showToast
}) => {
  const [items, setItems] = useState<LocalInventoryItem[]>(() => {
    return (initialItems || [])
      .filter(i => !isCorruptedProduct(i))
      .sort((a, b) => {
        const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
        const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
        return timeB - timeA;
      });
  });

  useEffect(() => {
    if (Array.isArray(initialItems)) {
      setItems(initialItems.filter(i => !isCorruptedProduct(i)).sort((a, b) => {
        const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
        const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
        return timeB - timeA;
      }));
    }
  }, [initialItems]);

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetPosition, setTargetPosition] = useState<string>('');
  const [isBulkOperating, setIsBulkOperating] = useState<boolean>(false);

  const handleManualItemImageUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Immediately set a local preview via URL.createObjectURL(file)
    const localPreviewUrl = URL.createObjectURL(file);
    updateItem(itemId, {
      imageUrl: localPreviewUrl,
      image: localPreviewUrl,
      images: [localPreviewUrl]
    } as any);

    // 2. Upload file binary to Firebase Storage under products/images/${Date.now()}_${file.name}
    setUploadingImageIds(prev => ({ ...prev, [itemId]: true }));
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `products/images/${Date.now()}_${cleanName}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);

      updateItem(itemId, {
        imageUrl: downloadUrl,
        image: downloadUrl,
        images: [downloadUrl]
      } as any);
      if (showToast) showToast('تصویر کالا با موفقیت در فضای ابری ذخیره شد', 'success');
    } catch (uploadErr: any) {
      console.error('[Storage Upload Error]:', uploadErr);
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          updateItem(itemId, {
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
      setUploadingImageIds(prev => ({ ...prev, [itemId]: false }));
      e.target.value = '';
    }
  };

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
  // ── Filtering & Newest-First Sorting ──────────────────────────────────
  const filteredItems = useMemo(() => {
    const matched = items.filter(item => {
      if (isCorruptedProduct(item)) return false;
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
        filterStatus === 'active' ? (item.isActive === true || expandedIds.has(item.id)) :
        filterStatus === 'popular' ? ((item as any).isPopular === true || expandedIds.has(item.id)) :
        filterStatus === 'draft' ? (item.isActive !== true || expandedIds.has(item.id)) : true;
      return matchSearch && matchCat && matchStatus;
    });

    // Newest products appear first at the top of the table
    return matched.sort((a, b) => {
      const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
      const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
      return timeB - timeA;
    });
  }, [items, searchTerm, filterCategory, filterStatus, expandedIds]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const calcToman = (priceAed: number, profitMarginVal?: number) =>
    calculateProductTomanPrice({
      priceAed,
      profitMarginPercent: profitMarginVal !== undefined ? profitMarginVal : margin,
      aedToTomanRate: aedRate,
      baseShippingAed: 20
    });

  useEffect(() => {
    if (Array.isArray(initialItems)) {
      setItems(prev => {
        // Keep active unsaved drafts in memory so incoming snapshot updates never wipe user work
        const unsavedDrafts = prev.filter(p => !initialItems.some(init => init.id === p.id) && !isCorruptedProduct(p));
        const cleanInitial = initialItems.filter(i => !isCorruptedProduct(i));
        const merged = [...unsavedDrafts, ...cleanInitial];
        return merged.sort((a, b) => {
          const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
          const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
          return timeB - timeA;
        });
      });
    }
  }, [initialItems]);

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleTogglePopular = async (productId: string) => {
    const target = items.find(i => i.id === productId);
    if (!target) return;
    const currentPop = Boolean((target as any)?.isPopular);
    const nextPop = !currentPop;
    const now = Date.now();
    // Millisecond timestamp for popular sort ensures most recently starred is placed first
    const nextOrder = nextPop ? now : -1;

    // Optimistic local update in items state
    setItems((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return { ...p, isPopular: nextPop, isFeatured: nextPop, popularOrder: nextOrder };
        }
        return p;
      })
    );

    // Identify if target is an unsaved draft (not yet persisted in database)
    const isSavedInFirestore = initialItems.some(item => item.id === productId);

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
            console.warn('[Popular Toggle] Update in collection skipped/failed:', err);
          }),
          updateDoc(doc(db, 'products', productId), patch).catch((err) => {
            console.warn('[Popular Toggle] Update in products skipped/failed:', err);
          })
        ]);
      }

      if (showToast) showToast(nextPop ? 'به لیست پرطرفدارها افزوده شد' : 'از لیست پرطرفدارها حذف شد', 'success');
    } catch (err: any) {
      console.error('[Popular Toggle DB Error]:', err);
      // Revert optimistic update
      setItems((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isPopular: currentPop } : p))
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
      const allFilteredIds = filteredItems.map(i => i.id).filter(Boolean);
      setSelectedIds(Array.from(new Set([...selectedIds, ...allFilteredIds])));
    } else {
      const currentFilteredSet = new Set(filteredItems.map(i => i.id));
      setSelectedIds(prev => prev.filter(id => !currentFilteredSet.has(id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`آیا از حذف دائمی ${toPersianDigits(selectedIds.length)} کالای انتخاب شده اطمینان دارید؟`)) return;

    setIsBulkOperating(true);
    const idsToDelete = [...selectedIds];
    const updated = items.filter(i => !idsToDelete.includes(i.id));
    setItems(updated);
    setSelectedIds([]);

    try {
      await bulkDeleteProductsFromFirestore(COLLECTION_NAME, idsToDelete);
      await onSaveItems(updated);
      if (showToast) showToast(`${toPersianDigits(idsToDelete.length)} کالا با موفقیت حذف شدند`, 'success');
    } catch (err: any) {
      console.error('[Bulk Delete Error]:', err);
      if (showToast) showToast('خطا در حذف گروهی کالاها', 'error');
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkToggleVisibility = async (nextVisibility: boolean) => {
    if (selectedIds.length === 0) return;
    setIsBulkOperating(true);
    const ids = [...selectedIds];

    setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, isActive: nextVisibility, isPublished: nextVisibility } : i));

    try {
      await bulkToggleVisibilityInFirestore(COLLECTION_NAME, ids, nextVisibility);
      if (showToast) showToast(`وضعیت نمایش ${toPersianDigits(ids.length)} کالا تغییر یافت`, 'success');
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

    setItems(prev => prev.map(i => ids.includes(i.id) ? {
      ...i,
      isPopular: nextPopular,
      isFeatured: nextPopular,
      popularOrder: nextPopular ? now : -1
    } : i));

    try {
      await bulkTogglePopularInFirestore(COLLECTION_NAME, ids, nextPopular);
      if (showToast) showToast(`وضعیت پرطرفدار ${toPersianDigits(ids.length)} کالا تغییر یافت`, 'success');
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
      const itemsToMove = items.filter(i => selectedSet.has(i.id));
      const remainingItems = items.filter(i => !selectedSet.has(i.id));

      // 2. Insert items at target index (1-indexed -> clamp between 0 and remainingItems.length)
      const insertIndex = Math.min(Math.max(0, pos - 1), remainingItems.length);
      const reordered = [
        ...remainingItems.slice(0, insertIndex),
        ...itemsToMove,
        ...remainingItems.slice(insertIndex)
      ];

      // 3. Assign descending normalized timestamps so this exact order persists
      const baseTime = Date.now() + 10000000;
      const cleanList: LocalInventoryItem[] = reordered.map((item, idx) => {
        const assignedTime = baseTime - (idx * 1000);
        return {
          ...item,
          createdAt: assignedTime,
          sectionAddedAt: new Date(assignedTime).toISOString(),
          updatedAt: Date.now()
        };
      });

      setItems(cleanList);
      await onSaveItems(cleanList);

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
      if (showToast) showToast(`${toPersianDigits(itemsToMove.length)} کالا به ردیف ${toPersianDigits(pos)} منتقل شدند`, 'success');
    } catch (err: any) {
      console.error('[Move to Position Error]:', err);
      if (showToast) showToast('خطا در تغییر جایگاه کالاها', 'error');
    } finally {
      setIsBulkOperating(false);
    }
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

  // ── Unified Primary Scraper (Direct Single Source of Truth) ───────────
  const handleExtract = async () => {
    const targetUrl = extractCleanUrl(newItemUrl.trim());
    if (!targetUrl) { if (showToast) showToast('لینک وارد کنید', 'error'); return; }
    setIsExtracting(true);
    try {
      console.log('[Scraper Engine] Initiating extraction from caller: IranWarehouseAdmin', { targetUrl });
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

      const defMargin = 20;
      const calcPriceToman = pAed > 0 ? calculateProductTomanPrice({
        priceAed: pAed,
        profitMarginPercent: defMargin,
        aedToTomanRate: aedRate,
        baseShippingAed: 20
      }) : 0;

      const mainCat = newItemCategory || categoriesTree[0]?.name || 'مکمل‌های ورزشی';
      const subCat = newItemSubCategory || categoriesTree[0]?.subCategories?.[0]?.name || '';

      const defSize = extracted.sizes[0] || '';
      const wt = defSize ? parseWeightKg(defSize, extracted.weightKg) : extracted.weightKg;

      const dynamicVariants: ProductVariant[] = extracted.variants.map((v, idx) => {
        const vPrice = v.priceAed || pAed;
        return {
          ...v,
          id: v.id || `var-${idx}-${Date.now()}`,
          priceToman: vPrice > 0 ? calculateProductTomanPrice({
            priceAed: vPrice,
            profitMarginPercent: defMargin,
            aedToTomanRate: aedRate,
            baseShippingAed: 20
          }) : 0,
          image: v.image ? (normalizeProductImageUrl(v.image, targetUrl) || v.image) : normMainImg,
          imageUrl: v.imageUrl ? (normalizeProductImageUrl(v.imageUrl, targetUrl) || v.imageUrl) : normMainImg
        };
      });

      const cleanTitleEn = sanitizeProductTitle(extracted.titleEn || extracted.title || '');
      const cleanTitleFa = sanitizeProductTitle(extracted.titleFa || extracted.title || '');
      const cleanTitle = cleanTitleFa || cleanTitleEn;

      const newItem: LocalInventoryItem = {
        id: extracted.id || `item-${Date.now()}`,
        title: cleanTitle,
        titleFa: cleanTitleFa || cleanTitle,
        titleEn: cleanTitleEn,
        brand: extracted.brand || 'انبار ایران',
        category: mainCat,
        mainCategory: mainCat,
        subcategory: subCat,
        subCategory: subCat,
        priceAed: pAed,
        basePriceAed: pAed,
        originalPriceAed: extracted.originalPriceAed,
        profitMargin: defMargin,
        weightKg: wt,
        priceToman: calcPriceToman,
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
        isPublished: true,
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

      setItems(prev => [newItem, ...prev.filter(i => i.id !== newItem.id && !isCorruptedProduct(i))]);
      setExpandedIds(prev => new Set([newItem.id, ...prev]));
      setNewItemUrl('');
      if (showToast) showToast('محصول با موفقیت استخراج و به عنوان پیش‌نویس در صدر لیست ثبت شد.', 'success');

    } catch (err: any) {
      if (showToast) showToast('خطا در استخراج: ' + err.message, 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Manual Item Creation ──
  const handleCreateManualItem = () => {
    const mainCat = newItemCategory || categoriesTree[0]?.name || 'مکمل‌های ورزشی';
    const subCat = newItemSubCategory || categoriesTree[0]?.subCategories?.[0]?.name || '';
    const now = Date.now();
    const manualItem: LocalInventoryItem = {
      id: `manual_iran_${now}_${Math.random().toString(36).substring(2, 6)}`,
      title: '',
      titleFa: '',
      titleEn: '',
      brand: 'انبار ایران',
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
      stockQuantity: 10,
      stockCount: 10,
      inStock: true,
      imageUrl: '',
      image: '',
      images: [],
      variants: [],
      targetSection: 'iran_warehouse',
      storeName: 'انبار ایران (تحویل فوری)',
      storeDomain: 'https://sirikfit.ir/warehouse',
      createdAt: now,
      updatedAt: now,
      sectionAddedAt: new Date(now).toISOString()
    };
    const updated = [manualItem, ...items.filter(i => i.id !== manualItem.id)];
    setItems(updated);
    setExpandedItemId(manualItem.id);
    if (showToast) showToast('محصول دستی خام اضافه شد (ردیف اول باز شد)', 'success');
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

  // ── Delete item (Atomic Multi-Collection Firestore Deletion) ───────────
  const handleDelete = async (itemId: string) => {
    if (!itemId) {
      if (showToast) showToast('شناسه محصول نامعتبر است', 'error');
      return;
    }
    if (!window.confirm('آیا از حذف دائمی این محصول از پایگاه داده اطمینان دارید؟')) return;
    const updated = items.filter(i => i.id !== itemId);
    setItems(updated);
    try {
      const rawId = normalizeProductId(itemId);
      const collectionsToPurge = [COLLECTION_NAME, 'products', 'inventory', 'special_deals', 'deals'];
      await Promise.all([
        ...collectionsToPurge.map(col => deleteDoc(doc(db, col, itemId)).catch(() => {})),
        ...(rawId && rawId !== itemId ? collectionsToPurge.map(col => deleteDoc(doc(db, col, rawId)).catch(() => {})) : []),
        removePopularProduct(rawId || itemId, COLLECTION_NAME).catch(() => {})
      ]);
      await onSaveItems(updated);
      if (showToast) showToast('محصول با موفقیت از پایگاه داده حذف شد', 'success');
    } catch (err: any) {
      console.error('[Firestore Delete Error]:', err);
      if (showToast) showToast(`خطا در حذف محصول: ${err.message || 'خطای سرور'}`, 'error');
    }
  };

  // ── Database Cleanup Utility (Auto-Purge Corrupted Items) ──
  // ── Direct Native Firestore Save Handler (Bypasses legacy service) ──
  const handleSaveAll = async () => {
    if (isSaving) return;

    // Filter items BEFORE sending to Firestore: Only keep items that have a valid title.
    // If an item is an unpopulated blank draft, drop it from the payload and active state.
    const populatedItems = items.filter(d => Boolean(d.titleFa?.trim() || d.title?.trim() || d.titleEn?.trim()));
    if (populatedItems.length === 0 && items.length > 0) {
      if (showToast) showToast('هیچ محصول معتبری برای ذخیره وجود ندارد. لطفاً عنوان محصول را وارد کنید.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const now = Date.now();
      const cleanList: LocalInventoryItem[] = [];

      for (const item of populatedItems) {
        if (!item.id) continue;
        if (isCorruptedProduct(item)) continue;

        const rawCreated = item.createdAt || item.sectionAddedAt;
        const createdAtMs = rawCreated ? (
          typeof rawCreated === 'number' && !isNaN(rawCreated) && rawCreated > 0
            ? rawCreated
            : (new Date(rawCreated).getTime() || now)
        ) : now;

        const cleanDoc = sanitizeProductPayload({
          ...item,
          createdAt: createdAtMs,
          updatedAt: now,
          targetSection: 'iran_warehouse'
        }, aedRate, margin);

        if (!cleanDoc.titleFa && !cleanDoc.title && !cleanDoc.titleEn) continue;

        cleanList.push(cleanDoc as any);

        if (db) {
          const finalId = item.id;
          const cleanPayload = {
            ...cleanDoc,
            id: finalId,
            createdAt: createdAtMs,
            updatedAt: now,
            targetSection: 'iran_warehouse' as const,
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
      setItems(cleanList);
      await onSaveItems(cleanList);

      // Execute auxiliary bulk save across LocalStorage and Server backend
      saveIranWarehouseItems(cleanList, aedRate, margin).catch(() => {});

      if (showToast) showToast('محصولات انبار ایران با موفقیت ذخیره و در صدر لیست درج شدند', 'success');
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
            <Package className="w-5 h-5 text-blue-500" />
            <span>مدیریت محصولات انبار ایران ({toPersianDigits(items.length)} محصول)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">فرمول قیمت‌گذاری انبار ایران (بدون هزینه باربری هوایی) و ذخیره مستقیم در دیتابیس</p>
        </div>
      </div>

      {/* ── URL Extractor Bar ── */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-black text-blue-900 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>استخراج محصول انبار ایران از لینک خارجی یا ایجاد دستی کالا:</span>
          </p>
          <button
            type="button"
            onClick={handleCreateManualItem}
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن دستی کالا</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="relative flex items-center sm:col-span-5 w-full">
            <input
              type="text"
              value={newItemUrl}
              onChange={e => setNewItemUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleExtract()}
              placeholder="https://www.drnutrition.com/..."
              className="w-full bg-white border border-blue-300 text-slate-900 text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-600 dir-ltr font-mono"
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
            className="sm:col-span-3 bg-white border border-blue-300 text-slate-800 text-xs px-3 py-2.5 rounded-xl font-bold"
          >
            {categoriesTree.map(c => <option key={c.id || c.slug} value={c.name}>{c.name}</option>)}
          </select>
          <select
            value={newItemSubCategory}
            onChange={e => setNewItemSubCategory(e.target.value)}
            className="sm:col-span-2 bg-white border border-blue-300 text-slate-800 text-xs px-3 py-2.5 rounded-xl font-bold"
          >
            <option value="">همه زیردسته‌ها</option>
            {categoriesTree.find(c => c.name === newItemCategory)?.subCategories?.map(sc => (
              <option key={sc.id || sc.slug} value={sc.name}>{sc.name}</option>
            ))}
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

      {/* ── Search & Filter Bar with Master Checkbox ── */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-2xl px-4 py-3">
        {/* Master Checkbox */}
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 shrink-0 select-none pl-2 border-l border-slate-200" title="انتخاب همه">
          <input
            type="checkbox"
            checked={filteredItems.length > 0 && filteredItems.every(i => selectedIds.includes(i.id))}
            onChange={e => handleSelectAll(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
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
        {filteredItems
          .slice()
          .sort((a, b) => {
            const timeA = getNormalizedTime(a.createdAt || a.sectionAddedAt || a.updatedAt);
            const timeB = getNormalizedTime(b.createdAt || b.sectionAddedAt || b.updatedAt);
            return timeB - timeA;
          })
          .map((item, idx) => {
          const isOpen = expandedIds.has(item.id);
          const flavorsPool = (item.flavors as any as string[]) || [];
          const sizesPool = (item.sizes as any as string[]) || [];
          const subCats = categoriesTree.find(c => c.name === (item.mainCategory || item.category))?.subCategories || [];

          return (
            <div key={item.id}
              className={`rounded-2xl border transition-all ${item.isActive ? 'border-slate-200 bg-white' : 'border-dashed border-amber-300 bg-amber-50/30'}`}
            >
              {/* ── Compact Header Row ── */}
              <div
                className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('input') || target.closest('label') || target.closest('select') || target.closest('a')) {
                    return;
                  }
                  toggleExpand(item.id);
                }}
              >
                {/* Row Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleToggleSelect(item.id, e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 shrink-0"
                />

                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                  {toPersianDigits(idx + 1)}
                </span>

                <div className="w-14 h-14 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {(item.imageUrl || item.image) ? (
                    <img
                      src={item.imageUrl || item.image}
                      alt={(item as any).titleEn || (item as any).titleFa || item.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain p-0.5"
                      loading="lazy"
                      onError={(e) => {
                        const failedUrl = item.imageUrl || item.image;
                        console.error('[Image Load Failed - Inventory]:', failedUrl);
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
                  {/* Eye Icon (Visibility / Publish Toggle) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleTogglePublished(item.id);
                    }}
                    title={(item.isPublished !== false && item.isActive !== false) ? 'نمایش در سایت (فعال)' : 'مخفی از سایت (غیرفعال)'}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      (item.isPublished !== false && item.isActive !== false)
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-400'
                    }`}
                  >
                    {(item.isPublished !== false && item.isActive !== false) ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  {/* Star Icon (Popular Toggle) */}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!item.id) return;
                      const nextPopular = !item.isPopular;
                      const nextOrder = nextPopular ? 0 : -1;
                      setItems(prev => prev.map(p => p.id === item.id ? { ...p, isPopular: nextPopular, isFeatured: nextPopular, popularOrder: nextOrder } : p));

                      const isSaved = initialItems.some(i => i.id === item.id);
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
                          setDoc(doc(db, 'products', item.id), patch, { merge: true }),
                          setDoc(doc(db, COLLECTION_NAME, item.id), patch, { merge: true })
                        ]);
                        if (showToast) showToast(nextPopular ? 'به پرطرفدارها اضافه شد' : 'از پرطرفدارها حذف شد', 'success');
                      } catch (err: any) {
                        console.error('[Popular Toggle Error]:', err);
                        if (showToast) showToast('خطا در ذخیره وضعیت پرطرفدار', 'error');
                      }
                    }}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      item.isPopular
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                        : 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-400'
                    }`}
                    title={item.isPopular ? 'پرطرفدار (فعال)' : 'پرطرفدار (غیرفعال)'}
                  >
                    <Star className={`w-4 h-4 ${item.isPopular ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                  </button>

                  <button type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(item.id);
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
                      toggleExpand(item.id);
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

                  {/* ── تنظیم تصویر محصول (Product Image Settings) ── */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-black text-slate-900">تنظیم تصویر محصول (Product Image Settings)</span>
                      </div>
                      {uploadingImageIds[item.id] && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 animate-pulse bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>در حال بارگذاری در Firebase Storage...</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                      {/* Reactive Visual Preview */}
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        {(item.imageUrl || item.image) ? (
                          <img
                            src={item.imageUrl || item.image}
                            alt={item.title || 'تصویر محصول'}
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
                            value={item.imageUrl || item.image || ''}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              updateItem(item.id, {
                                imageUrl: val,
                                image: val,
                                images: val ? [val, ...(item.images || []).filter(i => i !== val)] : []
                              } as any);
                            }}
                            placeholder="لینک تصویر را وارد کنید..."
                            className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 dir-ltr text-right"
                          />
                          <label className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-98">
                            <Upload className="w-3.5 h-3.5 text-emerald-400" />
                            <span>انتخاب فایل</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleManualItemImageUpload(item.id, e)}
                              disabled={uploadingImageIds[item.id]}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
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
                        قیمت نهایی فروش (تومان):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={item.priceToman || ''}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                            updateItem(item.id, {
                              priceToman: val,
                              manualPriceToman: val,
                              isManualPrice: true
                            });
                          }}
                          placeholder="قیمت دستی به تومان"
                          className="w-full bg-white border border-emerald-400 rounded-xl px-3 py-2 text-xs font-black text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-center"
                        />
                        <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-bold">تومان</span>
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
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
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

      {/* Floating Multi-Select Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-36 inset-x-0 flex justify-center z-50 px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="pointer-events-auto bg-slate-900/95 text-white border border-slate-700 shadow-2xl rounded-2xl p-3 flex flex-wrap items-center gap-3 backdrop-blur-md max-w-4xl w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-black">
                {toPersianDigits(selectedIds.length)} کالا انتخاب شده
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
                  max={items.length}
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
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold px-2 py-0.5 rounded transition cursor-pointer"
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
                title="حذف کلی کالاهای انتخاب شده"
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
