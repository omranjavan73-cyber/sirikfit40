import React from 'react';
import type { CmsConfig } from '../types';
import { LandingSettingsAdmin } from '../pages/admin/LandingSettingsAdmin';

interface AdminLandingSettingsProps {
  cms?: CmsConfig | null;
  onSaveCms?: (updatedCms: CmsConfig) => Promise<void>;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

export const AdminLandingSettings: React.FC<AdminLandingSettingsProps> = ({
  showToast
}) => {
  return (
    <LandingSettingsAdmin
      onSaved={() => {
        if (showToast) {
          showToast('تنظیمات لندینگ با موفقیت ذخیره شد', 'success');
        }
      }}
    />
  );
};
