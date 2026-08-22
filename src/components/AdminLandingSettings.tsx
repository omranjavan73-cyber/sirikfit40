import React, { useState } from 'react';
import {
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  Headphones,
  FileText,
  Mail,
  Send,
  Phone,
  Clock,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  Check
} from 'lucide-react';
import type { CmsConfig, LandingContentSettings, ServicePillarItem, TermItem } from '../types';
import { DEFAULT_LANDING_CONTENT } from '../types';

interface AdminLandingSettingsProps {
  cms: CmsConfig | null;
  onSaveCms: (updatedCms: CmsConfig) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const AdminLandingSettings: React.FC<AdminLandingSettingsProps> = ({
  cms,
  onSaveCms,
  showToast
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [landing, setLanding] = useState<LandingContentSettings>(() => {
    return {
      ...DEFAULT_LANDING_CONTENT,
      ...(cms?.landingContent || {})
    };
  });

  const handleToggle = (key: keyof LandingContentSettings) => {
    setLanding(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleChange = (key: keyof LandingContentSettings, value: any) => {
    setLanding(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleServiceChange = (index: number, field: keyof ServicePillarItem, val: string) => {
    setLanding(prev => {
      const list = [...(prev.servicesList || DEFAULT_LANDING_CONTENT.servicesList)];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, servicesList: list };
    });
  };

  const handleTermChange = (index: number, field: keyof TermItem, val: string) => {
    setLanding(prev => {
      const list = [...(prev.termsList || DEFAULT_LANDING_CONTENT.termsList)];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, termsList: list };
    });
  };

  const handleResetToDefault = () => {
    if (window.confirm('آیا از بازگردانی تمامی متون و تنظیمات لندینگ به حالت پیش‌فرض اطمینان دارید؟')) {
      setLanding({ ...DEFAULT_LANDING_CONTENT });
      showToast('تنظیمات به حالت پیش‌فرض بازگردانی شد', 'success');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedCms: CmsConfig = {
        ...(cms || ({} as any)),
        landingContent: landing,
        // Sync shared fields with homeContent for backward compatibility
        homeContent: {
          ...(cms?.homeContent || ({} as any)),
          telegramHandle: landing.supportTelegram,
          telegramLink: landing.supportTelegramLink || `https://t.me/${landing.supportTelegram.replace('@', '')}`,
          officePhone: landing.supportPhone,
          supportHeadline: landing.contactTitle,
          supportSubtitle: landing.contactSubtitle,
          adminDestinationEmail: landing.supportEmail
        }
      };

      await onSaveCms(updatedCms);
      showToast('تنظیمات لندینگ و صفحات با موفقیت ذخیره شد', 'success');
    } catch (err) {
      console.error('Error saving landing content:', err);
      showToast('خطا در ذخیره تنظیمات لندینگ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 font-['Vazirmatn',sans-serif] text-right" dir="rtl">
      {/* Top Banner / Actions */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-lg sm:text-xl text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-red-600" />
            <span>تنظیمات لندینگ، درباره ما، خدمات و قوانین</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            مدیریت کامل بخش‌های معرفی برند، مزایا و خدمات، اطلاعات پشتیبانی و شرایط حقوقی
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازگردانی پیش‌فرض</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات لندینگ'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: MASTER VISIBILITY SWITCHES */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <h4 className="font-black text-sm sm:text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 text-amber-500" />
          <span>کلیدهای نمایش / عدم نمایش بخش‌ها در سایت</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Toggle 1: About Us */}
          <div
            onClick={() => handleToggle('showAboutUs')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
              landing.showAboutUs
                ? 'bg-red-50/50 border-red-300 shadow-2xs'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <div>
              <span className="font-black text-xs sm:text-sm text-slate-900 block">بخش «درباره ما»</span>
              <span className="text-[10px] text-slate-500 font-medium">معرفی و اهداف سیریک فیت</span>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${landing.showAboutUs ? 'bg-red-600' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${landing.showAboutUs ? '-translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Toggle 2: Services */}
          <div
            onClick={() => handleToggle('showServices')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
              landing.showServices
                ? 'bg-red-50/50 border-red-300 shadow-2xs'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <div>
              <span className="font-black text-xs sm:text-sm text-slate-900 block">بخش «خدمات و مزایا»</span>
              <span className="text-[10px] text-slate-500 font-medium">۴ ستون اصلی تمایز</span>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${landing.showServices ? 'bg-red-600' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${landing.showServices ? '-translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Toggle 3: Contact & Support */}
          <div
            onClick={() => handleToggle('showContactSupport')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
              landing.showContactSupport
                ? 'bg-red-50/50 border-red-300 shadow-2xs'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <div>
              <span className="font-black text-xs sm:text-sm text-slate-900 block">بخش «تماس و پشتیبانی»</span>
              <span className="text-[10px] text-slate-500 font-medium">تلگرام، ایمیل، تلفن و دفتر</span>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${landing.showContactSupport ? 'bg-red-600' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${landing.showContactSupport ? '-translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Toggle 4: Terms */}
          <div
            onClick={() => handleToggle('showTerms')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
              landing.showTerms
                ? 'bg-red-50/50 border-red-300 shadow-2xs'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <div>
              <span className="font-black text-xs sm:text-sm text-slate-900 block">بخش «قوانین و مقررات»</span>
              <span className="text-[10px] text-slate-500 font-medium">فوتر و پاپ‌آپ شرایط خرید</span>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${landing.showTerms ? 'bg-red-600' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${landing.showTerms ? '-translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ABOUT US CUSTOMIZATION */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-600" />
            <span>ویرایش محتوای «درباره ما» (About Us)</span>
          </h4>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${landing.showAboutUs ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
            {landing.showAboutUs ? 'فعال در سایت' : 'غیرفعال'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">عنوان اصلی بخش</label>
            <input
              type="text"
              value={landing.aboutUsTitle}
              onChange={(e) => handleChange('aboutUsTitle', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-red-500 outline-hidden font-bold"
              placeholder="درباره سیریک فیت"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">زیرعنوان توضیحی</label>
            <input
              type="text"
              value={landing.aboutUsSubtitle || ''}
              onChange={(e) => handleChange('aboutUsSubtitle', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-red-500 outline-hidden"
              placeholder="مرجع تخصصی واردات مستقیم مکمل..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">متن بج / نشان بالا</label>
            <input
              type="text"
              value={landing.aboutUsBadge || ''}
              onChange={(e) => handleChange('aboutUsBadge', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-red-500 outline-hidden"
              placeholder="تضمین ۱۰۰٪ اصالت فیزیکی و آزمایشگاهی"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">متن کامل بیانیه و معرفی درباره ما</label>
          <textarea
            rows={4}
            value={landing.aboutUsDescription}
            onChange={(e) => handleChange('aboutUsDescription', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm focus:bg-white focus:border-red-500 outline-hidden leading-relaxed"
            placeholder="توضیحات جامع درباره نحوه کار، تخصص و اصالت کالاهای سیریک فیت..."
          />
        </div>

        {/* 4 Highlights */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">۴ ویژگی و دستاورد شاخص (نمایش در کارت‌های درباره ما)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={landing.aboutUsHighlight1 || ''}
              onChange={(e) => handleChange('aboutUsHighlight1', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-red-500 outline-hidden"
              placeholder="ویژگی ۱: تأمین مستقیم از نمایندگی‌ها..."
            />
            <input
              type="text"
              value={landing.aboutUsHighlight2 || ''}
              onChange={(e) => handleChange('aboutUsHighlight2', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-red-500 outline-hidden"
              placeholder="ویژگی ۲: ارسال ایمن کارگو..."
            />
            <input
              type="text"
              value={landing.aboutUsHighlight3 || ''}
              onChange={(e) => handleChange('aboutUsHighlight3', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-red-500 outline-hidden"
              placeholder="ویژگی ۳: محاسبه شفاف نرخ زنده..."
            />
            <input
              type="text"
              value={landing.aboutUsHighlight4 || ''}
              onChange={(e) => handleChange('aboutUsHighlight4', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-red-500 outline-hidden"
              placeholder="ویژگی ۴: مشاوره ۲۴ ساعته..."
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: SERVICES & 4 PILLARS */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>ویرایش ۴ ستون اصلی «خدمات و مزایا»</span>
          </h4>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${landing.showServices ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
            {landing.showServices ? 'فعال در سایت' : 'غیرفعال'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">عنوان بخش خدمات</label>
            <input
              type="text"
              value={landing.servicesTitle}
              onChange={(e) => handleChange('servicesTitle', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-red-500 outline-hidden font-bold"
              placeholder="خدمات و مزایای سیریک فیت"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">زیرعنوان بخش خدمات</label>
            <input
              type="text"
              value={landing.servicesSubtitle || ''}
              onChange={(e) => handleChange('servicesSubtitle', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-red-500 outline-hidden"
              placeholder="چرا ورزشکاران حرفه‌ای خرید از دبی را با سیریک فیت تجربه می‌کنند؟"
            />
          </div>
        </div>

        {/* 4 Pillar Cards Editor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {(landing.servicesList || DEFAULT_LANDING_CONTENT.servicesList).map((pillar, idx) => (
            <div key={idx} className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700">ستون {idx + 1}</span>
                <span className="text-[10px] text-slate-400 font-mono">ID: {pillar.id}</span>
              </div>
              <div>
                <input
                  type="text"
                  value={pillar.title}
                  onChange={(e) => handleServiceChange(idx, 'title', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-red-500 outline-hidden"
                  placeholder="عنوان ستون"
                />
              </div>
              <div>
                <textarea
                  rows={2}
                  value={pillar.description}
                  onChange={(e) => handleServiceChange(idx, 'description', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:border-red-500 outline-hidden leading-relaxed"
                  placeholder="توضیحات کامل ستون"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: CONTACT & SUPPORT CHANNELS */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-red-600" />
            <span>ویرایش اطلاعات تماس، پشتیبانی و آدرس‌ها</span>
          </h4>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${landing.showContactSupport ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
            {landing.showContactSupport ? 'فعال در سایت' : 'غیرفعال'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-red-600" />
              <span>ایمیل رسمی پشتیبانی</span>
            </label>
            <input
              type="email"
              dir="ltr"
              value={landing.supportEmail}
              onChange={(e) => handleChange('supportEmail', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:bg-white focus:border-red-500 outline-hidden text-left"
              placeholder="info@sirikfit.ir"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span>آیدی تلگرام پشتیبانی</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={landing.supportTelegram}
              onChange={(e) => handleChange('supportTelegram', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:bg-white focus:border-red-500 outline-hidden text-left"
              placeholder="@SIRIK_FIT_Support"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>تلفن پشتیبانی و پیگیری</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={landing.supportPhone}
              onChange={(e) => handleChange('supportPhone', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:bg-white focus:border-red-500 outline-hidden text-left"
              placeholder="021-91000000"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>ساعات پاسخگویی</span>
            </label>
            <input
              type="text"
              value={landing.supportHours}
              onChange={(e) => handleChange('supportHours', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-red-500 outline-hidden"
              placeholder="پاسخگویی همه‌روزه، ساعت ۹ صبح الی ۲۳"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-700" />
              <span>آدرس دفتر هماهنگی و لاجستیک</span>
            </label>
            <input
              type="text"
              value={landing.officeAddress}
              onChange={(e) => handleChange('officeAddress', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-red-500 outline-hidden"
              placeholder="دفتر هماهنگی و ارسال مرسولات دبی و ایران"
            />
          </div>
        </div>
      </div>

      {/* SECTION 5: TERMS & LEGAL POLICIES */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-800" />
            <span>ویرایش «قوانین و مقررات خرید» (Terms & Conditions)</span>
          </h4>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${landing.showTerms ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
            {landing.showTerms ? 'فعال در سایت' : 'غیرفعال'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">عنوان بخش قوانین</label>
            <input
              type="text"
              value={landing.termsTitle}
              onChange={(e) => handleChange('termsTitle', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-red-500 outline-hidden font-bold"
              placeholder="قوانین و مقررات خرید از سیریک فیت"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">زیرعنوان بخش قوانین</label>
            <input
              type="text"
              value={landing.termsSubtitle || ''}
              onChange={(e) => handleChange('termsSubtitle', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-red-500 outline-hidden"
              placeholder="شفافیت کامل، حفظ حقوق مشتریان..."
            />
          </div>
        </div>

        {/* 4 Term Items Editor */}
        <div className="space-y-3 pt-2">
          {(landing.termsList || DEFAULT_LANDING_CONTENT.termsList).map((term, idx) => (
            <div key={idx} className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">بند {idx + 1} قوانین</span>
                <span className="text-[10px] text-slate-400 font-mono">ID: {term.id}</span>
              </div>
              <div>
                <input
                  type="text"
                  value={term.title}
                  onChange={(e) => handleTermChange(idx, 'title', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:border-red-500 outline-hidden"
                  placeholder="عنوان بند (مثال: ضمانت اصالت و سلامت فیزیکی)"
                />
              </div>
              <div>
                <textarea
                  rows={2}
                  value={term.description}
                  onChange={(e) => handleTermChange(idx, 'description', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:border-red-500 outline-hidden leading-relaxed"
                  placeholder="متن کامل بند قانونی و شرایط استرداد/گارانتی..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating / Bottom Save Trigger */}
      <div className="flex justify-end pt-2 pb-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-black rounded-2xl transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره نهایی تنظیمات لندینگ و قوانین'}</span>
        </button>
      </div>
    </div>
  );
};
