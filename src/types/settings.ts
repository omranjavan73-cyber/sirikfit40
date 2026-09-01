/**
 * Settings Types for SirikFit
 * Includes General Settings, Financial, Landing, and Real-Time Support WhatsApp Configurations.
 */

export interface GeneralSettingsDoc {
  whatsappNumber?: string;
  whatsappSupportNumber?: string;
  whatsappDefaultMessage?: string;
  telegramBotUsername?: string;
  supportHours?: string;
  responseTimeText?: string;
  isFloatingWidgetEnabled?: boolean;
  showReviewsSection?: boolean;
  showComments?: boolean;
  showPriceBreakdown?: boolean;
  showAnnouncementBanner?: boolean;
  showLocalInventory?: boolean;
  showEnamad?: boolean;
  updatedAt?: string;
  [key: string]: any;
}

export interface SupportSettings {
  whatsappNumber: string;
  whatsappDefaultMessage: string;
  telegramBotUsername: string;
  isFloatingWidgetEnabled: boolean;
  supportHours?: string;
  responseTimeText?: string;
  updatedAt?: string;
}

export const DEFAULT_GENERAL_SUPPORT_SETTINGS: SupportSettings = {
  whatsappNumber: '+971501234567',
  whatsappDefaultMessage: 'سلام، در رابطه با خرید از سیریک فیت راهنمایی میخواستم',
  telegramBotUsername: 'SIRIK_FIT_Support_bot',
  isFloatingWidgetEnabled: true,
  supportHours: '۹ صبح الی ۲۴ شب (پاسخگویی سریع)',
  responseTimeText: '🟢 پاسخگویی کمتر از ۱۵ دقیقه'
};

export interface SupportFirestoreDoc {
  whatsappNumber?: string;
  whatsappDefaultMessage?: string;
  telegramBotUsername?: string;
  supportHours?: string;
  responseTimeText?: string;
  isFloatingWidgetEnabled?: boolean;
  updatedAt?: string;
  [key: string]: any;
}

