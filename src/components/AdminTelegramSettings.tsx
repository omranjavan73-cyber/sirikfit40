import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, Save, Bot, MessageSquare, ShieldCheck, HelpCircle, ExternalLink, Bell, ToggleLeft, ToggleRight } from 'lucide-react';
import type { TelegramConfig } from '../types';
import { getTelegramAdminConfig, saveTelegramAdminConfig, testTelegramAdminNotification, DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_CHAT_ID } from '../services/adminService';

interface AdminTelegramSettingsProps {
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onSaved?: (config: TelegramConfig) => void;
}

export const AdminTelegramSettings: React.FC<AdminTelegramSettingsProps> = ({
  showToast,
  onSaved
}) => {
  const [config, setConfig] = useState<TelegramConfig>({
    botToken: DEFAULT_TELEGRAM_BOT_TOKEN,
    chatId: DEFAULT_TELEGRAM_CHAT_ID,
    enabled: true,
    topicId: ''
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    getTelegramAdminConfig().then((loaded) => {
      if (mounted && loaded) {
        setConfig(loaded);
      }
    }).finally(() => {
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await saveTelegramAdminConfig(config);
      setSaveSuccess(true);
      if (showToast) {
        showToast('تنظیمات ربات تلگرام با موفقیت در پایگاه داده ذخیره شد.', 'success');
      }
      if (onSaved) {
        onSaved(config);
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      if (showToast) {
        showToast('خطا در ذخیره تنظیمات تلگرام: ' + (err?.message || ''), 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testTelegramAdminNotification({
        botToken: config.botToken,
        chatId: config.chatId,
        topicId: config.topicId
      });

      setTestResult({
        success: res.success,
        message: res.message
      });

      if (showToast) {
        showToast(res.message, res.success ? 'success' : 'error');
      }
    } catch (err: any) {
      const errMsg = 'خطا در برقراری ارتباط با سرور: ' + (err?.message || '');
      setTestResult({
        success: false,
        message: errMsg
      });
      if (showToast) {
        showToast(errMsg, 'error');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetToDefaults = () => {
    setConfig({
      botToken: DEFAULT_TELEGRAM_BOT_TOKEN,
      chatId: DEFAULT_TELEGRAM_CHAT_ID,
      enabled: true,
      topicId: ''
    });
    if (showToast) {
      showToast('مقادیر پیش‌فرض سرور بازنشانی شدند. جهت ذخیره دکمه ثبت را بزنید.', 'info');
    }
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif]">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
              <span>سیستم اطلاع‌رسانی خودکار سفارشات در تلگرام (Telegram Bot Alerts)</span>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                config.enabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                {config.enabled ? 'سیستم ارسال فعال است' : 'سیستم موقتاً غیرفعال'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              ارسال آنی مشخصات خریدار، اقلام سفارش، قیمت، لینک محصول و وضعیت پرداخت به چت یا کانال مدیر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
          >
            بازنشانی پیش‌فرض
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || isLoading}
            className="bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
                <span>در حال ذخیره...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-emerald-400" />
                <span>ذخیره تنظیمات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-extrabold flex items-center gap-2.5 shadow-2xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>تنظیمات ربات تلگرام با موفقیت در پایگاه داده ذخیره شد و اعمال گردید.</span>
        </div>
      )}

      {/* Test Result Message */}
      {testResult && (
        <div className={`p-4 rounded-2xl text-xs font-extrabold flex items-center justify-between gap-3 shadow-2xs transition animate-fade-in ${
          testResult.success
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
            : 'bg-rose-50 border border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setTestResult(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-6">
        {/* Toggle Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
              config.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
            }`}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 block">ارسال خودکار اعلان‌ها به تلگرام:</span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                با فعال بودن این گزینه، بلافاصله پس از ثبت هر سفارش یا پرداخت آنلاین، فاکتور برای مدیر ارسال می‌شود.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            className={`flex items-center gap-2 text-xs font-black px-4 py-2 rounded-xl border transition cursor-pointer shrink-0 ${
              config.enabled
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            {config.enabled ? (
              <>
                <ToggleRight className="w-5 h-5" />
                <span>اطلاع‌رسانی فعال است</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-slate-500" />
                <span>اطلاع‌رسانی غیرفعال است</span>
              </>
            )}
          </button>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Field 1: Telegram Bot Token */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-sky-600" />
                <span>توکن اختصاصی ربات تلگرام (Bot Token):</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">از BotFather@</span>
            </div>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={config.botToken}
                onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-3 rounded-xl focus:outline-none transition pr-3.5 pl-10 font-mono dir-ltr"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                title={showToken ? 'مخفی‌سازی' : 'نمایش'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              توکن ربات تلگرام دریافتی از BotFather@ را اینجا قرار دهید.
            </p>
          </div>

          {/* Field 2: Chat ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                <span>شناسه چت، کانال یا گروه مدیر (Chat ID):</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">مثال: 117765163 یا 100123456789-</span>
            </div>
            <input
              type="text"
              value={config.chatId}
              onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
              placeholder="117765163"
              className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-3 rounded-xl focus:outline-none transition font-mono dir-ltr"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              شناسه عددی اکانت، سوپرگروه یا کانال تلگرام (شناسه گروه‌ها معمولاً با - شروع می‌شود).
            </p>
          </div>

          {/* Field 3: Optional Topic ID / Thread ID */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>شناسه تاپیک / موضوع در سوپرگروه (اختیاری - Message Thread ID):</span>
            </label>
            <input
              type="text"
              value={config.topicId || ''}
              onChange={(e) => setConfig({ ...config, topicId: e.target.value })}
              placeholder="مثال: 2 (فقط در صورتی که گروه شما دارای تاپیک مجزا برای سفارشات است)"
              className="w-full bg-slate-50 border border-slate-300 focus:border-slate-900 focus:bg-white text-slate-900 text-xs font-bold px-3.5 py-3 rounded-xl focus:outline-none transition font-mono dir-ltr"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              اگر در سوپرگروه با قابلیت Topics پیام ارسال می‌کنید، شناسه تاپیک مربوطه را وارد کنید. در غیر این صورت خالی بگذارید.
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isTesting || isLoading || !config.botToken || !config.chatId}
            className="w-full sm:w-auto bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-extrabold py-3 px-5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                <span>در حال ارسال پیام تست...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-sky-600" />
                <span>ارسال پیام تست به تلگرام (Test Connection)</span>
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 text-white text-xs font-extrabold py-3 px-6 rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-100" />
                <span>در حال ذخیره...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-emerald-100" />
                <span>ذخیره نهایی تنظیمات تلگرام</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Setup Guide Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-3">
        <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sky-600" />
          <span>راهنمای سریع راه‌اندازی ربات تلگرام:</span>
        </h4>
        <ol className="text-xs text-slate-600 leading-relaxed list-decimal list-inside space-y-1.5 font-medium">
          <li>
            در تلگرام به آیدی <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-900 dir-ltr inline-block">@BotFather</code> پیام داده و با دستور <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-900 dir-ltr inline-block">/newbot</code> یک ربات جدید بسازید.
          </li>
          <li>
            توکن داده‌شده توسط BotFather را در فیلد <strong>توکن اختصاصی ربات تلگرام</strong> کپی کنید.
          </li>
          <li>
            یکبار دکمه <strong>Start</strong> را در چت ربات خود بزنید تا ربات مجاز به ارسال پیام به شما شود.
          </li>
          <li>
            شناسه عددی اکانت خود را از ربات <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-900 dir-ltr inline-block">@userinfobot</code> گرفته و در فیلد <strong>شناسه چت</strong> قرار دهید (یا ربات را به گروه مدیران اضافه کرده و Chat ID گروه را وارد کنید).
          </li>
          <li>
            دکمه <strong>ارسال پیام تست به تلگرام</strong> را بزنید تا از اتصال مطمئن شوید، سپس تنظیمات را ذخیره نمایید.
          </li>
        </ol>
      </div>
    </div>
  );
};

export default AdminTelegramSettings;
