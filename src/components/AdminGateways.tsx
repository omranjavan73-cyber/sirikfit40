import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, Save, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdminGatewaysProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminGateways: React.FC<AdminGatewaysProps> = ({ showToast }) => {
  const [merchantId, setMerchantId] = useState<string>('');
  const [isSandbox, setIsSandbox] = useState<boolean>(false);
  const [callbackUrl, setCallbackUrl] = useState<string>('https://sirikfit.ir/api/payment/callback');
  const [successMessage, setSuccessMessage] = useState<string>('با تشکر از خرید شما، سفارش شما با موفقیت ثبت و وارد فرآیند پردازش شد.');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Load gateway settings directly from Firestore settings/gateways
  useEffect(() => {
    let isMounted = true;
    const fetchGatewayConfig = async () => {
      try {
        setIsLoading(true);
        const gwDocSnap = await getDoc(doc(db, 'settings', 'gateways'));
        if (gwDocSnap.exists() && isMounted) {
          const data = gwDocSnap.data();
          if (data.zibalMerchantId !== undefined) setMerchantId(data.zibalMerchantId);
          else if (data.merchantId) setMerchantId(data.merchantId);

          if (data.zibalSandbox !== undefined) setIsSandbox(Boolean(data.zibalSandbox));
          else if (data.isSandbox !== undefined) setIsSandbox(Boolean(data.isSandbox));

          if (data.callbackUrl) setCallbackUrl(data.callbackUrl);
          if (data.successMessage) setSuccessMessage(data.successMessage);
        }
      } catch (err) {
        console.warn('Could not load settings/gateways from Firestore:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchGatewayConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const nowIso = new Date().toISOString();
    const trimmedMerchant = merchantId.trim();
    const resolvedCallback = callbackUrl.trim() || 'https://sirikfit.ir/api/payment/callback';
    const resolvedSuccessMsg = successMessage.trim() || 'با تشکر از خرید شما، سفارش شما با موفقیت ثبت و وارد فرآیند پردازش شد.';

    const payload = {
      activeGateway: 'zibal',
      zibalMerchantId: trimmedMerchant,
      zibalSandbox: Boolean(isSandbox),
      merchantId: trimmedMerchant,
      isSandbox: Boolean(isSandbox),
      callbackUrl: resolvedCallback,
      successMessage: resolvedSuccessMsg,
      updatedAt: nowIso
    };

    try {
      // Direct write to Firestore settings/gateways
      await setDoc(doc(db, 'settings', 'gateways'), payload, { merge: true });

      // Also sync to settings/cms for backward compatibility
      try {
        await setDoc(doc(db, 'settings', 'cms'), { paymentGateway: payload }, { merge: true });
      } catch (_cmsErr) {}

      setSaveSuccess(true);
      if (showToast) {
        showToast('تنظیمات درگاه پرداخت زیبال با موفقیت در فایرستور ذخیره شد', 'success');
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving settings/gateways to Firestore:', err);
      if (showToast) {
        showToast(`خطا در ذخیره تنظیمات: ${err?.message || 'خطای سرور'}`, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="text-sm font-medium">در حال فراخوانی تنظیمات درگاه شاپرک زیبال از فایرستور...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">
                تنظیمات درگاه پرداخت آنلاین شاپرک (زیبال)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                پیکربندی مستقیم اتصال به شبکه پرداخت الکترونیک شاپرک از طریق درگاه پرداخت رسمی زیبال
              </p>
            </div>
          </div>
          <a
            href="https://zibal.ir"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl font-bold transition"
          >
            <span>ورود به پنل زیبال</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-bold">تنظیمات درگاه شاپرک زیبال با موفقیت ذخیره گردید و بلافاصله بر روی سرور فعال شد.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Field 1: Merchant ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              شناسه مرچنت زیبال (Zibal Merchant ID)
            </label>
            <input
              type="text"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="مثال: 65a8e2b9c7d1e0f4a5b6c7d8 یا zibal (برای تست)"
              dir="ltr"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-mono focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              کد مرچنت دریافتی از پنل زیبال را در این قسمت وارد کنید. این فیلد بدون محدودیت کاراکتری است و فضای خالی ابتدا و انتهای آن هنگام ذخیره حذف می‌گردد.
            </p>
          </div>

          {/* Field 2: Sandbox Switch */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-800">حالت آزمایشی (Sandbox)</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                در صورت غیرفعال بودن (OFF)، پرداخت واقعی متصل به شبکه بانکی شاپرک انجام می‌شود. در صورت فعال بودن (ON)، شبیه‌ساز تست زیبال فراخوانی می‌گردد.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSandbox(!isSandbox)}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isSandbox ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isSandbox ? 'translate-x-0' : '-translate-x-5'
                }`}
              />
            </button>
          </div>

          {/* Field 3: Callback URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              آدرس بازگشت تراکنش (Callback URL)
            </label>
            <input
              type="text"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              placeholder="https://sirikfit.ir/api/payment/callback"
              dir="ltr"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-mono focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              آدرس پیش‌فرض: <code className="text-emerald-600">https://sirikfit.ir/api/payment/callback</code>
            </p>
          </div>

          {/* Field 4: Custom Success Message */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              پیام اختصاصی سربرگ رسید پرداخت موفق
            </label>
            <textarea
              rows={3}
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              placeholder="متن پیام تبریک و اطلاع‌رسانی پس از پرداخت موفق..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm leading-relaxed focus:outline-none focus:border-emerald-500 focus:bg-white transition resize-none"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              این متن پس از تایید تراکنش در صفحه فاکتور و رسید نهایی به مشتری نمایش داده می‌شود.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال ذخیره‌سازی در فایرستور...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>ذخیره تنظیمات درگاه زیبال</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminGateways;
