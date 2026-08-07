import React, { useState, useEffect } from 'react';
import { Settings, Image, DollarSign, Package, Save, CheckCircle2, RefreshCw, Upload, Layers, Store, Megaphone, ShieldAlert } from 'lucide-react';
import { FinancialSettings, CmsConfig, PricingRulesConfig } from '../types';
import { getSettingsFromFirestore, saveSettingsToFirestore, saveCmsToFirestore, getCmsFromFirestore } from '../firebase';
import { PricingRulesAdmin } from './PricingRulesAdmin';

interface AdminPanelProps {
  settings: FinancialSettings;
  onUpdateSettings: (newSettings: FinancialSettings) => void;
  cms?: CmsConfig | null;
  onUpdateCms?: (newCms: CmsConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings,
  onUpdateSettings,
  cms,
  onUpdateCms
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'rules' | 'general' | 'deals' | 'inventory'>('rules');

  const [aedRate, setAedRate] = useState<number>(settings.aedRate || 53000);
  const [logoUrl, setLogoUrl] = useState<string>(cms?.logoUrl || '');
  const [heroImage, setHeroImage] = useState<string>(cms?.heroImage || '');
  const [homeContent, setHomeContent] = useState<any>(cms?.homeContent || {});
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      const cmsData = await getCmsFromFirestore();
      if (cmsData) {
        if (cmsData.logoUrl) setLogoUrl(cmsData.logoUrl);
        if (cmsData.heroImage) setHeroImage(cmsData.heroImage);
        if (cmsData.homeContent) setHomeContent(cmsData.homeContent);
      }
      const settingsData = await getSettingsFromFirestore();
      if (settingsData && settingsData.aedRate) {
        setAedRate(settingsData.aedRate);
      }
    };
    loadData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 3) {
        alert('حجم عکس انتخابی نباید بیشتر از ۳ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedSettings = {
      ...settings,
      aedRate,
      updatedAt: new Date().toISOString()
    };

    const updatedCms = {
      ...cms,
      logoUrl,
      heroImage,
      homeContent
    };

    try {
      await saveSettingsToFirestore(updatedSettings);
      await saveCmsToFirestore(updatedCms);

      onUpdateSettings(updatedSettings);
      if (onUpdateCms) onUpdateCms(updatedCms as any);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) {
      console.error('Error saving to Firestore:', e);
      alert('خطا در ذخیره‌سازی اطلاعات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-slate-800 dir-rtl">
      {/* تب‌های اصلی مدیریت */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
        <button
          onClick={() => setActiveAdminTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer shrink-0 ${
            activeAdminTab === 'rules'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4 text-amber-400" />
          <span>قوانین قیمت‌گذاری و نرخ درهم</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer shrink-0 ${
            activeAdminTab === 'general'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Image className="w-4 h-4 text-sky-400" />
          <span>مدیریت لوگو، بنر و محتوای خانه</span>
        </button>
      </div>

      {/* نمایش بخش قوانین قیمت‌گذاری در تب اول */}
      {activeAdminTab === 'rules' && (
        <PricingRulesAdmin
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          cms={cms}
          onUpdateCms={onUpdateCms}
        />
      )}

      {/* نمایش بخش تنظیمات عمومی و لوگو در تب دوم */}
      {activeAdminTab === 'general' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-6 text-right">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-base text-slate-900">تنظیمات ظاهر، لوگو و بنر اصلی</h3>
            <button
              onClick={handleSaveGeneral}
              disabled={isSaving}
              className="bg-slate-900 hover:bg-black text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>ذخیره در فایربیس</span>
            </button>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تغییرات ظاهر با موفقیت در فایربیس ثبت شد.</span>
            </div>
          )}

          <div className="space-y-5 text-xs">
            {/* ۱. آپلود لوگو از گوشی */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <label className="font-extrabold text-slate-800 block">تصویر لوگوی سایت (Logo):</label>
              
              {logoUrl && (
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                  <img src={logoUrl} alt="Logo Preview" className="h-10 w-auto object-contain" />
                  <span className="text-[11px] text-slate-500 font-bold">پیش‌نمایش لوگوی فعال</span>
                </div>
              )}

              <label className="bg-white border border-dashed border-slate-300 hover:border-slate-800 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-slate-700 font-bold transition">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>انتخاب عکس لوگو از گالری گوشی</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setLogoUrl)}
                  className="hidden"
                />
              </label>
              
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="یا لینک مستقیم عکس (https://...)"
                className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-left dir-ltr font-mono text-[11px]"
              />
            </div>

            {/* ۲. آپلود بنر اصلی بالای سایت از گوشی */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <label className="font-extrabold text-slate-800 block">بنر اصلی بالای سایت (Hero Banner):</label>
              
              {(heroImage || homeContent?.heroImageUrl) && (
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <img src={heroImage || homeContent?.heroImageUrl} alt="Banner Preview" className="w-full h-28 object-cover rounded-lg" />
                </div>
              )}

              <label className="bg-white border border-dashed border-slate-300 hover:border-slate-800 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-slate-700 font-bold transition">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>انتخاب عکس بنر اصلی از گالری گوشی</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, (url) => {
                    setHeroImage(url);
                    setHomeContent((prev: any) => ({ ...prev, heroImageUrl: url }));
                  })}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};