import React from 'react';
import { SlidersHorizontal, Grid, List } from 'lucide-react';

interface FloatingViewSwitcherProps {
  viewMode: 'grid' | 'list';
  onToggleViewMode: (mode: 'grid' | 'list') => void;
  onOpenFilters: () => void;
}

export const FloatingViewSwitcher: React.FC<FloatingViewSwitcherProps> = ({
  viewMode,
  onToggleViewMode,
  onOpenFilters
}) => {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 font-['Vazirmatn',sans-serif]">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-4 py-2 shadow-xl flex items-center gap-3 dir-rtl">
        {/* Filter Button */}
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex items-center gap-1.5 text-xs font-black text-slate-800 hover:text-blue-700 px-3 py-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>فیلترها</span>
        </button>

        <div className="w-px h-4 bg-slate-200" />

        {/* View Mode Switcher (گرید / لیستی) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full">
          <button
            type="button"
            onClick={() => onToggleViewMode('grid')}
            title="نمایش گرید"
            className={`p-1.5 rounded-full transition cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onToggleViewMode('list')}
            title="نمایش لیستی"
            className={`p-1.5 rounded-full transition cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
