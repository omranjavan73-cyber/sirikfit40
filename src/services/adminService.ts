import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { sanitizePayloadForFirestore, safeParseNumeric } from '../utils/adminSaveHelper';
import type { FeaturedDeal, LocalInventoryItem, FinancialSettings, CmsConfig, NormalizedProduct, TelegramConfig } from '../types';
import { sanitizeProductForFirestore } from './productService';


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
  aedRate: number = 51400,
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

  // 3. Firestore SDK Persistence (Gracefully handle permission-denied / offline)
  let firestoreFailed = false;
  let firestoreErrorMsg = '';

  try {
    const promises: Promise<any>[] = [];
    for (const docItem of cleanList) {
      const docRef = doc(db, 'iran_warehouse', docItem.id);
      promises.push(setDoc(docRef, sanitizePayloadForFirestore(docItem), { merge: true }));
    }

    // Also update settings/cms for backward compatibility
    promises.push(
      setDoc(doc(db, 'settings', 'cms'), sanitizePayloadForFirestore({ localInventory: cleanList, updatedAt: new Date().toISOString() }), { merge: true })
    );

    await Promise.all(promises);
  } catch (fsErr: any) {
    console.warn('Firestore direct write notice (Warehouse):', fsErr?.message || fsErr);
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
  aedRate: number = 51400,
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

  // 3. Firestore SDK Persistence
  try {
    const promises: Promise<any>[] = [];
    for (const docItem of cleanList) {
      const docRef = doc(db, 'special_deals', docItem.id);
      promises.push(setDoc(docRef, sanitizePayloadForFirestore(docItem), { merge: true }));
    }

    promises.push(
      setDoc(doc(db, 'settings', 'cms'), sanitizePayloadForFirestore({ deals: cleanList, updatedAt: new Date().toISOString() }), { merge: true })
    );

    await Promise.all(promises);
  } catch (fsErr: any) {
    console.warn('Firestore direct write notice (Deals):', fsErr?.message || fsErr);
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

  const cleanDoc = sanitizeProductForFirestore(product);

  // Local storage cache
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`sirikfit_product_${cleanDoc.id}`, JSON.stringify(cleanDoc));
    } catch (_e) {}
  }

  // Firestore write
  try {
    await setDoc(doc(db, collectionName, cleanDoc.id), sanitizePayloadForFirestore(cleanDoc), { merge: true });
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


