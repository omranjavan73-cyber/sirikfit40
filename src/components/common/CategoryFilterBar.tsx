import React from 'react';
import { CategoryFilter, CategoryFilterProps } from './CategoryFilter';

export interface CategoryFilterBarProps extends CategoryFilterProps {}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = (props) => {
  return <CategoryFilter {...props} />;
};

export { CategoryFilter } from './CategoryFilter';
export default CategoryFilterBar;
