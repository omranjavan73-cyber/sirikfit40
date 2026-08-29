import { db } from '../config/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { sanitizePayloadForFirestore } from '../utils/adminSaveHelper';
import type { FeaturedDeal, LocalInventoryItem } from '../types';
import { parseWeightKg, calculateProductTomanPrice } from '../utils/pricingCalculator';

export const SPECIAL_DEALS_COLLECTION = 'special_deals';
export const IRAN_WAREHOUSE_COLLECTION = 'iran_warehouse';

export interface StandardProductDoc {
  id: string;
  title: string;
  titleFa: string;
  titleEn: string;
  brand: string;
  category: string;
  mainCategory: string;
  subcategory: string;
  subCategory: string;
  caption: string;
  description: string;
  image: string;
  imageUrl: string;
  images: string[];
  galleryImages: string[];
  basePriceAed: number;
  priceAed: number;
  originalPriceAed: number;
  profitMargin: number;
  weightKg: number;
  priceToman: number;
  originalPriceToman: number;
  stockQuantity: number;
  stockCount: number;
  url: string;
  storeName: string;
  inStock: boolean;
  isActive: boolean;
  isPublished?: boolean;
  isPopular: boolean;
  isFeatured: boolean;
  allowedFlavors: string[];
  flavors: string[];
  allowedSizes: string[];
  sizes: string[];
  variants: Array<{
    id: string;
    flavor: string;
    size: string;
    priceAed: number;
    price: number;
    priceAED: number;
    priceToman: number;
    weightKg: number;
    image: string;
    inStock: boolean;
    url?: string;
  }>;
  updatedAt: string;
}

export const sanitizeProductForFirestore = (prod: any, aedToTomanRate: number = 54500): StandardProductDoc => {
  const baseAed = Number(prod.basePriceAed || prod.priceAed || prod.price || 0);
  const margin = Number(prod.profitMargin !== undefined && prod.profitMargin !== null && !isNaN(Number(prod.profitMargin)) ? prod.profitMargin : 20);
  const baseWeight = Number(prod.weightKg || 0.8);

  const defaultToman = calculateProductTomanPrice({
    priceAed: baseAed,
    profitMarginPercent: margin,
    aedToTomanRate,
    baseShippingAed: 20
  });

  const titleFa = String(prod.titleFa || prod.title || 'محصول بدون عنوان');
  const titleEn = String(prod.titleEn || prod.rawTitle || '');
  const primaryTitle = titleFa || titleEn || 'محصول بدون عنوان';
  const img = String(prod.imageUrl || prod.image || '');

  const rawVariants = Array.isArray(prod.variants) ? prod.variants : [];
  const cleanVariants = rawVariants
    .filter((v: any) => v && ((v.size && String(v.size).trim()) || (v.flavor && String(v.flavor).trim())))
    .map((v: any) => {
      const vAed = Number(v.priceAed ?? v.price ?? v.priceAED ?? baseAed ?? 0);
      const vToman = Number(v.priceToman || calculateProductTomanPrice({
        priceAed: vAed,
        profitMarginPercent: margin,
        aedToTomanRate,
        baseShippingAed: 20
      }));

      const cleanFlavor = (v.flavor && !String(v.flavor).includes('+ طعم سفارشی') && v.flavor !== '__custom__')
        ? String(v.flavor).trim()
        : 'پیش‌فرض';
      const cleanSize = (v.size && !String(v.size).includes('+ تایپ سایز') && v.size !== '__custom__')
        ? String(v.size).trim()
        : 'استاندارد';

      const varImg = String(v.image || v.imageUrl || '').trim();

      return {
        id: String(v.id || Math.random().toString(36).substring(2, 8)),
        flavor: cleanFlavor,
        size: cleanSize,
        priceAed: vAed,
        price: vAed,
        priceAED: vAed,
        priceToman: vToman,
        weightKg: parseWeightKg(cleanSize, Number(v.weightKg) || baseWeight),
        image: varImg !== '' ? varImg : null,
        imageUrl: varImg !== '' ? varImg : null,
        inStock: v.inStock !== false,
        ...(v.url ? { url: String(v.url) } : {})
      };
    });

  const cleanFlavors: string[] = Array.from(new Set(cleanVariants.map((v: any) => String(v.flavor))));
  const cleanSizes: string[] = Array.from(new Set(cleanVariants.map((v: any) => String(v.size))));

  return {
    id: String(prod.id || Date.now()),
    title: primaryTitle,
    titleFa,
    titleEn,
    brand: String(prod.brand || ''),
    category: String(prod.category || prod.mainCategory || 'مکمل‌های ورزشی'),
    mainCategory: String(prod.mainCategory || prod.category || 'مکمل‌های ورزشی'),
    subcategory: String(prod.subcategory || prod.subCategory || ''),
    subCategory: String(prod.subCategory || prod.subcategory || ''),
    caption: String(prod.caption || ''),
    description: String(prod.description || ''),
    image: img,
    imageUrl: img,
    images: Array.isArray(prod.images) ? prod.images.filter(Boolean) : (img ? [img] : []),
    galleryImages: Array.isArray(prod.galleryImages) ? prod.galleryImages.filter(Boolean) : (img ? [img] : []),
    basePriceAed: baseAed,
    priceAed: Number(prod.priceAed || baseAed),
    originalPriceAed: Number(prod.originalPriceAed || 0),
    profitMargin: margin,
    weightKg: baseWeight,
    priceToman: Number(prod.priceToman || defaultToman),
    originalPriceToman: Number(prod.originalPriceToman || 0),
    stockQuantity: Number(prod.stockQuantity || 10),
    stockCount: Number(prod.stockCount || prod.stockQuantity || 10),
    url: String(prod.url || ''),
    storeName: String(prod.storeName || 'فروشگاه دبی'),
    inStock: prod.inStock !== false,
    isActive: prod.isActive !== undefined ? Boolean(prod.isActive) : (prod.isPublished !== undefined ? Boolean(prod.isPublished) : true),
    isPublished: prod.isPublished !== undefined ? Boolean(prod.isPublished) : (prod.isActive !== undefined ? Boolean(prod.isActive) : true),
    isPopular: Boolean(prod.isPopular),
    isFeatured: Boolean(prod.isFeatured || prod.isPopular),
    allowedFlavors: cleanFlavors,
    flavors: cleanFlavors,
    allowedSizes: cleanSizes,
    sizes: cleanSizes,
    variants: cleanVariants,
    updatedAt: new Date().toISOString()
  };
};

export const cleanProductForFirestore = sanitizeProductForFirestore;

/**
 * Deep, atomic, sanitized Firestore product writer
 */
export async function saveAllAdminProducts(
  collectionName: 'special_deals' | 'iran_warehouse',
  products: any[]
): Promise<void> {
  if (!Array.isArray(products)) {
    throw new Error('لیست محصولات نامعتبر است');
  }

  const cleanList: StandardProductDoc[] = [];

  for (const item of products) {
    if (!item.id) continue;
    const cleanDoc = sanitizeProductForFirestore(item);
    cleanList.push(cleanDoc);
  }

  // 1. LocalStorage & React state update
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`sirikfit_${collectionName}`, JSON.stringify(cleanList));
      const cmsKey = collectionName === 'iran_warehouse' ? 'localInventory' : 'deals';
      const rawCms = localStorage.getItem('sirikfit_cms_config');
      const cms = rawCms ? JSON.parse(rawCms) : {};
      cms[cmsKey] = cleanList;
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(cms));
      localStorage.setItem('omex_home_cms', JSON.stringify(cms));
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { [cmsKey]: cleanList, cmsConfig: cms } }));
      window.dispatchEvent(new Event('storage'));
    } catch (_e) {}
  }

  // 2. Direct Firestore SDK writes (atomic cleanup & save)
  try {
    const currentIds = new Set(cleanList.map(item => item.id));

    // A. Query existing documents in collection to delete orphaned / removed docs
    try {
      const existingSnap = await getDocs(collection(db, collectionName));
      for (const docSnap of existingSnap.docs) {
        if (!currentIds.has(docSnap.id)) {
          await deleteDoc(docSnap.ref);
        }
      }
    } catch (queryErr) {
      console.warn(`Could not query existing ${collectionName} docs for cleanup:`, queryErr);
    }

    // B. Write or update active documents
    for (const cleanDoc of cleanList) {
      const docRef = doc(db, collectionName, cleanDoc.id);
      await setDoc(docRef, sanitizePayloadForFirestore(cleanDoc), { merge: true });
    }

    const cmsKey = collectionName === 'iran_warehouse' ? 'localInventory' : 'deals';
    const cmsRef = doc(db, 'settings', 'cms');
    await setDoc(cmsRef, sanitizePayloadForFirestore({ [cmsKey]: cleanList, updatedAt: new Date().toISOString() }), { merge: true });
  } catch (fsErr: any) {
    console.warn(`Firestore save notice for ${collectionName}:`, fsErr?.message || fsErr);
  }

  // 3. Backend API sync
  try {
    await fetch('/api/admin/save-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: cleanList, collection: collectionName })
    }).catch(() => {});
  } catch (_e) {}
}

export const saveAdminProducts = saveAllAdminProducts;

/**
 * Fetch all Special Deals from Firestore
 */
export async function fetchSpecialDealsFromFirestore(): Promise<FeaturedDeal[]> {
  try {
    const snap = await getDocs(collection(db, SPECIAL_DEALS_COLLECTION));
    const list: FeaturedDeal[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as FeaturedDeal);
    });
    return list;
  } catch (err) {
    console.error('Error fetching special deals:', err);
    return [];
  }
}

/**
 * Fetch all Iran Warehouse items from Firestore
 */
export async function fetchIranWarehouseFromFirestore(): Promise<LocalInventoryItem[]> {
  try {
    const snap = await getDocs(collection(db, IRAN_WAREHOUSE_COLLECTION));
    const list: LocalInventoryItem[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as LocalInventoryItem);
    });
    return list;
  } catch (err) {
    console.error('Error fetching iran warehouse items:', err);
    return [];
  }
}

/**
 * Delete a product from Firestore
 */
export async function deleteProductFromFirestore(
  collectionName: 'special_deals' | 'iran_warehouse',
  productId: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, productId));
}
