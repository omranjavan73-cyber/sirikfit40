import React, { useState } from 'react';
import { Plus, Trash2, Check, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';
import type { ProductVariant } from '../../types';
import { parseAndConvertSize } from '../../utils/formatters';
import { STANDARD_SIZE_OPTIONS, PRESET_FLAVORS } from '../../utils/variantPresets';
import { FlavorAutocompleteInput } from './FlavorAutocompleteInput';
import { VariantImagePopover } from './VariantImagePopover';

export const STANDARD_SIZES_PRESET: string[] = STANDARD_SIZE_OPTIONS;

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
  const [editingImageIdx, setEditingImageIdx] = useState<number | null>(null);

  // Merge upper section active size chips with standard presets
  const sizeOptions = Array.from(
    new Set([
      ...availableSizes.filter(Boolean),
      ...variants.map(v => v.size).filter(Boolean) as string[],
      ...STANDARD_SIZES_PRESET
    ])
  );

  // Merge upper section active flavor chips with preset flavors
  const flavorOptions = Array.from(
    new Set([
      ...availableFlavors.filter(Boolean),
      ...variants.map(v => v.flavor).filter(Boolean) as string[],
      ...PRESET_FLAVORS.map(f => f.name)
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
                <th className="py-2.5 px-3 min-w-[220px]">تصویر واریانت (اختیاری)</th>
                <th className="py-2.5 px-3 min-w-[160px]">طعم / مدل</th>
                <th className="py-2.5 px-3 min-w-[160px]">سایز / حجم (انتخاب سریع)</th>
                <th className="py-2.5 px-3 min-w-[100px]">قیمت خرید (AED)</th>
                <th className="py-2.5 px-3 min-w-[120px]">قیمت فروش (تومان)</th>
                <th className="py-2.5 px-3 text-center min-w-[90px]">موجودی</th>
                <th className="py-2.5 px-3 text-center min-w-[50px]">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.map((v, idx) => {
                const varId = v.id || `var-${idx}`;
                const isCustomSize = Boolean(customMode[varId]?.customSize);
                const isCustomFlavor = Boolean(customMode[varId]?.customFlavor);
                const currentPriceAed = v.price !== undefined ? v.price : (v.priceAed !== undefined ? v.priceAed : 0);
                const displayThumb = v.image?.trim() || mainProductImage?.trim();

                return (
                  <tr key={varId} className="hover:bg-slate-50/80 transition-colors">
                    {/* Variant Image & 36x36 Preview */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingImageIdx(idx)}
                          className="cursor-pointer hover:ring-2 hover:ring-amber-500 rounded-xl transition-all shrink-0 select-none group/thumb relative focus:outline-none"
                          title="ویرایش و آپلود عکس اختصاصی واریانت"
                        >
                          {displayThumb ? (
                            <img
                              src={displayThumb}
                              alt={v.flavor || v.size || ''}
                              className="w-9 h-9 object-contain rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs group-hover/thumb:brightness-95"
                              onError={(e) => {
                                if (mainProductImage && (e.target as HTMLImageElement).src !== mainProductImage) {
                                  (e.target as HTMLImageElement).src = mainProductImage;
                                } else {
                                  (e.target as HTMLElement).style.display = 'none';
                                }
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group-hover/thumb:bg-slate-200 transition">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </button>
                        <input
                          type="text"
                          value={v.image || ''}
                          onChange={(e) => {
                            const val = e.target.value.trim() || undefined;
                            onUpdateVariant(idx, 'image', val);
                            onUpdateVariant(idx, 'imageUrl' as any, val);
                          }}
                          placeholder="لینک تصویر اختصاصی..."
                          className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-slate-900 dir-ltr"
                          dir="ltr"
                          title="لینک تصویر اختصاصی واریانت (اختیاری)"
                        />
                      </div>
                    </td>

                    {/* Flavor Selector with Intelligent Bilingual Autocomplete */}
                    <td className="py-2 px-3">
                      {isCustomFlavor ? (
                        <div className="flex items-center gap-1">
                          <FlavorAutocompleteInput
                            value={v.flavor || ''}
                            onChange={(val) => onUpdateVariant(idx, 'flavor', val)}
                            placeholder="نام طعم (فارسی / انگلیسی)..."
                            inputClassName="w-full bg-white border border-amber-400 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomMode(prev => ({ ...prev, [varId]: { ...prev[varId], customFlavor: false } }))}
                            className="text-[10px] text-blue-600 hover:underline shrink-0 font-bold px-1 cursor-pointer"
                          >
                            لیست
                          </button>
                        </div>
                      ) : (
                        <select
                          value={v.flavor || (flavorOptions[0] || '')}
                          onChange={(e) => handleFlavorChange(idx, varId, e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 focus:border-black rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none transition cursor-pointer"
                        >
                          {availableFlavors.length > 0 && (
                            <optgroup label="✨ طعم‌های فعال محصول">
                              {availableFlavors.map(f => (
                                <option key={`active-${f}`} value={f}>{f}</option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="📋 طعم‌های استاندارد بازار">
                            {flavorOptions.filter(f => !availableFlavors.includes(f)).map(f => (
                              <option key={`std-${f}`} value={f}>{f}</option>
                            ))}
                          </optgroup>
                          {v.flavor && !flavorOptions.includes(v.flavor) && !availableFlavors.includes(v.flavor) && (
                            <option value={v.flavor}>{v.flavor}</option>
                          )}
                          <option value="__custom__">➕ تایپ طعم سفارشی (با جستجو)...</option>
                        </select>
                      )}
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
                            placeholder="مثال: 5 lb (2.27 kg) یا 60 Servings"
                            className="w-full bg-white border border-blue-400 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomMode(prev => ({ ...prev, [varId]: { ...prev[varId], customSize: false } }))}
                            className="text-[10px] text-blue-600 hover:underline shrink-0 font-bold px-1 cursor-pointer"
                          >
                            لیست
                          </button>
                        </div>
                      ) : (
                        <select
                          value={v.size || (sizeOptions[0] || '')}
                          onChange={(e) => handleSizeChange(idx, varId, e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none transition cursor-pointer"
                          dir="ltr"
                        >
                          {availableSizes.length > 0 && (
                            <optgroup label="✨ سایزهای فعال این محصول">
                              {availableSizes.map(s => (
                                <option key={`active-${s}`} value={s}>{s}</option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="📋 تمامی سایزها و استانداردهای بازار (پوندی و متریك)">
                            {sizeOptions.filter(s => !availableSizes.includes(s)).map(s => (
                              <option key={`std-${s}`} value={s}>{s}</option>
                            ))}
                          </optgroup>
                          {v.size && !sizeOptions.includes(v.size) && !availableSizes.includes(v.size) && (
                            <option value={v.size}>{v.size}</option>
                          )}
                          <option value="__custom__">➕ تایپ سایز سفارشی...</option>
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

      {/* Floating Variant Image Popover */}
      <VariantImagePopover
        isOpen={editingImageIdx !== null}
        onClose={() => setEditingImageIdx(null)}
        imageUrl={editingImageIdx !== null ? variants[editingImageIdx]?.image : undefined}
        onSave={(newUrl) => {
          if (editingImageIdx !== null) {
            onUpdateVariant(editingImageIdx, 'image', newUrl);
          }
        }}
        mainProductImage={mainProductImage}
        variantTitle={
          editingImageIdx !== null
            ? `${variants[editingImageIdx]?.flavor || ''} ${variants[editingImageIdx]?.size ? `- ${variants[editingImageIdx]?.size}` : ''}`.trim()
            : undefined
        }
      />
    </div>
  );
};

export default VariantMatrixTable;
