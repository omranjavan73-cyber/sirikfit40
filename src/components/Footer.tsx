import React from 'react';
import { ShieldCheck, Phone, Mail, Instagram, Send, Heart } from 'lucide-react';
import type { CmsConfig, FinancialSettings } from '../types';

interface FooterProps {
  cms?: CmsConfig | null;
  settings?: FinancialSettings | null;
}

export const Footer: React.FC<FooterProps> = ({ cms, settings }) => {
  let enamadId = '';
  let enamadCode = '';

  try {
    const rawBadge =
      (settings as any)?.enamadCode ||
      (settings as any)?.enamadUrl ||
      cms?.enamadCode ||
      cms?.enamadUrl ||
      cms?.enamadHtml ||
      '';

    if (typeof rawBadge === 'string' && rawBadge.length > 0) {
      const idMatch = rawBadge.match(/id=([a-zA-Z0-9]+)/i);
      const codeMatch = rawBadge.match(/Code=([a-zA-Z0-9]+)/i);
      if (idMatch) enamadId = idMatch[1];
      if (codeMatch) enamadCode = codeMatch[1];
    }
  } catch (e) {
    console.warn('Failed to parse Enamad safely', e);
  }

  const finalId = enamadId || '774774';
  const finalCode = enamadCode || 'QLX3GJJuDLNIXNEEocH7c14ry1CHCK1T';

  return (
    <footer id="main-footer" className="bg-slate-900 border-t border-slate-800 text-slate-300 py-10 mt-16 font-['Vazirmatn',sans-serif]" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Col */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-black text-white">سیریک‌فیت</span>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md font-bold">SirikFit</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              سامانه هوشمند و تخصصی سفارش و ارسال مستقیم مکمل‌های ورزشی و غذایی اورجینال از امارات و دبی به سراسر ایران.
            </p>
            <div className="flex items-center gap-3 text-slate-400">
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-300">
                <Send className="w-4 h-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-300">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Contact */}
          <div>
            <h4 className="text-sm font-black text-white mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400" />
              <span>ارتباط و پشتیبانی</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>پشتیبانی تلفنی و واتساپ: ۰۹۱۷۰۰۰۰۰۰۰</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>ایمیل: support@sirikfit.com</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>ضمانت اصالت ۱۰۰٪ تمامی محصولات</span>
              </li>
            </ul>
          </div>

          {/* Enamad & Trust */}
          <div>
            <h4 className="text-sm font-black text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>مجوزها و نمادها</span>
            </h4>
            <div className="flex items-center gap-3">
              {finalId && finalCode && (
                <a
                  referrerPolicy="origin"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://trustseal.enamad.ir/?id=${finalId}&Code=${finalCode}`}
                  className="p-2 bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition block shrink-0"
                >
                  <img
                    referrerPolicy="origin"
                    src={`https://trustseal.enamad.ir/logo.aspx?id=${finalId}&Code=${finalCode}`}
                    alt="اینماد"
                    className="w-14 h-14 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/enamad.png';
                    }}
                  />
                </a>
              )}
              <a
                referrerPolicy="origin"
                target="_blank"
                rel="noopener noreferrer"
                href="https://samandehi.ir"
                className="p-2 bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition block shrink-0"
              >
                <img
                  referrerPolicy="origin"
                  src="https://cdn.zarinpal.com/badges/trust-logos/samandehi.png"
                  alt="ساماندهی"
                  className="w-14 h-14 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.zarinpal.com/badges/trust-logos/samandehi.png';
                  }}
                />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <div>© تمامی حقوق مادی و معنوی برای سیریک‌فیت (SirikFit) محفوظ است.</div>
          <div className="flex items-center gap-1">
            <span>طراحی و توسعه با</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
};
