import React, { useState, useEffect } from 'react';
import { saveSettingsToFirestore, saveCmsToFirestore } from '../firebase';
import {
  Calculator, Plus, Trash2, Save, CheckCircle2, ArrowUp, ArrowDown,
  Layers, Sparkles, Truck, Percent, Coins, RefreshCw, Info, Lock
} from 'lucide-react';
import { FinancialSettings, CmsConfig, PricingRulesConfig, CommissionRule, ShippingIncrementRule } from '../types';
import {
  DEFAULT_PRICING_RULES,
  loadPricingRulesFromStorage,
  savePricingRulesToStorage,
  calculateOrderPricing
} from '../utils/pricingEngine';
import { formatToman } from '../utils/formatters';

export const PricingRulesAdmin: React.FC<any> = ({ settings, onUpdateSettings, cms, onUpdateCms, onSavePricingRules }) => {
  const [isReady, setIsReady] = useState(false);
  
  // States
  const [aedRateInput, setAedRateInput] = useState<string>('53000');
  const [manualAedRateInput, setManualAedRateInput] = useState<string>('53000');
  const [autoUpdateRates, setAutoUpdateRates] = useState<boolean>(true);
  const [currencyApiUrl, setCurrencyApiUrl] = useState<string>('');
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [shippingIncrementRules, setShippingIncrementRules] = useState<ShippingIncrementRule[]>([]);
  
  // لود اولیه دیتای ایمن
  useEffect(() => {
    if (settings) {
      const config = cms?.pricingRules || loadPricingRulesFromStorage() || DEFAULT_PRICING_RULES;
      setAedRateInput(String(settings.aedRate || 53000));
      setManualAedRateInput(String(settings.manualAedRate || settings.aedRate || 53000));
      setAutoUpdateRates(cms?.apiConfig?.autoUpdateRates ?? true);
      setCurrencyApiUrl(cms?.apiConfig?.currencyApiUrl || '');
      setCommissionRules(config.commissionRules || []);
      setShippingIncrementRules(config.shippingIncrementRules || []);
      setIsReady(true);
    }
  }, [settings, cms]);

  // محافظت در برابر صفحه سفید
  if (!isReady) {
    return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">در حال بارگذاری ایمن...</div>;
  }

  // توابع هندلر و رندر اصلی
  const handleSaveAllRules = async () => {
    const configToSave = { 
        commissionRules, 
        shippingIncrementRules, 
        baseCommission: { percentage: 20, isEnabled: true },
        shippingConfig: { baseShippingCostAed: 20, minShippingCostAed: 20, maxShippingCostAed: 40 }
    };
    await saveCmsToFirestore({ ...cms, pricingRules: configToSave });
    alert("ذخیره شد");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
        <h2 className="font-black text-xl">پنل تنظیمات قیمت‌گذاری</h2>
        <button onClick={handleSaveAllRules} className="bg-black text-white px-6 py-3 rounded-2xl text-xs font-bold">ذخیره نهایی</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* بخش قوانین کارمزد */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold">قوانین کارمزد</h3>
            <button onClick={() => setCommissionRules([...commissionRules, { id: 'r-'+Date.now(), minAmountAed: 0, maxAmountAed: 1000, commissionPercent: 10, isEnabled: true }])} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg">+ افزودن</button>
          </div>
          <div className="space-y-2">
            {(commissionRules || []).map((rule, idx) => (
              <div key={rule.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl">
                 <span className="text-xs font-bold">{idx+1}</span>
                 <input type="number" value={rule.minAmountAed} onChange={e => setCommissionRules(commissionRules.map(r => r.id === rule.id ? {...r, minAmountAed: parseFloat(e.target.value)} : r))} className="w-full p-1 border rounded" />
                 <button onClick={() => setCommissionRules(commissionRules.filter(r => r.id !== rule.id))} className="text-rose-500">حذف</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};