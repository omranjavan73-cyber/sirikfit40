import React, { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import type { StoreSettings } from '../../types/store';
import { StoreCardAdmin } from './StoreCardAdmin';
import {
  DEFAULT_PRESET_STORES,
  getStoresFromFirestore,
  saveStoresToFirestore,
  normalizeStoreItem
} from '../../services/storeService';

export interface StoreEditorProps {
  initialStores?: StoreSettings[];
  onStoresSaved?: (stores: StoreSettings[]) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const StoreEditor: React.FC<StoreEditorProps> = ({
  initialStores,
  onStoresSaved,
  showToast
}) => {
  const [stores, setStores] = useState<StoreSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 1. Initial Load
  useEffect(() => {
    let isMounted = true;
    if (initialStores && initialStores.length > 0) {
      setStores(initialStores.map(normalizeStoreItem));
      setIsLoading(false);
    } else {
      getStoresFromFirestore().then((list) => {
        if (isMounted) {
          setStores(list);
          setIsLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [initialStores]);

  // 2. Handlers
  const handleUpdateField = (id: string, field: keyof StoreSettings, value: any) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        // Sync logoUrl and image
        if (field === 'logoUrl') {
          updated.image = value;
        } else if (field === 'image') {
          updated.logoUrl = value;
        }
        // Sync title and nameFa
        if (field === 'nameFa') {
          updated.title = value;
        } else if (field === 'title') {
          updated.nameFa = value;
        }
        // Sync shortTitle and nameEn
        if (field === 'nameEn') {
          updated.shortTitle = value;
        } else if (field === 'shortTitle') {
          updated.nameEn = value;
        }
        // Sync ctaText and orderCtaText
        if (field === 'orderCtaText') {
          updated.ctaText = value;
        } else if (field === 'ctaText') {
          updated.orderCtaText = value;
        }
        // Sync isActive and enabled
        if (field === 'isActive') {
          updated.enabled = value;
        } else if (field === 'enabled') {
          updated.isActive = value;
        }
        return updated;
      })
    );
  };

  const handleAddNewStore = () => {
    const newStore: StoreSettings = {
      id: `store-${Date.now()}`,
      nameFa: 'فروشگاه جدید',
      nameEn: 'New Store',
      title: 'فروشگاه جدید',
      shortTitle: 'Store',
      slug: `store-${Date.now().toString(36)}`,
      logoUrl: '',
      image: '',
      brandColor: '#458500',
      isActive: true,
      enabled: true,
      url: 'https://',
      subtitle: 'توضیحات کوتاه فروشگاه',
      description: 'توضیحات برند و محصولات فروشگاه جهت نمایش در صفحه اصلی',
      badge: 'ارسال مستقیم',
      orderCtaText: 'محاسبه و خرید از فروشگاه',
      ctaText: 'محاسبه و خرید از فروشگاه'
    };
    setStores((prev) => [...prev, newStore]);
    if (showToast) showToast('فروشگاه جدید با فیلد لوگوی ویرایش‌پذیر افزوده شد.', 'info');
  };

  const handleDeleteStore = (id: string) => {
    if (confirm('آیا از حذف این فروشگاه اطمینان دارید؟')) {
      setStores((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleApplyPreset = (id: string, preset: Partial<StoreSettings>) => {
    setStores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...preset } : s))
    );
  };

  const handleResetToDefaults = () => {
    if (confirm('آیا از بازیابی لیست پیش‌فرض فروشگاه‌ها (شامل iHerb، GNC، Life Pharmacy و...) اطمینان دارید؟')) {
      setStores(DEFAULT_PRESET_STORES);
      if (showToast) showToast('فروشگاه‌ها به لیست پیش‌فرض بازگردانده شدند.', 'info');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const result = await saveStoresToFirestore(stores);
      if (result.success) {
        setStatusMessage({ text: 'تنظیمات و لوگوی فروشگاه‌ها با موفقیت ذخیره شدند.', type: 'success' });
        if (showToast) showToast('فروشگاه‌ها و آدرس‌های لوگو با موفقیت ذخیره شدند.', 'success');
        if (onStoresSaved) onStoresSaved(stores);
      } else {
        setStatusMessage({ text: `خطا در ذخیره: ${result.error}`, type: 'error' });
        if (showToast) showToast(`خطا: ${result.error}`, 'error');
      }
    } catch (err: any) {
      setStatusMessage({ text: `خطا: ${err?.message || err}`, type: 'error' });
      if (showToast) showToast(`خطا در ذخیره: ${err?.message || err}`, 'error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        در حال بارگذاری لیست فروشگاه‌ها...
      </div>
    );
  }

  return (
    <div className="space-y-5 font-['Vazirmatn',sans-serif]">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>مدیریت فروشگاه‌های همکار و لوگوهای اختصاصی (Store Management)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            تنظیم لوگوی زنده (URL/فایل)، عناوین، لینک مستقیم، رنگ سازمانی و فعال‌سازی فروشگاه‌ها
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAddNewStore}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن فروشگاه جدید</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="بازنشانی به فروشگاه‌های پیش‌فرض دبی"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>پیش‌فرض‌ها</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره فروشگاه‌ها'}</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Store Cards List */}
      <div className="space-y-4">
        {stores.map((store, index) => (
          <StoreCardAdmin
            key={store.id}
            store={store}
            index={index}
            onUpdateField={handleUpdateField}
            onDelete={handleDeleteStore}
            onApplyPreset={handleApplyPreset}
          />
        ))}

        {stores.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl p-8 text-center space-y-3">
            <Store className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
              هیچ فروشگاهی تعریف نشده است.
            </p>
            <button
              type="button"
              onClick={handleAddNewStore}
              className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن اولین فروشگاه</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Save Bar */}
      {stores.length > 0 && (
        <div className="sticky bottom-4 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-zinc-800 p-3.5 rounded-2xl shadow-lg flex items-center justify-between">
          <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
            تعداد فروشگاه‌ها: <strong className="text-slate-900 dark:text-white font-bold">{stores.length}</strong> (فعال: {stores.filter(s => s.isActive !== false && s.enabled !== false).length})
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره نهایی تمام فروشگاه‌ها'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
