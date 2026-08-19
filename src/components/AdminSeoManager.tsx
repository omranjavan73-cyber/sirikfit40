import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ExternalLink,
  Save,
  Share2,
  FileCode,
  Tag,
  ShieldCheck,
  RefreshCw,
  Plus,
  X,
  Sparkles,
  Info,
  Smartphone,
  Eye
} from 'lucide-react';
import type { SeoSettings } from '../types/seo';
import { defaultSeoSettings } from '../types/seo';
import { fetchSeoSettingsFromFirestore, saveSeoSettingsToFirestore } from '../firebase';

interface AdminSeoManagerProps {
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminSeoManager: React.FC<AdminSeoManagerProps> = ({ showToast }) => {
  const [seo, setSeo] = useState<SeoSettings>(defaultSeoSettings);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'google' | 'social' | 'schema'>('google');

  useEffect(() => {
    loadSeoSettings();
  }, []);

  const loadSeoSettings = async () => {
    setIsLoading(true);
    try {
      // 1. Try from Firestore
      const firestoreData = await fetchSeoSettingsFromFirestore();
      if (firestoreData) {
        setSeo({ ...defaultSeoSettings, ...firestoreData });
        setIsLoading(false);
        return;
      }

      // 2. Try from REST API
      const res = await fetch('/api/settings/seo');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.seo) {
          setSeo({ ...defaultSeoSettings, ...data.seo });
          setIsLoading(false);
          return;
        }
      }
    } catch (_e) {
      console.warn('Could not load SEO settings, using defaults');
    }

    // 3. Fallback from localStorage
    try {
      const cached = localStorage.getItem('sirikfit_seo_settings');
      if (cached) {
        setSeo({ ...defaultSeoSettings, ...JSON.parse(cached) });
      }
    } catch (_e) {}

    setIsLoading(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    const payload: SeoSettings = {
      ...seo,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin'
    };

    try {
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('sirikfit_seo_settings', JSON.stringify(payload));
      }

      // Save to Firestore
      await saveSeoSettingsToFirestore(payload);

      // Save to API
      try {
        await fetch('/api/settings/seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (_apiErr) {}

      // Dispatch global event for live document head injection
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('seoSettingsUpdated', { detail: payload }));
      }

      if (showToast) {
        showToast('تنظیمات سئو سایت با موفقیت در دیتابیس ذخیره و اعمال شد', 'success');
      }
    } catch (err: any) {
      if (showToast) {
        showToast(`خطا در ذخیره سئو: ${err?.message || 'خطای ناشناخته'}`, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKeyword = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter' && e.key !== ',') return;
    if ('preventDefault' in e) e.preventDefault();

    const clean = newKeywordInput.trim().replace(/^,+|,+$/g, '');
    if (!clean) return;

    if (!seo.metaKeywords.includes(clean)) {
      setSeo(prev => ({
        ...prev,
        metaKeywords: [...prev.metaKeywords, clean]
      }));
    }
    setNewKeywordInput('');
  };

  const handleRemoveKeyword = (tagToRemove: string) => {
    setSeo(prev => ({
      ...prev,
      metaKeywords: prev.metaKeywords.filter(k => k !== tagToRemove)
    }));
  };

  const handleCleanGoogleVerification = (val: string) => {
    // If the admin pastes <meta name="google-site-verification" content="XYZ" /> extract just XYZ
    const match = val.match(/content=["']([^"']+)["']/i);
    if (match && match[1]) {
      setSeo(prev => ({ ...prev, googleVerificationCode: match[1] }));
    } else {
      setSeo(prev => ({ ...prev, googleVerificationCode: val.trim() }));
    }
  };

  // Generate Organization & LocalBusiness JSON-LD Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': seo.enableLocalBusinessSchema ? 'SportsActivityLocation' : 'Organization',
    'name': seo.orgName || 'سیریک فیت',
    'legalName': seo.orgLegalName || 'سیریک فیت',
    'url': seo.canonicalUrl || 'https://sirikfit.ir',
    'logo': seo.orgLogoUrl || 'https://sirikfit.ir/favicon.svg',
    'description': seo.metaDescription,
    'telephone': seo.orgPhone,
    'email': seo.orgEmail,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': seo.storeAddress,
      'addressLocality': seo.storeCity,
      'addressCountry': 'IR'
    },
    'sameAs': [
      seo.orgInstagram,
      seo.orgTelegram,
      seo.orgWhatsapp
    ].filter(Boolean)
  };

  const schemaJsonString = JSON.stringify(organizationSchema, null, 2);

  const copySchemaToClipboard = () => {
    navigator.clipboard.writeText(schemaJsonString);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
    if (showToast) showToast('کد اسکیما JSON-LD در کلیپ‌بورد کپی شد', 'info');
  };

  // Live SEO Health Checklist Calculations
  const descLen = (seo.metaDescription || '').length;
  const isDescOptimal = descLen >= 120 && descLen <= 165;
  const isTitleOptimal = (seo.siteTitleTemplate || '').length >= 30 && (seo.siteTitleTemplate || '').length <= 68;
  const hasCanonical = !!seo.canonicalUrl && seo.canonicalUrl.startsWith('http');
  const hasOgImage = !!seo.ogImageUrl && seo.ogImageUrl.startsWith('http');
  const hasKeywords = (seo.metaKeywords || []).length >= 5;
  const hasGVerification = !!seo.googleVerificationCode && seo.googleVerificationCode.length > 5;
  const hasOrgSchema = seo.enableOrganizationSchema;
  const isIndexable = seo.robotsIndex.includes('index');

  const auditItems = [
    { label: 'عنوان صفحه (Title)', status: isTitleOptimal ? 'pass' : 'warn', tip: isTitleOptimal ? 'طول عنوان استاندارد است (۳۰ تا ۶۸ کاراکتر)' : 'طول عنوان باید بین ۳۰ تا ۶۸ کاراکتر باشد' },
    { label: 'توضیحات متا (Description)', status: isDescOptimal ? 'pass' : (descLen > 0 ? 'warn' : 'fail'), tip: isDescOptimal ? 'طول توضیحات بهینه است (۱۲۰ تا ۱۶۰ کاراکتر)' : 'طول بهینه توضیحات بین ۱۲۰ تا ۱۶۵ کاراکتر است' },
    { label: 'آدرس استاندارد (Canonical URL)', status: hasCanonical ? 'pass' : 'fail', tip: hasCanonical ? `تنظیم شده روی: ${seo.canonicalUrl}` : 'آدرس کانونیکال وارد نشده است' },
    { label: 'کلمات کلیدی اصلی (Keywords)', status: hasKeywords ? 'pass' : 'warn', tip: hasKeywords ? `${seo.metaKeywords.length} کلمه کلیدی تعریف شده` : 'حداقل ۵ کلمه کلیدی اصلی اضافه کنید' },
    { label: 'تصویر پیش‌نمایش اشتراک‌گذاری (OG Image)', status: hasOgImage ? 'pass' : 'warn', tip: hasOgImage ? 'تصویر شبکه‌های اجتماعی معتبر است' : 'آدرس تصویر OpenGraph برای واتساپ/تلگرام ثبت نشده' },
    { label: 'کد تایید Google Search Console', status: hasGVerification ? 'pass' : 'warn', tip: hasGVerification ? 'کد اختصاصی گوگل متصل است' : 'برای پایش آمار در گوگل، کد تایید را وارد کنید' },
    { label: 'داده‌های ساختاریافته (JSON-LD Schema)', status: hasOrgSchema ? 'pass' : 'fail', tip: hasOrgSchema ? 'اسکیمای سازمانی و فروشگاهی فعال است' : 'اسکیما غیرفعال است' },
    { label: 'وضعیت ایندکس و ربات‌ها (Robots)', status: isIndexable ? 'pass' : 'warn', tip: `دستور ربات: ${seo.robotsIndex}` }
  ];

  const passedCount = auditItems.filter(i => i.status === 'pass').length;
  const healthScore = Math.round((passedCount / auditItems.length) * 100);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-600">در حال بارگذاری تنظیمات سئو...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800 font-['Vazirmatn',sans-serif]">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-600 via-teal-700 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-black backdrop-blur-xs">
              <Globe className="w-3.5 h-3.5" />
              <span>مرکز بهینه‌سازی و سئو سایت (SEO Suite)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">مدیریت سئو و متاتگ‌های هوشمند SIRIK FIT</h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 font-medium max-w-2xl">
              تنظیم خودکار عنوان، متاتگ‌های OpenGraph، داده‌های ساختاریافته Schema JSON-LD و کدهای تایید گوگل برای حداکثر رتبه‌گیری در موتورهای جستجو
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات سئو'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEO Health Score & Audit Widget */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">چک‌لیست سلامت سئو (Live SEO Health Score)</h3>
              <p className="text-xs text-slate-500 font-medium">ارزیابی بلادرنگ وضعیت سئوی داخلی سایت</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-500 font-bold block">امتیاز سلامت سئو</span>
              <span className="text-lg font-black text-emerald-600">{healthScore}٪</span>
            </div>
            <div className="w-20 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  healthScore >= 80 ? 'bg-emerald-500' : (healthScore >= 50 ? 'bg-amber-500' : 'bg-rose-500')
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Audit Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {auditItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border text-right transition flex items-start gap-2.5 ${
                item.status === 'pass'
                  ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                  : (item.status === 'warn'
                    ? 'bg-amber-50/50 border-amber-200/80 text-amber-950'
                    : 'bg-rose-50/50 border-rose-200/80 text-rose-950')
              }`}
            >
              {item.status === 'pass' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : item.status === 'warn' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs">{item.label}</h4>
                <p className="text-[11px] opacity-75 truncate mt-0.5">{item.tip}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section A: Global Meta Tags & Identity */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">۱. عنوان، توضیحات و هویت اصلی سایت (Global Meta Tags)</h3>
              <p className="text-xs text-slate-500 font-medium">متن‌های اصلی که در صفحه نتایج جستجوی گوگل نمایش داده می‌شوند</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Title Template */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">الگوی عنوان سایت (Title Tag):</label>
                <span className={`text-[11px] font-mono font-bold ${
                  (seo.siteTitleTemplate || '').length >= 30 && (seo.siteTitleTemplate || '').length <= 65
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}>
                  {(seo.siteTitleTemplate || '').length} کاراکتر (مطلوب: ۳۰ تا ۶۵)
                </span>
              </div>
              <input
                type="text"
                value={seo.siteTitleTemplate}
                onChange={e => setSeo({ ...seo, siteTitleTemplate: e.target.value })}
                placeholder="سیریک فیت | واردات مکملهای اورجینال از دبی"
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl focus:outline-hidden transition"
              />
            </div>

            {/* Meta Description with Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">توضیحات متا (Meta Description):</label>
                <span className={`text-[11px] font-mono font-bold ${
                  descLen >= 120 && descLen <= 165
                    ? 'text-emerald-600'
                    : (descLen > 165 ? 'text-rose-600' : 'text-amber-600')
                }`}>
                  {descLen} از ۱۶۰ کاراکتر
                </span>
              </div>
              <textarea
                rows={3}
                value={seo.metaDescription}
                onChange={e => setSeo({ ...seo, metaDescription: e.target.value })}
                placeholder="توضیحات مختصر و جذاب از خدمات و محصولات سیریک فیت برای نمایش در نتایج گوگل..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white text-slate-900 text-xs sm:text-sm p-3.5 rounded-xl focus:outline-hidden transition leading-relaxed"
              />
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full transition-all ${
                    descLen >= 120 && descLen <= 165
                      ? 'bg-emerald-500'
                      : (descLen > 165 ? 'bg-rose-500' : 'bg-amber-400')
                  }`}
                  style={{ width: `${Math.min(100, (descLen / 160) * 100)}%` }}
                />
              </div>
            </div>

            {/* Meta Keywords Chips Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">کلمات کلیدی متا (Meta Keywords):</label>
              <div className="bg-slate-50 border border-slate-300 rounded-2xl p-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {seo.metaKeywords.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-xl shadow-2xs group"
                    >
                      <Tag className="w-3 h-3 text-emerald-600" />
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(tag)}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={e => setNewKeywordInput(e.target.value)}
                    onKeyDown={handleAddKeyword}
                    placeholder="کلمه کلیدی جدید را بنویسید و Enter بزنید..."
                    className="flex-1 bg-white border border-slate-200 text-xs text-slate-800 px-3 py-2 rounded-xl focus:outline-hidden focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2-Column: Canonical & Robots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">آدرس استاندارد مبنا (Canonical URL Base):</label>
                <input
                  type="url"
                  value={seo.canonicalUrl}
                  onChange={e => setSeo({ ...seo, canonicalUrl: e.target.value })}
                  placeholder="https://sirikfit.ir"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl focus:outline-hidden transition dir-ltr text-left font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">دستور ایندکس ربات‌ها (Robots Meta):</label>
                <select
                  value={seo.robotsIndex}
                  onChange={e => setSeo({ ...seo, robotsIndex: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl focus:outline-hidden transition"
                >
                  <option value="index, follow">index, follow (پیش‌فرض - ایندکس کامل تمام صفحات)</option>
                  <option value="noindex, follow">noindex, follow (عدم نمایش در گوگل ولی دنبال‌کردن لینک‌ها)</option>
                  <option value="noindex, nofollow">noindex, nofollow (مسدود کامل موتورهای جستجو)</option>
                  <option value="index, noarchive">index, noarchive (ایندکس بدون ذخیره کش در گوگل)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Search Engine Verification & Tracking */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">۲. کدهای تایید موتورهای جستجو و ابزارهای تحلیلی (Verification & Analytics)</h3>
              <p className="text-xs text-slate-500 font-medium">اتصال سایت به Google Search Console، Bing Webmaster و ابزارهای آمارگیر</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                کد تایید Google Search Console:
              </label>
              <input
                type="text"
                value={seo.googleVerificationCode}
                onChange={e => handleCleanGoogleVerification(e.target.value)}
                placeholder="مثال: google-site-verification یا کد هش"
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl focus:outline-hidden transition dir-ltr text-left font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">می‌توانید کل تگ meta یا فقط کد content را پیست کنید.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                کد تایید Bing Webmaster Tools:
              </label>
              <input
                type="text"
                value={seo.bingVerificationCode}
                onChange={e => setSeo({ ...seo, bingVerificationCode: e.target.value })}
                placeholder="مثال: msvalidate.01 کد"
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl focus:outline-hidden transition dir-ltr text-left font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                شناسه گوگل آنالیتیکس ۴ (GA4 Measurement ID):
              </label>
              <input
                type="text"
                value={seo.ga4MeasurementId}
                onChange={e => setSeo({ ...seo, ga4MeasurementId: e.target.value })}
                placeholder="G-XXXXXXXXXX"
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl focus:outline-hidden transition dir-ltr text-left font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                شناسه Google Tag Manager (GTM):
              </label>
              <input
                type="text"
                value={seo.gtmContainerId}
                onChange={e => setSeo({ ...seo, gtmContainerId: e.target.value })}
                placeholder="GTM-XXXXXXX"
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl focus:outline-hidden transition dir-ltr text-left font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section C: Social Sharing (Open Graph & Twitter Cards) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">۳. اشتراک‌گذاری در شبکه‌های اجتماعی (Open Graph & Social Cards)</h3>
              <p className="text-xs text-slate-500 font-medium">پیش‌نمایش لینک در واتساپ، تلگرام، اینستاگرام و توییتر</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">عنوان اشتراک‌گذاری (OG Title):</label>
                <input
                  type="text"
                  value={seo.ogTitle}
                  onChange={e => setSeo({ ...seo, ogTitle: e.target.value })}
                  placeholder="سیریک فیت | واردات مکملهای اورجینال از دبی"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-purple-500 focus:bg-white text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">توضیحات اشتراک‌گذاری (OG Description):</label>
                <textarea
                  rows={2}
                  value={seo.ogDescription}
                  onChange={e => setSeo({ ...seo, ogDescription: e.target.value })}
                  placeholder="توضیحات پیش‌نمایش در شبکه‌های اجتماعی..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-purple-500 focus:bg-white text-slate-900 text-xs sm:text-sm p-3 rounded-xl focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">آدرس تصویر پیش‌نمایش (OG Image URL):</label>
                <input
                  type="url"
                  value={seo.ogImageUrl}
                  onChange={e => setSeo({ ...seo, ogImageUrl: e.target.value })}
                  placeholder="https://sirikfit.ir/og-image.jpg"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-purple-500 focus:bg-white text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl focus:outline-hidden transition dir-ltr text-left font-mono"
                />
              </div>
            </div>

            {/* Social Card Preview Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                  <span>پیش‌نمایش کارت تلگرام / واتساپ</span>
                </span>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-w-sm mx-auto">
                  {seo.ogImageUrl ? (
                    <img
                      src={seo.ogImageUrl}
                      alt="OG Preview"
                      className="w-full h-32 object-cover bg-slate-100"
                      onError={e => { (e.currentTarget as any).src = 'https://sirikfit.ir/favicon.svg'; }}
                    />
                  ) : (
                    <div className="w-full h-24 bg-purple-50 flex items-center justify-center text-purple-400 text-xs font-bold">
                      بدون تصویر پیش‌نمایش
                    </div>
                  )}
                  <div className="p-3 text-right">
                    <span className="text-[10px] text-slate-400 font-mono block dir-ltr text-left truncate">
                      {seo.canonicalUrl || 'sirikfit.ir'}
                    </span>
                    <h5 className="font-extrabold text-xs text-slate-900 truncate mt-0.5">
                      {seo.ogTitle || seo.siteTitleTemplate || 'سیریک فیت'}
                    </h5>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                      {seo.ogDescription || seo.metaDescription || 'توضیحات کوتاه سایت...'}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center mt-3">
                این کارت هنگام ارسال لینک در تلگرام، واتساپ و دایرکت اینستاگرام نمایش داده می‌شود.
              </p>
            </div>
          </div>
        </div>

        {/* Section D: Structured Data (JSON-LD Schema Markup) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">۴. نشانه‌گذاری ساختاریافته گوگل (JSON-LD Schema Markup)</h3>
                <p className="text-xs text-slate-500 font-medium">شناساندن کسب‌وکار، لوگو، تلفن پشتیبانی و محصولات به موتورهای جستجو</p>
              </div>
            </div>

            <button
              type="button"
              onClick={copySchemaToClipboard}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedSchema ? 'کپی شد!' : 'کپی اسکیما'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">نام رسمی سازمان / برند:</label>
              <input
                type="text"
                value={seo.orgName}
                onChange={e => setSeo({ ...seo, orgName: e.target.value })}
                placeholder="سیریک فیت"
                className="w-full bg-slate-50 border border-slate-300 focus:border-teal-500 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">تلفن پشتیبانی سازمان:</label>
              <input
                type="text"
                value={seo.orgPhone}
                onChange={e => setSeo({ ...seo, orgPhone: e.target.value })}
                placeholder="09170000000"
                className="w-full bg-slate-50 border border-slate-300 focus:border-teal-500 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-hidden transition dir-ltr text-left font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">ایمیل رسمی:</label>
              <input
                type="email"
                value={seo.orgEmail}
                onChange={e => setSeo({ ...seo, orgEmail: e.target.value })}
                placeholder="support@sirikfit.ir"
                className="w-full bg-slate-50 border border-slate-300 focus:border-teal-500 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-hidden transition dir-ltr text-left font-mono"
              />
            </div>
          </div>

          {/* Social Profiles for Schema */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">آدرس اینستاگرام:</label>
              <input
                type="url"
                value={seo.orgInstagram || ''}
                onChange={e => setSeo({ ...seo, orgInstagram: e.target.value })}
                placeholder="https://instagram.com/sirikfit"
                className="w-full bg-slate-50 border border-slate-300 focus:border-teal-500 focus:bg-white text-slate-900 text-xs px-3.5 py-2 rounded-xl focus:outline-hidden transition dir-ltr text-left font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">کانال یا آیدی تلگرام:</label>
              <input
                type="url"
                value={seo.orgTelegram || ''}
                onChange={e => setSeo({ ...seo, orgTelegram: e.target.value })}
                placeholder="https://t.me/sirikfit"
                className="w-full bg-slate-50 border border-slate-300 focus:border-teal-500 focus:bg-white text-slate-900 text-xs px-3.5 py-2 rounded-xl focus:outline-hidden transition dir-ltr text-left font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">آدرس فروشگاه / انبار مرکزی:</label>
              <input
                type="text"
                value={seo.storeAddress}
                onChange={e => setSeo({ ...seo, storeAddress: e.target.value })}
                placeholder="بندر سیریک، بازار مرکزی"
                className="w-full bg-slate-50 border border-slate-300 focus:border-teal-500 focus:bg-white text-slate-900 text-xs px-3.5 py-2 rounded-xl focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Schema Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <label className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-100 transition">
              <span className="text-xs font-bold text-slate-800">اسکیمای سازمانی (Organization)</span>
              <input
                type="checkbox"
                checked={seo.enableOrganizationSchema}
                onChange={e => setSeo({ ...seo, enableOrganizationSchema: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
              />
            </label>

            <label className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-100 transition">
              <span className="text-xs font-bold text-slate-800">اسکیمای فروشگاه محلی (Store)</span>
              <input
                type="checkbox"
                checked={seo.enableLocalBusinessSchema}
                onChange={e => setSeo({ ...seo, enableLocalBusinessSchema: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
              />
            </label>

            <label className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-100 transition">
              <span className="text-xs font-bold text-slate-800">تولید خودکار اسکیمای محصولات</span>
              <input
                type="checkbox"
                checked={seo.enableProductSchema}
                onChange={e => setSeo({ ...seo, enableProductSchema: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Live Schema Output Preview */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] dir-ltr text-left overflow-x-auto max-h-48">
            <pre>{schemaJsonString}</pre>
          </div>
        </div>

        {/* Floating / Bottom Save Trigger */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'در حال ذخیره تغییرات سئو...' : 'ذخیره نهایی تنظیمات سئو'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
