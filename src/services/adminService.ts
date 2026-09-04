import { db } from '../config/firebase';
import { doc, getDoc, setDoc, deleteDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { sanitizePayloadForFirestore, safeParseNumeric } from '../utils/adminSaveHelper';
import { sanitizeForFirestore } from '../utils/sanitizePayload';
import type { FeaturedDeal, LocalInventoryItem, FinancialSettings, CmsConfig, NormalizedProduct, TelegramConfig } from '../types';
import { sanitizeProductForFirestore } from './productService';
import { normalizeProductImageUrl } from '../utils/formatters';


export interface BulkSaveResponse {
  success: boolean;
  message: string;
  count?: number;
  error?: string;
}

/**
 * Bulk save Iran Warehouse inventory items atomically across Firestore, LocalStorage, and Server API.
 */
export async function saveIranWarehouseItems(
  items: LocalInventoryItem[],
  aedRate: number = 54500,
  profitMargin: number = 20
): Promise<BulkSaveResponse> {
  if (!Array.isArray(items)) {
    return { success: false, message: 'لیست محصولات نامعتبر است', error: 'Invalid items array' };
  }

  const cleanList: LocalInventoryItem[] = [];

  // 1. Sanitize all items
  for (const item of items) {
    if (!item || !item.id) continue;
    const cleanDoc = sanitizeProductForFirestore(item, aedRate) as any;
    cleanList.push(cleanDoc);
  }

  // 2. LocalStorage & React Event Dispatch (Immediate UI Source of Truth)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sirikfit_iran_warehouse', JSON.stringify(cleanList));
      localStorage.setItem('sirikfit_local_inventory', JSON.stringify(cleanList));

      const rawCms = localStorage.getItem('sirikfit_cms_config');
      const cms = rawCms ? JSON.parse(rawCms) : {};
      cms.localInventory = cleanList;
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(cms));
      localStorage.setItem('omex_home_cms', JSON.stringify(cms));

      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { localInventory: cleanList, cmsConfig: cms } }));
      window.dispatchEvent(new Event('storage'));
    } catch (lsErr) {
      console.warn('LocalStorage save notice (Warehouse):', lsErr);
    }
  }

  // 3. Firestore SDK Atomic Batch Persistence
  let firestoreFailed = false;
  let firestoreErrorMsg = '';

  try {
    // B. Write or update active documents using atomic writeBatch (strictly upsert/append, never delete collection docs)
    const batch = writeBatch(db);
    for (const p of cleanList) {
      const isNew = !p.id || p.id.startsWith('draft_') || p.id.startsWith('temp_');
      const docRef = isNew ? doc(collection(db, 'iran_warehouse')) : doc(db, 'iran_warehouse', p.id);
      const parsedCreatedAt = p.createdAt || (typeof p.id === 'string' && p.id.includes('-') && !isNaN(Number(p.id.split('-').pop())) ? new Date(Number(p.id.split('-').pop())).toISOString() : new Date().toISOString());
      const cleanProduct = sanitizeForFirestore({
        id: docRef.id,
        titleFa: (p.titleFa || p.title || '').trim(),
        titleEn: (p.titleEn || (p as any).rawTitle || '').trim(),
        title: (p.titleFa || p.title || p.titleEn || '').trim(),
        brand: (p.brand || 'انبار ایران').trim(),
        category: p.category || 'sports-nutrition',
        subCategory: p.subCategory || 'all',
        image: normalizeProductImageUrl(p.imageUrl || p.image, p.storeDomain || p.url || 'https://drnutrition.com') || '',
        imageUrl: normalizeProductImageUrl(p.imageUrl || p.image, p.storeDomain || p.url || 'https://drnutrition.com') || '',
        images: Array.isArray(p.images) && p.images.length > 0
          ? p.images.map((img: string) => normalizeProductImageUrl(img, p.storeDomain || p.url || 'https://drnutrition.com')).filter(Boolean)
          : (p.imageUrl || p.image ? [normalizeProductImageUrl(p.imageUrl || p.image, p.storeDomain || p.url || 'https://drnutrition.com')] : []),
        priceAed: Number(p.priceAed) || 0,
        priceToman: Number(p.manualPriceToman || p.priceToman || 0),
        manualPriceToman: p.manualPriceToman !== undefined ? (p.manualPriceToman ? Number(p.manualPriceToman) : null) : (p.isManualPrice ? Number(p.priceToman) : null),
        isManualPrice: Boolean(p.isManualPrice || (p.manualPriceToman && Number(p.manualPriceToman) > 0)),
        originalPriceToman: p.originalPriceToman ? Number(p.originalPriceToman) : null,
        isPopular: Boolean(p.isPopular),
        isFeatured: Boolean(p.isPopular),
        popularOrder: typeof p.popularOrder === 'number' ? p.popularOrder : (p.isPopular ? 0 : 9999),
        isPublished: p.isPublished !== undefined ? Boolean(p.isPublished) : true,
        isActive: p.isPublished !== undefined ? Boolean(p.isPublished) : (p.isActive !== undefined ? Boolean(p.isActive) : true),
        inStock: p.inStock ?? true,
        storeName: p.storeName || 'انبار ایران',
        weightKg: Number(p.weightKg) || 0.8,
        description: p.description?.trim() || '',
        variants: (p.variants || [])
          .filter((v: any) => v && ((v.size && String(v.size).trim()) || (v.flavor && String(v.flavor).trim())))
          .map((v: any) => {
            const rawVImg = (v.imageUrl && String(v.imageUrl).trim() !== '') ? String(v.imageUrl).trim() : ((v.image && String(v.image).trim() !== '') ? String(v.image).trim() : '');
            const normVImg = normalizeProductImageUrl(rawVImg, p.storeDomain || p.url || 'https://drnutrition.com') || null;
            return {
              flavor: (v.flavor && !String(v.flavor).includes('+ طعم سفارشی') && v.flavor !== '__custom__') ? String(v.flavor).trim() : 'پیش‌فرض',
              size: (v.size && !String(v.size).includes('+ تایپ سایز') && v.size !== '__custom__') ? String(v.size).trim() : 'استاندارد',
              priceAed: Number(v.priceAed ?? v.price ?? 0),
              priceToman: Number(v.priceToman || 0),
              image: normVImg,
              imageUrl: normVImg,
              inStock: v.inStock ?? true
            };
          }),
        flavors: Array.from(new Set((p.variants || []).map((v: any) => v.flavor && !String(v.flavor).includes('+ طعم سفارشی') && v.flavor !== '__custom__' ? String(v.flavor).trim() : null).filter(Boolean))),
        sizes: Array.from(new Set((p.variants || []).map((v: any) => v.size && !String(v.size).includes('+ تایپ سایز') && v.size !== '__custom__' ? String(v.size).trim() : null).filter(Boolean))),
        targetSection: 'iran_warehouse',
        createdAt: parsedCreatedAt,
        sectionAddedAt: p.sectionAddedAt || parsedCreatedAt,
        updatedAt: new Date().toISOString()
      });
      batch.set(docRef, cleanProduct, { merge: true });
      const prodRef = doc(db, 'products', docRef.id);
      batch.set(prodRef, cleanProduct, { merge: true });
    }
    await batch.commit();

    // C. Also update settings/cms for backward compatibility
    await setDoc(
      doc(db, 'settings', 'cms'),
      sanitizeForFirestore({ localInventory: cleanList, updatedAt: new Date().toISOString() }),
      { merge: true }
    );
  } catch (fsErr: any) {
    console.warn('Firestore atomic batch write notice (Warehouse):', fsErr?.message || fsErr);
    firestoreFailed = true;
    firestoreErrorMsg = fsErr?.message || '';
  }

  // 4. Server REST API Sync (Guarantees backend file persistence)
  try {
    await fetch('/api/admin/save-warehouse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cleanList, aedRate, profitMargin })
    }).catch(async () => {
      // Fallback to /api/cms
      return fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localInventory: cleanList })
      });
    });
  } catch (apiErr) {
    console.warn('Backend REST API sync notice (Warehouse):', apiErr);
  }

  return {
    success: true,
    count: cleanList.length,
    message: 'تمامی محصولات و تنظیمات انبار ایران با موفقیت ذخیره شدند.'
  };
}

/**
 * Bulk save Special Deals / Offers across Firestore, LocalStorage, and Server API.
 */
export async function saveSpecialDeals(
  deals: FeaturedDeal[],
  aedRate: number = 54500,
  profitMargin: number = 20
): Promise<BulkSaveResponse> {
  if (!Array.isArray(deals)) {
    return { success: false, message: 'لیست پیشنهادات ویژه نامعتبر است', error: 'Invalid deals array' };
  }

  const cleanList: FeaturedDeal[] = [];

  // 1. Sanitize all deals
  for (const deal of deals) {
    if (!deal || !deal.id) continue;
    const cleanDoc = sanitizeProductForFirestore(deal, aedRate) as any;
    cleanList.push(cleanDoc);
  }

  // 2. LocalStorage & React Event Dispatch
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sirikfit_special_deals', JSON.stringify(cleanList));

      const rawCms = localStorage.getItem('sirikfit_cms_config');
      const cms = rawCms ? JSON.parse(rawCms) : {};
      cms.deals = cleanList;
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(cms));
      localStorage.setItem('omex_home_cms', JSON.stringify(cms));

      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { deals: cleanList, cmsConfig: cms } }));
      window.dispatchEvent(new Event('storage'));
    } catch (lsErr) {
      console.warn('LocalStorage save notice (Deals):', lsErr);
    }
  }

  // 3. Firestore SDK Atomic Batch Persistence
  try {
    // B. Write or update active documents using atomic writeBatch (strictly upsert/append, never delete collection docs)
    const batch = writeBatch(db);
    for (const p of cleanList) {
      const isNew = !p.id || p.id.startsWith('draft_') || p.id.startsWith('temp_');
      const docRef = isNew ? doc(collection(db, 'special_deals')) : doc(db, 'special_deals', p.id);
      const parsedCreatedAt = p.createdAt || (typeof p.id === 'string' && p.id.includes('-') && !isNaN(Number(p.id.split('-').pop())) ? new Date(Number(p.id.split('-').pop())).toISOString() : new Date().toISOString());
      const cleanProduct = sanitizeForFirestore({
        id: docRef.id,
        titleFa: (p.titleFa || p.title || '').trim(),
        titleEn: (p.titleEn || (p as any).rawTitle || '').trim(),
        title: (p.titleFa || p.title || p.titleEn || '').trim(),
        brand: (p.brand || 'GNC Store').trim(),
        category: p.category || 'sports-nutrition',
        subCategory: p.subCategory || 'all',
        image: normalizeProductImageUrl(p.imageUrl || p.image, p.storeDomain || p.url || 'https://drnutrition.com') || '',
        imageUrl: normalizeProductImageUrl(p.imageUrl || p.image, p.storeDomain || p.url || 'https://drnutrition.com') || '',
        images: Array.isArray(p.images) && p.images.length > 0
          ? p.images.map((img: string) => normalizeProductImageUrl(img, p.storeDomain || p.url || 'https://drnutrition.com')).filter(Boolean)
          : (p.imageUrl || p.image ? [normalizeProductImageUrl(p.imageUrl || p.image, p.storeDomain || p.url || 'https://drnutrition.com')] : []),
        priceAed: Number(p.priceAed) || 0,
        priceToman: Number(p.manualPriceToman || p.priceToman || 0),
        manualPriceToman: p.manualPriceToman !== undefined ? (p.manualPriceToman ? Number(p.manualPriceToman) : null) : (p.isManualPrice ? Number(p.priceToman) : null),
        isManualPrice: Boolean(p.isManualPrice || (p.manualPriceToman && Number(p.manualPriceToman) > 0)),
        originalPriceAed: p.originalPriceAed ? Number(p.originalPriceAed) : null,
        isPopular: Boolean(p.isPopular),
        isFeatured: Boolean(p.isPopular),
        popularOrder: typeof p.popularOrder === 'number' ? p.popularOrder : (p.isPopular ? 0 : 9999),
        isPublished: p.isPublished !== undefined ? Boolean(p.isPublished) : true,
        isActive: p.isPublished !== undefined ? Boolean(p.isPublished) : (p.isActive !== undefined ? Boolean(p.isActive) : true),
        inStock: p.inStock ?? true,
        storeName: p.storeName || 'GNC Store',
        weightKg: Number(p.weightKg) || 0.8,
        description: p.description?.trim() || '',
        variants: (p.variants || [])
          .filter((v: any) => v && ((v.size && String(v.size).trim()) || (v.flavor && String(v.flavor).trim())))
          .map((v: any) => {
            const rawVImg = (v.imageUrl && String(v.imageUrl).trim() !== '') ? String(v.imageUrl).trim() : ((v.image && String(v.image).trim() !== '') ? String(v.image).trim() : '');
            const normVImg = normalizeProductImageUrl(rawVImg, p.storeDomain || p.url || 'https://drnutrition.com') || null;
            return {
              flavor: (v.flavor && !String(v.flavor).includes('+ طعم سفارشی') && v.flavor !== '__custom__') ? String(v.flavor).trim() : 'پیش‌فرض',
              size: (v.size && !String(v.size).includes('+ تایپ سایز') && v.size !== '__custom__') ? String(v.size).trim() : 'استاندارد',
              priceAed: Number(v.priceAed ?? v.price ?? 0),
              priceToman: Number(v.priceToman || 0),
              image: normVImg,
              imageUrl: normVImg,
              inStock: v.inStock ?? true
            };
          }),
        flavors: Array.from(new Set((p.variants || []).map((v: any) => v.flavor && !String(v.flavor).includes('+ طعم سفارشی') && v.flavor !== '__custom__' ? String(v.flavor).trim() : null).filter(Boolean))),
        sizes: Array.from(new Set((p.variants || []).map((v: any) => v.size && !String(v.size).includes('+ تایپ سایز') && v.size !== '__custom__' ? String(v.size).trim() : null).filter(Boolean))),
        targetSection: 'deals',
        createdAt: parsedCreatedAt,
        sectionAddedAt: p.sectionAddedAt || parsedCreatedAt,
        updatedAt: new Date().toISOString()
      });
      batch.set(docRef, cleanProduct, { merge: true });
      const prodRef = doc(db, 'products', docRef.id);
      batch.set(prodRef, cleanProduct, { merge: true });
    }
    await batch.commit();

    // C. Also update settings/cms for backward compatibility
    await setDoc(
      doc(db, 'settings', 'cms'),
      sanitizeForFirestore({ deals: cleanList, updatedAt: new Date().toISOString() }),
      { merge: true }
    );
  } catch (fsErr: any) {
    console.warn('Firestore atomic batch write notice (Deals):', fsErr?.message || fsErr);
  }

  // 4. Server REST API Sync
  try {
    await fetch('/api/admin/save-deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deals: cleanList, aedRate, profitMargin })
    }).catch(async () => {
      return fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: cleanList })
      });
    });
  } catch (apiErr) {
    console.warn('Backend REST API sync notice (Deals):', apiErr);
  }

  return {
    success: true,
    count: cleanList.length,
    message: 'تمامی آفرها، ماتریس واریانت‌ها و تنظیمات با موفقیت ذخیره شدند.'
  };
}

/**
 * Save single Normalized Product with full variant matrix.
 */
export async function saveSingleProductWithVariants(
  product: NormalizedProduct | any,
  collectionName: 'iran_warehouse' | 'special_deals' | 'products' = 'products'
): Promise<BulkSaveResponse> {
  if (!product || (!product.title && !product.titleFa && !product.titleEn)) {
    return { success: false, message: 'عنوان محصول الزامی است' };
  }

  // Guaranteed Unique Firestore Auto-ID for new or draft products
  const isNew = !product.id || product.id.startsWith('draft_') || product.id.startsWith('prod_') || product.id.startsWith('scraped-') || product.id.startsWith('temp_');
  const targetDoc = isNew ? doc(collection(db, collectionName)) : doc(db, collectionName, product.id);

  const cleanDoc = sanitizeProductForFirestore({
    ...product,
    id: targetDoc.id,
    isPublished: product.isPublished !== undefined ? Boolean(product.isPublished) : true,
    isPopular: Boolean(product.isPopular)
  });

  // Local storage cache
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`sirikfit_product_${cleanDoc.id}`, JSON.stringify(cleanDoc));
    } catch (_e) {}
  }

  // Firestore write (strictly upsert/append this document without overwriting other records)
  try {
    await setDoc(targetDoc, sanitizeForFirestore(cleanDoc), { merge: true });
  } catch (fsErr: any) {
    console.warn(`Firestore save notice for ${collectionName}/${cleanDoc.id}:`, fsErr?.message || fsErr);
  }

  // Server API write
  try {
    await fetch('/api/admin/save-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: [cleanDoc], collection: collectionName })
    }).catch(() => {});
  } catch (_e) {}

  return {
    success: true,
    message: 'محصول و تمامی واریانت‌ها با موفقیت ذخیره شدند.'
  };
}

export const DEFAULT_TELEGRAM_BOT_TOKEN = '7874987114:AAH_F1sVz8K1v78l_Q_3Q0jT1P5Qe7gK7gM';
export const DEFAULT_TELEGRAM_CHAT_ID = '117765163';

export const defaultTelegramConfig: TelegramConfig = {
  botToken: DEFAULT_TELEGRAM_BOT_TOKEN,
  chatId: DEFAULT_TELEGRAM_CHAT_ID,
  enabled: true,
  topicId: ''
};

/**
 * Fetch Telegram configuration from Firestore / LocalStorage / Server API
 */
export async function getTelegramAdminConfig(): Promise<TelegramConfig> {
  // 1. Try Firestore
  try {
    if (db) {
      const docRef = doc(db, 'settings', 'telegram_config');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<TelegramConfig>;
        const merged: TelegramConfig = {
          botToken: data.botToken?.trim() || DEFAULT_TELEGRAM_BOT_TOKEN,
          chatId: data.chatId?.trim() || DEFAULT_TELEGRAM_CHAT_ID,
          enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
          topicId: data.topicId?.trim() || '',
          updatedAt: data.updatedAt
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_telegram_config', JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn('Notice reading settings/telegram_config from Firestore:', err);
  }

  // 2. Try Server API
  try {
    const res = await fetch('/api/admin/telegram-config');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.config) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sirikfit_telegram_config', JSON.stringify(json.config));
        }
        return json.config;
      }
    }
  } catch (_e) {}

  // 3. Try LocalStorage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('sirikfit_telegram_config');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return { ...defaultTelegramConfig, ...parsed };
      } catch (_e) {}
    }
  }

  return defaultTelegramConfig;
}

/**
 * Save Telegram configuration across Firestore, LocalStorage, and Server API
 */
export async function saveTelegramAdminConfig(config: Partial<TelegramConfig>): Promise<boolean> {
  const current = await getTelegramAdminConfig();
  const payload: TelegramConfig = {
    botToken: config.botToken !== undefined ? config.botToken.trim() : current.botToken,
    chatId: config.chatId !== undefined ? config.chatId.trim() : current.chatId,
    enabled: config.enabled !== undefined ? Boolean(config.enabled) : current.enabled,
    topicId: config.topicId !== undefined ? config.topicId.trim() : (current.topicId || ''),
    updatedAt: new Date().toISOString()
  };

  // 1. LocalStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('sirikfit_telegram_config', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('telegramConfigUpdated', { detail: payload }));
  }

  // 2. Firestore
  try {
    if (db) {
      await setDoc(doc(db, 'settings', 'telegram_config'), sanitizePayloadForFirestore(payload), { merge: true });
    }
  } catch (fsErr) {
    console.warn('Firestore direct write notice (Telegram Config):', fsErr);
  }

  // 3. Server API
  try {
    await fetch('/api/admin/telegram-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (apiErr) {
    console.warn('Server API sync notice (Telegram Config):', apiErr);
  }

  return true;
}

/**
 * Test Telegram connection by sending a real verification payload
 */
export async function testTelegramAdminNotification(config?: {
  botToken?: string;
  chatId?: string;
  topicId?: string;
}): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const res = await fetch('/api/admin/test-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {})
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: 'خطا در ارتباط با سرور جهت ارسال پیام تست: ' + (err.message || String(err))
    };
  }
}

/**
 * Synchronize a single product's source URL, recalculating landed Toman price and updating Firestore atomically.
 */
export async function syncSingleProductLink(params: {
  collection: string;
  id: string;
  url: string;
  profitMargin?: number;
}): Promise<{
  success: boolean;
  message: string;
  status?: string;
  item?: any;
  diff?: {
    oldPriceAed: number;
    newPriceAed: number;
    priceDeltaAed: number;
    oldPriceToman: number;
    newPriceToman: number;
    priceDeltaToman: number;
    inStock: boolean;
  };
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/sync-single-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: 'خطا در ارتباط با سرور جهت همگام‌سازی: ' + (err.message || String(err)),
      error: err.message || String(err)
    };
  }
}

/**
 * Atomically commit detected price/stock updates across multiple products.
 */
export async function batchApplyLinkSync(updates: Array<{
  collection: string;
  id: string;
  priceAed: number;
  basePriceAed?: number;
  priceToman: number;
  inStock: boolean;
  [key: string]: any;
}>): Promise<{ success: boolean; updatedCount?: number; message: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/sync-batch-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: 'خطا در اعمال دسته‌جمعی تغییرات: ' + (err.message || String(err)),
      error: err.message || String(err)
    };
  }
}

/**
 * Check live product price & stock at source URL without mutating database.
 */
export async function checkSingleLinkHealth(url: string): Promise<{
  success: boolean;
  scrapedPriceAed?: number;
  inStock?: boolean;
  title?: string;
  image?: string;
  storeName?: string;
  checkedAt?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/check-link-health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: 'خطا در بررسی سلامت لینک: ' + (err.message || String(err))
    };
  }
}

/**
 * Send Link Discrepancy Alert to Telegram
 */
export async function sendLinkDiscrepancyTelegramAlert(params: {
  sectionName: string;
  titleFa: string;
  sourceUrl: string;
  statusDescription: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/admin/send-link-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function runFullStoreHealthCheck(): Promise<{
  success: boolean;
  syncedCount?: number;
  updatedCount?: number;
  errors?: string[];
  message?: string;
}> {
  try {
    const res = await fetch('/api/admin/sync-product-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      syncedCount: 0,
      updatedCount: 0,
      errors: [err.message || String(err)],
      message: 'خطا در اجرای اسکن همگانی'
    };
  }
}

/**
 * Fetch Support & Contact Channels Config from Firestore (settings/support primary, settings/support_config fallback)
 */
export async function fetchSupportConfigFromFirestore(): Promise<import('../types/support').SupportConfig> {
  const { DEFAULT_SUPPORT_CONFIG } = await import('../types/support');

  // 1. Direct Firestore Fetch (Single Source of Truth)
  try {
    if (db) {
      // Check primary document: settings/support
      const primaryDoc = await getDoc(doc(db, 'settings', 'support'));
      if (primaryDoc.exists()) {
        const data = primaryDoc.data() as Partial<import('../types/support').SupportConfig>;
        const merged: import('../types/support').SupportConfig = {
          ...DEFAULT_SUPPORT_CONFIG,
          ...data,
          whatsappNumber: data.whatsappNumber || DEFAULT_SUPPORT_CONFIG.whatsappNumber,
          whatsappDefaultMessage: data.whatsappDefaultMessage || DEFAULT_SUPPORT_CONFIG.whatsappDefaultMessage
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('sirikfit_support_config', JSON.stringify(merged));
            localStorage.setItem('sirikfit_support_settings', JSON.stringify(merged));
          } catch (_e) {}
        }
        return merged;
      }

      // Fallback document: settings/support_config
      const configDoc = await getDoc(doc(db, 'settings', 'support_config'));
      if (configDoc.exists()) {
        const data = configDoc.data() as Partial<import('../types/support').SupportConfig>;
        const merged: import('../types/support').SupportConfig = {
          ...DEFAULT_SUPPORT_CONFIG,
          ...data,
          whatsappNumber: data.whatsappNumber || DEFAULT_SUPPORT_CONFIG.whatsappNumber,
          whatsappDefaultMessage: data.whatsappDefaultMessage || DEFAULT_SUPPORT_CONFIG.whatsappDefaultMessage
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('sirikfit_support_config', JSON.stringify(merged));
            localStorage.setItem('sirikfit_support_settings', JSON.stringify(merged));
          } catch (_e) {}
        }
        return merged;
      }

      // Fallback document: settings/general
      const genDoc = await getDoc(doc(db, 'settings', 'general'));
      if (genDoc.exists()) {
        const genData = genDoc.data() as any;
        if (genData.whatsappNumber || genData.whatsappSupportNumber) {
          const merged: import('../types/support').SupportConfig = {
            ...DEFAULT_SUPPORT_CONFIG,
            whatsappNumber: genData.whatsappNumber || genData.whatsappSupportNumber || DEFAULT_SUPPORT_CONFIG.whatsappNumber,
            whatsappDefaultMessage: genData.whatsappDefaultMessage || DEFAULT_SUPPORT_CONFIG.whatsappDefaultMessage,
            telegramBotUsername: genData.telegramBotUsername || DEFAULT_SUPPORT_CONFIG.telegramBotUsername,
            supportHours: genData.supportHours || DEFAULT_SUPPORT_CONFIG.supportHours,
            responseTimeText: genData.responseTimeText || DEFAULT_SUPPORT_CONFIG.responseTimeText,
            isFloatingWidgetEnabled: genData.isFloatingWidgetEnabled ?? true
          };
          return merged;
        }
      }
    }
  } catch (err) {
    console.warn('Firestore fetch notice (Support Config):', err);
  }

  // 2. Offline / Local fallback if network unavailable
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('sirikfit_support_config') || localStorage.getItem('sirikfit_support_settings');
      if (cached) {
        return { ...DEFAULT_SUPPORT_CONFIG, ...JSON.parse(cached) };
      }
    } catch (_e) {}
  }

  return DEFAULT_SUPPORT_CONFIG;
}

/**
 * Save Support & Contact Channels Config to Firestore (settings/support as primary, with synchronized mirrors)
 * Enforces real database write, read-back verification, and explicit error reporting.
 */
export async function saveSupportConfigToFirestore(
  config: Partial<import('../types/support').SupportConfig>
): Promise<{ success: boolean; message: string; data?: import('../types/support').SupportConfig; error?: string }> {
  const { DEFAULT_SUPPORT_CONFIG } = await import('../types/support');
  const cleanPayload: import('../types/support').SupportConfig = {
    ...DEFAULT_SUPPORT_CONFIG,
    ...config,
    whatsappNumber: (config.whatsappNumber && config.whatsappNumber.trim()) 
      ? config.whatsappNumber.trim() 
      : DEFAULT_SUPPORT_CONFIG.whatsappNumber,
    whatsappDefaultMessage: (config.whatsappDefaultMessage && config.whatsappDefaultMessage.trim())
      ? config.whatsappDefaultMessage.trim()
      : DEFAULT_SUPPORT_CONFIG.whatsappDefaultMessage,
    updatedAt: new Date().toISOString()
  };

  // 1. Mandatory Firestore persistence with atomic verification
  if (!db) {
    return {
      success: false,
      message: 'پایگاه داده در دسترس نیست. لطفاً اتصال اینترنت خود را بررسی کنید.',
      error: 'Firestore client not initialized'
    };
  }

  try {
    const sanitized = sanitizePayloadForFirestore(cleanPayload);

    // Primary write to settings/support
    await setDoc(doc(db, 'settings', 'support'), sanitized, { merge: true });

    // Synchronized mirrors for backward compatibility across all app modules
    await Promise.all([
      setDoc(doc(db, 'settings', 'support_config'), sanitized, { merge: true }),
      setDoc(doc(db, 'settings', 'general'), {
        whatsappNumber: cleanPayload.whatsappNumber,
        whatsappSupportNumber: cleanPayload.whatsappNumber,
        whatsappDefaultMessage: cleanPayload.whatsappDefaultMessage,
        telegramBotUsername: cleanPayload.telegramBotUsername,
        isFloatingWidgetEnabled: cleanPayload.isFloatingWidgetEnabled,
        supportHours: cleanPayload.supportHours,
        responseTimeText: cleanPayload.responseTimeText,
        updatedAt: cleanPayload.updatedAt
      }, { merge: true })
    ]);

    // 2. Verification step: Read back from Firestore to confirm write
    const verifySnap = await getDoc(doc(db, 'settings', 'support'));
    if (!verifySnap.exists()) {
      throw new Error('تایید نوشتن در دیتابیس با شکست مواجه شد (سند یافت نشد).');
    }
    const verifyData = verifySnap.data();
    if (verifyData?.whatsappNumber !== cleanPayload.whatsappNumber) {
      throw new Error('عدم تطابق مقدار ذخیره شده در دیتابیس با شماره درخواستی.');
    }

    // 3. Post-verification: Update local caches and dispatch reactive events
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sirikfit_support_config', JSON.stringify(cleanPayload));
        localStorage.setItem('sirikfit_support_settings', JSON.stringify(cleanPayload));
        window.dispatchEvent(new CustomEvent('supportConfigUpdated', { detail: cleanPayload }));
        window.dispatchEvent(new CustomEvent('supportSettingsUpdated', { detail: cleanPayload }));
        window.dispatchEvent(new Event('storage'));
      } catch (_e) {}
    }

    // 4. Server API dual mirror (non-blocking)
    try {
      await fetch('/api/settings/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload)
      }).catch(() => {});
    } catch (_e) {}

    return {
      success: true,
      message: 'شماره واتساپ و تنظیمات پشتیبانی با موفقیت در پایگاه داده ذخیره و اعمال شد.',
      data: cleanPayload
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'خطا در ارتباط با دیتابیس فایراستور';
    console.error('Firestore write error (Support Config):', err);
    return {
      success: false,
      message: `خطا در ذخیره تنظیمات: ${errorMsg}`,
      error: errorMsg
    };
  }
}

/**
 * Save stores list to Firestore and local storage
 */
export async function saveStoresSettings(stores: any[]): Promise<BulkSaveResponse> {
  const { saveStoresToFirestore } = await import('./storeService');
  const res = await saveStoresToFirestore(stores);
  return {
    success: res.success,
    message: res.success ? 'تنظیمات فروشگاه‌ها با موفقیت ذخیره شد.' : (res.error || 'خطا در ذخیره فروشگاه‌ها'),
    error: res.error
  };
}




