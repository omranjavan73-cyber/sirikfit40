import React from 'react';
import { AdminTelegramSettings } from '../../components/AdminTelegramSettings';
import type { CmsConfig } from '../../types';

interface SettingsAdminProps {
  cms?: CmsConfig;
  onUpdateCms?: (updatedCms: CmsConfig) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsAdmin: React.FC<SettingsAdminProps> = ({
  cms,
  onUpdateCms,
  showToast
}) => {
  return (
    <div className="space-y-6">
      <AdminTelegramSettings
        showToast={showToast}
        onSaved={(config) => {
          if (cms && onUpdateCms) {
            const updated = {
              ...cms,
              apiConfig: {
                ...(cms.apiConfig || {}),
                telegramBotToken: config.botToken,
                adminChatId: config.chatId,
                telegramNotifyEnabled: config.enabled
              }
            };
            onUpdateCms(updated as any);
          }
        }}
      />
    </div>
  );
};

export default SettingsAdmin;
