/**
 * Helper function to retrieve the effective list of Gemini API keys.
 * Searches localStorage ('gemini_api_keys_list' or 'gemini_api_key'), CMS config, and runtime envs.
 */
export function getEffectiveGeminiKeysList(cmsKeys?: string[] | string): string[] {
  const keysList: string[] = [];

  const addValidKey = (k?: string) => {
    if (k && typeof k === 'string') {
      const trimmed = k.trim();
      if (trimmed !== '' && trimmed !== '******' && !keysList.includes(trimmed)) {
        keysList.push(trimmed);
      }
    }
  };

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('gemini_api_keys_list');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((k: string) => addValidKey(k));
        }
      }
    } catch (_e) {
      // ignore JSON parse error
    }

    if (keysList.length === 0) {
      const single = localStorage.getItem('gemini_api_key');
      addValidKey(single || undefined);
    }
  }

  if (cmsKeys) {
    if (Array.isArray(cmsKeys)) {
      cmsKeys.forEach((k) => addValidKey(k));
    } else if (typeof cmsKeys === 'string') {
      addValidKey(cmsKeys);
    }
  }

  // Fallback to runtime env vars if present
  if (typeof window !== 'undefined' && (import.meta as any)?.env?.VITE_GEMINI_API_KEY) {
    addValidKey((import.meta as any).env.VITE_GEMINI_API_KEY);
  }
  if (typeof process !== 'undefined' && process?.env?.GEMINI_API_KEY) {
    addValidKey(process.env.GEMINI_API_KEY);
  }

  return keysList;
}

/**
 * Saves an array of Gemini API keys to localStorage under 'gemini_api_keys_list'
 * and updates 'gemini_api_key' with key 1.
 */
export function setEffectiveGeminiKeysList(keysArray: string[]): string[] {
  const cleanKeys = keysArray
    .map((k) => (k ? k.trim() : ''))
    .filter((k) => k !== '' && k !== '******');

  if (typeof window !== 'undefined') {
    localStorage.setItem('gemini_api_keys_list', JSON.stringify(cleanKeys));
    if (cleanKeys.length > 0) {
      localStorage.setItem('gemini_api_key', cleanKeys[0]);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }
  return cleanKeys;
}

/**
 * Backward compatible single-key getter
 */
export function getEffectiveGeminiKey(cmsKey?: string): string {
  const list = getEffectiveGeminiKeysList(cmsKey);
  return list[0] || '';
}

/**
 * Backward compatible single-key setter
 */
export function setEffectiveGeminiKey(newKey: string): string {
  if (newKey && newKey.trim() !== '') {
    setEffectiveGeminiKeysList([newKey.trim()]);
  } else {
    setEffectiveGeminiKeysList([]);
  }
  return newKey;
}

/**
 * Automated Gemini API multi-key rotation caller.
 * Iterates through provided keys and fallback models (gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro).
 * Automatically handles 429 Rate Limits or key errors without throwing unhandled client exceptions.
 */
export async function callGeminiApiWithKeyRotation(params: {
  prompt: string;
  keys?: string[];
  models?: string[];
}): Promise<string | null> {
  const effectiveKeys = getEffectiveGeminiKeysList(params.keys);
  if (effectiveKeys.length === 0) {
    console.warn('Gemini Rotation: No API keys available in storage or config.');
    return null;
  }

  const modelList = params.models && params.models.length > 0
    ? params.models
    : ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

  for (const apiKey of effectiveKeys) {
    for (const modelName of modelList) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: params.prompt }]
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText && typeof candidateText === 'string') {
            return candidateText;
          }
        } else if (response.status === 429) {
          console.warn(`Gemini Rotation: Key ${apiKey.slice(0, 6)}... hit 429 Rate Limit on ${modelName}. Retrying next key/model.`);
        } else {
          console.warn(`Gemini Rotation: Model ${modelName} returned status ${response.status}. Retrying.`);
        }
      } catch (err) {
        console.warn(`Gemini Rotation Error on ${modelName}:`, err);
      }
    }
  }

  console.error('Gemini Rotation: All available API keys and models failed or were rate limited.');
  return null;
}

/**
 * AI-assisted Product Link Extractor with multi-key rotation fallback
 */
export async function extractProductWithGeminiAI(
  url: string,
  rawTextOrHtml?: string,
  keys?: string[]
): Promise<any | null> {
  const prompt = `You are a product detail extractor for an online shopping platform in Dubai, UAE.
Extract details for the product URL: "${url}".
${rawTextOrHtml ? `Here is the scraped webpage text/HTML preview:\n"""\n${rawTextOrHtml.slice(0, 4000)}\n"""` : ''}

Respond ONLY with valid JSON in this exact structure without markdown formatting or code blocks:
{
  "title": "Product Full Title in Persian/English",
  "priceAed": 120.0,
  "originalPriceAed": 150.0,
  "storeName": "Store Name (e.g. Dr. Nutrition, Noon, Amazon)",
  "image": "https://example.com/image.jpg",
  "weightKg": 0.8,
  "description": "Short Persian product description"
}`;

  const responseText = await callGeminiApiWithKeyRotation({ prompt, keys });
  if (!responseText) return null;

  try {
    const cleanJsonStr = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const parsed = JSON.parse(cleanJsonStr);
    if (parsed && (parsed.title || parsed.priceAed)) {
      return {
        title: parsed.title || 'مکمل اورجینال امارات',
        priceAed: Number(parsed.priceAed) || 0,
        originalPriceAed: Number(parsed.originalPriceAed) || 0,
        storeName: parsed.storeName || 'فروشگاه دبی',
        image: parsed.image || '',
        weightKg: Number(parsed.weightKg) || 0.8,
        description: parsed.description || 'محصول اورجینال با ضمانت اصالت ۱۰۰٪ دبی و بسته‌بندی پلمپ شرکتی',
        aiExtracted: true
      };
    }
  } catch (parseErr) {
    console.warn('Gemini Rotation JSON parse error:', parseErr);
  }

  return null;
}


