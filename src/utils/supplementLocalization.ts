/**
 * Smart Persian Supplement Localization & Unit Conversion Utility
 * 
 * Provides:
 * 1. Foreign Unit Conversion to clear Persian equivalents (LB -> KG, gm -> g, servings, sachet packs, capsules/tablets).
 * 2. Comprehensive supplement flavor translation dictionary.
 * 3. Dynamic Persian product title & caption generator.
 */

// 1. Convert Foreign Units to Persian
export function formatPersianSize(rawSize: string | null | undefined): string {
  if (!rawSize) return '';
  const trimmed = rawSize.trim();

  // Convert LB / lbs to KG
  const lbMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i);
  if (lbMatch) {
    const lbs = parseFloat(lbMatch[1]);
    const kg = (lbs * 0.453592).toFixed(1).replace('.0', '');
    return `${lbs} پوند (معادل ${kg} کیلوگرم)`;
  }

  // Convert Grams (gm, g, grams)
  const gmMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:gm|g|grams?)$/i) || trimmed.match(/(\d+(?:\.\d+)?)\s*(?:gm|grams?)\b/i);
  if (gmMatch) {
    return `${gmMatch[1]} گرم`;
  }

  // Convert KG
  const kgMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kgMatch) {
    return `${kgMatch[1]} کیلوگرم`;
  }

  // Convert Servings / Scoops
  const servingMatch = trimmed.match(/(\d+)\s*(?:servings?|scoops?)/i);
  if (servingMatch) {
    return `${servingMatch[1]} سروینگ (وعده)`;
  }

  // Convert Sachet / Stick Packs
  const stickMatch = trimmed.match(/(\d+)\s*(?:sticks?|packs?|sachets?)/i);
  if (stickMatch) {
    return `بسته ${stickMatch[1]} عددی (ساشه)`;
  }

  // Convert Capsules / Tablets / Softgels / Gummies
  const capMatch = trimmed.match(/(\d+)\s*(?:capsules?|caps?|tablets?|tabs?|softgels?|gummies|veggie\s*caps?)/i);
  if (capMatch) {
    return `${capMatch[1]} عددی (کپسول/قرص)`;
  }

  return trimmed;
}

// 2. Comprehensive Supplement Flavor Dictionary
export const FLAVOR_TRANSLATIONS: Record<string, string> = {
  'chocolate': 'شکلات',
  'chocolate supreme': 'شکلات غلیظ ویژه',
  'double rich chocolate': 'دابل چاکلت ویژه',
  'rich chocolate': 'شکلات غلیظ',
  'creamy vanilla': 'وانیل خامه‌ای',
  'vanilla': 'وانیل',
  'vanilla ice cream': 'بستنی وانیلی',
  'french vanilla': 'وانیل فرانسوی',
  'strawberry': 'توت فرنگی',
  'strawberry banana': 'توت فرنگی و موز',
  'banana': 'موز',
  'chocolate peanut butter': 'شکلات کره بادام زمینی',
  'peanut butter': 'کره بادام زمینی',
  'lemonade': 'لیموناد ترش',
  'pink lemonade': 'پینک لیموناد',
  'watermelon': 'هندوانه',
  'unflavored': 'بدون طعم (طبیعی)',
  'unflavoured': 'بدون طعم (طبیعی)',
  'natural': 'طبیعی بدون طعم',
  'cookies & cream': 'کوکی و کرم',
  'cookies and cream': 'کوکی و کرم',
  'blue raspberry': 'تمشک آبی (بلوبری)',
  'blue slush': 'تمشک آبی یخی',
  'fruit punch': 'میوه‌های استوایی (پونچ)',
  'mango': 'انبه',
  'mango passion fruit': 'انبه و پشن‌فروت',
  'orange': 'پرتقال',
  'orange mango': 'پرتقال و انبه',
  'green apple': 'سیب سبز',
  'sour apple': 'سیب ترش',
  'caramel': 'کارامل',
  'salted caramel': 'کارامل نمکی',
  'coffee': 'قهوه',
  'cappuccino': 'کاپوچینو',
  'mocha': 'موکا',
  'tropical': 'میوه‌های گرمسیری',
  'pineapple': 'آناناس',
  'peach': 'هلو',
  'peach iced tea': 'آیس‌تی هلو',
  'cherry': 'گیلاس',
  'berry': 'توت جنگلی',
  'mixed berry': 'میکس بری',
  'grape': 'انگور',
  'cotton candy': 'پشمک',
  'cola': 'کولا'
};

export function translateFlavor(flavor: string | null | undefined): string {
  if (!flavor) return '';
  const lower = flavor.toLowerCase().trim();
  return FLAVOR_TRANSLATIONS[lower] || flavor;
}

// 3. Supplement Keywords Dictionary for Translating Titles
const SUPPLEMENT_KEYWORDS: Array<[RegExp, string]> = [
  [/100%\s*Whey\s*Gold\s*Standard/gi, 'پروتئین وی گلد استاندارد ۱۰۰٪'],
  [/Gold\s*Standard\s*100%\s*Whey/gi, 'پروتئین وی گلد استاندارد ۱۰۰٪'],
  [/100%\s*Whey\s*Protein/gi, 'پروتئین وی ۱۰۰٪'],
  [/Whey\s*Protein\s*Isolate/gi, 'پروتئین وی ایزوله'],
  [/Hydrolyzed\s*Whey\s*Protein/gi, 'پروتئین وی هیدرولیز شده'],
  [/Whey\s*Protein/gi, 'پروتئین وی'],
  [/Iso\s*100/gi, 'پروتئین ایزو ۱۰۰'],
  [/Mass\s*Tech\s*Elite/gi, 'گینر مس تک الیت'],
  [/Mass\s*Tech/gi, 'گینر مس تک'],
  [/Critical\s*Mass\s*(?:Professional|Lean\s*Mass\s*Gainz|Original)?/gi, 'گینر کریتیکال مس'],
  [/Serious\s*Mass/gi, 'گینر سیریوس مس'],
  [/Mass\s*Gainer/gi, 'گینر افزایش وزن'],
  [/Weight\s*Gainer/gi, 'گینر افزایش وزن'],
  [/Creatine\s*Monohydrate/gi, 'کراتین مونوهیدرات'],
  [/Micronized\s*Creatine/gi, 'کراتین میکرونایز شده'],
  [/Creatine/gi, 'کراتین'],
  [/BCAA\s*Amino/gi, 'آمینو اسید بی سی ای ای'],
  [/BCAA/gi, 'مکمل بی سی ای ای'],
  [/EAA/gi, 'آمینو اسیدهای ضروری EAA'],
  [/Glutamine/gi, 'گلوتامین'],
  [/Pre-?Workout/gi, 'پمپ قبل از تمرین'],
  [/C4\s*Original/gi, 'پمپ C4 اورجینال'],
  [/C4\s*Extreme/gi, 'پمپ C4 اکستریم'],
  [/Animal\s*Pak/gi, 'مولتی ویتامین انیمال پک'],
  [/Multivitamin/gi, 'مولتی ویتامین تخصصی'],
  [/Omega\s*3/gi, 'امگا ۳'],
  [/Fish\s*Oil/gi, 'روغن ماهی (امگا ۳)'],
  [/Casein\s*Protein/gi, 'پروتئین کازئین'],
  [/Casein/gi, 'کازئین دیرجذب'],
  [/Collagen/gi, 'کلاژن'],
  [/L-Carnitine/gi, 'ال کارنیتین'],
  [/Fat\s*Burner/gi, 'چربی‌سوز'],
  [/Testosterone\s*Booster/gi, 'تقویت‌کننده تستوسترون']
];

const BRAND_TRANSLATIONS: Record<string, string> = {
  'optimum nutrition': 'اپتیموم نوتریشن (ON)',
  'on': 'اپتیموم نوتریشن (ON)',
  'muscletech': 'ماسل تک (MuscleTech)',
  'applied nutrition': 'اپلاید نوتریشن (Applied Nutrition)',
  'dymatize': 'دایماتیز (Dymatize)',
  'cellucor': 'سلکور (Cellucor)',
  'myprotein': 'مای پروتئین (Myprotein)',
  'rule 1': 'رول وان (Rule 1)',
  'rule one': 'رول وان (Rule 1)',
  'universal nutrition': 'یونیورسال نوتریشن (Universal)',
  'kevin levrone': 'کوین لورون (Kevin Levrone)',
  'dr. nutrition': 'دکتر نوتریشن (Dr. Nutrition)',
  'gnc': 'جی ان سی (GNC)',
  'scitec': 'سایتک (Scitec)'
};

/**
 * Generates an automatic Persian localized title from an English product title
 */
export function generatePersianTitle(rawTitle: string, brand?: string): string {
  if (!rawTitle) return '';
  let clean = rawTitle.trim();

  // Remove duplicate brand in beginning if present
  let matchedBrandFa = '';
  if (brand) {
    const bLower = brand.toLowerCase().trim();
    matchedBrandFa = BRAND_TRANSLATIONS[bLower] || brand;
  }

  // Look for keywords
  let translatedKeyword = '';
  for (const [pattern, fa] of SUPPLEMENT_KEYWORDS) {
    if (pattern.test(clean)) {
      translatedKeyword = fa;
      break;
    }
  }

  if (translatedKeyword) {
    if (matchedBrandFa) {
      return `${translatedKeyword} ${matchedBrandFa}`;
    }
    return `مکمل ${translatedKeyword} (${clean})`;
  }

  // Fallback: return rawTitle with brand if available
  return clean;
}

// 4. Dynamic Persian Caption Generator
export function generatePersianProductCaption(product: {
  title: string;
  selectedFlavor?: string | null;
  selectedSize?: string | null;
}): string {
  const flavorFa = translateFlavor(product.selectedFlavor);
  const sizeFa = formatPersianSize(product.selectedSize);

  const details: string[] = [];
  if (flavorFa && flavorFa !== 'بدون طعم (طبیعی)' && flavorFa !== 'طبیعی بدون طعم') {
    details.push(`طعم: ${flavorFa}`);
  }
  if (sizeFa) {
    details.push(`سایز/حجم: ${sizeFa}`);
  }

  return details.length > 0 ? `${product.title} (${details.join(' • ')})` : product.title;
}
