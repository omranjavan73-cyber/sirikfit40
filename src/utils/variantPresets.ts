export interface PresetFlavor {
  id: string;
  name: string;
  nameEn: string;
  aliases?: string[];
}

export interface PresetSize {
  id: string;
  label: string;
  weightKg: number;
  unit: 'lbs' | 'kg' | 'servings' | 'sachets' | 'caps';
}

/**
 * Standard & Compound Supplement Flavor Presets (Bilingual Chips)
 * Prioritizes standard single & popular compound flavors
 */
export const PRESET_FLAVORS: PresetFlavor[] = [
  // Compound & Popular Dual Flavors
  {
    id: 'milk_chocolate',
    name: 'شکلات شیری (Milk Chocolate)',
    nameEn: 'Milk Chocolate',
    aliases: ['chocolate', 'milk choc', 'شکلات', 'شکلاتی', 'شیری', 'شک']
  },
  {
    id: 'chocolate',
    name: 'شکلات (Chocolate)',
    nameEn: 'Chocolate',
    aliases: ['chocolate', 'choc', 'cocoa', 'شکلات', 'کاکائو', 'شک']
  },
  {
    id: 'vanilla_cream',
    name: 'وانیل کرم (Vanilla Cream)',
    nameEn: 'Vanilla Cream',
    aliases: ['vanilla cream', 'vanilla', 'cream', 'وانیل', 'کرم', 'وان']
  },
  {
    id: 'vanilla',
    name: 'وانیل (Vanilla)',
    nameEn: 'Vanilla',
    aliases: ['vanilla', 'van', 'وانیل', 'وان']
  },
  {
    id: 'cookies_cream',
    name: 'کوکیز و کرم (Cookies & Cream)',
    nameEn: 'Cookies & Cream',
    aliases: ['cookies & cream', 'cookies and cream', 'cookie', 'oreo', 'کوکیز', 'کوکی', 'کرم', 'کوک']
  },
  {
    id: 'choc_peanut_butter',
    name: 'شکلات کره بادام زمینی (Chocolate Peanut Butter)',
    nameEn: 'Chocolate Peanut Butter',
    aliases: ['chocolate peanut butter', 'peanut butter', 'pb', 'بادام زمینی', 'کره بادام زمینی', 'پینات']
  },
  {
    id: 'salted_caramel',
    name: 'کارامل نمکی (Salted Caramel)',
    nameEn: 'Salted Caramel',
    aliases: ['salted caramel', 'caramel', 'کارامل', 'کارامل نمکی']
  },
  {
    id: 'strawberry',
    name: 'توت‌فرنگی (Strawberry)',
    nameEn: 'Strawberry',
    aliases: ['strawberry', 'straw', 'berry', 'توت فرنگی', 'توت‌فرنگی', 'توت']
  },
  {
    id: 'blue_raspberry',
    name: 'تمشک آبی / بلوبری (Blue Raspberry)',
    nameEn: 'Blue Raspberry',
    aliases: ['blue raspberry', 'blueberry', 'blue rasp', 'بلوبری', 'تمشک', 'تمشک آبی']
  },
  {
    id: 'banana',
    name: 'موز (Banana)',
    nameEn: 'Banana',
    aliases: ['banana', 'ban', 'موز', 'موزی']
  },
  {
    id: 'watermelon',
    name: 'هندوانه (Watermelon)',
    nameEn: 'Watermelon',
    aliases: ['watermelon', 'melon', 'هندوانه', 'هندونه']
  },
  {
    id: 'fruit_punch',
    name: 'پانچ میوه‌ای (Fruit Punch)',
    nameEn: 'Fruit Punch',
    aliases: ['fruit punch', 'punch', 'پانچ', 'میوه', 'پانچ میوه ای']
  },
  {
    id: 'coffee',
    name: 'قهوه / کاپوچینو (Coffee)',
    nameEn: 'Coffee',
    aliases: ['coffee', 'cappuccino', 'cafe', 'قهوه', 'کاپوچینو', 'نسکافه']
  },
  {
    id: 'unflavored',
    name: 'بدون طعم (Unflavored)',
    nameEn: 'Unflavored',
    aliases: ['unflavored', 'plain', 'natural', 'بی طعم', 'بدون طعم', 'ساده', 'خام']
  }
];

/**
 * Extended Bilingual Flavor Dictionary for Autocomplete Engine
 */
export const BILINGUAL_FLAVOR_DICTIONARY: PresetFlavor[] = [
  ...PRESET_FLAVORS,
  {
    id: 'double_rich_chocolate',
    name: 'شکلات دابل ریچ (Double Rich Chocolate)',
    nameEn: 'Double Rich Chocolate',
    aliases: ['double chocolate', 'rich chocolate', 'دابل شکلات', 'شکلات غلیظ']
  },
  {
    id: 'extreme_milk_chocolate',
    name: 'اکستریم میلک چاکلت (Extreme Milk Chocolate)',
    nameEn: 'Extreme Milk Chocolate',
    aliases: ['extreme chocolate', 'اکستریم']
  },
  {
    id: 'french_vanilla',
    name: 'وانیل فرانسوی (French Vanilla)',
    nameEn: 'French Vanilla',
    aliases: ['french vanilla', 'وانیل فرانسوی']
  },
  {
    id: 'strawberry_banana',
    name: 'توت‌فرنگی موز (Strawberry Banana)',
    nameEn: 'Strawberry Banana',
    aliases: ['strawberry banana', 'موز توت فرنگی', 'توت فرنگی موزی']
  },
  {
    id: 'green_apple',
    name: 'سیب ترش (Green Apple)',
    nameEn: 'Green Apple',
    aliases: ['green apple', 'apple', 'سیب', 'سیب ترش', 'سیب سبز']
  },
  {
    id: 'mango',
    name: 'انبه (Mango)',
    nameEn: 'Mango',
    aliases: ['mango', 'انبه']
  },
  {
    id: 'peach_mango',
    name: 'هلو انبه (Peach Mango)',
    nameEn: 'Peach Mango',
    aliases: ['peach mango', 'peach', 'هلو', 'هلو انبه']
  },
  {
    id: 'lemon_lime',
    name: 'لیمو و لایم (Lemon Lime)',
    nameEn: 'Lemon Lime',
    aliases: ['lemon', 'lime', 'lemon lime', 'لیمو', 'لیمو نعناع']
  },
  {
    id: 'orange_citrus',
    name: 'پرتقال (Orange)',
    nameEn: 'Orange',
    aliases: ['orange', 'citrus', 'پرتقال', 'پرتقالی']
  },
  {
    id: 'cherry',
    name: 'گیلاس / آلبالو (Cherry)',
    nameEn: 'Cherry',
    aliases: ['cherry', 'گیلاس', 'آلبالو']
  },
  {
    id: 'coconut',
    name: 'نارگیل (Coconut)',
    nameEn: 'Coconut',
    aliases: ['coconut', 'نارگیل', 'کوکونات']
  },
  {
    id: 'mint_chocolate',
    name: 'شکلات نعناع (Mint Chocolate)',
    nameEn: 'Mint Chocolate',
    aliases: ['mint chocolate', 'نعناع', 'شکلات نعنایی']
  },
  {
    id: 'mojito',
    name: 'موهیتو (Mojito)',
    nameEn: 'Mojito',
    aliases: ['mojito', 'موهیتو', 'لیمو نعنا']
  }
];

/**
 * Intelligent Bilingual Flavor Autocomplete Search Engine
 * Matches Persian substrings, English substrings, and transliterations.
 */
export function getFlavorAutocompleteSuggestions(query: string, limit: number = 8): PresetFlavor[] {
  if (!query || !query.trim()) return [];
  const normalizedQuery = query
    .trim()
    .toLowerCase()
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/\u200c/g, ' '); // normalize half-space

  return BILINGUAL_FLAVOR_DICTIONARY.filter(f => {
    const normName = f.name.toLowerCase().replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک').replace(/\u200c/g, ' ');
    const normEn = f.nameEn.toLowerCase();
    
    if (normName.includes(normalizedQuery) || normEn.includes(normalizedQuery)) {
      return true;
    }

    if (f.aliases && f.aliases.some(alias => {
      const normAlias = alias.toLowerCase().replace(/[ي]/g, 'ی').replace(/[ك]/g, 'ک').replace(/\u200c/g, ' ');
      return normAlias.includes(normalizedQuery) || normalizedQuery.includes(normAlias);
    })) {
      return true;
    }

    return false;
  }).slice(0, limit);
}

/**
 * Comprehensive Supplement Size & Weight Presets
 * Prioritized Imperial (Pounds) at top, followed by Metric and Servings/Caps
 */
export const PRESET_SIZES: PresetSize[] = [
  // Prioritized Imperial (Pounds)
  { id: '1lb', label: '1 lb (0.45 kg)', weightKg: 0.45, unit: 'lbs' },
  { id: '2lb', label: '2 lb (0.90 kg)', weightKg: 0.90, unit: 'lbs' },
  { id: '3lb', label: '3 lb (1.36 kg)', weightKg: 1.36, unit: 'lbs' },
  { id: '4lb', label: '4 lb (1.81 kg)', weightKg: 1.81, unit: 'lbs' },
  { id: '5lb', label: '5 lb (2.27 kg)', weightKg: 2.27, unit: 'lbs' },
  { id: '6lb', label: '6 lb (2.72 kg)', weightKg: 2.72, unit: 'lbs' },
  { id: '10lb', label: '10 lb (4.54 kg)', weightKg: 4.54, unit: 'lbs' },

  // Metric (Kilograms)
  { id: '1kg', label: '1 kg', weightKg: 1.0, unit: 'kg' },
  { id: '2kg', label: '2 kg', weightKg: 2.0, unit: 'kg' },
  { id: '2.45kg', label: '2.45 kg', weightKg: 2.45, unit: 'kg' },
  { id: '3kg', label: '3 kg', weightKg: 3.0, unit: 'kg' },
  { id: '5kg', label: '5 kg', weightKg: 5.0, unit: 'kg' },

  // Servings & Capsules
  { id: '30servings', label: '30 Servings', weightKg: 0.3, unit: 'servings' },
  { id: '60servings', label: '60 Servings', weightKg: 0.6, unit: 'servings' },
  { id: '60caps', label: '60 قرص / کپسول', weightKg: 0.25, unit: 'caps' },
  { id: '120caps', label: '120 قرص / کپسول', weightKg: 0.4, unit: 'caps' },
  { id: '30sachets', label: '30 ساشه (Sachets)', weightKg: 0.5, unit: 'sachets' },
  { id: '60sachets', label: '60 ساشه (Sachets)', weightKg: 0.8, unit: 'sachets' },
  { id: '90servings', label: '90 Servings', weightKg: 0.9, unit: 'servings' },
  { id: '120servings', label: '120 Servings', weightKg: 1.2, unit: 'servings' },
  { id: '180caps', label: '180 کپسول (Capsules)', weightKg: 0.5, unit: 'caps' },
  { id: '240tablets', label: '240 قرص (Tablets)', weightKg: 0.6, unit: 'caps' }
];

export const STANDARD_SIZE_OPTIONS: string[] = [
  '1 lb (0.45 kg)',
  '2 lb (0.90 kg)',
  '3 lb (1.36 kg)',
  '4 lb (1.81 kg)',
  '5 lb (2.27 kg)',
  '6 lb (2.72 kg)',
  '10 lb (4.54 kg)',
  '1 kg',
  '2 kg',
  '2.45 kg',
  '3 kg',
  '5 kg',
  '30 Servings',
  '60 Servings',
  '60 قرص / کپسول',
  '120 قرص / کپسول',
  '30 ساشه (Sachets)',
  '60 ساشه (Sachets)',
  '90 Servings',
  '120 Servings',
  '180 کپسول (Capsules)',
  '240 قرص (Tablets)'
];

export function getWeightKgFromSize(sizeLabel: string): number {
  if (!sizeLabel) return 0.8;
  const matchLbs = sizeLabel.match(/([\d.]+)\s*lbs?/i);
  if (matchLbs) {
    return Number((parseFloat(matchLbs[1]) * 0.453592).toFixed(2));
  }
  const matchKg = sizeLabel.match(/([\d.]+)\s*kg/i);
  if (matchKg) {
    return parseFloat(matchKg[1]);
  }
  const matchGm = sizeLabel.match(/([\d.]+)\s*gm?/i);
  if (matchGm) {
    return Number((parseFloat(matchGm[1]) / 1000).toFixed(2));
  }
  if (sizeLabel.includes('30 ساشه') || sizeLabel.includes('30 sachets')) return 0.5;
  if (sizeLabel.includes('60 ساشه') || sizeLabel.includes('60 sachets')) return 0.8;
  if (sizeLabel.includes('120 Servings') || sizeLabel.includes('120 سروینگ')) return 1.2;
  if (sizeLabel.includes('90 Servings') || sizeLabel.includes('90 سروینگ')) return 0.9;
  if (sizeLabel.includes('60 Servings') || sizeLabel.includes('60 سروینگ')) return 0.6;
  if (sizeLabel.includes('30 Servings') || sizeLabel.includes('30 سروینگ')) return 0.3;
  if (sizeLabel.includes('240')) return 0.6;
  if (sizeLabel.includes('180')) return 0.5;
  if (sizeLabel.includes('120')) return 0.4;
  if (sizeLabel.includes('60')) return 0.25;
  return 0.8;
}

export function convertLbsToKg(lbs: number): number {
  return Number((lbs * 0.453592).toFixed(2));
}

export default {
  PRESET_FLAVORS,
  BILINGUAL_FLAVOR_DICTIONARY,
  getFlavorAutocompleteSuggestions,
  PRESET_SIZES,
  STANDARD_SIZE_OPTIONS,
  getWeightKgFromSize,
  convertLbsToKg
};
