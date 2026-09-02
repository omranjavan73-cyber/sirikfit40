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
  MessageCircle,
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
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { LandingSettings, LandingBenefitItem, LandingFaqItem, LandingRuleItem } from '../../types';
import { defaultLandingSettings, ENAMAD_CONFIG } from '../../types';
import { getLandingSettings, saveLandingSettings, getSupportSettings, saveSupportSettings } from '../../services/settingsService';
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
    Promise.all([
      getLandingSettings(),
      getSupportSettings().catch(() => null)
    ]).then(([fetched, support]) => {
      if (isMounted) {
        setSettings(prev => ({
          ...prev,
          ...(fetched || {}),
          whatsappNumber: support?.whatsappNumber || (fetched as any)?.whatsappNumber || prev.whatsappNumber
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
  const handleSave = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      console.log('SAVING_PAYLOAD:', settings);
      await saveLandingSettings(settings);

      if (settings.whatsappNumber && settings.whatsappNumber.trim()) {
        await saveSupportSettings({
          whatsappNumber: settings.whatsappNumber.trim()
        });
      }

      setStatusMessage('تنظیمات لندینگ با موفقیت در پایگاه داده ذخیره و تایید شد');
      if (onSaved) onSaved(settings);
    } catch (err: any) {
      console.error('Save failed:', err);
      const errMsg = err?.message || String(err);
      setStatusMessage('خطا در ذخیره دیتابیس: ' + errMsg);
      if (typeof window !== 'undefined') {
        alert('خطا در ذخیره دیتابیس: ' + errMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-['Vazirmatn',sans-serif] text-right" dir="rtl">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900">مدیریت لندینگ، اطلاع‌رسانی و مودال‌ها</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">مرجع واحد تنظیمات درباره ما، تماس، مزایا، سوالات متداول، قوانین و نمادها</p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => handleSave(e)}
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

        {/* 3. Contact Channels Card */}
        {activeSubTab === 'contact' && (
          <div className="w-full bg-white border border-gray-200 p-5 rounded-3xl flex flex-col gap-4 text-right" dir="rtl">
            <div className="flex flex-col gap-1 border-b pb-3">
              <h3 className="text-sm font-black text-gray-900">
                تنظیمات راه‌های ارتباط و پشتیبانی کاربران
              </h3>
              <p className="text-xs text-gray-500">
                این اطلاعات در فوتر، مودال تماس و بخش‌های اطلاع‌رسانی اعمال می‌شود.
              </p>
            </div>

            {/* 1. Telegram */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200 gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-500" />
                  <span>آیدی تلگرام پشتیبانی:</span>
                </span>
                <input
                  type="text"
                  value={settings.telegramId || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, telegramId: e.target.value }))}
                  placeholder="@SIRIK_FIT_Support"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white dir-ltr text-right font-bold"
                />
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs select-none pt-4">
                <input
                  type="checkbox"
                  checked={Boolean(settings.showTelegram !== false)}
                  onChange={(e) => setSettings(prev => ({ ...prev, showTelegram: e.target.checked }))}
                  className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                />
                <span>نمایش؟</span>
              </label>
            </div>

            {/* 1.5. WhatsApp Support */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>شماره واتساپ پشتیبانی (دکمه شناور و درگاه خرید):</span>
                </span>
                <input
                  type="text"
                  value={settings.whatsappNumber || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                  placeholder="+989914984801 یا +971501234567"
                  className="w-full text-xs p-2.5 rounded-xl border border-emerald-300 bg-white dir-ltr text-right font-bold font-mono"
                />
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs select-none pt-4 text-emerald-800">
                <input
                  type="checkbox"
                  checked={Boolean(settings.showWhatsapp !== false)}
                  onChange={(e) => setSettings(prev => ({ ...prev, showWhatsapp: e.target.checked }))}
                  className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                />
                <span>فعال؟</span>
              </label>
            </div>

            {/* 2. Official Email */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200 gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-red-500" />
                  <span>ایمیل رسمی پشتیبانی:</span>
                </span>
                <input
                  type="email"
                  value={settings.supportEmail || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                  placeholder="info@sirikfit.ir"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white dir-ltr text-right font-bold"
                />
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs select-none pt-4">
                <input
                  type="checkbox"
                  checked={Boolean(settings.showEmail !== false)}
                  onChange={(e) => setSettings(prev => ({ ...prev, showEmail: e.target.checked }))}
                  className="w-4 h-4 rounded text-red-600 cursor-pointer"
                />
                <span>نمایش؟</span>
              </label>
            </div>

            {/* 3. Phone */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200 gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>شماره تماس پشتیبانی:</span>
                </span>
                <input
                  type="text"
                  value={settings.supportPhone || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, supportPhone: e.target.value }))}
                  placeholder="021-91000000"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white dir-ltr text-right font-bold"
                />
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs select-none pt-4">
                <input
                  type="checkbox"
                  checked={Boolean(settings.showPhone !== false)}
                  onChange={(e) => setSettings(prev => ({ ...prev, showPhone: e.target.checked }))}
                  className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                />
                <span>نمایش؟</span>
              </label>
            </div>

            {/* 4. Hours & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>ساعات کاری و پاسخگویی:</span>
                  </span>
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-xs select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.showHours !== false)}
                      onChange={(e) => setSettings(prev => ({ ...prev, showHours: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-500 cursor-pointer"
                    />
                    <span>نمایش</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={settings.supportHours || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, supportHours: e.target.value }))}
                  placeholder="پاسخگویی همه‌روزه، ساعت ۹ صبح الی ۲۳"
                  className="text-xs p-2.5 rounded-xl border border-gray-300 bg-white font-medium"
                />
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-500" />
                    <span>آدرس دفتر هماهنگی:</span>
                  </span>
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-xs select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.showAddress !== false)}
                      onChange={(e) => setSettings(prev => ({ ...prev, showAddress: e.target.checked }))}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                    <span>نمایش</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={settings.officeLocation || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, officeLocation: e.target.value }))}
                  placeholder="دفتر هماهنگی و ارسال مرسولات دبی و ایران"
                  className="text-xs p-2.5 rounded-xl border border-gray-300 bg-white font-medium"
                />
              </div>
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
