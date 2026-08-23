import React, { useState } from 'react';

interface ENamadBadgeProps {
  id?: string;
  code?: string;
  className?: string;
  showContainer?: boolean;
}

export const ENamadBadge: React.FC<ENamadBadgeProps> = ({
  id = '7355626',
  code = 'jj9HCtmWurzgveMEKQyc6iOcMamK4RG8',
  className = '',
  showContainer = true
}) => {
  const [loadError, setLoadError] = useState(false);

  const cleanId = (id || '7355626').trim();
  const cleanCode = (code || 'jj9HCtmWurzgveMEKQyc6iOcMamK4RG8').trim();

  // Official eNAMAD Target Link & Image URL derived from the snippet
  const verificationUrl = `https://trustseal.enamad.ir/?id=${cleanId}&Code=${cleanCode}`;
  const logoImageUrl = `https://trustseal.enamad.ir/logo.aspx?id=${cleanId}&Code=${cleanCode}`;

  const badgeContent = !loadError ? (
    <a
      referrerPolicy="origin"
      target="_blank"
      rel="noopener noreferrer"
      href={verificationUrl}
      className="flex items-center justify-center cursor-pointer"
    >
      <img
        referrerPolicy="origin"
        src={logoImageUrl}
        alt="نماد تجارت الکترونیکی اینماد"
        style={{ cursor: 'pointer' }}
        className="max-h-24 w-auto object-contain hover:scale-105 transition-transform"
        onError={() => setLoadError(true)}
      />
    </a>
  ) : (
    <a
      referrerPolicy="origin"
      target="_blank"
      rel="noopener noreferrer"
      href={verificationUrl}
      className="flex flex-col items-center justify-center p-2 text-center text-decoration-none group cursor-pointer"
    >
      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-500/30 flex items-center justify-center font-bold text-xs mb-1 group-hover:scale-110 transition-transform">
        eNAMAD
      </div>
      <span className="text-[11px] font-black text-gray-900">اینماد رسمی</span>
      <span className="text-[9px] font-bold text-emerald-600">احراز هویت شده</span>
    </a>
  );

  if (!showContainer) {
    return badgeContent;
  }

  return (
    <div className={`inline-flex items-center justify-center p-3 bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all min-h-[105px] min-w-[105px] ${className}`}>
      {badgeContent}
    </div>
  );
};
