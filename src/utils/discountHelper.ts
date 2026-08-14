import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { db } from '../firebase';
import type { DiscountCode, CartItem } from '../types';
import { safeFetchJson } from './apiHelper';

const LOCAL_STORAGE_KEY = 'sirikfit_discount_codes';

// ===================================================================
// FIRESTORE & LOCAL STORAGE DATA MANAGEMENT
// ===================================================================

export async function fetchDiscountCodesFromFirestore(): Promise<DiscountCode[]> {
  try {
    const snap = await getDocs(collection(db, 'discount_codes'));
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as DiscountCode));
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      }
      return list;
    }
  } catch (err) {
    console.warn('[DiscountHelper] Firestore fetch warning:', err);
  }

  // REST API Fallback
  const res = await safeFetchJson('/api/discount-codes');
  if (res.ok && Array.isArray(res.data)) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(res.data));
    }
    return res.data as DiscountCode[];
  }

  // LocalStorage Fallback
  try {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        return JSON.parse(local) as DiscountCode[];
      }
    }
  } catch (_e) {}

  return [];
}

export async function saveDiscountCodeToFirestore(discount: DiscountCode): Promise<boolean> {
  const codeId = discount.id || 'dc-' + Date.now();
  const payload: DiscountCode = {
    ...discount,
    id: codeId,
    code: discount.code.trim().toUpperCase(),
    usedCount: discount.usedCount || 0,
    isActive: discount.isActive ?? true,
    createdAt: discount.createdAt || Date.now()
  };

  try {
    // 1. Direct write to Firestore collection 'discount_codes'
    await setDoc(doc(db, 'discount_codes', codeId), payload, { merge: true });

    // 2. Sync LocalStorage
    if (typeof window !== 'undefined') {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
      const existing: DiscountCode[] = JSON.parse(existingStr);
      const idx = existing.findIndex(d => d.id === codeId || d.code === payload.code);
      if (idx > -1) {
        existing[idx] = payload;
      } else {
        existing.unshift(payload);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    }

    // 3. Sync REST API background call
    safeFetchJson('/api/discount-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});

    return true;
  } catch (err) {
    console.error('[DiscountHelper] Save error:', err);
    return false;
  }
}

export async function deleteDiscountCodeFromFirestore(codeId: string): Promise<boolean> {
  try {
    // 1. Firestore delete
    await deleteDoc(doc(db, 'discount_codes', codeId));

    // 2. Sync LocalStorage
    if (typeof window !== 'undefined') {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
      const existing: DiscountCode[] = JSON.parse(existingStr);
      const filtered = existing.filter(d => d.id !== codeId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    }

    // 3. REST API delete
    safeFetchJson(`/api/discount-codes/${codeId}`, { method: 'DELETE' }).catch(() => {});

    return true;
  } catch (err) {
    console.error('[DiscountHelper] Delete error:', err);
    return false;
  }
}

// ===================================================================
// VALIDATION & REDEMPTION ENGINE
// ===================================================================

export interface ValidationResult {
  isValid: boolean;
  message: string;
  discountAmountToman: number;
  finalPriceToman: number;
  discountCodeObj?: DiscountCode;
}

export async function validateDiscountCode(
  rawCode: string,
  cartTotalToman: number,
  cachedList?: DiscountCode[],
  cartItems?: CartItem[],
  singleProduct?: any,
  currentSection?: 'IRAN_WAREHOUSE' | 'OFFERS' | 'MAIN'
): Promise<ValidationResult> {
  if (!rawCode || !rawCode.trim()) {
    return {
      isValid: false,
      message: 'لطفاً کد تخفیف را وارد کنید.',
      discountAmountToman: 0,
      finalPriceToman: cartTotalToman
    };
  }

  const cleanCode = rawCode.trim().toUpperCase();

  // Load discount codes from Firestore or cache
  let allCodes: DiscountCode[] = cachedList && cachedList.length > 0 ? cachedList : [];
  if (allCodes.length === 0) {
    allCodes = await fetchDiscountCodesFromFirestore();
  }

  const found = allCodes.find(c => c.code.trim().toUpperCase() === cleanCode);

  if (!found) {
    return {
      isValid: false,
      message: 'کد تخفیف وارد شده معتبر نمی‌باشد.',
      discountAmountToman: 0,
      finalPriceToman: cartTotalToman
    };
  }

  // 1. Active status check
  if (!found.isActive) {
    return {
      isValid: false,
      message: 'این کد تخفیف در حال حاضر غیرفعال شده است.',
      discountAmountToman: 0,
      finalPriceToman: cartTotalToman,
      discountCodeObj: found
    };
  }

  // 2. Expiry Date check
  if (found.expiryDate && found.expiryDate.trim()) {
    const todayStr = new Date().toISOString().split('T')[0];
    const expiryStr = found.expiryDate.split('T')[0];
    if (todayStr > expiryStr) {
      return {
        isValid: false,
        message: 'مهلت استفاده از این کد تخفیف به پایان رسیده است.',
        discountAmountToman: 0,
        finalPriceToman: cartTotalToman,
        discountCodeObj: found
      };
    }
  }

  // 3. Usage Limit check
  if (found.usageLimit && found.usageLimit > 0) {
    if (found.usedCount >= found.usageLimit) {
      return {
        isValid: false,
        message: 'سقف مجاز استفاده از این کد تخفیف به پایان رسیده است.',
        discountAmountToman: 0,
        finalPriceToman: cartTotalToman,
        discountCodeObj: found
      };
    }
  }

  // 4. Minimum Order Criteria check
  if (found.minOrderToman && found.minOrderToman > 0) {
    if (cartTotalToman < found.minOrderToman) {
      const minFormatted = found.minOrderToman.toLocaleString('fa-IR');
      return {
        isValid: false,
        message: `حداقل مبلغ سفارش برای اعمال این کد تخفیف ${minFormatted} تومان می‌باشد.`,
        discountAmountToman: 0,
        finalPriceToman: cartTotalToman,
        discountCodeObj: found
      };
    }
  }

  // 5. Section Scope validation
  let eligibleTotalToman = cartTotalToman;

  const isIranWarehouseItem = (item: CartItem | any): boolean => {
    if (!item) return false;
    return Boolean(
      item.isLocalInventory ||
      item.storeName?.includes('انبار ایران') ||
      item.title?.includes('انبار ایران') ||
      item.url?.includes('stock/') ||
      item.category === 'انبار ایران' ||
      currentSection === 'IRAN_WAREHOUSE'
    );
  };

  const isOfferItem = (item: CartItem | any): boolean => {
    if (!item) return false;
    return Boolean(
      item.isDeal ||
      item.category === 'پیشنهادها' ||
      item.category === 'پیشنهاد ویژه' ||
      (item.originalPriceAed && item.originalPriceAed > item.priceAed) ||
      item.storeName?.includes('پیشنهاد') ||
      currentSection === 'OFFERS'
    );
  };

  if (found.applicableSection && found.applicableSection !== 'ALL') {
    if (found.applicableSection === 'IRAN_WAREHOUSE') {
      if (cartItems && cartItems.length > 0) {
        const matchingItems = cartItems.filter(isIranWarehouseItem);
        if (matchingItems.length === 0) {
          return {
            isValid: false,
            message: 'این کد تخفیف فقط برای محصولات انبار ایران معتبر است.',
            discountAmountToman: 0,
            finalPriceToman: cartTotalToman,
            discountCodeObj: found
          };
        }
        if (matchingItems.length < cartItems.length) {
          const totalAed = cartItems.reduce((acc, i) => acc + (i.priceAed || 0) * (i.quantity || 1), 0);
          const matchingAed = matchingItems.reduce((acc, i) => acc + (i.priceAed || 0) * (i.quantity || 1), 0);
          if (totalAed > 0) {
            eligibleTotalToman = Math.round((matchingAed / totalAed) * cartTotalToman);
          }
        }
      } else if (singleProduct && !isIranWarehouseItem(singleProduct)) {
        return {
          isValid: false,
          message: 'این کد تخفیف فقط برای محصولات انبار ایران معتبر است.',
          discountAmountToman: 0,
          finalPriceToman: cartTotalToman,
          discountCodeObj: found
        };
      } else if (currentSection && currentSection !== 'IRAN_WAREHOUSE') {
        return {
          isValid: false,
          message: 'این کد تخفیف فقط برای محصولات انبار ایران معتبر است.',
          discountAmountToman: 0,
          finalPriceToman: cartTotalToman,
          discountCodeObj: found
        };
      }
    } else if (found.applicableSection === 'OFFERS') {
      if (cartItems && cartItems.length > 0) {
        const matchingItems = cartItems.filter(isOfferItem);
        if (matchingItems.length === 0) {
          return {
            isValid: false,
            message: 'این کد تخفیف فقط برای محصولات بخش پیشنهادها معتبر است.',
            discountAmountToman: 0,
            finalPriceToman: cartTotalToman,
            discountCodeObj: found
          };
        }
        if (matchingItems.length < cartItems.length) {
          const totalAed = cartItems.reduce((acc, i) => acc + (i.priceAed || 0) * (i.quantity || 1), 0);
          const matchingAed = matchingItems.reduce((acc, i) => acc + (i.priceAed || 0) * (i.quantity || 1), 0);
          if (totalAed > 0) {
            eligibleTotalToman = Math.round((matchingAed / totalAed) * cartTotalToman);
          }
        }
      } else if (singleProduct && !isOfferItem(singleProduct)) {
        return {
          isValid: false,
          message: 'این کد تخفیف فقط برای محصولات بخش پیشنهادها معتبر است.',
          discountAmountToman: 0,
          finalPriceToman: cartTotalToman,
          discountCodeObj: found
        };
      } else if (currentSection && currentSection !== 'OFFERS') {
        return {
          isValid: false,
          message: 'این کد تخفیف فقط برای محصولات بخش پیشنهادها معتبر است.',
          discountAmountToman: 0,
          finalPriceToman: cartTotalToman,
          discountCodeObj: found
        };
      }
    }
  }

  // 6. Calculate Discount Amount in Toman
  let calculatedDiscount = 0;

  if (found.type === 'percent') {
    calculatedDiscount = (eligibleTotalToman * (found.value || 0)) / 100;
    // Cap at maxDiscountToman if specified
    if (found.maxDiscountToman && found.maxDiscountToman > 0) {
      calculatedDiscount = Math.min(calculatedDiscount, found.maxDiscountToman);
    }
  } else if (found.type === 'fixed') {
    calculatedDiscount = Math.min(found.value || 0, eligibleTotalToman);
  }

  // Ensure discount doesn't exceed total price
  const finalDiscountToman = Math.round(Math.min(calculatedDiscount, cartTotalToman));
  const finalPriceToman = Math.max(0, Math.round(cartTotalToman - finalDiscountToman));

  return {
    isValid: true,
    message: 'کد تخفیف با موفقیت اعمال شد.',
    discountAmountToman: finalDiscountToman,
    finalPriceToman: finalPriceToman,
    discountCodeObj: found
  };
}

export async function incrementDiscountUsage(codeId: string): Promise<boolean> {
  if (!codeId) return false;

  try {
    // 1. Atomic Firestore increment
    const docRef = doc(db, 'discount_codes', codeId);
    await updateDoc(docRef, {
      usedCount: increment(1)
    });

    // 2. LocalStorage sync
    if (typeof window !== 'undefined') {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
      const existing: DiscountCode[] = JSON.parse(existingStr);
      const idx = existing.findIndex(d => d.id === codeId);
      if (idx > -1) {
        existing[idx].usedCount = (existing[idx].usedCount || 0) + 1;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
      }
    }

    // 3. REST API sync
    safeFetchJson(`/api/discount-codes/${codeId}/increment`, { method: 'POST' }).catch(() => {});

    return true;
  } catch (err) {
    console.warn('[DiscountHelper] Increment usage warning:', err);
    return false;
  }
}
