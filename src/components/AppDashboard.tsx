import React from 'react';
import { PackageCheck, ArrowLeft } from 'lucide-react';
import type { FinancialSettings, CmsConfig, User } from '../types';

interface AppDashboardProps {
  settings: FinancialSettings;
  cms?: CmsConfig | null;
  currentUser?: User | null;
  onOpenCalculator: () => void;
  onSelectCategory: (category: string) => void;
  onOpenSupport: () => void;
  onOpenLocalStock: () => void;
  isCalculatorOpen: boolean;
}

export const AppDashboard: React.FC<AppDashboardProps> = ({
  cms,
  onOpenLocalStock
}) => {
  const isLocalInventoryEnabled = cms?.features?.showLocalInventory ?? cms?.showLocalInventory ?? true;
  if (!isLocalInventoryEnabled) {
    return null;
  }

  const bannerTitle = cms?.warehouseBannerTitle || 'کالاهای موجود در انبار ایران (ارسال فوری)';
  const bannerSubtitle = cms?.warehouseBannerSubtitle || 'تحویل ۱ تا ۲ روزه در سراسر کشور • کالاها پلمپ و اورجینال';
  const buttonText = cms?.warehouseBannerButtonText || 'جستجو و مشاهده همه';
  const theme = cms?.warehouseBannerTheme || 'light';

  // Streamlined color themes adhering to #E5E5E5 outer border and #111111 button outlines
  let containerStyle = 'bg-white border-[1.5px] border-[#E5E5E5] text-[#111111] hover:border-[#111111] shadow-2xs';
  let iconBadgeStyle = 'bg-[#111111] text-white shadow-xs';
  let btnStyle = 'bg-white border-[1.5px] border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white font-extrabold';

  if (theme === 'dark') {
    containerStyle = 'bg-[#111111] border-none text-white shadow-md';
    iconBadgeStyle = 'bg-white text-[#111111] shadow-xs';
    btnStyle = 'bg-white text-[#111111] hover:bg-neutral-100 font-extrabold';
  } else if (theme === 'emerald') {
    containerStyle = 'bg-emerald-50/80 border-[1.5px] border-emerald-200 text-emerald-950 shadow-2xs';
    iconBadgeStyle = 'bg-emerald-700 text-white shadow-xs';
    btnStyle = 'bg-white border-[1.5px] border-emerald-700 text-emerald-800 hover:bg-emerald-700 hover:text-white font-extrabold';
  } else if (theme === 'amber') {
    containerStyle = 'bg-amber-50/80 border-[1.5px] border-amber-200 text-amber-950 shadow-2xs';
    iconBadgeStyle = 'bg-amber-800 text-white shadow-xs';
    btnStyle = 'bg-white border-[1.5px] border-amber-800 text-amber-900 hover:bg-amber-800 hover:text-white font-extrabold';
  }

  return (
    <div id="warehouse-promo-banner" className="space-y-4 font-['Vazirmatn',sans-serif]">
      {/* Streamlined, high-contrast & sleek promo banner for Iran Warehouse */}
      <button
        type="button"
        onClick={onOpenLocalStock}
        className={`w-full ${containerStyle} rounded-[16px] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-all duration-200 cursor-pointer text-right group animate-fade-in relative overflow-hidden`}
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-xl ${iconBadgeStyle} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
            <PackageCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="font-black text-xs sm:text-sm tracking-tight block truncate text-[#111111]">
                {bannerTitle}
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                موجود در ایران
              </span>
            </div>
            <p className="text-[11px] opacity-75 font-medium block truncate">
              {bannerSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end shrink-0">
          <span className={`text-[11px] px-4 py-2 rounded-[12px] shadow-2xs flex items-center gap-1.5 transition-all group-hover:gap-2 ${btnStyle}`}>
            <span>{buttonText}</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
        </div>
      </button>
    </div>
  );
};
