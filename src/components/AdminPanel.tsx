import React, { useState, useEffect } from 'react';
import {
  Lock, LogOut, LayoutDashboard, ShoppingBag, SlidersHorizontal, Image as ImageIcon,
  Plus, Trash2, Save, Upload, CheckCircle2, RefreshCw, AlertCircle, TrendingUp, Clock,
  Truck, Coins, Globe, Key, ExternalLink, Layers, Sparkles, Zap, ArrowUp, ArrowDown,
  PackageCheck, Package, Home, ToggleLeft, ToggleRight, Phone, PhoneCall, Send, Mail,
  ShieldCheck, Headphones, CreditCard, Wallet, FileText, Download, Filter, Search, Eye,
  EyeOff, Calculator, PieChart, Building2, FileSpreadsheet, Check, Copy, Database
} from 'lucide-react';
import { checkFirestoreConnection, saveSettingsToFirestore, saveCmsToFirestore } from '../firebase';
import {
  FinancialSettings, Order, PaymentStatus, ShippingStatus, CmsConfig, StoreCardItem,
  FeaturedDeal, LocalInventoryItem, WarehouseCategory, HomePageSettings, GatewayProvider,
  PaymentGatewayConfig, HomeBanner, DomainItem
} from '../types';
import { formatToman, formatAed, formatPersianDate, toPersianDigits } from '../utils/formatters';
import { getEffectiveGeminiKeysList, setEffectiveGeminiKeysList } from '../utils/geminiKey';
import { PricingRulesAdmin } from './PricingRulesAdmin';

const DEFAULT_WAREHOUSE_CATEGORIES: WarehouseCategory[] = [
  { id: 'all', label: 'همه کالاها', filterKey: 'all', iconUrl: '' },
  { id: 'protein', label: 'پروتئین', filterKey: 'protein', iconUrl: '' },
  { id: 'vitamin', label: 'ویتامین', filterKey: 'vitamin', iconUrl: '' },
  { id: 'pre', label: 'قبل تمرین', filterKey: 'pre', iconUrl: '' },
  { id: 'omega', label: 'امگا ۳', filterKey: 'omega', iconUrl: '' },
  { id: 'hot', label: 'پرفروش', filterKey: 'hot', iconUrl: '' },
];

const DEFAULT_STORES: StoreCardItem[] = [
  {
    id: 'store-dnp',
    title: 'Doctor Nutrition Dubai',
    shortTitle: 'Dr. Nutrition',
    subtitle: 'بزرگترین مرجع مکمل دبی',
    description: 'بزرگترین مرجع تخصصی مکمل‌های ورزشی، ویتامین و پروتئین ایزوله در امارات و خاورمیانه',
    url: 'https://www.drnutrition.com/en-ae',
    badge: 'تخفیف ویژه دبی',
    enabled: true,
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif" letter-spacing="-6">dnp</text><path d="M50 120 C 90 70, 135 40, 175 28 C 150 65, 110 110, 75 130 Z" fill="%2378BE20"/><path d="M60 112 Q 115 65, 163 35" stroke="%235A9614" stroke-width="3" fill="none"/></svg>'
  },
  {
    id: 'store-life',
    title: 'Life Pharmacy UAE',
    shortTitle: 'Life Pharmacy',
    subtitle: 'داروخانه آنلاین دبی',
    description: 'بزرگترین زنجیره داروخانه آنلاین دبی - داروها، ویتامین‌ها، مکمل‌ها و محصولات آرایشی بهداشتی معتبر',
    url: 'https://www.lifepharmacy.com',
    badge: 'داروخانه آنلاین دبی',
    enabled: true,
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><path d="M100 15 C56 15 40 42 40 70 V135 H160 V70 C160 42 144 15 100 15 Z" fill="%231C3F94"/><circle cx="100" cy="55" r="9" fill="%23FFFFFF"/><path d="M100 68 C84 80 72 84 64 110 H136 C128 84 116 80 100 68 Z" fill="%23FFFFFF"/><text x="100" y="172" text-anchor="middle" fill="%23C42582" font-weight="900" font-size="36" font-family="sans-serif">LIFE%C2%AE</text></svg>'
  },
  {
    id: 'store-gnc',
    title: 'GNC UAE',
    shortTitle: 'GNC',
    subtitle: 'نمایندگی رسمی GNC',
    description: 'نمایندگی رسمی برند جهانی GNC در امارات - انواع مولتی‌ویتامین‌ها، امگا ۳ و مکمل‌های سلامتی اورجینال',
    url: 'https://gnc-mena.com/',
    badge: 'ضمانت ۱۰۰٪ اورجینال',
    enabled: true,
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="115" text-anchor="middle" fill="%23E31837" font-weight="900" font-size="70" font-family="Arial,sans-serif" letter-spacing="-2">GNC</text><text x="100" y="145" text-anchor="middle" fill="%23E31837" font-weight="800" font-size="20" font-family="Arial,sans-serif" letter-spacing="4">LIVE WELL</text></svg>'
  }
];

export const compressImageFile = (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> => {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
      return;
    }
    if (!file.type.startsWith('image/') || file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve((e.target?.result as string) || '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

interface AdminPanelProps {
  settings: FinancialSettings;
  onUpdateSettings: (newSettings: FinancialSettings) => void;
  cms: CmsConfig | null;
  onUpdateCms: (newCms: CmsConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings,
  onUpdateSettings,
  cms,
  onUpdateCms
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Sub-tab
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'dashboard' | 'orders' | 'financial' | 'cms' | 'deals' | 'inventory' | 'homeContent' | 'accounting' | 'gateway' | 'pricingRules' | 'backup' | 'security' | 'apiSettings'
  >('dashboard');

  // Safe fallback wrapper for settings & cms
  const safeSettings = settings || { aedRate: 19500, cargoRatePerKg: 35, profitMargin: 15 };
  const safeCms = cms || {
    stores: DEFAULT_STORES,
    deals: [],
    localInventory: [],
    warehouseCategories: DEFAULT_WAREHOUSE_CATEGORIES,
    homeContent: {},
    apiConfig: {}
  };

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // State Declarations
  const [storesList, setStoresList] = useState<StoreCardItem[]>(() =>
    Array.isArray(safeCms?.stores) && safeCms.stores.length > 0 ? safeCms.stores : DEFAULT_STORES
  );
  const [dealsList, setDealsList] = useState<FeaturedDeal[]>(() =>
    Array.isArray(safeCms?.deals) ? safeCms.deals : []
  );
  const [localInventoryList, setLocalInventoryList] = useState<LocalInventoryItem[]>(() =>
    Array.isArray(safeCms?.localInventory) ? safeCms.localInventory : []
  );
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategory[]>(() =>
    Array.isArray(safeCms?.warehouseCategories) && safeCms.warehouseCategories.length > 0
      ? safeCms.warehouseCategories
      : DEFAULT_WAREHOUSE_CATEGORIES
  );

  const [showLocalInventory, setShowLocalInventory] = useState<boolean>(safeCms?.showLocalInventory ?? true);
  const [warehouseBannerTitle, setWarehouseBannerTitle] = useState(safeCms?.warehouseBannerTitle || 'کالاهای موجود در انبار ایران (ارسال فوری)');
  const [warehouseBannerSubtitle, setWarehouseBannerSubtitle] = useState(safeCms?.warehouseBannerSubtitle || 'تحویل ۱ تا ۲ روزه در سراسر کشور • کالاها پلمپ و اورجینال');
  const [warehouseBannerTheme, setWarehouseBannerTheme] = useState<'light' | 'dark' | 'emerald' | 'amber'>(safeCms?.warehouseBannerTheme || 'light');
  const [warehouseBannerButtonText, setWarehouseBannerButtonText] = useState(safeCms?.warehouseBannerButtonText || 'جستجو و مشاهده همه');

  // Sync state if CMS prop updates
  useEffect(() => {
    if (cms) {
      if (Array.isArray(cms.stores)) setStoresList(cms.stores);
      if (Array.isArray(cms.deals)) setDealsList(cms.deals);
      if (Array.isArray(cms.localInventory)) setLocalInventoryList(cms.localInventory);
      if (Array.isArray(cms.warehouseCategories)) setWarehouseCategories(cms.warehouseCategories);
    }
  }, [cms]);

  // Check existing auth token
  useEffect(() => {
    const token = localStorage.getItem('omex_admin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchAdminOrders();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });

      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('omex_admin_token', data.token);
        setIsAuthenticated(true);
        fetchAdminOrders();
      } else {
        setLoginError(data.error || 'رمز عبور اشتباه است.');
      }
    } catch (err) {
      setLoginError('خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('omex_admin_token');
    setIsAuthenticated(false);
  };

  const fetchAdminOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setOrders(data);
      }
    } catch (e) {
      console.error('Error fetching admin orders:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleSaveCms = async () => {
    const updatedCms: CmsConfig = {
      ...safeCms,
      stores: storesList,
      deals: dealsList,
      localInventory: localInventoryList,
      warehouseCategories,
      showLocalInventory,
      warehouseBannerTitle,
      warehouseBannerSubtitle,
      warehouseBannerTheme,
      warehouseBannerButtonText
    };

    onUpdateCms(updatedCms);
    try {
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(updatedCms));
      await saveCmsToFirestore(updatedCms);
    } catch (_e) {}
  };

  // Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xl text-neutral-800 font-['Vazirmatn',sans-serif]">
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-neutral-900">ورود به پنل مدیریت SIRIK FIT</h2>
          <p className="text-xs text-neutral-500 font-medium">برای دسترسی به سیستم رمز عبور را وارد کنید</p>
        </div>

        {loginError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1.5">رمز عبور مدیر:</label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="رمز عبور را وارد کنید"
              className="w-full bg-neutral-50 border border-neutral-300 focus:border-black focus:bg-white text-neutral-900 text-sm px-4 py-2.5 rounded-xl focus:outline-none transition font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold text-sm py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoggingIn ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال بررسی...</span>
              </>
            ) : (
              <span>ورود به سامانه</span>
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-['Vazirmatn',sans-serif]">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 shadow-2xs">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">پنل مدیریت SIRIK FIT</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">نرخ درهم فعال: {formatToman(safeSettings.aedRate)}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج</span>
        </button>
      </div>

      {/* Admin Sub-Tabs Navigation */}
      <div className="admin-menu flex flex-wrap items-center gap-2 p-2 bg-slate-100/80 rounded-3xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveAdminSubTab('pricingRules')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border ${
            activeAdminSubTab === 'pricingRules'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <Calculator className="w-4 h-4 text-indigo-500" />
          <span>قوانین قیمت‌گذاری و نرخ درهم</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('orders')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border ${
            activeAdminSubTab === 'orders'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>سفارشات ({toPersianDigits(orders.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminSubTab('inventory')}
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 cursor-pointer border ${
            activeAdminSubTab === 'inventory'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <PackageCheck className="w-4 h-4 text-amber-600" />
          <span>انبار ایران ({toPersianDigits(localInventoryList.length)})</span>
        </button>
      </div>

      {/* SUB-TAB 1: PRICING RULES (The beating heart) */}
      {activeAdminSubTab === 'pricingRules' && (
        <PricingRulesAdmin
          settings={safeSettings}
          onUpdateSettings={onUpdateSettings}
          cms={safeCms}
          onUpdateCms={onUpdateCms}
        />
      )}

      {/* SUB-TAB 2: ORDERS */}
      {activeAdminSubTab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900">لیست سفارشات مشتریان</h3>
            <button
              onClick={fetchAdminOrders}
              className="bg-slate-100 p-2 rounded-xl text-slate-700 flex items-center gap-1 text-xs font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin' : ''}`} />
              <span>به‌روزرسانی</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="p-3">کد پیگیری</th>
                  <th className="p-3">مشتری</th>
                  <th className="p-3">محصول</th>
                  <th className="p-3">مبلغ (تومان)</th>
                  <th className="p-3">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="p-3 font-mono font-bold">{order.trackingCode}</td>
                    <td className="p-3 font-bold">{order.customerName} ({order.phoneNumber})</td>
                    <td className="p-3">{order.productTitle}</td>
                    <td className="p-3 font-black text-rose-600">{formatToman(order.calculatedToman)}</td>
                    <td className="p-3 font-bold">
                      <span className={`px-2 py-0.5 rounded-md ${order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {order.paymentStatus === 'PAID' ? 'پرداخت شده' : 'در انتظار'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: INVENTORY */}
      {activeAdminSubTab === 'inventory' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">مدیریت کالاهای موجود در انبار ایران</h3>
            <button onClick={handleSaveCms} className="bg-black text-white text-xs font-bold px-4 py-2 rounded-xl">
              ذخیره تغییرات انبار
            </button>
          </div>
          <p className="text-xs text-slate-500">تعداد کالاها: {localInventoryList.length}</p>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;