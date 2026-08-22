import React, { useState } from 'react';
import { ENAMAD_CONFIG } from '../types';

export interface ENamadBadgeProps {
  className?: string;
  imgClassName?: string;
  id?: string;
  code?: string;
  showContainer?: boolean;
}

/**
 * Reusable eNAMAD Trust Symbol Component
 * Strictly complies with eNAMAD specification:
 * - Official verification page opened on click in a new tab
 * - target="_blank", rel="noopener noreferrer", referrerPolicy="origin"
 * - Official logo from trustseal.enamad.ir
 * - Robust error handling (does not crash or show broken icons if network is offline)
 */
export const ENamadBadge: React.FC<ENamadBadgeProps> = ({
  className = '',
  imgClassName = 'h-16 sm:h-20 w-auto object-contain cursor-pointer transition-transform duration-200 hover:scale-105',
  id = ENAMAD_CONFIG.id,
  code = ENAMAD_CONFIG.code,
  showContainer = true
}) => {
  const [imageError, setImageError] = useState(false);

  const verificationUrl = `https://trustseal.enamad.ir/?id=${id}&Code=${code}`;
  const logoUrl = `https://trustseal.enamad.ir/logo.aspx?id=${id}&Code=${code}`;

  if (imageError) {
    return null;
  }

  const badgeContent = (
    <a
      href={verificationUrl}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="origin"
      title="نماد اعتماد الکترونیکی - فروشگاه سیریک فیت"
      className="inline-flex items-center justify-center cursor-pointer select-none"
    >
      <img
        src={logoUrl}
        alt="نماد اعتماد الکترونیکی"
        referrerPolicy="origin"
        className={imgClassName}
        onError={() => setImageError(true)}
        loading="lazy"
        width={100}
        height={100}
      />
    </a>
  );

  if (!showContainer) {
    return badgeContent;
  }

  return (
    <div className={`p-3 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-center min-h-[90px] min-w-[90px] ${className}`}>
      {badgeContent}
    </div>
  );
};

export default ENamadBadge;
