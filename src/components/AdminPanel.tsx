import React, { useState, useEffect } from 'react';
import { Settings, Image, DollarSign, Package, Save, CheckCircle2, RefreshCw, Upload, Sparkles } from 'lucide-react';
import { FinancialSettings, CmsConfig } from '../types';
import { getSettingsFromFirestore, saveSettingsToFirestore, saveCmsToFirestore, getCmsFromFirestore } from '../firebase';

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
  const [aedRate, setAedRate] = useState<number>(settings.aedRate || 53000);
  const [logoUrl, setLogoUrl] = useState<string>(cms?.logoUrl || '');
  const [heroImage, setHeroImage] = useState<string>(cms?.heroImage || '');
  const [homeContent, setHomeContent] = useState<any>(cms?.homeContent || {});
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // لود اولیه از فایربیس
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

  // تابع تبدیل فایل انتخابی از گوشی به کد قابل ذخیره در فایربیس
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 3) {
        alert('حجم عکس انتخابی نباید بیشتر از ۳ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Result = reader.result as string;
        setter(base64Result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
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
      // ذخیره مستقیم در فایربیس
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
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 text-right font-['Vazirmatn',sans-serif]">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="font-black text-lg text-slate-900">مدیریت عکس‌ها، لوگو و بنرهای سایت</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-slate-900 hover:bg-black text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>ذخیره نهایی در فایربیس</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تمام بنرها و عکس‌های جدید با موفقیت در فایربیس ذخیره شدند و با رفرش شدن پاک نخواهند شد.</span>
        </div>
      )}

      <div className="space-y-6 text-xs">
        {/* ۱. آپلود لوگو از گوشی */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <label className="font-extrabold text-slate-800 text-sm block">۱. تصویر لوگوی سایت (Logo):</label>
          
          {logoUrl && (
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
              <img src={logoUrl} alt="Logo Preview" className="h-12 w-auto object-contain bg-slate-100 p-1 rounded-lg" />
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
            placeholder="یا چسباندن لینک عکس (https://...)"
            className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-left dir-ltr font-mono text-[11px]"
          />
        </div>

        {/* ۲. آپلود بنر اصلی بالای سایت (Hero Banner) از گوشی */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <label className="font-extrabold text-slate-800 text-sm block">۲. بنر اصلی بالای سایت (Hero Banner):</label>
          
          {(heroImage || homeContent?.heroImageUrl) && (
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <img src={heroImage || homeContent?.heroImageUrl} alt="Banner Preview" className="w-full h-32 object-cover rounded-lg" />
              <span className="text-[11px] text-slate-500 font-bold block mt-1 text-center">پیش‌نمایش بنر فعال بالای سایت</span>
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
          
          <input
            type="text"
            value={heroImage || homeContent?.heroImageUrl || ''}
            onChange={(e) => {
              const val = e.target.value;
              setHeroImage(val);
              setHomeContent((prev: any) => ({ ...prev, heroImageUrl: val }));
            }}
            placeholder="یا چسباندن لینک عکس بنر (https://...)"
            className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-left dir-ltr font-mono text-[11px]"
          />
        </div>

        {/* ۳. نرخ درهم */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <label className="font-extrabold text-slate-800 text-sm block">۳. نرخ فعال درهم (تومان):</label>
          <input
            type="number"
            value={aedRate}
            onChange={(e) => setAedRate(Number(e.target.value))}
            className="w-full bg-white border border-slate-300 p-2.5 rounded-xl font-bold text-slate-900 text-left dir-ltr"
          />
        </div>
      </div>
    </div>
  );
};