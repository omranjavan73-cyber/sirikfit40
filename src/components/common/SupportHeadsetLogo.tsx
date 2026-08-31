import React from 'react';

export interface SupportHeadsetLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'vivid' | 'monochrome';
}

/**
 * High-Contrast Vivid Red & Navy Customer Support Vector Icon
 * Headset with deep navy band/earcups, vivid red central speech bubble (#e5252a), and crisp white 3 cutout dots.
 */
export const SupportHeadsetLogo: React.FC<SupportHeadsetLogoProps> = ({
  className = 'w-full h-full drop-shadow-[0_4px_12px_rgba(229,37,42,0.4)]',
  size,
  variant = 'vivid'
}) => {
  const style = size ? { width: size, height: size } : undefined;

  if (variant === 'monochrome') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`inline-block select-none ${className}`}
        style={style}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="پشتیبانی سیریک فیت"
      >
        <path d="M4 10C2.9 10 2 10.9 2 12V14C2 15.1 2.9 16 4 16H5V10H4Z" />
        <path d="M19 10H20C21.1 10 22 10.9 22 12V14C22 15.1 21.1 16 20 16H19V10Z" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.48 2 2 6.48 2 12C2 12.34 2.02 12.67 2.05 13H4.07C4.02 12.67 4 12.34 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 12.34 19.98 12.67 19.93 13H21.95C21.98 12.67 22 12.34 22 12C22 6.48 17.52 2 12 2ZM18 13C18 15.42 16.5 17.5 14.34 18.36L13.5 16.54C15.02 15.93 16 14.56 16 13V12H18V13ZM12.5 19.5C12.5 18.67 11.83 18 11 18C10.17 18 9.5 18.67 9.5 19.5C9.5 20.33 10.17 21 11 21C11.83 21 12.5 20.33 12.5 19.5Z"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 6C8.69 6 6 8.46 6 11.5C6 13.06 6.7 14.47 7.84 15.48L7.2 18L9.9 16.74C10.55 16.91 11.26 17 12 17C15.31 17 18 14.54 18 11.5C18 8.46 15.31 6 12 6ZM9.5 12.5C8.95 12.5 8.5 12.05 8.5 11.5C8.5 10.95 8.95 10.5 9.5 10.5C10.05 10.5 10.5 10.95 10.5 11.5C10.5 12.05 10.05 12.5 9.5 12.5ZM12 12.5C11.45 12.5 11 12.05 11 11.5C11 10.95 11.45 10.5 12 10.5C12.55 10.5 13 10.95 13 11.5C13 12.05 12.55 12.5 12 12.5ZM14.5 12.5C13.95 12.5 13.5 12.05 13.5 11.5C13.5 10.95 13.95 10.5 14.5 10.5C15.05 10.5 15.5 10.95 15.5 11.5C15.5 12.05 15.05 12.5 14.5 12.5Z"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className={`inline-block select-none ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="پشتیبانی و مشاوره تخصصی سیریک فیت"
    >
      {/* Headset Frame (Deep Navy #1a2238) */}
      <path d="M18 48 C18 24 32 10 50 10 C68 10 82 24 82 48" stroke="#1a2238" strokeWidth="8" strokeLinecap="round" />
      <rect x="10" y="44" width="10" height="22" rx="5" fill="#1a2238" />
      <rect x="80" y="44" width="10" height="22" rx="5" fill="#1a2238" />
      <path d="M15 62 C15 74 26 80 40 80" stroke="#1a2238" strokeWidth="6" strokeLinecap="round" />
      <circle cx="44" cy="80" r="6" fill="#1a2238" />
      
      {/* Central Speech Bubble (Vivid Red #e5252a) */}
      <circle cx="50" cy="48" r="28" fill="#e5252a" />
      <path d="M50 76 C58 76 68 80 74 84 C71 77 71 73 69 69 Z" fill="#e5252a" />
      
      {/* 3 Cutout Dots (Crisp White #ffffff) */}
      <circle cx="38" cy="48" r="3.5" fill="#ffffff" />
      <circle cx="50" cy="48" r="3.5" fill="#ffffff" />
      <circle cx="62" cy="48" r="3.5" fill="#ffffff" />
    </svg>
  );
};

export default SupportHeadsetLogo;
