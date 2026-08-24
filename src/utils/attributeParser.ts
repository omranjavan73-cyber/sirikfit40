export interface ParsedAttributes {
  size?: string;
  flavor?: string;
  weightKg?: number;
  packaging?: string;
}

export const COMMON_FLAVORS = [
  { en: 'Chocolate', fa: 'شکلاتی', patterns: [/choc(olate)?/i, /دبل چاکلت/i, /شکلات/i] },
  { en: 'Double Chocolate', fa: 'دبل چاکلت', patterns: [/double\s*choc(olate)?/i, /دبل چاکلت/i] },
  { en: 'Vanilla', fa: 'وانیلی', patterns: [/vanilla/i, /وانیل/i] },
  { en: 'Strawberry', fa: 'توت فرنگی', patterns: [/strawberr?y/i, /توت\s*فرنگی/i] },
  { en: 'Banana', fa: 'موزی', patterns: [/banana/i, /موز/i] },
  { en: 'Cookies & Cream', fa: 'کوکی اند کرم', patterns: [/cookies?\s*(&|and)?\s*cream/i, /کوکی/i] },
  { en: 'Unflavored', fa: 'بدون طعم', patterns: [/unflavored|unflavoured|natural|pure/i, /بدون\s*طعم/i] },
  { en: 'Watermelon', fa: 'هندوانه', patterns: [/watermelon/i, /هندوانه/i] },
  { en: 'Blue Raspberry', fa: 'تمشک آبی (بلوبری)', patterns: [/blue\s*rasp(berry)?|blue\s*slush/i, /بلوبری/i] },
  { en: 'Mango', fa: 'انبه', patterns: [/mango/i, /انبه/i] },
  { en: 'Orange', fa: 'پرتقالی', patterns: [/orange/i, /پرتقال/i] },
  { en: 'Lemon Lime', fa: 'لیمو نعناع', patterns: [/lemon(\s*lime)?/i, /لیمو/i] },
  { en: 'Caramel', fa: 'کاراملی', patterns: [/caramel|salted\s*caramel/i, /کارامل/i] },
  { en: 'Coffee', fa: 'قهوه / موکا', patterns: [/coffee|mocha|latte|cappuccino/i, /قهوه/i] },
  { en: 'Peanut Butter', fa: 'کره بادام زمینی', patterns: [/peanut\s*butter/i, /بادام\s*زمینی/i] },
  { en: 'Coconut', fa: 'نارگیل', patterns: [/coconut/i, /نارگیل/i] },
  { en: 'Peach', fa: 'هلو', patterns: [/peach/i, /هلو/i] },
  { en: 'Apple', fa: 'سیب ترش', patterns: [/apple|green\s*apple/i, /سیب/i] }
];

export function extractAttributesFromText(text: string, url: string = ''): ParsedAttributes {
  const combined = `${text} ${url}`.replace(/[-_]/g, ' ');
  let size: string | undefined;
  let flavor: string | undefined;
  let weightKg: number | undefined;
  let packaging: string | undefined;

  // 1. Detect Size & Weight
  const sizeMatch = combined.match(/(\d+(\.\d+)?\s*(kg|g|lbs|lb|oz|capsules|caps|tablets|tabs|servings|sachets|ساشه|سروینگ|کیلوگرم|گرم))/i);
  if (sizeMatch) {
    size = sizeMatch[0].trim();
    const val = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[3].toLowerCase();

    if (unit === 'kg' || unit === 'کیلوگرم') weightKg = val;
    else if (unit === 'g' || unit === 'گرم') weightKg = val / 1000;
    else if (unit === 'lb' || unit === 'lbs') weightKg = Math.round(val * 0.453592 * 100) / 100;
    else if (unit === 'oz') weightKg = Math.round(val * 0.0283495 * 100) / 100;
    else if (unit.includes('sachet') || unit.includes('ساشه')) packaging = `${val} ساشه`;
    else if (unit.includes('serv') || unit.includes('سروینگ')) packaging = `${val} سروینگ`;
  }

  // 2. Detect Flavor
  for (const item of COMMON_FLAVORS) {
    for (const pat of item.patterns) {
      if (pat.test(combined)) {
        flavor = item.fa ? `${item.en} (${item.fa})` : item.en;
        break;
      }
    }
    if (flavor) break;
  }

  return { size, flavor, weightKg, packaging };
}
