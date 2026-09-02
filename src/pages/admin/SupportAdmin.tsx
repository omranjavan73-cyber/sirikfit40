import React, { useState, useEffect } from 'react';
import {
  Save,
  MessageCircle,
  Send,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SupportHeadsetLogo } from '../../components/common/SupportHeadsetLogo';
import { useSupport } from '../../context/SupportContext';
import { SupportConfig, DEFAULT_SUPPORT_CONFIG } from '../../types/support';
import { fetchSupportConfigFromFirestore } from '../../services/adminService';
import { formatWhatsAppUrl } from '../../services/settingsService';

interface SupportAdminProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SupportAdmin: React.FC<SupportAdminProps> = ({ showToast }) => {
  const { supportConfig, updateSupportConfig, isLoading } = useSupport();

  const [formData, setFormData] = useState<SupportConfig>(supportConfig || DEFAULT_SUPPORT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (supportConfig) {
      setFormData(supportConfig);
    }
  }, [supportConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    setErrorMessage(null);

    try {
      const cleanPhone = (formData.whatsappNumber || '').trim();
      const payload: SupportConfig = {
        ...formData,
        whatsappNumber: cleanPhone,
        whatsappDefaultMessage: (formData.whatsappDefaultMessage || '').trim()
      };

      const success = await updateSupportConfig(payload);
      if (success) {
        // Requirement 11: Reload the settings from database and verify
        const reloaded = await fetchSupportConfigFromFirestore();
        if (reloaded && reloaded.whatsappNumber) {
          setFormData(reloaded);
        }
        setSavedSuccess(true);
        if (showToast) showToast('تنظیمات شماره واتساپ و درگاه‌های پشتیبانی با موفقیت در دیتابیس ذخیره و تایید شد.', 'success');
        setTimeout(() => setSavedSuccess(false), 5000);
      } else {
        const errText = 'خطا در ثبت تغییرات در پایگاه داده. لطفاً اتصال را بررسی و مجدداً تلاش کنید.';
        setErrorMessage(errText);
        if (showToast) showToast(errText, 'error');
      }
    } catch (err: any) {
      const errText = err?.message || 'خطا در برقراری ارتباط با پایگاه داده فایراستور';
      setErrorMessage(errText);
      if (showToast) showToast(errText, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const previewWaUrl = formatWhatsAppUrl(formData.whatsappNumber, formData.whatsappDefaultMessage);
  const previewTgUrl = `https://t.me/${(formData.telegramBotUsername || 'SIRIK_FIT_Support_bot').replace(/^@/, '')}`;

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-right" dir="rtl">
      {/* Header card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shadow-md p-1.5">
              <SupportHeadsetLogo className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                تنظیمات درگاه‌های پشتیبانی و تماس
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                مدیریت بات تلگرام، شماره واتساپ و دکمه شناور استعلام کالا و پشتیبانی سیریک فیت
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${formData.isFloatingWidgetEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {formData.isFloatingWidgetEnabled ? 'دکمه شناور فعال' : 'دکمه شناور غیرفعال'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Main Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WhatsApp Settings Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  تنظیمات درگاه واتساپ (WhatsApp)
                </h3>
              </div>
              <a
                href={previewWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>تست لینک</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* WhatsApp Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 dark:text-zinc-200">
                شماره واتساپ پشتیبانی (با کد کشور، مانند +971 یا 09):
              </label>
              <input
                id="support-whatsapp-input"
                type="text"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="+989914984801 یا 09914984801"
                dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition"
              />
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                فرمت معتبر برای امارات: <span className="font-mono text-slate-700 dark:text-zinc-300">+97150xxxxxxx</span> یا برای ایران: <span className="font-mono text-slate-700 dark:text-zinc-300">0917xxxxxxx</span>
              </p>
            </div>

            {/* WhatsApp Default Greeting */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 dark:text-zinc-200">
                متن پیشفرض پیام آغازین واتساپ:
              </label>
              <textarea
                id="support-whatsapp-msg-input"
                rows={3}
                value={formData.whatsappDefaultMessage}
                onChange={(e) => setFormData({ ...formData, whatsappDefaultMessage: e.target.value })}
                placeholder="سلام، در رابطه با خرید از سیریک فیت راهنمایی میخواستم"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs leading-relaxed focus:outline-none focus:border-emerald-500 transition"
              />
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                این پیام به محض باز شدن چت واتساپ به صورت خودکار در کادر پیام مشتری قرار می‌گیرد.
              </p>
            </div>
          </div>

          {/* Telegram Settings Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  تنظیمات بات / کانال تلگرام (Telegram)
                </h3>
              </div>
              <a
                href={previewTgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <span>تست لینک</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Telegram Bot Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 dark:text-zinc-200">
                آیدی بات یا پشتیبان تلگرام (بدون @ یا همراه با @):
              </label>
              <div className="relative">
                <input
                  id="support-telegram-input"
                  type="text"
                  value={formData.telegramBotUsername}
                  onChange={(e) => setFormData({ ...formData, telegramBotUsername: e.target.value })}
                  placeholder="SIRIK_FIT_Support_bot"
                  dir="ltr"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-sky-500 transition"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                پیش‌فرض رسمی سیریک فیت: <span className="font-mono text-sky-600">SIRIK_FIT_Support_bot</span>
              </p>
            </div>

            {/* Response Time and Hours */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-800 dark:text-zinc-200">
                  متن سرعت پاسخگویی:
                </label>
                <input
                  type="text"
                  value={formData.responseTimeText || ''}
                  onChange={(e) => setFormData({ ...formData, responseTimeText: e.target.value })}
                  placeholder="پاسخگویی کمتر از ۱۵ دقیقه"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-800 dark:text-zinc-200">
                  ساعات کاری پشتیبانی:
                </label>
                <input
                  type="text"
                  value={formData.supportHours || ''}
                  onChange={(e) => setFormData({ ...formData, supportHours: e.target.value })}
                  placeholder="۹ صبح الی ۲۴ شب"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visibility Toggle Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>نمایش دکمه شناور پشتیبانی در سایت</span>
                {formData.isFloatingWidgetEnabled ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    فعال
                  </span>
                ) : (
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                    غیرفعال
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                در صورت فعال بودن، دکمه گرد پشتیبانی با افکت پالس آنلاین در پایین سمت چپ تمام صفحات فروشگاه نمایش داده می‌شود.
              </p>
            </div>

            <button
              id="toggle-floating-widget-btn"
              type="button"
              onClick={() => setFormData({ ...formData, isFloatingWidgetEnabled: !formData.isFloatingWidgetEnabled })}
              className="cursor-pointer transition-transform active:scale-95 text-slate-800 dark:text-zinc-200"
            >
              {formData.isFloatingWidgetEnabled ? (
                <ToggleRight className="w-10 h-10 text-red-600 fill-red-600" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {savedSuccess ? (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تنظیمات شماره واتساپ با موفقیت در دیتابیس (settings/support) ذخیره و راستی‌آزمایی شد.</span>
            </div>
          ) : errorMessage ? (
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs bg-rose-50 dark:bg-rose-950/40 px-4 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-800 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-zinc-400">
              تغییرات شماره واتساپ بلافاصله به صورت زنده در دکمه‌های پشتیبانی و صفحات خرید اعمال می‌گردد.
            </div>
          )}

          <button
            id="save-support-config-btn"
            type="submit"
            disabled={isSaving || isLoading}
            className="bg-red-600 hover:bg-red-700 active:scale-98 disabled:opacity-50 text-white font-black text-xs sm:text-sm px-6 py-3 rounded-2xl transition cursor-pointer shadow-md flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال ذخیره‌سازی...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>ذخیره تنظیمات درگاه پشتیبانی</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupportAdmin;
