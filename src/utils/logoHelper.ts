/**
 * Universal logo extraction and normalization utility
 * Unifies all possible logo property names across Firestore collections:
 * settings/home, cms/app, settings/cms, settings/general, and LocalStorage
 */

// Maximum safe size for an inlined Data URL logo (e.g. ~120KB string length), well below Firestore 1MB quota
const MAX_SAFE_DATA_URL_LENGTH = 160000;

export const isValidLogoString = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed) return false;

  // Reject temporary blob URLs as they expire upon page reload
  if (trimmed.startsWith('blob:')) return false;

  // Accept valid lightweight image Data URLs (e.g. data:image/png;base64,...)
  if (trimmed.startsWith('data:image/')) {
    if (trimmed.length > MAX_SAFE_DATA_URL_LENGTH) return false;
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) return false;
    const meta = trimmed.substring(0, commaIndex);
    return meta.includes(';base64');
  }

  // Reject broken non-existent legacy asset URL
  if (trimmed.includes('sirikfit.ir/assets/logo.png') || trimmed === '/assets/logo.png') {
    return false;
  }

  // Accept valid web URLs and local absolute paths (e.g. https://... or /logo.png)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return true;
  }

  return false;
};

export const extractLogoUrl = (data: any): string => {
  if (!data) return '';
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (isValidLogoString(trimmed)) {
      return trimmed;
    }
    return '';
  }

  const candidate =
    data.logoUrl ||
    data.headerLogoUrl ||
    data.logo ||
    data.headerLogo ||
    data.siteLogo ||
    data.homeContent?.logoUrl ||
    data.homeContent?.headerLogoUrl ||
    data.homeContent?.logo ||
    data.homeContent?.headerLogo ||
    data.homeContent?.siteLogo ||
    '';

  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (isValidLogoString(trimmed)) {
      return trimmed;
    }
  }

  return '';
};

/**
 * Returns an object containing all logo alias properties so that writing to Firestore
 * satisfies any consumer reading logoUrl, headerLogoUrl, logo, or headerLogo.
 */
export const normalizeLogoPayload = (logoUrl: string) => {
  const clean = extractLogoUrl(logoUrl);
  return {
    logoUrl: clean,
    headerLogoUrl: clean,
    logo: clean,
    headerLogo: clean
  };
};
