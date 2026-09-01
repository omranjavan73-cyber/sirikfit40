import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, ExternalLink, CheckCircle2, RefreshCw } from 'lucide-react';
import { AdminTelegramSettings } from '../../components/AdminTelegramSettings';
import type { CmsConfig } from '../../types';
import { 
  getSupportSettings, 
  saveSupportSettings, 
  getGeneralSettings, 
  saveGeneralSettings, 
  formatWhatsAppUrl,
  DEFAULT_WHATSAPP_NUMBER,
  DEFAULT_WHATSAPP_MESSAGE
} from '../../services/settingsService';

interface SettingsAdminProps {
  cms?: CmsConfig;
  onUpdateCms?: (updatedCms: CmsConfig) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsAdmin: React.FC<SettingsAdminProps> = ({
  cms,
  onUpdateCms,
  showToast
}) => {
  const [whatsappPhone, setWhatsappPhone] = useState(DEFAULT_WHATSAPP_NUMBER);
  const [whatsappMsg, setWhatsappMsg] = useState(DEFAULT_WHATSAPP_MESSAGE);
  const [isSavingWa, setIsSavingWa] = useState(false);
  const [waSavedSuccess, setWaSavedSuccess] = useState(false);

  useEffect(() => {
    getSupportSettings().then((data) => {
      if (data.whatsappNumber) {
        setWhatsappPhone(data.whatsappNumber);
      }
      if (data.whatsappDefaultMessage) {
        setWhatsappMsg(data.whatsappDefaultMessage);
      }
    });
  }, []);

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWa(true);
    setWaSavedSuccess(false);

    try {
      const cleanPhone = whatsappPhone.trim();
      const cleanMsg = whatsappMsg.trim();

      const ok = await saveSupportSettings({
        whatsappNumber: cleanPhone,
        whatsappDefaultMessage: cleanMsg
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supportConfigUpdated', {
          detail: { whatsappNumber: cleanPhone, whatsappDefaultMessage: cleanMsg }
        }));
      }

      if (cms && onUpdateCms) {
        onUpdateCms({
          ...cms,
          homeContent: {
            ...cms.homeContent,
            whatsappPhone: cleanPhone
          }
        });
      }

      if (ok) {
        setWaSavedSuccess(true);
        if (showToast) showToast('شماره واتساپ پشتیبانی با موفقیت در دیتابیس (settings/support) ذخیره شد.', 'success');
        setTimeout(() => setWaSavedSuccess(false), 3500);
      } else {
        if (showToast) showToast('خطا در ذخیره شماره واتساپ.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'خطا در برقراری ارتباط با فایراستور', 'error');
    } finally {
      setIsSavingWa(false);
    }
  };

  const previewLink = formatWhatsAppUrl(whatsappPhone, whatsappMsg);

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-right" dir="rtl">
      {/* 1. Dynamic WhatsApp Support Settings Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                تنظیم شماره واتساپ پشتیبانی (دکمه شناور و پنل)
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                ذخیره در دیتابیس (settings/general) - پشتیبانی همزمان از پیش‌شماره ایران (09... / +98) و امارات (+971)
              </p>
            </div>
          </div>

          {waSavedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              ذخیره شد
            </span>
          )}
        </div>

        <form onSubmit={handleSaveWhatsApp} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-zinc-200 mb-1.5">
                شماره موبایل واتساپ پشتیبان <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="+989914984801 یا 09914984801"
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-emerald-600 font-mono dir-ltr text-left font-bold"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                فرمت معتبر: +971... برای خطوط دبی یا 09... / +98... برای خطوط ایران
              </span>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-zinc-200 mb-1.5">
                متن پیش‌فرض پیام شروع گفتگو در واتساپ
              </label>
              <input
                type="text"
                value={whatsappMsg}
                onChange={(e) => setWhatsappMsg(e.target.value)}
                placeholder="سلام، درخواست راهنمایی و پشتیبانی دارم"
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-emerald-600 font-medium"
              />
            </div>
          </div>

          {/* Live Generated WhatsApp Link Preview */}
          <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">لینک زنده تولیدی برای کاربران:</span>
              <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold break-all dir-ltr block text-left">
                {previewLink}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={previewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>تست لینک واتساپ</span>
              </a>

              <button
                type="submit"
                disabled={isSavingWa}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSavingWa ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>ذخیره تنظیمات</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Existing Telegram Settings Component */}
      <AdminTelegramSettings
        showToast={showToast}
        onSaved={(config) => {
          if (cms && onUpdateCms) {
            const updated = {
              ...cms,
              apiConfig: {
                ...(cms.apiConfig || {}),
                telegramBotToken: config.botToken,
                adminChatId: config.chatId,
                telegramNotifyEnabled: config.enabled
              }
            };
            onUpdateCms(updated as any);
          }
        }}
      />
    </div>
  );
};

export default SettingsAdmin;
