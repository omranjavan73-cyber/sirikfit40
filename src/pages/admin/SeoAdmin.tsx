import React from 'react';
import { AdminSeo } from '../../components/AdminSeo';
import type { CmsConfig } from '../../types';

interface SeoAdminProps {
  cms?: CmsConfig | null;
  onSave?: (updatedCms: CmsConfig) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const SeoAdmin: React.FC<SeoAdminProps> = (props) => {
  return <AdminSeo {...props} />;
};

export default SeoAdmin;
