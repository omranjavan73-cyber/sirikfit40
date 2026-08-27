import React, { useState } from 'react';
import { Plus, Trash2, Check, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';
import type { ProductVariant } from '../../types';
import { parseAndConvertSize } from '../../utils/formatters';

export const STANDARD_SIZES_PRESET: string[] = [
  '2.45 kg (5.4 lbs)',
  '2.27 kg (5 lbs)',
  '1.81 kg (4 lbs)',
  '1 kg (2.2 lbs)',
  '908 g (2 lbs)',
  '500 g',
  '300 g',
  '250 g',
  '100 g',
  '60 Servings',
  '120 Servings',
  '30 Servings',
  '90 Servings',
  '30 ساشه (Sachets)',
  '60 ساشه (Sachets)',
  '60 کپسول (Capsules)',
  '90 کپسول (Capsules)',
  '120 کپسول (Capsules)',
  '180 کپسول (Capsules)',
  '240 قرص (Tablets)'
];

interface VariantMatrixTableProps {
  variants: ProductVariant[];
  availableSizes?: string[];
  availableFlavors?: string[];
  mainProductImage?: string;
  aedRate?: number;
  profitMargin?: number;
  cargoRatePerKg?: number;
  onUpdateVariant: (index: number, field: keyof ProductVariant, value: any) => void;
  onDeleteVariant: (index: number) => void;
  onAddVariant: () => void;
  className?: string;
}

export const VariantMatrixTable: React.FC<VariantMatrixTableProps> = ({
  variants,
  availableSizes = [],
  availableFlavors = [],
  mainProductImage = '',
  aedRate = 51400,
  profitMargin = 20,
  cargoRatePerKg = 35,
  onUpdateVariant,
  onDeleteVariant,
  onAddVariant,
  className = ''
}) => {
  const [customMode, setCustomMode] = useState<Record<string, { customSize?: boolean; customFlavor?: boolean }>>({});

  // Merge upper section active size chips with standard presets
  const sizeOptions = Array.from(
    new Set([
      ...availableSizes.filter(Boolean),
      ...variants.map(v => v.size).filter(Boolean) as string[],
      ...STANDARD_SIZES_PRESET
    ])
  );

  // Merge upper section active flavor chips
  const flavorOptions = Array.from(
    new Set([
      ...availableFlavors.filter(Boolean),
      ...variants.map(v => v.flavor).filter(Boolean) as string[]
    ])
  );

  const handleSizeChange = (idx: number, varId: string, value: string) => {
    if (value === '__custom__') {
      setCustomMode(prev => ({ ...prev, [varId]: { ...prev[varId], customSize: true } }));
      return;
    }
    setCustomMode(prev => ({ ...prev, [varId]: { ...prev[varId], customSize: false } }));
    
    // Auto convert weight if size has kg/lbs/servings
    const parsed = parseAndConvertSize(value);
    onUpdateVariant(idx, 'size', value);
    if (parsed.weightKg && parsed.weightKg > 0) {
      onUpdateVariant(idx, 'weightKg', parsed.weightKg);
    }
  };

  const handleFlavorChange = (idx: number, varId: string, value: string) => {
    if (value === '__custom__') {
      setCustomMode(prev => ({ ...prev, [varId]: { ...prev[varId], customFlavor: true } }));
      return;
    }
    setCustomMode(prev => ({ ...prev, [varId]: { ...prev[varId], customFlavor: false } }));
    onUpdateVariant(idx, 'flavor', value);
  };

  return (
    <div className={`space-y-3 font-['Vazirmatn',sans-serif] ${className}`} dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-800" />
          <span className="text-xs font-black text-slate-900">
            ماتریس واریانت‌ها ({variants.length} واریانت فعال)
          </span>
        </div>
        <button
          type="button"
          onClick={onAddVariant}
          className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ افزودن سطر</span>
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
          هیچ واریانتی تعریف نشده است. روی «افزودن سطر» کلیک کنید تا طعم و سایز اضافه شود.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-extrabold">
                <th className="py-2.5 px-3 min-w-[200px]">تصویر واریانت (اختیاری)</th>
                <th className="py-2.5 px-3 min-w-[160px]">سایز / حجم (انتخاب سریع)</th>
                <th className="py-2.5 px-3 min-w-[140px]">طعم / مدل</th>
                <th className="py-2.5 px-3 min-w-[100px]">قیمت خرید (AED)</th>
                <th className="py-2.5 px-3 min-w-[120px]">قیمت فروش (تومان)</th>
                <th className="py-2.5 px-3 text-center min-w-[90px]">موجودی</th>
                <th className="py-2.5 px-3 text-center min-w-[50px]">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.map((v, idx) => {
                const varId = v.id || `var-${idx}`;
                const isCustomSize = customMode[varId]?.customSize || (v.size && !sizeOptions.includes(v.size));
                const isCustomFlavor = customMode[varId]?.customFlavor || (v.flavor && flavorOptions.length > 0 && !flavorOptions.includes(v.flavor));
                const currentPriceAed = v.price !== undefined ? v.price : (v.priceAed !== undefined ? v.priceAed : 0);
                const displayThumb = v.image?.trim() || mainProductImage?.trim();

                return (
                  <tr key={varId} className="hover:bg-slate-50/80 transition-colors">
                    {/* Variant Image & 36x36 Preview */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        {displayThumb ? (
                          <img
                            src={displayThumb}
                            alt={v.flavor || v.size || ''}
                            className="w-9 h-9 object-contain rounded-xl border border-slate-200 bg-white p-0.5 shrink-0 shadow-2xs"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <input
                          type="text"
                          value={v.image || ''}
                          onChange={(e) => onUpdateVariant(idx, 'image', e.target.value.trim() || undefined)}
                          placeholder="لینک تصویر اختصاصی..."
                          className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-slate-900 dir-ltr"
                          dir="ltr"
                          title="لینک تصویر اختصاصی واریانت (اختیاری)"
                        />
                      </div>
                    </td>

                    {/* Size Selector: Dropdown + Custom mode */}
                    <td className="py-2 px-3">
                      {isCustomSize ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={v.size || ''}
                            onChange={(e) => {
                              onUpdateVariant(idx, 'size', e.target.value);
                              const p = parseAndConvertSize(e.target.value);
                              if (p.weightKg) onUpdateVariant(idx, 'weightKg', p.weightKg);
                            }}
                            placeholder="مثال: 60 Servings یا 2.45 kg"
                            className="w-full bg-white border border-blue-400 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomMode(prev => ({ ...prev, [varId]: { ...prev[varId], customSize: false } }))}
                            className="text-[10px] text-blue-600 hover:underline shrink-0 font-bold px-1"
                          >
                            لیست
                          </button>
                        </div>
                      ) : (
                        <select
                          value={v.size || (sizeOptions[0] || '')}
                          onChange={(e) => handleSizeChange(idx, varId, e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none transition cursor-pointer"
                        >
                          {availableSizes.length > 0 && (
                            <optgroup label="✨ سایزهای فعال این محصول">
                              {availableSizes.map(s => (
                                <option key={`active-${s}`} value={s}>{s}</option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="📋 تمامی سایزها و استانداردهای بازار">
                            {sizeOptions.filter(s => !availableSizes.includes(s)).map(s => (
                              <option key={`std-${s}`} value={s}>{s}</option>
                            ))}
                          </optgroup>
                          <option value="__custom__">➕ تایپ سایز سفارشی...</option>
                        </select>
                      )}
                    </td>

                    {/* Flavor Selector */}
                    <td className="py-2 px-3">
                      {isCustomFlavor || flavorOptions.length === 0 ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={v.flavor || ''}
                            onChange={(e) => onUpdateVariant(idx, 'flavor', e.target.value)}
                            placeholder="نام طعم (شکلات، موزی و...)"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-black"
                          />
                          {flavorOptions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setCustomMode(prev => ({ ...prev, [varId]: { ...prev[varId], customFlavor: false } }))}
                              className="text-[10px] text-blue-600 hover:underline shrink-0 font-bold px-1"
                            >
                              لیست
                            </button>
                          )}
                        </div>
                      ) : (
                        <select
                          value={v.flavor || (flavorOptions[0] || '')}
                          onChange={(e) => handleFlavorChange(idx, varId, e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 focus:border-black rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none transition cursor-pointer"
                        >
                          {flavorOptions.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                          <option value="__custom__">➕ تایپ طعم سفارشی...</option>
                        </select>
                      )}
                    </td>

                    {/* Price AED */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={currentPriceAed === 0 ? '' : currentPriceAed}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            onUpdateVariant(idx, 'price', val);
                            onUpdateVariant(idx, 'priceAed', val);
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-600 focus:outline-none focus:border-emerald-600 dir-ltr text-center"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">AED</span>
                      </div>
                    </td>

                    {/* Price Toman */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={v.priceToman === undefined || v.priceToman === 0 ? '' : v.priceToman}
                          placeholder="محاسبه خودکار"
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                            onUpdateVariant(idx, 'priceToman', val);
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-28 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-black dir-ltr text-center"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">تومان</span>
                      </div>
                    </td>

                    {/* Stock status toggle */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onUpdateVariant(idx, 'inStock', v.inStock === false ? true : false)}
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full cursor-pointer transition ${
                          v.inStock !== false
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {v.inStock !== false ? '✓ موجود' : '✕ ناموجود'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteVariant(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="حذف واریانت"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
