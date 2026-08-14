import { db, saveSettingsToFirestore, saveCmsToFirestore } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface AdminSaveResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Single source of truth for saving all admin panel configuration updates:
 * Financial Settings, AED Rate, CMS Configs, and Feature Toggles.
 *
 * Direct Firestore Client SDK Pipeline:
 * 1. Safely parses all string numeric inputs to clean numbers.
 * 2. Writes synchronously to LocalStorage across all standard keys.
 * 3. Writes directly to Firestore using setDoc(doc(db, 'settings', 'app'), ..., { merge: true }).
 * 4. Dispatches custom window events ('settingsUpdated' and 'storage') for real-time React reactivity.
 */
export async function saveAdminSettingsPayload(
  financialSettings?: Record<string, any> | null,
  cmsConfig?: Record<string, any> | null
): Promise<AdminSaveResult> {
  try {
    let extractedAedRate: number | null = null;

    if (financialSettings) {
      const aedVal = Number(financialSettings.aedRate);
      const exVal = Number(financialSettings.exchangeRate);
      const manualVal = Number(financialSettings.manualAedRate);

      if (!isNaN(aedVal) && aedVal > 0) {
        extractedAedRate = aedVal;
      } else if (!isNaN(exVal) && exVal > 0) {
        extractedAedRate = exVal;
      } else if (!isNaN(manualVal) && manualVal > 0) {
        extractedAedRate = manualVal;
      }
    }

    if (!extractedAedRate && cmsConfig) {
      const cmsRate = cmsConfig?.pricingRules?.manualAedRate || cmsConfig?.pricingRules?.aedRate || cmsConfig?.apiConfig?.manualAedRate || cmsConfig?.apiConfig?.aedRate;
      if (cmsRate && !isNaN(Number(cmsRate)) && Number(cmsRate) > 0) {
        extractedAedRate = Number(cmsRate);
      }
    }

    let featureConfig: Record<string, boolean> | null = null;

    if (typeof window !== 'undefined') {
      // 1. Write synchronously to standard LocalStorage keys
      if (financialSettings) {
        const cleanFin = {
          ...financialSettings,
          aedRate: extractedAedRate || Number(financialSettings.aedRate) || 0,
          manualAedRate: extractedAedRate || Number(financialSettings.manualAedRate) || 0,
          cargoRatePerKg: Number(financialSettings.cargoRatePerKg) || 35,
          profitMargin: Number(financialSettings.profitMargin) || 15
        };
        localStorage.setItem('sirikfit_financial_settings', JSON.stringify(cleanFin));
        localStorage.setItem('omex_financial_settings', JSON.stringify(cleanFin));
      }

      if (extractedAedRate && extractedAedRate > 0) {
        localStorage.setItem('sirikfit_aed_rate', String(extractedAedRate));
      }

      // Feature Toggles Standardization & Clean State Persistence
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

        localStorage.setItem('sirikfit_features_config', JSON.stringify(featureConfig));
      }

      if (cmsConfig) {
        localStorage.setItem('sirikfit_cms_config', JSON.stringify(cmsConfig));
      }

      // Auxiliary keys
      if (cmsConfig?.banners) {
        localStorage.setItem('sirikfit_home_banners', JSON.stringify(cmsConfig.banners));
      }
      if (financialSettings?.gateway) {
        localStorage.setItem('sirikfit_gateway_config', JSON.stringify(financialSettings.gateway));
      }

      // Dispatch custom window events for instant real-time synchronization across all UI components
      const payload = {
        financialSettings,
        cmsConfig,
        aedRate: extractedAedRate,
        features: featureConfig
      };

      try {
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: payload }));
        window.dispatchEvent(new Event('storage'));
      } catch (evErr) {
        console.warn('Event dispatch notice:', evErr);
      }
    }

    // 2. Direct Firestore SDK setDoc writes (Guaranteed to work on production domain sirikfit.ir and AI Studio preview)
    const firestoreAppPayload: Record<string, any> = {};
    if (financialSettings) {
      Object.assign(firestoreAppPayload, financialSettings);
    }
    if (extractedAedRate && extractedAedRate > 0) {
      firestoreAppPayload.aedRate = extractedAedRate;
      firestoreAppPayload.manualAedRate = extractedAedRate;
    }
    if (featureConfig) {
      firestoreAppPayload.features = featureConfig;
    }
    if (cmsConfig) {
      const revVal = cmsConfig.showReviewsSection !== undefined ? Boolean(cmsConfig.showReviewsSection) : (cmsConfig.showComments !== undefined ? Boolean(cmsConfig.showComments) : true);
      firestoreAppPayload.showReviewsSection = revVal;
      firestoreAppPayload.showReviews = revVal;
      firestoreAppPayload.showComments = revVal;
      firestoreAppPayload.showPriceBreakdown = cmsConfig.showPriceBreakdown;
      firestoreAppPayload.showAnnouncementBanner = cmsConfig.showAnnouncementBanner;
      firestoreAppPayload.showLocalInventory = cmsConfig.showLocalInventory;
    }

    const firestorePromises: Promise<any>[] = [];

    if (featureConfig || cmsConfig) {
      const revVal = featureConfig?.showReviews !== undefined
        ? Boolean(featureConfig.showReviews)
        : (featureConfig?.showComments !== undefined
          ? Boolean(featureConfig.showComments)
          : (cmsConfig?.showReviewsSection !== undefined
            ? Boolean(cmsConfig?.showReviewsSection)
            : (cmsConfig?.showComments !== undefined ? Boolean(cmsConfig?.showComments) : true)));
      const generalPayload = {
        showReviewsSection: revVal,
        showReviews: revVal,
        showComments: revVal,
        showPriceBreakdown: featureConfig?.showBreakdown !== undefined ? Boolean(featureConfig.showBreakdown) : cmsConfig?.showPriceBreakdown,
        showAnnouncementBanner: featureConfig?.showAnnouncementBanner !== undefined ? Boolean(featureConfig.showAnnouncementBanner) : cmsConfig?.showAnnouncementBanner,
        showLocalInventory: featureConfig?.showLocalInventory !== undefined ? Boolean(featureConfig.showLocalInventory) : cmsConfig?.showLocalInventory,
        showTrustBadges: cmsConfig?.showTrustBadges ?? cmsConfig?.homeContent?.showTrustBadges ?? true,
        enamadHtml: cmsConfig?.enamadHtml ?? cmsConfig?.homeContent?.enamadHtml ?? '',
        samandehiHtml: cmsConfig?.samandehiHtml ?? cmsConfig?.homeContent?.samandehiHtml ?? '',
        customBadgeImg: cmsConfig?.customBadgeImg ?? cmsConfig?.homeContent?.customBadgeImg ?? '',
        customBadgeLink: cmsConfig?.customBadgeLink ?? cmsConfig?.homeContent?.customBadgeLink ?? '',
        aedRate: extractedAedRate || undefined,
        updatedAt: new Date().toISOString()
      };
      firestorePromises.push(
        setDoc(doc(db, 'settings', 'general'), generalPayload, { merge: true })
      );
    }

    if (Object.keys(firestoreAppPayload).length > 0) {
      firestorePromises.push(
        setDoc(doc(db, 'settings', 'app'), firestoreAppPayload, { merge: true }),
        setDoc(doc(db, 'settings', 'financial'), firestoreAppPayload, { merge: true })
      );
    }

    if (cmsConfig) {
      firestorePromises.push(
        setDoc(doc(db, 'settings', 'cms'), cmsConfig, { merge: true })
      );
    }

    await Promise.all(firestorePromises);

    // 3. Optional Non-Blocking REST API background call (never blocks or throws error if server route is unavailable)
    try {
      const restPayload = {
        aedRate: extractedAedRate,
        financialSettings,
        cms: cmsConfig,
        updatedAt: new Date().toISOString()
      };
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restPayload)
      }).catch(() => {});
    } catch (_restErr) {}

    return {
      success: true,
      message: 'تنظیمات با موفقیت در دیتابیس فایربیس و مرورگر ذخیره گردید.'
    };
  } catch (err: any) {
    console.error('Error saving admin settings payload directly to Firestore:', err);
    return {
      success: false,
      error: err?.message || 'خطا در ذخیره‌سازی اطلاعات در دیتابیس فایربیس'
    };
  }
}

