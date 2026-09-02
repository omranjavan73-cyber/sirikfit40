import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { sanitizePayloadForFirestore } from '../firebase';
import type { User } from '../types';

/**
 * Robust, unified phone normalizer for Iranian mobile numbers.
 * Converts Persian/Arabic numerals to English digits,
 * strips non-digits (including +98, 0098, 98, spaces, dashes),
 * and produces canonical 11-digit format: 09xxxxxxxxx
 */
export function normalizeCustomerPhone(rawPhone: string | number | null | undefined): string {
  if (rawPhone === null || rawPhone === undefined) return '';
  let str = String(rawPhone).trim();
  if (!str) return '';

  // 1. Convert Persian & Arabic numerals to standard Latin digits
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(persianDigits[i], 'g'), String(i));
    str = str.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }

  // 2. Strip all non-digit characters
  let clean = str.replace(/[^0-9]/g, '');

  // 3. Handle international & national prefix variations
  if (clean.startsWith('0098')) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('98') && clean.length >= 12) {
    clean = '0' + clean.slice(2);
  } else if (clean.startsWith('9') && clean.length === 10) {
    clean = '0' + clean;
  }

  return clean;
}

/**
 * Validates whether the given string is a valid Iranian 11-digit mobile number starting with 09
 */
export function isValidCustomerPhone(rawPhone: string | number | null | undefined): boolean {
  const clean = normalizeCustomerPhone(rawPhone);
  return /^09[0-9]{9}$/.test(clean);
}

export interface CustomerInputData {
  name?: string;
  fullName?: string;
  deliveryAddress?: string;
  fullAddress?: string;
  postalCode?: string;
  email?: string;
}

/**
 * Finds an existing customer account by phone number in the database,
 * or creates a new customer document if none exists.
 * Guarantees ONE CUSTOMER = ONE ACCOUNT with no duplicate accounts.
 */
export async function findOrCreateCustomerByPhone(
  rawPhone: string,
  customerData?: CustomerInputData
): Promise<User | null> {
  const normalizedPhone = normalizeCustomerPhone(rawPhone);
  if (!normalizedPhone || !isValidCustomerPhone(normalizedPhone)) {
    return null;
  }

  const name = (customerData?.name || customerData?.fullName || '').trim();
  const deliveryAddress = (customerData?.deliveryAddress || customerData?.fullAddress || '').trim();
  const postalCode = (customerData?.postalCode || '').trim();
  const email = (customerData?.email || '').trim().toLowerCase();
  const nowIso = new Date().toISOString();

  let existingCustomer: User | null = null;

  // 1. Check Firestore 'users' collection by deterministic ID 'usr-' + normalizedPhone
  if (db) {
    try {
      const deterministicDocRef = doc(db, 'users', `usr-${normalizedPhone}`);
      const directSnap = await getDoc(deterministicDocRef);
      if (directSnap.exists()) {
        existingCustomer = { id: directSnap.id, ...directSnap.data() } as User;
      }
    } catch (_e) {}

    // 2. Lookup by query where phoneNumber == normalizedPhone (for legacy user accounts)
    if (!existingCustomer) {
      try {
        const q = query(collection(db, 'users'), where('phoneNumber', '==', normalizedPhone));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const matchedDoc = qSnap.docs[0];
          existingCustomer = { id: matchedDoc.id, ...matchedDoc.data() } as User;
        }
      } catch (_e) {}
    }
  }

  // 3. Fallback check via server API endpoint
  if (!existingCustomer) {
    try {
      const res = await fetch(`/api/customers/by-phone/${normalizedPhone}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.user) {
          existingCustomer = json.user as User;
        }
      }
    } catch (_e) {}
  }

  // If customer already exists, update profile with any newly provided details
  if (existingCustomer) {
    let hasUpdate = false;
    const updatedCustomer: any = { ...existingCustomer };

    if (name && (!existingCustomer.name || existingCustomer.name === 'کاربر گرامی')) {
      updatedCustomer.name = name;
      hasUpdate = true;
    }
    if (deliveryAddress && !existingCustomer.deliveryAddress) {
      updatedCustomer.deliveryAddress = deliveryAddress;
      hasUpdate = true;
    }
    if (postalCode && !existingCustomer.postalCode) {
      updatedCustomer.postalCode = postalCode;
      hasUpdate = true;
    }
    if (email && !existingCustomer.email) {
      updatedCustomer.email = email;
      hasUpdate = true;
    }

    if (hasUpdate) {
      updatedCustomer.updatedAt = nowIso;
      if (db) {
        try {
          await setDoc(doc(db, 'users', existingCustomer.id), sanitizePayloadForFirestore(updatedCustomer), { merge: true });
        } catch (_e) {}
      }
      // Background sync to server store
      fetch('/api/customers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCustomer)
      }).catch(() => {});
    }

    return updatedCustomer as User;
  }

  // If no customer exists, create a new one with deterministic ID
  const newCustomer: User = {
    id: `usr-${normalizedPhone}`,
    name: name || 'کاربر گرامی',
    phoneNumber: normalizedPhone,
    deliveryAddress: deliveryAddress || undefined,
    postalCode: postalCode || undefined,
    email: email || undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
    role: 'customer'
  };

  if (db) {
    try {
      await setDoc(doc(db, 'users', newCustomer.id), sanitizePayloadForFirestore(newCustomer), { merge: true });
    } catch (err) {
      console.warn('[customerService] Error saving new customer to Firestore:', err);
    }
  }

  // Background sync to server store
  fetch('/api/customers/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newCustomer)
  }).catch(() => {});

  return newCustomer;
}

/**
 * Fetches customer account from persistent database by normalized phone number.
 */
export async function getCustomerByPhone(rawPhone: string): Promise<User | null> {
  const normalizedPhone = normalizeCustomerPhone(rawPhone);
  if (!normalizedPhone) return null;

  if (db) {
    try {
      const directSnap = await getDoc(doc(db, 'users', `usr-${normalizedPhone}`));
      if (directSnap.exists()) {
        return { id: directSnap.id, ...directSnap.data() } as User;
      }

      const q = query(collection(db, 'users'), where('phoneNumber', '==', normalizedPhone));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return { id: qSnap.docs[0].id, ...qSnap.docs[0].data() } as User;
      }
    } catch (_e) {}
  }

  try {
    const res = await fetch(`/api/customers/by-phone/${normalizedPhone}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.user) return json.user as User;
    }
  } catch (_e) {}

  return null;
}
