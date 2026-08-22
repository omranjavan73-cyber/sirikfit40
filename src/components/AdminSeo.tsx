import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  Share2,
  BarChart,
  Eye,
  FileCode,
  Tag,
  Link2,
  Smartphone,
  Monitor,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Code2,
  Cpu
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { CmsConfig } from '../types';

interface AdminSeoProps {
  cms?: CmsConfig | null;
  onSave?: (updatedCms: CmsConfig) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export interface SeoSettings {
  siteTitle: string;
  brandSlogan: string;
  metaDescription: string;
  keywords: string;
  googleSiteVerification: string;
  bingSiteVerification?: string;
  yandexVerification?: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  canonicalUrl: string;
  robotsIndexing: 'index, follow' | 'noindex, nofollow' | 'index, nofollow';
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  enableStructuredData: boolean;
  enableProductSchema: boolean;
  enableBreadcrumbSchema: boolean;
}

const DEFAULT_SEO_SETTINGS: SeoSettings = {
  siteTitle: 'سیریک فیت | خرید مستقیم مکمل از دبی | Sirik Fit',
  brandSlogan: 'خرید مستقیم و بدون واسطه انواع مکمل‌های ورزشی، ویتامین و پروتئین اورجینال از امارات با ضمانت اصالت',
  metaDescription: 'فروشگاه آنلاین سیریک فیت؛ مرجع خرید بدون واسطه مکملهای ورزشی، ویتامین و پروتئین اورجینال از نمایندگیهای معتبر دبی با ارسال سریع به سراسر ایران.',
  keywords: 'سیریک فیت, sirikfit, sirikfit.ir, خرید مکمل از دبی, مکمل ورزشی اورجینال, پروتئین وی دبی, خرید ویتامین اصل, خرید پروتئین وی, مکمل اصل دبی',
  googleSiteVerification: '',
  bingSiteVerification: '',
  yandexVerification: '',
  googleAnalyticsId: '',
  googleTagManagerId: '',
  canonicalUrl: 'https://sirikfit.ir',
  robotsIndexing: 'index, follow',
  ogTitle: 'سیریک فیت | خرید مستقیم مکمل از دبی',
  ogDescription: 'مرجع سفارش و تحویل فوری مکملهای اورجینال ورزشی از دبی در ایران.',
  ogImage: 'https://sirikfit.ir/assets/og-preview.jpg',
  enableStructuredData: true,
  enableProductSchema: true,
  enableBreadcrumbSchema: true
};

export const AdminSeo: React.FC<AdminSeoProps> = ({ cms, onSave, showToast }) => {
  const [seo, setSeo] = useState<SeoSettings>(DEFAULT_SEO_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedTag, setCopiedTag] = useState(false);
  const [showJsonLd, setShowJsonLd] = useState(false);

  // Load Initial SEO Settings from CMS / Firestore / LocalStorage
  useEffect(() => {
    const loadSeo = async () => {
      try {
        let loaded: Partial<SeoSettings> | null = null;
        
        // 1. Try from CMS prop
        if ((cms as any)?.seo) {
          loaded = (cms as any).seo;
        }

        // 2. Try Firestore settings/seo
        if (!loaded && db) {
          try {
            const seoDoc = await getDoc(doc(db, 'settings', 'seo'));
            if (seoDoc.exists()) {
              loaded = seoDoc.data() as Partial<SeoSettings>;
            }
          } catch (_e) {}
        }

        // 3. Try LocalStorage
        if (!loaded) {
          const raw = localStorage.getItem('sirikfit_seo_settings');
          if (raw) {
            try { loaded = JSON.parse(raw); } catch (_e) {}
          }
        }

        if (loaded) {
          setSeo(prev => ({
            ...prev,
            ...loaded,
            keywords: Array.isArray(loaded?.keywords) ? loaded.keywords.join(', ') : (loaded?.keywords || prev.keywords)
          }));
        }
      } catch (err) {
        console.warn('Error loading SEO settings:', err);
      }
    };

    loadSeo();
  }, [cms]);

  // Generate Real Schema.org JSON-LD
  const generateSchemaJsonLd = () => {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${seo.canonicalUrl}/#organization`,
          'name': 'سیریک فیت (Sirik Fit)',
          'url': seo.canonicalUrl,
          'logo': {
            '@type': 'ImageObject',
            'url': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600'
          },
          'description': seo.metaDescription,
          'sameAs': [
            'https://instagram.com/sirikfit',
            'https://t.me/sirikfit'
          ]
        },
        {
          '@type': 'WebSite',
          '@id': `${seo.canonicalUrl}/#website`,
          'url': seo.canonicalUrl,
          'name': seo.siteTitle,
          'publisher': {
            '@id': `${seo.canonicalUrl}/#organization`
          },
          'potentialAction': {
            '@type': 'SearchAction',
            'target': `${seo.canonicalUrl}/?search={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        }
      ]
    };
  };

  const handleSaveSeo = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Save to LocalStorage
      localStorage.setItem('sirikfit_seo_settings', JSON.stringify(seo));

      // 2. Save to Firestore `settings/seo`
      if (db) {
        try {
          await setDoc(doc(db, 'settings', 'seo'), {
            ...seo,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (fsErr) {
          console.warn('Error saving to Firestore settings/seo:', fsErr);
        }

        // Also merge into cmsConfig if available
        try {
          await setDoc(doc(db, 'settings', 'cms'), {
            seo: seo
          }, { merge: true });
        } catch (_e) {}
      }

      // 3. Update DOM Meta Tags & JSON-LD dynamically
      try {
        if (seo.siteTitle) document.title = seo.siteTitle;
        
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute('name', 'description');
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', seo.metaDescription);

        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', seo.keywords);

        if (seo.googleSiteVerification) {
          let gVerify = document.querySelector('meta[name="google-site-verification"]');
          if (!gVerify) {
            gVerify = document.createElement('meta');
            gVerify.setAttribute('name', 'google-site-verification');
            document.head.appendChild(gVerify);
          }
          gVerify.setAttribute('content', seo.googleSiteVerification.replace(/<[^>]*>/g, '').trim());
        }

        // Insert or update JSON-LD structured data script
        if (seo.enableStructuredData) {
          let jsonLdScript = document.querySelector('script[type="application/ld+json"]#sirikfit-seo-jsonld');
          if (!jsonLdScript) {
            jsonLdScript = document.createElement('script');
            jsonLdScript.setAttribute('type', 'application/ld+json');
            jsonLdScript.setAttribute('id', 'sirikfit-seo-jsonld');
            document.head.appendChild(jsonLdScript);
          }
          jsonLdScript.textContent = JSON.stringify(generateSchemaJsonLd(), null, 2);
        }
      } catch (_domErr) {}

      setSaveSuccess(true);
      if (showToast) showToast('تنظیمات جامع سئو، متاتگ‌ها و اسکیما با موفقیت ذخیره شد!', 'success');
      if (onSave && cms) {
        onSave({
          ...cms,
          seo: seo
        } as any);
      }
    } catch (err: any) {
      console.error('Error saving SEO settings:', err);
      if (showToast) showToast('خطا در ذخیره سئو: ' + (err.message || 'مشکل ذخیره‌سازی'), 'error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const copySitemapUrl = () => {
    const url = `${seo.canonicalUrl.replace(/\/$/, '')}/sitemap.xml`;
    navigator.clipboard.writeText(url);
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 2000);
    if (showToast) showToast('آدرس نقشه سایت (Sitemap) کپی شد', 'success');
  };

  const descLength = (seo.metaDescription || '').length;

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif]">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              مدیریت سئو و کنسول جستجوی گوگل (SEO & Search Engine Optimization)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              تنظیمات جامع متاتگ‌ها، پیش‌نمایش SERP، احراز هویت سرچ‌کنسول و داده‌های ساختاریافته Schema.org
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveSeo}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold px-6 py-3 rounded-2xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>در حال ذخیره...</span>
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>ذخیره شد!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>ذخیره تنظیمات سئو</span>
            </>
          )}
        </button>
      </div>

      {/* Google SERP Live Search Result Preview */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-600" />
            <h3 className="font-black text-sm text-slate-900">
              پیش‌نمایش زنده در نتایج جستجوی گوگل (Google SERP Snippet)
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${previewDevice === 'desktop' ? 'bg-white text-sky-600 shadow-2xs font-extrabold' : 'text-slate-500'}`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">دسکتاپ</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${previewDevice === 'mobile' ? 'bg-white text-sky-600 shadow-2xs font-extrabold' : 'text-slate-500'}`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">موبایل</span>
            </button>
          </div>
        </div>

        {/* Snippet Card */}
        <div className={`p-4 bg-slate-50 border border-slate-200 rounded-2xl ${previewDevice === 'mobile' ? 'max-w-md mx-auto' : 'w-full'}`}>
          <div className="space-y-1 text-right dir-rtl font-sans">
            <div className="flex items-center gap-2 text-xs text-slate-600 dir-ltr text-left">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px]">
                SF
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs block">سیریک فیت (Sirik Fit)</span>
                <span className="text-[11px] text-slate-500 block truncate max-w-xs">{seo.canonicalUrl}</span>
              </div>
            </div>

            <h4 className="text-base sm:text-lg font-bold text-[#1a0dab] hover:underline cursor-pointer pt-1 leading-snug line-clamp-1">
              {seo.siteTitle || 'سیریک فیت | خرید مستقیم مکمل از دبی'}
            </h4>

            <p className="text-xs text-[#4d5156] leading-relaxed line-clamp-2 pt-0.5">
              {seo.metaDescription || 'توضیحات پیش‌فرض سایت برای موتورهای جستجو...'}
            </p>
          </div>
        </div>
      </div>

      {/* Primary Meta Tags & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Main Title & Slogan */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Tag className="w-4 h-4 text-indigo-600" />
            <span>عنوان صفحه و شعار برند (Title & Slogan)</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                عنوان اصلی سایت (Meta Title):
              </label>
              <input
                type="text"
                value={seo.siteTitle}
                onChange={(e) => setSeo({ ...seo, siteTitle: e.target.value })}
                placeholder="عنوان جذاب برای نمایش در تب مرورگر و نتایج گوگل"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white text-slate-900 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">توصیه گوگل: حداکثر ۶۰ کاراکتر</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                شعار برند (Brand Slogan):
              </label>
              <input
                type="text"
                value={seo.brandSlogan}
                onChange={(e) => setSeo({ ...seo, brandSlogan: e.target.value })}
                placeholder="مثال: تضمین ۱۰۰٪ اصالت و ارسال مستقیم"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white text-slate-900 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  توضیحات متا (Meta Description):
                </label>
                <span className={`text-[10px] font-bold ${descLength > 160 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {descLength} / 160 کاراکتر
                </span>
              </div>
              <textarea
                rows={3}
                value={seo.metaDescription}
                onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })}
                placeholder="خلاصه کامل و جذاب از خدمات و مزایای خرید از سیریک فیت برای نمایش در زیر لینک گوگل"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white text-slate-900 text-xs sm:text-sm p-3 rounded-xl focus:outline-none transition leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                کلمات کلیدی هدف (Meta Keywords - جدا شده با کاما):
              </label>
              <input
                type="text"
                value={seo.keywords}
                onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                placeholder="پروتئین وی, کراتین, مکمل اورجینال, خرید از دبی"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Google & Webmaster Verification */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <BarChart className="w-4 h-4 text-emerald-600" />
            <span>احراز هویت و ابزارهای تحلیلی (Google & Webmasters)</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                کد تایید سرچ کنسول گوگل (google-site-verification):
              </label>
              <input
                type="text"
                dir="ltr"
                value={seo.googleSiteVerification}
                onChange={(e) => setSeo({ ...seo, googleSiteVerification: e.target.value })}
                placeholder="رشته کد احراز هویت سرچ کنسول گوگل"
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 text-xs font-mono px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                شناسه گوگل آنالیتیکس ۴ (GA4 Measurement ID):
              </label>
              <input
                type="text"
                dir="ltr"
                value={seo.googleAnalyticsId}
                onChange={(e) => setSeo({ ...seo, googleAnalyticsId: e.target.value })}
                placeholder="G-XXXXXXXXXX"
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 text-xs font-mono px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                شناسه گوگل تگ منیجر (Google Tag Manager ID):
              </label>
              <input
                type="text"
                dir="ltr"
                value={seo.googleTagManagerId}
                onChange={(e) => setSeo({ ...seo, googleTagManagerId: e.target.value })}
                placeholder="GTM-XXXXXXX"
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 text-xs font-mono px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                آدرس کانونیکال اصلی (Canonical URL):
              </label>
              <input
                type="url"
                dir="ltr"
                value={seo.canonicalUrl}
                onChange={(e) => setSeo({ ...seo, canonicalUrl: e.target.value })}
                placeholder="https://sirikfit.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-900 text-xs font-mono px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Social Media OpenGraph & Indexing Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 3: OpenGraph & Social Sharing */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Share2 className="w-4 h-4 text-purple-600" />
            <span>اشتراک‌گذاری شبکه‌های اجتماعی (OpenGraph & Twitter Card)</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                عنوان اشتراک اجتماعی (og:title):
              </label>
              <input
                type="text"
                value={seo.ogTitle}
                onChange={(e) => setSeo({ ...seo, ogTitle: e.target.value })}
                placeholder="عنوان کارت در واتساپ، تلگرام و توییتر"
                className="w-full bg-slate-50 border border-slate-200 focus:border-purple-600 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                توضیحات اشتراک (og:description):
              </label>
              <textarea
                rows={2}
                value={seo.ogDescription}
                onChange={(e) => setSeo({ ...seo, ogDescription: e.target.value })}
                placeholder="توضیح کوتاه کارت اشتراک"
                className="w-full bg-slate-50 border border-slate-200 focus:border-purple-600 focus:bg-white text-slate-900 text-xs p-3 rounded-xl focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                آدرس تصویر پیش‌نمایش اشتراک (og:image URL):
              </label>
              <input
                type="url"
                dir="ltr"
                value={seo.ogImage}
                onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })}
                placeholder="https://sirikfit.com/banner-og.jpg"
                className="w-full bg-slate-50 border border-slate-200 focus:border-purple-600 focus:bg-white text-slate-900 text-xs font-mono px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Indexing & Structured Data */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-amber-600" />
              <span>ایندکس ربات‌ها و داده‌های ساختاریافته (Schema.org)</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowJsonLd(!showJsonLd)}
              className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition flex items-center gap-1 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showJsonLd ? 'مخفی‌سازی JSON-LD' : 'مشاهده کد JSON-LD'}</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                وضعیت ایندکس در موتورهای جستجو (Robots Indexing):
              </label>
              <select
                value={seo.robotsIndexing}
                onChange={(e) => setSeo({ ...seo, robotsIndexing: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-600 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition cursor-pointer"
              >
                <option value="index, follow">مجاز (index, follow - حالت استاندارد سئو)</option>
                <option value="noindex, nofollow">غیرمجاز (noindex, nofollow - در حالت توسعه/بسته)</option>
                <option value="index, nofollow">ایندکس بدون فالو لینک‌ها (index, nofollow)</option>
              </select>
            </div>

            {/* Schema Switches */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">داده‌های ساختاریافته Organization & WebSite</span>
                  <span className="text-[10px] text-slate-400 block">معرفی رسمی برند و لوگو به گراف دانش گوگل</span>
                </div>
                <input
                  type="checkbox"
                  checked={seo.enableStructuredData}
                  onChange={(e) => setSeo({ ...seo, enableStructuredData: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">اسکیما محصولات و پیشنهادها (Product Schema)</span>
                  <span className="text-[10px] text-slate-400 block">نمایش قیمت و وضعیت موجودی در نتایج ریچ اسنیپت</span>
                </div>
                <input
                  type="checkbox"
                  checked={seo.enableProductSchema}
                  onChange={(e) => setSeo({ ...seo, enableProductSchema: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                />
              </label>
            </div>

            {/* JSON-LD Viewer */}
            {showJsonLd && (
              <div className="p-3 bg-slate-900 rounded-xl text-emerald-400 font-mono text-[11px] dir-ltr overflow-x-auto max-h-48">
                <pre>{JSON.stringify(generateSchemaJsonLd(), null, 2)}</pre>
              </div>
            )}

            {/* Sitemap Helper */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-bold text-amber-900">نقشه سایت (XML Sitemap)</span>
              </div>
              <button
                type="button"
                onClick={copySitemapUrl}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-amber-800 font-bold transition flex items-center gap-1 cursor-pointer"
              >
                {copiedTag ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedTag ? 'کپی شد' : 'کپی آدرس'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
