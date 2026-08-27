import React from 'react';
import { X } from 'lucide-react';
import { useSupport } from '../../context/SupportContext';
import { SupportPopup } from './SupportPopup';

/**
 * Customer Service Agent with Over-Ear Headset & Tie Silhouette SVG
 */
const CustomerAgentHeadsetSvg: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Head & Face */}
    <path d="M12 4a3.5 3.5 0 0 0-3.5 3.5v2.2A3.5 3.5 0 0 0 12 13.2a3.5 3.5 0 0 0 3.5-3.5V7.5A3.5 3.5 0 0 0 12 4z" />
    
    {/* Over-ear Headset Headband */}
    <path
      d="M12 2.2a5.8 5.8 0 0 0-5.8 5.8v2.2a1 1 0 0 0 1 1h.4a.8.8 0 0 0 .8-.8V7.8A3.6 3.6 0 0 1 12 4.2a3.6 3.6 0 0 1 3.6 3.6v2.6a.8.8 0 0 0 .8.8h.4a1 1 0 0 0 1-1V8A5.8 5.8 0 0 0 12 2.2z"
      fillRule="evenodd"
    />
    
    {/* Left & Right Ear Cushions */}
    <rect x="5.8" y="7.5" width="2" height="3.8" rx="1" />
    <rect x="16.2" y="7.5" width="2" height="3.8" rx="1" />
    
    {/* Microphone Boom Arm curving to mouth */}
    <path
      d="M6.8 10.5v1.2a1.8 1.8 0 0 0 1.8 1.8h2.6a.6.6 0 0 0 .6-.6v-.3a.6.6 0 0 0-.6-.6H8.6a.6.6 0 0 1-.6-.6v-.9H6.8z"
    />
    {/* Mic Tip */}
    <rect x="11.4" y="12" width="1.6" height="1.2" rx="0.5" />

    {/* Shoulders & Suit Torso */}
    <path d="M4.5 19.5c0-2.8 2.5-4.8 5.5-5.2l.8 1.8-1 3.4H4.5z" opacity="0.95" />
    <path d="M19.5 19.5c0-2.8-2.5-4.8-5.5-5.2l-.8 1.8 1 3.4h5.3z" opacity="0.95" />
    
    {/* Shirt Collar & Tie */}
    <path d="M10.8 14.5l1.2 1.4 1.2-1.4 1.1 1.2-2.3 3.8-2.3-3.8z" />
    <polygon points="12,16 11.2,19.5 12.8,19.5" fill="currentColor" />
  </svg>
);

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

      {/* 2. Floating Support Trigger Badge (Rounded Squircle Card with Isolated External Pulsing Ring) */}
      <div className="fixed bottom-24 left-4 sm:bottom-6 sm:left-6 md:bottom-8 md:left-8 z-50 font-['Vazirmatn',sans-serif]">
        <div className="relative">
          {/* Dedicated External Background Ring for Animation */}
          <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-500 animate-ping opacity-75 pointer-events-none" />

          {/* 100% Solid Opaque Squircle Button Container (Static & Always Opacity-100) */}
          <button
            id="floating-support-trigger"
            type="button"
            onClick={toggleDrawer}
            aria-label="پشتیبانی و مشاوره آنلاین سیریک فیت"
            title="پشتیبانی و مشاوره خرید سیریک فیت"
            className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 z-50 group opacity-100"
          >
            {/* Center Avatar Icon: Customer Support Agent with Headset */}
            {isDrawerOpen ? (
              <X className="w-7 h-7 text-slate-900 dark:text-white transition-transform duration-200 rotate-90 scale-105" />
            ) : (
              <div className="text-slate-900 dark:text-white transition-transform duration-200 group-hover:scale-105 flex items-center justify-center">
                <CustomerAgentHeadsetSvg className="w-9 h-9 sm:w-10 sm:h-10" />
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default FloatingSupportWidget;
