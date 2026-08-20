import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, ZoomIn, X, RefreshCw, ZoomOut } from 'lucide-react';
import { toPersianDigits } from '../utils/formatters';

export interface ImageMagnifierProps {
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

export const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
  src,
  alt = 'تصویر محصول',
  fallbackSrc = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600',
  className = '',
  imageClassName = '',
  onExpandFullscreen,
  zoomScale = 2.2,
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
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [modalZoom, setModalZoom] = useState(1);

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
      const clientX = touch.clientX;
      const clientY = touch.clientY;

      touchStartPosRef.current = { x: clientX, y: clientY };
      isDraggingRef.current = false;

      // Double-Tap Detection (within 320ms and 40px threshold)
      const timeDiff = now - lastTapRef.current.time;
      const distDiff = Math.hypot(clientX - lastTapRef.current.x, clientY - lastTapRef.current.y);

      if (timeDiff < 320 && distDiff < 40) {
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

      if (e.cancelable && (isTouching || isDoubleTapLocked)) {
        e.preventDefault();
      }

      updateCoordsFromPoint(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2 && initialPinchDistRef.current > 0) {
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

      if (!isDoubleTapLocked && pinchScale < 1.15) {
        setPinchScale(1);
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

  const handleOpenFullscreen = () => {
    if (onExpandFullscreen) {
      onExpandFullscreen();
    } else {
      setShowFullscreenModal(true);
      setModalZoom(1);
    }
  };

  // Determine current active scale
  const isZoomActive = isHovered || isTouching || isDoubleTapLocked || pinchScale > 1.05;
  const activeScale = pinchScale > 1.05 ? pinchScale : (isZoomActive ? zoomScale : 1);

  // Loupe position calculations (floating lens on mobile)
  const containerRect = containerRef.current?.getBoundingClientRect();
  const contWidth = containerRect?.width || 320;
  const contHeight = containerRect?.height || 320;

  const loupeSize = Math.min(140, contWidth * 0.45);
  const loupeHalf = loupeSize / 2;
  const loupeTop = coords.py > (loupeSize + 25) ? (coords.py - loupeSize - 20) : (coords.py + 30);
  const loupeLeft = Math.max(10, Math.min(contWidth - loupeSize - 10, coords.px - loupeHalf));

  return (
    <>
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
          if (!isDraggingRef.current && !isDoubleTapLocked && !isTouching) {
            handleOpenFullscreen();
          }
        }}
        style={{
          touchAction: (isTouching || isDoubleTapLocked || isPinching) ? 'none' : 'pan-y'
        }}
        className={`relative w-full overflow-hidden select-none cursor-zoom-in group ${className}`}
      >
        {/* Primary Zoomed Canvas / Image with 60fps CSS transform */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
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
        </div>

        {/* Optional Custom Top-Right or Top-Left Badges */}
        {badge && (
          <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
            {badge}
          </div>
        )}

        {/* Fullscreen Expand Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenFullscreen();
          }}
          title="مشاهده تمام صفحه با کیفیت اصلی"
          aria-label="مشاهده تمام صفحه"
          className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-200/80 shadow-md flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

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
            <div
              style={{
                backgroundImage: `url(${imgSrc})`,
                backgroundPosition: `${coords.x}% ${coords.y}%`,
                backgroundSize: `${contWidth * 3}px ${contHeight * 3}px`,
                backgroundRepeat: 'no-repeat'
              }}
              className="w-full h-full bg-slate-950"
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-2 h-2 rounded-full border border-white/60 bg-red-500/80" />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* DESKTOP HOVER ZOOM HINT BADGE                                */}
        {/* ------------------------------------------------------------- */}
        {showHints && !isZoomActive && (
          <div className="hidden md:flex absolute bottom-2.5 inset-x-3 justify-center z-10 pointer-events-none transition-opacity duration-300">
            <span className="bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 border border-white/10">
              <ZoomIn className="w-3 h-3 text-amber-400" />
              <span>🔍 برای بزرگنمایی ماوس را روی تصویر حرکت دهید</span>
            </span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MOBILE PINCH / DOUBLE-TAP ZOOM HINT                         */}
        {/* ------------------------------------------------------------- */}
        {showHints && !isZoomActive && (
          <div className="md:hidden absolute bottom-2 inset-x-2 flex justify-center z-10 pointer-events-none">
            <span className="bg-slate-900/70 backdrop-blur-xs text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <ZoomIn className="w-2.5 h-2.5 text-amber-300" />
              <span>لمس جهت ذره‌بین • دو بار ضربه برای قفل زوم</span>
            </span>
          </div>
        )}

        {/* Active Zoom Scale Multiplier Indicator */}
        {isZoomActive && (
          <div className="absolute top-2.5 left-12 z-20 pointer-events-none">
            <span className="bg-slate-950/80 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs border border-white/10 dir-ltr">
              {toPersianDigits(activeScale.toFixed(1))}x
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FULLSCREEN LIGHTBOX MODAL OVERLAY (MOBILE & DESKTOP)          */}
      {/* ------------------------------------------------------------- */}
      {showFullscreenModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in duration-200"
          onClick={() => setShowFullscreenModal(false)}
        >
          {/* Header Controls */}
          <div className="flex items-center justify-between z-20 w-full max-w-4xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-bold bg-white/10 px-3 py-1 rounded-full">
                نمایش با کیفیت اصلی
              </span>
              {modalZoom > 1 && (
                <span className="text-amber-400 text-xs font-black bg-white/10 px-2 py-1 rounded-md dir-ltr">
                  {toPersianDigits(modalZoom.toFixed(1))}x
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalZoom((z) => Math.min(3.5, z + 0.5))}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
                title="بزرگنمایی"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setModalZoom((z) => Math.max(1, z - 0.5))}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
                title="کوچک‌نمایی"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowFullscreenModal(false)}
                className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition cursor-pointer shadow-lg mr-2"
                title="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Centered High-Res Image View */}
          <div
            className="flex-1 flex items-center justify-center overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imgSrc}
              alt={alt}
              referrerPolicy="no-referrer"
              style={{
                transform: `scale(${modalZoom})`,
                transition: 'transform 0.2s ease-out'
              }}
              className="max-h-[82vh] max-w-[90vw] object-contain select-none cursor-grab active:cursor-grabbing"
              onDoubleClick={() => setModalZoom((z) => (z > 1 ? 1 : 2.2))}
            />
          </div>

          {/* Footer Guide */}
          <div className="text-center text-slate-400 text-xs py-2 pointer-events-none">
            برای بزرگنمایی دوبار کلیک کنید یا از دکمه‌های بالا استفاده نمایید
          </div>
        </div>
      )}
    </>
  );
};

export default ImageMagnifier;
