import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'جستجوی مکمل، پروتئین، ویتامین یا برند...',
  className = '',
  onClear
}) => {
  return (
    <div className={`relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-700 focus-within:border-slate-800 rounded-xl shadow-2xs transition ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent py-1.5 pr-8 pl-7 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-right dir-rtl font-medium"
      />
      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 shrink-0 pointer-events-none" />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          className="absolute left-2.5 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
          title="پاک کردن"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
