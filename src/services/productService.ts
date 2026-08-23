import { db } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { sanitizePayloadForFirestore } from '../utils/adminSaveHelper';
import type { FeaturedDeal, LocalInventoryItem } from '../types';

export const SPECIAL_DEALS_COLLECTION = 'special_deals';
export const IRAN_WAREHOUSE_COLLECTION = 'iran_warehouse';

import { parseWeightKg } from '../utils/pricingCalculator';

export const cleanProductForFirestore = (prod: any) => {
  const titleFa = prod.titleFa || prod.title || prod.titleEn || '';
  const titleEn = prod.titleEn || prod.rawTitle || prod.title || '';
  const primaryTitle = titleFa || titleEn || 'بدون عنوان';
  const baseWeight = Number(prod.weightKg || 0.8);
  const basePriceAed = Number(prod.basePriceAed || prod.priceAed || prod.price || 0);

  const cleanVariants = (prod.variants || []).map((v: any) => ({
    id: String(v.id || Math.random().toString(36).substring(2, 8)),
    flavor: String(v.flavor || ''),
    size: String(v.size || ''),
    priceAed: Number(v.priceAed || v.price || v.priceAED || basePriceAed),
    price: Number(v.price || v.priceAed || v.priceAED || basePriceAed),
    priceAED: Number(v.priceAED || v.priceAed || v.price || basePriceAed),
    priceToman: Number(v.priceToman || 0),
    weightKg: parseWeightKg(v.size, Number(v.weightKg) || baseWeight),
    image: v.image || prod.imageUrl || prod.image || '',
    inStock: v.inStock !== false
  }));

  return {
    id: String(prod.id || Date.now()),
    title: primaryTitle,
    titleFa,
    titleEn,
    brand: prod.brand || '',
    category: prod.category || prod.mainCategory || 'مکمل‌های ورزشی',
    mainCategory: prod.mainCategory || prod.category || 'مکمل‌های ورزشی',
    subcategory: prod.subcategory || prod.subCategory || '',
    subCategory: prod.subCategory || prod.subcategory || '',
    caption: prod.caption || '',
    description: prod.description || '',
    image: prod.image || prod.imageUrl || '',
    imageUrl: prod.imageUrl || prod.image || '',
    images: Array.isArray(prod.images) ? prod.images : (prod.image ? [prod.image] : []),
    galleryImages: Array.isArray(prod.galleryImages) ? prod.galleryImages : (prod.image ? [prod.image] : []),
    basePriceAed,
    priceAed: Number(prod.priceAed || basePriceAed),
    originalPriceAed: Number(prod.originalPriceAed || 0),
    weightKg: baseWeight,
    priceToman: Number(prod.priceToman || 0),
    originalPriceToman: Number(prod.originalPriceToman || 0),
    stockQuantity: Number(prod.stockQuantity || 10),
    stockCount: Number(prod.stockCount || prod.stockQuantity || 10),
    url: prod.url || '',
    storeName: prod.storeName || 'فروشگاه دبی',
    inStock: prod.inStock !== false,
    isActive: Boolean(prod.isActive),
    isPopular: Boolean(prod.isPopular),
    isFeatured: Boolean(prod.isFeatured || prod.isPopular),
    allowedFlavors: Array.isArray(prod.allowedFlavors) ? prod.allowedFlavors : (Array.isArray(prod.flavors) ? prod.flavors : []),
    flavors: Array.isArray(prod.flavors) ? prod.flavors : (Array.isArray(prod.allowedFlavors) ? prod.allowedFlavors : []),
    allowedSizes: Array.isArray(prod.allowedSizes) ? prod.allowedSizes : (Array.isArray(prod.sizes) ? prod.sizes : []),
    sizes: Array.isArray(prod.sizes) ? prod.sizes : (Array.isArray(prod.allowedSizes) ? prod.allowedSizes : []),
    variants: cleanVariants,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Direct, isolated, bulletproof Firestore writer for Admin Panels
 */
export async function saveAdminProducts(
  collectionName: 'special_deals' | 'iran_warehouse',
  productsList: any[]
): Promise<void> {
  if (!Array.isArray(productsList)) {
    throw new Error('لیست محصولات نامعتبر است');
  }

  const cleanList: any[] = [];

  for (const item of productsList) {
    if (!item.id) continue;
    const cleanDoc = sanitizePayloadForFirestore(cleanProductForFirestore(item));
    cleanList.push(cleanDoc);
    const docRef = doc(db, collectionName, cleanDoc.id);
    await setDoc(docRef, cleanDoc, { merge: true });
  }

  // Also sync to settings/cms for instant backward compatibility & live reactive App.tsx state
  const cmsKey = collectionName === 'iran_warehouse' ? 'localInventory' : 'deals';
  const cmsRef = doc(db, 'settings', 'cms');
  await setDoc(cmsRef, { [cmsKey]: cleanList, updatedAt: new Date().toISOString() }, { merge: true });
}

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
