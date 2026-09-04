import React, { useState, useEffect } from 'react';
import {
  Layout,
  Sparkles,
  Save,
  RefreshCw,
  Eye,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Flame,
  Tag,
  Clock,
  Sliders,
  Type,
  FileText,
  ShieldCheck,
  Megaphone,
  Bell,
  Upload,
  Trash2
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import type { CmsConfig, PromoPopupConfig } from '../../types';
import { AdminPromoPopupSettings } from '../../components/AdminPromoPopupSettings';
import { getHomeSettings, saveHomeSettings } from '../../services/settingsService';

interface HomePageSettingsAdminProps {
  cms?: CmsConfig | null;
  onSaveCms?: (cms: CmsConfig) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const HomePageSettingsAdmin: React.FC<HomePageSettingsAdminProps> = ({
  cms: initialCms,
  onSaveCms,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'popup'>('content');
  const [isLoadingSettings, setIsLoadingSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sirikfit_home_settings');
      if (cached) return false;
    }
    if (initialCms) return false;
    return true;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local State for CMS Content with eager cache hydration
  const [siteTitle, setSiteTitle] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.siteTitle) return parsed.siteTitle;
        }
      } catch (_) {}
    }
    return (initialCms as any)?.homeContent?.siteTitle || (initialCms as any)?.siteTitle || 'سیریک فیت | مرجع تخصصی خرید مکمل اورجینال از دبی';
  });

  const [brandSlogan, setBrandSlogan] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.brandSlogan) return parsed.brandSlogan;
        }
      } catch (_) {}
    }
    return (initialCms as any)?.homeContent?.brandSlogan || (initialCms as any)?.brandSlogan || 'خرید مستقیم از معتبرترین داروخانه‌ها و نمایندگی‌های امارات';
  });

  const [heroHeading, setHeroHeading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.heroHeading) return parsed.heroHeading;
        }
      } catch (_) {}
    }
    return (initialCms as any)?.homeContent?.heroHeading || 'سفارش مستقیم و بی‌واسطه مکمل از دبی';
  });

  const [heroSubheading, setHeroSubheading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.heroSubheading) return parsed.heroSubheading;
        }
      } catch (_) {}
    }
    return (initialCms as any)?.homeContent?.heroSubheading || 'ارسال سریع به سراسر ایران با ضمانت اصالت ۱۰۰٪ کالا';
  });

  const [showTopPromo, setShowTopPromo] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.showTopPromo !== undefined) return parsed.showTopPromo;
        }
      } catch (_) {}
    }
    return (initialCms as any)?.homeContent?.showTopPromo ?? true;
  });

  const [topPromoText, setTopPromoText] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.topPromoText) return parsed.topPromoText;
        }
      } catch (_) {}
    }
    return (initialCms as any)?.homeContent?.topPromoText || '🔥 تخفیف ویژه بهاره: ۱۰٪ تخفیف هزینه کارگو با کد SIRIKFIT';
  });

  const [bannerImageUrl, setBannerImageUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.bannerImageUrl) return parsed.bannerImageUrl;
        }
      } catch (_) {}
    }
    return (initialCms as any)?.homeContent?.bannerImageUrl || '';
  });

  const [calculatorHeading, setCalculatorHeading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.calculatorHeading) return parsed.calculatorHeading;
        }
      } catch (_) {}
    }
    return (initialCms as any)?.homeContent?.calculatorHeading || 'برآورد هوشمند قیمت و هزینه تحویل';
  });

  const [logoUrl, setLogoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          const cachedLogo = parsed.logoUrl || parsed.headerLogoUrl;
          if (cachedLogo && !cachedLogo.startsWith('blob:')) return cachedLogo;
        }
        const directLogo = localStorage.getItem('sirikfit_logo_url');
        if (directLogo && !directLogo.startsWith('blob:')) return directLogo;
      } catch (_) {}
    }
    const propLogo = (initialCms as any)?.homeContent?.logoUrl || (initialCms as any)?.logoUrl || '';
    return (propLogo && !propLogo.startsWith('blob:')) ? propLogo : '';
  });

  const [previewUrl, setPreviewUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          const cachedLogo = parsed.logoUrl || parsed.headerLogoUrl;
          if (cachedLogo && !cachedLogo.startsWith('blob:')) return cachedLogo;
        }
        const directLogo = localStorage.getItem('sirikfit_logo_url');
        if (directLogo && !directLogo.startsWith('blob:')) return directLogo;
      } catch (_) {}
    }
    const propLogo = (initialCms as any)?.homeContent?.logoUrl || (initialCms as any)?.logoUrl || '';
    return (propLogo && !propLogo.startsWith('blob:')) ? propLogo : '';
  });

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Preserve partner stores & banners so they are never lost on save
  const [preservedStores, setPreservedStores] = useState<any[]>(() => {
    if (Array.isArray(initialCms?.stores) && initialCms.stores.length > 0) return initialCms.stores;
    return [];
  });
  const [preservedBanners, setPreservedBanners] = useState<any[]>(() => {
    if (Array.isArray(initialCms?.homeBanners) && initialCms.homeBanners.length > 0) return initialCms.homeBanners;
    return [];
  });

  const applyHomeData = (homeData: any) => {
    if (!homeData) return;
    if (homeData.siteTitle) setSiteTitle(homeData.siteTitle);
    if (homeData.brandSlogan) setBrandSlogan(homeData.brandSlogan);
    if (homeData.heroHeading) setHeroHeading(homeData.heroHeading);
    if (homeData.heroSubheading) setHeroSubheading(homeData.heroSubheading);
    if (homeData.showTopPromo !== undefined) setShowTopPromo(homeData.showTopPromo);
    if (homeData.topPromoText) setTopPromoText(homeData.topPromoText);
    if (homeData.bannerImageUrl) setBannerImageUrl(homeData.bannerImageUrl);
    if (homeData.calculatorHeading) setCalculatorHeading(homeData.calculatorHeading);
    
    const hLogo = homeData.logoUrl || homeData.headerLogoUrl;
    if (hLogo && !hLogo.startsWith('blob:')) {
      setLogoUrl(hLogo);
      setPreviewUrl(hLogo);
    }

    const stores = homeData.stores || homeData.partnerStores;
    if (Array.isArray(stores) && stores.length > 0) {
      setPreservedStores(stores);
    }

    const banners = homeData.banners || homeData.homeBanners;
    if (Array.isArray(banners) && banners.length > 0) {
      setPreservedBanners(banners);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Initial async load
    const loadSettings = async () => {
      const hasLocal = typeof window !== 'undefined' && localStorage.getItem('sirikfit_home_settings');
      if (!hasLocal && !initialCms) {
        setIsLoadingSettings(true);
      }
      try {
        const homeData = await getHomeSettings();
        if (!isMounted) return;
        applyHomeData(homeData);
      } catch (err) {
        console.warn('Error loading settings in HomePageSettingsAdmin:', err);
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    };
    loadSettings();

    // 2. Real-time snapshot listener on settings/home
    let unsubHome = () => {};
    if (db) {
      try {
        unsubHome = subscribeToHomeSettings((data) => {
          if (!isMounted) return;
          applyHomeData(data);
        });
      } catch (_e) {}
    }

    // 3. Storage and CustomEvent listeners for cross-tab or instant updates
    const handleHomeUpdated = (e: any) => {
      if (!isMounted) return;
      const detail = e?.detail;
      if (detail) applyHomeData(detail);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('homeSettingsUpdated', handleHomeUpdated);
    }

    return () => {
      isMounted = false;
      unsubHome();
      if (typeof window !== 'undefined') {
        window.removeEventListener('homeSettingsUpdated', handleHomeUpdated);
      }
    };
  }, []);

  // Client-side canvas optimizer: shrinks large raw images (even 5MB+) to high-clarity ~40KB Web/Retina size
  const compressLogoFile = (file: File, maxDim = 480, quality = 0.88): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('خطا در خواندن فایل از دستگاه'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('قالب فایل نامعتبر است'));
        img.onload = () => {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const outputMime = isPng ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputMime, isPng ? undefined : quality);
          resolve(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);

    try {
      // 1. Client-side instant canvas compression (turns large images into lightweight ~40KB)
      const compressedDataUrl = await compressLogoFile(file);
      setPreviewUrl(compressedDataUrl);

      let finalUrl = '';

      // 2. Try fast server-side upload to obtain a clean /api/media URL
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: compressedDataUrl,
            fileName: file.name,
            folder: 'branding'
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.url) {
            finalUrl = json.url;
          }
        }
      } catch (proxyErr) {
        console.warn('[Proxy upload notice, fallback to optimized data URL]:', proxyErr);
      }

      // 3. Fail-safe fallback: If server upload is slow or unavailable, use the optimized lightweight data URL directly
      if (!finalUrl) {
        finalUrl = compressedDataUrl;
      }

      // Save uploaded/optimized URL to state
      setLogoUrl(finalUrl);
      setPreviewUrl(finalUrl);
      if (showToast) {
        showToast('تصویر لوگو با موفقیت انتخاب شد. لطفاً دکمه «ذخیره و اعمال تنظیمات» را بزنید.', 'success');
      }
    } catch (err: any) {
      console.error('[Upload Error]:', err);
      if (showToast) {
        showToast(`خطا در بارگذاری تصویر: ${err?.message || 'مشکل در پردازش فایل'}. لطفاً از کادر زیر، آدرس مستقیم تصویر را وارد نمایید.`, 'error');
      }
      setPreviewUrl(logoUrl || '');
    } finally {
      setIsUploadingLogo(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoadingSettings) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const nowIso = new Date().toISOString();
      // Explicitly reject values beginning with blob: before updating Firestore
      const sanitizedLogoUrl = (logoUrl && !logoUrl.startsWith('blob:')) ? logoUrl.trim() : '';

      // Prepare payload preserving partnerStores and banners
      const homeSettingsPayload = {
        siteTitle,
        brandSlogan,
        heroHeading,
        heroSubheading,
        showTopPromo,
        topPromoText,
        bannerImageUrl,
        calculatorHeading,
        logoUrl: sanitizedLogoUrl,
        headerLogoUrl: sanitizedLogoUrl,
        partnerStores: preservedStores,
        stores: preservedStores,
        banners: preservedBanners,
        homeBanners: preservedBanners,
        updatedAt: nowIso
      };

      // 1. Atomically save via settingsService (persists to settings/home and mirrors cms/app)
      await saveHomeSettings(homeSettingsPayload);

      if (db) {
        // 2. Also ensure settings/cms and settings/general are kept consistent
        await Promise.all([
          setDoc(doc(db, 'settings', 'cms'), {
            logoUrl: sanitizedLogoUrl,
            homeContent: { logoUrl: sanitizedLogoUrl },
            updatedAt: nowIso
          }, { merge: true }),
          setDoc(doc(db, 'settings', 'general'), {
            logoUrl: sanitizedLogoUrl,
            updatedAt: nowIso
          }, { merge: true })
        ]);
      }

      if (typeof window !== 'undefined') {
        if (sanitizedLogoUrl) {
          localStorage.setItem('sirikfit_logo_url', sanitizedLogoUrl);
        } else {
          localStorage.removeItem('sirikfit_logo_url');
        }
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { logoUrl: sanitizedLogoUrl } }));
        window.dispatchEvent(new Event('storage'));
      }

      if (onSaveCms) {
        onSaveCms({
          siteTitle,
          brandSlogan,
          heroHeading,
          heroSubheading,
          showTopPromo,
          topPromoText,
          bannerImageUrl,
          calculatorHeading,
          logoUrl: sanitizedLogoUrl,
          stores: preservedStores,
          homeBanners: preservedBanners,
          updatedAt: nowIso
        } as any);
      }

      setSaveSuccess(true);
      if (showToast) showToast('تنظیمات محتوایی، لوگو و بنرهای صفحه اصلی با موفقیت ذخیره شد.', 'success');
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error('Error saving CMS:', err);
      if (showToast) showToast('خطا در ذخیره تنظیمات صفحه اصلی: ' + (err?.message || ''), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-4 shadow-xs font-['Vazirmatn',sans-serif] dir-rtl">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <h3 className="font-black text-slate-900 text-base">در حال بارگذاری تنظیمات صفحه اصلی...</h3>
        <p className="text-xs text-slate-500 font-medium">لطفاً چند لحظه تأمل فرمایید تا اطلاعات از پایگاه داده همگام‌سازی شوند.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-right dir-rtl">
      {/* Header & Sub-Tab Navigation */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Layout className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-900">تنظیمات صفحه اصلی و پاپ‌آپ‌ها</h2>
              <p className="text-xs text-slate-500 font-medium">مدیریت یکپارچه بنرها، نوار اعلانات، هدر اصلی و پاپ‌آپ‌های تبلیغاتی</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'content'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Layout className="w-4 h-4" />
            <span>محتوا، بنرها و هدر اصلی</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('popup')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'popup'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>پاپ‌آپ تبلیغاتی و اطلاعیه</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Content, Banners, Headlines */}
      {activeTab === 'content' && (
        <form onSubmit={handleSaveContent} className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">محتوای متنی و المان‌های ظاهری صفحه اصلی</h3>
                <p className="text-xs text-slate-500 font-medium">تغییرات بلافاصله بر روی صفحه اصلی فروشگاه اعمال خواهد شد.</p>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال ذخیره...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>ذخیره و اعمال تنظیمات</span>
                  </>
                )}
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تغییرات با موفقیت ذخیره و در صفحه اصلی اعمال شد.</span>
              </div>
            )}

            {/* SECTION 1: Top Announcement Bar */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <h4 className="font-extrabold text-xs text-slate-900">نوار اعلانات بالای صفحه (Top Promo Strip)</h4>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTopPromo(!showTopPromo)}
                  className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                    showTopPromo
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {showTopPromo ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                      <span>فعال و در حال نمایش</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-rose-500" />
                      <span>غیرفعال</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">متن نوار اعلانات:</label>
                <input
                  type="text"
                  value={topPromoText}
                  onChange={(e) => setTopPromoText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="متن پیام بالای صفحه اصلی..."
                />
              </div>
            </div>

            {/* SECTION 2: Hero Titles & Slogans */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-indigo-600" />
                <h4 className="font-extrabold text-xs text-slate-900">عناوین و شعار هدر اصلی (Hero Section)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">عنوان اصلی هیرو (H1):</label>
                  <input
                    type="text"
                    value={heroHeading}
                    onChange={(e) => setHeroHeading(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">زیرعنوان هیرو:</label>
                  <input
                    type="text"
                    value={heroSubheading}
                    onChange={(e) => setHeroSubheading(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">عنوان برند در سایت:</label>
                  <input
                    type="text"
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">شعار برند (Slogan):</label>
                  <input
                    type="text"
                    value={brandSlogan}
                    onChange={(e) => setBrandSlogan(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION: Site Header Logo Management */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-extrabold text-xs text-slate-900">مدیریت لوگوی هدر سایت (Header Logo Management)</h4>
                </div>
                {(previewUrl || logoUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('');
                      setPreviewUrl('');
                    }}
                    className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                    title="حذف لوگو و بازگشت به لوگوی پیش‌فرض"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف لوگو</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/80">
                {/* Instant Logo Preview Box */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs relative">
                  {(previewUrl || logoUrl) ? (
                    <img
                      src={previewUrl || logoUrl}
                      alt="پیش‌نمایش لوگوی سایت"
                      referrerPolicy="no-referrer"
                      className="h-12 w-auto object-contain block max-w-full max-h-full"
                      onError={(e) => {
                        e.currentTarget.classList.add('opacity-40');
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] font-bold text-center p-1">
                      <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                      <span>بدون لوگو</span>
                    </div>
                  )}
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Dual Input Controls: Direct URL + Device File Picker */}
                <div className="flex-1 w-full space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    آدرس مستقیم تصویر لوگو یا بارگذاری فایل از موبایل / لپ‌تاپ:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLogoUrl(val);
                        setPreviewUrl(val);
                      }}
                      placeholder="https://... یا انتخاب فایل از دکمه روبرو"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dir-ltr text-right"
                    />
                    <label className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs active:scale-98">
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isUploadingLogo ? 'در حال آپلود...' : 'انتخاب فایل از دستگاه'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    لوگوی جدید بلافاصله پس از ذخیره، در گوشه سمت راست هدر فروشگاه در تمام صفحات نمایش داده خواهد شد.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 3: Banner Image & Estimator Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <h4 className="font-extrabold text-xs text-slate-900">بنر و کادر استعلام قیمت</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">آدرس تصویر بنر هدر (URL):</label>
                  <input
                    type="text"
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">عنوان کادر استعلام قیمت:</label>
                  <input
                    type="text"
                    value={calculatorHeading}
                    onChange={(e) => setCalculatorHeading(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: Promo Popup Modal Management */}
      {activeTab === 'popup' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs">
          <AdminPromoPopupSettings showToast={showToast} />
        </div>
      )}
    </div>
  );
};

export default HomePageSettingsAdmin;
