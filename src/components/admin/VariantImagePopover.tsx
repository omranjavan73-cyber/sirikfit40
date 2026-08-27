import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Trash2, Check } from 'lucide-react';

export interface VariantImagePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  onSave: (newUrl?: string) => void;
  mainProductImage?: string;
  variantTitle?: string;
}

export const VariantImagePopover: React.FC<VariantImagePopoverProps> = ({
  isOpen,
  onClose,
  imageUrl = '',
  onSave,
  mainProductImage = '',
  variantTitle = 'واریانت'
}) => {
  const [tempUrl, setTempUrl] = useState(imageUrl || '');

  useEffect(() => {
    setTempUrl(imageUrl || '');
  }, [imageUrl, isOpen]);

  if (!isOpen) return null;

  const currentPreview = tempUrl.trim() || mainProductImage?.trim();

  const handleApply = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onSave(tempUrl.trim() ? tempUrl.trim() : undefined);
    onClose();
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTempUrl('');
    onSave(undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-['Vazirmatn',sans-serif]"
      dir="rtl"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative z-50 shadow-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 w-80 max-w-[95vw] space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-black text-slate-900 dark:text-white">
              عکس اختصاصی واریانت
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {variantTitle && (
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
            {variantTitle}
          </p>
        )}

        {/* Live 40x40 Preview Box & Status */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            {currentPreview ? (
              <img
                src={currentPreview}
                alt="پیش‌نمایش"
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  if (mainProductImage && (e.target as HTMLImageElement).src !== mainProductImage) {
                    (e.target as HTMLImageElement).src = mainProductImage;
                  } else {
                    (e.target as HTMLElement).style.display = 'none';
                  }
                }}
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-slate-300" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-[11px]">
            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
              {tempUrl.trim() ? 'تصویر اختصاصی ثبت شده' : 'استفاده از تصویر اصلی محصول'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono dir-ltr truncate block">
              {tempUrl.trim() || 'mainProductImage'}
            </span>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
            لینک مستقیم تصویر (URL):
          </label>
          <input
            type="text"
            autoFocus
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApply();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="https://example.com/flavor-packaging.jpg"
            className="w-full bg-slate-50 dark:bg-zinc-800 focus:bg-white border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dir-ltr text-left"
            dir="ltr"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف عکس</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>تایید</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantImagePopover;
