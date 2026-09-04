import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CmsConfig, HomeBanner } from '../types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { isFirestoreGrpcNoise } from '../firebase';
import { getHomeSettings } from '../services/settingsService';

interface HeroBannerProps {
  cms?: CmsConfig | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ cms }) => {
  const [banners, setBanners] = useState<HomeBanner[]>(() => {
    if (Array.isArray(cms?.homeBanners) && cms.homeBanners.length > 0) {
      return cms.homeBanners;
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sirikfit_home_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          const b = parsed?.banners || parsed?.homeBanners;
          if (Array.isArray(b) && b.length > 0) return b;
        }
      } catch (_) {}
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => banners.length === 0);

  // Sync with prop cms
  useEffect(() => {
    if (Array.isArray(cms?.homeBanners) && cms.homeBanners.length > 0) {
      setBanners(cms.homeBanners);
      setIsLoading(false);
    }
  }, [cms?.homeBanners]);

  // Real-time listener on settings/home
  useEffect(() => {
    if (!db) return;

    if (banners.length === 0) {
      getHomeSettings().then((homeData) => {
        const b = homeData.banners || homeData.homeBanners;
        if (Array.isArray(b) && b.length > 0) {
          setBanners(b);
        }
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    }

    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(doc(db, 'settings', 'home'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const b = data.banners || data.homeBanners;
          if (Array.isArray(b) && b.length > 0) {
            setBanners(b);
            setIsLoading(false);
          }
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('HeroBanner settings/home listener notice:', err);
      });
    } catch (_e) {}

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Filter active banners (enabled !== false)
  const activeBanners = (banners || []).filter(
    (b) => b && b.enabled !== false && Boolean(b.imageUrl || b.linkUrl)
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

  if (isLoading && activeBanners.length === 0) {
    return (
      <div className="w-full h-36 sm:h-48 md:h-56 mt-0 mb-3 rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse border border-slate-200/60 shadow-xs" />
    );
  }

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
      className="relative w-full mt-0 mb-3 rounded-2xl overflow-hidden shadow-xs border border-slate-200/60 bg-slate-100 transition-all group"
    >
      {/* Clickable Image Only */}
      <a
        href={targetLink}
        target={isExternal ? '_blank' : '_self'}
        rel="noopener noreferrer"
        className="block w-full h-36 sm:h-48 md:h-56 overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
      >
        <img
          key={currentBanner.id || currentIndex}
          src={currentBanner.imageUrl}
          alt={currentBanner.title || 'Banner'}
          className="w-full h-full object-cover object-center block transition-all duration-500 ease-in-out"
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

