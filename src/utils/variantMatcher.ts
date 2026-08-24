/**
 * Variant String Normalization and Matrix Matching Engine
 * Re-exports the single-source-of-truth matrix engine functions.
 */
import { areVariantsMatching, normalizeVariantToken } from './variantMatrixEngine';

export * from './variantMatrixEngine';

export const normalizeStr = (s: string = '') => String(s || '').toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ' ').trim();

export const normalizeSize = (s: string = '') => {
  const str = String(s || '');
  const match = str.match(/([\d.]+)/);
  return match ? `${match[1]} kg` : str.trim();
};

export const normalizeVariantString = (str: any): string => normalizeVariantToken(str);

export const matchVariantValues = (a?: any, b?: any): boolean => {
  return areVariantsMatching(a, b);
};

