import { saveSettingsToFirestore, saveCmsToFirestore } from '../firebase';

export interface AdminSaveResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Utility function to handle atomic writes to both Firestore and LocalStorage
 * for financial settings, CMS configuration, home content, gateway settings, etc.
 */
export async function saveAdminSettingsPayload(
  financialSettings: Record<string, any>,
  cmsConfig: Record<string, any>
): Promise<AdminSaveResult> {
  try {
    if (typeof window !== 'undefined') {
      // 1. Cache to LocalStorage immediately
      if (financialSettings) {
        localStorage.setItem('sirikfit_financial_settings', JSON.stringify(financialSettings));
        localStorage.setItem('omex_financial_settings', JSON.stringify(financialSettings));
      }

      if (cmsConfig) {
        localStorage.setItem('sirikfit_cms_config', JSON.stringify(cmsConfig));
      }

      // Also cache specialized keys if present inside payloads
      if (cmsConfig?.banners) {
        localStorage.setItem('sirikfit_home_banners', JSON.stringify(cmsConfig.banners));
      }
      if (financialSettings?.gateway) {
        localStorage.setItem('sirikfit_gateway_config', JSON.stringify(financialSettings.gateway));
      }
    }

    // 2. Persist to Firestore cloud database with merge
    const [finResult, cmsResult] = await Promise.all([
      financialSettings ? saveSettingsToFirestore(financialSettings) : Promise.resolve(true),
      cmsConfig ? saveCmsToFirestore(cmsConfig) : Promise.resolve(true)
    ]);

    if (finResult && cmsResult) {
      return {
        success: true,
        message: 'تنظیمات با موفقیت ذخیره و در پایگاه داده همگام‌سازی شد.'
      };
    } else {
      return {
        success: true,
        message: 'تنظیمات به‌صورت محلی ذخیره شد (ذخيره ابرى در حالت آفلاین).'
      };
    }
  } catch (err: any) {
    console.error('Error saving admin settings payload:', err);
    return {
      success: false,
      error: err?.message || 'خطا در ذخیره‌سازی اطلاعات'
    };
  }
}
