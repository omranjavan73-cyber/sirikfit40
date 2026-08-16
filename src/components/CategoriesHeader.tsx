import React from 'react';
import { CircularCategoryRow } from './CircularCategoryRow';
import type { WarehouseCategory } from '../types';

export interface CategoriesHeaderProps {
  categories?: WarehouseCategory[];
  selectedCat?: string;
  onSelectCategory: (filterKey: string) => void;
  title?: string;
  showNavArrows?: boolean;
}

export const CategoriesHeader: React.FC<CategoriesHeaderProps> = (props) => {
  return <CircularCategoryRow {...props} />;
};

export default CategoriesHeader;
