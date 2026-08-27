export interface PresetFlavor {
  id: string;
  name: string;
  nameEn: string;
}

export interface PresetSize {
  id: string;
  label: string;
  weightKg: number;
  unit: 'lbs' | 'kg' | 'servings' | 'sachets' | 'caps';
}

/**
 * Standard & Compound Supplement Flavor Presets (Bilingual Chips)
 */
export const PRESET_FLAVORS: PresetFlavor[] = [
  // Single Flavors
  { id: 'chocolate', name: 'شکلات (Chocolate)', nameEn: 'Chocolate' },
  { id: 'vanilla', name: 'وانیل (Vanilla)', nameEn: 'Vanilla' },
  { id: 'strawberry', name: 'توت‌فرنگی (Strawberry)', nameEn: 'Strawberry' },
  { id: 'banana', name: 'موز (Banana)', nameEn: 'Banana' },
  { id: 'unflavored', name: 'بدون طعم (Unflavored)', nameEn: 'Unflavored' },

  // Compound / Dual Flavors
  { id: 'milk_chocolate', name: 'شکلات شیری (Milk Chocolate)', nameEn: 'Milk Chocolate' },
  { id: 'vanilla_cream', name: 'وانیل کرم (Vanilla Cream)', nameEn: 'Vanilla Cream' },
  { id: 'cookies_cream', name: 'کوکیز و کرم (Cookies & Cream)', nameEn: 'Cookies & Cream' },
  { id: 'choc_peanut_butter', name: 'شکلات کره بادام زمینی (Chocolate Peanut Butter)', nameEn: 'Chocolate Peanut Butter' },
  { id: 'salted_caramel', name: 'کارامل نمکی (Salted Caramel)', nameEn: 'Salted Caramel' },
  { id: 'blue_raspberry', name: 'تمشک آبی / بلوبری (Blue Raspberry)', nameEn: 'Blue Raspberry' },
  { id: 'watermelon', name: 'هندوانه (Watermelon)', nameEn: 'Watermelon' },
  { id: 'fruit_punch', name: 'پانچ میوه‌ای (Fruit Punch)', nameEn: 'Fruit Punch' },
  { id: 'coffee', name: 'قهوه / کاپوچینو (Coffee)', nameEn: 'Coffee' }
];

/**
 * Comprehensive Supplement Size & Weight Presets
 */
export const PRESET_SIZES: PresetSize[] = [
  // Imperial (Pounds)
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
  { id: '30servings', label: '30 سروینگ (30 Servings)', weightKg: 0.3, unit: 'servings' },
  { id: '60servings', label: '60 سروینگ (60 Servings)', weightKg: 0.6, unit: 'servings' },
  { id: '60caps', label: '60 کپسول / قرص', weightKg: 0.25, unit: 'caps' },
  { id: '120caps', label: '120 کپسول / قرص', weightKg: 0.4, unit: 'caps' },
  { id: '30sachets', label: '30 ساشه (Sachets)', weightKg: 0.5, unit: 'sachets' }
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
  '30 سروینگ (30 Servings)',
  '60 سروینگ (60 Servings)',
  '60 کپسول / قرص',
  '120 کپسول / قرص',
  '30 ساشه (Sachets)'
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
  if (sizeLabel.includes('60 سروینگ') || sizeLabel.includes('60 Servings')) return 0.6;
  if (sizeLabel.includes('30 سروینگ') || sizeLabel.includes('30 Servings')) return 0.3;
  if (sizeLabel.includes('60')) return 0.25;
  if (sizeLabel.includes('120')) return 0.4;
  return 0.8;
}

export function convertLbsToKg(lbs: number): number {
  return Number((lbs * 0.453592).toFixed(2));
}

export default {
  PRESET_FLAVORS,
  PRESET_SIZES,
  STANDARD_SIZE_OPTIONS,
  getWeightKgFromSize,
  convertLbsToKg
};
