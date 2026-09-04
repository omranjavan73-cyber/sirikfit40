/**
 * Title Sanitization Engine
 * Automatically purges vendor brand prefixes/suffixes (e.g. Dr. Nutrition, GNC, Life Pharmacy, iHerb, Sporter),
 * Persian vendor mentions, empty brackets/parentheses, dangling punctuation, and redundant spacing
 * from both English and Persian product titles.
 */
export function sanitizeProductTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    // Remove vendor names (case-insensitive with word boundary)
    .replace(/\b(Dr\.?\s*Nutrition|GNC(?:\s*Store)?|Life\s*Pharmacy|iHerb|Sporter)\b/gi, '')
    // Remove Persian vendor mentions
    .replace(/(دکتر\s*نیوتریشن|لایف\s*فارماسی|جی\s*ان\s*سی|آی\s*هرب|اسپورتر)/gi, '')
    // Remove empty parentheses, brackets, braces
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\{\s*\}/g, '')
    // Remove dangling punctuation like leading/trailing hyphens, colons, bars, bullets, slashes
    .replace(/^[\s\-:|•/]+|[\s\-:|•/]+$/g, '')
    // Normalize multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}
