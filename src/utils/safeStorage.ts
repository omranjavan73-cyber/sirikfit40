/**
 * Safe LocalStorage Utilities with Anti-Crash Fallbacks
 * Protects against corrupt JSON, quota exceeded errors, and SSR environments.
 */

export function getSafeItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    
    // If defaultValue is a string and raw is already a string
    if (typeof defaultValue === 'string') {
      return raw as unknown as T;
    }
    
    // If defaultValue is a number
    if (typeof defaultValue === 'number') {
      const num = Number(raw);
      return (!isNaN(num) ? num : defaultValue) as unknown as T;
    }

    // If defaultValue is a boolean
    if (typeof defaultValue === 'boolean') {
      return (raw === 'true' || raw === '1') as unknown as T;
    }

    // Try parsing JSON
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch (err) {
    console.warn(`[safeStorage] Corrupt JSON found in localStorage key "${key}". Clearing it and returning fallback.`, err);
    try {
      localStorage.removeItem(key);
    } catch (_e) {}
    return defaultValue;
  }
}

export function setSafeItem(key: string, value: any): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    console.error(`[safeStorage] Failed to set localStorage key "${key}":`, err);
    return false;
  }
}

export function removeSafeItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (_e) {}
}

export function clearAllStorageAndReload(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (_e) {}
  window.location.reload();
}
