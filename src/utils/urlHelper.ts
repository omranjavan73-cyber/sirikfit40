export interface ExtractedUrlResult {
  cleanUrl: string;
  prefixText: string;
  isValid: boolean;
}

/**
 * Universal Intelligent URL & Prefix Text Extractor.
 * Isolates URLs cleanly even when preceded by product names or notes
 * (e.g. "Body Builder Creatine Monohydrate https://drnutrition.com/...").
 */
export function extractUrlAndCaption(rawInput: string): ExtractedUrlResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return { cleanUrl: '', prefixText: '', isValid: false };
  }

  const trimmed = rawInput.trim();
  const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);

  if (!urlMatch || !urlMatch[0]) {
    return { cleanUrl: '', prefixText: trimmed, isValid: false };
  }

  const cleanUrl = urlMatch[0].trim();
  const prefixText = trimmed.slice(0, urlMatch.index).replace(/[:\-–—]+$/, '').trim();

  return {
    cleanUrl,
    prefixText,
    isValid: cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
  };
}
