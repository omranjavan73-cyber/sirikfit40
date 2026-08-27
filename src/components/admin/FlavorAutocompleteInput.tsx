import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { getFlavorAutocompleteSuggestions, PresetFlavor } from '../../utils/variantPresets';

export interface FlavorAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelect?: (flavorName: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  dir?: 'rtl' | 'ltr';
  disabled?: boolean;
}

export const FlavorAutocompleteInput: React.FC<FlavorAutocompleteInputProps> = ({
  value,
  onChange,
  onSelect,
  onKeyDown,
  placeholder = 'طعم سفارشی (تایپ فارسی یا انگلیسی)...',
  className = 'relative flex-1',
  inputClassName = '',
  autoFocus = false,
  dir = 'rtl',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = React.useMemo(() => {
    if (!value || !value.trim()) return [];
    return getFlavorAutocompleteSuggestions(value, 8);
  }, [value]);

  useEffect(() => {
    setHighlightIndex(-1);
    if (suggestions.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [suggestions]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (flavor: PresetFlavor) => {
    onChange(flavor.name);
    if (onSelect) {
      onSelect(flavor.name);
    }
    setIsOpen(false);
    setHighlightIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (e.key === 'Enter') {
        if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
          e.preventDefault();
          handleSelect(suggestions[highlightIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div ref={containerRef} className={className}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleCustomKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        dir={dir}
        className={inputClassName || "w-full bg-white border border-slate-200 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none transition"}
      />

      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto font-['Vazirmatn',sans-serif] text-right"
          dir="rtl"
        >
          <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 border-b border-slate-100 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>پیشنهادهای هوشمند طعم (فارسی / انگلیسی):</span>
          </div>
          {suggestions.map((sug, idx) => (
            <button
              key={sug.id || sug.name}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevents blur before click
                handleSelect(sug);
              }}
              className={`w-full text-right px-3 py-1.5 flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                highlightIndex === idx ? 'bg-amber-50 text-amber-900 font-black' : 'text-slate-800 hover:bg-slate-50 font-bold'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="truncate">{sug.name}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded dir-ltr shrink-0">
                {sug.nameEn}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlavorAutocompleteInput;
