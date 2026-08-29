import React, { useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Link as LinkIcon,
  Palette,
  Eye,
  Check,
  Percent,
  Layers,
  Store,
  X
} from 'lucide-react';
import type { StoreSettings } from '../../types/store';

export interface StoreCardAdminProps {
  store: StoreSettings;
  index: number;
  onUpdateField: (id: string, field: keyof StoreSettings, value: any) => void;
  onDelete: (id: string) => void;
  onApplyPreset?: (id: string, preset: Partial<StoreSettings>) => void;
}

const PRESET_LOGOS = [
  {
    name: 'iHerb',
    nameFa: 'آی‌هرب',
    brandColor: '#458500',
    url: 'https://ae.iherb.com',
    badge: 'ضمانت اصالت ۱۰۰٪',
    subtitle: 'انبار مرکزی و رسمی آی‌هرب',
    description: 'بزرگترین مرجع جهانی مکمل، ویتامین و سلامت طبیعی با ارسال مستقیم از امارات و دبی',
    ctaText: 'محاسبه و خرید از iHerb',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="%23458500"/><text x="100" y="118" text-anchor="middle" fill="%23FFFFFF" font-weight="900" font-size="54" font-family="Arial,sans-serif" letter-spacing="-1">iHerb</text><path d="M50 145 Q 100 162 150 145" stroke="%23A0D636" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="150" cy="145" r="4" fill="%23A0D636"/></svg>'
  },
  {
    name: 'GNC',
    nameFa: 'جی‌ان‌سی امارات',
    brandColor: '#dc2626',
    url: 'https://gnc-mena.com/',
    badge: 'ضمانت ۱۰۰٪ اورجینال',
    subtitle: 'نمایندگی رسمی GNC',
    description: 'نمایندگی رسمی برند جهانی GNC در امارات - انواع مولتی‌ویتامین‌ها و مکمل‌های سلامتی',
    ctaText: 'محاسبه و خرید از GNC',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="%23ffffff"/><text x="100" y="115" text-anchor="middle" fill="%23E31837" font-weight="900" font-size="70" font-family="Arial,sans-serif" letter-spacing="-2">GNC</text><text x="100" y="145" text-anchor="middle" fill="%23E31837" font-weight="800" font-size="20" font-family="Arial,sans-serif" letter-spacing="4">LIVE WELL</text></svg>'
  },
  {
    name: 'Life Pharmacy',
    nameFa: 'داروخانه لایف',
    brandColor: '#1e40af',
    url: 'https://www.lifepharmacy.com',
    badge: 'داروخانه آنلاین دبی',
    subtitle: 'داروخانه آنلاین دبی',
    description: 'بزرگترین زنجیره داروخانه آنلاین دبی - داروها، ویتامین‌ها و مکمل‌های معتبر',
    ctaText: 'محاسبه و خرید از Life',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="%23ffffff"/><path d="M100 15 C56 15 40 42 40 70 V135 H160 V70 C160 42 144 15 100 15 Z" fill="%231C3F94"/><circle cx="100" cy="55" r="9" fill="%23FFFFFF"/><path d="M100 68 C84 80 72 84 64 110 H136 C128 84 116 80 100 68 Z" fill="%23FFFFFF"/><text x="100" y="172" text-anchor="middle" fill="%23C42582" font-weight="900" font-size="36" font-family="sans-serif">LIFE%C2%AE</text></svg>'
  },
  {
    name: 'Dr Nutrition',
    nameFa: 'دکتر نوتریشن',
    brandColor: '#9333ea',
    url: 'https://www.drnutrition.com/en-ae',
    badge: 'تخفیف ویژه دبی',
    subtitle: 'بزرگترین مرجع مکمل دبی',
    description: 'بزرگترین مرجع تخصصی مکمل‌های ورزشی، ویتامین و پروتئین ایزوله در امارات',
    ctaText: 'محاسبه و خرید از DNP',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" rx="24" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif" letter-spacing="-6">dnp</text><path d="M50 120 C 90 70, 135 40, 175 28 C 150 65, 110 110, 75 130 Z" fill="%2378BE20"/><path d="M60 112 Q 115 65, 163 35" stroke="%235A9614" stroke-width="3" fill="none"/></svg>'
  },
  {
    name: 'Sporter',
    nameFa: 'اسپورتر',
    brandColor: '#f59e0b',
    url: 'https://www.sporter.com/en-ae',
    badge: 'تخفیف باشگاهی',
    subtitle: 'فروشگاه تخصصی فیتنس و مکمل',
    description: 'تنوع بی‌نظیر مکمل‌های ورزشی و پوشاک تمرینی اصل با ارسال مستقیم از دبی',
    ctaText: 'محاسبه و خرید از Sporter',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="%230f172a"/><text x="100" y="118" text-anchor="middle" fill="%23F59E0B" font-weight="900" font-size="44" font-family="Arial,sans-serif">SPORTER</text></svg>'
  },
  {
    name: 'Amazon UAE',
    nameFa: 'آمازون امارات',
    brandColor: '#d97706',
    url: 'https://www.amazon.ae',
    badge: 'ارسال پرایم',
    subtitle: 'فروشگاه آنلاین آمازون دبی',
    description: 'خرید انواع مکمل‌های کمیاب و محصولات بین‌المللی از سایت آمازون امارات',
    ctaText: 'محاسبه و خرید از Amazon',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="%23232F3E"/><text x="100" y="105" text-anchor="middle" fill="%23FFFFFF" font-weight="900" font-size="38" font-family="sans-serif">amazon</text><text x="100" y="132" text-anchor="middle" fill="%23FF9900" font-weight="800" font-size="22" font-family="sans-serif">.ae</text><path d="M50 145 Q 100 165 150 145" stroke="%23FF9900" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M142 138 L 152 146 L 140 152 Z" fill="%23FF9900"/></svg>'
  },
  {
    name: 'Noon Dubai',
    nameFa: 'نون دبی',
    brandColor: '#eab308',
    url: 'https://www.noon.com/uae-en',
    badge: 'نون اکسپرس',
    subtitle: 'فروشگاه بزرگ نون امارات',
    description: 'خرید مستقیم از فروشگاه بزرگ نون دبی با تحویل اکسپرس',
    ctaText: 'محاسبه و خرید از Noon',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="%23FEE600"/><text x="100" y="120" text-anchor="middle" fill="%23000000" font-weight="900" font-size="60" font-family="Arial,sans-serif">noon</text></svg>'
  }
];

export const StoreCardAdmin: React.FC<StoreCardAdminProps> = ({
  store,
  index,
  onUpdateField,
  onDelete,
  onApplyPreset
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [imgError, setImgError] = useState(false);

  const currentLogo = store.logoUrl || store.image || '';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری (PNG, JPG, SVG, WEBP) انتخاب کنید.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateField(store.id, 'logoUrl', dataUrl);
        onUpdateField(store.id, 'image', dataUrl);
        setImgError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (preset: typeof PRESET_LOGOS[0]) => {
    if (onApplyPreset) {
      onApplyPreset(store.id, {
        nameFa: preset.nameFa,
        nameEn: preset.name,
        title: preset.nameFa,
        shortTitle: preset.name,
        logoUrl: preset.logoUrl,
        image: preset.logoUrl,
        brandColor: preset.brandColor,
        url: preset.url,
        badge: preset.badge,
        subtitle: preset.subtitle,
        description: preset.description,
        orderCtaText: preset.ctaText,
        ctaText: preset.ctaText
      });
    } else {
      onUpdateField(store.id, 'logoUrl', preset.logoUrl);
      onUpdateField(store.id, 'image', preset.logoUrl);
      onUpdateField(store.id, 'brandColor', preset.brandColor);
      onUpdateField(store.id, 'url', preset.url);
      onUpdateField(store.id, 'badge', preset.badge);
      onUpdateField(store.id, 'title', preset.nameFa);
      onUpdateField(store.id, 'shortTitle', preset.name);
      onUpdateField(store.id, 'nameFa', preset.nameFa);
      onUpdateField(store.id, 'nameEn', preset.name);
      onUpdateField(store.id, 'subtitle', preset.subtitle);
      onUpdateField(store.id, 'description', preset.description);
      onUpdateField(store.id, 'ctaText', preset.ctaText);
      onUpdateField(store.id, 'orderCtaText', preset.ctaText);
    }
    setImgError(false);
  };

  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4 font-['Vazirmatn',sans-serif]">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs">
            {index + 1}
          </span>
          <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <Store className="w-4 h-4 text-emerald-600" />
            <span>{store.nameFa || store.title || 'فروشگاه جدید'}</span>
            {store.nameEn && (
              <span className="text-xs text-slate-400 font-normal dir-ltr font-mono">({store.nameEn})</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active / Enabled Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextVal = store.isActive === false || store.enabled === false ? true : false;
              onUpdateField(store.id, 'isActive', nextVal);
              onUpdateField(store.id, 'enabled', nextVal);
            }}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              store.isActive !== false && store.enabled !== false
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            {store.isActive !== false && store.enabled !== false ? '✓ فعال در سایت' : '✕ غیرفعال (مخفی)'}
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDelete(store.id)}
            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
            title="حذف این فروشگاه"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. INTERACTIVE LOGO MANAGEMENT BLOCK */}
      <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Interactive Live Preview Box */}
          <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 group shadow-2xs">
            {currentLogo && !imgError ? (
              <img
                src={currentLogo}
                alt={store.nameFa || store.title || 'لوگوی فروشگاه'}
                className="w-full h-full object-contain p-1"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-[10px] text-slate-400 font-bold text-center px-1">بدون لوگو</span>
            )}

            {/* Hover overlay with clear trigger */}
            {currentLogo && (
              <button
                type="button"
                onClick={() => {
                  onUpdateField(store.id, 'logoUrl', '');
                  onUpdateField(store.id, 'image', '');
                  setImgError(false);
                }}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                title="حذف لوگو"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
              </button>
            )}
          </div>

          {/* Editable Logo URL Input & Action Row */}
          <div className="flex-1 w-full flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>آدرس لینک لوگوی فروشگاه (URL / SVG / DataURI):</span>
              </label>
              <span className="text-[10px] text-slate-400">تغییر زنده و لحظه‌ای</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentLogo}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateField(store.id, 'logoUrl', val);
                  onUpdateField(store.id, 'image', val);
                  setImgError(false);
                }}
                placeholder="https://example.com/logo.png یا فرمت SVG / DataURI"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white dir-ltr font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />

              {/* Upload trigger button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-800 dark:text-zinc-100 text-xs font-bold rounded-lg flex items-center gap-1 transition cursor-pointer shrink-0"
                title="بارگذاری تصویر لوگو از سیستم"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">انتخاب فایل</span>
              </button>

              {/* Clear button */}
              {currentLogo && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateField(store.id, 'logoUrl', '');
                    onUpdateField(store.id, 'image', '');
                    setImgError(false);
                  }}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1 transition cursor-pointer shrink-0"
                  title="حذف آدرس لوگو"
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preset quick-apply logo buttons */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
          <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>لوگو و قالب‌های آماده فروشگاه‌ها (کلیک سریع جهت پر کردن خودکار):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_LOGOS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  store.nameEn === p.name || store.shortTitle === p.name
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                    : 'bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.brandColor }} />
                <span>{p.nameFa} ({p.name})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. STORE METADATA & CONTENT FIELDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            نام فارسی فروشگاه:
          </label>
          <input
            type="text"
            value={store.nameFa || store.title || ''}
            onChange={(e) => {
              onUpdateField(store.id, 'nameFa', e.target.value);
              onUpdateField(store.id, 'title', e.target.value);
            }}
            placeholder="مثال: آی‌هرب دبی"
            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            نام لاتین / برند (Brand / Slug):
          </label>
          <input
            type="text"
            value={store.nameEn || store.shortTitle || ''}
            onChange={(e) => {
              onUpdateField(store.id, 'nameEn', e.target.value);
              onUpdateField(store.id, 'shortTitle', e.target.value);
              if (!store.slug) {
                onUpdateField(store.id, 'slug', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
              }
            }}
            placeholder="مثال: iHerb"
            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs px-3 py-2 rounded-lg focus:outline-none dir-ltr font-mono"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            لینک وبسایت فروشگاه (Direct URL):
          </label>
          <input
            type="text"
            value={store.url || ''}
            onChange={(e) => onUpdateField(store.id, 'url', e.target.value)}
            placeholder="https://ae.iherb.com"
            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs px-3 py-2 rounded-lg focus:outline-none dir-ltr font-mono"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            زیرعنوان / شعار کوتاه:
          </label>
          <input
            type="text"
            value={store.subtitle || ''}
            onChange={(e) => onUpdateField(store.id, 'subtitle', e.target.value)}
            placeholder="مثال: انبار مرکزی و رسمی آی‌هرب"
            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs px-3 py-2 rounded-lg focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            بج و تگ برجسته (Badge):
          </label>
          <input
            type="text"
            value={store.badge || ''}
            onChange={(e) => onUpdateField(store.id, 'badge', e.target.value)}
            placeholder="مثال: ضمانت اصالت ۱۰۰٪"
            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs px-3 py-2 rounded-lg focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            متن روی دکمه اقدام (CTA Button Text):
          </label>
          <input
            type="text"
            value={store.orderCtaText || store.ctaText || ''}
            onChange={(e) => {
              onUpdateField(store.id, 'orderCtaText', e.target.value);
              onUpdateField(store.id, 'ctaText', e.target.value);
            }}
            placeholder={`پیش‌فرض: محاسبه و خرید از ${store.nameFa || store.title || 'فروشگاه'}`}
            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs px-3 py-2 rounded-lg focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            توضیحات معرفی کارت فروشگاه:
          </label>
          <input
            type="text"
            value={store.description || ''}
            onChange={(e) => onUpdateField(store.id, 'description', e.target.value)}
            placeholder="توضیحات کوتاه درباره برندها و محصولات موجود در این فروشگاه..."
            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs px-3 py-2 rounded-lg focus:outline-none"
          />
        </div>
      </div>

      {/* 3. BRAND COLOR PICKER & LIVE CARD PREVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* Brand color selector */}
        <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200/80 dark:border-zinc-700 space-y-2">
          <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 block">
            رنگ سازمانی و برند (Brand Color):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={store.brandColor || '#111111'}
              onChange={(e) => onUpdateField(store.id, 'brandColor', e.target.value)}
              className="w-8 h-8 rounded-lg border border-slate-300 dark:border-zinc-700 p-0.5 cursor-pointer shrink-0 bg-white"
            />
            <input
              type="text"
              value={store.brandColor || '#111111'}
              onChange={(e) => onUpdateField(store.id, 'brandColor', e.target.value)}
              className="w-28 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs px-2.5 py-1.5 rounded-lg dir-ltr font-mono text-center font-bold"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {['#458500', '#dc2626', '#1e40af', '#9333ea', '#f59e0b', '#0f172a', '#111111'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdateField(store.id, 'brandColor', c)}
                  className={`w-6 h-6 rounded-full border cursor-pointer transition ${
                    (store.brandColor || '#111111').toLowerCase() === c.toLowerCase()
                      ? 'ring-2 ring-emerald-500 scale-110'
                      : 'border-black/10 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Live Mini Preview Box */}
        <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200/80 dark:border-zinc-700 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <Eye className="w-3.5 h-3.5" />
              <span>پیش‌نمایش کارت در صفحه اصلی:</span>
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-2xs flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h5 className="font-extrabold text-xs truncate" style={{ color: store.brandColor || '#111111' }}>
                {store.nameFa || store.title || 'نام فروشگاه'}
              </h5>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                {store.subtitle || store.description || 'توضیحات کوتاه فروشگاه'}
              </p>
            </div>

            <div
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden p-1 shrink-0 bg-white"
            >
              {currentLogo && !imgError ? (
                <img src={currentLogo} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[8px] text-slate-400 font-bold">لوگو</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
