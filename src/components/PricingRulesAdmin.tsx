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
  calculateOrderPricing
} from '../utils/pricingEngine';
import { formatToman } from '../utils/formatters';
import { getEffectiveGeminiKey } from '../utils/geminiKey';

interface PricingRulesAdminProps {
  settings: FinancialSettings;
  onUpdateSettings?: (newSettings: FinancialSettings) => void;
  cms?: CmsConfig | null;
  onUpdateCms?: (newCms: CmsConfig) => void;
  onSavePricingRules?: (newRules: PricingRulesConfig) => void;
}

const sanitizeNumericInput = (val: string): string => {
  if (val === '') return '';
  let cleaned = val.replace(/^0+(?=\d)/, '');
  if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
  return cleaned;
};

const handleNumberInputFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

export const PricingRulesAdmin: React.FC<PricingRulesAdminProps> = ({
  settings, onUpdateSettings, cms, onUpdateCms, onSavePricingRules
}) => {
  // Safe initial config
  const initialConfig = cms?.pricingRules || loadPricingRulesFromStorage() || DEFAULT_PRICING_RULES;

  const [aedRateInput, setAedRateInput] = useState<string>(String(settings.aedRate || 53000));
  const [manualAedRateInput, setManualAedRateInput] = useState<string>(String(settings.manualAedRate || settings.aedRate || 53000));
  const [autoUpdateRates, setAutoUpdateRates] = useState<boolean>(cms?.apiConfig?.autoUpdateRates ?? true);
  const [currencyApiUrl, setCurrencyApiUrl] = useState<string>(cms?.apiConfig?.currencyApiUrl || '');
  const [cargoRateKgInput, setCargoRateKgInput] = useState<string>(String(settings.cargoRatePerKg || 35));
  const [profitMarginInput, setProfitMarginInput] = useState<string>(String(settings.profitMargin || 15));

  const [baseCommissionPercent, setBaseCommissionPercent] = useState<string>(String(initialConfig.baseCommission?.percentage ?? 20));
  const [isBaseCommissionEnabled, setIsBaseCommissionEnabled] = useState<boolean>(initialConfig.baseCommission?.isEnabled ?? true);
  
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>(initialConfig.commissionRules || DEFAULT_PRICING_RULES.commissionRules);
  const [shippingIncrementRules, setShippingIncrementRules] = useState<ShippingIncrementRule[]>(initialConfig.shippingIncrementRules || DEFAULT_PRICING_RULES.shippingIncrementRules);

  const [baseShippingCost, setBaseShippingCost] = useState<string>(String(initialConfig.shippingConfig?.baseShippingCostAed ?? 20));
  const [minShippingCost, setMinShippingCost] = useState<string>(String(initialConfig.shippingConfig?.minShippingCostAed ?? 20));
  const [maxShippingCost, setMaxShippingCost] = useState<string>(String(initialConfig.shippingConfig?.maxShippingCostAed ?? 40));

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [simOrderAmount, setSimOrderAmount] = useState<string>('750');
  const [simProductCount, setSimProductCount] = useState<string>('2');
  const [simAedRate, setSimAedRate] = useState<string>(String(settings.aedRate || 53000));
  const [rateTestResult, setRateTestResult] = useState<any>(null);
  const [isTestingRateApi, setIsTestingRateApi] = useState<boolean>(false);

  // Sync state when CMS props update (Crucial for preventing blank screens)
  useEffect(() => {
    if (cms?.pricingRules) {
      setCommissionRules(cms.pricingRules.commissionRules || DEFAULT_PRICING_RULES.commissionRules);
      setShippingIncrementRules(cms.pricingRules.shippingIncrementRules || DEFAULT_PRICING_RULES.shippingIncrementRules);
      setBaseCommissionPercent(String(cms.pricingRules.baseCommission?.percentage ?? 20));
      setIsBaseCommissionEnabled(cms.pricingRules.baseCommission?.isEnabled ?? true);
      setBaseShippingCost(String(cms.pricingRules.shippingConfig?.baseShippingCostAed ?? 20));
      setMinShippingCost(String(cms.pricingRules.shippingConfig?.minShippingCostAed ?? 20));
      setMaxShippingCost(String(cms.pricingRules.shippingConfig?.maxShippingCostAed ?? 40));
    }
  }, [cms]);

  const getCurrentRulesConfig = (): PricingRulesConfig => ({
    baseCommission: {
      percentage: Math.max(0, parseFloat(baseCommissionPercent) || 0),
      isEnabled: isBaseCommissionEnabled
    },
    commissionRules: commissionRules || [],
    shippingConfig: {
      baseShippingCostAed: Math.max(0, parseFloat(baseShippingCost) || 0),
      minShippingCostAed: Math.max(0, parseFloat(minShippingCost) || 0),
      maxShippingCostAed: Math.max(0, parseFloat(maxShippingCost) || 0)
    },
    shippingIncrementRules: shippingIncrementRules || []
  });

  const simResult = calculateOrderPricing(
    parseFloat(simOrderAmount) || 0,
    parseInt(simProductCount) || 1,
    parseFloat(simAedRate) || (parseFloat(aedRateInput) || 53000),
    getCurrentRulesConfig()
  );

  const handleSaveAllRules = async () => {
    setIsSaving(true);
    const newSettings = {
      ...settings,
      aedRate: parseFloat(aedRateInput) || 53000,
      manualAedRate: parseFloat(manualAedRateInput) || 53000,
      autoUpdateRates,
      cargoRatePerKg: parseFloat(cargoRateKgInput) || 35,
      profitMargin: parseFloat(profitMarginInput) || 15
    };

    if (onUpdateSettings) onUpdateSettings(newSettings);
    
    try {
      await saveSettingsToFirestore(newSettings);
      const configToSave = getCurrentRulesConfig();
      const updatedCms = {
        ...(cms || { stores: [], localInventory: [], deals: [], warehouseCategories: [] }),
        pricingRules: configToSave,
        apiConfig: { ...(cms?.apiConfig || { scraperEndpoint: '', geminiApiKey: '' }), currencyApiUrl, autoUpdateRates }
      };
      await saveCmsToFirestore(updatedCms);
      if (onUpdateCms) onUpdateCms(updatedCms);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestApiRate = async () => {
    setIsTestingRateApi(true);
    try {
      const res = await fetch(`/api/currency/aed?url=${encodeURIComponent(currencyApiUrl)}&forceApi=true`);
      const data = await res.json();
      if (res.ok && data.rate) {
        setRateTestResult({ message: `نرخ: ${data.rate}`, type: 'success', rate: data.rate });
        setAedRateInput(String(data.rate));
        setSimAedRate(String(data.rate));
      }
    } catch (e) {
      setRateTestResult({ message: 'خطا در ارتباط', type: 'error' });
    } finally {
      setIsTestingRateApi(false);
    }
  };

  const handleForceManualRate = () => {
    setAutoUpdateRates(false);
    setAedRateInput(manualAedRateInput);
    setSimAedRate(manualAedRateInput);
  };

  const handleAddCommissionRule = () => setCommissionRules([...(commissionRules || []), { id: 'r-' + Date.now(), minAmountAed: 0, maxAmountAed: 1000, commissionPercent: 10, isEnabled: true }]);
  const handleUpdateCommissionRule = (id: string, field: keyof CommissionRule, value: any) => setCommissionRules(prev => (prev || []).map(r => r.id === id ? { ...r, [field]: value } : r));
  const handleDeleteCommissionRule = (id: string) => setCommissionRules(prev => (prev || []).filter(r => r.id !== id));
  const handleMoveCommissionRule = (idx: number, dir: 'up' | 'down') => {
    const rules = [...(commissionRules || [])];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    [rules[idx], rules[target]] = [rules[target], rules[idx]];
    setCommissionRules(rules);
  };
  const handleAddShippingIncrementRule = () => setShippingIncrementRules([...(shippingIncrementRules || []), { id: 's-' + Date.now(), itemNumber: (shippingIncrementRules || []).length + 2, additionalCostAed: 5, isEnabled: true }]);
  const handleUpdateShippingIncrementRule = (id: string, field: keyof ShippingIncrementRule, value: any) => setShippingIncrementRules(prev => (prev || []).map(r => r.id === id ? { ...r, [field]: value } : r));
  const handleDeleteShippingIncrementRule = (id: string) => setShippingIncrementRules(prev => (prev || []).filter(r => r.id !== id));

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] animate-fade-in text-slate-800">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs flex items-center justify-between">
        <h2 className="font-extrabold text-lg">پنل تنظیمات قیمت‌گذاری</h2>
        <button onClick={handleSaveAllRules} disabled={isSaving} className="bg-black text-white px-6 py-3 rounded-2xl font-bold text-xs cursor-pointer">
          {isSaving ? 'در حال ذخیره...' : 'ذخیره نهایی'}
        </button>
      </div>

      {saveSuccess && <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-800 font-bold text-xs">با موفقیت ذخیره شد.</div>}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-black text-base">تنظیمات نرخ درهم</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={manualAedRateInput} onChange={e => setManualAedRateInput(e.target.value)} className="border p-2 rounded-xl" placeholder="نرخ دستی"/>
            <button onClick={handleForceManualRate} className="bg-amber-500 text-white p-2 rounded-xl text-xs font-bold">قفل روی نرخ دستی</button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="font-black">قوانین کارمزد</h3>
            <button onClick={handleAddCommissionRule} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">+ افزودن قانون</button>
        </div>
        {(commissionRules || []).map((rule, idx) => (
            <div key={rule.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-xs">{idx + 1}</span>
                <input type="number" value={rule.minAmountAed} onChange={e => handleUpdateCommissionRule(rule.minAmountAed.toString(), 'minAmountAed', parseFloat(e.target.value))} className="w-20 p-1 border rounded" />
                <input type="number" value={rule.commissionPercent} onChange={e => handleUpdateCommissionRule(rule.id, 'commissionPercent', parseFloat(e.target.value))} className="w-20 p-1 border rounded" />
                <button onClick={() => handleDeleteCommissionRule(rule.id)} className="text-rose-500 text-xs">حذف</button>
            </div>
        ))}
      </div>
    </div>
  );
};