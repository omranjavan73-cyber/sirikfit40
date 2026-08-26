import axios from 'axios';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (_e) {
    // Already initialized or running in environment with default app
  }
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  topicId?: string;
  updatedAt?: string;
}

export const DEFAULT_TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || '7874987114:AAH_F1sVz8K1v78l_Q_3Q0jT1P5Qe7gK7gM';
export const DEFAULT_TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_CHAT_ID || '117765163';

/**
 * Retrieves the current Telegram configuration from Firestore `settings/telegram_config`,
 * falling back to pre-configured defaults if unconfigured.
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  try {
    const db = admin.firestore();
    const docRef = db.collection('settings').doc('telegram_config');
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data() as Partial<TelegramConfig>;
      return {
        botToken: data.botToken?.trim() || DEFAULT_TELEGRAM_BOT_TOKEN,
        chatId: data.chatId?.trim() || DEFAULT_TELEGRAM_CHAT_ID,
        enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
        topicId: data.topicId?.trim() || undefined,
        updatedAt: data.updatedAt
      };
    }
  } catch (err) {
    console.warn('[Telegram Service] Notice fetching settings/telegram_config from Firestore:', err);
  }

  return {
    botToken: DEFAULT_TELEGRAM_BOT_TOKEN,
    chatId: DEFAULT_TELEGRAM_CHAT_ID,
    enabled: true
  };
}

/**
 * Saves Telegram configuration directly to Firestore `settings/telegram_config`
 */
export async function saveTelegramConfig(config: Partial<TelegramConfig>): Promise<TelegramConfig> {
  const current = await getTelegramConfig();
  const updated: TelegramConfig = {
    botToken: config.botToken !== undefined ? config.botToken.trim() : current.botToken,
    chatId: config.chatId !== undefined ? config.chatId.trim() : current.chatId,
    enabled: config.enabled !== undefined ? Boolean(config.enabled) : current.enabled,
    topicId: config.topicId !== undefined ? config.topicId.trim() : current.topicId,
    updatedAt: new Date().toISOString()
  };

  try {
    const db = admin.firestore();
    await db.collection('settings').doc('telegram_config').set(updated, { merge: true });
  } catch (err) {
    console.warn('[Telegram Service] Failed to save telegram_config to Firestore:', err);
  }

  return updated;
}

/**
 * Formats a Persian Date/Time string
 */
function formatPersianDateString(dateInput?: any): string {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return new Date().toLocaleDateString('fa-IR');
  }
}

/**
 * Formats a rich Markdown message for Telegram order notifications
 */
export function formatOrderTelegramMessage(order: any): string {
  const customerName = order.customerName || order.userName || 'خریدار گرامی';
  const customerPhone = order.phoneNumber || order.customerPhone || order.userPhone || 'ثبت نشده';
  const customerAddress = order.deliveryAddress || order.address || order.city || 'آدرس ثبت نشده';
  const trackingCode = order.trackingCode || order.orderNumber || order.id || `ORD-${Date.now()}`;
  const storeName = order.storeName || order.sourceStore || 'فروشگاه دبی';
  const productTitle = order.productTitle || order.title || 'مکمل سفارشی';
  const variant = order.selectedOption || order.variantDetails || order.flavor || order.size || 'اصلی (پیش‌فرض)';
  const quantity = order.quantity || 1;
  const priceAed = order.priceAed !== undefined ? order.priceAed : (order.amountAED || 0);
  const calculatedToman = order.calculatedToman || order.totalPriceToman || order.totalPrice || order.finalPrice || 0;
  const formattedToman = Number(calculatedToman).toLocaleString('fa-IR');
  const productUrl = order.productUrl || order.sourceUrl || 'https://drnutrition.com';
  const persianDate = formatPersianDateString(order.createdAt || order.createdAtISO);
  const paymentStatus = order.paymentStatus === 'PAID' ? '✅ پرداخت شده (شاپرک)' : (order.paymentStatus || '⏳ در انتظار پرداخت');
  const paymentRefId = order.paymentRefId ? `\n💳 *کد پیگیری پرداخت:* \`${order.paymentRefId}\`` : '';
  const notes = order.notes ? `\n📝 *یادداشت مشتری:* ${order.notes}` : '';

  return `🛍️ *سفارش جدید در سیریک فیت (SIRIK FIT) ثبت شد!*
━━━━━━━━━━━━━━━━━━━━
📌 *کد رهگیری:* \`${trackingCode}\`
📅 *زمان ثبت:* ${persianDate}
📊 *وضعیت مالی:* ${paymentStatus}${paymentRefId}

👤 *مشخصات مشتری:*
• *نام:* ${customerName}
• *شماره تماس:* \`${customerPhone}\`
• *آدرس تحویل:* ${customerAddress}${notes}

📦 *مشخصات کالا:*
• *نام محصول:* ${productTitle}
• *فروشگاه مبدأ:* ${storeName}
• *طعم / سایز / واریانت:* ${variant}
• *تعداد:* ${quantity} عدد
• *قیمت پایه:* ${priceAed} AED
• *مبلغ کل فاکتور:* *${formattedToman} تومان*

🔗 *لینک خرید مستقیم از دبی:*
${productUrl}
━━━━━━━━━━━━━━━━━━━━
🤖 _سیستم اطلاع‌رسانی خودکار هوشمند SIRIK FIT_`;
}

/**
 * Formats a rich Markdown / HTML message for Telegram link discrepancy / health alerts
 */
export interface LinkDiscrepancyAlertPayload {
  sectionName: string; // 'انبار ایران' | 'پیشنهاد ویژه' | 'کاتالوگ عمومی'
  titleFa: string;
  sourceUrl: string;
  statusDescription: string;
}

export function formatLinkDiscrepancyTelegramMessage(payload: LinkDiscrepancyAlertPayload): string {
  const section = payload.sectionName || 'انبار ایران / پیشنهاد ویژه';
  const title = payload.titleFa || 'محصول بدون عنوان';
  const status = payload.statusDescription || 'تغییر وضعیت در مبدأ';
  const url = payload.sourceUrl || '';

  return `⚠️ <b>هشدار تغییر وضعیت لینک در سیریک فیت</b>
📍 بخش: <b>${section}</b>
📦 نام محصول: <b>${title}</b>
🏷️ وضعیت: <code>${status}</code>
🔗 لینک مبدا: ${url}`;
}

/**
 * Sends a Link Discrepancy alert to Telegram (Price drift >5% or Out of Stock)
 */
export async function sendTelegramLinkAlert(
  payload: LinkDiscrepancyAlertPayload
): Promise<{ success: boolean; data?: any; error?: string; reason?: string }> {
  try {
    const text = formatLinkDiscrepancyTelegramMessage(payload);
    return await sendTelegramMessage(text, { parseMode: 'HTML' });
  } catch (err: any) {
    console.error('[Telegram Link Alert Error]:', err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Sends a message to Telegram using Axios with robust error handling and non-blocking semantics.
 */
export async function sendTelegramMessage(
  text: string,
  options?: { botToken?: string; chatId?: string; topicId?: string; parseMode?: string }
): Promise<{ success: boolean; data?: any; error?: string; reason?: string }> {
  try {
    let token = options?.botToken;
    let chat = options?.chatId;
    let topic = options?.topicId;

    if (!token || !chat) {
      const config = await getTelegramConfig();
      if (!config.enabled) {
        console.log('[Telegram Service] Notifications are currently disabled in settings.');
        return { success: false, reason: 'disabled' };
      }
      token = token || config.botToken;
      chat = chat || config.chatId;
      topic = topic || config.topicId;
    }

    if (!token || !chat) {
      console.warn('[Telegram Service] Missing Bot Token or Chat ID.');
      return { success: false, reason: 'missing_credentials' };
    }

    const cleanToken = token.trim();
    const cleanChatId = chat.trim();

    const payload: any = {
      chat_id: cleanChatId,
      text: text,
      parse_mode: options?.parseMode || 'Markdown',
      disable_web_page_preview: false
    };

    if (topic) {
      payload.message_thread_id = Number(topic);
    }

    const endpoint = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

    const response = await axios.post(endpoint, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.ok) {
      return { success: true, data: response.data.result };
    } else {
      return {
        success: false,
        error: response.data?.description || 'Telegram API returned not ok'
      };
    }
  } catch (error: any) {
    const errorMsg = error?.response?.data?.description || error?.message || String(error);
    console.error('[Telegram Service Error]:', errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * High-level function to notify Telegram on order creation / update
 */
export async function sendTelegramOrderNotification(
  order: any
): Promise<{ success: boolean; error?: string; reason?: string }> {
  try {
    if (!order) {
      return { success: false, reason: 'empty_order' };
    }
    const message = formatOrderTelegramMessage(order);
    return await sendTelegramMessage(message);
  } catch (err: any) {
    console.error('[Telegram Order Notification Caught Error]:', err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Test the Telegram Bot connection with custom or stored credentials
 */
export async function testTelegramConnection(
  customConfig?: { botToken?: string; chatId?: string; topicId?: string }
): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
  try {
    const testText = `🧪 *پیام تست اتصال ربات تلگرام SIRIK FIT*
━━━━━━━━━━━━━━━━━━━━
✅ اتصال به سرور تلگرام با موفقیت برقرار شد!
⏱ زمان تست: ${formatPersianDateString()}
🤖 ربات با موفقیت آماده ارسال آنی سفارشات فروشگاه است.
━━━━━━━━━━━━━━━━━━━━`;

    const result = await sendTelegramMessage(testText, {
      botToken: customConfig?.botToken,
      chatId: customConfig?.chatId,
      topicId: customConfig?.topicId
    });

    if (result.success) {
      return {
        success: true,
        message: 'پیام تست با موفقیت به چت / گروه تلگرام ارسال شد.',
        data: result.data
      };
    } else {
      return {
        success: false,
        message: `خطا در ارسال پیام تست تلگرام: ${result.error || result.reason || 'نامشخص'}`,
        error: result.error || result.reason
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `خطای غیرمنتظره در ارسال پیام تست: ${err?.message || err}`,
      error: err?.message || String(err)
    };
  }
}
