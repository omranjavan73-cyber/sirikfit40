import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Truck,
  Percent,
  Coins,
  ShieldCheck,
  RefreshCw,
  Info,
  ToggleLeft,
  ToggleRight,
  Lock
} from 'lucide-react';
import { FinancialSettings, CmsConfig, PricingRulesConfig, CommissionRule, ShippingIncrementRule } from '../types';
import {
  DEFAULT_PRICING_RULES,
  loadPricingRulesFromStorage,
  savePricingRulesToStorage,
  calculateOrderPricing
} from '../utils/pricingEngine';
import { formatToman, formatAed, toPersianDigits } from '../utils/formatters';
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
  // Strips leading zeros before any digits (e.g. "0200" -> "200", "020" -> "20", "0.5" -> "0.5", "00" -> "0")
  let cleaned = val.replace(/^0+(?=\d)/, '');
  if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
  return cleaned;
};

const handleNumberInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.select();
};

export const PricingRulesAdmin: React.FC<PricingRulesAdminProps> = ({
  settings,
  onUpdateSettings,
  cms,
  onUpdateCms,
  onSavePricingRules
}) => {
  // Load initial configuration
  const initialConfig = cms?.pricingRules || loadPricingRulesFromStorage();

  // SECTION 0: AED Exchange Rate & Financial Settings State
  const [aedRateInput, setAedRateInput] = useState<string>(String(settings.aedRate || 53000));
  const [manualAedRateInput, setManualAedRateInput] = useState<string>(
    String(settings.manualAedRate || settings.aedRate || 53000)
  );
  const [autoUpdateRates, setAutoUpdateRates] = useState<boolean>(
    cms?.apiConfig?.autoUpdateRates ?? true
  );
  const [currencyApiUrl, setCurrencyApiUrl] = useState<string>(
    cms?.apiConfig?.currencyApiUrl || ''
  );
  const [cargoRateKgInput, setCargoRateKgInput] = useState<string>(
    String(settings.cargoRatePerKg || 35)
  );
  const [profitMarginInput, setProfitMarginInput] = useState<string>(
    String(settings.profitMargin || 15)
  );

  const [isTestingRateApi, setIsTestingRateApi] = useState<boolean>(false);
  const [rateTestResult, setRateTestResult] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
    rate?: number;
  } | null>(null);

  // SECTION 1: Base Commission State
  const [baseCommissionPercent, setBaseCommissionPercent] = useState<string>(
    String(initialConfig.baseCommission?.percentage ?? 20)
  );
  const [isBaseCommissionEnabled, setIsBaseCommissionEnabled] = useState<boolean>(
    initialConfig.baseCommission?.isEnabled ?? true
  );

  // SECTION 2: Commission Rules State
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>(
    initialConfig.commissionRules && initialConfig.commissionRules.length > 0
      ? initialConfig.commissionRules
      : DEFAULT_PRICING_RULES.commissionRules
  );

  // SECTION 3: Shipping Configuration State
  const [baseShippingCost, setBaseShippingCost] = useState<string>(
    String(initialConfig.shippingConfig?.baseShippingCostAed ?? 20)
  );
  const [minShippingCost, setMinShippingCost] = useState<string>(
    String(initialConfig.shippingConfig?.minShippingCostAed ?? 20)
  );
  const [maxShippingCost, setMaxShippingCost] = useState<string>(
    String(initialConfig.shippingConfig?.maxShippingCostAed ?? 40)
  );

  // SECTION 4: Shipping Increment Rules State
  const [shippingIncrementRules, setShippingIncrementRules] = useState<ShippingIncrementRule[]>(
    initialConfig.shippingIncrementRules && initialConfig.shippingIncrementRules.length > 0
      ? initialConfig.shippingIncrementRules
      : DEFAULT_PRICING_RULES.shippingIncrementRules
  );

  // UI Save / Toast State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // SECTION 7: Live Pricing Simulator State
  const [simOrderAmount, setSimOrderAmount] = useState<string>('750');
  const [simProductCount, setSimProductCount] = useState<string>('2');
  const [simAedRate, setSimAedRate] = useState<string>(String(settings.aedRate || 53000));

  // Active AED Rate calculation
  const currentActiveAedRate = autoUpdateRates
    ? (parseFloat(aedRateInput) || parseFloat(manualAedRateInput) || 53000)
    : (parseFloat(manualAedRateInput) || 53000);

  // Sync state if settings change
  useEffect(() => {
    if (settings) {
      setAedRateInput(String(settings.aedRate || 53000));
      setManualAedRateInput(String(settings.manualAedRate || settings.aedRate || 53000));
      setCargoRateKgInput(String(settings.cargoRatePerKg || 35));
      setProfitMarginInput(String(settings.profitMargin || 15));
      setSimAedRate(String(settings.aedRate || 53000));
    }
  }, [settings.aedRate, settings.manualAedRate, settings.cargoRatePerKg, settings.profitMargin]);

  useEffect(() => {
    if (cms?.apiConfig) {
      setCurrencyApiUrl(cms.apiConfig.currencyApiUrl || '');
      setAutoUpdateRates(cms.apiConfig.autoUpdateRates ?? true);
    }
  }, [cms?.apiConfig?.currencyApiUrl, cms?.apiConfig?.autoUpdateRates]);

  // Build current rules config object dynamically
  const getCurrentRulesConfig = (): PricingRulesConfig => {
    return {
      baseCommission: {
        percentage: Math.max(0, parseFloat(baseCommissionPercent) || 0),
        isEnabled: isBaseCommissionEnabled
      },
      commissionRules,
      shippingConfig: {
        baseShippingCostAed: Math.max(0, parseFloat(baseShippingCost) || 0),
        minShippingCostAed: Math.max(0, parseFloat(minShippingCost) || 0),
        maxShippingCostAed: Math.max(0, parseFloat(maxShippingCost) || 0)
      },
      shippingIncrementRules
    };
  };

  // Run calculation simulator
  const activeConfig = getCurrentRulesConfig();
  const simResult = calculateOrderPricing(
    parseFloat(simOrderAmount) || 0,
    parseInt(simProductCount) || 1,
    parseFloat(simAedRate) || currentActiveAedRate,
    activeConfig
  );

  // SECTION 0 Handlers: Rate API Test & Manual Lock
  const handleTestApiRate = async () => {
    if (!currencyApiUrl.trim()) {
      setRateTestResult({
        message: 'لطفاً آدرس API استعلام نرخ را وارد کنید.',
        type: 'warning'
      });
      return;
    }
    setIsTestingRateApi(true);
    setRateTestResult(null);
    try {
      const res = await fetch(`/api/currency/aed?url=${encodeURIComponent(currencyApiUrl)}&forceApi=true`);
      const data = await res.json();
      if (res.ok && data.success && data.rate) {
        setRateTestResult({
          message: `استعلام با موفقیت انجام شد. نرخ دریافتی از API: ${data.rate.toLocaleString('fa-IR')} تومان`,
          type: 'success',
          rate: data.rate
        });
        if (autoUpdateRates) {
          setAedRateInput(String(data.rate));
          setSimAedRate(String(data.rate));
        }
      } else {
        setRateTestResult({
          message: data.warning || data.error || 'پاسخ نامعتبر از API استعلام نرخ. نرخ دستی جایگزین شد.',
          type: 'warning'
        });
      }
    } catch (e) {
      setRateTestResult({
        message: 'خطا در برقراری ارتباط با API استعلام نرخ. سیستم به صورت خودکار به نرخ دستی بازمی‌گردد.',
        type: 'error'
      });
    } finally {
      setIsTestingRateApi(false);
    }
  };

  const handleForceManualRate = () => {
    setAutoUpdateRates(false);
    const manualNum = parseFloat(manualAedRateInput) || 53000;
    setAedRateInput(String(manualNum));
    setSimAedRate(String(manualNum));
    setRateTestResult({
      message: `سیستم قفل شد روی نرخ دستی: ${manualNum.toLocaleString('fa-IR')} تومان`,
      type: 'success'
    });
  };

  // SECTION 2 Handlers: Commission Rules
  const handleAddCommissionRule = () => {
    const lastRule = commissionRules[commissionRules.length - 1];
    const newMin = lastRule ? (lastRule.maxAmountAed || lastRule.minAmountAed + 1000) : 2000;
    const newRule: CommissionRule = {
      id: 'rule-' + Date.now(),
      minAmountAed: newMin,
      maxAmountAed: newMin + 1000,
      commissionPercent: 12,
      isEnabled: true
    };
    setCommissionRules([...commissionRules, newRule]);
  };

  const handleUpdateCommissionRule = (id: string, field: keyof CommissionRule, value: any) => {
    setCommissionRules(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleDeleteCommissionRule = (id: string) => {
    setCommissionRules(prev => prev.filter(r => r.id !== id));
  };

  const handleMoveCommissionRule = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === commissionRules.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...commissionRules];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCommissionRules(updated);
  };

  // SECTION 4 Handlers: Shipping Increment Rules
  const handleAddShippingIncrementRule = () => {
    const nextItemNumber = shippingIncrementRules.length + 2;
    const newRule: ShippingIncrementRule = {
      id: 'ship-inc-' + Date.now(),
      itemNumber: nextItemNumber,
      additionalCostAed: 5,
      isEnabled: true
    };
    setShippingIncrementRules([...shippingIncrementRules, newRule]);
  };

  const handleUpdateShippingIncrementRule = (id: string, field: keyof ShippingIncrementRule, value: any) => {
    setShippingIncrementRules(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleDeleteShippingIncrementRule = (id: string) => {
    setShippingIncrementRules(prev => prev.filter(r => r.id !== id));
  };

  // Unified Save Config Handler
 // Unified Save Config Handler
  const handleSaveAllRules = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const manualAedRate = Math.max(1, parseFloat(manualAedRateInput) || 53000);
    const aedRate = autoUpdateRates
      ? (rateTestResult?.rate || Math.max(1, parseFloat(aedRateInput) || manualAedRate))
      : manualAedRate;
    const cargoRatePerKg = Math.max(0, parseFloat(cargoRateKgInput) || 35);
    const profitMargin = Math.max(0, parseFloat(profitMarginInput) || 15);
    const savedGeminiKey = getEffectiveGeminiKey(cms?.apiConfig?.geminiApiKey);

    const newSettingsPayload = {
      ...settings,
      aedRate,
      manualAedRate,
      autoUpdateRates,
      currencyApiUrl,
      cargoRatePerKg,
      profitMargin
    };

    // 1. آپدیت لحظه‌ای state در سطح برنامه والد (App.tsx)
    if (onUpdateSettings) {
      onUpdateSettings(newSettingsPayload);
    }

    // 2. ذخیره روی LocalStorage برای پایداری بعد از رفرش
    try {
      localStorage.setItem('sirikfit_financial_settings', JSON.stringify(newSettingsPayload));
      localStorage.setItem('omex_financial_settings', JSON.stringify(newSettingsPayload));
    } catch (_e) {}

    try {
      // 3. ذخیره مستقیم و ایمن در فایربیس (بدون نیاز به پشتبانی سرور API)
      await saveSettingsToFirestore(newSettingsPayload);

      const configToSave = {
        shippingIncrementRules,
        // سایر قوانین موجود در کامپوننت شما...
      };

      if (cms) {
        const updatedCms = {
          ...cms,
          pricingRules: configToSave,
          apiConfig: {
            ...(cms?.apiConfig || { scraperEndpoint: '', geminiApiKey: '' }),
            currencyApiUrl,
            autoUpdateRates
          }
        };
        if (onUpdateCms) {
          onUpdateCms(updatedCms);
        }
        await saveCmsToFirestore(updatedCms);
      }

      if (onSavePricingRules) {
        onSavePricingRules(configToSave);
      }

      setSaveSuccess(true);
    } catch (e) {
      console.error('Error saving pricing rules to Firebase:', e);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 3500);
    }
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] animate-fade-in text-slate-800">
      
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight flex items-center gap-2">
              <span>قوانین قیمت‌گذاری، نرخ درهم و کارمزد SIRIK FIT</span>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                پنل یکپارچه
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              تنظیم نرخ درهم (خودکار/دستی)، درصد کارمزد، فرمول هزینه ارسال و شبیه‌ساز قیمت در یک صفحه واحد
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAllRules}
          disabled={isSaving}
          className="bg-[#111111] hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-3 rounded-2xl transition shadow-sm flex items-center gap-2 cursor-pointer shrink-0 w-full sm:w-auto justify-center"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>در حال ذخیره...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>ذخیره قوانین قیمت‌گذاری و نرخ درهم</span>
            </>
          )}
        </button>
      </div>

      {/* Success Toast / Notification */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-extrabold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>تنظیمات نرخ درهم و قوانین قیمت‌گذاری با موفقیت ذخیره شد و در تمام بخش‌های فروشگاه اعمال گردید.</span>
          </div>
          <span className="text-[10px] bg-emerald-100 px-2 py-1 rounded-md text-emerald-900 font-bold">
            اعمال آنی (Real-Time)
          </span>
        </div>
      )}

      {/* SECTION 0: AED Exchange Rate Configuration (تنظیمات نرخ درهم) */}
      <div id="ap-rate" className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-6">
        
        {/* Header Bar with Active Rate Display */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-900">
                  تنظیمات نرخ درهم دبی (AED Exchange Rate Configuration)
                </h3>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-200">
                  Dual Mode Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                مدیریت نرخ مبنای محاسبه سفارشات، بین استعلام خودکار آنلاین از API و نرخ ثابت/دستی
              </p>
            </div>
          </div>

          {/* Active Status Badge */}
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex items-center gap-3 self-start lg:self-auto shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block">نرخ فعلی مبنای محاسبات:</span>
              <span className="text-base font-black text-slate-900 dir-ltr font-mono block">
                {formatToman(currentActiveAedRate)}
              </span>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${
              autoUpdateRates
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}>
              {autoUpdateRates ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>به‌روزرسانی آنلاین API</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>قفل شده روی نرخ دستی</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dual Mode Card Selector (Two Big Interactive Cards) */}
        <div>
          <label className="text-xs font-black text-slate-800 block mb-2.5">
            انتخاب حالت قیمت‌گذاری و استعلام ارز (Mode Selection):
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Auto Update via API */}
            <div
              onClick={() => setAutoUpdateRates(true)}
              className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                autoUpdateRates
                  ? 'bg-emerald-50/40 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    autoUpdateRates ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">۱. به‌روزرسانی خودکار و آنلاین (API Mode)</h4>
                    <span className="text-[10px] text-slate-500 font-medium block">استعلام لحظه‌ای نرخ درهم از سرویس ارز</span>
                  </div>
                </div>

                <div className="shrink-0">
                  {autoUpdateRates ? (
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>حالت فعال</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      غیرفعال
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                سیستم با هر سفارش یا درخواست، نرخ روز درهم را مستقیم از سرویس استعلام API دریافت کرده و قیمت‌های ریالی را بروز نگه می‌دارد.
              </p>
            </div>

            {/* Card 2: Manual Fixed Rate */}
            <div
              onClick={() => handleForceManualRate()}
              className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                !autoUpdateRates
                  ? 'bg-amber-50/40 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                  : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    !autoUpdateRates ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">۲. نرخ ثابت و دستی (Manual Fixed Rate)</h4>
                    <span className="text-[10px] text-slate-500 font-medium block">ثابت ماندن نرخ بر روی عدد تعیین‌شده توسط مدیریت</span>
                  </div>
                </div>

                <div className="shrink-0">
                  {!autoUpdateRates ? (
                    <span className="bg-amber-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>قفل دستی فعال</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      غیرفعال
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                استعلام از API نادیده گرفته شده و تمام محاسبات قیمت فقط بر اساس عدد دستی وارد شده پایین انجام می‌پذیرد.
              </p>
            </div>

          </div>
        </div>

        {/* Input Configuration Grid */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            
            {/* Manual Rate Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>نرخ دستی / ثابت درهم (تومان):</span>
                {!autoUpdateRates && (
                  <span className="text-[10px] text-amber-700 font-extrabold bg-amber-100 px-1.5 py-0.5 rounded">
                    در حال استفاده
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={manualAedRateInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+(?=\d)/, '');
                    setManualAedRateInput(val);
                    if (!autoUpdateRates) {
                      setAedRateInput(val);
                    }
                    setSimAedRate(val);
                  }}
                  onFocus={handleNumberInputFocus}
                  placeholder="19500"
                  className="w-full bg-white border border-slate-300 focus:border-slate-900 text-slate-900 font-black text-sm px-3.5 py-2.5 rounded-xl focus:outline-none transition dir-ltr text-left font-mono pl-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  تومان
                </span>
              </div>
            </div>

            {/* Rate API URL Input */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>آدرس آندپینت API استعلام آنلاین (Currency API Endpoint):</span>
                {autoUpdateRates && (
                  <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded">
                    در حال استفاده
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={currencyApiUrl}
                  onChange={(e) => setCurrencyApiUrl(e.target.value)}
                  placeholder="https://api.navasan.tech/latest?api_key=..."
                  className="w-full bg-white border border-slate-300 focus:border-slate-900 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition font-mono dir-ltr text-left"
                />
                <button
                  type="button"
                  onClick={handleTestApiRate}
                  disabled={isTestingRateApi}
                  className="bg-slate-900 hover:bg-black text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                >
                  <RefreshCw className={`w-4 h-4 ${isTestingRateApi ? 'animate-spin text-amber-400' : ''}`} />
                  <span>تست استعلام API</span>
                </button>
              </div>
            </div>

          </div>

          {/* Test Preview Result Banner */}
          {rateTestResult && (
            <div className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 shadow-2xs ${
              rateTestResult.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : rateTestResult.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 shrink-0" />
                <span>{rateTestResult.message}</span>
              </div>
              {rateTestResult.rate && (
                <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-900 font-mono text-xs font-black shrink-0 dir-ltr shadow-2xs">
                  {formatToman(rateTestResult.rate)}
                </span>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Grid: Section 1 (Base Commission) & Section 3 (Shipping Config) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* SECTION 1 - Base Commission */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Percent className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">۱. کارمزد پایه (Base Commission)</h3>
            </div>

            {/* Toggle Switch */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-extrabold text-slate-700">
                {isBaseCommissionEnabled ? 'فعال' : 'غیرفعال'}
              </span>
              <input
                type="checkbox"
                checked={isBaseCommissionEnabled}
                onChange={(e) => setIsBaseCommissionEnabled(e.target.checked)}
                className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">درصد کارمزد پایه (%):</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={baseCommissionPercent}
                  onChange={(e) => setBaseCommissionPercent(sanitizeNumericInput(e.target.value))}
                  onFocus={handleNumberInputFocus}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-extrabold text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white transition"
                  placeholder="20"
                />
                <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">٪</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-relaxed">
                در صورتی که هیچ قانون متغیر دیگری شامل مبلغ سفارش نشود، این درصد به عنوان نرخ پیش‌فرض کارمزد محاسبه می‌شود.
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>مثال کاربردی:</span>
              </div>
              <p className="text-amber-800">
                اگر کارمزد پایه <strong>۲۰٪</strong> باشد و سفارش مشتری به ارزش <strong>۳۰۰ درهم</strong> ثبت گردد، مبلغ کارمزد برابر <strong>۶۰ درهم</strong> خواهد بود.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3 - Shipping Configuration */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">۳. تنظیمات هزینه ارسال (Shipping Configuration)</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1">هزینه ارسال پایه (AED):</label>
              <input
                type="number"
                min="0"
                value={baseShippingCost}
                onChange={(e) => setBaseShippingCost(sanitizeNumericInput(e.target.value))}
                onFocus={handleNumberInputFocus}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white"
                placeholder="20"
              />
              <span className="text-[10px] text-slate-400 font-bold mt-1 block">پیش‌فرض: ۲۰ درهم</span>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1">حداقل هزینه (AED):</label>
              <input
                type="number"
                min="0"
                value={minShippingCost}
                onChange={(e) => setMinShippingCost(sanitizeNumericInput(e.target.value))}
                onFocus={handleNumberInputFocus}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white"
                placeholder="20"
              />
              <span className="text-[10px] text-slate-400 font-bold mt-1 block">کف هزینه ارسال</span>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-700 block mb-1">حداکثر هزینه (AED):</label>
              <input
                type="number"
                min="0"
                value={maxShippingCost}
                onChange={(e) => setMaxShippingCost(sanitizeNumericInput(e.target.value))}
                onFocus={handleNumberInputFocus}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white"
                placeholder="40"
              />
              <span className="text-[10px] text-slate-400 font-bold mt-1 block">سقف هزینه ارسال</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            هزینه ارسال محاسبه‌شده هیچ‌گاه کمتر از <strong>حداقل ({minShippingCost} درهم)</strong> یا بیشتر از <strong>حداکثر ({maxShippingCost} درهم)</strong> نخواهد شد.
          </p>
        </div>
      </div>

      {/* SECTION 2 - Commission Rules Based on Order Value */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">۲. قوانین کارمزد بر اساس ارزش سفارش (Commission Rules)</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                تعیین پلکانی کارمزد بر اساس مبلغ کل سفارش مشتری (AED)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddCommissionRule}
            className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200 shrink-0"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>افزودن قانون کارمزد جدید</span>
          </button>
        </div>

        {/* Dynamic Rules List */}
        <div className="space-y-2.5">
          {commissionRules.map((rule, idx) => (
            <div
              key={rule.id}
              className={`p-3.5 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                rule.isEnabled ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200/60 opacity-60'
              }`}
            >
              {/* Rule Sequence Badge & Range Input */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block">حداقل مبلغ (AED):</label>
                    <input
                      type="number"
                      min="0"
                      value={rule.minAmountAed}
                      onChange={(e) => {
                        const clean = sanitizeNumericInput(e.target.value);
                        handleUpdateCommissionRule(rule.id, 'minAmountAed', clean === '' ? 0 : Math.max(0, parseFloat(clean) || 0));
                      }}
                      onFocus={handleNumberInputFocus}
                      className="w-full bg-slate-50 border border-slate-300 font-extrabold text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block">حداکثر مبلغ (AED / به بالا):</label>
                    <input
                      type="text"
                      value={rule.maxAmountAed === null ? 'به بالا' : rule.maxAmountAed}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (val === '' || val === 'به بالا' || val === 'null' || val === '∞') {
                          handleUpdateCommissionRule(rule.id, 'maxAmountAed', null);
                        } else {
                          const sanitized = sanitizeNumericInput(val);
                          const parsed = parseFloat(sanitized);
                          handleUpdateCommissionRule(rule.id, 'maxAmountAed', isNaN(parsed) ? null : parsed);
                        }
                      }}
                      onFocus={handleNumberInputFocus}
                      placeholder="مثلا 1000 یا 'به بالا'"
                      className="w-full bg-slate-50 border border-slate-300 font-extrabold text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-slate-900 text-indigo-700"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-extrabold text-slate-500 block">درصد کارمزد (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={rule.commissionPercent}
                      onChange={(e) => {
                        const clean = sanitizeNumericInput(e.target.value);
                        handleUpdateCommissionRule(rule.id, 'commissionPercent', clean === '' ? 0 : Math.max(0, parseFloat(clean) || 0));
                      }}
                      onFocus={handleNumberInputFocus}
                      className="w-full bg-slate-50 border border-slate-300 font-black text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-slate-900 text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Enable, Move Up/Down, Delete */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end">
                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={rule.isEnabled}
                    onChange={(e) => handleUpdateCommissionRule(rule.id, 'isEnabled', e.target.checked)}
                    className="w-3.5 h-3.5 text-slate-900 rounded focus:ring-slate-900"
                  />
                  <span>{rule.isEnabled ? 'فعال' : 'غیرفعال'}</span>
                </label>

                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveCommissionRule(idx, 'up')}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-700 cursor-pointer"
                  title="انتقال به بالا"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  disabled={idx === commissionRules.length - 1}
                  onClick={() => handleMoveCommissionRule(idx, 'down')}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-700 cursor-pointer"
                  title="انتقال به پایین"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteCommissionRule(rule.id)}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer transition border border-rose-200/60"
                  title="حذف قانون"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4 - Shipping Increment Rules */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">۴. افزایش هزینه ارسال با تعداد کالا (Shipping Increment Rules)</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                تعیین مبلغ اضافه برای کالای دوم، سوم، چهارم و... در یک سفارش
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddShippingIncrementRule}
            className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200 shrink-0"
          >
            <Plus className="w-4 h-4 text-purple-600" />
            <span>افزودن قانون افزایش کالا</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {shippingIncrementRules.map((incRule) => (
            <div
              key={incRule.id}
              className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                incRule.isEnabled ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg">
                  کالای {incRule.itemNumber}‌ام
                </span>

                <div className="flex items-center gap-1.5">
                  <label className="flex items-center gap-1 cursor-pointer text-[11px] font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={incRule.isEnabled}
                      onChange={(e) => handleUpdateShippingIncrementRule(incRule.id, 'isEnabled', e.target.checked)}
                      className="w-3.5 h-3.5 text-slate-900 rounded"
                    />
                    <span>{incRule.isEnabled ? 'فعال' : 'غیرفعال'}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleDeleteShippingIncrementRule(incRule.id)}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1">افزایش هزینه (AED):</label>
                <input
                  type="number"
                  min="0"
                  value={incRule.additionalCostAed}
                  onChange={(e) => {
                    const clean = sanitizeNumericInput(e.target.value);
                    handleUpdateShippingIncrementRule(
                      incRule.id,
                      'additionalCostAed',
                      clean === '' ? 0 : Math.max(0, parseFloat(clean) || 0)
                    );
                  }}
                  onFocus={handleNumberInputFocus}
                  className="w-full bg-slate-50 border border-slate-300 font-extrabold text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5 - Calculation Order Reference */}
      <div className="bg-[#111111] text-white rounded-3xl p-5 sm:p-6 shadow-md space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <h3 className="font-extrabold text-sm text-white">۵. ترتیب استاندارد محاسبه موتور قیمت‌گذاری (Calculation Order)</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1 text-[11px] font-extrabold">
          <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-center">
            <span className="block text-[10px] text-amber-400 font-black">گام ۱</span>
            <span>جمع سفارش (Subtotal)</span>
          </div>
          <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-center">
            <span className="block text-[10px] text-amber-400 font-black">گام ۲</span>
            <span>انتخاب قانون کارمزد</span>
          </div>
          <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-center">
            <span className="block text-[10px] text-amber-400 font-black">گام ۳</span>
            <span>محاسبه کارمزد درهمی</span>
          </div>
          <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-center">
            <span className="block text-[10px] text-amber-400 font-black">گام ۴</span>
            <span>محاسبه هزینه ارسال</span>
          </div>
          <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-center">
            <span className="block text-[10px] text-amber-400 font-black">گام ۵</span>
            <span>اعمال حداقل کف</span>
          </div>
          <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-center">
            <span className="block text-[10px] text-amber-400 font-black">گام ۶</span>
            <span>اعمال حداکثر سقف</span>
          </div>
          <div className="bg-amber-500 text-slate-950 p-2.5 rounded-xl text-center font-black col-span-2 sm:col-span-1">
            <span className="block text-[10px] opacity-80">گام ۷</span>
            <span>نمایش قیمت نهایی</span>
          </div>
        </div>
      </div>

      {/* SECTION 7 - Live Pricing Simulator */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 sm:p-6 shadow-md space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">۷. شبیه‌ساز زنده قیمت‌گذاری (Live Pricing Simulator)</h3>
              <p className="text-xs text-slate-500 font-medium">
                تست آنی کارکرد موتور قیمت‌گذاری با مقادیر نمونه درهمی
              </p>
            </div>
          </div>

          <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full border border-emerald-200">
            محاسبه فوری (Real-Time)
          </span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <label className="text-xs font-extrabold text-slate-800 block mb-1">ارزش کل سفارش (AED):</label>
            <input
              type="number"
              min="0"
              value={simOrderAmount}
              onChange={(e) => setSimOrderAmount(sanitizeNumericInput(e.target.value))}
              onFocus={handleNumberInputFocus}
              className="w-full bg-white border border-slate-300 text-slate-900 font-extrabold text-sm px-3.5 py-2 rounded-xl focus:outline-none focus:border-slate-900 shadow-2xs"
              placeholder="750"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-800 block mb-1">تعداد محصولات سفارش:</label>
            <input
              type="number"
              min="1"
              value={simProductCount}
              onChange={(e) => setSimProductCount(sanitizeNumericInput(e.target.value))}
              onFocus={handleNumberInputFocus}
              className="w-full bg-white border border-slate-300 text-slate-900 font-extrabold text-sm px-3.5 py-2 rounded-xl focus:outline-none focus:border-slate-900 shadow-2xs"
              placeholder="2"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-800 block mb-1">نرخ درهم فعال (تومان):</label>
            <input
              type="number"
              min="1"
              value={simAedRate}
              onChange={(e) => setSimAedRate(sanitizeNumericInput(e.target.value))}
              onFocus={handleNumberInputFocus}
              className="w-full bg-white border border-slate-300 text-slate-900 font-extrabold text-sm px-3.5 py-2 rounded-xl focus:outline-none focus:border-slate-900 shadow-2xs"
              placeholder="53000"
            />
          </div>
        </div>

        {/* Output Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-indigo-50/80 border border-indigo-200/80 p-3.5 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-indigo-700 block">قانون کارمزد اعمال‌شده:</span>
            <div className="text-sm font-black text-indigo-950 truncate" title={simResult.ruleDescription}>
              {simResult.ruleDescription}
            </div>
            <span className="text-[10px] font-extrabold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-md inline-block">
              {simResult.commissionPercent}٪ کارمزد
            </span>
          </div>

          <div className="bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-amber-800 block">مبلغ کارمزد:</span>
            <div className="text-sm font-black text-amber-950">
              {simResult.commissionAmountAed.toFixed(1)} درهم
            </div>
            <span className="text-[10px] font-bold text-amber-700 block">
              ≈ {formatToman(simResult.commissionAmountAed * (parseFloat(simAedRate) || 53000))}
            </span>
          </div>

          <div className="bg-sky-50/80 border border-sky-200/80 p-3.5 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-sky-800 block">هزینه ارسال محاسبه‌شده:</span>
            <div className="text-sm font-black text-sky-950">
              {simResult.shippingCostAed} درهم
            </div>
            {simResult.isMaxShippingApplied && (
              <span className="text-[10px] font-extrabold bg-sky-200 text-sky-900 px-1.5 py-0.5 rounded-md inline-block">
                اعمال سقف {simResult.shippingCostAed} درهم
              </span>
            )}
            {simResult.isMinShippingApplied && (
              <span className="text-[10px] font-extrabold bg-sky-200 text-sky-900 px-1.5 py-0.5 rounded-md inline-block">
                اعمال کف {simResult.shippingCostAed} درهم
              </span>
            )}
          </div>

          <div className="bg-[#111111] text-white p-3.5 rounded-2xl space-y-1 col-span-2 md:col-span-1 shadow-sm">
            <span className="text-[11px] font-bold text-slate-300 block">مجموع نهایی پرداختی:</span>
            <div className="text-base font-black text-amber-400">
              {simResult.finalTotalAed.toFixed(1)} درهم
            </div>
            <div className="text-xs font-black text-white">
              {formatToman(simResult.finalTotalToman)}
            </div>
          </div>
        </div>

        {/* Step-by-Step Breakdown Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-100 px-4 py-2.5 text-xs font-extrabold text-slate-800 border-b border-slate-200">
            جزئیات گام‌به‌گام محاسبه قیمت (Breakdown):
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {simResult.breakdownSteps.map((step) => (
              <div key={step.step} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-black text-[10px] flex items-center justify-center shrink-0">
                    {step.step}
                  </span>
                  <span className="font-bold text-slate-700">{step.label}</span>
                </div>
                <span className="font-black text-slate-900 dir-ltr">{step.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
