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
    '/logo/',
    '_logo.',
    '-logo.',
    'placeholder',
    'default_logo',
    'store_logo',
    'favicon',
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
    const fnameNoExt = filename.replace(/\.[^.]+$/, '');

    if (
      fnameNoExt === 'logo' ||
      fnameNoExt.startsWith('logo_') ||
      fnameNoExt.startsWith('logo-') ||
      fnameNoExt.endsWith('_logo') ||
      fnameNoExt.endsWith('-logo') ||
      fnameNoExt === 'dnp' ||
      fnameNoExt === 'dnp_logo' ||
      fnameNoExt === 'dnp-logo' ||
      fnameNoExt === 'icon' ||
      fnameNoExt.startsWith('icon_') ||
      fnameNoExt.startsWith('icon-') ||
      fnameNoExt.endsWith('_icon') ||
      fnameNoExt.endsWith('-icon') ||
      fnameNoExt.includes('placeholder')
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
export function normalizeProductImageUrl(rawUrl?: string | null, defaultDomain = 'https://drnutrition.com'): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let trimmed = rawUrl.trim().replace(/&amp;/g, '&').replace(/^["']|["']$/g, '').replace(/\\/g, '').trim();
  if (!trimmed) return '';
  
  if (trimmed.startsWith('data:image')) return trimmed;
  if (trimmed.startsWith('//')) {
    trimmed = `https:${trimmed}`;
  }

  let resolvedUrl = '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    resolvedUrl = trimmed.startsWith('http://') ? trimmed.replace('http://', 'https://') : trimmed;
  } else {
    let cleanDomain = (defaultDomain || 'https://drnutrition.com').trim();
    if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
      try {
        cleanDomain = new URL(cleanDomain).origin;
      } catch (_e) {
        cleanDomain = cleanDomain.replace(/\/+$/, '');
      }
    } else {
      cleanDomain = cleanDomain.replace(/\/+$/, '');
      if (!cleanDomain.startsWith('http')) {
        cleanDomain = `https://${cleanDomain}`;
      }
    }

    let cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (cleanPath.startsWith('/catalog/')) {
      cleanPath = `/media${cleanPath}`;
    }

    // If pointing to Dr Nutrition media relative path, map to media CDN
    if (cleanPath.startsWith('/media/') && (cleanDomain.includes('drnutrition.com') || !cleanDomain.startsWith('http'))) {
      resolvedUrl = `https://media.drnutrition.com${cleanPath}`;
    } else {
      resolvedUrl = `${cleanDomain}${cleanPath}`;
    }
  }

  // Syntax validation & CDN query cleanup
  try {
    const parsed = new URL(resolvedUrl);
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
    resolvedUrl = parsed.toString();
  } catch (_urlErr) {
    // Keep resolvedUrl as is
  }

  // Upgrade Shopify/E-Commerce thumbnail images to high-res master
  resolvedUrl = resolvedUrl.replace(/_(?:small|compact|thumb|medium|100x100|150x150|200x200|240x240|300x300)\.(jpe?g|png|webp|avif)/gi, '_1024x1024.$1');

  if (isInvalidProductImage(resolvedUrl)) {
    return '';
  }

  return resolvedUrl;
}

