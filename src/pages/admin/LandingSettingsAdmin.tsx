import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  HelpCircle,
  FileText,
  ShieldCheck,
  Building2,
  Headphones,
  Sparkles,
  Send,
  Mail,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { LandingSettings, LandingBenefitItem, LandingFaqItem, LandingRuleItem } from '../../types';
import { defaultLandingSettings, ENAMAD_CONFIG } from '../../types';
import { getLandingSettings, saveLandingSettings } from '../../services/settingsService';
import { ENamadBadge } from '../../components/ENamadBadge';

interface LandingSettingsAdminProps {
  onSaved?: (settings: LandingSettings) => void;
}

export const LandingSettingsAdmin: React.FC<LandingSettingsAdminProps> = ({ onSaved }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'visibility' | 'brand' | 'contact' | 'trust' | 'benefits' | 'faqs' | 'rules'>('visibility');

  const [settings, setSettings] = useState<LandingSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sirikfit_landing_settings');
        if (saved) return { ...defaultLandingSettings, ...JSON.parse(saved) };
      } catch (_) {}
    }
    return { ...defaultLandingSettings };
  });

  // 1. Robust Firestore fetch on load
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

  const handleToggle = (key: keyof Pick<LandingSettings, 'showBenefits' | 'showAbout' | 'showContact' | 'showFaq' | 'showRules' | 'showTrustBadges' | 'showEnamad'>) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Benefits
  const handleAddBenefit = () => {
    const newB: LandingBenefitItem = {
      id: `benefit-${Date.now()}`,
      title: 'مزیت جدید',
      description: 'توضیحات مربوط به این مزیت را وارد کنید.',
      icon: 'Sparkles'
    };
    setSettings(prev => ({
      ...prev,
      benefits: [...(prev.benefits || []), newB]
    }));
  };

  const handleUpdateBenefit = (index: number, field: keyof LandingBenefitItem, val: string) => {
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

  // FAQs
  const handleAddFaq = () => {
    const newF: LandingFaqItem = {
      id: `faq-${Date.now()}`,
      question: 'پرسش جدید کاربر',
      answer: 'پاسخ شفاف و دقیق به این پرسش.'
    };
    setSettings(prev => ({
      ...prev,
      faqs: [...(prev.faqs || []), newF]
    }));
  };

  const handleUpdateFaq = (index: number, field: keyof LandingFaqItem, val: string) => {
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

  // Rules
  const handleAddRule = () => {
    const newR: LandingRuleItem = {
      id: `rule-${Date.now()}`,
      title: 'بند جدید قوانین',
      content: 'توضیحات و الزامات حقوقی این بند.'
    };
    setSettings(prev => ({
      ...prev,
      rules: [...(prev.rules || []), newR]
    }));
  };

  const handleUpdateRule = (index: number, field: keyof LandingRuleItem, val: string) => {
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

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const payload: LandingSettings = {
        ...settings,
        telegramId: settings.telegramId || '@SIRIK_FIT_Support',
        supportPhone: settings.supportPhone || '021-91000000',
        supportEmail: settings.supportEmail || 'info@sirikfit.ir',
        updatedAt: new Date().toISOString()
      };
      const ok = await saveLandingSettings(payload);
      if (ok) {
        setSettings(payload);
        setStatusMessage('تنظیمات با موفقیت در دیتابیس ذخیره شد');
        if (onSaved) onSaved(payload);
      } else {
        setStatusMessage('خطا در ذخیره‌سازی تنظیمات در فایربیس.');
      }
    } catch (err) {
      console.error('Error saving landing settings:', err);
      setStatusMessage('خطا در ذخیره اطلاعات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-['Vazirmatn',sans-serif] text-right" dir="rtl">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center font-black text-sm shrink-0">
            SF
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900">مدیریت لندینگ، اطلاع‌رسانی و مودال‌ها</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">مرجع واحد تنظیمات درباره ما، تماس، مزایا، سوالات متداول، قوانین و نمادها</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-3 bg-black hover:bg-slate-900 text-white text-xs font-black rounded-2xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-red-500" />}
          <span>{isSaving ? 'در حال ذخیره‌سازی...' : 'ذخیره تنظیمات لندینگ'}</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200 overflow-x-auto text-xs font-bold">
        {[
          { id: 'visibility', label: 'سوییچ‌های نمایش', icon: Eye },
          { id: 'brand', label: 'هویت برند و درباره ما', icon: Building2 },
          { id: 'contact', label: 'پل‌های تماس و ساعات کاری', icon: Headphones },
          { id: 'trust', label: 'کد رسمی اینماد و نمادها', icon: ShieldCheck },
          { id: 'benefits', label: 'مزایا و خدمات (Benefits)', icon: Sparkles },
          { id: 'faqs', label: 'سوالات متداول (FAQs)', icon: HelpCircle },
          { id: 'rules', label: 'قوانین و مقررات (Rules)', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-white text-black shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-red-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Panels */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        {/* 1. Visibility Toggles */}
        {activeSubTab === 'visibility' && (
          <div className="space-y-4">
            <h4 className="font-black text-sm text-slate-900 pb-2 border-b border-slate-100">
              کنترل نمایش بخش‌های اختصاصی لندینگ و فوتر
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { key: 'showAbout', title: 'بخش درباره سیریک فیت', desc: 'نمایش کارت معرفی برند و اصالت کالا' },
                { key: 'showBenefits', title: 'بخش مزایا و خدمات خرید', desc: 'نمایش ستون‌های ۴ گانه خدمات و ارزش‌ها' },
                { key: 'showContact', title: 'بخش اطلاعات تماس و پشتیبانی', desc: 'نمایش تلگرام، ایمیل، شماره و ساعات کاری' },
                { key: 'showFaq', title: 'بخش سوالات متداول (FAQ)', desc: 'نمایش لینک و مودال سوالات متداول' },
                { key: 'showRules', title: 'بخش قوانین و مقررات خرید', desc: 'نمایش لینک و مودال ضوابط و شرایط تعویض' },
                { key: 'showTrustBadges', title: 'بخش نمادهای اعتماد و مجوزها', desc: 'نمایش کلی بخش نمادهای اعتماد در فوتر' },
                { key: 'showEnamad', title: 'نماد اعتماد الکترونیکی (اینماد)', desc: 'نمایش نماد رسمی اینماد در پایین سایت' }
              ].map((item) => {
                const isChecked = Boolean(settings[item.key as keyof LandingSettings]);
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggle(item.key as any)}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer hover:border-slate-300 transition"
                  >
                    <div>
                      <span className="font-black text-xs text-slate-900 block">{item.title}</span>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">{item.desc}</span>
                    </div>
                    {isChecked ? (
                      <ToggleRight className="w-7 h-7 text-emerald-600 shrink-0" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Brand & About */}
        {activeSubTab === 'brand' && (
          <div className="space-y-4">
            <h4 className="font-black text-sm text-slate-900 pb-2 border-b border-slate-100">
              تنظیمات هویت برند و متن معرفی (About Us)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">نام رسمی برند:</label>
                <input
                  type="text"
                  value={settings.brandName || ''}
                  onChange={(e) => setSettings(p => ({ ...p, brandName: e.target.value }))}
                  placeholder="سیریک فیت | SIRIK FIT"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">زیرعنوان برند:</label>
                <input
                  type="text"
                  value={settings.brandSubtitle || ''}
                  onChange={(e) => setSettings(p => ({ ...p, brandSubtitle: e.target.value }))}
                  placeholder="تأمین و واردات مستقیم مکمل از دبی"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">متن کامل معرفی و درباره ما:</label>
              <textarea
                rows={4}
                value={settings.aboutText || ''}
                onChange={(e) => setSettings(p => ({ ...p, aboutText: e.target.value }))}
                placeholder="توضیحات جامع درباره نحوه واردات، اصالت مکمل‌ها و تعهدات سیریک فیت..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs p-3.5 rounded-xl focus:outline-none focus:border-black font-medium leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">متن بج تضمین و تحویل:</label>
              <input
                type="text"
                value={settings.deliveryGuaranteeBadge || ''}
                onChange={(e) => setSettings(p => ({ ...p, deliveryGuaranteeBadge: e.target.value }))}
                placeholder="تضمین ۱۰۰٪ اصالت کالا | ارسال ۵ الی ۱۰ روز کاری"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black font-bold"
              />
            </div>
          </div>
        )}

        {/* 3. Contact Channels */}
        {activeSubTab === 'contact' && (
          <div className="space-y-4">
            <h4 className="font-black text-sm text-slate-900 pb-2 border-b border-slate-100">
              پل‌های ارتباطی مستقیم و ساعات پاسخگویی
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-500" />
                  <span>آیدی تلگرام پشتیبانی:</span>
                </label>
                <input
                  type="text"
                  value={settings.telegramId || ''}
                  onChange={(e) => setSettings(p => ({ ...p, telegramId: e.target.value }))}
                  placeholder="@SIRIK_FIT_Support"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black dir-ltr font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-red-500" />
                  <span>ایمیل رسمی پشتیبانی:</span>
                </label>
                <input
                  type="email"
                  value={settings.supportEmail || ''}
                  onChange={(e) => setSettings(p => ({ ...p, supportEmail: e.target.value }))}
                  placeholder="info@sirikfit.ir"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black dir-ltr font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>شماره تماس پشتیبانی:</span>
                </label>
                <input
                  type="text"
                  value={settings.supportPhone || ''}
                  onChange={(e) => setSettings(p => ({ ...p, supportPhone: e.target.value }))}
                  placeholder="021-91000000"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black dir-ltr font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>ساعات پاسخگویی:</span>
                </label>
                <input
                  type="text"
                  value={settings.supportHours || ''}
                  onChange={(e) => setSettings(p => ({ ...p, supportHours: e.target.value }))}
                  placeholder="پاسخگویی همه‌روزه، ساعت ۹ صبح الی ۲۳"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-500" />
                <span>آدرس دفتر هماهنگی و لاجستیک:</span>
              </label>
              <input
                type="text"
                value={settings.officeLocation || ''}
                onChange={(e) => setSettings(p => ({ ...p, officeLocation: e.target.value }))}
                placeholder="دفتر هماهنگی و ارسال مرسولات دبی و ایران"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black font-medium"
              />
            </div>
          </div>
        )}

        {/* Enamad & Trust Badges */}
        {activeSubTab === 'trust' && (
          <div className="space-y-4">
            <h4 className="font-black text-sm text-slate-900 pb-2 border-b border-slate-100">
              نماد اعتماد الکترونیکی رسمی (اینماد - eNAMAD)
            </h4>

            {/* Quick Toggle */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-black text-xs text-slate-900 block">وضعیت نمایش اینماد در فوتر</span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  {settings.showEnamad !== false ? 'اینماد در فوتر سایت نمایش داده می‌شود.' : 'اینماد در حال حاضر در سایت مخفی است.'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showEnamad !== false}
                  onChange={(e) => setSettings(p => ({ ...p, showEnamad: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full dir-ltr peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Official Credentials Info Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">شناسه کسب‌وکار (ID):</span>
                <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-300 text-slate-900 block text-center dir-ltr">
                  {ENAMAD_CONFIG.id}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">کد اختصاصی احراز هویت (Code):</span>
                <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-300 text-slate-900 block text-center dir-ltr truncate">
                  {ENAMAD_CONFIG.code}
                </span>
              </div>
            </div>

            {/* Live Preview of Enamad */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <span className="text-xs font-black text-slate-800 block">پیش‌نمایش زنده لوگوی اینماد:</span>
              <div className="flex items-center justify-center p-3 bg-white rounded-2xl border border-gray-200 shadow-xs max-w-[140px] mx-auto">
                <ENamadBadge showContainer={false} />
              </div>
              <span className="text-[11px] text-slate-500 text-center block">
                با کلیک روی لوگو، صفحه رسمی استعلام احراز هویت در پنجره جدید باز می‌شود.
              </span>
            </div>
          </div>
        )}

        {/* 4. Benefits Editor */}
        {activeSubTab === 'benefits' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-sm text-slate-900">لیست خدمات و مزایای خرید</h4>
              <button
                type="button"
                onClick={handleAddBenefit}
                className="px-3 py-1.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن مزیت جدید</span>
              </button>
            </div>

            <div className="space-y-3">
              {(settings.benefits || []).map((b, idx) => (
                <div key={b.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-800">مزیت شماره {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteBenefit(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={b.title}
                    onChange={(e) => handleUpdateBenefit(idx, 'title', e.target.value)}
                    placeholder="عنوان مزیت"
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-black font-bold"
                  />
                  <textarea
                    rows={2}
                    value={b.description}
                    onChange={(e) => handleUpdateBenefit(idx, 'description', e.target.value)}
                    placeholder="شرح مزیت..."
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs p-3 rounded-xl focus:outline-none focus:border-black font-medium"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. FAQs Editor */}
        {activeSubTab === 'faqs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-sm text-slate-900">لیست سوالات متداول و پاسخ‌ها (FAQs)</h4>
              <button
                type="button"
                onClick={handleAddFaq}
                className="px-3 py-1.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن پرسش جدید</span>
              </button>
            </div>

            <div className="space-y-3">
              {(settings.faqs || []).map((faq, idx) => (
                <div key={faq.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-800">پرسش {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                    placeholder="متن سوال..."
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-black font-bold"
                  />
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                    placeholder="پاسخ کامل..."
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs p-3 rounded-xl focus:outline-none focus:border-black font-medium"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Rules Editor */}
        {activeSubTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-sm text-slate-900">لیست بندهای قوانین و مقررات خرید</h4>
              <button
                type="button"
                onClick={handleAddRule}
                className="px-3 py-1.5 bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن بند قانونی</span>
              </button>
            </div>

            <div className="space-y-3">
              {(settings.rules || []).map((rule, idx) => (
                <div key={rule.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-slate-800">بند {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={rule.title}
                    onChange={(e) => handleUpdateRule(idx, 'title', e.target.value)}
                    placeholder="عنوان بند (مثال: ضمانت اصالت فیزیکی)..."
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-black font-bold"
                  />
                  <textarea
                    rows={3}
                    value={rule.content}
                    onChange={(e) => handleUpdateRule(idx, 'content', e.target.value)}
                    placeholder="شرح بند قانونی و شرایط..."
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs p-3 rounded-xl focus:outline-none focus:border-black font-medium"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800">
            {statusMessage}
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3.5 bg-black hover:bg-slate-900 text-white text-xs font-black rounded-2xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-red-500" />}
          <span>{isSaving ? 'در حال ذخیره‌سازی...' : 'ذخیره سراسری تنظیمات لندینگ'}</span>
        </button>
      </div>
    </div>
  );
};
