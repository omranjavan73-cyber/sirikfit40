import React from 'react';
import { StoreEditor } from '../../components/admin/StoreEditor';
import type { StoreSettings } from '../../types/store';
import type { CmsConfig } from '../../types';

export interface StoreManagementAdminProps {
  cms?: CmsConfig | null;
  onSaveCms?: (cms: CmsConfig) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const StoreManagementAdmin: React.FC<StoreManagementAdminProps> = ({
  cms,
  onSaveCms,
  showToast
}) => {
  const initialStores = (cms?.stores as StoreSettings[]) || undefined;

  const handleStoresSaved = (savedStores: StoreSettings[]) => {
    if (cms && onSaveCms) {
      onSaveCms({
        ...cms,
        stores: savedStores as any
      });
    }
  };

  return (
    <div className="space-y-6">
      <StoreEditor
        initialStores={initialStores}
        onStoresSaved={handleStoresSaved}
        showToast={showToast}
      />
    </div>
  );
};

export default StoreManagementAdmin;
