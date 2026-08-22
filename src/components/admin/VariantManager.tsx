import React from 'react';
import { Plus, Trash2, Image as ImageIcon, DollarSign, Weight, Sparkles, Check, Layers } from 'lucide-react';
import type { ProductFlavorVariant, ProductSizeVariant, FinancialSettings } from '../../types';
import { autoCalcToman } from '../../utils/pricingCalculator';
import { formatToman, serializeVariantNames, parseCommaSeparatedNames, getEffectiveAedRate, parseAndConvertSize } from '../../utils/formatters';

interface VariantManagerProps {
  productId?: string;
  flavors?: (ProductFlavorVariant | string)[];
  sizes?: (ProductSizeVariant | string)[];
  basePriceAed?: number;
  baseWeightKg?: number;
  basePriceToman?: number;
  profitMargin?: number;
  mainProductImage?: string;
  settings?: FinancialSettings;
  cms?: any;
  onUpdateFlavors: (flavors: ProductFlavorVariant[]) => void;
  onUpdateSizes: (sizes: ProductSizeVariant[]) => void;
}

export const VariantManager: React.FC<VariantManagerProps> = ({
  productId = 'prod',
  flavors = [],
  sizes = [],
  basePriceAed = 0,
  baseWeightKg = 0.8,
  basePriceToman = 0,
  profitMargin = 20,
  mainProductImage = '',
  settings,
  cms,
  onUpdateFlavors,
  onUpdateSizes,
}) => {
  const activeAedRate = getEffectiveAedRate(settings, cms) || 51400;
  const cargoRate = settings?.cargoRatePerKg || 35;

  const pricingConfig = {
    aedRate: activeAedRate,
    cargoRatePerKg: cargoRate,
    profitMargin: profitMargin
  };

  // Normalize incoming flavors into standard ProductFlavorVariant[]
  const normalizedFlavors: ProductFlavorVariant[] = (flavors || []).map((f: any, idx: number) => {
    if (typeof f === 'string') {
      return {
        id: `flv-${idx}-${Date.now()}`,
        name: f,
        flavor: f,
        imageUrl: '',
        image: '',
        hasCustomPrice: false,
        priceAED: basePriceAed || 0,
        priceAed: basePriceAed || 0,
        weightKg: baseWeightKg || 0.8,
        priceToman: basePriceToman || 0,
        inStock: true,
        isAvailable: true
      };
    }
    return {
      id: f.id || `flv-${idx}`,
      name: f.name !== undefined ? f.name : (f.flavor || ''),
      flavor: f.flavor !== undefined ? f.flavor : (f.name || ''),
      imageUrl: f.imageUrl || f.image || '',
      image: f.image || f.imageUrl || '',
      hasCustomPrice: Boolean(f.hasCustomPrice || (f.priceAED && f.priceAED > 0 && f.priceAED !== basePriceAed)),
      priceAED: f.priceAED ?? f.priceAed ?? (f.hasCustomPrice ? basePriceAed : undefined),
      priceAed: f.priceAed ?? f.priceAED ?? (f.hasCustomPrice ? basePriceAed : undefined),
      weightKg: f.weightKg !== undefined ? Number(f.weightKg) : (baseWeightKg || 0.8),
      priceToman: f.priceToman || 0,
      inStock: f.inStock !== false && f.isAvailable !== false,
      isAvailable: f.isAvailable !== false && f.inStock !== false
    };
  });

  // Normalize incoming sizes into standard ProductSizeVariant[] with smart parsing
  const normalizedSizes: ProductSizeVariant[] = (sizes || []).map((s: any, idx: number) => {
    if (typeof s === 'string') {
      const parsed = parseAndConvertSize(s);
      const wt = parsed.weightKg || baseWeightKg || 0.8;
      return {
        id: `sz-${idx}-${Date.now()}`,
        size: s,
        name: s,
        displayLabel: parsed.displayLabel,
        hasCustomPrice: false,
        priceAED: basePriceAed || 0,
        priceAed: basePriceAed || 0,
        weightKg: wt,
        priceToman: basePriceToman || autoCalcToman(basePriceAed, wt, pricingConfig),
        inStock: true,
        isAvailable: true
      };
    }
    const parsed = parseAndConvertSize(s.size || s.name || '');
    const wt = s.weightKg !== undefined ? Number(s.weightKg) : (parsed.weightKg || baseWeightKg || 0.8);
    return {
      id: s.id || `sz-${idx}`,
      size: s.size !== undefined ? s.size : (s.name || ''),
      name: s.name !== undefined ? s.name : (s.size || ''),
      displayLabel: s.displayLabel || (s.size ? parsed.displayLabel : ''),
      hasCustomPrice: Boolean(s.hasCustomPrice || (s.priceAED && s.priceAED > 0 && s.priceAED !== basePriceAed)),
      priceAED: s.priceAED ?? s.priceAed ?? (s.hasCustomPrice ? basePriceAed : undefined),
      priceAed: s.priceAed ?? s.priceAED ?? (s.hasCustomPrice ? basePriceAed : undefined),
      weightKg: wt,
      priceToman: s.priceToman || (s.hasCustomPrice ? autoCalcToman(s.priceAED ?? basePriceAed, wt, pricingConfig) : 0),
      inStock: s.inStock !== false && s.isAvailable !== false,
      isAvailable: s.isAvailable !== false && s.inStock !== false
    };
  });

  // Handle Quick Comma-Separated input for Flavors
  const handleFlavorCommaChange = (commaString: string) => {
    const rawNames = parseCommaSeparatedNames(commaString);
    const updated: ProductFlavorVariant[] = rawNames.map((name, idx) => {
      const existing = normalizedFlavors.find(f => f.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      return {
        id: `flv-${Date.now()}-${idx}`,
        name: name,
        flavor: name,
        imageUrl: mainProductImage || '',
        image: mainProductImage || '',
        hasCustomPrice: false,
        priceAED: basePriceAed,
        priceAed: basePriceAed,
        weightKg: baseWeightKg,
        priceToman: basePriceToman || autoCalcToman(basePriceAed, baseWeightKg, pricingConfig),
        inStock: true,
        isAvailable: true
      };
    });
    onUpdateFlavors(updated);
  };

  // Handle Quick Comma-Separated input for Sizes with Auto LBS-to-KG Conversion
  const handleSizeCommaChange = (commaString: string) => {
    const rawSizes = parseCommaSeparatedNames(commaString);
    const updated: ProductSizeVariant[] = rawSizes.map((sizeName, idx) => {
      const existing = normalizedSizes.find(s => s.size.toLowerCase() === sizeName.toLowerCase());
      if (existing) return existing;
      const parsed = parseAndConvertSize(sizeName);
      const wt = parsed.weightKg || baseWeightKg || 0.8;
      return {
        id: `sz-${Date.now()}-${idx}`,
        size: sizeName,
        name: sizeName,
        displayLabel: parsed.displayLabel,
        hasCustomPrice: false,
        priceAED: basePriceAed,
        priceAed: basePriceAed,
        weightKg: wt,
        priceToman: basePriceToman || autoCalcToman(basePriceAed, wt, pricingConfig),
        inStock: true,
        isAvailable: true
      };
    });
    onUpdateSizes(updated);
  };

  // Flavor Updates
  const handleUpdateFlavor = (idx: number, field: keyof ProductFlavorVariant, val: any) => {
    const updated = [...normalizedFlavors];
    const item = { ...updated[idx], [field]: val };
    
    if (field === 'name') {
      item.flavor = val;
    } else if (field === 'imageUrl') {
      item.image = val;
    } else if (field === 'priceAED' || field === 'weightKg') {
      const aed = field === 'priceAED' ? Number(val) : Number(item.priceAED || 0);
      const wt = field === 'weightKg' ? Number(val) : Number(item.weightKg || 0.8);
      item.priceToman = autoCalcToman(aed, wt, pricingConfig);
      item.priceAed = aed;
    } else if (field === 'hasCustomPrice' && val === true) {
      if (!item.priceAED) item.priceAED = basePriceAed;
      if (!item.weightKg) item.weightKg = baseWeightKg;
      if (!item.priceToman) item.priceToman = autoCalcToman(item.priceAED, item.weightKg, pricingConfig);
    }
    
    updated[idx] = item;
    onUpdateFlavors(updated);
  };

  const handleAddFlavor = () => {
    const newFlv: ProductFlavorVariant = {
      id: `flv-${Date.now()}`,
      name: '', // Empty string by default
      flavor: '',
      imageUrl: '',
      image: '',
      hasCustomPrice: false,
      priceAED: undefined,
      priceAed: undefined,
      weightKg: baseWeightKg || 0.8,
      priceToman: undefined,
      inStock: true,
      isAvailable: true
    };
    onUpdateFlavors([...normalizedFlavors, newFlv]);
  };

  const handleDeleteFlavor = (idx: number) => {
    onUpdateFlavors(normalizedFlavors.filter((_, i) => i !== idx));
  };

  // Size Updates with Auto LBS-to-KG Conversion
  const handleUpdateSize = (idx: number, patch: Partial<ProductSizeVariant> | keyof ProductSizeVariant, val?: any) => {
    const updated = [...normalizedSizes];
    let item = { ...updated[idx] };

    if (typeof patch === 'string') {
      const field = patch;
      if (field === 'size') {
        const parsed = parseAndConvertSize(val);
        item.size = val;
        item.name = val;
        item.displayLabel = parsed.displayLabel;
        item.weightKg = parsed.weightKg;
        item.priceToman = autoCalcToman(item.priceAED || basePriceAed, parsed.weightKg, pricingConfig);
      } else if (field === 'weightKg') {
        const wt = Number(val) || 0.8;
        item.weightKg = wt;
        item.priceToman = autoCalcToman(item.priceAED || basePriceAed, wt, pricingConfig);
      } else if (field === 'priceAED') {
        const aed = Number(val) || 0;
        item.priceAED = aed;
        item.priceAed = aed;
        item.priceToman = autoCalcToman(aed, item.weightKg || baseWeightKg || 0.8, pricingConfig);
      } else if (field === 'hasCustomPrice' && val === true) {
        if (!item.priceAED) item.priceAED = basePriceAed;
        if (!item.weightKg) item.weightKg = baseWeightKg;
        if (!item.priceToman) item.priceToman = autoCalcToman(item.priceAED, item.weightKg, pricingConfig);
        item.hasCustomPrice = true;
      } else {
        (item as any)[field] = val;
      }
    } else {
      item = { ...item, ...patch };
      if (patch.size !== undefined && patch.weightKg === undefined) {
        const parsed = parseAndConvertSize(patch.size);
        item.displayLabel = parsed.displayLabel;
        item.weightKg = parsed.weightKg;
        item.priceToman = autoCalcToman(item.priceAED || basePriceAed, parsed.weightKg, pricingConfig);
      }
    }
    
    updated[idx] = item;
    onUpdateSizes(updated);
  };

  const handleAddSize = () => {
    const newSz: ProductSizeVariant = {
      id: `sz-${Date.now()}`,
      size: '', // Empty string by default
      name: '',
      displayLabel: '',
      weightKg: 0.8,
      hasCustomPrice: false,
      priceAED: undefined,
      priceAed: undefined,
      priceToman: undefined,
      inStock: true,
      isAvailable: true
    };
    onUpdateSizes([...normalizedSizes, newSz]);
  };

  const handleDeleteSize = (idx: number) => {
    onUpdateSizes(normalizedSizes.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4 pt-2">
      {/* 1. Quick Comma-Separated inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            طعم‌های محصول (با کاما جدا کنید):
          </label>
          <input
            type="text"
            value={serializeVariantNames(normalizedFlavors)}
            onChange={(e) => handleFlavorCommaChange(e.target.value)}
            placeholder="مثال: Double Chocolate, Vanilla, Strawberry"
            className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            حجم/سایزهای محصول (با کاما جدا کنید - تبدیل خودکار LBS به KG):
          </label>
          <input
            type="text"
            value={serializeVariantNames(normalizedSizes)}
            onChange={(e) => handleSizeCommaChange(e.target.value)}
            placeholder="مثال: 5 lbs, 2 lbs, 250 g, 60 Servings"
            className="w-full bg-white border border-slate-200 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
          />
        </div>
      </div>

      {/* 2. FLAVORS DEDICATED MANAGER */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-pulse"></span>
            <span className="text-xs font-black text-slate-900">
              مدیریت طعم‌ها، تصاویر و قیمت‌گذاری اختصاصی
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold">
            ({normalizedFlavors.length} طعم ثبت شده)
          </span>
        </div>

        {normalizedFlavors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px] border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-extrabold">
                  <th className="p-2.5">نام طعم</th>
                  <th className="p-2.5">تصویر طعم</th>
                  <th className="p-2.5 text-center">قیمت اختصاصی؟</th>
                  <th className="p-2.5">قیمت خرید (درهم)</th>
                  <th className="p-2.5">قیمت فروش (تومان)</th>
                  <th className="p-2.5 text-center">موجودی</th>
                  <th className="p-2.5 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {normalizedFlavors.map((flv, fIdx) => (
                  <tr key={flv.id || fIdx} className="hover:bg-red-50/20 transition">
                    <td className="p-2 font-bold text-slate-900 min-w-[130px]">
                      <input
                        type="text"
                        value={flv.name || ''}
                        onChange={(e) => handleUpdateFlavor(fIdx, 'name', e.target.value)}
                        placeholder="نام طعم (مثال: شکلات، موزی)"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-red-600 placeholder:text-slate-400 font-medium"
                      />
                    </td>

                    <td className="p-2 min-w-[170px]">
                      <div className="flex items-center gap-1.5">
                        {flv.imageUrl ? (
                          <img
                            src={flv.imageUrl}
                            alt={flv.name}
                            className="w-7 h-7 object-contain rounded border border-slate-200 bg-white shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <input
                          type="text"
                          value={flv.imageUrl || ''}
                          onChange={(e) => handleUpdateFlavor(fIdx, 'imageUrl', e.target.value)}
                          placeholder="لینک عکس طعم"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-[11px] px-2 py-1.5 rounded-lg dir-ltr font-mono focus:outline-none focus:border-red-600"
                          dir="ltr"
                        />
                      </div>
                    </td>

                    {/* Custom Price Checkbox Toggle */}
                    <td className="p-2 text-center min-w-[90px]">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(flv.hasCustomPrice)}
                          onChange={(e) => handleUpdateFlavor(fIdx, 'hasCustomPrice', e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                        />
                        <span className={`text-[10px] font-bold ${flv.hasCustomPrice ? 'text-red-600' : 'text-slate-400'}`}>
                          {flv.hasCustomPrice ? 'اختصاصی' : 'پایه'}
                        </span>
                      </label>
                    </td>

                    {/* Price AED inputs (Clean without redundant KG) */}
                    <td className="p-2 min-w-[120px]">
                      {flv.hasCustomPrice ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={flv.priceAED || ''}
                            onChange={(e) => handleUpdateFlavor(fIdx, 'priceAED', parseFloat(e.target.value) || 0)}
                            placeholder="درهم"
                            className="w-20 bg-white border border-red-200 text-slate-900 text-xs px-2 py-1.5 rounded-lg font-mono font-bold focus:border-red-600 focus:outline-none text-center"
                          />
                          <span className="text-[10px] text-slate-500 font-bold">AED</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          مطابق پایه ({basePriceAed} AED)
                        </span>
                      )}
                    </td>

                    {/* Toman Price */}
                    <td className="p-2 min-w-[130px]">
                      {flv.hasCustomPrice ? (
                        <div>
                          <input
                            type="number"
                            value={flv.priceToman || ''}
                            onChange={(e) => handleUpdateFlavor(fIdx, 'priceToman', parseFloat(e.target.value) || 0)}
                            placeholder="تومان"
                            className="w-28 bg-white border border-red-300 text-red-700 font-bold text-xs px-2 py-1 rounded-lg font-mono focus:border-red-600 focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            محاسبه: {formatToman(autoCalcToman(flv.priceAED || basePriceAed, flv.weightKg || baseWeightKg, pricingConfig))}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-700">
                          {formatToman(basePriceToman || autoCalcToman(basePriceAed, baseWeightKg, pricingConfig))}
                        </span>
                      )}
                    </td>

                    {/* In-Stock Toggle */}
                    <td className="p-2 text-center min-w-[90px]">
                      <button
                        type="button"
                        onClick={() => handleUpdateFlavor(fIdx, 'inStock', !flv.inStock)}
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full cursor-pointer transition ${
                          flv.inStock
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {flv.inStock ? '✓ موجود' : '✕ ناموجود'}
                      </button>
                    </td>

                    {/* Delete button */}
                    <td className="p-2 text-center min-w-[40px]">
                      <button
                        type="button"
                        onClick={() => handleDeleteFlavor(fIdx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="حذف طعم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
            هنوز هیچ طعمی ثبت نشده است. برای افزودن روی دکمه زیر کلیک کنید یا در فیلد بالا بنویسید.
          </div>
        )}

        <button
          type="button"
          onClick={handleAddFlavor}
          className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ افزودن طعم جدید</span>
        </button>
      </div>

      {/* 3. SIZES DEDICATED MANAGER WITH AUTO LBS-TO-KG CONVERSION & CLEAN ROW LAYOUT */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span>
            <span className="text-xs font-black text-slate-900">
              مدیریت سایزها / وزن‌ها (تبدیل خودکار LBS به کیلوگرم و محاسبه تومان)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold">
            ({normalizedSizes.length} سایز ثبت شده)
          </span>
        </div>

        {normalizedSizes.length > 0 ? (
          <div className="space-y-2.5">
            {normalizedSizes.map((sz, idx) => (
              <div 
                key={sz.id || idx} 
                className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition"
              >
                {/* Size / LBS Input */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-500 font-bold">سایز / حجم:</span>
                  <input
                    type="text"
                    value={sz.size || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleUpdateSize(idx, 'size', val);
                    }}
                    placeholder="نام سایز (مثال: 5 lbs یا 250 g)"
                    className="w-36 sm:w-44 p-2 text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none placeholder:text-slate-400"
                  />
                  {sz.displayLabel && sz.displayLabel !== sz.size && (
                    <span className="text-[9px] text-emerald-600 font-bold mt-0.5 max-w-[170px] truncate">
                      ✓ {sz.displayLabel}
                    </span>
                  )}
                </div>

                {/* Auto-detected Weight (Clean input without extra KG overlay clutter) */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-500 font-bold">وزن (کیلوگرم):</span>
                  <input
                    type="number"
                    step="0.05"
                    value={sz.weightKg !== undefined ? sz.weightKg : ''}
                    onChange={(e) => {
                      handleUpdateSize(idx, 'weightKg', e.target.value);
                    }}
                    placeholder="وزن"
                    className="w-20 p-2 text-xs text-center font-bold border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none"
                  />
                </div>

                {/* Custom Price Toggle */}
                <div className="flex items-center pt-3.5">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs select-none">
                    <input
                      type="checkbox"
                      checked={!!sz.hasCustomPrice}
                      onChange={(e) => handleUpdateSize(idx, 'hasCustomPrice', e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer"
                    />
                    <span className={sz.hasCustomPrice ? 'text-red-600' : 'text-slate-500'}>
                      قیمت اختصاصی
                    </span>
                  </label>
                </div>

                {/* AED & Toman Inputs (If Custom Price Enabled) */}
                {sz.hasCustomPrice ? (
                  <div className="flex items-center gap-2 pt-3.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={sz.priceAED || ''}
                        onChange={(e) => handleUpdateSize(idx, 'priceAED', e.target.value)}
                        placeholder="درهم"
                        className="w-20 p-1.5 text-xs text-center font-bold border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-bold">AED</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={sz.priceToman || ''}
                        onChange={(e) => handleUpdateSize(idx, 'priceToman', Number(e.target.value))}
                        placeholder="تومان"
                        className="w-28 p-1.5 text-xs text-center font-bold text-red-600 border border-red-200 rounded-lg focus:border-red-600 focus:outline-none"
                      />
                      <span className="text-[10px] text-red-500 font-bold">تومان</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 text-xs font-bold text-slate-500">
                    {formatToman(autoCalcToman(basePriceAed, sz.weightKg || baseWeightKg || 0.8, pricingConfig))}
                  </div>
                )}

                {/* Stock status toggle */}
                <div className="mr-auto flex items-center gap-2 pt-3.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateSize(idx, 'inStock', !sz.inStock)}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full cursor-pointer transition ${
                      sz.inStock
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {sz.inStock ? '✓ موجود' : '✕ ناموجود'}
                  </button>

                  {/* Delete */}
                  <button 
                    type="button" 
                    onClick={() => handleDeleteSize(idx)} 
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="حذف سایز"
                  >
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
            هنوز هیچ سایزی ثبت نشده است. برای افزودن روی دکمه زیر کلیک کنید یا در فیلد بالا بنویسید.
          </div>
        )}

        <button
          type="button"
          onClick={handleAddSize}
          className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 hover:border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ افزودن سایز جدید</span>
        </button>
      </div>
    </div>
  );
};

