import React, { useState, useEffect, useRef } from 'react';
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
import { db, sanitizePayloadForFirestore } from '../../firebase';
import type { CmsConfig, PromoPopupConfig } from '../../types';
import { AdminPromoPopupSettings } from '../../components/AdminPromoPopupSettings';
import { getHomeSettings, saveHomeSettings, subscribeToHomeSettings } from '../../services/settingsService';
import { extractLogoUrl, normalizeLogoPayload } from '../../utils/logoHelper';

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
          const found = extractLogoUrl(parsed);
          if (found) return found;
        }
        const cachedCms = localStorage.getItem('sirikfit_cms_config') || localStorage.getItem('omex_home_cms');
        if (cachedCms) {
          const parsed = JSON.parse(cachedCms);
          const found = extractLogoUrl(parsed);
          if (found) return found;
        }
      } catch (_) {}
    }
    return extractLogoUrl(initialCms);
  });

  const [previewUrl, setPreviewUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          const found = extractLogoUrl(parsed);
          if (found) return found;
        }
        const cachedCms = localStorage.getItem('sirikfit_cms_config') || localStorage.getItem('omex_home_cms');
        if (cachedCms) {
          const parsed = JSON.parse(cachedCms);
          const found = extractLogoUrl(parsed);
          if (found) return found;
        }
      } catch (_) {}
    }
    return extractLogoUrl(initialCms);
  });

  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when initialCms loads in parent
  useEffect(() => {
    if (initialCms) {
      const propLogo = extractLogoUrl(initialCms);
      if (propLogo && !logoUrl) {
        setLogoUrl(propLogo);
        setPreviewUrl(propLogo);
      }
    }
  }, [initialCms]);

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
    
    const hLogo = extractLogoUrl(homeData);
    if (hLogo) {
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

    // 1. Initial direct Firestore load
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        let loadedData: any = null;
        if (db) {
          const homeSnap = await getDoc(doc(db, 'settings', 'home')).catch(() => null);
          if (homeSnap && homeSnap.exists()) {
            loadedData = homeSnap.data();
          }

          // Fallback: If logo is missing from settings/home, check cms/app or settings/cms
          if (!extractLogoUrl(loadedData)) {
            const cmsSnap = await getDoc(doc(db, 'cms', 'app')).catch(() => null);
            if (cmsSnap && cmsSnap.exists()) {
              const cmsData = cmsSnap.data();
              const cmsLogo = extractLogoUrl(cmsData);
              if (cmsLogo) {
                loadedData = { ...(loadedData || {}), ...normalizeLogoPayload(cmsLogo) };
              }
            }
          }
        }
        if (!loadedData) {
          loadedData = await getHomeSettings();
        }
        if (isMounted && loadedData) {
          applyHomeData(loadedData);
        }
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

    // 4. Remote save trigger from bottom StickyBottomSaveBar
    const handleRemoteSaveRequest = () => {
      if (!isMounted) return;
      handleSaveContent();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('homeSettingsUpdated', handleHomeUpdated);
      window.addEventListener('requestSaveHomeSettings', handleRemoteSaveRequest);
    }

    return () => {
      isMounted = false;
      unsubHome();
      if (typeof window !== 'undefined') {
        window.removeEventListener('homeSettingsUpdated', handleHomeUpdated);
        window.removeEventListener('requestSaveHomeSettings', handleRemoteSaveRequest);
      }
    };
  }, []);

  // Client-side local file processor: reads file, generates clean Data URL and immediately stages it
  const handleDeviceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name, file.size, file.type);

    // Validate type
    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('لطفاً یک فایل تصویری معتبر (PNG یا JPG) انتخاب فرمایید.', 'error');
      return;
    }

    setIsProcessingFile(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('خطا در خواندن فایل از حافظه دستگاه'));
        reader.onload = () => {
          const rawResult = reader.result as string;
          if (!rawResult) {
            reject(new Error('محتوای فایل خالی است'));
            return;
          }

          const img = new Image();
          img.onerror = () => {
            // Fallback: if Image element decoding fails, return standard reader output
            resolve(rawResult);
          };
          img.onload = () => {
            try {
              const maxWidth = 400;
              const maxHeight = 120;
              let width = img.naturalWidth || img.width;
              let height = img.naturalHeight || img.height;

              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
              }

              const canvas = document.createElement('canvas');
              canvas.width = Math.max(1, width);
              canvas.height = Math.max(1, height);
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(rawResult);
                return;
              }

              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.svg');
              let resultUrl = '';
              try {
                resultUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.85);
              } catch (_e) {
                resultUrl = rawResult;
              }
              resolve(resultUrl || rawResult);
            } catch (_err) {
              resolve(rawResult);
            }
          };
          img.src = rawResult;
        };
        reader.readAsDataURL(file);
      });

      if (dataUrl) {
        console.log('Staged logo dataUrl length:', dataUrl.length);
        setLogoUrl(dataUrl);
        setPreviewUrl(dataUrl);
        if (showToast) {
          showToast('تصویر لوگو از دستگاه با موفقیت انتخاب شد. لطفاً دکمه «ذخیره و اعمال تنظیمات» را بزنید.', 'success');
        }
      }
    } catch (err: any) {
      console.error('Error processing device file:', err);
      if (showToast) {
        showToast('خطا در پردازش تصویر لوگو: ' + (err?.message || 'لطفاً تصویر دیگری را انتخاب کنید'), 'error');
      }
    } finally {
      setIsProcessingFile(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSaveContent = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (isLoadingSettings) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const nowIso = new Date().toISOString();
      const cleanLogo = extractLogoUrl(logoUrl);
      const logoAliases = cleanLogo ? normalizeLogoPayload(cleanLogo) : { logoUrl: '', headerLogoUrl: '', logo: '', headerLogo: '' };

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
        ...logoAliases,
        partnerStores: preservedStores,
        stores: preservedStores,
        banners: preservedBanners,
        homeBanners: preservedBanners,
        updatedAt: nowIso
      };

      // 1. Direct atomic write to settings/home in Firestore
      const cleanHome = sanitizePayloadForFirestore(homeSettingsPayload);
      console.log('Writing homeSettingsPayload to Firestore settings/home:', {
        logoUrl: cleanHome.logoUrl,
        updatedAt: nowIso
      });
      if (db) {
        await Promise.all([
          setDoc(doc(db, 'settings', 'home'), cleanHome, { merge: true }),
          setDoc(doc(db, 'cms', 'app'), cleanHome, { merge: true }),
          setDoc(doc(db, 'settings', 'cms'), sanitizePayloadForFirestore({
            ...logoAliases,
            homeContent: {
              ...homeSettingsPayload,
              ...logoAliases
            },
            updatedAt: nowIso
          }), { merge: true }),
          setDoc(doc(db, 'settings', 'general'), sanitizePayloadForFirestore({
            ...logoAliases,
            updatedAt: nowIso
          }), { merge: true })
        ]);
      }

      // 2. Also execute saveHomeSettings service helper
      await saveHomeSettings(homeSettingsPayload);

      // 3. Immediate local cache and event broadcasts
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sirikfit_home_settings', JSON.stringify(homeSettingsPayload));
          window.dispatchEvent(new CustomEvent('homeSettingsUpdated', { detail: homeSettingsPayload }));
          window.dispatchEvent(new CustomEvent('homeSettingsSaveCompleted', { detail: { success: true } }));
          window.dispatchEvent(new Event('storage'));
        } catch (_e) {}
      }

      // 4. Parent callback with full homeContent populated
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
          ...logoAliases,
          homeContent: {
            ...homeSettingsPayload,
            ...logoAliases
          },
          stores: preservedStores,
          homeBanners: preservedBanners,
          updatedAt: nowIso
        } as any);
      }

      setSaveSuccess(true);
      if (showToast) showToast('تنظیمات محتوایی و لوگوی صفحه اصلی با موفقیت در دیتابیس ذخیره شد.', 'success');
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
                  {isProcessingFile && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Input Controls: Primary Device File Picker + Secondary Direct URL */}
                <div className="flex-1 w-full space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingFile}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-black rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {isProcessingFile ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Upload className="w-4 h-4 text-white" />
                      )}
                      <span>{isProcessingFile ? 'در حال پردازش تصویر...' : 'انتخاب فایل از دستگاه (گوشی یا لپ‌تاپ)'}</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleDeviceFileSelect}
                      disabled={isProcessingFile}
                      className="hidden"
                    />

                    <span className="text-[11px] text-slate-400 font-bold text-center sm:text-right">یا</span>

                    <div className="flex-1">
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          const clean = extractLogoUrl(val);
                          setLogoUrl(clean);
                          setPreviewUrl(clean);
                        }}
                        placeholder="آدرس مستقیم تصویر اینترنتی (اختیاری): https://..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dir-ltr text-right"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-medium">
                    با کلیک روی «انتخاب فایل از دستگاه»، عکس لوگو از گالری گوشی یا کامپیوتر بارگذاری و بلافاصله به ابعاد استاندارد هدر بهینه‌سازی می‌شود.
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
