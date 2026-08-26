import { getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminDb() {
  try {
    const apps = getApps();
    const app = apps.length === 0 ? initializeApp({ projectId: 'sirikfit40' }) : getApp();
    return getFirestore(app);
  } catch (_e) {
    return null;
  }
}

export interface TicketBracket {
  key: 'small' | 'medium' | 'large';
  label: string;
  minToman: number;
  maxToman?: number;
  orderCount: number;
  totalRevenueToman: number;
  percentageCount: number;
  percentageRevenue: number;
}

export interface CustomerLtvSummary {
  phone: string;
  fullName: string;
  totalSpendToman: number;
  orderCount: number;
  averageOrderValueToman: number;
  firstOrderDate?: string;
  lastOrderDate?: string;
  isVip: boolean;
  preferredBrands: string[];
  preferredCategories: string[];
}

export interface SalesAnalyticsResult {
  totalRevenueToman: number;
  totalOrdersCount: number;
  totalPaidOrdersCount: number;
  totalItemsSoldCount: number;
  averageOrderValueToman: number; // AOV = Total Landed Revenue / Total Paid Orders
  ticketBrackets: TicketBracket[];
  topCustomers: CustomerLtvSummary[];
  vipCustomersCount: number;
  storeBreakdown: Array<{
    storeName: string;
    orderCount: number;
    revenueToman: number;
    percentageRevenue: number;
  }>;
  recentTrends: {
    dailyRevenue: Array<{ date: string; revenueToman: number; orderCount: number }>;
  };
}

export interface AbandonedCartRecord {
  id: string;
  phone: string;
  fullName?: string;
  items: Array<{
    title: string;
    priceToman: number;
    priceAed?: number;
    quantity: number;
    image?: string;
    variant?: string;
  }>;
  totalAmountToman: number;
  status: 'active' | 'abandoned' | 'recovered' | 'reminder_sent';
  createdAt: string;
  updatedAt: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Calculate complete sales analytics, AOV, ticket segmentation, and customer LTV from Firestore orders.
   */
  public async getSalesAnalytics(timeframeDays?: number): Promise<SalesAnalyticsResult> {
    const db = getAdminDb();
    if (!db) {
      return this.getEmptyAnalytics();
    }

    try {
      const ordersSnapshot = await db.collection('orders').get();
      const rawOrders: any[] = [];
      ordersSnapshot.forEach(doc => {
        rawOrders.push({ id: doc.id, ...doc.data() });
      });

      const now = Date.now();
      const cutoffTime = timeframeDays ? now - (timeframeDays * 24 * 60 * 60 * 1000) : 0;

      const filteredOrders = rawOrders.filter(o => {
        if (!cutoffTime) return true;
        const oTime = o.createdAt ? new Date(o.createdAt).getTime() : (o.timestamp || 0);
        return oTime >= cutoffTime;
      });

      // Filter paid / completed orders for revenue metrics
      const paidOrders = filteredOrders.filter(o => 
        o.paymentStatus === 'PAID' || 
        o.status === 'COMPLETED' || 
        o.status === 'SHIPPED' || 
        o.shippingStatus === 'DELIVERED' ||
        o.shippingStatus === 'COMPLETED' ||
        (o.paymentMethod && o.paymentMethod !== 'UNPAID' && o.paymentStatus !== 'FAILED')
      );

      // 1. Core KPIs
      let totalRevenueToman = 0;
      let totalItemsSoldCount = 0;
      const storeMap = new Map<string, { orderCount: number; revenue: number }>();
      const customerMap = new Map<string, {
        fullName: string;
        totalSpend: number;
        orderCount: number;
        orders: any[];
      }>();

      // Ticket Bracket Accumulators
      let smallCount = 0, smallRev = 0;   // < 1,000,000 Toman
      let mediumCount = 0, mediumRev = 0; // 1,000,000 to 3,000,000 Toman
      let largeCount = 0, largeRev = 0;   // > 3,000,000 Toman

      // Daily trend accumulator (last 14 days)
      const dailyTrendMap = new Map<string, { revenueToman: number; orderCount: number }>();

      paidOrders.forEach(order => {
        const amount = Number(order.totalAmountToman || order.calculatedToman || order.totalToman || 0);
        totalRevenueToman += amount;

        // Sum item quantities
        const items = Array.isArray(order.items) ? order.items : [];
        const orderItemQty = items.reduce((sum: number, item: any) => sum + Math.max(1, Number(item.quantity || 1)), 0);
        totalItemsSoldCount += (orderItemQty > 0 ? orderItemQty : 1);

        // Ticket Brackets
        if (amount < 1000000) {
          smallCount++;
          smallRev += amount;
        } else if (amount <= 3000000) {
          mediumCount++;
          mediumRev += amount;
        } else {
          largeCount++;
          largeRev += amount;
        }

        // Store breakdown
        const store = String(order.storeName || order.sourceStore || 'فروشگاه دبی').trim();
        const existingStore = storeMap.get(store) || { orderCount: 0, revenue: 0 };
        existingStore.orderCount++;
        existingStore.revenue += amount;
        storeMap.set(store, existingStore);

        // Customer LTV Map
        const phone = String(order.phoneNumber || order.customer?.phone || order.phone || '').replace(/[^0-9]/g, '');
        const cleanPhone = phone ? (phone.startsWith('98') ? '0' + phone.slice(2) : (phone.startsWith('0') ? phone : '0' + phone)) : order.id;
        const fullName = String(order.customerName || order.customer?.fullName || 'مشتری ناشناس').trim();

        const cust = customerMap.get(cleanPhone) || {
          fullName,
          totalSpend: 0,
          orderCount: 0,
          orders: []
        };
        cust.totalSpend += amount;
        cust.orderCount++;
        cust.orders.push(order);
        if (fullName && fullName !== 'مشتری ناشناس') cust.fullName = fullName;
        customerMap.set(cleanPhone, cust);

        // Date Trends
        const dateStr = order.createdAt ? order.createdAt.split('T')[0] : (new Date(order.timestamp || now).toISOString().split('T')[0]);
        const dayRecord = dailyTrendMap.get(dateStr) || { revenueToman: 0, orderCount: 0 };
        dayRecord.revenueToman += amount;
        dayRecord.orderCount++;
        dailyTrendMap.set(dateStr, dayRecord);
      });

      const totalPaidOrdersCount = paidOrders.length;
      const averageOrderValueToman = totalPaidOrdersCount > 0 ? Math.round(totalRevenueToman / totalPaidOrdersCount) : 0;

      // Calculate Bracket Percentages
      const ticketBrackets: TicketBracket[] = [
        {
          key: 'small',
          label: 'خریدهای خرد (< ۱,۰۰۰,۰۰۰ تومان)',
          minToman: 0,
          maxToman: 1000000,
          orderCount: smallCount,
          totalRevenueToman: smallRev,
          percentageCount: totalPaidOrdersCount > 0 ? Math.round((smallCount / totalPaidOrdersCount) * 100) : 0,
          percentageRevenue: totalRevenueToman > 0 ? Math.round((smallRev / totalRevenueToman) * 100) : 0
        },
        {
          key: 'medium',
          label: 'خریدهای متوسط (۱,۰۰۰,۰۰۰ تا ۳,۰۰۰,۰۰۰ تومان)',
          minToman: 1000000,
          maxToman: 3000000,
          orderCount: mediumCount,
          totalRevenueToman: mediumRev,
          percentageCount: totalPaidOrdersCount > 0 ? Math.round((mediumCount / totalPaidOrdersCount) * 100) : 0,
          percentageRevenue: totalRevenueToman > 0 ? Math.round((mediumRev / totalRevenueToman) * 100) : 0
        },
        {
          key: 'large',
          label: 'خریدهای درشت (> ۳,۰۰۰,۰۰۰ تومان)',
          minToman: 3000000,
          orderCount: largeCount,
          totalRevenueToman: largeRev,
          percentageCount: totalPaidOrdersCount > 0 ? Math.round((largeCount / totalPaidOrdersCount) * 100) : 0,
          percentageRevenue: totalRevenueToman > 0 ? Math.round((largeRev / totalRevenueToman) * 100) : 0
        }
      ];

      // Customer LTV List
      const customerSummaries: CustomerLtvSummary[] = [];
      let vipCount = 0;

      customerMap.forEach((data, phone) => {
        const isVip = data.totalSpend >= 10000000 || data.orderCount >= 3;
        if (isVip) vipCount++;

        const brandsSet = new Set<string>();
        const categoriesSet = new Set<string>();

        data.orders.forEach(o => {
          if (o.storeName) brandsSet.add(o.storeName);
          const items = Array.isArray(o.items) ? o.items : [];
          items.forEach((it: any) => {
            if (it.brand) brandsSet.add(it.brand);
            if (it.category) categoriesSet.add(it.category);
          });
        });

        // Sorted order timestamps
        const sortedTimes = data.orders
          .map(o => o.createdAt || (o.timestamp ? new Date(o.timestamp).toISOString() : ''))
          .filter(Boolean)
          .sort();

        customerSummaries.push({
          phone,
          fullName: data.fullName,
          totalSpendToman: data.totalSpend,
          orderCount: data.orderCount,
          averageOrderValueToman: Math.round(data.totalSpend / data.orderCount),
          firstOrderDate: sortedTimes[0] || undefined,
          lastOrderDate: sortedTimes[sortedTimes.length - 1] || undefined,
          isVip,
          preferredBrands: Array.from(brandsSet).slice(0, 3),
          preferredCategories: Array.from(categoriesSet).slice(0, 3)
        });
      });

      // Sort top customers by total spend descending
      customerSummaries.sort((a, b) => b.totalSpendToman - a.totalSpendToman);

      // Store Breakdown
      const storeBreakdown = Array.from(storeMap.entries()).map(([storeName, stats]) => ({
        storeName,
        orderCount: stats.orderCount,
        revenueToman: stats.revenue,
        percentageRevenue: totalRevenueToman > 0 ? Math.round((stats.revenue / totalRevenueToman) * 100) : 0
      })).sort((a, b) => b.revenueToman - a.revenueToman);

      // Daily Trends (sorted)
      const dailyRevenue = Array.from(dailyTrendMap.entries())
        .map(([date, d]) => ({ date, ...d }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14);

      return {
        totalRevenueToman,
        totalOrdersCount: filteredOrders.length,
        totalPaidOrdersCount,
        totalItemsSoldCount,
        averageOrderValueToman,
        ticketBrackets,
        topCustomers: customerSummaries.slice(0, 50),
        vipCustomersCount: vipCount,
        storeBreakdown,
        recentTrends: { dailyRevenue }
      };
    } catch (err) {
      console.error('[AnalyticsService] Error calculating analytics:', err);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Fetch and evaluate abandoned carts from Firestore.
   * If a cart is active and hasn't been updated for > 30 minutes, it is flagged as 'abandoned'.
   */
  public async getAbandonedCarts(): Promise<{
    carts: AbandonedCartRecord[];
    stats: {
      totalCarts: number;
      activeCount: number;
      abandonedCount: number;
      recoveredCount: number;
      reminderSentCount: number;
      totalLostRevenueToman: number;
      recoveryRatePercent: number;
    };
  }> {
    const db = getAdminDb();
    if (!db) {
      return {
        carts: [],
        stats: {
          totalCarts: 0,
          activeCount: 0,
          abandonedCount: 0,
          recoveredCount: 0,
          reminderSentCount: 0,
          totalLostRevenueToman: 0,
          recoveryRatePercent: 0
        }
      };
    }

    try {
      const snap = await db.collection('abandoned_carts').orderBy('updatedAt', 'desc').limit(200).get();
      const rawCarts: AbandonedCartRecord[] = [];
      const now = Date.now();
      const THIRTY_MINUTES_MS = 30 * 60 * 1000;

      let activeCount = 0;
      let abandonedCount = 0;
      let recoveredCount = 0;
      let reminderSentCount = 0;
      let totalLostRevenueToman = 0;

      snap.forEach(doc => {
        const data = doc.data() as any;
        const updatedTime = data.updatedAt ? new Date(data.updatedAt).getTime() : (data.createdAt ? new Date(data.createdAt).getTime() : now);
        let status = data.status || 'active';

        // Auto-transition to abandoned if inactive for > 30 minutes without checkout
        if (status === 'active' && (now - updatedTime > THIRTY_MINUTES_MS)) {
          status = 'abandoned';
        }

        const totalAmount = Number(data.totalAmountToman || data.totalAmount || 0);

        if (status === 'active') activeCount++;
        else if (status === 'abandoned') {
          abandonedCount++;
          totalLostRevenueToman += totalAmount;
        } else if (status === 'recovered') recoveredCount++;
        else if (status === 'reminder_sent') {
          reminderSentCount++;
          totalLostRevenueToman += totalAmount;
        }

        rawCarts.push({
          id: doc.id,
          phone: data.phone || '',
          fullName: data.fullName || data.customerName || 'کاربر مهمان',
          items: Array.isArray(data.items) ? data.items : [],
          totalAmountToman: totalAmount,
          status,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          lastReminderSentAt: data.lastReminderSentAt || undefined,
          reminderCount: Number(data.reminderCount || 0)
        });
      });

      const totalCarts = rawCarts.length;
      const recoveryRatePercent = totalCarts > 0 ? Math.round((recoveredCount / totalCarts) * 100) : 0;

      return {
        carts: rawCarts,
        stats: {
          totalCarts,
          activeCount,
          abandonedCount,
          recoveredCount,
          reminderSentCount,
          totalLostRevenueToman,
          recoveryRatePercent
        }
      };
    } catch (err) {
      console.error('[AnalyticsService] Error fetching abandoned carts:', err);
      return {
        carts: [],
        stats: {
          totalCarts: 0,
          activeCount: 0,
          abandonedCount: 0,
          recoveredCount: 0,
          reminderSentCount: 0,
          totalLostRevenueToman: 0,
          recoveryRatePercent: 0
        }
      };
    }
  }

  /**
   * Sync active user cart state to Firestore.
   */
  public async syncUserCart(payload: {
    cartId?: string;
    phone: string;
    fullName?: string;
    items: any[];
    totalAmountToman: number;
  }): Promise<{ success: boolean; cartId: string }> {
    const db = getAdminDb();
    if (!db || !payload.phone) return { success: false, cartId: '' };

    try {
      const cleanPhone = String(payload.phone).replace(/[^0-9]/g, '');
      const standardPhone = cleanPhone.startsWith('98') ? '0' + cleanPhone.slice(2) : (cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone);
      const cartId = payload.cartId || `cart_${standardPhone}`;

      const cartRef = db.collection('abandoned_carts').doc(cartId);
      const existing = await cartRef.get();
      const nowIso = new Date().toISOString();

      const itemsSummary = (payload.items || []).map((i: any) => ({
        title: i.title || i.name || 'محصول سیریک فیت',
        priceToman: Number(i.priceToman || i.price || 0),
        priceAed: Number(i.priceAed || i.priceAED || 0),
        quantity: Number(i.quantity || 1),
        image: i.image || i.imageUrl || '',
        variant: i.variant || i.selectedSize || i.selectedFlavor || ''
      }));

      if (existing.exists) {
        const exData = existing.data() as any;
        // If already recovered, only reset if user adds new items later
        const newStatus = exData.status === 'recovered' ? 'active' : (exData.status || 'active');
        await cartRef.update({
          phone: standardPhone,
          fullName: payload.fullName || exData.fullName || 'کاربر مهمان',
          items: itemsSummary,
          totalAmountToman: payload.totalAmountToman,
          status: newStatus,
          updatedAt: nowIso
        });
      } else {
        await cartRef.set({
          id: cartId,
          phone: standardPhone,
          fullName: payload.fullName || 'کاربر مهمان',
          items: itemsSummary,
          totalAmountToman: payload.totalAmountToman,
          status: 'active',
          createdAt: nowIso,
          updatedAt: nowIso,
          reminderCount: 0
        });
      }

      return { success: true, cartId };
    } catch (err) {
      console.error('[AnalyticsService] Error syncing user cart:', err);
      return { success: false, cartId: '' };
    }
  }

  /**
   * Mark an abandoned cart as recovered upon order payment completion.
   */
  public async markCartRecovered(phone: string): Promise<boolean> {
    const db = getAdminDb();
    if (!db || !phone) return false;

    try {
      const cleanPhone = String(phone).replace(/[^0-9]/g, '');
      const standardPhone = cleanPhone.startsWith('98') ? '0' + cleanPhone.slice(2) : (cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone);
      const cartId = `cart_${standardPhone}`;

      const cartRef = db.collection('abandoned_carts').doc(cartId);
      const docSnap = await cartRef.get();
      if (docSnap.exists) {
        await cartRef.update({
          status: 'recovered',
          updatedAt: new Date().toISOString(),
          recoveredAt: new Date().toISOString()
        });
        return true;
      }
    } catch (err) {
      console.error('[AnalyticsService] Error marking cart recovered:', err);
    }
    return false;
  }

  private getEmptyAnalytics(): SalesAnalyticsResult {
    return {
      totalRevenueToman: 0,
      totalOrdersCount: 0,
      totalPaidOrdersCount: 0,
      totalItemsSoldCount: 0,
      averageOrderValueToman: 0,
      ticketBrackets: [
        { key: 'small', label: 'خریدهای خرد (< ۱,۰۰۰,۰۰۰ تومان)', minToman: 0, maxToman: 1000000, orderCount: 0, totalRevenueToman: 0, percentageCount: 0, percentageRevenue: 0 },
        { key: 'medium', label: 'خریدهای متوسط (۱,۰۰۰,۰۰۰ تا ۳,۰۰۰,۰۰۰ تومان)', minToman: 1000000, maxToman: 3000000, orderCount: 0, totalRevenueToman: 0, percentageCount: 0, percentageRevenue: 0 },
        { key: 'large', label: 'خریدهای درشت (> ۳,۰۰۰,۰۰۰ تومان)', minToman: 3000000, orderCount: 0, totalRevenueToman: 0, percentageCount: 0, percentageRevenue: 0 }
      ],
      topCustomers: [],
      vipCustomersCount: 0,
      storeBreakdown: [],
      recentTrends: { dailyRevenue: [] }
    };
  }
}

export const analyticsService = AnalyticsService.getInstance();
