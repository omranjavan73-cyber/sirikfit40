import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, ZoomIn, Sparkles, RefreshCw } from 'lucide-react';
import { toPersianDigits } from '../utils/formatters';

export interface TouchImageMagnifierProps {
  src: string;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  imageClassName?: string;
  onExpandFullscreen?: () => void;
  zoomScale?: number;
  badge?: React.ReactNode;
  showHints?: boolean;
}

export const TouchImageMagnifier: React.FC<TouchImageMagnifierProps> = ({
  src,
  alt = 'تصویر محصول',
  fallbackSrc = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600',
  className = '',
  imageClassName = '',
  onExpandFullscreen,
  zoomScale = 2.4,
  badge,
  showHints = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction States
  const [isHovered, setIsHovered] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isDoubleTapLocked, setIsDoubleTapLocked] = useState(false);
  const [pinchScale, setPinchScale] = useState(1);

  // Coordinates (Percentage 0-100 & Pixels inside container)
  const [coords, setCoords] = useState<{ x: number; y: number; px: number; py: number }>({
    x: 50,
    y: 50,
    px: 150,
    py: 150
  });

  // Image resolution/error handling
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setIsDoubleTapLocked(false);
    setPinchScale(1);
  }, [src, fallbackSrc]);

  // Touch tracking refs
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const initialPinchDistRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);

  // Helper to calculate coordinates from ClientX / ClientY
  const updateCoordsFromPoint = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawPx = clientX - rect.left;
    const rawPy = clientY - rect.top;

    const clampedPx = Math.max(0, Math.min(rect.width, rawPx));
    const clampedPy = Math.max(0, Math.min(rect.height, rawPy));

    const xPercent = Math.max(0, Math.min(100, (clampedPx / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (clampedPy / rect.height) * 100));

    setCoords({
      x: Math.round(xPercent * 10) / 10,
      y: Math.round(yPercent * 10) / 10,
      px: clampedPx,
      py: clampedPy
    });
  }, []);

  // Desktop Mouse Events
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!isDoubleTapLocked) {
      setPinchScale(1);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateCoordsFromPoint(e.clientX, e.clientY);
  };

  // Mobile Touch Event Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = touch.clientX;
      const clientY = touch.clientY;

      touchStartPosRef.current = { x: clientX, y: clientY };
      isDraggingRef.current = false;

      // Double-Tap Detection (within 300ms and 35px threshold)
      const timeDiff = now - lastTapRef.current.time;
      const distDiff = Math.hypot(clientX - lastTapRef.current.x, clientY - lastTapRef.current.y);

      if (timeDiff < 320 && distDiff < 40) {
        // Toggle locked zoom on double tap
        setIsDoubleTapLocked((prev) => {
          const next = !prev;
          if (next) {
            updateCoordsFromPoint(clientX, clientY);
            setPinchScale(zoomScale);
          } else {
            setPinchScale(1);
          }
          return next;
        });
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        return;
      }

      lastTapRef.current = { time: now, x: clientX, y: clientY };
      updateCoordsFromPoint(clientX, clientY);
      setIsTouching(true);
    } else if (e.touches.length === 2) {
      // 2-Finger Pinch Start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialPinchDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initialScaleRef.current = pinchScale > 1 ? pinchScale : 1;
      setIsPinching(true);
      setIsTouching(true);

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      updateCoordsFromPoint(midX, midY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const distFromStart = Math.hypot(
        touch.clientX - touchStartPosRef.current.x,
        touch.clientY - touchStartPosRef.current.y
      );

      if (distFromStart > 6) {
        isDraggingRef.current = true;
      }

      // If user is actively touching/dragging magnifier or is locked, prevent default scroll
      if (e.cancelable && (isTouching || isDoubleTapLocked)) {
        e.preventDefault();
      }

      updateCoordsFromPoint(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2 && initialPinchDistRef.current > 0) {
      // Pinch Gesture
      if (e.cancelable) {
        e.preventDefault();
      }
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = currentDist / initialPinchDistRef.current;
      const newScale = Math.max(1, Math.min(3.8, initialScaleRef.current * ratio));

      setPinchScale(newScale);

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      updateCoordsFromPoint(midX, midY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      setIsTouching(false);
      setIsPinching(false);
      initialPinchDistRef.current = 0;

      // If not locked and scale was small, reset scale
      if (!isDoubleTapLocked) {
        if (pinchScale < 1.15) {
          setPinchScale(1);
        }
      }
    } else if (e.touches.length === 1) {
      setIsPinching(false);
      initialPinchDistRef.current = 0;
      updateCoordsFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchCancel = () => {
    setIsTouching(false);
    setIsPinching(false);
    if (!isDoubleTapLocked) {
      setPinchScale(1);
    }
  };

  const handleResetZoom = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDoubleTapLocked(false);
    setIsTouching(false);
    setPinchScale(1);
  };

  // Determine current active scale
  const isZoomActive = isHovered || isTouching || isDoubleTapLocked || pinchScale > 1.05;
  const activeScale = pinchScale > 1.05 ? pinchScale : (isZoomActive ? zoomScale : 1);

  // Loupe position calculations (floating lens above finger)
  const containerRect = containerRef.current?.getBoundingClientRect();
  const contWidth = containerRect?.width || 320;
  const contHeight = containerRect?.height || 320;

  const loupeSize = Math.min(136, contWidth * 0.42);
  const loupeHalf = loupeSize / 2;

  // Position loupe ~85px above finger, flip below if too close to top
  const loupeTop = coords.py > (loupeSize + 20) ? (coords.py - loupeSize - 20) : (coords.py + 30);
  const loupeLeft = Math.max(10, Math.min(contWidth - loupeSize - 10, coords.px - loupeHalf));

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={() => {
        // Only open full lightbox if user didn't drag/move magnifier
        if (!isDraggingRef.current && !isDoubleTapLocked && !isTouching && onExpandFullscreen) {
          onExpandFullscreen();
        }
      }}
      style={{
        touchAction: (isTouching || isDoubleTapLocked || isPinching) ? 'none' : 'pan-y'
      }}
      className={`relative w-full overflow-hidden select-none cursor-zoom-in group ${className}`}
    >
      {/* Primary Zoomed Canvas / Image */}
      <img
        src={imgSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        style={{
          transformOrigin: `${coords.x}% ${coords.y}%`,
          transform: `scale(${activeScale})`
        }}
        className={`w-full h-full object-contain object-center transition-transform duration-100 ease-out will-change-transform ${imageClassName}`}
        onError={() => {
          if (imgSrc && !imgSrc.includes('images.weserv.nl') && !imgSrc.startsWith('data:')) {
            setImgSrc('https://images.weserv.nl/?url=' + encodeURIComponent(imgSrc));
          } else {
            setImgSrc(fallbackSrc);
          }
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* FLOATING MOBILE MAGNIFYING LOUPE (Follows Finger Smoothly)   */}
      {/* ------------------------------------------------------------- */}
      {isTouching && !isPinching && (
        <div
          style={{
            width: `${loupeSize}px`,
            height: `${loupeSize}px`,
            top: `${loupeTop}px`,
            left: `${loupeLeft}px`
          }}
          className="absolute pointer-events-none rounded-full border-[3px] border-white shadow-2xl ring-4 ring-black/20 overflow-hidden bg-slate-900 z-30 transition-opacity duration-150 animate-in fade-in zoom-in-75"
        >
          {/* Magnified Image Slice inside Loupe */}
          <div
            style={{
              backgroundImage: `url(${imgSrc})`,
              backgroundPosition: `${coords.x}% ${coords.y}%`,
              backgroundSize: `${contWidth * 3.2}px ${contHeight * 3.2}px`,
              backgroundRepeat: 'no-repeat'
            }}
            className="w-full h-full bg-slate-950"
          />

          {/* High-Precision Reticle Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full border border-amber-400/90 bg-amber-400/30 shadow-xs" />
            <div className="absolute w-6 h-[1px] bg-white/40" />
            <div className="absolute h-6 w-[1px] bg-white/40" />
          </div>

          {/* Zoom Multiplier Pill on Loupe */}
          <div className="absolute bottom-1.5 inset-x-0 flex justify-center pointer-events-none">
            <span className="text-[9px] font-black bg-black/80 backdrop-blur-xs text-amber-300 px-2 py-0.5 rounded-full border border-white/20 dir-ltr shadow-2xs">
              {toPersianDigits('2.8')}x زوم
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOUCH TOUCH-POINT TARGET INDICATOR                           */}
      {/* ------------------------------------------------------------- */}
      {isTouching && (
        <div
          style={{
            top: `${coords.py}px`,
            left: `${coords.px}px`
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
        >
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-amber-400/80 bg-amber-400/20 animate-ping" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-xs" />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FLOATING CONTROLS & BADGES                                   */}
      {/* ------------------------------------------------------------- */}

      {/* Top Left: Maximize / Fullscreen Button */}
      {onExpandFullscreen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpandFullscreen();
          }}
          className="absolute top-3 left-3 bg-white/90 hover:bg-white text-slate-800 p-2 sm:p-2.5 rounded-2xl shadow-sm border border-slate-200 transition active:scale-95 cursor-pointer z-20"
          title="مشاهده تمام صفحه تصویر"
          aria-label="مشاهده تمام صفحه تصویر"
        >
          <Maximize2 className="w-4 h-4 text-slate-700" />
        </button>
      )}

      {/* Top Right: Custom Image Counter or Badge */}
      {badge && (
        <div className="absolute top-3 right-3 z-20">
          {badge}
        </div>
      )}

      {/* Locked Zoom Active Indicator with Reset Action */}
      {isDoubleTapLocked && (
        <div className="absolute top-3 inset-x-0 mx-auto w-fit z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-black px-3.5 py-1.5 rounded-full border border-amber-400/50 shadow-lg animate-in fade-in slide-in-from-top-2">
          <span className="text-amber-400">⚡ زوم قفل شده ({toPersianDigits(Math.round(activeScale * 10) / 10)}x)</span>
          <button
            type="button"
            onClick={handleResetZoom}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg text-[10px] transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>عادی</span>
          </button>
        </div>
      )}

      {/* Minimalist Desktop Hint Only */}
      {showHints && (
        <div
          className={`absolute bottom-3 right-3 hidden sm:flex items-center gap-1.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg pointer-events-none transition-opacity duration-200 z-10 ${
            isHovered ? 'opacity-20' : 'opacity-85'
          }`}
        >
          <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
          <span>حرکت ماوس = ذره‌بین</span>
        </div>
      )}
    </div>
  );
};
