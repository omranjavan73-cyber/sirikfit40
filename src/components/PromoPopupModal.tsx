import React, { useState, useEffect } from 'react';
import { X, Sparkles, Flame, Copy, Check, ExternalLink, Tag } from 'lucide-react';
import type { PromoPopupConfig } from '../types';

interface PromoPopupModalProps {
  config?: PromoPopupConfig;
  currentTab?: string;
  isPreview?: boolean;
  onClosePreview?: () => void;
}

export const PromoPopupModal: React.FC<PromoPopupModalProps> = ({
  config,
  currentTab = 'home',
  isPreview = false,
  onClosePreview
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isPreview) {
      setIsOpen(true);
      return;
    }

    if (!config || !config.enabled) {
      setIsOpen(false);
      return;
    }

    // Check target page match
    const target = config.targetPage || 'all';
    if (target !== 'all') {
      if (target === 'home' && currentTab !== 'home' && currentTab !== 'main') return;
      if (target === 'inventory' && currentTab !== 'inventory') return;
      if (target === 'deals' && currentTab !== 'deals') return;
    }

    // Check if seen in this session
    const seen = sessionStorage.getItem('promo_popup_seen');
    if (seen === 'true') return;

    const delay = Math.max(0, (config.delaySeconds || 2) * 1000);
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [config, currentTab, isPreview]);

  const handleClose = () => {
    setIsOpen(false);
    if (!isPreview) {
      sessionStorage.setItem('promo_popup_seen', 'true');
    }
    if (onClosePreview) {
      onClosePreview();
    }
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleActionClick = () => {
    handleClose();
    if (config?.targetUrl) {
      if (config.targetUrl.startsWith('http')) {
        window.open(config.targetUrl, '_blank');
      } else {
        window.location.href = config.targetUrl;
      }
    }
  };

  if (!isOpen || !config) return null;

  const template = config.template || 'template1';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs font-['Vazirmatn',sans-serif] dir-rtl animate-fade-in ${isPreview ? 'relative z-0 p-0 bg-transparent backdrop-blur-none' : ''}`}>
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition cursor-pointer backdrop-blur-xs"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ---------------------------------------------------- */}
        {/* TEMPLATE 1: Full Image Banner + CTA */}
        {/* ---------------------------------------------------- */}
        {template === 'template1' && (
          <div className="flex flex-col">
            {config.imageUrl ? (
              <div className="relative w-full h-48 sm:h-56 bg-slate-100 overflow-hidden">
                <img
                  src={config.imageUrl}
                  alt={config.title}
                  className="w-full h-full object-cover"
                />
                {config.discountText && (
                  <span className="absolute bottom-3 right-3 bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-xl shadow-md">
                    {config.discountText}
                  </span>
                )}
              </div>
            ) : (
              <div className="w-full h-32 bg-gradient-to-r from-blue-700 to-indigo-900 flex items-center justify-center text-white">
                <Sparkles className="w-12 h-12 text-amber-400" />
              </div>
            )}

            <div className="p-6 text-center space-y-3">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {config.title || 'پیشنهاد شگفت‌انگیز مکمل‌های دبی'}
              </h3>
              {config.subtitle && (
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {config.subtitle}
                </p>
              )}

              {config.couponCode && (
                <div
                  onClick={(e) => handleCopyCode(e, config.couponCode!)}
                  className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 px-4 py-2 rounded-2xl cursor-pointer transition text-xs font-bold text-slate-800"
                >
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span>کد تخفیف:</span>
                  <span className="font-mono font-black text-blue-700 tracking-wider dir-ltr">{config.couponCode}</span>
                  {copied ? (
                    <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> کپی شد
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleActionClick}
                className="w-full bg-slate-900 hover:bg-black text-white text-xs font-black py-3 rounded-2xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{config.buttonText || 'مشاهده و خرید'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TEMPLATE 2: Discount Card with Code & Badge */}
        {/* ---------------------------------------------------- */}
        {template === 'template2' && (
          <div className="p-6 text-center space-y-4 bg-gradient-to-b from-amber-50/60 to-white">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
              <Sparkles className="w-7 h-7" />
            </div>

            {config.discountText && (
              <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs px-3.5 py-1 rounded-full">
                {config.discountText}
              </span>
            )}

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                {config.title || 'تخفیف ویژه و اختصاصی'}
              </h3>
              {config.subtitle && (
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {config.subtitle}
                </p>
              )}
            </div>

            {config.imageUrl && (
              <div className="w-full h-36 rounded-2xl overflow-hidden border border-slate-100">
                <img src={config.imageUrl} alt={config.title} className="w-full h-full object-cover" />
              </div>
            )}

            {config.couponCode && (
              <div
                onClick={(e) => handleCopyCode(e, config.couponCode!)}
                className="flex items-center justify-between bg-white border-2 border-dashed border-amber-400 p-3 rounded-2xl cursor-pointer hover:bg-amber-50/50 transition"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Tag className="w-4 h-4 text-amber-600" />
                  <span>کد تخفیف:</span>
                  <span className="font-mono font-black text-sm text-amber-700 tracking-wider dir-ltr">{config.couponCode}</span>
                </div>
                <div className="text-[11px] font-black text-amber-700 flex items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-xl">
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی کد</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleActionClick}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black py-3 rounded-2xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{config.buttonText || 'استفاده از تخفیف'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TEMPLATE 3: Flash Sale Alert Box */}
        {/* ---------------------------------------------------- */}
        {template === 'template3' && (
          <div className="p-6 text-center space-y-4 bg-gradient-to-b from-rose-50 to-white">
            <div className="inline-flex items-center gap-1.5 bg-rose-600 text-white font-black text-xs px-3.5 py-1 rounded-full shadow-md animate-pulse">
              <Flame className="w-4 h-4 fill-white" />
              <span>{config.discountText || '⚡ حراج فوری محدود'}</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                {config.title || 'آفر اختصاصی مکمل‌های اورجینال'}
              </h3>
              {config.subtitle && (
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {config.subtitle}
                </p>
              )}
            </div>

            {config.imageUrl && (
              <div className="w-full h-36 rounded-2xl overflow-hidden border border-rose-100 shadow-2xs">
                <img src={config.imageUrl} alt={config.title} className="w-full h-full object-cover" />
              </div>
            )}

            <button
              type="button"
              onClick={handleActionClick}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-black py-3 rounded-2xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{config.buttonText || 'ورود به حراج'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
