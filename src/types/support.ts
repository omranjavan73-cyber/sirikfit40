import { DEFAULT_WHATSAPP_NUMBER, DEFAULT_WHATSAPP_MESSAGE } from './settings';

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
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  whatsappDefaultMessage: DEFAULT_WHATSAPP_MESSAGE,
  telegramBotUsername: 'SIRIK_FIT_Support_bot',
  isFloatingWidgetEnabled: true,
  supportHours: '۹ صبح الی ۲۴ شب (پاسخگویی سریع)',
  responseTimeText: '🟢 پاسخگویی کمتر از ۱۵ دقیقه'
};

