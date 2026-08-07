import React from 'react';

interface SpeedboatLoaderProps {
  statusText?: string;
}

export const SpeedboatLoader: React.FC<SpeedboatLoaderProps> = ({
  statusText = '🛥️ در حال دریافت کالا از دبی...'
}) => {
  return (
    <div className="bg-white border-[1.5px] border-[#E5E5E5] rounded-[16px] p-6 text-center shadow-xs flex flex-col items-center justify-center my-4 overflow-hidden relative">
      {/* Embedded CSS Animations for Boat Riding & Ocean Wave Loop */}
      <style>{`
        @keyframes boatRide {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-4px) rotate(-1.5deg);
          }
          50% {
            transform: translateY(-1px) rotate(1deg);
          }
          75% {
            transform: translateY(-5px) rotate(-1deg);
          }
        }
        @keyframes waveMove {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes sprayPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .animate-boat-ride {
          animation: boatRide 1.6s ease-in-out infinite;
        }
        .animate-wave-move {
          animation: waveMove 2.0s linear infinite;
        }
        .animate-spray {
          animation: sprayPulse 1.0s ease-in-out infinite;
        }
      `}</style>

      {/* Speedboat & Waves Animation Box */}
      <div className="relative w-48 h-28 flex flex-col items-center justify-center mb-3">
        {/* Speedboat SVG */}
        <div className="animate-boat-ride relative z-10">
          <svg
            width="90"
            height="40"
            viewBox="0 0 100 45"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-xs"
          >
            {/* Cabin / Windshield */}
            <path
              d="M38 16 L52 8 L65 16 Z"
              fill="#111111"
            />
            {/* Windshield glass highlight */}
            <path
              d="M42 15 L50 10 L58 15 Z"
              fill="#333333"
            />

            {/* Boat Hull Main Body (#111111) */}
            <path
              d="M10 24 L22 16 L78 16 L92 24 L82 34 L18 34 Z"
              fill="#111111"
            />

            {/* Subtle Red Accent Line (#FF3B30) along the hull side */}
            <path
              d="M18 24 H86"
              stroke="#FF3B30"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Driver/Seat Detail */}
            <circle cx="50" cy="13" r="2.5" fill="#FFFFFF" />

            {/* Engine Propeller Spray Back */}
            <path
              d="M8 28 C 4 28, 2 32, 0 34"
              stroke="#0284C7"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-spray"
            />
          </svg>
        </div>

        {/* Waves Container */}
        <div className="w-44 h-5 overflow-hidden relative -mt-1 z-0">
          <div className="w-[200%] h-full flex animate-wave-move">
            {/* Wave pattern repeated twice for smooth seamless loop */}
            <svg
              className="w-1/2 h-full text-slate-900"
              viewBox="0 0 200 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z"
                fill="#111111"
                opacity="0.12"
              />
              <path
                d="M0 14 Q 25 6, 50 14 T 100 14 T 150 14 T 200 14"
                stroke="#111111"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <svg
              className="w-1/2 h-full text-slate-900"
              viewBox="0 0 200 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z"
                fill="#111111"
                opacity="0.12"
              />
              <path
                d="M0 14 Q 25 6, 50 14 T 100 14 T 150 14 T 200 14"
                stroke="#111111"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="flex items-center gap-2 text-xs md:text-sm font-black text-[#111111] bg-[#F8FAFC] border border-[#E5E5E5] px-4 py-2.5 rounded-xl shadow-2xs">
        <span className="text-base animate-bounce">🛥️</span>
        <span>{statusText}</span>
      </div>
    </div>
  );
};
