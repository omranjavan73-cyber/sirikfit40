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
      {/* 1. Sleek Support Popup / Modal Card */}
      <SupportPopup isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* 2. Floating Support Launcher - Clean, Transparent, with Self-Contained Online Status LED */}
      <div className="fixed bottom-20 left-4 z-40 font-['Vazirmatn',sans-serif]">
        <button
          id="floating-support-trigger"
          type="button"
          onClick={toggleDrawer}
          aria-label="پشتیبانی آنلاین"
          title="پشتیبانی و مشاوره تخصصی سیریک فیت"
          className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center p-0 bg-transparent border-0 shadow-none hover:scale-105 active:scale-95 transition-transform cursor-pointer outline-none select-none"
        >
          {isDrawerOpen ? (
            <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-md transition-transform border border-white/20">
              <X className="w-5 h-5" />
            </div>
          ) : (
            <>
              <SupportHeadsetLogo className="w-full h-full drop-shadow-sm" />
              
              {/* Localized Subtle Online Status LED */}
              <span className="absolute top-0 right-0 w-3 h-3 flex items-center justify-center pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-xs ring-1.5 ring-white dark:ring-zinc-900" />
              </span>
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default FloatingSupportWidget;
