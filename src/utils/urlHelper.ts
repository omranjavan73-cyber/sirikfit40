export interface ExtractedUrlResult {
  cleanUrl: string;
  prefixText: string;
  isValid: boolean;
}

/**
 * Universal Intelligent URL & Prefix Text Extractor.
 * Isolates URLs cleanly even when preceded by product names or notes
 * (e.g. "Body Builder Creatine Monohydrate https://drnutrition.com/...").
 */
export function extractUrlAndCaption(rawInput: string): ExtractedUrlResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return { cleanUrl: '', prefixText: '', isValid: false };
  }

  const trimmed = rawInput.trim();
  const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);

  if (!urlMatch || !urlMatch[0]) {
    return { cleanUrl: '', prefixText: trimmed, isValid: false };
  }

  const cleanUrl = urlMatch[0].trim();
  const prefixText = trimmed.slice(0, urlMatch.index).replace(/[:\-–—]+$/, '').trim();

  return {
    cleanUrl,
    prefixText,
    isValid: cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
  };
}

/**
 * Checks if an image URL points to a website logo, placeholder, SVG icon, badge, or invalid asset.
 */
export function isInvalidProductImage(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return true;
  const lower = rawUrl.toLowerCase().trim();

  // Reject SVG and data URLs
  if (lower.startsWith('data:image/svg') || lower.endsWith('.svg') || lower.includes('.svg?')) {
    return true;
  }

  const invalidKeywords = [
    'logo',
    'dnp_logo',
    'dnp-logo',
    'dnp.png',
    'dnp.jpg',
    'dnp.webp',
    'dnp.svg',
    'dnp_header',
    'dnp_icon',
    'og-logo',
    'vector.svg',
    'drnutrition_logo',
    'drnutrition-logo',
    '/media/logo/',
    '/media/logos/',
    '/stores/1/dnp',
    'placeholder',
    'default_logo',
    'store_logo',
    'favicon',
    'badge',
    'banner',
    'header-logo',
    'footer-logo',
    'site-logo',
    'tamara',
    'tabby',
    'payment',
    'visa',
    'mastercard',
    'applepay',
    'pixel',
    '1x1',
    'spacer',
    'blank.gif',
    'spinner',
    'loading'
  ];

  for (const kw of invalidKeywords) {
    if (lower.includes(kw)) {
      return true;
    }
  }

  try {
    const urlObj = new URL(lower.startsWith('http') ? lower : `https://drnutrition.com${lower.startsWith('/') ? '' : '/'}${lower}`);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || '';

    if (
      filename.includes('logo') ||
      filename.includes('dnp') ||
      filename.includes('placeholder') ||
      filename.includes('icon') ||
      filename.includes('badge') ||
      filename.includes('banner')
    ) {
      return true;
    }
  } catch (_e) {}

  return false;
}

/**
 * Centralized Product Thumbnail & Image URL Normalizer.
 * Enforces strict absolute HTTPS URLs, handles protocol-relative and domain-relative paths,
 * strips CDN downscaling params, and upgrades e-commerce thumbnails to high-res master images.
 */
export function normalizeProductImageUrl(rawImg: string | undefined | null, sourceUrl: string = ''): string {
  if (!rawImg || typeof rawImg !== 'string') return '';
  let str = String(rawImg).trim().replace(/&amp;/g, '&').replace(/^["']|["']$/g, '').trim();
  if (!str) return '';

  // 1. Protocol-relative //domain.com/path
  if (str.startsWith('//')) {
    str = 'https:' + str;
  } else if (str.startsWith('/')) {
    // 2. Domain-relative path /media/...
    if (sourceUrl && (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://'))) {
      try {
        const u = new URL(sourceUrl);
        str = `${u.protocol}//${u.host}${str}`;
      } catch (_e) {
        str = 'https://www.drnutrition.com' + str;
      }
    } else {
      str = 'https://www.drnutrition.com' + str;
    }
  } else if (str.startsWith('http://')) {
    str = str.replace('http://', 'https://');
  } else if (!str.startsWith('https://')) {
    // Relative without leading slash
    if (sourceUrl && (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://'))) {
      try {
        const u = new URL(sourceUrl);
        str = `${u.protocol}//${u.host}/${str.replace(/^\/+/, '')}`;
      } catch (_e) {
        str = `https://www.drnutrition.com/${str.replace(/^\/+/, '')}`;
      }
    } else {
      str = `https://www.drnutrition.com/${str.replace(/^\/+/, '')}`;
    }
  }

  str = str.split('"')[0].split("'")[0].split('\\')[0].trim();

  // 3. Syntax validation & CDN query cleanup
  try {
    const parsed = new URL(str);
    if (
      parsed.hostname.includes('drnutrition.com') ||
      parsed.hostname.includes('cdn.shopify.com') ||
      parsed.hostname.includes('sporter.com') ||
      parsed.hostname.includes('lifepharmacy.com')
    ) {
      parsed.searchParams.delete('width');
      parsed.searchParams.delete('height');
      parsed.searchParams.delete('crop');
    }
    str = parsed.toString();
  } catch (_urlErr) {
    return '';
  }

  // 4. Logo / SVG / Placeholder guard
  if (isInvalidProductImage(str)) {
    return '';
  }

  // 5. Upgrade e-commerce thumbnail sizes to high-res (1024x1024 / master)
  str = str.replace(/_(?:small|compact|thumb|medium|100x100|150x150|200x200|240x240|300x300)\.(jpe?g|png|webp|avif)/gi, '_1024x1024.$1');

  return str;
}
