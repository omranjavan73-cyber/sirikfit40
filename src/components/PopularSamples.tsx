import React from 'react';
import { PopularProductsCarousel, PopularProductItem } from './PopularProductsCarousel';
import type { FinancialSettings } from '../types';

export interface PopularSamplesProps {
  onSelectCategory?: (categoryKey: string) => void;
  onSelectProduct?: (item: PopularProductItem) => void;
  products?: PopularProductItem[];
  items?: PopularProductItem[];
  settings?: FinancialSettings;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
}

export const PopularSamples: React.FC<PopularSamplesProps> = (props) => {
  return <PopularProductsCarousel {...props} />;
};

export default PopularSamples;
