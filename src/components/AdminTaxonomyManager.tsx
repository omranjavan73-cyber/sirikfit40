import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  RefreshCw, 
  Check, 
  Tag, 
  FolderTree,
  X,
  Sparkles
} from 'lucide-react';
import { 
  TaxonomyCategory, 
  DEFAULT_TAXONOMY, 
  fetchTaxonomyFromFirestore, 
  saveTaxonomyToFirestore 
} from '../utils/taxonomyHelper';

interface AdminTaxonomyManagerProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onTaxonomyChange?: (categories: TaxonomyCategory[]) => void;
}

export const AdminTaxonomyManager: React.FC<AdminTaxonomyManagerProps> = ({
  showToast,
  onTaxonomyChange
}) => {
  const [categories, setCategories] = useState<TaxonomyCategory[]>(DEFAULT_TAXONOMY);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // New Main Category Input
  const [newMainName, setNewMainName] = useState<string>('');

  // Subcategory Input state per category ID
  const [subInputs, setSubInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTaxonomy = async () => {
      setIsLoading(true);
      try {
        const loaded = await fetchTaxonomyFromFirestore();
        if (Array.isArray(loaded) && loaded.length > 0) {
          setCategories(loaded);
        }
      } catch (err) {
        console.error('Error loading taxonomy:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTaxonomy();
  }, []);

  const generateSlug = (text: string) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w\u0600-\u06FF-]/g, '') || `cat-${Date.now()}`;
  };

  const handleAddMainCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMainName.trim()) return;

    const newCat: TaxonomyCategory = {
      id: `cat_${Date.now()}`,
      name: newMainName.trim(),
      slug: generateSlug(newMainName),
      order: categories.length + 1,
      subCategories: [
        { id: 'all', name: 'همه موارد', slug: 'all', keywords: [] }
      ]
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    setNewMainName('');
    if (onTaxonomyChange) onTaxonomyChange(updated);
  };

  const handleDeleteMainCategory = (catId: string) => {
    if (!window.confirm('آیا از حذف این دسته‌بندی اصلی و تمام زیرمجموعه‌های آن اطمینان دارید؟')) return;
    const updated = categories.filter(c => c.id !== catId);
    setCategories(updated);
    if (onTaxonomyChange) onTaxonomyChange(updated);
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const copy = [...categories];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // Re-assign order numbers
    const updated = copy.map((c, idx) => ({ ...c, order: idx + 1 }));
    setCategories(updated);
    if (onTaxonomyChange) onTaxonomyChange(updated);
  };

  const handleAddSubCategory = (catId: string) => {
    const subName = (subInputs[catId] || '').trim();
    if (!subName) return;

    const updated = categories.map(cat => {
      if (cat.id !== catId) return cat;

      const newSub = {
        id: `sub_${Date.now()}`,
        name: subName,
        slug: generateSlug(subName),
        keywords: [subName.toLowerCase()]
      };

      return {
        ...cat,
        subCategories: [...cat.subCategories, newSub]
      };
    });

    setCategories(updated);
    setSubInputs(prev => ({ ...prev, [catId]: '' }));
    if (onTaxonomyChange) onTaxonomyChange(updated);
  };

  const handleDeleteSubCategory = (catId: string, subId: string) => {
    if (subId === 'all') {
      alert('گزینه «همه موارد» پیش‌فرض سیستم بوده و قابل حذف نیست.');
      return;
    }

    const updated = categories.map(cat => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        subCategories: cat.subCategories.filter(s => s.id !== subId)
      };
    });

    setCategories(updated);
    if (onTaxonomyChange) onTaxonomyChange(updated);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await saveTaxonomyToFirestore(categories);
      setSaveSuccess(true);
      if (showToast) showToast('ساختار درختی دسته‌بندی‌ها با موفقیت ذخیره شد.', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving taxonomy:', err);
      if (showToast) showToast('خطا در ذخیره ساختار دسته‌بندی‌ها.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
        <span>در حال بارگذاری درخت دسته‌بندی‌ها...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-right">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                <span>مدیریت ساختار درختی دسته‌بندی‌ها و زیرمجموعه‌ها</span>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-400/30">
                  ۲ سطحی داینامیک
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                تعریف نامحدود دسته‌بندی‌های اصلی و زیرمجموعه‌های تخصصی بدون نیاز به تصویر — همگام‌سازی آنی با منوی بالای سایت و فرم‌های محصولات
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAll}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-5 py-3 rounded-2xl transition flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>در حال ذخیره...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>دسته‌بندی‌ها ذخیره شد</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>ذخیره نهایی تغییرات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add New Main Category Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-700" />
          <span>افزودن دسته‌بندی اصلی جدید (Main Category)</span>
        </h3>
        <form onSubmit={handleAddMainCategory} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={newMainName}
            onChange={(e) => setNewMainName(e.target.value)}
            placeholder="نام دسته‌بندی اصلی (مثال: انرژی‌زا و کافی، رژیمی، ویتامین‌ها)"
            className="w-full flex-1 bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-blue-700"
          />
          <button
            type="submit"
            disabled={!newMainName.trim()}
            className="w-full sm:w-auto bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-black px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن دسته اصلی</span>
          </button>
        </form>
      </div>

      {/* Category Tree Cards */}
      <div className="space-y-4">
        {categories.map((cat, index) => (
          <div
            key={cat.id}
            className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-2xs space-y-4 transition"
          >
            {/* Main Category Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-100 shrink-0">
                  {index + 1}
                </span>
                <div>
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span>{cat.name}</span>
                    <span className="text-[11px] font-mono text-slate-400 font-bold dir-ltr bg-slate-100 px-2 py-0.5 rounded-md">
                      slug: {cat.slug}
                    </span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    شامل {cat.subCategories.length} زیرمجموعه
                  </span>
                </div>
              </div>

              {/* Action Controls: Up/Down & Delete */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMoveOrder(index, 'up')}
                  title="انتقال به بالا"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 rounded-lg transition cursor-pointer"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === categories.length - 1}
                  onClick={() => handleMoveOrder(index, 'down')}
                  title="انتقال به پایین"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 rounded-lg transition cursor-pointer"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMainCategory(cat.id)}
                  title="حذف دسته اصلی"
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-categories Section */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-700 block">
                زیرمجموعه‌های تخصصی (Subcategories):
              </label>

              {/* Subcategory Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {cat.subCategories.map((sub) => (
                  <span
                    key={sub.id}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 group"
                  >
                    <Tag className="w-3 h-3 text-blue-600" />
                    <span>{sub.name}</span>
                    {sub.id !== 'all' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSubCategory(cat.id, sub.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Quick Add Subcategory Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={subInputs[cat.id] || ''}
                  onChange={(e) => setSubInputs({ ...subInputs, [cat.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubCategory(cat.id);
                    }
                  }}
                  placeholder="افزودن زیرمجموعه جدید... (اینتر بزنید)"
                  className="w-full sm:max-w-xs bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-blue-700"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubCategory(cat.id)}
                  disabled={!(subInputs[cat.id] || '').trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black p-2 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
