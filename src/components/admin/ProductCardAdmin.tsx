import React from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toPersianDigits } from '../../utils/formatters';

export interface ProductCardAdminProps {
  product: {
    id: string;
    title?: string;
    titleFa?: string;
    titleEn?: string;
    brand?: string;
    image?: string;
    imageUrl?: string;
    priceAed?: number;
    isPublished?: boolean;
    isActive?: boolean;
    isPopular?: boolean;
    variants?: any[];
    [key: string]: any;
  };
  index?: number;
  isOpen?: boolean;
  onToggleExpand?: () => void;
  onDelete?: () => void;
  onTogglePublished?: (id: string, nextState: boolean) => void;
  onTogglePopular?: (id: string, nextState: boolean) => void;
  children?: React.ReactNode;
}

/**
 * Unified Admin Product Card Component
 * Consolidates status toggles into a single interactive status control toolbar directly above the variant matrix.
 * Keeps the header row strictly for core identifiers without duplicate static badges.
 */
export const ProductCardAdmin: React.FC<ProductCardAdminProps> = ({
  product,
  index = 0,
  isOpen = false,
  onToggleExpand,
  onDelete,
  onTogglePublished,
  onTogglePopular,
  children
}) => {
  const isPublished = product.isPublished !== false && product.isActive !== false;
  const isPopular = Boolean(product.isPopular);

  const handleTogglePublished = () => {
    if (onTogglePublished) {
      onTogglePublished(product.id, !isPublished);
    }
  };

  const handleTogglePopular = () => {
    if (onTogglePopular) {
      onTogglePopular(product.id, !isPopular);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300">
      {/* Top Header Banner: Strictly Core Identifiers */}
      <div
        onClick={onToggleExpand}
        className="p-3 sm:p-4 flex items-center gap-3 cursor-pointer select-none hover:bg-slate-50/80 transition"
      >
        {/* Index Number */}
        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black flex items-center justify-center shrink-0">
          {toPersianDigits(index + 1)}
        </div>

        {/* Product Thumbnail */}
        {(product.image || product.imageUrl) && (
          <img
            src={product.image || product.imageUrl}
            alt={product.title || product.titleFa || ''}
            className="w-10 h-10 object-contain rounded-xl border border-slate-200 bg-white p-0.5 shrink-0"
          />
        )}

        {/* Titles, Brand, Base Price */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-slate-900 truncate">
            {product.title || product.titleFa || 'بدون عنوان'}
          </p>
          {product.titleEn && (
            <p className="text-[10px] text-slate-400 font-mono truncate dir-ltr text-right">
              {product.titleEn}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {product.brand && (
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                {product.brand}
              </span>
            )}
            <span className="text-[10px] text-slate-500 font-medium">
              واریانت: {toPersianDigits(product.variants?.length || 0)}
            </span>
            {product.priceAed !== undefined && (
              <span className="text-[10px] text-emerald-600 font-mono font-bold">
                {product.priceAed} AED
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-rose-500 hover:bg-rose-100 hover:text-rose-700 active:scale-95 rounded-lg transition cursor-pointer"
              title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-[11px] font-bold cursor-pointer"
            >
              {isOpen ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>بستن</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>ویرایش</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Section */}
      {isOpen && (
        <div className="p-4 pt-0 border-t border-slate-100 space-y-4">
          {/* Single Unified Status Control Toolbar */}
          <div className="flex items-center gap-2 py-2 w-full">
            {/* 1. Publication State Toggle (isPublished) */}
            <button
              type="button"
              onClick={handleTogglePublished}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPublished
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
              }`}
            >
              <span>{isPublished ? '✓ منتشر شده در سایت (عمومی)' : '⊘ پیشنویس (مخفی از سایت)'}</span>
            </button>

            {/* 2. Homepage Featured Toggle (isPopular) */}
            <button
              type="button"
              onClick={handleTogglePopular}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPopular
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
              }`}
            >
              <span>{isPopular ? '★ پرطرفدار (نمایش در خانه)' : '☆ پرطرفدار (غیرفعال)'}</span>
            </button>
          </div>

          {/* Children: Variant Matrix, Taxonomy Selectors, Price Settings */}
          {children}
        </div>
      )}
    </div>
  );
};

export default ProductCardAdmin;
