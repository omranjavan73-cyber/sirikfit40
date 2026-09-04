/**
 * Universal logo extraction and normalization utility
 * Unifies all possible logo property names across Firestore collections:
 * settings/home, cms/app, settings/cms, settings/general, and LocalStorage
 */

export const extractLogoUrl = (data: any): string => {
  if (!data) return '';
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed && !trimmed.startsWith('blob:') && !trimmed.startsWith('data:image/')) {
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
    if (trimmed && !trimmed.startsWith('blob:') && !trimmed.startsWith('data:image/')) {
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
