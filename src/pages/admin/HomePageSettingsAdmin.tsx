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
  Bell
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { CmsConfig, PromoPopupConfig } from '../../types';
import { AdminPromoPopupSettings } from '../../components/AdminPromoPopupSettings';

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local State for CMS Content
  const [siteTitle, setSiteTitle] = useState('سیریک فیت | مرجع تخصصی خرید مکمل اورجینال از دبی');
  const [brandSlogan, setBrandSlogan] = useState('خرید مستقیم از معتبرترین داروخانه‌ها و نمایندگی‌های امارات');
  const [heroHeading, setHeroHeading] = useState('سفارش مستقیم و بی‌واسطه مکمل از دبی');
  const [heroSubheading, setHeroSubheading] = useState('ارسال سریع به سراسر ایران با ضمانت اصالت ۱۰۰٪ کالا');
  const [showTopPromo, setShowTopPromo] = useState(true);
  const [topPromoText, setTopPromoText] = useState('🔥 تخفیف ویژه بهاره: ۱۰٪ تخفیف هزینه کارگو با کد SIRIKFIT');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [calculatorHeading, setCalculatorHeading] = useState('برآورد هوشمند قیمت و هزینه تحویل');

  useEffect(() => {
    const loadCms = async () => {
      try {
        if (db) {
          const docRef = doc(db, 'cms', 'app');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as CmsConfig;
            if (data.siteTitle) setSiteTitle(data.siteTitle);
            if (data.brandSlogan) setBrandSlogan(data.brandSlogan);
            if (data.heroHeading) setHeroHeading(data.heroHeading);
            if (data.heroSubheading) setHeroSubheading(data.heroSubheading);
            if (data.showTopPromo !== undefined) setShowTopPromo(data.showTopPromo);
            if (data.topPromoText) setTopPromoText(data.topPromoText);
            if (data.bannerImageUrl) setBannerImageUrl(data.bannerImageUrl);
            if (data.calculatorHeading) setCalculatorHeading(data.calculatorHeading);
          }
        }
      } catch (err) {
        console.warn('Error loading CMS data in HomePageSettingsAdmin:', err);
      }
    };
    loadCms();
  }, []);

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updatedConfig: Partial<CmsConfig> = {
        siteTitle,
        brandSlogan,
        heroHeading,
        heroSubheading,
        showTopPromo,
        topPromoText,
        bannerImageUrl,
        calculatorHeading,
        updatedAt: new Date().toISOString()
      };

      if (db) {
        const docRef = doc(db, 'cms', 'app');
        await setDoc(docRef, updatedConfig, { merge: true });
      }

      if (onSaveCms) {
        onSaveCms(updatedConfig as CmsConfig);
      }

      setSaveSuccess(true);
      if (showToast) showToast('تنظیمات محتوایی و بنرهای صفحه اصلی با موفقیت ذخیره شد.', 'success');
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving CMS:', err);
      if (showToast) showToast('خطا در ذخیره تنظیمات صفحه اصلی.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

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
