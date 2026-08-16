import React from 'react';
import { PopularProductsCarousel, PopularProductItem } from './PopularProductsCarousel';
import type { FinancialSettings } from '../types';

export interface FeaturedSamplesProps {
  onSelectCategory?: (categoryKey: string) => void;
  onSelectProduct?: (item: PopularProductItem) => void;
  products?: PopularProductItem[];
  items?: PopularProductItem[];
  settings?: FinancialSettings;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
}

export const FeaturedSamples: React.FC<FeaturedSamplesProps> = (props) => {
  return <PopularProductsCarousel {...props} />;
};

export default FeaturedSamples;
