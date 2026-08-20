import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface AdminSaveResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Safely parses any value (string, number, undefined) to a clean numeric float.
 * Handles Persian/Arabic digits, commas, currency symbols, etc.
 */
export function safeParseNumeric(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  const str = String(val)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/,/g, '')
    .replace(/[^0-9.-]/g, '')
    .trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Recursively cleans any object or array so that no `undefined` values are ever passed to Firestore.
 * Firestore throws a runtime error if any field in the document is `undefined`.
 */
export function sanitizePayloadForFirestore<T = any>(obj: T): T {
  if (obj === undefined || obj === null) return null as unknown as T;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizePayloadForFirestore(item)) as unknown as T;
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value === undefined) {
      continue; // Omit undefined properties entirely
    }
    if (value !== null && typeof value === 'object') {
      clean[key] = sanitizePayloadForFirestore(value);
    } else {
      clean[key] = value;
    }
  }
  return clean as T;
}

/**
 * Single source of truth for saving all admin panel configuration updates:
 * Financial Settings, AED Rate, CMS Configs, and Feature Toggles.
 *
 * Strict 3-Step Execution Sequence:
 * 1. Synchronous write to LocalStorage (Immediate UI Source of Truth).
 * 2. Synchronous window CustomEvent 'settingsUpdated' dispatch (Instant React Reactivity).
 * 3. Asynchronous Firestore SDK setDoc + Non-blocking REST API calls.
 */
export async function saveAdminSettingsPayload(
  financialSettings?: Record<string, any> | null,
  cmsConfig?: Record<string, any> | null
): Promise<AdminSaveResult> {
  try {
    let extractedAedRate: number | null = null;

    if (financialSettings) {
      const aedVal = safeParseNumeric(financialSettings.aedRate);
      const exVal = safeParseNumeric(financialSettings.exchangeRate);
      const manualVal = safeParseNumeric(financialSettings.manualAedRate);

      if (aedVal > 0) {
        extractedAedRate = aedVal;
      } else if (exVal > 0) {
        extractedAedRate = exVal;
      } else if (manualVal > 0) {
        extractedAedRate = manualVal;
      }
    }

    if (!extractedAedRate && cmsConfig) {
      const cmsRate = safeParseNumeric(
        cmsConfig?.pricingRules?.manualAedRate ||
        cmsConfig?.pricingRules?.aedRate ||
        cmsConfig?.apiConfig?.manualAedRate ||
        cmsConfig?.apiConfig?.aedRate
      );
      if (cmsRate > 0) {
        extractedAedRate = cmsRate;
      }
    }

    // Clean, number-sanitized financial object
    let cleanFinancial: Record<string, any> | null = null;
    if (financialSettings) {
      cleanFinancial = {
        ...financialSettings,
        aedRate: extractedAedRate || safeParseNumeric(financialSettings.aedRate) || 0,
        manualAedRate: extractedAedRate || safeParseNumeric(financialSettings.manualAedRate) || 0,
        cargoRatePerKg: safeParseNumeric(financialSettings.cargoRatePerKg, 35),
        profitMargin: safeParseNumeric(financialSettings.profitMargin, 15),
        minOrderAed: safeParseNumeric(financialSettings.minOrderAed, 200),
        minOrderAmountToman: safeParseNumeric(financialSettings.minOrderAmountToman, 0),
        updatedAt: Date.now()
      };
    }

    // Standardized Feature Config
    let featureConfig: Record<string, boolean> | null = null;
    if (cmsConfig || financialSettings) {
      const explicitReviews = cmsConfig?.showReviewsSection ?? cmsConfig?.showReviews ?? cmsConfig?.showComments ?? cmsConfig?.features?.showReviews ?? cmsConfig?.features?.showComments;
      const explicitStores = cmsConfig?.showStores ?? cmsConfig?.features?.showStores;
      const explicitBreakdown = cmsConfig?.showPriceBreakdown ?? cmsConfig?.showBreakdown ?? cmsConfig?.features?.showBreakdown;
      const explicitInventory = cmsConfig?.showLocalInventory ?? cmsConfig?.features?.showLocalInventory;
      const explicitBanner = cmsConfig?.showAnnouncementBanner ?? cmsConfig?.features?.showAnnouncementBanner;
      const explicitSupport = cmsConfig?.showSupportSection ?? cmsConfig?.homeContent?.showSupportSection ?? cmsConfig?.features?.showSupportSection;
      const explicitPromo = cmsConfig?.showTopPromo ?? cmsConfig?.homeContent?.showTopPromo ?? cmsConfig?.features?.showTopPromo;

      featureConfig = {
        showReviews: explicitReviews !== undefined ? Boolean(explicitReviews) : true,
        showComments: explicitReviews !== undefined ? Boolean(explicitReviews) : true,
        showStores: explicitStores !== undefined ? Boolean(explicitStores) : true,
        showBreakdown: explicitBreakdown !== undefined ? Boolean(explicitBreakdown) : true,
        showLocalInventory: explicitInventory !== undefined ? Boolean(explicitInventory) : true,
        showAnnouncementBanner: explicitBanner !== undefined ? Boolean(explicitBanner) : true,
        showSupportSection: explicitSupport !== undefined ? Boolean(explicitSupport) : true,
        showTopPromo: explicitPromo !== undefined ? Boolean(explicitPromo) : true,
        ...(cmsConfig?.features || {}),
        ...(financialSettings?.features || {})
      };

      if (cmsConfig) {
        const revBool = Boolean(featureConfig.showReviews);
        cmsConfig.features = { ...(cmsConfig.features || {}), ...featureConfig, showReviews: revBool, showComments: revBool };
        cmsConfig.showReviewsSection = revBool;
        cmsConfig.showReviews = revBool;
        cmsConfig.showComments = revBool;
        cmsConfig.showStores = Boolean(featureConfig.showStores);
        cmsConfig.showPriceBreakdown = Boolean(featureConfig.showBreakdown);
        cmsConfig.showBreakdown = Boolean(featureConfig.showBreakdown);
        cmsConfig.showLocalInventory = Boolean(featureConfig.showLocalInventory);
        cmsConfig.showAnnouncementBanner = Boolean(featureConfig.showAnnouncementBanner);
        cmsConfig.showSupportSection = Boolean(featureConfig.showSupportSection);
        cmsConfig.showTopPromo = Boolean(featureConfig.showTopPromo);
      }
    }

    // ---------------------------------------------------------------
    // STEP 1: SYNCHRONOUS LOCALSTORAGE PERSISTENCE (Source of Truth)
    // ---------------------------------------------------------------
    if (typeof window !== 'undefined') {
      if (cleanFinancial) {
        localStorage.setItem('sirikfit_financial_settings', JSON.stringify(cleanFinancial));
        localStorage.setItem('omex_financial_settings', JSON.stringify(cleanFinancial));
      }

      if (extractedAedRate && extractedAedRate > 0) {
        localStorage.setItem('sirikfit_aed_rate', String(extractedAedRate));
      }

      if (featureConfig) {
        localStorage.setItem('sirikfit_features_config', JSON.stringify(featureConfig));
      }

      if (cmsConfig) {
        localStorage.setItem('sirikfit_cms_config', JSON.stringify(cmsConfig));
        localStorage.setItem('omex_home_cms', JSON.stringify(cmsConfig));
      }

      if (cmsConfig?.banners) {
        localStorage.setItem('sirikfit_home_banners', JSON.stringify(cmsConfig.banners));
      }
      if (financialSettings?.gateway) {
        localStorage.setItem('sirikfit_gateway_config', JSON.stringify(financialSettings.gateway));
      }

      // ---------------------------------------------------------------
      // STEP 2: DISPATCH SYNCHRONOUS EVENT (Instant UI / Header Reactivity)
      // ---------------------------------------------------------------
      const eventPayload = {
        financialSettings: cleanFinancial,
        cmsConfig,
        aedRate: extractedAedRate,
        features: featureConfig
      };

      try {
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: eventPayload }));
        window.dispatchEvent(new Event('storage'));
      } catch (evErr) {
        console.warn('Settings event dispatch notice:', evErr);
      }
    }

    // ---------------------------------------------------------------
    // STEP 3: ASYNCHRONOUS FIRESTORE & REST PERSISTENCE
    // ---------------------------------------------------------------
    const firestoreAppPayload: Record<string, any> = {};
    if (cleanFinancial) {
      Object.assign(firestoreAppPayload, cleanFinancial);
    }
    if (extractedAedRate && extractedAedRate > 0) {
      firestoreAppPayload.aedRate = extractedAedRate;
      firestoreAppPayload.manualAedRate = extractedAedRate;
    }
    if (featureConfig) {
      firestoreAppPayload.features = featureConfig;
    }
    if (cmsConfig) {
      const revVal = cmsConfig.showReviewsSection !== undefined
        ? Boolean(cmsConfig.showReviewsSection)
        : (cmsConfig.showComments !== undefined ? Boolean(cmsConfig.showComments) : true);
      firestoreAppPayload.showReviewsSection = revVal;
      firestoreAppPayload.showReviews = revVal;
      firestoreAppPayload.showComments = revVal;
      firestoreAppPayload.showPriceBreakdown = Boolean(cmsConfig.showPriceBreakdown ?? true);
      firestoreAppPayload.showAnnouncementBanner = Boolean(cmsConfig.showAnnouncementBanner ?? true);
      firestoreAppPayload.showLocalInventory = Boolean(cmsConfig.showLocalInventory ?? true);
    }

    const firestorePromises: Promise<any>[] = [];

    if (featureConfig || cmsConfig || cleanFinancial) {
      const revVal = featureConfig?.showReviews !== undefined
        ? Boolean(featureConfig.showReviews)
        : (featureConfig?.showComments !== undefined
          ? Boolean(featureConfig.showComments)
          : (cmsConfig?.showReviewsSection !== undefined
            ? Boolean(cmsConfig?.showReviewsSection)
            : (cmsConfig?.showComments !== undefined ? Boolean(cmsConfig?.showComments) : true)));

      const generalPayload: Record<string, any> = {
        showReviewsSection: revVal,
        showReviews: revVal,
        showComments: revVal,
        showPriceBreakdown: featureConfig?.showBreakdown !== undefined ? Boolean(featureConfig.showBreakdown) : Boolean(cmsConfig?.showPriceBreakdown ?? true),
        showAnnouncementBanner: featureConfig?.showAnnouncementBanner !== undefined ? Boolean(featureConfig.showAnnouncementBanner) : Boolean(cmsConfig?.showAnnouncementBanner ?? true),
        showLocalInventory: featureConfig?.showLocalInventory !== undefined ? Boolean(featureConfig.showLocalInventory) : Boolean(cmsConfig?.showLocalInventory ?? true),
        showTrustBadges: Boolean(cmsConfig?.showTrustBadges ?? cmsConfig?.homeContent?.showTrustBadges ?? true),
        enamadHtml: cmsConfig?.enamadHtml ?? cmsConfig?.homeContent?.enamadHtml ?? '',
        samandehiHtml: cmsConfig?.samandehiHtml ?? cmsConfig?.homeContent?.samandehiHtml ?? '',
        customBadgeImg: cmsConfig?.customBadgeImg ?? cmsConfig?.homeContent?.customBadgeImg ?? '',
        customBadgeLink: cmsConfig?.customBadgeLink ?? cmsConfig?.homeContent?.customBadgeLink ?? '',
        updatedAt: new Date().toISOString()
      };

      if (extractedAedRate && extractedAedRate > 0) {
        generalPayload.aedRate = extractedAedRate;
        generalPayload.manualAedRate = extractedAedRate;
      }

      firestorePromises.push(
        setDoc(doc(db, 'settings', 'general'), sanitizePayloadForFirestore(generalPayload), { merge: true })
      );
    }

    if (Object.keys(firestoreAppPayload).length > 0) {
      const cleanApp = sanitizePayloadForFirestore(firestoreAppPayload);
      firestorePromises.push(
        setDoc(doc(db, 'settings', 'app'), cleanApp, { merge: true }),
        setDoc(doc(db, 'settings', 'financial'), cleanApp, { merge: true })
      );
    }

    if (cmsConfig) {
      firestorePromises.push(
        setDoc(doc(db, 'settings', 'cms'), sanitizePayloadForFirestore(cmsConfig), { merge: true })
      );
    }

    await Promise.all(firestorePromises);

    // Non-blocking REST API background sync
    try {
      const restPayload = {
        aedRate: extractedAedRate,
        financialSettings: cleanFinancial,
        cms: cmsConfig,
        updatedAt: new Date().toISOString()
      };
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizePayloadForFirestore(restPayload))
      }).catch(() => {});
    } catch (_restErr) {}

    return {
      success: true,
      message: 'تنظیمات با موفقیت در دیتابیس و حافظه محلی ذخیره گردید.'
    };
  } catch (err: any) {
    console.error('Error saving admin settings payload:', err);
    return {
      success: false,
      error: err?.message || 'خطا در ذخیره‌سازی اطلاعات در دیتابیس فایربیس'
    };
  }
}
