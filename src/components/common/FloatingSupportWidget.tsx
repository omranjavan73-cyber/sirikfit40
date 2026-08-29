import React from 'react';
import { X } from 'lucide-react';
import { useSupport } from '../../context/SupportContext';
import { SupportPopup } from './SupportPopup';
import { SupportHeadsetLogo } from './SupportHeadsetLogo';

export const FloatingSupportWidget: React.FC = () => {
  const { supportConfig, isDrawerOpen, setIsDrawerOpen, toggleDrawer } = useSupport();

  // If disabled by admin in settings/support_config, don't render
  if (supportConfig.isFloatingWidgetEnabled === false) {
    return null;
  }

  return (
    <>
      {/* 1. Sleek Half-Drawer / Popup Card */}
      <SupportPopup isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* 2. Floating Support Trigger Badge (Rounded Squircle with Fixed Pulsing Neon Border) */}
      <div className="fixed bottom-20 left-1 sm:bottom-6 sm:left-2 z-50 font-['Vazirmatn',sans-serif]">
        <div className="relative">
          {/* Fixed-size pulsing emerald neon ring */}
          <div
            className="absolute inset-0 rounded-2xl ring-2 ring-emerald-500 animate-pulse pointer-events-none"
          />

          {/* 100% Solid Opaque Squircle Button — static, always opacity-100, never fades */}
          <button
            id="floating-support-trigger"
            type="button"
            onClick={toggleDrawer}
            aria-label="پشتیبانی و مشاوره آنلاین سیریک فیت"
            title="پشتیبانی و مشاوره خرید سیریک فیت"
            className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 z-50 group opacity-100 p-1.5"
          >
            {/* Center Avatar Icon: Live Support Headset Chat Logo */}
            {isDrawerOpen ? (
              <X className="w-7 h-7 text-slate-900 dark:text-white transition-transform duration-200 rotate-90 scale-105" />
            ) : (
              <SupportHeadsetLogo className="w-9 h-9 sm:w-10 sm:h-10 transform group-hover:scale-105 transition-transform" />
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default FloatingSupportWidget;
