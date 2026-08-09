import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ۱. تابع ذخیره تنظیمات مالی و نرخ درهم
export const saveFinancialSettings = onRequest({ cors: true }, async (req, res) => {
  try {
    await db.collection('cms').doc('app').set(req.body, { merge: true });
    res.json({ success: true, message: 'تنظیمات مالی با موفقیت ذخیره شد' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'خطا در ذخیره تنظیمات مالی' });
  }
});

// ۲. تابع همگام‌سازی قوانین قیمت‌گذاری
export const syncPricingRules = onRequest({ cors: true }, async (req, res) => {
  try {
    await db.collection('cms').doc('pricing').set(req.body, { merge: true });
    res.json({ success: true, message: 'قوانین قیمت‌گذاری ذخیره شد' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'خطا در ذخیره قوانین قیمت‌گذاری' });
  }
});

// ۳. تابع دریافت آمار بازدیدکنندگان
export const getVisitorStats = onRequest({ cors: true }, async (req, res) => {
  try {
    const snap = await db.collection('stats').doc('visitors').get();
    res.json({ success: true, stats: snap.data() || {} });
  } catch (err) {
    res.json({ success: true, stats: {} });
  }
});

// ۴. تابع دریافت سفارشات مدیریت
export const getAdminOrders = onRequest({ cors: true }, async (req, res) => {
  try {
    const snap = await db.collection('orders').limit(50).get();
    const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, orders });
  } catch (err) {
    res.json({ success: true, orders: [] });
  }
});

// ۵. تابع استخراج لینک محصولات
export const parseLink = onRequest({ timeoutSeconds: 60, cors: true }, async (req, res) => {
  const { url } = req.body || {};
  if (!url) {
    res.status(400).json({ success: false, error: 'URL required' });
    return;
  }
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });
    const html = response.data || '';
    let title = '';
    let priceAed = 0;
    let image = '';

    const titleMatch = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (titleMatch) title = titleMatch[1].trim();

    const priceMatch = html.match(/"price":\s*"?([0-9.]+)"?/i) || html.match(/AED\s*([0-9.]+)/i);
    if (priceMatch) priceAed = parseFloat(priceMatch[1]) || 0;

    const imgMatch = html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (imgMatch) image = imgMatch[1].trim();

    res.json({ success: true, title, priceAed, image });
  } catch (err) {
    res.status(500).json({ success: false, error: 'خطا در دریافت اطلاعات' });
  }
});