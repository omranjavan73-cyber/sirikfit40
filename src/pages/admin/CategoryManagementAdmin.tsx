import React from 'react';
import { AdminTaxonomyManager } from '../../components/AdminTaxonomyManager';
import type { TaxonomyCategory } from '../../utils/taxonomyHelper';

interface CategoryManagementAdminProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onTaxonomyChange?: (categories: TaxonomyCategory[]) => void;
}

export const CategoryManagementAdmin: React.FC<CategoryManagementAdminProps> = (props) => {
  return <AdminTaxonomyManager {...props} />;
};

export default CategoryManagementAdmin;
