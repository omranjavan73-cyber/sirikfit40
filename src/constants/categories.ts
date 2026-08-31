/**
 * SirikFit Category & Taxonomy Constants
 * Resilient Locale-Agnostic Matching & Normalization Engine
 */

export interface CategoryDefinition {
  id: string;
  name: string;
  slug: string;
  order: number;
  aliases: string[];
  subCategories: Array<{
    id: string;
    name: string;
    slug: string;
    keywords: string[];
    aliases?: string[];
  }>;
}

/**
 * Normalizes Persian and English text by removing zero-width characters,
 * unifying Arabic/Persian letter variants (ي -> ی, ك -> ک), trimming, and lowercasing.
 */
export const normalizeCategoryString = (str: string | null | undefined): string => {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u200c]/g, '') // Remove zero-width non-joiners & half-spaces
    .replace(/\s+/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه');
};

/**
 * Master category taxonomy mapping with multilingual aliases and slug variants
 */
export const CATEGORY_MAP: Record<string, string[]> = {
  sports_nutrition: [
    'sports_nutrition',
    'sports-nutrition',
    'sports nutrition',
    'supplements',
    'مکملهای ورزشی',
    'مکمل های ورزشی',
    'مکمل‌های ورزشی',
    'مکمل ورزشی',
    'مكملات',
    'مكملات رياضية'
  ],
  vitamins: [
    'vitamins',
    'vitamin',
    'ویتامینها',
    'ویتامین ها',
    'ویتامین‌ها',
    'ویتامین',
    'مولتی ویتامین',
    'multivitamin',
    'فيتامينات'
  ],
  minerals: [
    'minerals',
    'mineral',
    'مواد معدنی',
    'موادمعدنی',
    'معدنی',
    'معادن'
  ],
  healthy_food: [
    'healthy_food',
    'healthy-food',
    'healthy food',
    'تغذیه سالم',
    'تغذیهسالم',
    'تغذیه',
    'غذای سالم',
    'اغذية صحية'
  ],
  health_concerns: [
    'health_concerns',
    'health-concerns',
    'health concerns',
    'دغدغههای سلامتی',
    'دغدغه های سلامتی',
    'دغدغه‌های سلامتی',
    'سلامتی',
    'سلامت'
  ]
};

/**
 * Check if a product category matches the selected category filter
 * Handles Persian titles, English slugs, aliases, and substring matches seamlessly.
 */
export const isMatchCategory = (productCategory: string | null | undefined, selected: string | null | undefined): boolean => {
  if (!selected || selected === 'all' || selected === 'همه' || selected === 'همه موارد') {
    return true;
  }
  const normSelected = normalizeCategoryString(selected);
  if (!normSelected || normSelected === 'all' || normSelected === 'همه' || normSelected === 'همهموارد') {
    return true;
  }

  const normProduct = normalizeCategoryString(productCategory);
  if (!normProduct) return false;

  if (normSelected === normProduct) return true;

  // Direct alias map inspection
  for (const [key, aliases] of Object.entries(CATEGORY_MAP)) {
    const normKey = normalizeCategoryString(key);
    const normAliases = aliases.map(normalizeCategoryString);

    const selectedMatchesKey = normSelected === normKey || normAliases.includes(normSelected);
    const productMatchesKey = normProduct === normKey || normAliases.includes(normProduct);

    if (selectedMatchesKey && productMatchesKey) {
      return true;
    }
  }

  // Cross-contained fuzzy match
  if (normProduct.includes(normSelected) || normSelected.includes(normProduct)) {
    return true;
  }

  return false;
};

/**
 * Check if a product subcategory or product text matches the selected subcategory filter
 */
export const isMatchSubCategory = (
  product: any,
  selectedSubCatId: string | null | undefined,
  keywords: string[] = []
): boolean => {
  if (!selectedSubCatId || selectedSubCatId === 'all' || selectedSubCatId === 'همه' || selectedSubCatId === 'همه موارد') {
    return true;
  }

  const normSelected = normalizeCategoryString(selectedSubCatId);
  const normSub = normalizeCategoryString(product?.subCategory || product?.subcategory || product?.subCategoryKey);
  if (normSub && (normSub === normSelected || normSub.includes(normSelected) || normSelected.includes(normSub))) {
    return true;
  }

  const searchableText = normalizeCategoryString(
    `${product?.title || ''} ${product?.englishTitle || ''} ${product?.category || ''} ${product?.description || ''}`
  );

  if (searchableText.includes(normSelected)) {
    return true;
  }

  if (Array.isArray(keywords) && keywords.length > 0) {
    const hasKeyword = keywords.some(kw => {
      const normKw = normalizeCategoryString(kw);
      return normKw && searchableText.includes(normKw);
    });
    if (hasKeyword) return true;
  }

  return false;
};
