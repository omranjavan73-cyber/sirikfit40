import React from 'react';

interface SirikFitLogoProps {
  className?: string;
  size?: number;
  light?: boolean;
}

export const SirikFitLogo: React.FC<SirikFitLogoProps> = ({ className = "w-12 h-12", size, light: _light }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`${className} shrink-0`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer White Circle with Thick Black Border Ring */}
      <circle cx="100" cy="100" r="94" fill="#FFFFFF" stroke="#111111" strokeWidth="8" />

      {/* Top Muscle Silhouette & Red Swoosh */}
      <g transform="translate(0, -2)">
        {/* Red Dynamic Swoosh behind head/shoulder */}
        <path
          d="M 60 80 C 58 52 90 38 140 43"
          fill="none"
          stroke="#E50914"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Head */}
        <circle cx="100" cy="38" r="7.5" fill="#111111" />

        {/* Bodybuilder flexed arms & shoulders silhouette */}
        <path
          d="M 94 46 C 88 46 80 50 76 56 C 72 61 65 60 61 56 C 57 52 55 43 61 39 C 67 35 72 40 75 46 C 83 38 92 39 98 42 C 104 39 113 38 121 46 C 124 40 129 35 135 39 C 141 43 139 52 135 56 C 131 60 124 61 120 56 C 116 50 108 46 102 46 Z"
          fill="#111111"
        />
        {/* Torso V-taper */}
        <path d="M 88 54 L 112 54 L 118 70 C 108 74 88 74 78 70 Z" fill="#111111" />
      </g>

      {/* Heavy Slanted SF Monogram */}
      <g transform="translate(38, 68)">
        {/* 'S' in Heavy Black */}
        <path
          d="M 50 18 L 18 18 L 12 30 L 36 30 L 26 52 L 0 52 L 6 38 L 18 38 L 24 26 L 0 26 L 10 6 L 58 6 Z"
          fill="#111111"
        />
        {/* 'F' in Bold Crimson Red */}
        <path
          d="M 64 6 L 106 6 L 100 18 L 72 18 L 66 30 L 92 30 L 86 42 L 60 42 L 55 52 L 41 52 Z"
          fill="#E50914"
        />
      </g>

      {/* Subtext arc/straight: SIRIK FIT */}
      <text
        x="100"
        y="158"
        fontSize="13.5"
        fontWeight="900"
        fontStyle="italic"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#111111"
        textAnchor="middle"
        letterSpacing="1"
      >
        SIRIK FIT
      </text>
    </svg>
  );
};

