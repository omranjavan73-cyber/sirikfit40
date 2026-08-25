import type { FinancialSettings } from '../types';
import { calculateFinalToman, getEffectiveAedRate } from './formatters';

/**
 * Bilingual keywords dictionary for common supplement terms, brands, and categories.
 */
const BRAND_TRANSLATIONS: Record<string, string[]> = {
  'optimum nutrition': ['اپتیموم نوتریشن', 'اپتیمم', 'on', 'گلد استاندارد', 'gold standard'],
  'muscletech': ['ماسل تک', 'ماسل‌تک', 'نیتروتک', 'nitro tech', 'سل تک', 'cell tech', 'mass tech', 'مستک'],
  'dymatize': ['دایماتیز', 'دایماتایز', 'ایزو ۱۰۰', 'iso 100', 'iso100', 'الیت'],
  'applied nutrition': ['اپلاید نوتریشن', 'اپلاید', 'ابدوزنی', 'critical whey', 'آبه', 'abe'],
  'basix': ['بیسیکس', 'بیسیک'],
  'rule 1': ['رول وان', 'رول ۱', 'rule one', 'r1'],
  'kevin levrone': ['کوین لورون', 'لورون', 'لوورون', 'gold whey', 'levro'],
  'gnc': ['جی ان سی', 'جی‌ان‌سی', 'امگا', 'پک'],
  'dr. nutrition': ['دکتر نوتریشن', 'دکتر نوتریشن'],
  'life pharmacy': ['لایف فارمسی', 'داروخانه لایف'],
  'sporter': ['اسپورتر', 'اسپورتر دبی']
};

const CATEGORY_TRANSLATIONS: Record<string, string[]> = {
  'whey': ['پروتئین وی', 'پروتئین', 'وی ایزوله', 'پروتئین ایزوله', 'whey protein', 'isolate', 'casein', 'کازئین', 'whey isolate'],
  'creatine': ['کراتین', 'کراتین منوهیدرات', 'creatine monohydrate', 'کراتین میکرونایزد', 'کراتین ترکیبی'],
  'gainer': ['گینر', 'مس گینر', 'افزایش وزن', 'کربوپروتئین', 'mass gainer', 'weight gainer', 'کربو'],
  'amino': ['آمینو اسید', 'آمینو', 'bcaa', 'بی سی ای ای', 'eaa', 'شاخه ای', 'amino acid', 'گلوتامین', 'glutamine'],
  'pre-workout': ['پمپ', 'قبل تمرین', 'پمپ عضلانی', 'انرژی زا', 'pre workout', 'pump', 'کافئین'],
  'fat-burner': ['چربی سوز', 'ال کارنیتین', 'carnitine', 'cla', 'سی ال ای', 'کاهش وزن', 'لاغری', 'fat burner'],
  'vitamins': ['ویتامین', 'مولتی ویتامین', 'ویتامین c', 'ویتامین d', 'زینک', 'multivitamin', 'zinc', 'omega 3', 'امگا ۳']
};

/**
 * Generates an extensive list of bilingual search keywords (FA & EN)
 * combining title, brand, category, flavor, and contextual synonyms.
 */
export function generateBilingualKeywords(product: {
  title?: string;
  englishTitle?: string;
  titleFa?: string;
  brand?: string;
  category?: string;
  mainCategory?: string;
  subCategory?: string;
  storeName?: string;
  description?: string;
  flavors?: string[];
}): string[] {
  const tokens = new Set<string>();

  const addText = (text?: string) => {
    if (!text) return;
    const clean = text.toLowerCase().trim();
    if (!clean) return;
    tokens.add(clean);

    // Split words
    const words = clean.split(/[\s,/\-_+()]+/).filter(w => w.length > 1);
    words.forEach(w => tokens.add(w));
  };

  addText(product.title);
  addText(product.englishTitle);
  addText(product.titleFa);
  addText(product.brand);
  addText(product.category);
  addText(product.mainCategory);
  addText(product.subCategory);
  addText(product.storeName);

  if (Array.isArray(product.flavors)) {
    product.flavors.forEach(f => addText(f));
  }

  // Cross-reference brand translations
  const brandLower = (product.brand || '').toLowerCase();
  for (const [key, aliases] of Object.entries(BRAND_TRANSLATIONS)) {
    if (brandLower.includes(key) || aliases.some(a => brandLower.includes(a))) {
      aliases.forEach(a => tokens.add(a));
      tokens.add(key);
    }
  }

  // Cross-reference category translations
  const combinedCatText = `${product.category || ''} ${product.mainCategory || ''} ${product.subCategory || ''} ${product.title || ''}`.toLowerCase();
  for (const [key, aliases] of Object.entries(CATEGORY_TRANSLATIONS)) {
    if (combinedCatText.includes(key) || aliases.some(a => combinedCatText.includes(a))) {
      aliases.forEach(a => tokens.add(a));
      tokens.add(key);
    }
  }

  // Common high-intent e-commerce Persian prefixes/suffixes
  tokens.add('خرید');
  tokens.add('قیمت');
  tokens.add('مکمل دبی');
  tokens.add('ضمانت اصالت');
  tokens.add('ارسال فوری');

  return Array.from(tokens);
}

/**
 * Checks if a product matches a bilingual search query.
 */
export function matchBilingualSearch(product: any, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!product) return false;

  const q = query.trim().toLowerCase();
  const qTerms = q.split(/\s+/).filter(t => t.length > 0);

  // Collect all searchable text fields
  const title = (product.title || '').toLowerCase();
  const englishTitle = (product.englishTitle || product.titleEn || '').toLowerCase();
  const titleFa = (product.titleFa || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const category = (product.category || product.categoryKey || '').toLowerCase();
  const store = (product.storeName || product.storeOrigin || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const flavors = Array.isArray(product.flavors) ? product.flavors.join(' ').toLowerCase() : '';
  const sizes = Array.isArray(product.sizes) ? product.sizes.join(' ').toLowerCase() : '';

  // Get auto-generated bilingual tokens
  const keywords = Array.isArray(product.keywords) && product.keywords.length > 0
    ? product.keywords.map((k: string) => k.toLowerCase())
    : generateBilingualKeywords(product);

  const searchableBlob = `${title} ${englishTitle} ${titleFa} ${brand} ${category} ${store} ${desc} ${flavors} ${sizes} ${keywords.join(' ')}`;

  // Every token in search query must match somewhere in searchableBlob
  return qTerms.every(term => searchableBlob.includes(term));
}

/**
 * Generates Schema.org JSON-LD structure for a product for Google rich snippet search indexing.
 */
export function generateProductJsonLd(
  product: {
    id?: string;
    title?: string;
    englishTitle?: string;
    brand?: string;
    description?: string;
    image?: string;
    images?: string[];
    priceAed?: number;
    priceToman?: number;
    originalPriceAed?: number;
    originalPriceToman?: number;
    inStock?: boolean;
    url?: string;
    weightKg?: number;
    rating?: number;
    reviewCount?: number;
  },
  settings?: FinancialSettings
): object {
  const effectiveRate = getEffectiveAedRate(settings);
  const calculatedToman = product.priceToman || (product.priceAed ? calculateFinalToman(product.priceAed, product.weightKg || 0.8, settings?.cargoRatePerKg || 35, settings?.profitMargin || 20, effectiveRate) : 0);

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : (product.image ? [product.image] : ['https://sirikfit.ir/assets/og-preview.jpg']);

  const siteUrl = 'https://sirikfit.ir';
  const productUrl = product.id ? `${siteUrl}/#product-${product.id}` : (product.url || siteUrl);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': product.title || 'مکمل ورزشی اورجینال دبی',
    'alternateName': product.englishTitle || undefined,
    'image': images,
    'description': product.description || `خرید اینترنتی ${product.title || 'مکمل ورزشی'} با ضمانت اصالت ۱۰۰٪ و ارسال مستقیم از دبی به سراسر ایران.`,
    'sku': product.id || `SF-${Date.now()}`,
    'brand': {
      '@type': 'Brand',
      'name': product.brand || 'Sirik Fit'
    },
    'offers': {
      '@type': 'Offer',
      'url': productUrl,
      'priceCurrency': 'IRR',
      'price': calculatedToman ? calculatedToman * 10 : 0, // Convert Toman to Rials for Schema standard
      'priceValidUntil': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      'itemCondition': 'https://schema.org/NewCondition',
      'availability': product.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'seller': {
        '@type': 'Organization',
        'name': 'سیریک فیت - Sirik Fit',
        'url': siteUrl
      }
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': product.rating || '4.9',
      'reviewCount': product.reviewCount || '18',
      'bestRating': '5',
      'worstRating': '1'
    }
  };
}

/**
 * Generates Schema.org JSON-LD for the OnlineStore & Breadcrumbs
 */
export function generateStoreJsonLd(cms?: any): object {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OnlineStore',
        '@id': 'https://sirikfit.ir/#store',
        'name': 'سیریک فیت | Sirik Fit',
        'url': 'https://sirikfit.ir',
        'logo': 'https://sirikfit.ir/favicon.svg',
        'description': cms?.brandSlogan || 'فروشگاه آنلاین خرید مستقیم انواع مکمل‌های ورزشی، ویتامین و پروتئین اصل از دبی با ضمانت اصالت',
        'currenciesAccepted': 'IRR, AED',
        'paymentAccepted': 'کارت به کارت, درگاه بانکی شتاب, نقدی',
        'address': {
          '@type': 'PostalAddress',
          'addressCountry': 'IR'
        },
        'potentialAction': {
          '@type': 'SearchAction',
          'target': 'https://sirikfit.ir/?search={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'صفحه اصلی',
            'item': 'https://sirikfit.ir'
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'موجودی انبار ایران',
            'item': 'https://sirikfit.ir/#inventory'
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': 'پیشنهادهای ویژه دبی',
            'item': 'https://sirikfit.ir/#deals'
          }
        ]
      }
    ]
  };
}
