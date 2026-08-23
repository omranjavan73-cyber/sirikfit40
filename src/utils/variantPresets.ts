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

export const PRESET_FLAVORS: PresetFlavor[] = [
  { id: 'unflavored', name: 'بدون طعم (Unflavored)', nameEn: 'Unflavored' },
  { id: 'chocolate', name: 'شکلات (Chocolate)', nameEn: 'Chocolate' },
  { id: 'vanilla', name: 'وانیل (Vanilla)', nameEn: 'Vanilla' },
  { id: 'banana', name: 'موز (Banana)', nameEn: 'Banana' },
  { id: 'strawberry', name: 'توت‌فرنگی (Strawberry)', nameEn: 'Strawberry' },
  { id: 'coconut', name: 'نارگیل (Coconut)', nameEn: 'Coconut' },
  { id: 'cookies_cream', name: 'کوکیز و کرم (Cookies & Cream)', nameEn: 'Cookies & Cream' },
  { id: 'blueberry', name: 'بلوبری / تمشک آبی', nameEn: 'Blueberry' },
  { id: 'watermelon', name: 'هندوانه (Watermelon)', nameEn: 'Watermelon' },
  { id: 'citrus_lemon', name: 'لیمو / مرکبات (Lemon)', nameEn: 'Lemon' },
  { id: 'coffee', name: 'قهوه / کاپوچینو (Coffee)', nameEn: 'Coffee' },
  { id: 'peanut_butter', name: 'کره بادام زمینی (Peanut Butter)', nameEn: 'Peanut Butter' },
  { id: 'salted_caramel', name: 'کارامل نمکی (Salted Caramel)', nameEn: 'Salted Caramel' }
];

export const PRESET_SIZES: PresetSize[] = [
  { id: '1kg', label: '1 kg', weightKg: 1.0, unit: 'kg' },
  { id: '2.45kg', label: '2.45 kg', weightKg: 2.45, unit: 'kg' },
  { id: '3kg', label: '3 kg', weightKg: 3.0, unit: 'kg' },
  { id: '6kg', label: '6 kg', weightKg: 6.0, unit: 'kg' },
  { id: '1lb', label: '1 lb (0.45 kg)', weightKg: 0.45, unit: 'lbs' },
  { id: '2lbs', label: '2 lbs (0.90 kg)', weightKg: 0.90, unit: 'lbs' },
  { id: '5lbs', label: '5 lbs (2.27 kg)', weightKg: 2.27, unit: 'lbs' },
  { id: '10lbs', label: '10 lbs (4.54 kg)', weightKg: 4.54, unit: 'lbs' },
  { id: '30sachets', label: '30 ساشه (Sachets)', weightKg: 0.5, unit: 'sachets' },
  { id: '60caps', label: '60 کپسول / قرص', weightKg: 0.25, unit: 'caps' },
  { id: '120caps', label: '120 کپسول / قرص', weightKg: 0.4, unit: 'caps' }
];

export const STANDARD_SIZE_OPTIONS: string[] = [
  '1 kg',
  '2.45 kg',
  '3 kg',
  '6 kg',
  '1 lb (0.45 kg)',
  '2 lbs (0.90 kg)',
  '5 lbs (2.27 kg)',
  '10 lbs (4.54 kg)',
  '30 ساشه (Sachets)',
  '60 کپسول / قرص',
  '120 کپسول / قرص'
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
  if (sizeLabel.includes('60')) return 0.25;
  if (sizeLabel.includes('120')) return 0.4;
  return 0.8;
}

export function convertLbsToKg(lbs: number): number {
  return Number((lbs * 0.453592).toFixed(2));
}
