import React from 'react';
import { Save, CheckCircle2, Loader2 } from 'lucide-react';

interface StickyBottomSaveBarProps {
  onSave: () => Promise<void> | void;
  isSaving: boolean;
  saveSuccess: boolean;
  label?: string;
  subLabel?: string;
  activeTabLabel?: string;
  disabled?: boolean;
}

export const StickyBottomSaveBar: React.FC<StickyBottomSaveBarProps> = ({
  onSave,
  isSaving,
  saveSuccess,
  disabled = false,
}) => {
  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto transition-all duration-300 max-w-[92vw]">
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || disabled}
        className={`h-11 sm:h-12 px-6 sm:px-8 rounded-full font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl hover:shadow-2xl cursor-pointer active:scale-95 border whitespace-nowrap ${
          saveSuccess
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-400/40'
            : isSaving
            ? 'bg-slate-800 text-slate-300 border-slate-700 cursor-not-allowed opacity-90'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-600/30 hover:shadow-emerald-600/50'
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
  );
};

export default StickyBottomSaveBar;
