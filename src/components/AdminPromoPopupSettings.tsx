import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Save, 
  RefreshCw, 
  Check, 
  Layers, 
  Eye, 
  Image as ImageIcon, 
  Flame, 
  Tag, 
  Link2, 
  Clock,
  LayoutTemplate,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { PromoPopupConfig } from '../types';
import { PromoPopupModal } from './PromoPopupModal';

interface AdminPromoPopupSettingsProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_POPUP: PromoPopupConfig = {
  enabled: false,
  targetPage: 'all',
  template: 'template1',
  imageUrl: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&q=80&w=800',
  title: 'تخفیف ویژه سفارش مستقیم از داروخانه‌های دبی',
  subtitle: 'با خرید این هفته از ۱۰٪ تخفیف ویژه کارگو و ارسال بهره‌مند شوید.',
  discountText: '⚡ پیشنهاد محدود',
  couponCode: 'SIRIK10',
  buttonText: 'مشاهده پیشنهادها',
  targetUrl: '#deals',
  delaySeconds: 2
};

export const AdminPromoPopupSettings: React.FC<AdminPromoPopupSettingsProps> = ({
  showToast
}) => {
  const [config, setConfig] = useState<PromoPopupConfig>(DEFAULT_POPUP);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        if (db) {
          const docRef = doc(db, 'settings', 'promoPopup');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setConfig({ ...DEFAULT_POPUP, ...snap.data() } as PromoPopupConfig);
          }
        }
      } catch (err) {
        console.warn('Error loading promo popup config:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      if (db) {
        // Save to settings/promoPopup
        const docRef = doc(db, 'settings', 'promoPopup');
        await setDoc(docRef, config, { merge: true });

        // Also merge into cms/app
        const cmsRef = doc(db, 'cms', 'app');
        await setDoc(cmsRef, { promoPopup: config }, { merge: true });
      }

      setSaveSuccess(true);
      if (showToast) showToast('تنظیمات پاپ‌آپ تبلیغاتی با موفقیت ذخیره شد.', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving promo popup:', err);
      if (showToast) showToast('خطا در ذخیره تنظیمات پاپ‌آپ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
        <span>در حال بارگذاری تنظیمات پاپ‌آپ...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-right">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                <span>مدیریت پاپ‌آپ تبلیغاتی و آفرها (Promo Popup Engine)</span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  config.enabled 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                    : 'bg-slate-700 text-slate-400 border-slate-600'
                }`}>
                  {config.enabled ? 'فعال و در حال نمایش' : 'غیرفعال'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                نمایش پاپ‌آپ‌های چشم‌نواز با قابلیت انتخاب ۳ قالب مدرن، تنظیم کد تخفیف با کپی خودکار و پیش‌نمایش زنده
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-5 py-3 rounded-2xl transition flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>در حال ذخیره...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>تنظیمات ذخیره شد</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>ذخیره تنظیمات پاپ‌آپ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Form Controls on Right, Live Preview on Left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Master Toggle & Page Selection */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ToggleLeft className="w-4 h-4 text-blue-700" />
              <span>وضعیت فعال‌سازی و صفحه هدف</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Enable Switch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <span className="font-black text-xs text-slate-900 block">وضعیت پاپ‌آپ:</span>
                  <span className="text-[11px] text-slate-500 font-medium">فعال بودن در وب‌سایت</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                  className={`text-2xl transition cursor-pointer ${
                    config.enabled ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {config.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              {/* Target Page */}
              <div>
                <label className="text-xs font-black text-slate-800 block mb-1.5">صفحه هدف نمایش:</label>
                <select
                  value={config.targetPage || 'all'}
                  onChange={(e) => setConfig({ ...config, targetPage: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-900 font-bold text-xs p-3 rounded-2xl focus:outline-none focus:border-blue-700 cursor-pointer"
                >
                  <option value="all">همه صفحات (All Pages)</option>
                  <option value="home">فقط صفحه اصلی (Home Only)</option>
                  <option value="inventory">فقط انبار ایران (Iran Inventory Only)</option>
                  <option value="deals">فقط پیشنهادهای ویژه دبی (Deals Only)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Template Selector (3 Pre-built Templates) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <LayoutTemplate className="w-4 h-4 text-blue-700" />
              <span>انتخاب قالب طراحی (۳ استایل آماده)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'template1',
                  name: 'قالب ۱: بنر تصویری فول',
                  desc: 'تصویر بزرگ هدر + دکمه CTA',
                  icon: ImageIcon
                },
                {
                  id: 'template2',
                  name: 'قالب ۲: آفر تخفیف و کوپن',
                  desc: 'کارت طلایی + کد تخفیف کپی‌شونده',
                  icon: Sparkles
                },
                {
                  id: 'template3',
                  name: 'قالب ۳: اطلاعیه حراج فوری',
                  desc: 'استایل اضطراری و فوری قرمز',
                  icon: Flame
                }
              ].map((tpl) => {
                const isSelected = config.template === tpl.id;
                const Icon = tpl.icon;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setConfig({ ...config, template: tpl.id as any })}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-slate-900">{tpl.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{tpl.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content Fields */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Tag className="w-4 h-4 text-blue-700" />
              <span>محتوا و جزئیات پیام</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان اصلی:</label>
                <input
                  type="text"
                  value={config.title || ''}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="مثال: جشنواره شگفت‌انگیز مکمل‌های دبی"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">زیرعنوان / توضیحات کوتاه:</label>
                <textarea
                  rows={2}
                  value={config.subtitle || ''}
                  onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                  placeholder="توضیح کوتاه درباره آفر یا تخفیف..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-blue-700 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">متن یا درصد تخفیف:</label>
                  <input
                    type="text"
                    value={config.discountText || ''}
                    onChange={(e) => setConfig({ ...config, discountText: e.target.value })}
                    placeholder="مثال: تا ۵۰٪ تخفیف افتتاحیه"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">کد کوپن تخفیف (جهت کپی):</label>
                  <input
                    type="text"
                    value={config.couponCode || ''}
                    onChange={(e) => setConfig({ ...config, couponCode: e.target.value })}
                    placeholder="مثال: SIRIKFIT"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-blue-700 font-mono dir-ltr text-center"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">لینک تصویر بنر (Image URL):</label>
                <input
                  type="text"
                  value={config.imageUrl || ''}
                  onChange={(e) => setConfig({ ...config, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-blue-700 dir-ltr text-left"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">متن دکمه عملیاتی:</label>
                  <input
                    type="text"
                    value={config.buttonText || ''}
                    onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                    placeholder="مثال: مشاهده و خرید"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">لینک مقصد کلیک:</label>
                  <input
                    type="text"
                    value={config.targetUrl || ''}
                    onChange={(e) => setConfig({ ...config, targetUrl: e.target.value })}
                    placeholder="#deals یا https://..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-blue-700 dir-ltr text-left"
                  />
                </div>
              </div>

              <div className="w-full sm:w-1/2">
                <label className="font-bold text-slate-700 block mb-1">تاخیر در باز شدن (ثانیه):</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={config.delaySeconds ?? 2}
                  onChange={(e) => setConfig({ ...config, delaySeconds: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2.5 rounded-xl focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-3xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="font-black text-xs">پیش‌نمایش زنده پاپ‌آپ</span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-md">
              قالب: {config.template}
            </span>
          </div>

          <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-3xl p-4 flex items-center justify-center min-h-[450px]">
            <PromoPopupModal
              config={config}
              isPreview={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
