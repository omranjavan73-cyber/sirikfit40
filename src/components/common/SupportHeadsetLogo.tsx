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
 * Matching the red rounded speech bubble with 3 white dots and dark navy headset & mic.
 */
export const SupportHeadsetLogo: React.FC<SupportHeadsetLogoProps> = ({
  className = 'w-8 h-8',
  size,
  bubbleColor = '#E31837', // Vibrant Red
  headsetColor = '#181E36', // Dark Obsidian / Navy
  dotsColor = '#FFFFFF'    // White
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
      {/* 1. Red Speech Bubble with Bottom-Right Pointer Tail */}
      <path
        d="M 100 26 
           C 142 26 170 54 170 96 
           C 170 138 142 166 100 166 
           C 92 166 84 164 77 161 
           C 66 172 49 178 30 180 
           C 40 171 47 159 48 147 
           C 36 134 30 116 30 96 
           C 30 54 58 26 100 26 Z"
        fill={bubbleColor}
      />

      {/* 2. Three Chat Indicator Dots (White) */}
      <circle cx="70" cy="96" r="10.5" fill={dotsColor} />
      <circle cx="100" cy="96" r="10.5" fill={dotsColor} />
      <circle cx="130" cy="96" r="10.5" fill={dotsColor} />

      {/* 3. Headset Arch (Headband over top of bubble) */}
      <path
        d="M 33 102 
           C 30 54 62 18 100 18 
           C 138 18 170 54 167 102"
        stroke={headsetColor}
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />

      {/* 4. Left Ear Cushion */}
      <rect
        x="18"
        y="80"
        width="18"
        height="38"
        rx="9"
        fill={headsetColor}
      />

      {/* 5. Right Ear Cushion */}
      <rect
        x="164"
        y="80"
        width="18"
        height="38"
        rx="9"
        fill={headsetColor}
      />

      {/* 6. Microphone Boom Arm curving from left earpiece towards mouth */}
      <path
        d="M 27 114 
           C 27 142 42 156 70 156 
           L 84 156"
        stroke={headsetColor}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* 7. Microphone Capsule / Mic Tip */}
      <rect
        x="78"
        y="149"
        width="22"
        height="14"
        rx="7"
        fill={headsetColor}
      />
    </svg>
  );
};

export default SupportHeadsetLogo;
