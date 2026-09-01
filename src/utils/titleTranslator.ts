/**
 * Advanced Product Title Cleaner & Contextual Persian Translator
 * Eliminates generic fallback placeholders (e.g. "مکمل اورجینال...")
 * Parses brand, category, form, flavor, and strength into elegant bilingual titles.
 */

export function toPersianDigits(num: number | string): string {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, (w) => farsiDigits[+w]);
}

/**
 * Strips known store marketing suffixes and noisy SEO fluff from scraped English titles
 */
export function cleanProductTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';

  let cleaned = rawTitle
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip store branding suffixes
  const storeSuffixes = [
    /\s*\|\s*Life\s*Pharmacy.*$/i,
    /\s*-\s*Life\s*Pharmacy.*$/i,
    /\s*\|\s*Dr\s*Nutrition.*$/i,
    /\s*-\s*Dr\s*Nutrition.*$/i,
    /\s*\|\s*Sporter.*$/i,
    /\s*-\s*Sporter.*$/i,
    /\s*\|\s*GNC.*$/i,
    /\s*-\s*GNC.*$/i,
    /\s*\|\s*Noon.*$/i,
    /\s*-\s*Noon.*$/i,
    /\s*\|\s*Amazon.*$/i,
    /\s*-\s*Amazon.*$/i,
    /\s*\|\s*iHerb.*$/i,
    /\s*-\s*iHerb.*$/i,
    /\s*Buy\s+.*?\s+online\s+in\s+UAE\b.*$/i,
    /\s*Buy\s+online\s+at\s+best\s+price\b.*$/i,
    /\s*Free\s+Shipping.*$/i,
    /\s*Best\s+Price\s+Guarantee.*$/i
  ];

  for (const pattern of storeSuffixes) {
    cleaned = cleaned.replace(pattern, '').trim();
  }

  // Remove leading/trailing dashes, colons, or pipes
  cleaned = cleaned.replace(/^[\s\-|:]+|[\s\-|:]+$/g, '').trim();

  return cleaned;
}

/**
 * Contextual translation dictionary mapping supplement & fitness product keywords to accurate Persian terms
 */
export function translateTitleToFa(rawTitle: string, brand?: string, storeName?: string): string {
  const cleanTitle = cleanProductTitle(rawTitle);
  if (!cleanTitle) return brand ? `محصول تخصصی ${brand}` : 'محصول تخصصی ورزشی و سلامت';

  // If already purely or predominantly Persian
  if (/[\u0600-\u06FF]/.test(cleanTitle) && !/[a-zA-Z]{4,}/.test(cleanTitle)) {
    return cleanTitle;
  }

  const lower = cleanTitle.toLowerCase();
  const parts: string[] = [];

  // 1. Specific Product Sub-types & Specialties (First priority for exact identification)
  let specificCategory = '';
  if (/protein\s*bars?|proteinbar|energy\s*bar|snack\s*bar/i.test(lower)) {
    specificCategory = 'شکلات پروتئینی و پروتئین بار';
  } else if (/salmon\s*oil/i.test(lower)) {
    specificCategory = 'روغن سالمون خالص';
  } else if (/krill\s*oil/i.test(lower)) {
    specificCategory = 'روغن کریل اصل';
  } else if (/fish\s*oil|omega\s*3|omega-3/i.test(lower)) {
    specificCategory = 'روغن ماهی و امگا ۳';
  } else if (/whey\s*isolate|iso\s*100|iso-100|hydrolyzed\s*whey/i.test(lower)) {
    specificCategory = 'پروتئین وی ایزوله خالص';
  } else if (/whey\s*protein|gold\s*standard\s*100%|whey/i.test(lower)) {
    specificCategory = 'پروتئین وی اصل';
  } else if (/casein/i.test(lower)) {
    specificCategory = 'پروتئین کازئین دیرجذب';
  } else if (/creatine\s*monohydrate/i.test(lower)) {
    specificCategory = 'کراتین مونوهیدرات خالص';
  } else if (/creatine/i.test(lower)) {
    specificCategory = 'پودر کراتین ورزشی';
  } else if (/bcaa/i.test(lower)) {
    specificCategory = 'مکمل آمینواسید شاخه‌دار BCAA';
  } else if (/eaa/i.test(lower)) {
    specificCategory = 'مکمل آمینواسیدهای ضروری EAA';
  } else if (/glutamine/i.test(lower)) {
    specificCategory = 'پودر گلوتامین ریکاوری';
  } else if (/mass\s*gainer|serious\s*mass|gainer/i.test(lower)) {
    specificCategory = 'گینر افزایش وزن و حجم';
  } else if (/pre\s*-?\s*workout|preworkout/i.test(lower)) {
    specificCategory = 'پمپ و مکمل انرژی قبل تمرین';
  } else if (/carnitine|l-carnitine/i.test(lower)) {
    specificCategory = 'مکمل چربی‌سوز ال‌کارنیتین';
  } else if (/fat\s*burner|burner|lipodrene|hydroxycut/i.test(lower)) {
    specificCategory = 'مکمل چربی‌سوز حرفه‌ای';
  } else if (/collagen\s*peptides?|collagen/i.test(lower)) {
    specificCategory = 'کلاژن پپتاید جوانساز پوست و مفاصل';
  } else if (/multivitamin|multi\s*vitamin|daily\s*vitamins/i.test(lower)) {
    specificCategory = 'مولتی‌ویتامین و مینرال کامل';
  } else if (/ashwagandha/i.test(lower)) {
    specificCategory = 'مکمل گیاهی آشواگاندا';
  } else if (/magnesium/i.test(lower)) {
    specificCategory = 'مکمل تخصصی منیزیم';
  } else if (/zinc/i.test(lower)) {
    specificCategory = 'مکمل زینک روی';
  } else if (/vitamin\s*c/i.test(lower)) {
    specificCategory = 'ویتامین C خالص';
  } else if (/vitamin\s*d3?|d3/i.test(lower)) {
    specificCategory = 'ویتامین D3';
  } else if (/biotin/i.test(lower)) {
    specificCategory = 'مکمل تقویت مو و ناخن بیوتین';
  } else if (/peanut\s*butter/i.test(lower)) {
    specificCategory = 'کره بادام‌زمینی رژیمی';
  } else if (/shaker/i.test(lower)) {
    specificCategory = 'شیکر و قمقمه ورزشی';
  }

  // 2. Physical Dosage Form (capsule, tablet, powder, etc.)
  let formPrefix = '';
  if (/\bcapsules?\b|\bcaps?\b/i.test(cleanTitle)) {
    formPrefix = 'کپسول';
  } else if (/\btablets?\b|\btabs?\b/i.test(cleanTitle)) {
    formPrefix = 'قرص';
  } else if (/\bsoftgels?\b/i.test(cleanTitle)) {
    formPrefix = 'کپسول ژله‌ای (سافت‌ژل)';
  } else if (/\bgummies\b|\bgummy\b/i.test(cleanTitle)) {
    formPrefix = 'پاستیل خوراکی';
  } else if (/\bpowders?\b/i.test(cleanTitle)) {
    formPrefix = 'پودر';
  } else if (/\bliquid\b|\bsyrup\b/i.test(cleanTitle)) {
    formPrefix = 'مایع و شربت خوراکی';
  } else if (/\bdrops\b/i.test(cleanTitle)) {
    formPrefix = 'قطره خوراکی';
  }

  if (formPrefix && specificCategory.includes(formPrefix)) {
    formPrefix = '';
  }

  if (formPrefix) parts.push(formPrefix);
  if (specificCategory) parts.push(specificCategory);

  // 3. Known Brand Translation/Transliteration
  const cleanBrand = (brand || '').trim();
  const lowerBrand = cleanBrand.toLowerCase();
  let brandPersian = '';

  if (lowerBrand.includes('pure protein') || lower.includes('pure protein')) {
    brandPersian = 'پیور پروتئین (Pure Protein)';
  } else if (lowerBrand.includes('optimum nutrition') || lowerBrand === 'on' || lower.includes('optimum nutrition')) {
    brandPersian = 'اپتیموم نوتریشن (ON)';
  } else if (lowerBrand.includes('dymatize') || lower.includes('dymatize')) {
    brandPersian = 'دایماتیز (Dymatize)';
  } else if (lowerBrand.includes('muscletech') || lower.includes('muscletech')) {
    brandPersian = 'ماسل‌تک (MuscleTech)';
  } else if (lowerBrand.includes('cellucor') || lower.includes('cellucor')) {
    brandPersian = 'سلوکور (Cellucor)';
  } else if (lowerBrand.includes('nutrex') || lower.includes('nutrex')) {
    brandPersian = 'نوترکس (Nutrex)';
  } else if (lowerBrand.includes('universal') || lower.includes('universal nutrition')) {
    brandPersian = 'یونیورسال نوتریشن';
  } else if (lowerBrand.includes('sunshine nutrition')) {
    brandPersian = 'سان‌شاین نوتریشن';
  } else if (lowerBrand.includes('21st century')) {
    brandPersian = 'قرن ۲۱ (21st Century)';
  } else if (lowerBrand.includes('now foods') || lowerBrand === 'now') {
    brandPersian = 'نو فودز (NOW)';
  } else if (cleanBrand && !cleanBrand.toLowerCase().includes('life pharmacy') && !cleanBrand.toLowerCase().includes('dr nutrition')) {
    brandPersian = cleanBrand;
  }

  if (brandPersian && !parts.some(p => p.includes(brandPersian))) {
    parts.push(brandPersian);
  }

  // 4. Weight / Quantity / Potency specifications
  // Milligrams / Grams / Potency (e.g. 1000mg, 2400mg)
  const mgMatch = cleanTitle.match(/(\d+)\s*(?:mg|milligrams?)\b/i);
  if (mgMatch && mgMatch[1]) {
    const pNum = toPersianDigits(mgMatch[1]);
    parts.push(`${pNum} میلی‌گرم`);
  }

  // Package Count (e.g. 60 capsules, 100 tablets, 12 bars)
  const countMatch = cleanTitle.match(/(\d+)\s*(?:capsules?|caps?|tablets?|tabs?|softgels?|gummies|bars?|count|s)\b/i);
  if (countMatch && countMatch[1]) {
    const pNum = toPersianDigits(countMatch[1]);
    parts.push(`${pNum} عددی`);
  } else {
    // Weight (e.g. 2kg, 5lbs, 500g)
    const kgMatch = cleanTitle.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)\b/i);
    if (kgMatch && kgMatch[1]) {
      const pNum = toPersianDigits(kgMatch[1]);
      parts.push(`${pNum} کیلوگرمی`);
    } else {
      const lbsMatch = cleanTitle.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/i);
      if (lbsMatch && lbsMatch[1]) {
        const pNum = toPersianDigits(lbsMatch[1]);
        parts.push(`${pNum} پوندی`);
      } else {
        const gMatch = cleanTitle.match(/(\d+)\s*(?:g|grams?)\b/i);
        if (gMatch && gMatch[1] && parseInt(gMatch[1], 10) >= 30) {
          const pNum = toPersianDigits(gMatch[1]);
          parts.push(`${pNum} گرمی`);
        }
      }
    }
  }

  let finalFa = parts.join(' ').trim();

  // If no parts were gathered, fall back to clean brand and main title tokens WITHOUT ANY generic string
  if (!finalFa) {
    if (brandPersian) {
      finalFa = `مکمل تخصصی ${brandPersian}`;
    } else {
      // Pick first 4 significant English words as descriptive Persian prefix
      const cleanWords = cleanTitle.split(/\s+/).slice(0, 4).join(' ');
      finalFa = `محصول ورزشی سلامت (${cleanWords})`;
    }
  }

  return finalFa;
}

/**
 * Generates an elegant bilingual title:
 * [عنوان فارسی دقیق و معنادار] (Clean English Title)
 * Never outputs generic placeholders like "مکمل اورجینال [Store]".
 */
export function generateBilingualProductTitle(rawTitle: string, storeName?: string, brand?: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return brand ? `محصول تخصصی ${brand}` : 'محصول تخصصی دبی';
  }

  const cleanEng = cleanProductTitle(rawTitle);
  if (!cleanEng) {
    return brand ? `محصول تخصصی ${brand}` : 'محصول تخصصی دبی';
  }

  // If already bilingual with English in parentheses
  if (/[\u0600-\u06FF]/.test(cleanEng) && /\([A-Za-z0-9\s.,%&+\-/'"]+\)/.test(cleanEng)) {
    return cleanEng;
  }

  // If purely Persian
  if (/[\u0600-\u06FF]/.test(cleanEng) && !/[a-zA-Z]{3,}/.test(cleanEng)) {
    return cleanEng;
  }

  const persianPrefix = translateTitleToFa(cleanEng, brand, storeName);
  return `${persianPrefix} (${cleanEng})`;
}
