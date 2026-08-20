import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Percent,
  Truck,
  Layers,
  PackagePlus,
  ShieldCheck,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  ArrowRight,
  CheckCircle2,
  Coins,
  RefreshCw,
  Loader2,
  AlertTriangle,
  AlertCircle,
  ShoppingBag,
  X
} from 'lucide-react';
import { FinancialSettings, CmsConfig, PricingRulesConfig, CommissionRule, ShippingIncrementRule } from '../types';
import { db, saveSettingsToFirestore, saveCmsToFirestore, isFirestoreGrpcNoise } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  DEFAULT_PRICING_RULES,
  calculateOrderPricing,
  normalizeToPricingRulesConfig
} from '../utils/pricingEngine';
import { formatToman, toPersianDigits, normalizeToEnglishDigits } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { safeParseNumeric, sanitizePayloadForFirestore } from '../utils/adminSaveHelper';

interface PricingRulesAdminProps {
  settings: FinancialSettings | null;
  cms: CmsConfig | null;
  onSaveSuccess?: () => void;
  onBackToMainAdmin?: () => void;
  onOpenStandalonePage?: () => void;
  onUpdateSettings?: (settings: FinancialSettings) => void;
  onUpdateCms?: (cms: CmsConfig) => void;
  onSavePricingRules?: (newRules: any) => void;
  onRefresh?: () => void;
}

export const PricingRulesAdmin: React.FC<PricingRulesAdminProps> = ({
  settings,
  cms,
  onSaveSuccess,
  onBackToMainAdmin,
  onOpenStandalonePage,
  onUpdateSettings,
  onUpdateCms,
  onSavePricingRules,
  onRefresh
}) => {
  const { aedRate: contextAedRate, setAedRate: setContextAedRate } = useSettings();

  // Load initial value from context or localStorage or settings
  const initialAedRate = useMemo(() => {
    if (contextAedRate && contextAedRate > 0) return contextAedRate;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sirikfit_aed_rate');
      if (stored) {
        const p = parseFloat(stored);
        if (!isNaN(p) && p > 0) return p;
      }
    }
    return settings?.aedRate || settings?.manualAedRate || 52000;
  }, [contextAedRate, settings]);

  // Section 1: AED Rate Input
  const [aedRateInput, setAedRateInput] = useState<string>(String(initialAedRate));

  // Section 1.5: Minimum Order Amount in Toman
  const [minOrderAmountTomanInput, setMinOrderAmountTomanInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('sirikfit_app_settings') || localStorage.getItem('sirikfit_financial_settings');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.minOrderAmountToman !== undefined && !isNaN(Number(parsed.minOrderAmountToman))) {
            return String(parsed.minOrderAmountToman);
          }
        } catch (_e) {}
      }
    }
    return String(settings?.minOrderAmountToman ?? 0);
  });

  // Section 2: Base Commission
  const [baseCommissionEnabled, setBaseCommissionEnabled] = useState<boolean>(true);
  const [baseCommissionPercent, setBaseCommissionPercent] = useState<string>('20');

  // Section 3: Shipping Config
  const [baseShippingCostAed, setBaseShippingCostAed] = useState<string>('20');
  const [minShippingCostAed, setMinShippingCostAed] = useState<string>('20');
  const [maxShippingCostAed, setMaxShippingCostAed] = useState<string>('40');

  // Section 4: Commission Tiered Rules
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([
    { id: 'rule-1', minAmountAed: 0, maxAmountAed: 500, commissionPercent: 20, isEnabled: true },
    { id: 'rule-2', minAmountAed: 500, maxAmountAed: 1000, commissionPercent: 18, isEnabled: true },
    { id: 'rule-3', minAmountAed: 1000, maxAmountAed: 2000, commissionPercent: 16, isEnabled: true },
    { id: 'rule-4', minAmountAed: 2000, maxAmountAed: null, commissionPercent: 14, isEnabled: true }
  ]);

  // Section 5: Shipping Increments
  const [shippingIncrementRules, setShippingIncrementRules] = useState<ShippingIncrementRule[]>([
    { id: 'ship-inc-2', itemNumber: 2, additionalCostAed: 5, isEnabled: true },
    { id: 'ship-inc-3', itemNumber: 3, additionalCostAed: 5, isEnabled: true },
    { id: 'ship-inc-4', itemNumber: 4, additionalCostAed: 5, isEnabled: true }
  ]);

  // Section 7: Live Simulator Inputs
  const [simOrderAmountAed, setSimOrderAmountAed] = useState<string>('750');
  const [simProductCount, setSimProductCount] = useState<string>('2');
  const [simAedRate, setSimAedRate] = useState<string>(String(initialAedRate));

  // Saving states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Hydrate & Realtime Sync from Firestore / LocalStorage on mount
  useEffect(() => {
    let unsubApp: (() => void) | null = null;

    const populateFromData = (data: any) => {
      if (!data) return;
      if (data.aedRate && Number(data.aedRate) > 0) {
        setAedRateInput(String(data.aedRate));
        setSimAedRate(String(data.aedRate));
      }

      if (data.minOrderAmountToman !== undefined && !isNaN(Number(data.minOrderAmountToman))) {
        setMinOrderAmountTomanInput(String(data.minOrderAmountToman));
      } else if (data.minOrderToman !== undefined && !isNaN(Number(data.minOrderToman))) {
        setMinOrderAmountTomanInput(String(data.minOrderToman));
      }

      if (data.baseCommission) {
        setBaseCommissionEnabled(data.baseCommission.enabled ?? data.baseCommission.isEnabled ?? true);
        setBaseCommissionPercent(String(data.baseCommission.percentage ?? data.baseCommission.percent ?? 20));
      }

      if (data.shippingConfig) {
        setBaseShippingCostAed(String(data.shippingConfig.baseCostAed ?? data.shippingConfig.baseShippingCostAed ?? 20));
        setMinShippingCostAed(String(data.shippingConfig.minCostAed ?? data.shippingConfig.minShippingCostAed ?? 20));
        setMaxShippingCostAed(String(data.shippingConfig.maxCostAed ?? data.shippingConfig.maxShippingCostAed ?? 40));
      }

      if (Array.isArray(data.commissionRules) && data.commissionRules.length > 0) {
        setCommissionRules(
          data.commissionRules.map((r: any, idx: number) => ({
            id: String(r.id || `rule-${idx + 1}`),
            minAmountAed: Number(r.minAmountAed ?? 0),
            maxAmountAed: r.maxAmountAed === null || r.maxAmountAed === undefined || Number(r.maxAmountAed) === 0 ? null : Number(r.maxAmountAed),
            commissionPercent: Number(r.percentage ?? r.commissionPercent ?? 20),
            isEnabled: Boolean(r.active ?? r.isEnabled ?? true)
          }))
        );
      }

      if (Array.isArray(data.shippingIncrementRules) && data.shippingIncrementRules.length > 0) {
        setShippingIncrementRules(
          data.shippingIncrementRules.map((r: any, idx: number) => ({
            id: String(r.id || `inc-${idx + 2}`),
            itemNumber: Number(r.itemIndex ?? r.itemNumber ?? idx + 2),
            additionalCostAed: Number(r.additionalCostAed ?? 5),
            isEnabled: Boolean(r.active ?? r.isEnabled ?? true)
          }))
        );
      }
    };

    // 1. Immediate local cache load
    try {
      const raw = localStorage.getItem('sirikfit_app_settings') || localStorage.getItem('omex_pricing_rules');
      if (raw) populateFromData(JSON.parse(raw));
    } catch (_e) {}

    // 2. Realtime Firestore listener
    try {
      unsubApp = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
        if (snap.exists()) {
          populateFromData(snap.data());
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('PricingRules onSnapshot notice:', err);
      });
    } catch (err) {
      console.warn('Error setting up PricingRules onSnapshot:', err);
    }

    return () => {
      if (unsubApp) unsubApp();
    };
  }, []);

  // Update sim rate when main rate changes
  useEffect(() => {
    if (aedRateInput) {
      setSimAedRate(aedRateInput);
    }
  }, [aedRateInput]);

  // Current Active Rules Config Object
  const activePricingConfig = useMemo(() => {
    return {
      minOrderAmountToman: Math.max(0, safeParseNumeric(minOrderAmountTomanInput, 0)),
      baseCommission: {
        percentage: Math.max(0, parseFloat(normalizeToEnglishDigits(baseCommissionPercent)) || 20),
        isEnabled: baseCommissionEnabled
      },
      shippingConfig: {
        baseShippingCostAed: Math.max(0, parseFloat(normalizeToEnglishDigits(baseShippingCostAed)) || 20),
        minShippingCostAed: Math.max(0, parseFloat(normalizeToEnglishDigits(minShippingCostAed)) || 20),
        maxShippingCostAed: Math.max(0, parseFloat(normalizeToEnglishDigits(maxShippingCostAed)) || 40)
      },
      commissionRules,
      shippingIncrementRules
    };
  }, [minOrderAmountTomanInput, baseCommissionEnabled, baseCommissionPercent, baseShippingCostAed, minShippingCostAed, maxShippingCostAed, commissionRules, shippingIncrementRules]);

  // Live Simulator Calculation
  const simResult = useMemo(() => {
    const amount = parseFloat(normalizeToEnglishDigits(simOrderAmountAed)) || 0;
    const count = parseInt(normalizeToEnglishDigits(simProductCount), 10) || 1;
    const rate = parseFloat(normalizeToEnglishDigits(simAedRate)) || parseFloat(normalizeToEnglishDigits(aedRateInput)) || 0;

    return calculateOrderPricing(amount, count, rate, activePricingConfig);
  }, [simOrderAmountAed, simProductCount, simAedRate, aedRateInput, activePricingConfig]);

  // Handlers for Commission Rules
  const handleAddCommissionRule = () => {
    const lastRule = commissionRules[commissionRules.length - 1];
    const newMin = lastRule ? (lastRule.maxAmountAed || lastRule.minAmountAed + 1000) : 0;
    const newRule: CommissionRule = {
      id: `rule-${Date.now()}`,
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
    if (commissionRules.length <= 1) return;
    setCommissionRules(prev => prev.filter(r => r.id !== id));
  };

  const handleMoveCommissionRule = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= commissionRules.length) return;
    const newRules = [...commissionRules];
    const temp = newRules[index];
    newRules[index] = newRules[targetIndex];
    newRules[targetIndex] = temp;
    setCommissionRules(newRules);
  };

  // Handlers for Shipping Increment Rules
  const handleAddShippingIncrementRule = () => {
    const nextItemIndex = shippingIncrementRules.length + 2;
    const newRule: ShippingIncrementRule = {
      id: `ship-inc-${Date.now()}`,
      itemNumber: nextItemIndex,
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

  // Main Save Handler
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveMessage('');

    try {
      const parsedRate = safeParseNumeric(aedRateInput, 0);
      const parsedMinOrderToman = safeParseNumeric(minOrderAmountTomanInput, 0);
      const cleanBasePercent = safeParseNumeric(baseCommissionPercent, 20);
      const cleanBaseShip = safeParseNumeric(baseShippingCostAed, 20);
      const cleanMinShip = safeParseNumeric(minShippingCostAed, 20);
      const cleanMaxShip = safeParseNumeric(maxShippingCostAed, 40);

      const isMinLimitActive = parsedMinOrderToman > 0;

      // Construct Clean Numeric AppSettings Object
      const appSettingsPayload = {
        aedRate: parsedRate,
        minOrderAmountToman: parsedMinOrderToman,
        minOrderLimitEnabled: isMinLimitActive,
        baseCommission: {
          enabled: baseCommissionEnabled,
          percentage: cleanBasePercent
        },
        shippingConfig: {
          baseCostAed: cleanBaseShip,
          minCostAed: cleanMinShip,
          maxCostAed: cleanMaxShip
        },
        commissionRules: commissionRules.map(r => ({
          id: r.id,
          active: r.isEnabled,
          minAmountAed: safeParseNumeric(r.minAmountAed, 0),
          maxAmountAed: r.maxAmountAed === null || r.maxAmountAed === undefined || safeParseNumeric(r.maxAmountAed, 0) === 0 ? null : safeParseNumeric(r.maxAmountAed, 0),
          percentage: safeParseNumeric(r.commissionPercent, 0)
        })),
        shippingIncrementRules: shippingIncrementRules.map(r => ({
          id: r.id,
          active: r.isEnabled,
          itemIndex: safeParseNumeric(r.itemNumber, 2),
          additionalCostAed: safeParseNumeric(r.additionalCostAed, 0)
        }))
      };

      // ---------------------------------------------------------------
      // STEP 1: Synchronously Save to LocalStorage FIRST (Immediate Source of Truth)
      // ---------------------------------------------------------------
      if (parsedRate > 0) {
        localStorage.setItem('sirikfit_aed_rate', String(parsedRate));
      }
      localStorage.setItem('sirikfit_app_settings', JSON.stringify(appSettingsPayload));
      localStorage.setItem('sirikfit_financial_settings', JSON.stringify({
        aedRate: parsedRate,
        manualAedRate: parsedRate,
        cargoRatePerKg: cleanBaseShip,
        profitMargin: cleanBasePercent,
        minOrderAmountToman: parsedMinOrderToman,
        autoUpdateRates: false
      }));
      localStorage.setItem('omex_pricing_rules', JSON.stringify(activePricingConfig));

      // Update React Global Context immediately
      if (parsedRate > 0) {
        setContextAedRate(parsedRate);
      }

      // ---------------------------------------------------------------
      // STEP 2: Dispatch Synchronous Window Event (Instant React / Header Update)
      // ---------------------------------------------------------------
      window.dispatchEvent(new CustomEvent('settingsUpdated', {
        detail: {
          aedRate: parsedRate,
          minOrderAmountToman: parsedMinOrderToman,
          financialSettings: {
            aedRate: parsedRate,
            manualAedRate: parsedRate,
            cargoRatePerKg: cleanBaseShip,
            profitMargin: cleanBasePercent,
            minOrderAmountToman: parsedMinOrderToman
          },
          appSettings: appSettingsPayload,
          pricingRules: activePricingConfig
        }
      }));
      window.dispatchEvent(new Event('storage'));

      // ---------------------------------------------------------------
      // STEP 3: Async Persistence directly to Firestore SDK
      // ---------------------------------------------------------------
      const directFinancialPayload = {
        aedRate: parsedRate,
        manualAedRate: parsedRate,
        cargoRatePerKg: cleanBaseShip,
        profitMargin: cleanBasePercent,
        minOrderAmountToman: parsedMinOrderToman,
        minOrderLimitEnabled: isMinLimitActive,
        autoUpdateRates: false,
        currencyApiUrl: '',
        updatedAt: Date.now()
      };

      // Direct Firestore document updates
      await Promise.all([
        setDoc(doc(db, 'settings', 'app'), sanitizePayloadForFirestore(appSettingsPayload), { merge: true }),
        setDoc(doc(db, 'settings', 'financial'), sanitizePayloadForFirestore(directFinancialPayload), { merge: true }),
        setDoc(doc(db, 'settings', 'pricing'), sanitizePayloadForFirestore(appSettingsPayload), { merge: true }),
        setDoc(doc(db, 'settings', 'general'), sanitizePayloadForFirestore(directFinancialPayload), { merge: true }),
        setDoc(doc(db, 'settings', 'pricingRules'), sanitizePayloadForFirestore(activePricingConfig), { merge: true })
      ]);

      if (onUpdateSettings) {
        onUpdateSettings({
          aedRate: parsedRate,
          manualAedRate: parsedRate,
          cargoRatePerKg: cleanBaseShip,
          profitMargin: cleanBasePercent,
          minOrderAmountToman: parsedMinOrderToman,
          minOrderLimitEnabled: isMinLimitActive
        });
      }
      if (onSavePricingRules) {
        onSavePricingRules(activePricingConfig);
      }

      setSaveSuccess(true);
      setSaveMessage('تنظیمات با موفقیت ذخیره شد و در سراسر سیستم اعمال گردید.');

      if (onSaveSuccess) {
        onSaveSuccess();
      }

      setTimeout(() => {
        setSaveSuccess(false);
        setSaveMessage('');
      }, 4000);
    } catch (err: any) {
      console.error('Failed to save pricing rules:', err);
      setSaveMessage('خطا در ذخیره‌سازی تنظیمات. لطفا مجددا تلاش کنید.');
      setTimeout(() => {
        setSaveMessage('');
      }, 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-32 dir-rtl text-slate-900 font-['Vazirmatn',sans-serif]">
      
      {/* TOP NAVIGATION BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base">
              قوانین قیمت‌گذاری، نرخ درهم و کارمزد SIRIK FIT (پنل یکپارچه)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              تنظیم نرخ درهم (خودکار/دستی)، درصد کارمزد، فرمول هزینه ارسال و شبیه‌ساز قیمت در یک صفحه واحد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenStandalonePage && (
            <button
              type="button"
              onClick={onOpenStandalonePage}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              صفحه اختصاصی
            </button>
          )}
          {onBackToMainAdmin && (
            <button
              type="button"
              onClick={onBackToMainAdmin}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-700"
            >
              <span>بازگشت به منوی اصلی مدیریت</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          )}
        </div>
      </div>

      {/* HEADER TITLE CARD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Calculator className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900">
                قوانین قیمت‌گذاری، نرخ درهم و کارمزد SIRIK FIT
              </h1>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                پنل یکپارچه
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              تنظیم نرخ درهم (خودکار/دستی)، درصد کارمزد، فرمول هزینه ارسال و شبیه‌ساز قیمت در یک صفحه واحد
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: تنظیم نرخ درهم (AED Exchange Rate) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Coins className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-slate-900">
              تنظیم نرخ درهم (AED Exchange Rate)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              تعیین نرخ دقیق مبنای محاسبه تمام سفارشات و محصولات بر اساس تومان
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            نرخ درهم (تومان):
          </label>
          <div className="relative max-w-sm">
            <input
              type="text"
              value={aedRateInput}
              onChange={(e) => {
                const val = normalizeToEnglishDigits(e.target.value);
                setAedRateInput(val);
              }}
              placeholder="مثلا ۵۲۰۰۰"
              className="w-full bg-white border border-slate-300 focus:border-slate-900 text-slate-900 font-black text-base px-4 py-3 rounded-xl focus:outline-none transition dir-ltr text-center font-mono"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
              تومان
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 pt-1">
            تغییر این نرخ با ذخیره، فوراً در تمامی فرمول‌های محاسباتی فروشگاه و دیتابیس اعمال خواهد شد.
          </p>
        </div>
      </div>

      {/* SECTION: حداقل مبلغ سفارش (تومان) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-900">
                حداقل مبلغ سفارش (تومان)
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                تعیین حداقل مبلغ سبد خرید به تومان جهت امکان ثبت و پرداخت نهایی (برای غیرفعالسازی ۰ وارد کنید)
              </p>
            </div>
          </div>

          {safeParseNumeric(minOrderAmountTomanInput, 0) > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              فعال ({safeParseNumeric(minOrderAmountTomanInput, 0).toLocaleString('fa-IR')} تومان)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-bold">
              غیرفعال (بدون محدودیت)
            </span>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            حداقل مبلغ سفارش (تومان)
          </label>
          <div className="relative max-w-sm">
            <input
              type="text"
              value={minOrderAmountTomanInput}
              onChange={(e) => {
                const val = normalizeToEnglishDigits(e.target.value.replace(/,/g, ''));
                setMinOrderAmountTomanInput(val);
              }}
              placeholder="۰ (غیرفعال)"
              className="w-full bg-white border border-slate-300 focus:border-slate-900 text-slate-900 font-black text-base px-4 py-3 rounded-xl focus:outline-none transition dir-ltr text-center font-mono"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
              تومان
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-slate-500">انتخاب سریع:</span>
            {[
              { label: 'غیرفعال (۰)', value: '0' },
              { label: '۲ میلیون تومان', value: '2000000' },
              { label: '۳ میلیون تومان', value: '3000000' },
              { label: '۵ میلیون تومان', value: '5000000' },
              { label: '۱۰ میلیون تومان', value: '10000000' }
            ].map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setMinOrderAmountTomanInput(preset.value)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition font-bold ${
                  minOrderAmountTomanInput === preset.value
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {safeParseNumeric(minOrderAmountTomanInput, 0) > 0 && (
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <span>
                مشتریانی که مجموع سبد خریدشان کمتر از <strong>{safeParseNumeric(minOrderAmountTomanInput, 0).toLocaleString('fa-IR')} تومان</strong> باشد، پیام هشدار دریافت کرده و امکان ثبت نهایی سفارش را نخواهند داشت.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SECTIONS 2 & 3: GRID (Base Commission + Shipping Config) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* SECTION 2: کارمزد پایه (Base Commission) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Percent className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  ۱. کارمزد پایه (Base Commission)
                </h3>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer select-none bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition">
                <input
                  type="checkbox"
                  checked={baseCommissionEnabled}
                  onChange={(e) => setBaseCommissionEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-800">فعال</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                درصد کارمزد پایه (%):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={baseCommissionPercent}
                  onChange={(e) => setBaseCommissionPercent(normalizeToEnglishDigits(e.target.value))}
                  placeholder="20"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 dir-ltr text-center font-mono"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  ٪
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] font-medium text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 mt-3">
            در صورتی که هیچ قانون متغیر دیگری شامل مبلغ سفارش نشود، این درصد به عنوان نرخ پیش‌فرض کارمزد محاسبه می‌شود.
          </p>
        </div>

        {/* SECTION 3: تنظیمات هزینه ارسال (Shipping Configuration) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Truck className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">
              ۳. تنظیمات هزینه ارسال (Shipping Configuration)
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 whitespace-nowrap">
                هزینه ارسال پایه (AED):
              </label>
              <input
                type="text"
                value={baseShippingCostAed}
                onChange={(e) => setBaseShippingCostAed(normalizeToEnglishDigits(e.target.value))}
                placeholder="20"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs px-2.5 py-2 rounded-xl focus:outline-none focus:border-slate-900 text-center font-mono"
              />
              <span className="block text-[10px] text-slate-400 text-center">پیش‌فرض: 20 درهم</span>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 whitespace-nowrap">
                حداقل هزینه (AED):
              </label>
              <input
                type="text"
                value={minShippingCostAed}
                onChange={(e) => setMinShippingCostAed(normalizeToEnglishDigits(e.target.value))}
                placeholder="20"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs px-2.5 py-2 rounded-xl focus:outline-none focus:border-slate-900 text-center font-mono"
              />
              <span className="block text-[10px] text-slate-400 text-center">کف هزینه ارسال</span>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 whitespace-nowrap">
                حداکثر هزینه (AED):
              </label>
              <input
                type="text"
                value={maxShippingCostAed}
                onChange={(e) => setMaxShippingCostAed(normalizeToEnglishDigits(e.target.value))}
                placeholder="40"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs px-2.5 py-2 rounded-xl focus:outline-none focus:border-slate-900 text-center font-mono"
              />
              <span className="block text-[10px] text-slate-400 text-center">سقف هزینه ارسال</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 4: قوانین کارمزد بر اساس ارزش سفارش (Commission Rules) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                ۲. قوانین کارمزد بر اساس ارزش سفارش (Commission Rules)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                تعیین پلکانی کارمزد بر اساس مبلغ کل سفارش مشتری (AED)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddCommissionRule}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-indigo-200 shadow-2xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>افزودن قانون کارمزد جدید</span>
          </button>
        </div>

        {/* RULES LIST */}
        <div className="space-y-3">
          {commissionRules.map((rule, index) => (
            <div
              key={rule.id}
              className={`p-3.5 rounded-xl border transition flex flex-wrap items-center justify-between gap-3 ${
                rule.isEnabled ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-100/50 border-slate-200/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {toPersianDigits(index + 1)}
                </div>

                <div className="grid grid-cols-3 gap-2.5 flex-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      حداقل مبلغ (AED):
                    </label>
                    <input
                      type="text"
                      value={rule.minAmountAed}
                      onChange={(e) =>
                        handleUpdateCommissionRule(rule.id, 'minAmountAed', parseFloat(normalizeToEnglishDigits(e.target.value)) || 0)
                      }
                      className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-lg text-center font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      حداکثر مبلغ (AED / به بالا):
                    </label>
                    <input
                      type="text"
                      value={rule.maxAmountAed === null ? '' : rule.maxAmountAed}
                      onChange={(e) => {
                        const val = normalizeToEnglishDigits(e.target.value);
                        handleUpdateCommissionRule(
                          rule.id,
                          'maxAmountAed',
                          val.trim() === '' ? null : parseFloat(val) || 0
                        );
                      }}
                      placeholder="به بالا"
                      className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-lg text-center font-mono placeholder:text-indigo-600 placeholder:font-extrabold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      درصد کارمزد (%):
                    </label>
                    <input
                      type="text"
                      value={rule.commissionPercent}
                      onChange={(e) =>
                        handleUpdateCommissionRule(rule.id, 'commissionPercent', parseFloat(normalizeToEnglishDigits(e.target.value)) || 0)
                      }
                      className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-lg text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer select-none bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={rule.isEnabled}
                    onChange={(e) => handleUpdateCommissionRule(rule.id, 'isEnabled', e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-700">فعال</span>
                </label>

                <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleMoveCommissionRule(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveCommissionRule(index, 'down')}
                    disabled={index === commissionRules.length - 1}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 border-r border-slate-200"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteCommissionRule(rule.id)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  title="حذف قانون"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: افزایش هزینه ارسال با تعداد کالا (Shipping Increment Rules) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <PackagePlus className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                ۴. افزایش هزینه ارسال با تعداد کالا (Shipping Increment Rules)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                تعیین مبلغ اضافه برای کالای دوم، سوم، چهارم و... در یک سفارش
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddShippingIncrementRule}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-purple-200 shadow-2xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>افزودن قانون افزایش کالا</span>
          </button>
        </div>

        {/* INCREMENT RULES GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {shippingIncrementRules.map((inc) => (
            <div
              key={inc.id}
              className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="font-black text-xs text-slate-800">
                  کالای {toPersianDigits(inc.itemNumber)}ام
                </span>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inc.isEnabled}
                      onChange={(e) => handleUpdateShippingIncrementRule(inc.id, 'isEnabled', e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px] font-bold text-slate-600">فعال</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleDeleteShippingIncrementRule(inc.id)}
                    className="text-rose-500 hover:bg-rose-100 p-1 rounded-md transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  افزایش هزینه (AED):
                </label>
                <input
                  type="text"
                  value={inc.additionalCostAed}
                  onChange={(e) =>
                    handleUpdateShippingIncrementRule(
                      inc.id,
                      'additionalCostAed',
                      parseFloat(normalizeToEnglishDigits(e.target.value)) || 0
                    )
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-lg text-center font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6: ترتیب استاندارد محاسبه موتور قیمت‌گذاری (Calculation Order) */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <h3 className="font-extrabold text-sm text-white">
            ۵. ترتیب استاندارد محاسبه موتور قیمت‌گذاری (Calculation Order)
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-[11px]">
          <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl space-y-1">
            <span className="block text-[9.5px] font-extrabold text-amber-400">گام ۱</span>
            <span className="block font-bold text-white">جمع سفارش (Subtotal)</span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl space-y-1">
            <span className="block text-[9.5px] font-extrabold text-amber-400">گام ۲</span>
            <span className="block font-bold text-white">انتخاب قانون کارمزد</span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl space-y-1">
            <span className="block text-[9.5px] font-extrabold text-amber-400">گام ۳</span>
            <span className="block font-bold text-white">محاسبه کارمزد درهمی</span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl space-y-1">
            <span className="block text-[9.5px] font-extrabold text-amber-400">گام ۴</span>
            <span className="block font-bold text-white">محاسبه هزینه ارسال</span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl space-y-1">
            <span className="block text-[9.5px] font-extrabold text-amber-400">گام ۵</span>
            <span className="block font-bold text-white">اعمال حداقل/حداکثر سقف</span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl space-y-1">
            <span className="block text-[9.5px] font-extrabold text-amber-400">گام ۶</span>
            <span className="block font-bold text-white">مجموع نهایی سفارش</span>
          </div>

          <div className="bg-gradient-to-b from-amber-500 to-amber-600 text-slate-900 font-black p-2.5 rounded-xl space-y-1 shadow-xs">
            <span className="block text-[9.5px] uppercase tracking-wider opacity-90">گام ۷</span>
            <span className="block text-[11px]">نمایش قیمت نهایی (تومان)</span>
          </div>
        </div>
      </div>

      {/* SECTION 7: شبیه‌ساز زنده قیمت‌گذاری (Live Pricing Simulator) */}
      <div className="bg-white p-5 rounded-2xl border-2 border-indigo-200/90 shadow-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                ۷. شبیه‌ساز زنده قیمت‌گذاری (Live Pricing Simulator)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                تست آنی کارکرد موتور قیمت‌گذاری با مقادیر نمونه درهمی
              </p>
            </div>
          </div>

          <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full border border-emerald-200">
            محاسبه فوری (Real-Time)
          </span>
        </div>

        {/* SIMULATOR INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ارزش کل سفارش (AED):
            </label>
            <input
              type="text"
              value={simOrderAmountAed}
              onChange={(e) => setSimOrderAmountAed(normalizeToEnglishDigits(e.target.value))}
              placeholder="750"
              className="w-full bg-white border border-slate-300 text-slate-900 font-extrabold text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 font-mono text-center"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تعداد محصولات سفارش:
            </label>
            <input
              type="text"
              value={simProductCount}
              onChange={(e) => setSimProductCount(normalizeToEnglishDigits(e.target.value))}
              placeholder="2"
              className="w-full bg-white border border-slate-300 text-slate-900 font-extrabold text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 font-mono text-center"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نرخ درهم فعال (تومان):
            </label>
            <input
              type="text"
              value={simAedRate}
              onChange={(e) => setSimAedRate(normalizeToEnglishDigits(e.target.value))}
              placeholder="52000"
              className="w-full bg-white border border-slate-300 text-slate-900 font-extrabold text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-slate-900 font-mono text-center"
            />
          </div>
        </div>

        {/* OUTPUT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Card 1: Commission Rule */}
          <div className="bg-sky-50 border border-sky-200/90 p-4 rounded-xl space-y-1">
            <span className="block text-[11px] font-bold text-sky-800">قانون کارمزد اعمال‌شده:</span>
            <div className="font-extrabold text-xs text-sky-950 truncate">
              {simResult.appliedRule ? `قانون سفارش ${simResult.appliedRule.minAmountAed} تا ${simResult.appliedRule.maxAmountAed || 'به بالا'}` : 'کارمزد پایه (Base Commission)'}
            </div>
            <span className="inline-block bg-sky-200/80 text-sky-900 text-[10px] font-black px-2 py-0.5 rounded-md mt-1">
              {simResult.commissionPercent}% کارمزد
            </span>
          </div>

          {/* Card 2: Commission Amount */}
          <div className="bg-amber-50 border border-amber-200/90 p-4 rounded-xl space-y-1">
            <span className="block text-[11px] font-bold text-amber-800">مبلغ کارمزد:</span>
            <div className="font-black text-base text-amber-950 font-mono">
              {simResult.commissionAmountAed.toFixed(1)} درهم
            </div>
            <span className="block text-[10px] font-bold text-amber-700">
              ≈ {formatToman(simResult.commissionAmountAed * simResult.finalTotalToman / simResult.finalTotalAed)}
            </span>
          </div>

          {/* Card 3: Shipping Cost */}
          <div className="bg-teal-50 border border-teal-200/90 p-4 rounded-xl space-y-1">
            <span className="block text-[11px] font-bold text-teal-800">هزینه ارسال محاسبه‌شده:</span>
            <div className="font-black text-base text-teal-950 font-mono">
              {simResult.shippingCostAed} درهم
            </div>
          </div>

          {/* Card 4: Dark Total Card */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1 flex flex-col justify-center">
            <span className="block text-[11px] font-bold text-slate-300">مجموع نهایی پرداختی:</span>
            <div className="font-black text-lg text-amber-400 font-mono leading-none">
              {simResult.finalTotalAed.toFixed(1)} درهم
            </div>
            <div className="font-extrabold text-xs text-white mt-1">
              {formatToman(simResult.finalTotalToman)}
            </div>
          </div>

        </div>

        {/* STEP BY STEP BREAKDOWN LIST */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200/90 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>جزئیات گام‌به‌گام محاسبه قیمت (Breakdown Table):</span>
            </h4>
            <span className="text-[11px] bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              ۷ گام شفاف
            </span>
          </div>

          {/* TABLE HEADER FOR DESKTOP */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-black text-slate-500 bg-slate-200/70 rounded-lg">
            <div className="col-span-1 text-center">گام</div>
            <div className="col-span-5 text-right">عنوان عملیات / فرمول</div>
            <div className="col-span-6 text-left dir-ltr font-mono">خروجی درهمی / تومانی</div>
          </div>

          {/* STEP CARDS / ROWS */}
          <div className="space-y-2.5 text-xs font-medium">
            {simResult.breakdownSteps.map((s) => {
              const isFinalStep = s.step >= 6;
              const rateNum = parseFloat(simAedRate) || 52000;

              if (isFinalStep) {
                // HIGHLIGHTED FINAL TOTAL CARDS
                return (
                  <div
                    key={s.step}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md ${
                      s.step === 7
                        ? 'bg-slate-900 border-amber-500/60 text-amber-400'
                        : 'bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-indigo-700/60 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 shadow-xs ${
                        s.step === 7 ? 'bg-amber-400 text-slate-900' : 'bg-indigo-600 text-white'
                      }`}>
                        {toPersianDigits(s.step)}
                      </span>
                      <div>
                        <span className="font-black text-sm block text-white">{s.label}</span>
                        <span className="text-[11px] text-slate-300 font-normal">
                          {s.step === 7 ? `محاسبه‌شده با نرخ فعال ${formatToman(rateNum)}` : 'مجموع کل سفارش + کارمزد + هزینه ارسال'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right sm:text-left dir-ltr font-mono">
                      <span className={`font-black text-base sm:text-lg block ${s.step === 7 ? 'text-amber-400 font-mono' : 'text-emerald-400'}`}>
                        {s.value}
                      </span>
                    </div>
                  </div>
                );
              }

              // STANDARD STEP SUB-CARDS (Steps 1-5)
              return (
                <div
                  key={s.step}
                  className="border border-gray-200 bg-gray-50/50 hover:bg-white rounded-xl p-3 transition shadow-xs grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                >
                  <div className="md:col-span-1 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-black flex items-center justify-center shrink-0">
                      {toPersianDigits(s.step)}
                    </span>
                    <span className="md:hidden font-bold text-slate-800">{s.label}</span>
                  </div>

                  <div className="hidden md:block md:col-span-5 font-bold text-slate-800 text-xs sm:text-sm">
                    {s.label}
                  </div>

                  <div className="md:col-span-6 flex items-center justify-between md:justify-end gap-3 text-slate-900 font-extrabold font-mono text-xs sm:text-sm dir-ltr">
                    <span className="bg-white border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-mono text-left shadow-2xs">
                      {s.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* TOP-RIGHT TOAST NOTIFICATION */}
      {saveMessage && (
        <div className="fixed top-6 right-6 z-[9999] max-w-md animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center gap-3 text-white ${
            saveSuccess 
              ? 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-950/40' 
              : 'bg-slate-900/95 border-rose-500/50 shadow-rose-950/40'
          }`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
              saveSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {saveSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="flex-1 text-xs sm:text-sm font-extrabold leading-relaxed">
              {saveMessage}
            </div>
            <button
              type="button"
              onClick={() => setSaveMessage('')}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* CLEAN FLOATING GREEN SAVE BUTTON */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[92vw]">
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={`h-12 px-7 rounded-full font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-emerald-600/40 cursor-pointer active:scale-95 border border-emerald-400/30 whitespace-nowrap ${
            saveSuccess
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40'
              : isSaving
              ? 'bg-slate-800 text-slate-300 border-slate-700 cursor-not-allowed opacity-90'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-emerald-100 shrink-0" />
              <span>در حال ذخیره...</span>
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
              <span>تنظیمات ذخیره شد ✓</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-100 shrink-0" />
              <span>ذخیره تنظیمات</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default PricingRulesAdmin;
