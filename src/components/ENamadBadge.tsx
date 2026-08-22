import React, { useState } from 'react';
import { ENAMAD_CONFIG } from '../types';
import { ShieldCheck } from 'lucide-react';

export interface ENamadBadgeProps {
  className?: string;
  imgClassName?: string;
  id?: string;
  code?: string;
  showContainer?: boolean;
}

/**
 * Reusable eNAMAD Trust Symbol Component
 * Strictly complies with official eNAMAD specification:
 * - Official verification page opened on click in a new tab
 * - target="_blank", rel="noopener noreferrer", referrerPolicy="origin"
 * - Official logo from trustseal.enamad.ir with graceful fallback on connection timeout
 * - Permanent stable rendering
 */
export const ENamadBadge: React.FC<ENamadBadgeProps> = ({
  className = '',
  imgClassName = 'max-h-20 w-auto object-contain cursor-pointer hover:scale-105 transition-transform',
  id = ENAMAD_CONFIG.id,
  code = ENAMAD_CONFIG.code,
  showContainer = true
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const verificationUrl = `https://trustseal.enamad.ir/?id=${id}&Code=${code}`;
  const logoUrl = `https://trustseal.enamad.ir/logo.aspx?id=${id}&Code=${code}`;

  const badgeContent = (
    <a
      href={verificationUrl}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="origin"
      title="نماد اعتماد الکترونیکی - فروشگاه سیریک فیت"
      className="inline-flex items-center justify-center cursor-pointer select-none"
    >
      {!imgFailed ? (
        <img
          src={logoUrl}
          alt="نماد تجارت الکترونیکی اینماد"
          referrerPolicy="origin"
          className={imgClassName}
          loading="lazy"
          width={90}
          height={90}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1.5 p-2 text-center select-none group">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-black text-slate-800">اینماد الکترونیکی</span>
          <span className="text-[9px] font-bold text-emerald-600">تأیید شده</span>
        </div>
      )}
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

