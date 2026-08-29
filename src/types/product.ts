export type { StoreBadgeTheme } from '../utils/formatters';
export * from '../types';

export interface Product {
  id: string;
  titleFa?: string;
  titleEn?: string;
  title?: string;
  isPublished: boolean; // Controls storefront listing page visibility
  isPopular: boolean;   // Controls homepage popular carousel visibility
  [key: string]: any;
}


