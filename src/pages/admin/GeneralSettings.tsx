import React, { useState, useEffect } from 'react';
import {
  Coins,
  TrendingUp,
  Package,
  DollarSign,
  Save,
  RefreshCw,
  Building2,
  Percent,
  Calculator
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { FinancialSettings } from '../../types';

interface GeneralSettingsProps {
  onSaved?: (settings: FinancialSettings) => void;
  onNavigateToLanding?: () => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ onSaved, onNavigateToLanding }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [aedRate, setAedRate] = useState<number>(18500);
  const [cargoFee, setCargoFee] = useState<number>(35);
  const [profitMargin, setProfitMargin] = useState<number>(15);
  const [minOrderToman, setMinOrderToman] = useState<number>(0);
  const [minOrderEnabled, setMinOrderEnabled] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 1. Fetch initial settings from Firestore settings/pricing and settings/financial
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        if (!db) return;
        const snap = await getDoc(doc(db, 'settings', 'financial'));
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data.aedRate) setAedRate(Number(data.aedRate));
          if (data.cargoFeePerKg) setCargoFee(Number(data.cargoFeePerKg));
          if (data.profitMarginPercent) setProfitMargin(Number(data.profitMarginPercent));
        }

        const pricingSnap = await getDoc(doc(db, 'settings', 'pricing'));
        if (pricingSnap.exists() && isMounted) {
          const pData = pricingSnap.data();
          if (pData.minOrderAmountToman !== undefined) setMinOrderToman(Number(pData.minOrderAmountToman));
          if (pData.minOrderLimitEnabled !== undefined) setMinOrderEnabled(Boolean(pData.minOrderLimitEnabled));
        }
      } catch (err) {
        console.warn('Error loading financial settings:', err);
      }
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      if (db) {
        // Save to settings/financial
        await setDoc(doc(db, 'settings', 'financial'), {
          aedRate,
          cargoFeePerKg: cargoFee,
          profitMarginPercent: profitMargin,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Save to settings/pricing
        await setDoc(doc(db, 'settings', 'pricing'), {
          aedRate,
          cargoFeePerKg: cargoFee,
          profitMarginPercent: profitMargin,
          minOrderAmountToman: minOrderToman,
          minOrderLimitEnabled: minOrderEnabled,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Sync local storage
      const financialSettings: FinancialSettings = {
        aedRate,
        manualAedRate: aedRate,
        cargoFeePerKg: cargoFee,
        profitMarginPercent: profitMargin,
        minOrderAmountToman: minOrderToman,
        minOrderLimitEnabled: minOrderEnabled,
        insurancePercent: 0,
        customsFeePercent: 0,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('sirikfit_financial_settings', JSON.stringify(financialSettings));
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { financialSettings } }));

      if (onSaved) onSaved(financialSettings);
      setStatusMessage('تنظیمات مالی و محاسباتی با موفقیت در سیستم ثبت شد.');
    } catch (err) {
      console.error('Error saving general settings:', err);
      setStatusMessage('خطا در ذخیره‌سازی تنظیمات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-['Vazirmatn',sans-serif] text-right" dir="rtl">
      {/* Notice Banner */}
      <div className="bg-gradient-to-r from-red-50 to-slate-50 border border-red-200/80 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm text-slate-900">تنظیمات پایه و فرمول محاسبات</h4>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              تنظیمات لندینگ، درباره ما، اطلاعات تماس، قوانین و سوالات متداول به تب «مدیریت لندینگ و اطلاع‌رسانی» منتقل شده است.
            </p>
          </div>
        </div>

        {onNavigateToLanding && (
          <button
            type="button"
            onClick={onNavigateToLanding}
            className="px-4 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-black rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Building2 className="w-4 h-4 text-red-500" />
            <span>تنظیمات لندینگ</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900">پیکربندی نرخ ارز و پارامترهای قیمت‌گذاری</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">محاسبه خودکار قیمت تمام‌شده کالاها بر مبنای درهم امارات</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AED Rate */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>نرخ هر درهم امارات (تومان):</span>
            </label>
            <input
              type="number"
              value={aedRate}
              onChange={(e) => setAedRate(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black transition"
              required
            />
          </div>

          {/* Cargo Fee */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-sky-500" />
              <span>هزینه کارگو به ازای هر کیلو (درهم):</span>
            </label>
            <input
              type="number"
              value={cargoFee}
              onChange={(e) => setCargoFee(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black transition"
              required
            />
          </div>

          {/* Profit Margin */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>درصد سود و کارمزد خرید (%):</span>
            </label>
            <input
              type="number"
              value={profitMargin}
              onChange={(e) => setProfitMargin(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black transition"
              required
            />
          </div>
        </div>

        {/* Minimum Order Limit */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-slate-900 block">محدودیت حداقل مبلغ سفارش</span>
              <span className="text-[11px] text-slate-500 font-medium block">جلوگیری از ثبت سفارش‌های کمتر از سقف مشخص</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={minOrderEnabled}
                onChange={(e) => setMinOrderEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full dir-ltr peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
            </label>
          </div>

          {minOrderEnabled && (
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">حداقل مبلغ سفارش (تومان):</label>
              <input
                type="number"
                value={minOrderToman}
                onChange={(e) => setMinOrderToman(Number(e.target.value))}
                placeholder="مثال: 500000"
                className="w-full bg-white border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black transition font-bold"
              />
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800">
            {statusMessage}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3.5 bg-black hover:bg-slate-900 text-white text-xs font-black rounded-2xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-red-500" />}
          <span>{isSaving ? 'در حال ذخیره‌سازی...' : 'ذخیره تنظیمات مالی'}</span>
        </button>
      </form>
    </div>
  );
};
