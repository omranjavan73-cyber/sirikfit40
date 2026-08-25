import React from 'react';
import { AdminTelegramSettings } from '../../components/AdminTelegramSettings';
import type { CmsConfig, TelegramConfig } from '../../types';

interface ApiSettingsAdminProps {
  cms?: CmsConfig;
  onUpdateCms?: (updatedCms: CmsConfig) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ApiSettingsAdmin: React.FC<ApiSettingsAdminProps> = ({
  cms,
  onUpdateCms,
  showToast
}) => {
  return (
    <div className="space-y-6">
      <AdminTelegramSettings
        showToast={showToast}
        onSaved={(config: TelegramConfig) => {
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

export default ApiSettingsAdmin;
