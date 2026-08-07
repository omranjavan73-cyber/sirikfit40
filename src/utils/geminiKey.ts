/**
 * Helper function to retrieve the effective list of Gemini API keys.
 * Searches localStorage ('gemini_api_keys_list' or 'gemini_api_key') and CMS config.
 */
export function getEffectiveGeminiKeysList(cmsKeys?: string[] | string): string[] {
  const keysList: string[] = [];

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('gemini_api_keys_list');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((k: string) => {
            if (k && typeof k === 'string' && k.trim() !== '' && k !== '******') {
              if (!keysList.includes(k.trim())) keysList.push(k.trim());
            }
          });
        }
      }
    } catch (_e) {
      // ignore JSON parse error
    }

    if (keysList.length === 0) {
      const single = localStorage.getItem('gemini_api_key');
      if (single && single.trim() !== '' && single !== '******') {
        keysList.push(single.trim());
      }
    }
  }

  if (keysList.length === 0 && cmsKeys) {
    if (Array.isArray(cmsKeys)) {
      cmsKeys.forEach((k) => {
        if (k && typeof k === 'string' && k.trim() !== '' && k !== '******') {
          if (!keysList.includes(k.trim())) keysList.push(k.trim());
        }
      });
    } else if (typeof cmsKeys === 'string' && cmsKeys.trim() !== '' && cmsKeys !== '******') {
      keysList.push(cmsKeys.trim());
    }
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

