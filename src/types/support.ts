export interface SupportConfig {
  whatsappNumber: string;
  whatsappDefaultMessage: string;
  telegramBotUsername: string;
  isFloatingWidgetEnabled: boolean;
  supportHours?: string;
  responseTimeText?: string;
  updatedAt?: string;
}

export const DEFAULT_SUPPORT_CONFIG: SupportConfig = {
  whatsappNumber: '+971501234567',
  whatsappDefaultMessage: 'سلام، در رابطه با خرید از سیریک فیت راهنمایی میخواستم',
  telegramBotUsername: 'SIRIK_FIT_Support_bot',
  isFloatingWidgetEnabled: true,
  supportHours: '۹ صبح الی ۲۴ شب (پاسخگویی سریع)',
  responseTimeText: '🟢 پاسخگویی کمتر از ۱۵ دقیقه'
};
