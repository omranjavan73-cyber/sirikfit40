import React from 'react';

export interface SupportHeadsetLogoProps {
  className?: string;
  size?: number | string;
  bubbleColor?: string;
  headsetColor?: string;
  dotsColor?: string;
}

/**
 * Live Customer Support Agent Chat Bubble with Over-Ear Headset SVG
 * Pixel-perfect match for the vibrant red speech bubble with 3 white dots and dark navy blue over-ear headset with mic.
 */
export const SupportHeadsetLogo: React.FC<SupportHeadsetLogoProps> = ({
  className = 'w-8 h-8',
  size,
  bubbleColor = '#E51A24', // Vibrant Red matching reference
  headsetColor = '#1D2342', // Dark Navy Blue matching reference
  dotsColor = '#FFFFFF'    // Crisp White
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 200 200"
      className={`inline-block select-none ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="پشتیبانی سیریک فیت"
    >
      {/* 1. Headset Headband Arch (Behind bubble edges) */}
      <path
        d="M 43 96 C 43 50 68 22 100 22 C 132 22 157 50 157 96"
        stroke={headsetColor}
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />

      {/* 2. Red Speech Bubble with Down-Right Curved Pointer Tail */}
      <path
        d="M 100 28
           C 137 28 164 55 164 92
           C 164 110 157 126 145 137
           C 147 149 155 161 166 168
           C 148 167 130 159 117 148
           C 111 151 106 153 100 153
           C 63 153 36 126 36 92
           C 36 55 63 28 100 28 Z"
        fill={bubbleColor}
      />

      {/* 3. Three Chat Indicator Dots (White) */}
      <circle cx="70" cy="92" r="10" fill={dotsColor} />
      <circle cx="100" cy="92" r="10" fill={dotsColor} />
      <circle cx="130" cy="92" r="10" fill={dotsColor} />

      {/* 4. Left Over-Ear Cushion (Dark Navy) */}
      <rect
        x="22"
        y="72"
        width="19"
        height="40"
        rx="9.5"
        fill={headsetColor}
      />

      {/* 5. Right Over-Ear Cushion (Dark Navy) */}
      <rect
        x="159"
        y="72"
        width="19"
        height="40"
        rx="9.5"
        fill={headsetColor}
      />

      {/* 6. Microphone Boom Arm curving from left cushion to front of mouth */}
      <path
        d="M 33 106
           C 33 138 52 148 76 148
           L 84 148"
        stroke={headsetColor}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* 7. Microphone Capsule / Mic Tip (Rounded Pill in Dark Navy) */}
      <rect
        x="77"
        y="140.5"
        width="22"
        height="15"
        rx="7.5"
        fill={headsetColor}
      />
    </svg>
  );
};

export default SupportHeadsetLogo;
