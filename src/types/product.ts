export type { StoreBadgeTheme } from '../utils/formatters';
export * from '../types';
export * from '../constants/stores';

export interface Product {
  id: string;
  titleFa?: string;
  titleEn?: string;
  title?: string;
  imageUrl?: string;
  image?: string;
  images?: string[];
  galleryImages?: string[];
  priceAed?: number;
  price?: number;
  priceToman?: number;
  manualPriceToman?: number | null;
  isManualPrice?: boolean;
  originalPriceAed?: number;
  originalPriceToman?: number;
  storeName?: string;
  storeDomain?: string;
  targetSection?: 'deals' | 'iran_warehouse';
  isActive?: boolean;
  isPublished?: boolean;
  isDraft?: boolean;
  isPopular?: boolean;
  popularOrder?: number;
  profitMargin?: number;
  shippingFeeAed?: number;
  category?: string;
  subCategory?: string;
  variants?: any[];
  flavors?: string[];
  sizes?: string[];
  weightKg?: number;
  description?: string;
  brand?: string;
  sourceUrl?: string;
  url?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  [key: string]: any;
}


