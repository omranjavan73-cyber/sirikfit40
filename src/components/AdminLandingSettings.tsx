import React, { useState, useEffect } from 'react';
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
  HelpCircle,
  Mail,
  Send,
  Phone,
  Clock,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Sparkle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import type { CmsConfig, LandingSettings, LandingBenefitItem, LandingFaqItem, LandingRuleItem } from '../types';
import { defaultLandingSettings } from '../types';
import { getLandingSettings, saveLandingSettings } from '../services/settingsService';

interface AdminLandingSettingsProps {
  cms: CmsConfig | null;
  onSaveCms?: (updatedCms: CmsConfig) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const AdminLandingSettings: React.FC<AdminLandingSettingsProps> = ({
  cms,
  onSaveCms,
  showToast
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'visibility' | 'brand' | 'contact' | 'benefits' | 'faqs' | 'rules'>('visibility');

  const [settings, setSettings] = useState<LandingSettings>(() => {
    // 1. Check cms.landingSettings
    if (cms?.landingSettings) {
      return { ...defaultLandingSettings, ...cms.landingSettings };
    }
    // 2. Check localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sirikfit_landing_settings');
        if (saved) return { ...defaultLandingSettings, ...JSON.parse(saved) };
      } catch (_) {}
    }
    return { ...defaultLandingSettings };
  });

  // Fetch directly from Firestore on mount using service
  useEffect(() => {
    let isMounted = true;
    getLandingSettings().then((fetched) => {
      if (isMounted && fetched) {
        setSettings(prev => ({
          ...prev,
          ...fetched
        }));
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleToggle = (key: keyof Pick<LandingSettings, 'showBenefits' | 'showAbout' | 'showContact' | 'showFaq' | 'showRules' | 'showTrustBadges'>) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleFieldChange = (key: keyof LandingSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // -------------------------------------------------------------
  // Benefits Item Handlers
  // -------------------------------------------------------------
  const handleAddBenefit = () => {
    const newId = `b_${Date.now()}`;
    setSettings(prev => ({
      ...prev,
      benefits: [
        ...(prev.benefits || []),
        { id: newId, title: 'عنوان مزیت جدید', description: 'توضیحات مزیت و سرویس سیریک فیت' }
      ]
    }));
  };

  const handleUpdateBenefit = (index: number, field: 'title' | 'description', val: string) => {
    setSettings(prev => {
      const list = [...(prev.benefits || [])];
      if (list[index]) {
        list[index] = { ...list[index], [field]: val };
      }
      return { ...prev, benefits: list };
    });
  };

  const handleDeleteBenefit = (index: number) => {
    setSettings(prev => {
      const list = [...(prev.benefits || [])];
      list.splice(index, 1);
      return { ...prev, benefits: list };
    });
  };

  // -------------------------------------------------------------
  // FAQs Item Handlers
  // -------------------------------------------------------------
  const handleAddFaq = () => {
    const newId = `f_${Date.now()}`;
    setSettings(prev => ({
      ...prev,
      faqs: [
        ...(prev.faqs || []),
        { id: newId, question: 'سوال جدید کاربر؟', answer: 'پاسخ شفاف و کامل به سوال کاربر.' }
      ]
    }));
  };

  const handleUpdateFaq = (index: number, field: 'question' | 'answer', val: string) => {
    setSettings(prev => {
      const list = [...(prev.faqs || [])];
      if (list[index]) {
        list[index] = { ...list[index], [field]: val };
      }
      return { ...prev, faqs: list };
    });
  };

  const handleDeleteFaq = (index: number) => {
    setSettings(prev => {
      const list = [...(prev.faqs || [])];
      list.splice(index, 1);
      return { ...prev, faqs: list };
    });
  };

  // -------------------------------------------------------------
  // Rules Item Handlers
  // -------------------------------------------------------------
  const handleAddRule = () => {
    const newId = `r_${Date.now()}`;
    setSettings(prev => ({
      ...prev,
      rules: [
        ...(prev.rules || []),
        { id: newId, title: 'بند قانونی جدید', content: 'شرح شرایط و تعهدات خرید و مرجوعی.' }
      ]
    }));
  };

  const handleUpdateRule = (index: number, field: 'title' | 'content', val: string) => {
    setSettings(prev => {
      const list = [...(prev.rules || [])];
      if (list[index]) {
        list[index] = { ...list[index], [field]: val };
      }
      return { ...prev, rules: list };
    });
  };

  const handleDeleteRule = (index: number) => {
    setSettings(prev => {
      const list = [...(prev.rules || [])];
      list.splice(index, 1);
      return { ...prev, rules: list };
    });
  };

  // -------------------------------------------------------------
  // Reset to Defaults
  // -------------------------------------------------------------
  const handleResetToDefault = () => {
    if (window.confirm('آیا از بازگردانی تمامی تنظیمات لندینگ، تماس، مزایا و قوانین به حالت پیش‌فرض مطمئن هستید؟')) {
      setSettings({ ...defaultLandingSettings });
      showToast('تنظیمات لندینگ به حالت پیش‌فرض بازگردانی شد', 'success');
    }
  };

  // -------------------------------------------------------------
  // Save Settings
  // -------------------------------------------------------------
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Direct write to Firestore document `settings/landing` and sync to localStorage
      await saveLandingSettings(settings);

      // 3. Sync to main CMS config for backward compatibility
      if (onSaveCms) {
        const updatedCms: CmsConfig = {
          ...(cms || ({} as any)),
          landingSettings: settings,
          // Sync with legacy landingContent structure
          landingContent: {
            showAboutUs: settings.showAbout,
            showServices: settings.showBenefits,
            showContactSupport: settings.showContact,
            showTerms: settings.showRules,
            aboutUsTitle: settings.brandName,
            aboutUsDescription: settings.aboutText,
            aboutUsBadge: settings.deliveryGuaranteeBadge,
            servicesTitle: 'خدمات و مزایای سیریک فیت',
            servicesList: settings.benefits.map((b, i) => ({
              id: b.id || `pillar-${i}`,
              title: b.title,
              description: b.description,
              icon: b.icon || 'ShieldCheck'
            })),
            contactTitle: 'تماس با ما و پشتیبانی',
            supportEmail: settings.supportEmail,
            supportTelegram: settings.telegramId,
            supportTelegramLink: `https://t.me/${settings.telegramId.replace('@', '')}`,
            supportPhone: settings.supportPhone,
            supportHours: settings.supportHours,
            officeAddress: settings.officeLocation,
            termsTitle: 'قوانین و مقررات خرید',
            termsList: settings.rules.map((r, i) => ({
              id: r.id || `term-${i}`,
              title: r.title,
              description: r.content
            }))
          },
          // Sync contact fields to homeContent
          homeContent: {
            ...(cms?.homeContent || ({} as any)),
            telegramHandle: settings.telegramId,
            telegramLink: `https://t.me/${settings.telegramId.replace('@', '')}`,
            officePhone: settings.supportPhone,
            adminDestinationEmail: settings.supportEmail
          }
        };

        await onSaveCms(updatedCms);
      }

      showToast('تنظیمات لندینگ و اطلاع‌رسانی با موفقیت ذخیره شد', 'success');
    } catch (err: any) {
      console.error('Error saving landing settings:', err);
      showToast('خطا در ذخیره‌سازی تنظیمات لندینگ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] dir-rtl text-right">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>مدیریت لندینگ و اطلاع‌رسانی</span>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                مرجع واحد تنظیمات
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              مدیریت یکپارچه سوییچ‌های نمایش، معرفی برند، پل‌های ارتباطی تلگرام و تماس، سوالات متداول و قوانین
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="بازگردانی پیش‌فرض"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">بازگردانی پیش‌فرض</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4 text-red-500" />
            <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره سراسری تنظیمات'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'visibility', label: 'سوییچ‌های نمایش بخش‌ها', icon: Eye },
          { id: 'brand', label: 'معرفی برند و درباره ما', icon: Building2 },
          { id: 'contact', label: 'پل‌های تماس و پشتیبانی', icon: Headphones },
          { id: 'benefits', label: 'مزایا و خدمات (Pillars)', icon: Sparkles },
          { id: 'faqs', label: 'سوالات متداول (FAQ)', icon: HelpCircle },
          { id: 'rules', label: 'قوانین و تعهدات', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: VISIBILITY TOGGLES (سوییچ‌های نمایش)                         */}
      {/* ==================================================================== */}
      {activeTab === 'visibility' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">سوییچ‌های فعال/غیرفعال‌سازی بخش‌های لندینگ</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              با خاموش کردن هر سوییچ، بخش مربوطه بلافاصله از روی صفحه اصلی مخفی می‌شود.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { key: 'showBenefits', title: 'نمایش بخش مزایا و خدمات', desc: '۴ ستون ویژگی‌ها، اصالت و حمل دبی' },
              { key: 'showAbout', title: 'نمایش بخش درباره ما', desc: 'بیانیه برند و معرفی فروشگاه سیریک فیت' },
              { key: 'showContact', title: 'نمایش اطلاعات تماس و پشتیبانی', desc: 'پل ارتباطی تلگرام، تلفن، ایمیل و ساعات کاری' },
              { key: 'showFaq', title: 'نمایش سوالات متداول (FAQ)', desc: 'پاسخ به سوالات پرتکرار خریداران' },
              { key: 'showRules', title: 'نمایش قوانین و مقررات خرید', desc: 'شرایط تعویض، اصالت و تحویل' },
              { key: 'showTrustBadges', title: 'نمایش نمادهای اعتماد و اصالت', desc: 'بج‌های تضمین ۱۰۰٪ اصالت و پرداخت امن' }
            ].map(item => {
              const isEnabled = settings[item.key as keyof LandingSettings] as boolean;
              return (
                <div
                  key={item.key}
                  onClick={() => handleToggle(item.key as any)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isEnabled
                      ? 'bg-emerald-50/50 border-emerald-200/80 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black text-slate-900 block">{item.title}</span>
                    <span className="text-[11px] text-slate-500 block truncate mt-0.5">{item.desc}</span>
                  </div>

                  <div className={`p-1 rounded-xl transition ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: BRAND & ABOUT (معرفی برند و درباره ما)                         */}
      {/* ==================================================================== */}
      {activeTab === 'brand' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">تنظیمات هویت برند و بخش درباره ما</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              متن معرفی رسمی سیریک فیت و بج تضمین اصالت
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">نام رسمی برند:</label>
              <input
                type="text"
                value={settings.brandName}
                onChange={(e) => handleFieldChange('brandName', e.target.value)}
                placeholder="سیریک فیت | SIRIK FIT"
                className="w-full bg-slate-50 border border-slate-200 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">شعار / زیرعنوان برند:</label>
              <input
                type="text"
                value={settings.brandSubtitle}
                onChange={(e) => handleFieldChange('brandSubtitle', e.target.value)}
                placeholder="تأمین و واردات مستقیم مکمل از دبی"
                className="w-full bg-slate-50 border border-slate-200 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">متن کامل درباره ما:</label>
              <textarea
                rows={4}
                value={settings.aboutText}
                onChange={(e) => handleFieldChange('aboutText', e.target.value)}
                placeholder="سیریک فیت مرجع تخصصی تأمین مکمل‌های ورزشی اورجینال..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-black text-slate-900 text-xs p-3.5 rounded-xl focus:outline-none leading-relaxed font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">بج ضمانت اصالت و تحویل:</label>
              <input
                type="text"
                value={settings.deliveryGuaranteeBadge}
                onChange={(e) => handleFieldChange('deliveryGuaranteeBadge', e.target.value)}
                placeholder="تضمین ۱۰۰٪ اصالت کالا | ارسال ۵ الی ۱۰ روز کاری"
                className="w-full bg-slate-50 border border-slate-200 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: CONTACT & SUPPORT (پل‌های تماس و پشتیبانی)                     */}
      {/* ==================================================================== */}
      {activeTab === 'contact' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">تنظیمات راه‌های ارتباط و پشتیبانی کاربران</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              این اطلاعات در تمامی صفحات، هدر، فوتر و بخش تماس اعمال می‌شود.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-500" />
                <span>آیدی تلگرام پشتیبانی:</span>
              </label>
              <input
                type="text"
                value={settings.telegramId}
                onChange={(e) => handleFieldChange('telegramId', e.target.value)}
                placeholder="@SIRIK_FIT_Support"
                className="w-full bg-slate-50 border border-slate-200 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none dir-ltr font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-red-500" />
                <span>ایمیل رسمی پشتیبانی:</span>
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleFieldChange('supportEmail', e.target.value)}
                placeholder="info@sirikfit.ir"
                className="w-full bg-slate-50 border border-slate-200 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none dir-ltr font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>شماره تماس پشتیبانی:</span>
              </label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => handleFieldChange('supportPhone', e.target.value)}
                placeholder="021-91000000"
                className="w-full bg-slate-50 border border-slate-200 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none dir-ltr font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>ساعات کاری و پاسخگویی:</span>
              </label>
              <input
                type="text"
                value={settings.supportHours}
                onChange={(e) => handleFieldChange('supportHours', e.target.value)}
                placeholder="پاسخگویی همه‌روزه، ساعت ۹ صبح الی ۲۳"
                className="w-full bg-slate-50 border border-slate-200 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-500" />
                <span>آدرس دفتر هماهنگی و لاجستیک:</span>
              </label>
              <input
                type="text"
                value={settings.officeLocation}
                onChange={(e) => handleFieldChange('officeLocation', e.target.value)}
                placeholder="دفتر هماهنگی و ارسال مرسولات دبی و ایران"
                className="w-full bg-slate-50 border border-slate-200 focus:border-black text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: BENEFITS & PILLARS (مزایا و ویژگی‌ها)                        */}
      {/* ==================================================================== */}
      {activeTab === 'benefits' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">مدیریت مزایا و ویژگی‌های متمایز سیریک فیت</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">ستون‌های ارزش و دلایل خرید از دبی</p>
            </div>
            <button
              type="button"
              onClick={handleAddBenefit}
              className="px-3 py-1.5 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-red-500" />
              <span>افزودن مزیت جدید</span>
            </button>
          </div>

          <div className="space-y-3">
            {(settings.benefits || []).map((b, idx) => (
              <div key={b.id || idx} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">مزیت شماره {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteBenefit(idx)}
                    className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">عنوان مزیت:</label>
                    <input
                      type="text"
                      value={b.title}
                      onChange={(e) => handleUpdateBenefit(idx, 'title', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">توضیحات تکمیلی:</label>
                    <input
                      type="text"
                      value={b.description}
                      onChange={(e) => handleUpdateBenefit(idx, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: FAQS (سوالات متداول)                                          */}
      {/* ==================================================================== */}
      {activeTab === 'faqs' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">مدیریت سوالات متداول (FAQ)</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">پاسخ‌های آماده به پرسش‌های رایج خریداران</p>
            </div>
            <button
              type="button"
              onClick={handleAddFaq}
              className="px-3 py-1.5 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-red-500" />
              <span>افزودن سوال جدید</span>
            </button>
          </div>

          <div className="space-y-3">
            {(settings.faqs || []).map((faq, idx) => (
              <div key={faq.id || idx} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">سوال شماره {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteFaq(idx)}
                    className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">متن سوال:</label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">پاسخ تشریحی:</label>
                    <textarea
                      rows={2}
                      value={faq.answer}
                      onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-xs p-3 rounded-xl focus:outline-none font-medium leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: RULES & POLICIES (قوانین و تعهدات خرید)                      */}
      {/* ==================================================================== */}
      {activeTab === 'rules' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">مدیریت قوانین و مقررات خرید</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">بندهای حقوقی، ضمانت بازگشت و شرایط ترخیص</p>
            </div>
            <button
              type="button"
              onClick={handleAddRule}
              className="px-3 py-1.5 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-red-500" />
              <span>افزودن بند قانونی</span>
            </button>
          </div>

          <div className="space-y-3">
            {(settings.rules || []).map((rule, idx) => (
              <div key={rule.id || idx} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">بند شماره {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(idx)}
                    className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">عنوان بند:</label>
                    <input
                      type="text"
                      value={rule.title}
                      onChange={(e) => handleUpdateRule(idx, 'title', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">متن بند قانونی:</label>
                    <textarea
                      rows={2}
                      value={rule.content}
                      onChange={(e) => handleUpdateRule(idx, 'content', e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-xs p-3 rounded-xl focus:outline-none font-medium leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
