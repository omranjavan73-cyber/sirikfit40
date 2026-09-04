import { db } from '../config/firebase';
import { doc, getDoc, setDoc, writeBatch, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { sanitizePayloadForFirestore } from '../utils/adminSaveHelper';

export const CMS_SETTINGS_COLLECTION = 'settings';
export const CMS_SETTINGS_DOC = 'cms';

/**
 * Normalizes any product ID by removing prefix variants like 'local-' or 'deal-'.
 */
export function normalizeProductId(id: string | number | undefined | null): string {
  if (!id) return '';
  return String(id).trim().replace(/^(local|deal)-/, '');
}

/**
 * Returns the index of a product ID within the popularOrderArray.
 * Matches normalized IDs as well as raw strings.
 */
export function getPopularIndex(id: string | number | undefined | null, popularOrderArray: string[]): number {
  if (!popularOrderArray || !Array.isArray(popularOrderArray) || popularOrderArray.length === 0) return -1;
  const rawId = normalizeProductId(id);
  if (!rawId) return -1;
  return popularOrderArray.findIndex(entry => normalizeProductId(entry) === rawId);
}

/**
 * Authoritative sorting function for Popular Products.
 * 
 * Rules:
 * 1. Filter: Only items where isPopular or isPopularSample is true, and item is active/published.
 * 2. Deduplicate: Normalize IDs so an item appearing in multiple collections is only rendered once.
 * 3. Primary Sort: Strict index in canonicalOrderIds (from settings/cms popularSamplesOrder).
 * 4. Fallback 1: If not in canonicalOrderIds, check explicit popularOrder property (0 is highest priority).
 * 5. Fallback 2: Newest first based on sectionAddedAt, createdAt, or updatedAt.
 * 6. Fallback 3: Deterministic localeCompare on ID to eliminate any random re-ordering or jitter.
 */
export function sortPopularProducts<T extends { id: string; popularOrder?: number; isPopular?: boolean; createdAt?: string; updatedAt?: string; sectionAddedAt?: string }>(
  items: T[],
  canonicalOrderIds?: string[]
): T[] {
  if (!Array.isArray(items)) return [];

  // 1. Filter active & popular only
  const activePopular = items.filter(item => {
    if (!item || !item.id) return false;
    const isPop = item.isPopular === true || String(item.isPopular) === 'true' || (item as any).isPopularSample === true || String((item as any).isPopularSample) === 'true';
    const isPub = (item as any).isPublished !== false && (item as any).isActive !== false && (item as any).isDraft !== true;
    const titleVal = ((item as any).titleFa || (item as any).title || (item as any).name || '').trim();
    const isGhostOrDummy = !titleVal || titleVal === 'محصول پرطرفدار' || titleVal.toLowerCase() === 'popular product';
    const isExplicitlyDisabled = item.popularOrder !== undefined && item.popularOrder < 0;
    return isPop && isPub && !isGhostOrDummy && !isExplicitlyDisabled;
  });

  // 2. Deduplicate by normalized ID
  const uniqueMap = new Map<string, T>();
  activePopular.forEach(item => {
    const rawId = normalizeProductId(item.id);
    if (!uniqueMap.has(rawId)) {
      uniqueMap.set(rawId, item);
    }
  });
  const uniqueItems = Array.from(uniqueMap.values());

  const cleanOrderIds = Array.isArray(canonicalOrderIds)
    ? canonicalOrderIds.map(normalizeProductId).filter(Boolean)
    : [];

  // 3. Deterministic sort
  return uniqueItems.sort((a, b) => {
    const rawA = normalizeProductId(a.id);
    const rawB = normalizeProductId(b.id);

    const idxA = cleanOrderIds.indexOf(rawA);
    const idxB = cleanOrderIds.indexOf(rawB);

    const inOrderA = idxA !== -1;
    const inOrderB = idxB !== -1;

    // Both are in the canonical saved order array
    if (inOrderA && inOrderB) {
      return idxA - idxB;
    }

    // Item A is in saved manual order; item B is not
    if (inOrderA && !inOrderB) {
      const orderB = typeof b.popularOrder === 'number' && b.popularOrder < 9000 ? b.popularOrder : 9999;
      // If newly added item B was set to popularOrder 0, it takes highest precedence (Requirement 2 & 7)
      if (orderB === 0) return 1;
      return -1;
    }

    // Item B is in saved manual order; item A is not
    if (!inOrderA && inOrderB) {
      const orderA = typeof a.popularOrder === 'number' && a.popularOrder < 9000 ? a.popularOrder : 9999;
      if (orderA === 0) return -1;
      return 1;
    }

    // Neither is in canonicalOrderIds array: check popularOrder property
    const pOrderA = typeof a.popularOrder === 'number' && a.popularOrder < 9000 ? a.popularOrder : 9999;
    const pOrderB = typeof b.popularOrder === 'number' && b.popularOrder < 9000 ? b.popularOrder : 9999;
    if (pOrderA !== pOrderB) {
      return pOrderA - pOrderB;
    }

    // Tertiary: newest first
    const dateA = new Date((a as any).sectionAddedAt || a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date((b as any).sectionAddedAt || b.updatedAt || b.createdAt || 0).getTime();
    if (dateA !== dateB) {
      return dateB - dateA;
    }

    // Deterministic fallback by ID
    return rawA.localeCompare(rawB);
  });
}

/**
 * Fetches the current popular order from Firestore settings/cms
 */
export async function fetchPopularOrderFromFirestore(): Promise<string[]> {
  try {
    if (!db) return [];
    const snap = await getDoc(doc(db, CMS_SETTINGS_COLLECTION, CMS_SETTINGS_DOC));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.popularSamplesOrder)) {
        return data.popularSamplesOrder.map(normalizeProductId).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn('[PopularOrder] Firestore fetch notice:', err);
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('sirikfit_cms_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.popularSamplesOrder)) {
          return parsed.popularSamplesOrder.map(normalizeProductId).filter(Boolean);
        }
      }
    } catch (_e) {}
  }
  return [];
}

/**
 * Persists a manually configured list of popular product IDs to Firestore and local caches.
 * Updates popularSamplesOrder array and sets popularOrder = index on each product document.
 */
export async function saveManualPopularOrder(
  orderedProducts: Array<{ id: string; targetSection?: string; [key: string]: any }>
): Promise<string[]> {
  const cleanIds = orderedProducts.map(p => normalizeProductId(p.id)).filter(Boolean);

  // 1. Update Firestore settings/cms & cms/app
  if (db) {
    try {
      await Promise.all([
        setDoc(doc(db, CMS_SETTINGS_COLLECTION, CMS_SETTINGS_DOC), { popularSamplesOrder: cleanIds }, { merge: true }),
        setDoc(doc(db, 'cms', 'app'), { popularSamplesOrder: cleanIds }, { merge: true })
      ]);
    } catch (err) {
      console.warn('[PopularOrder] Failed to save settings/cms:', err);
    }

    // 2. Batch update product documents with popularOrder = index
    try {
      const batch = writeBatch(db);
      orderedProducts.forEach((prod, index) => {
        const rawId = normalizeProductId(prod.id);
        const isWarehouse = prod.targetSection === 'iran_warehouse' ||
          prod.id.startsWith('local-') ||
          (prod as any).section === 'iran_warehouse' ||
          (prod as any).type === 'local' ||
          (prod as any).category === 'موجودی ایران';
        const colName = isWarehouse ? 'iran_warehouse' : 'special_deals';

        const now = new Date().toISOString();
        // Update in primary collection
        batch.set(doc(db, colName, rawId), {
          popularOrder: index,
          isPopular: true,
          isPopularSample: true,
          isFeatured: true,
          updatedAt: now
        }, { merge: true });

        // Update in global products collection
        batch.set(doc(db, 'products', rawId), {
          popularOrder: index,
          isPopular: true,
          isPopularSample: true,
          isFeatured: true,
          updatedAt: now
        }, { merge: true });
      });

      await batch.commit();
    } catch (batchErr) {
      console.warn('[PopularOrder] Firestore batch commit notice:', batchErr);
    }
  }

  // 3. Update localStorage caches
  if (typeof window !== 'undefined') {
    try {
      const rawCms = localStorage.getItem('sirikfit_cms_config');
      const parsedCms = rawCms ? JSON.parse(rawCms) : {};
      parsedCms.popularSamplesOrder = cleanIds;
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(parsedCms));
      localStorage.setItem('omex_home_cms', JSON.stringify(parsedCms));

      const enriched = orderedProducts.map((p, idx) => ({
        ...p,
        popularOrder: idx,
        isPopular: true,
        isPopularSample: true
      }));
      localStorage.setItem('sirikfit_popular_order', JSON.stringify(enriched));

      // Broadcast events to update Homepage and Admin views instantly
      window.dispatchEvent(new CustomEvent('popularOrderUpdated', { detail: { popularSamplesOrder: cleanIds, products: enriched } }));
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { popularSamplesOrder: cleanIds } }));
      window.dispatchEvent(new Event('storage'));
    } catch (_e) {}
  }

  // 4. Background REST API sync
  try {
    await fetch('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ popularSamplesOrder: cleanIds })
    }).catch(() => {});
  } catch (_e) {}

  return cleanIds;
}

/**
 * Requirement 2 & 7:
 * When adding a product to Popular Products:
 * 1. Read current Popular Products order.
 * 2. Add the new product to the BEGINNING of that order (index 0).
 * 3. Save updated order to database.
 * 4. Refresh/update homepage from saved data.
 */
export async function addPopularProductToBeginning(
  productId: string,
  collectionName?: 'special_deals' | 'iran_warehouse' | 'products'
): Promise<string[]> {
  const rawId = normalizeProductId(productId);
  if (!rawId) return [];

  // 1. Read current order
  const currentOrder = await fetchPopularOrderFromFirestore();
  const cleanExisting = currentOrder.filter(id => normalizeProductId(id) !== rawId);

  // 2. Prepend new product to the beginning
  const newOrder = [rawId, ...cleanExisting];

  // 3. Save updated order to Firestore settings/cms & cms/app
  if (db) {
    try {
      await Promise.all([
        setDoc(doc(db, CMS_SETTINGS_COLLECTION, CMS_SETTINGS_DOC), { popularSamplesOrder: newOrder }, { merge: true }),
        setDoc(doc(db, 'cms', 'app'), { popularSamplesOrder: newOrder }, { merge: true })
      ]);
    } catch (err) {
      console.warn('[PopularOrder] Failed to save updated order on add:', err);
    }

    // Update target product document in Firestore with popularOrder = 0
    try {
      const now = new Date().toISOString();
      const col = collectionName || 'products';
      await Promise.all([
        setDoc(doc(db, col, rawId), {
          isPopular: true,
          isPopularSample: true,
          isFeatured: true,
          popularOrder: 0,
          updatedAt: now
        }, { merge: true }),
        setDoc(doc(db, 'products', rawId), {
          isPopular: true,
          isPopularSample: true,
          isFeatured: true,
          popularOrder: 0,
          updatedAt: now
        }, { merge: true })
      ]);
    } catch (docErr) {
      console.warn('[PopularOrder] Target document update notice:', docErr);
    }
  }

  // 4. Update localStorage and broadcast events
  if (typeof window !== 'undefined') {
    try {
      const rawCms = localStorage.getItem('sirikfit_cms_config');
      const parsedCms = rawCms ? JSON.parse(rawCms) : {};
      parsedCms.popularSamplesOrder = newOrder;
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(parsedCms));
      localStorage.setItem('omex_home_cms', JSON.stringify(parsedCms));

      window.dispatchEvent(new CustomEvent('popularOrderUpdated', { detail: { popularSamplesOrder: newOrder } }));
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { popularSamplesOrder: newOrder } }));
      window.dispatchEvent(new Event('storage'));
    } catch (_e) {}
  }

  return newOrder;
}

/**
 * Removes a product from Popular Products order and updates Firestore.
 */
export async function removePopularProduct(
  productId: string,
  collectionName?: 'special_deals' | 'iran_warehouse' | 'products'
): Promise<string[]> {
  const rawId = normalizeProductId(productId);
  if (!rawId) return [];

  const currentOrder = await fetchPopularOrderFromFirestore();
  const newOrder = currentOrder.filter(id => normalizeProductId(id) !== rawId);

  if (db) {
    try {
      await Promise.all([
        setDoc(doc(db, CMS_SETTINGS_COLLECTION, CMS_SETTINGS_DOC), { popularSamplesOrder: newOrder }, { merge: true }),
        setDoc(doc(db, 'cms', 'app'), { popularSamplesOrder: newOrder }, { merge: true })
      ]);
    } catch (err) {
      console.warn('[PopularOrder] Failed to save updated order on remove:', err);
    }

    try {
      const now = new Date().toISOString();
      const col = collectionName || 'products';
      await Promise.all([
        setDoc(doc(db, col, rawId), {
          isPopular: false,
          isPopularSample: false,
          popularOrder: -1,
          updatedAt: now
        }, { merge: true }),
        setDoc(doc(db, 'products', rawId), {
          isPopular: false,
          isPopularSample: false,
          popularOrder: -1,
          updatedAt: now
        }, { merge: true }),
        setDoc(doc(db, 'special_deals', rawId), {
          isPopular: false,
          isPopularSample: false,
          popularOrder: -1,
          updatedAt: now
        }, { merge: true }).catch(() => {}),
        setDoc(doc(db, 'iran_warehouse', rawId), {
          isPopular: false,
          isPopularSample: false,
          popularOrder: -1,
          updatedAt: now
        }, { merge: true }).catch(() => {})
      ]);
    } catch (docErr) {
      console.warn('[PopularOrder] Target doc remove notice:', docErr);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const rawCms = localStorage.getItem('sirikfit_cms_config');
      const parsedCms = rawCms ? JSON.parse(rawCms) : {};
      parsedCms.popularSamplesOrder = newOrder;
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(parsedCms));
      localStorage.setItem('omex_home_cms', JSON.stringify(parsedCms));

      window.dispatchEvent(new CustomEvent('popularOrderUpdated', { detail: { popularSamplesOrder: newOrder } }));
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { popularSamplesOrder: newOrder } }));
      window.dispatchEvent(new Event('storage'));
    } catch (_e) {}
  }

  return newOrder;
}

/**
 * Helper to determine if a product document in Firestore is corrupted or a hollow ghost
 */
export function isCorruptedOrGhostDocument(data: any): boolean {
  if (!data) return true;
  const tFa = (data.titleFa || '').trim();
  const tEn = (data.titleEn || data.title || '').trim();
  const name = (data.name || '').trim();
  const fullTitle = tFa || tEn || name;

  const isExplicitGhostTitle =
    !fullTitle ||
    fullTitle === 'محصول بدون عنوان' ||
    fullTitle === 'بدون عنوان' ||
    fullTitle === 'محصول پرطرفدار' ||
    fullTitle.toLowerCase() === 'popular product' ||
    fullTitle.toLowerCase() === 'untitled product';

  const hasPrice = Number(data.priceAed || data.price || data.priceToman || data.manualPriceToman || 0) > 0;
  const hasImage = Boolean(data.imageUrl || data.image || (Array.isArray(data.images) && data.images.length > 0));

  if (isExplicitGhostTitle) return true;
  if (!hasPrice && !hasImage && !data.variants?.length) return true;

  return false;
}

/**
 * Scans Firestore collections (products, special_deals, iran_warehouse)
 * for orphan ghost documents or empty dummy items and permanently eradicates them.
 */
export async function cleanupGhostPopularProducts(): Promise<void> {
  if (!db) return;
  try {
    const collectionsToClean = ['products', 'special_deals', 'iran_warehouse'];
    const deletions: Promise<any>[] = [];

    for (const colName of collectionsToClean) {
      try {
        const snap = await getDocs(collection(db, colName));
        snap.forEach((d) => {
          const data = d.data();
          if (isCorruptedOrGhostDocument(data)) {
            console.log(`[PopularService] Eradicating corrupted ghost document in ${colName}:`, d.id);
            deletions.push(deleteDoc(doc(db, colName, d.id)).catch(() => {}));
            // Also cross-delete from products if found in sub-collection
            if (colName !== 'products') {
              deletions.push(deleteDoc(doc(db, 'products', d.id)).catch(() => {}));
            }
          }
        });
      } catch (colErr) {
        console.warn(`[PopularService] Notice while scanning ${colName}:`, colErr);
      }
    }

    if (deletions.length > 0) {
      await Promise.all(deletions);
      console.log(`[PopularService] Successfully purged ${deletions.length} ghost entries.`);
    }
  } catch (err) {
    console.warn('[PopularService] Cleanup ghost products notice:', err);
  }
}

