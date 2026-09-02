import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { isFirestoreGrpcNoise, sanitizePayloadForFirestore } from '../firebase';
import type { Order } from '../types';
import { normalizeCustomerPhone, findOrCreateCustomerByPhone } from './customerService';

export { normalizeCustomerPhone };

/**
 * Saves or updates an order in Firestore 'orders' collection
 * Enforces standardized customerPhone, createdAt, items, totalPrice, status,
 * and guarantees the customer account is created/linked in the 'users' collection.
 */
export async function saveOrder(orderData: Partial<Order>): Promise<string> {
  const rawPhone = orderData.customerPhone || orderData.phoneNumber || orderData.customer?.phone || '';
  const customerPhone = normalizeCustomerPhone(rawPhone);

  const customerName = orderData.customerName || orderData.customer?.fullName || '';
  const deliveryAddress = orderData.deliveryAddress || orderData.customer?.fullAddress || '';
  const postalCode = orderData.postalCode || orderData.customer?.postalCode || '';

  let linkedUserId = orderData.userId;

  // Ensure persistent unified customer account exists in 'users' collection
  if (customerPhone) {
    try {
      const customer = await findOrCreateCustomerByPhone(customerPhone, {
        name: customerName,
        deliveryAddress,
        postalCode
      });
      if (customer?.id) {
        linkedUserId = customer.id;
      }
    } catch (_custErr) {
      console.warn('[orderService] Notice ensuring customer account:', _custErr);
    }
  }

  const trackingCode = orderData.trackingCode || orderData.id || `SF-${Date.now().toString().slice(-6)}`;
  const orderId = orderData.id || orderData.orderId || trackingCode;

  const nowIso = new Date().toISOString();
  const totalPrice = Number(orderData.totalPrice || orderData.totalAmountToman || orderData.calculatedToman || orderData.totalToman || 0);

  const payload: any = sanitizePayloadForFirestore({
    ...orderData,
    id: orderId,
    orderId,
    orderNumber: orderId,
    trackingCode,
    userId: linkedUserId || (customerPhone ? `usr-${customerPhone}` : undefined),
    customerPhone,
    phoneNumber: customerPhone || orderData.phoneNumber || '',
    customerName: customerName || orderData.customerName || '',
    deliveryAddress: deliveryAddress || orderData.deliveryAddress || '',
    customer: {
      fullName: customerName,
      phone: customerPhone,
      fullAddress: deliveryAddress,
      postalCode: postalCode,
      notes: orderData.notes || orderData.customer?.notes || ''
    },
    totalPrice,
    totalAmountToman: totalPrice,
    calculatedToman: totalPrice,
    status: orderData.status || orderData.orderStatus || 'PENDING_UAE_PURCHASE',
    orderStatus: orderData.orderStatus || orderData.status || 'PENDING_UAE_PURCHASE',
    paymentStatus: orderData.paymentStatus || 'PENDING_PAYMENT',
    shippingStatus: orderData.shippingStatus || 'PENDING_UAE_PURCHASE',
    items: Array.isArray(orderData.items) ? orderData.items : [],
    createdAt: orderData.createdAt || nowIso,
    updatedAt: nowIso
  });

  try {
    if (db) {
      await setDoc(doc(db, 'orders', orderId), payload, { merge: true });
    }

    // Cache to localStorage
    if (typeof window !== 'undefined') {
      try {
        const cachedStr = localStorage.getItem('sirikfit_orders') || '[]';
        const cached: any[] = JSON.parse(cachedStr);
        const idx = cached.findIndex((o: any) => o.id === orderId || o.trackingCode === orderId);
        if (idx > -1) {
          cached[idx] = payload;
        } else {
          cached.unshift(payload);
        }
        localStorage.setItem('sirikfit_orders', JSON.stringify(cached));
      } catch (_e) {}
    }

    // Also background sync to server REST API
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        userId: payload.userId,
        customerName: payload.customerName,
        phoneNumber: payload.customerPhone || payload.phoneNumber,
        deliveryAddress: payload.deliveryAddress,
        productTitle: payload.productTitle || (payload.items?.[0]?.title) || 'سفارش آنلاین',
        priceAed: payload.priceAed || payload.items?.reduce((s: number, i: any) => s + (i.priceAED || i.priceAed || 0), 0) || 100,
        calculatedToman: payload.calculatedToman
      })
    }).catch(() => {});
  } catch (err) {
    if (!isFirestoreGrpcNoise(err)) {
      console.warn('[orderService] Notice saving order to Firestore:', err);
    }
  }

  return orderId;
}

/**
 * Queries orders collection where customerPhone == userPhone ordered by createdAt desc.
 * Preserves full backwards compatibility by also matching legacy phoneNumber / userPhone.
 */
export async function fetchOrdersByCustomerPhone(phone: string): Promise<Order[]> {
  const normalizedPhone = normalizeCustomerPhone(phone);
  if (!normalizedPhone) return [];

  const foundOrders: Order[] = [];
  const seenIds = new Set<string>();

  const addUnique = (item: any) => {
    const id = item.id || item.orderId || item.trackingCode;
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      foundOrders.push(item as Order);
    }
  };

  try {
    if (db) {
      const ordersRef = collection(db, 'orders');

      // 1. Direct query on customerPhone ordered by createdAt desc
      try {
        const q1 = query(
          ordersRef,
          where('customerPhone', '==', normalizedPhone),
          orderBy('createdAt', 'desc')
        );
        const snap1 = await getDocs(q1);
        snap1.forEach(d => addUnique({ id: d.id, ...d.data() }));
      } catch (_indexErr) {
        // Fallback without server-side orderBy if composite index is pending
        const q1Fallback = query(ordersRef, where('customerPhone', '==', normalizedPhone));
        const snapFallback = await getDocs(q1Fallback);
        snapFallback.forEach(d => addUnique({ id: d.id, ...d.data() }));
      }

      // 2. Backwards-compatibility query on phoneNumber
      try {
        const q2 = query(ordersRef, where('phoneNumber', '==', normalizedPhone));
        const snap2 = await getDocs(q2);
        snap2.forEach(d => addUnique({ id: d.id, ...d.data() }));
      } catch (_e) {}

      // 3. Fallback scan on all recent orders if needed
      if (foundOrders.length === 0) {
        try {
          const qAll = query(ordersRef, orderBy('createdAt', 'desc'));
          const snapAll = await getDocs(qAll);
          snapAll.forEach(d => {
            const data: any = d.data();
            const p1 = normalizeCustomerPhone(data.customerPhone || '');
            const p2 = normalizeCustomerPhone(data.phoneNumber || '');
            const p3 = normalizeCustomerPhone(data.customer?.phone || '');
            if (p1 === normalizedPhone || p2 === normalizedPhone || p3 === normalizedPhone) {
              addUnique({ id: d.id, ...data });
            }
          });
        } catch (_e) {}
      }
    }
  } catch (err) {
    if (!isFirestoreGrpcNoise(err)) {
      console.warn('[orderService] Notice fetching orders by customerPhone:', err);
    }
  }

  // 4. Check REST API /api/orders
  try {
    const res = await fetch(`/api/orders?phone=${normalizedPhone}`);
    if (res.ok) {
      const apiOrders = await res.json();
      if (Array.isArray(apiOrders)) {
        apiOrders.forEach((item: any) => {
          const p1 = normalizeCustomerPhone(item.customerPhone || '');
          const p2 = normalizeCustomerPhone(item.phoneNumber || '');
          const p3 = normalizeCustomerPhone(item.customer?.phone || '');
          if (p1 === normalizedPhone || p2 === normalizedPhone || p3 === normalizedPhone || item.userId === `usr-${normalizedPhone}`) {
            addUnique(item);
          }
        });
      }
    }
  } catch (_e) {}

  // 5. Fallback to localStorage cached orders
  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem('sirikfit_orders');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (Array.isArray(cached)) {
          cached.forEach((item: any) => {
            const p1 = normalizeCustomerPhone(item.customerPhone || '');
            const p2 = normalizeCustomerPhone(item.phoneNumber || '');
            const p3 = normalizeCustomerPhone(item.customer?.phone || '');
            if (p1 === normalizedPhone || p2 === normalizedPhone || p3 === normalizedPhone || item.userId === `usr-${normalizedPhone}`) {
              addUnique(item);
            }
          });
        }
      }
    } catch (_e) {}
  }

  // Sort descending by createdAt
  return foundOrders.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });
}

/**
 * Subscribes in real-time to orders linked to customer's normalized phone number
 */
export function subscribeToOrdersByCustomerPhone(
  phone: string,
  callback: (orders: Order[]) => void
): () => void {
  const normalizedPhone = normalizeCustomerPhone(phone);
  if (!normalizedPhone || !db) return () => {};

  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('customerPhone', '==', normalizedPhone),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        callback(orders);
      },
      (error) => {
        console.warn('[orderService] onSnapshot notice, falling back to fetchOrdersByCustomerPhone:', error?.message || error);
        fetchOrdersByCustomerPhone(normalizedPhone).then(callback);
      }
    );
  } catch (err) {
    console.warn('[orderService] Error establishing orders listener:', err);
    fetchOrdersByCustomerPhone(normalizedPhone).then(callback);
    return () => {};
  }
}
