import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface TaxonomySubCategory {
  id: string;
  name: string;
  slug: string;
  keywords?: string[];
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  subCategories: TaxonomySubCategory[];
}

export const DEFAULT_TAXONOMY: TaxonomyCategory[] = [
  {
    id: 'sports_nutrition',
    name: 'مکمل‌های ورزشی',
    slug: 'sports-nutrition',
    order: 1,
    subCategories: [
      { id: 'all', name: 'همه موارد', slug: 'all', keywords: [] },
      { id: 'whey', name: 'پروتئین وی', slug: 'whey', keywords: ['whey', 'وی', 'isolate', 'ایزوله', 'casein', 'کازئین', 'gold standard'] },
      { id: 'creatine', name: 'کراتین', slug: 'creatine', keywords: ['creatine', 'کراتین', 'monohydrate'] },
      { id: 'gainer', name: 'گینر افزایش وزن', slug: 'gainer', keywords: ['gainer', 'گینر', 'mass', 'مس', 'وزن', 'کالری'] },
      { id: 'amino_bcaa', name: 'آمینو اسید و BCAA', slug: 'amino-bcaa', keywords: ['amino', 'آمینو', 'bcaa', 'بی سی ای ای', 'eaa', 'glutamine', 'گلوتامین'] },
      { id: 'pre_workout', name: 'پمپ و قبل تمرین', slug: 'pre-workout', keywords: ['pre-workout', 'preworkout', 'pump', 'پمپ', 'قبل تمرین', 'c4', 'کافئین'] },
      { id: 'accessories', name: 'شیکر و قمقمه', slug: 'accessories', keywords: ['shaker', 'شیکر', 'قمقمه', 'bottle', 'shake'] }
    ]
  },
  {
    id: 'vitamins',
    name: 'ویتامین‌ها',
    slug: 'vitamins',
    order: 2,
    subCategories: [
      { id: 'all', name: 'همه موارد', slug: 'all', keywords: [] },
      { id: 'vit_c', name: 'ویتامین C', slug: 'vitamin-c', keywords: ['vitamin c', 'ویتامین c', 'ویتامین سی', 'vit c', 'ascorbic'] },
      { id: 'vit_d', name: 'ویتامین D', slug: 'vitamin-d', keywords: ['vitamin d', 'ویتامین d', 'ویتامین دی', 'vit d', 'd3'] },
      { id: 'vit_b', name: 'ویتامین‌های گروه B', slug: 'vitamin-b', keywords: ['vitamin b', 'ویتامین b', 'ب کمپلکس', 'b complex', 'b12', 'biotin', 'بیوتین'] },
      { id: 'multivitamin', name: 'مولتی ویتامین', slug: 'multivitamin', keywords: ['multi', 'مولتی', 'one daily', 'دیلی', 'multivitamin'] },
      { id: 'vit_e', name: 'ویتامین E', slug: 'vitamin-e', keywords: ['vitamin e', 'ویتامین e', 'ویتامین ای'] },
      { id: 'vit_a', name: 'ویتامین A', slug: 'vitamin-a', keywords: ['vitamin a', 'ویتامین a', 'ویتامین آ'] }
    ]
  },
  {
    id: 'minerals',
    name: 'مواد معدنی',
    slug: 'minerals',
    order: 3,
    subCategories: [
      { id: 'all', name: 'همه موارد', slug: 'all', keywords: [] },
      { id: 'zinc', name: 'زینک (Zinc)', slug: 'zinc', keywords: ['zinc', 'زینک', 'روی'] },
      { id: 'magnesium', name: 'منیزیم', slug: 'magnesium', keywords: ['magnesium', 'منیزیم', 'منیزم'] },
      { id: 'iron', name: 'آهن', slug: 'iron', keywords: ['iron', 'آهن', 'فولیک'] },
      { id: 'calcium', name: 'کلسیم', slug: 'calcium', keywords: ['calcium', 'کلسیم'] },
      { id: 'selenium', name: 'سلنیوم', slug: 'selenium', keywords: ['selenium', 'سلنیوم'] },
      { id: 'chromium', name: 'کرومیوم', slug: 'chromium', keywords: ['chromium', 'کرومیوم', 'کروم'] }
    ]
  },
  {
    id: 'healthy_food',
    name: 'تغذیه سالم',
    slug: 'healthy-food',
    order: 4,
    subCategories: [
      { id: 'all', name: 'همه موارد', slug: 'all', keywords: [] },
      { id: 'peanut_butter', name: 'کره بادام زمینی', slug: 'peanut-butter', keywords: ['peanut', 'بادام زمینی', 'کره'] },
      { id: 'protein_bar', name: 'پروتئین بار', slug: 'protein-bar', keywords: ['bar', 'بار', 'شکلات پروتئینی'] },
      { id: 'oats', name: 'جودوسر', slug: 'oats', keywords: ['oat', 'oats', 'جو دوسر', 'جودوسر', 'گرانولا'] },
      { id: 'healthy_oils', name: 'روغن زیتون و نارگیل', slug: 'healthy-oils', keywords: ['oil', 'coconut', 'olive', 'روغن', 'زیتون', 'نارگیل'] }
    ]
  },
  {
    id: 'health_concerns',
    name: 'دغدغه‌های سلامتی',
    slug: 'health-concerns',
    order: 5,
    subCategories: [
      { id: 'all', name: 'همه موارد', slug: 'all', keywords: [] },
      { id: 'joints', name: 'سلامت مفاصل', slug: 'joints', keywords: ['joint', 'مفاصل', 'غضروف', 'کلاژن', 'collagen', 'glucosamine'] },
      { id: 'immune', name: 'تقویت سیستم ایمنی', slug: 'immune', keywords: ['immune', 'ایمنی', 'defense', 'propolis', 'echinacea'] },
      { id: 'weight_loss', name: 'کاهش وزن', slug: 'weight-loss', keywords: ['fat burn', 'چربی سوز', 'carnitine', 'کارنیتین', 'cla', 'سی ال ای', 'لاغری', 'diet'] },
      { id: 'hair_skin', name: 'سلامت پوست و مو', slug: 'hair-skin', keywords: ['skin', 'hair', 'nail', 'پوست', 'مو', 'ناخن', 'biotin', 'کلاژن'] }
    ]
  }
];

// Compatibility alias
export const STORE_TAXONOMY = DEFAULT_TAXONOMY.map(c => ({
  id: c.id,
  name: c.name,
  label: c.name,
  englishLabel: c.slug,
  slug: c.slug,
  subCategories: c.subCategories.map(s => ({
    id: s.id,
    name: s.name,
    label: s.name,
    keywords: s.keywords || []
  }))
}));

export async function fetchTaxonomyFromFirestore(): Promise<TaxonomyCategory[]> {
  try {
    if (!db) return DEFAULT_TAXONOMY;
    const docRef = doc(db, 'settings', 'taxonomy');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        return data.categories;
      }
    }
  } catch (err) {
    console.warn('Error fetching taxonomy from Firestore:', err);
  }
  return DEFAULT_TAXONOMY;
}

export async function saveTaxonomyToFirestore(categories: TaxonomyCategory[]): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'settings', 'taxonomy');
  await setDoc(docRef, {
    categories,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export function getMainCategoryById(id: string, taxonomyList: any[] = DEFAULT_TAXONOMY): any {
  if (!id) return undefined;
  const list = Array.isArray(taxonomyList) && taxonomyList.length > 0 ? taxonomyList : DEFAULT_TAXONOMY;
  return list.find((c: any) => 
    c.id === id || 
    c.name === id || 
    c.label === id || 
    c.slug === id ||
    c.englishLabel === id
  );
}

// 🟢 [GOLD STANDARD] Safe helper to retrieve subcategories whether stored as objects { id, name } or string arrays
export const getSubcategoriesForMain = (mainCatNameOrSlug: string, taxonomyList: any[] = DEFAULT_TAXONOMY): string[] => {
  if (!mainCatNameOrSlug) return ['همه موارد'];
  const list = Array.isArray(taxonomyList) && taxonomyList.length > 0 ? taxonomyList : DEFAULT_TAXONOMY;
  const found = list.find((c: any) => 
    c.name === mainCatNameOrSlug || 
    c.label === mainCatNameOrSlug || 
    c.slug === mainCatNameOrSlug || 
    c.id === mainCatNameOrSlug ||
    c.englishLabel === mainCatNameOrSlug
  );
  if (!found || !found.subCategories) return ['همه موارد'];
  
  const subList = found.subCategories.map((sub: any) => 
    typeof sub === 'string' ? sub : (sub.name || sub.label || sub.title || '')
  ).filter((s: string) => Boolean(s));

  if (!subList.includes('همه موارد')) {
    subList.unshift('همه موارد');
  }
  return subList;
};

export function matchProductTaxonomy(
  product: any,
  selectedMainCatId: string,
  selectedSubCatId: string,
  searchQuery: string = '',
  taxonomyList: TaxonomyCategory[] = DEFAULT_TAXONOMY
): boolean {
  if (!product) return false;

  const q = (searchQuery || '').trim().toLowerCase();
  const title = (product.title || '').toLowerCase();
  const cat = (product.category || product.categoryKey || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const brand = (product.brand || product.storeName || '').toLowerCase();

  // 1. Text Search Filter
  if (q) {
    const matchesSearch = title.includes(q) || cat.includes(q) || desc.includes(q) || brand.includes(q);
    if (!matchesSearch) return false;
  }

  // 2. Main Category Filter
  if (selectedMainCatId && selectedMainCatId !== 'all') {
    const mainConfig = getMainCategoryById(selectedMainCatId, taxonomyList);
    if (mainConfig) {
      const mainName = mainConfig.name || mainConfig.label;
      if (product.mainCategory) {
        if (
          product.mainCategory !== selectedMainCatId && 
          product.mainCategory !== mainName &&
          product.mainCategory !== mainConfig.id &&
          product.mainCategory !== mainConfig.slug
        ) {
          return false;
        }
      } else {
        const subCats = mainConfig.subCategories || [];
        const allKeywords = subCats.flatMap((s: any) => s.keywords || []);
        const hasKeywordMatch = allKeywords.some((kw: string) => 
          title.includes(kw) || cat.includes(kw) || desc.includes(kw)
        );
        const labelMatch = title.includes(mainName) || cat.includes(mainName);

        if (!hasKeywordMatch && !labelMatch) {
          if ((selectedMainCatId === 'sports_nutrition' || mainName === 'مکمل‌های ورزشی') && (cat.includes('ورزشی') || cat.includes('sport') || cat.includes('وی') || cat.includes('پروتئین') || cat.includes('protein'))) {
            // match
          } else if ((selectedMainCatId === 'vitamins' || mainName === 'ویتامین‌ها') && (cat.includes('ویتامین') || cat.includes('vitamin'))) {
            // match
          } else if ((selectedMainCatId === 'minerals' || mainName === 'مواد معدنی') && (cat.includes('معدنی') || cat.includes('mineral'))) {
            // match
          } else if ((selectedMainCatId === 'healthy_food' || mainName === 'تغذیه سالم') && (cat.includes('تغذیه') || cat.includes('food') || cat.includes('diet'))) {
            // match
          } else if ((selectedMainCatId === 'health_concerns' || mainName === 'دغدغه‌های سلامتی') && (cat.includes('سلامت') || cat.includes('health'))) {
            // match
          } else {
            return false;
          }
        }
      }
    }
  }

  // 3. Sub Category Filter
  if (selectedSubCatId && selectedSubCatId !== 'all' && selectedSubCatId !== 'همه موارد') {
    if (product.subCategory) {
      if (product.subCategory === selectedSubCatId) return true;
    }

    const mainConfig = getMainCategoryById(selectedMainCatId, taxonomyList);
    const subConfig = (mainConfig?.subCategories || []).find((s: any) => 
      s.id === selectedSubCatId || s.name === selectedSubCatId || s.label === selectedSubCatId || s.slug === selectedSubCatId
    );
    if (subConfig && subConfig.keywords && subConfig.keywords.length > 0) {
      const matchesSub = subConfig.keywords.some((kw: string) => 
        title.includes(kw) || cat.includes(kw) || desc.includes(kw)
      );
      if (!matchesSub) return false;
    }
  }

  return true;
}
