import { onRequest } from 'firebase-functions/v2/https';

export const parseLink = onRequest({ timeoutSeconds: 60, cors: true }, async (req, res) => {
  const { url } = req.body || {};
  if (!url) {
    res.status(400).json({ success: false, error: 'URL is required' });
    return;
  }

  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
    });

    const html = response.data || '';

    let title = '';
    let priceAed = 0;
    let image = '';

    // ۱. عنوان
    const titleMatch =
      html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<title\b[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].replace(/\| Dr Nutrition.*/i, '').trim();

    // ۲. قیمت (مخصوص Dr Nutrition و بقیه سایت‌ها)
    const priceMatch =
      html.match(/"price":\s*"?([0-9.]+)"?/i) ||
      html.match(/<meta\b[^>]*property=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/data-price=["']([0-9.]+)["']/i) ||
      html.match(/AED\s*([0-9.]+)/i);

    if (priceMatch) {
      priceAed = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;
    }

    // ۳. تصویر
    const imgMatch =
      html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/"image":\s*"([^"]+)"/i);
    if (imgMatch) image = imgMatch[1].trim();

    res.json({
      success: true,
      title,
      priceAed,
      image,
      storeName: url.includes('drnutrition') ? 'Dr Nutrition' : 'فروشگاه دبی',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'خطا در دریافت اطلاعات از لینک',
    });
  }
});