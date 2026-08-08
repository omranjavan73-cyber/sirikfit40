import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CmsConfig, HomeBanner } from '../types';

interface HeroBannerProps {
  cms?: CmsConfig | null;
}

const DEFAULT_HOME_BANNERS: HomeBanner[] = [
  {
    id: 'b1',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop',
    linkUrl: 'https://drnutrition.com',
    title: 'بنر شماره ۱',
    enabled: true
  },
  {
    id: 'b2',
    imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=1200&auto=format&fit=crop',
    linkUrl: 'https://lifepharmacy.com',
    title: 'بنر شماره ۲',
    enabled: true
  }
];

export const HeroBanner: React.FC<HeroBannerProps> = ({ cms }) => {
  // Determine banner list from General Settings (cms.homeBanners)
  const sourceBanners = (cms?.homeBanners && cms.homeBanners.length > 0)
    ? cms.homeBanners
    : DEFAULT_HOME_BANNERS;

  // Filter active banners (enabled !== false)
  const activeBanners = sourceBanners.filter(
    (b) => b.enabled !== false && Boolean(b.imageUrl || b.linkUrl)
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset index if activeBanners changes or shrinks
  useEffect(() => {
    if (currentIndex >= activeBanners.length) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  // Auto rotation every 3 seconds (3000ms)
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % activeBanners.length);
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeBanners.length, isPaused]);

  if (activeBanners.length === 0) {
    return null;
  }

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];
  const targetLink = currentBanner.linkUrl || 'https://drnutrition.com';
  const isExternal = targetLink.startsWith('http://') || targetLink.startsWith('https://');

  return (
    <div
      id="sports-hero-banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full my-2 rounded-2xl overflow-hidden shadow-xs border border-slate-200/60 bg-slate-100 transition-all group"
    >
      {/* Clickable Image Only */}
      <a
        href={targetLink}
        target={isExternal ? '_blank' : '_self'}
        rel="noopener noreferrer"
        className="block w-full h-28 sm:h-36 md:h-40 overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
      >
        <img
          key={currentBanner.id || currentIndex}
          src={currentBanner.imageUrl}
          alt={currentBanner.title || 'Banner'}
          className="w-full h-full object-cover block transition-all duration-500 ease-in-out"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop';
          }}
        />
      </a>

      {/* Subtle faint white arrows for next/previous (optional navigation) */}
      {activeBanners.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute top-1/2 left-2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/20 hover:bg-black/50 text-white/50 hover:text-white flex items-center justify-center transition opacity-40 group-hover:opacity-100 cursor-pointer"
            title="بنر قبلی"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="absolute top-1/2 right-2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/20 hover:bg-black/50 text-white/50 hover:text-white flex items-center justify-center transition opacity-40 group-hover:opacity-100 cursor-pointer"
            title="بنر بعدی"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </>
      )}
    </div>
  );
};

