import { Order, FinancialExpense, ExpenseCategory } from '../types';
import { formatPersianDate } from './formatters';

export const DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbxkoFYmKpjiQzMDDineiDQqeENjNqcKOuUVae7xHGCEYhWHdyqUHHj-_Wk-b6dwBlQz/exec';

/**
 * Resolves the active Google Sheets Webhook URL.
 * Checks localStorage first, then CMS/Settings config, falling back to the default AppScript webhook URL.
 */
export function getGoogleSheetsWebhookUrl(cmsConfig?: any): string {
  if (typeof window !== 'undefined') {
    try {
      const localUrl = localStorage.getItem('sirikfit_google_sheet_webhook_url');
      if (localUrl && localUrl.trim().startsWith('http')) {
        return localUrl.trim();
      }
    } catch (_e) {}
  }

  const cmsUrl =
    cmsConfig?.apiConfig?.googleSheetWebhookUrl ||
    cmsConfig?.apiConfig?.webhookUrl ||
    cmsConfig?.googleSheetWebhookUrl;

  if (cmsUrl && typeof cmsUrl === 'string' && cmsUrl.trim().startsWith('http')) {
    return cmsUrl.trim();
  }

  return DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL;
}

/**
 * Saves the Google Sheets Webhook URL to LocalStorage and dispatches update
 */
export function saveGoogleSheetsWebhookUrl(url: string): void {
  if (typeof window !== 'undefined') {
    try {
      const cleanUrl = (url || '').trim();
      if (cleanUrl) {
        localStorage.setItem('sirikfit_google_sheet_webhook_url', cleanUrl);
      } else {
        localStorage.removeItem('sirikfit_google_sheet_webhook_url');
      }
    } catch (_e) {}
  }
}

export interface OrderSheetPayload {
  targetTab: 'Orders_Log';
  orderId: string;
  persianDate: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  sourceStore: string;
  productTitle: string;
  variantDetails: string;
  sourceUrl: string;
  totalPriceToman: number;
  basePriceAED: number;
  status: string;
  // Compatibility & metadata fields
  timestamp?: string;
  variant?: string;
}

export interface ExpenseSheetPayload {
  targetTab: 'Expenses_Ledger';
  date: string;
  category: string;
  vendor: string;
  amountAED: number;
  amountToman: number;
  invoiceNo: string;
  description: string;
  // Compatibility & metadata fields
  expenseId?: string;
}

const CATEGORY_PERSIAN_MAP: Record<ExpenseCategory | string, string> = {
  CARGO_MONTHLY: 'تسویه کارگو',
  PACKAGING_SUPPLIES: 'بسته‌بندی',
  SUPPLIER_PAYMENT: 'تامین کالا',
  DISCOUNT_REBATE: 'تخفیف و بستانکاری',
  OPERATIONAL_MISC: 'هزینه اداری و متفرقه'
};

/**
 * Maps an Order object to the standardized Orders_Log sheet payload
 */
export function mapOrderToSheetPayload(order: Partial<Order> & Record<string, any>): OrderSheetPayload {
  const isoDate =
    order.createdAtISO ||
    (order.createdAt
      ? typeof order.createdAt === 'number'
        ? new Date(order.createdAt).toISOString()
        : String(order.createdAt)
      : new Date().toISOString());

  const formattedPersian =
    order.persianDate ||
    formatPersianDate(isoDate) ||
    new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());

  const flavor = order.flavor || order.selectedFlavor || '';
  const size = order.size || order.selectedSize || '';
  const variantCombined = flavor && size ? `${flavor} - ${size}` : `${flavor} ${size}`.trim();
  const variantFinal =
    order.variantDetails ||
    variantCombined ||
    order.selectedOption ||
    order.variant ||
    '-';

  const finalPrice =
    order.finalPrice ??
    order.finalPriceToman ??
    order.totalPrice ??
    order.calculatedToman ??
    order.priceToman ??
    0;

  const basePriceAED =
    order.basePriceAED ??
    order.priceAed ??
    order.amountAED ??
    0;

  // Determine readable status string
  let statusStr = order.status;
  if (!statusStr) {
    if (order.shippingStatus && order.paymentStatus) {
      statusStr = `${order.shippingStatus} (${order.paymentStatus})`;
    } else {
      statusStr = order.shippingStatus || order.paymentStatus || 'PENDING';
    }
  }

  const city =
    order.city ||
    order.customerCity ||
    order.province ||
    (order.deliveryAddress ? order.deliveryAddress.split('،')[0].split('-')[0].trim() : '-');

  return {
    targetTab: 'Orders_Log',
    orderId: String(order.id || order.orderNumber || order.orderId || order.trackingCode || `ord-${Date.now()}`),
    persianDate: formattedPersian,
    customerName: order.customerName || order.userName || 'کاربر مهمان',
    customerPhone: order.customerPhone || order.phoneNumber || order.userPhone || '',
    customerCity: city || '-',
    sourceStore: order.sourceStore || order.storeName || 'دبی',
    productTitle: order.productTitle || order.title || 'محصول سفارشی',
    variantDetails: variantFinal,
    variant: variantFinal,
    sourceUrl: order.sourceUrl || order.productUrl || '',
    totalPriceToman: Number(finalPrice) || 0,
    basePriceAED: Number(basePriceAED) || 0,
    status: String(statusStr),
    timestamp: isoDate
  };
}

/**
 * Maps a FinancialExpense object to the standardized Expenses_Ledger sheet payload
 */
export function mapExpenseToSheetPayload(
  expense: Partial<FinancialExpense> & Record<string, any>
): ExpenseSheetPayload {
  const rawCat = expense.category || 'OPERATIONAL_MISC';
  const categoryLabel = CATEGORY_PERSIAN_MAP[rawCat] || rawCat;

  const dateStr =
    expense.date ||
    (expense.createdAt ? String(expense.createdAt).split('T')[0] : new Date().toISOString().split('T')[0]);

  const invoiceNo =
    expense.invoiceNo ||
    expense.referenceNumber ||
    expense.refNumber ||
    expense.id ||
    '-';

  return {
    targetTab: 'Expenses_Ledger',
    date: dateStr,
    category: categoryLabel,
    vendor: expense.vendor || expense.vendorName || 'طرف‌حساب نامشخص',
    amountAED: Number(expense.amountAED ?? expense.amountAed ?? (expense.currency === 'AED' ? expense.amount : 0)),
    amountToman: Number(expense.amountToman ?? (expense.currency === 'TOMAN' ? expense.amount : 0)),
    invoiceNo: String(invoiceNo || '-'),
    description: expense.description || expense.notes || expense.title || '-',
    expenseId: expense.id || `exp-${Date.now()}`
  };
}

/**
 * Dispatches an Order to the Google Sheets Webhook and Server Proxy (Non-blocking)
 */
export async function dispatchOrderToGoogleSheets(
  order: Partial<Order> & Record<string, any>,
  customWebhookUrl?: string
): Promise<boolean> {
  const payload = mapOrderToSheetPayload(order);
  const webhookUrl = customWebhookUrl || getGoogleSheetsWebhookUrl();

  // 1. Dispatch to local server endpoint for server-side execution & reliability
  try {
    fetch('/api/sync-order-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, webhookUrl })
    }).catch(() => {});
  } catch (_e) {}

  // 2. Direct browser fetch with no-cors fallback for AppScript
  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (err) {
      console.warn('Direct Google Sheet Webhook fetch notice:', err);
      return true;
    }
  }

  return false;
}

/**
 * Dispatches an Expense to the Google Sheets Webhook and Server Proxy (Non-blocking)
 */
export async function dispatchExpenseToGoogleSheets(
  expense: Partial<FinancialExpense> & Record<string, any>,
  customWebhookUrl?: string
): Promise<boolean> {
  const payload = mapExpenseToSheetPayload(expense);
  const webhookUrl = customWebhookUrl || getGoogleSheetsWebhookUrl();

  // 1. Server proxy call
  try {
    fetch('/api/sync-order-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, webhookUrl })
    }).catch(() => {});
  } catch (_e) {}

  // 2. Direct browser fetch with no-cors
  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (err) {
      console.warn('Direct Google Sheet Expense Webhook fetch notice:', err);
      return true;
    }
  }

  return false;
}
