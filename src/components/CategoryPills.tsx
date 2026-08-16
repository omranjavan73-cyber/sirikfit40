import React from 'react';
import { CircularCategoryRow } from './CircularCategoryRow';
import type { WarehouseCategory } from '../types';

export interface CategoryPillsProps {
  categories?: WarehouseCategory[];
  selectedCat?: string;
  onSelectCategory: (filterKey: string) => void;
  title?: string;
  showNavArrows?: boolean;
}

export const CategoryPills: React.FC<CategoryPillsProps> = (props) => {
  return <CircularCategoryRow {...props} />;
};

export default CategoryPills;
