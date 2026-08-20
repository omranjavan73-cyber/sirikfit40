import React from 'react';
import {
  Layers,
  Dumbbell,
  Zap,
  Pill,
  Droplets,
  Flame,
  Star,
  Activity,
  Grid,
  ShieldCheck,
  Award,
  Sparkles,
  Heart,
  TrendingUp
} from 'lucide-react';
import type { WarehouseCategory } from '../types';

export interface CategoryThemeInfo {
  filterKey: string;
  label: string;
  englishLabel: string;
  gradient: string;
  shadowColor: string;
  iconName: string;
  badgeBorder: string;
}

/**
 * Modern aesthetic gradient presets for each category
 */
export const CATEGORY_THEMES: Record<string, CategoryThemeInfo> = {
  all: {
    filterKey: 'all',
    label: 'همه کالاها',
    englishLabel: 'ALL',
    gradient: 'from-slate-900 via-slate-800 to-zinc-900',
    shadowColor: 'shadow-slate-900/20',
    iconName: 'Grid',
    badgeBorder: 'border-slate-800'
  },
  protein: {
    filterKey: 'protein',
    label: 'پروتئین',
    englishLabel: 'PROTEIN',
    gradient: 'from-blue-600 via-indigo-600 to-indigo-800',
    shadowColor: 'shadow-blue-600/25',
    iconName: 'Dumbbell',
    badgeBorder: 'border-indigo-600'
  },
  creatine: {
    filterKey: 'creatine',
    label: 'کراتین',
    englishLabel: 'CREATINE',
    gradient: 'from-violet-600 via-purple-600 to-purple-800',
    shadowColor: 'shadow-purple-600/25',
    iconName: 'Zap',
    badgeBorder: 'border-purple-600'
  },
  vitamin: {
    filterKey: 'vitamin',
    label: 'ویتامین',
    englishLabel: 'VITAMINS',
    gradient: 'from-emerald-500 via-teal-600 to-emerald-700',
    shadowColor: 'shadow-emerald-600/25',
    iconName: 'Pill',
    badgeBorder: 'border-emerald-600'
  },
  omega: {
    filterKey: 'omega',
    label: 'امگا ۳',
    englishLabel: 'OMEGA 3',
    gradient: 'from-cyan-500 via-teal-600 to-blue-700',
    shadowColor: 'shadow-cyan-600/25',
    iconName: 'Droplets',
    badgeBorder: 'border-cyan-600'
  },
  pre: {
    filterKey: 'pre',
    label: 'قبل تمرین',
    englishLabel: 'PRE-WORKOUT',
    gradient: 'from-rose-600 via-red-600 to-orange-600',
    shadowColor: 'shadow-rose-600/25',
    iconName: 'Flame',
    badgeBorder: 'border-rose-600'
  },
  hot: {
    filterKey: 'hot',
    label: 'پرفروش‌ها',
    englishLabel: 'BEST SELLERS',
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    shadowColor: 'shadow-amber-500/25',
    iconName: 'Star',
    badgeBorder: 'border-amber-500'
  },
  amino: {
    filterKey: 'amino',
    label: 'آمینو و BCAA',
    englishLabel: 'AMINO & BCAA',
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
    shadowColor: 'shadow-sky-600/25',
    iconName: 'Activity',
    badgeBorder: 'border-sky-600'
  },
  gainer: {
    filterKey: 'gainer',
    label: 'گینر',
    englishLabel: 'GAINER',
    gradient: 'from-indigo-600 via-slate-700 to-purple-800',
    shadowColor: 'shadow-indigo-600/25',
    iconName: 'Layers',
    badgeBorder: 'border-indigo-600'
  },
  fatburner: {
    filterKey: 'fatburner',
    label: 'چربی‌سوز',
    englishLabel: 'FAT BURNER',
    gradient: 'from-rose-500 via-orange-500 to-amber-600',
    shadowColor: 'shadow-orange-500/25',
    iconName: 'Flame',
    badgeBorder: 'border-orange-500'
  }
};

export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  all: 'https://raw.githubusercontent.com/omran-javan73/sirikfit/main/logo.png',
  protein: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=300',
  creatine: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&q=80&w=300',
  vitamin: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=300',
  omega: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=300',
  pre: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=300',
  hot: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=300',
  amino: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=300',
  gainer: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=300',
  fatburner: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=300'
};

/**
 * Standard Default Categories for the storefront and admin
 */
export const DEFAULT_UNIFIED_CATEGORIES: WarehouseCategory[] = [
  {
    id: 'all',
    label: 'همه کالاها',
    englishLabel: 'ALL',
    filterKey: 'all',
    imageUrl: DEFAULT_CATEGORY_IMAGES.all,
    iconUrl: DEFAULT_CATEGORY_IMAGES.all,
    isPinned: true
  },
  {
    id: 'protein',
    label: 'پروتئین',
    englishLabel: 'PROTEIN',
    filterKey: 'protein',
    imageUrl: DEFAULT_CATEGORY_IMAGES.protein,
    iconUrl: DEFAULT_CATEGORY_IMAGES.protein,
    isPinned: true
  },
  {
    id: 'creatine',
    label: 'کراتین',
    englishLabel: 'CREATINE',
    filterKey: 'creatine',
    imageUrl: DEFAULT_CATEGORY_IMAGES.creatine,
    iconUrl: DEFAULT_CATEGORY_IMAGES.creatine,
    isPinned: true
  },
  {
    id: 'vitamin',
    label: 'ویتامین',
    englishLabel: 'VITAMINS',
    filterKey: 'vitamin',
    imageUrl: DEFAULT_CATEGORY_IMAGES.vitamin,
    iconUrl: DEFAULT_CATEGORY_IMAGES.vitamin,
    isPinned: true
  },
  {
    id: 'omega',
    label: 'امگا ۳',
    englishLabel: 'OMEGA 3',
    filterKey: 'omega',
    imageUrl: DEFAULT_CATEGORY_IMAGES.omega,
    iconUrl: DEFAULT_CATEGORY_IMAGES.omega,
    isPinned: true
  },
  {
    id: 'pre',
    label: 'قبل تمرین',
    englishLabel: 'PRE-WORKOUT',
    filterKey: 'pre',
    imageUrl: DEFAULT_CATEGORY_IMAGES.pre,
    iconUrl: DEFAULT_CATEGORY_IMAGES.pre,
    isPinned: true
  },
  {
    id: 'hot',
    label: 'پرفروش‌ها',
    englishLabel: 'BEST SELLERS',
    filterKey: 'hot',
    imageUrl: DEFAULT_CATEGORY_IMAGES.hot,
    iconUrl: DEFAULT_CATEGORY_IMAGES.hot,
    isPinned: true
  },
  {
    id: 'amino',
    label: 'آمینو',
    englishLabel: 'AMINO',
    filterKey: 'amino',
    imageUrl: DEFAULT_CATEGORY_IMAGES.amino,
    iconUrl: DEFAULT_CATEGORY_IMAGES.amino,
    isPinned: false
  },
  {
    id: 'gainer',
    label: 'گینر',
    englishLabel: 'GAINER',
    filterKey: 'gainer',
    imageUrl: DEFAULT_CATEGORY_IMAGES.gainer,
    iconUrl: DEFAULT_CATEGORY_IMAGES.gainer,
    isPinned: false
  }
];

/**
 * Clean and normalize a category string (Persian & English)
 */
export function normalizeCategoryText(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
    .replace(/[\u064B-\u065F]/g, '') // Arabic diacritics
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\s\-_/]+/g, ' ')
    .trim();
}

/**
 * Maps any raw category string, Persian label or alias to its canonical filterKey
 */
export function getCanonicalCategoryKey(input: string | undefined | null): string {
  if (!input) return 'all';
  const clean = normalizeCategoryText(input);

  if (
    clean === 'all' ||
    clean === 'همه' ||
    clean === 'همه کالاها' ||
    clean === 'all products' ||
    clean === 'پیشنهادها' ||
    clean === 'همه پیشنهادها'
  ) {
    return 'all';
  }

  // Protein
  if (
    clean.includes('protein') ||
    clean.includes('whey') ||
    clean.includes('isolate') ||
    clean.includes('casein') ||
    clean.includes('پروتئین') ||
    clean.includes('پروتین') ||
    clean.includes('وی') ||
    clean.includes('ایزوله') ||
    clean.includes('کازئین')
  ) {
    return 'protein';
  }

  // Creatine
  if (
    clean.includes('creatine') ||
    clean.includes('کراتین') ||
    clean.includes('منوهیدرات') ||
    clean.includes('monohydrate')
  ) {
    return 'creatine';
  }

  // Vitamin & Health
  if (
    clean.includes('vitamin') ||
    clean.includes('multi') ||
    clean.includes('ویتامین') ||
    clean.includes('مولتی') ||
    clean.includes('سلامت') ||
    clean.includes('زینک') ||
    clean.includes('zinc') ||
    clean.includes('daily')
  ) {
    return 'vitamin';
  }

  // Omega 3 & Fish oil
  if (
    clean.includes('omega') ||
    clean.includes('امگا') ||
    clean.includes('روغن ماهی') ||
    clean.includes('fish oil')
  ) {
    return 'omega';
  }

  // Pre-Workout & Energy
  if (
    clean.includes('pre') ||
    clean.includes('pump') ||
    clean.includes('energy') ||
    clean.includes('قبل تمرین') ||
    clean.includes('پمپ') ||
    clean.includes('انرژی') ||
    clean.includes('کافئین') ||
    clean.includes('c4')
  ) {
    return 'pre';
  }

  // Bestseller / Hot / Popular
  if (
    clean.includes('hot') ||
    clean.includes('bestseller') ||
    clean.includes('popular') ||
    clean.includes('پرفروش') ||
    clean.includes('محبوب') ||
    clean.includes('داغ')
  ) {
    return 'hot';
  }

  // Amino / BCAA / Glutamine
  if (
    clean.includes('amino') ||
    clean.includes('bcaa') ||
    clean.includes('eaa') ||
    clean.includes('glutamine') ||
    clean.includes('آمینو') ||
    clean.includes('بی سی ای') ||
    clean.includes('گلوتامین')
  ) {
    return 'amino';
  }

  // Gainer / Mass
  if (
    clean.includes('gainer') ||
    clean.includes('mass') ||
    clean.includes('گینر') ||
    clean.includes('کربو')
  ) {
    return 'gainer';
  }

  // Fat Burner / Weight Loss
  if (
    clean.includes('fat') ||
    clean.includes('burner') ||
    clean.includes('carnitine') ||
    clean.includes('cla') ||
    clean.includes('چربی') ||
    clean.includes('کارنیتین') ||
    clean.includes('لاغری')
  ) {
    return 'fatburner';
  }

  return clean;
}

/**
 * Returns the theme metadata (colors, gradient, icon) for any category
 */
export function getCategoryTheme(categoryKeyOrLabel: string | undefined | null): CategoryThemeInfo {
  const canonical = getCanonicalCategoryKey(categoryKeyOrLabel);
  if (CATEGORY_THEMES[canonical]) {
    return CATEGORY_THEMES[canonical];
  }

  // Generic fallback theme with sleek violet-slate gradient
  return {
    filterKey: canonical,
    label: categoryKeyOrLabel || 'دسته‌بندی',
    englishLabel: 'CATEGORY',
    gradient: 'from-slate-700 via-indigo-800 to-slate-900',
    shadowColor: 'shadow-slate-900/20',
    iconName: 'Layers',
    badgeBorder: 'border-slate-700'
  };
}

/**
 * Renders the matching Lucide icon for a category theme
 */
export function renderCategoryIcon(iconName: string, className = 'w-5 h-5'): React.ReactNode {
  switch (iconName) {
    case 'Grid':
      return React.createElement(Grid, { className });
    case 'Dumbbell':
      return React.createElement(Dumbbell, { className });
    case 'Zap':
      return React.createElement(Zap, { className });
    case 'Pill':
      return React.createElement(Pill, { className });
    case 'Droplets':
      return React.createElement(Droplets, { className });
    case 'Flame':
      return React.createElement(Flame, { className });
    case 'Star':
      return React.createElement(Star, { className });
    case 'Activity':
      return React.createElement(Activity, { className });
    case 'ShieldCheck':
      return React.createElement(ShieldCheck, { className });
    case 'Award':
      return React.createElement(Award, { className });
    case 'Sparkles':
      return React.createElement(Sparkles, { className });
    case 'Heart':
      return React.createElement(Heart, { className });
    case 'TrendingUp':
      return React.createElement(TrendingUp, { className });
    case 'Layers':
    default:
      return React.createElement(Layers, { className });
  }
}

/**
 * Universal & Robust Category Matching Function
 * Perfectly checks product against selected filter regardless of English/Persian keys or minor typos
 */
export function isCategoryMatch(
  product: {
    category?: string;
    categoryKey?: string;
    title?: string;
    brand?: string;
    description?: string;
    [key: string]: any;
  },
  selectedCategory: string,
  categoriesList?: WarehouseCategory[]
): boolean {
  if (!selectedCategory || selectedCategory === 'all' || selectedCategory === 'همه' || selectedCategory === 'all_products') {
    return true;
  }

  const selCanonical = getCanonicalCategoryKey(selectedCategory);
  if (selCanonical === 'all') return true;

  // 1. Check direct match on product.categoryKey
  if (product.categoryKey) {
    const prodKeyCanonical = getCanonicalCategoryKey(product.categoryKey);
    if (prodKeyCanonical === selCanonical) return true;
  }

  // 2. Check canonical match on product.category
  if (product.category) {
    const prodCatCanonical = getCanonicalCategoryKey(product.category);
    if (prodCatCanonical === selCanonical) return true;
    if (normalizeCategoryText(product.category) === normalizeCategoryText(selectedCategory)) return true;
  }

  // 3. Check against categoriesList definitions
  if (categoriesList && categoriesList.length > 0) {
    const matchedCategoryObj = categoriesList.find(
      (c) =>
        c.id === selectedCategory ||
        c.filterKey === selectedCategory ||
        getCanonicalCategoryKey(c.filterKey) === selCanonical ||
        getCanonicalCategoryKey(c.id) === selCanonical ||
        getCanonicalCategoryKey(c.label) === selCanonical
    );

    if (matchedCategoryObj) {
      const objKeyCanonical = getCanonicalCategoryKey(matchedCategoryObj.filterKey || matchedCategoryObj.id || matchedCategoryObj.label);
      if (product.category && getCanonicalCategoryKey(product.category) === objKeyCanonical) {
        return true;
      }
      if (product.categoryKey && getCanonicalCategoryKey(product.categoryKey) === objKeyCanonical) {
        return true;
      }
      if (product.category && normalizeCategoryText(product.category).includes(normalizeCategoryText(matchedCategoryObj.label))) {
        return true;
      }
    }
  }

  // 4. Semantic title / description fallback matching for primary supplements
  const cleanTitle = normalizeCategoryText(product.title);
  const cleanDesc = normalizeCategoryText(product.description);
  const cleanBrand = normalizeCategoryText(product.brand);
  const combinedText = `${cleanTitle} ${cleanDesc} ${cleanBrand}`;

  switch (selCanonical) {
    case 'protein':
      return (
        combinedText.includes('پروتئین') ||
        combinedText.includes('پروتین') ||
        combinedText.includes('وی') ||
        combinedText.includes('ایزوله') ||
        combinedText.includes('کازئین') ||
        combinedText.includes('protein') ||
        combinedText.includes('whey') ||
        combinedText.includes('isolate') ||
        combinedText.includes('casein')
      );
    case 'creatine':
      return (
        combinedText.includes('کراتین') ||
        combinedText.includes('منوهیدرات') ||
        combinedText.includes('creatine') ||
        combinedText.includes('monohydrate')
      );
    case 'vitamin':
      return (
        combinedText.includes('ویتامین') ||
        combinedText.includes('مولتی') ||
        combinedText.includes('vitamin') ||
        combinedText.includes('daily') ||
        combinedText.includes('zinc') ||
        combinedText.includes('زینک') ||
        combinedText.includes('d3')
      );
    case 'omega':
      return (
        combinedText.includes('امگا') ||
        combinedText.includes('روغن ماهی') ||
        combinedText.includes('omega') ||
        combinedText.includes('fish oil')
      );
    case 'pre':
      return (
        combinedText.includes('قبل تمرین') ||
        combinedText.includes('پمپ') ||
        combinedText.includes('انرژی') ||
        combinedText.includes('pre') ||
        combinedText.includes('pump') ||
        combinedText.includes('c4')
      );
    case 'hot':
      return product.isPopular === true || product.isPopularSample === true || combinedText.includes('پرفروش');
    case 'amino':
      return (
        combinedText.includes('آمینو') ||
        combinedText.includes('بی سی ای') ||
        combinedText.includes('گلوتامین') ||
        combinedText.includes('amino') ||
        combinedText.includes('bcaa') ||
        combinedText.includes('eaa') ||
        combinedText.includes('glutamine')
      );
    case 'gainer':
      return (
        combinedText.includes('گینر') ||
        combinedText.includes('کربو') ||
        combinedText.includes('gainer') ||
        combinedText.includes('mass')
      );
    case 'fatburner':
      return (
        combinedText.includes('چربی') ||
        combinedText.includes('لاغری') ||
        combinedText.includes('carnitine') ||
        combinedText.includes('کارنیتین') ||
        combinedText.includes('fat') ||
        combinedText.includes('cla')
      );
    default:
      return (
        combinedText.includes(normalizeCategoryText(selectedCategory)) ||
        (product.category && normalizeCategoryText(product.category).includes(normalizeCategoryText(selectedCategory)))
      );
  }
}
