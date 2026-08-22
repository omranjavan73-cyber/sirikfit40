import React from 'react';
import { Home, PackageCheck, Sparkles, User } from 'lucide-react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showLocalInventory?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  showLocalInventory = true
}) => {
  const tabs = [
    {
      id: 'main' as TabType,
      label: 'صفحه اصلی',
      icon: Home
    },
    ...(showLocalInventory
      ? [
          {
            id: 'inventory' as TabType,
            label: 'انبار ایران',
            icon: PackageCheck
          }
        ]
      : []),
    {
      id: 'deals' as TabType,
      label: 'پیشنهادها',
      icon: Sparkles
    },
    {
      id: 'account' as TabType,
      label: 'حساب کاربری',
      icon: User
    }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 px-2 py-1.5 shadow-lg font-['Vazirmatn',sans-serif]"
      style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className={`max-w-md mx-auto grid gap-1 ${showLocalInventory ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-neutral-900 font-extrabold'
                  : 'text-neutral-400 hover:text-black font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-105 text-black' : 'text-neutral-400'
                  }`}
                />
              </div>

              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors whitespace-nowrap ${
                  isActive ? 'text-black font-black' : 'text-neutral-400 font-medium'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-4 h-0.5 bg-black rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

