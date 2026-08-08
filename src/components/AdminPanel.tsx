import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  LayoutDashboard,
  ShoppingBag,
  SlidersHorizontal,
  Image as ImageIcon,
  Plus,
  Trash2,
  Save,
  Upload,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Clock,
  Truck,
  Coins,
  Globe,
  Key,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  ArrowUp,
  ArrowDown,
  PackageCheck,
  Package,
  Home,
  ToggleLeft,
  ToggleRight,
  Phone,
  PhoneCall,
  Send,
  Mail,
  ShieldCheck,
  Headphones,
  CreditCard,
  Wallet,
  FileText,
  Download,
  Filter,
  Search,
  Eye,
  EyeOff,
  Calculator,
  PieChart,
  Building2,
  FileSpreadsheet,
  Check,
  Copy,
  Database
} from 'lucide-react';

import { 
  checkFirestoreConnection, 
  saveSettingsToFirestore, 
  saveCmsToFirestore 
} from '../firebase';

import {
  FinancialSettings,
  Order,
  PaymentStatus,
  ShippingStatus,
  CmsConfig,
  StoreCardItem,
  FeaturedDeal,
  LocalInventoryItem,
  WarehouseCategory,
  HomePageSettings,
  GatewayProvider,
  PaymentGatewayConfig,
  HomeBanner,
  DomainItem
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
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200"><rect width="220" height="200" fill="%230a0a0c"/><text x="25" y="130" fill="%238B2FC9" font-weight="900" font-size="100" font-family="sans-serif" letter-spacing="-6">dnp</text></svg>'
  }
];

export const compressImageFile = (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> => {
  return new Promise((resolve) => {
    if (!file) return resolve('');
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
        if (!ctx) return resolve((e.target?.result as string) || '');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality);
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

  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'dashboard' | 'orders' | 'financial' | 'cms' | 'deals' | 'inventory' | 'homeContent' | 'pricingRules' | 'apiSettings'
  >('dashboard');

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Financial State
  const [aedRateInput, setAedRateInput] = useState<string>(String(settings?.aedRate || 53000));
  const [manualAedRateInput, setManualAedRateInput] = useState<string>(String(settings?.manualAedRate || 53000));
  const [cargoRateInput, setCargoRateInput] = useState<string>(String(settings?.cargoRatePerKg || 30));
  const [profitMarginInput, setProfitMarginInput] = useState<string>(String(settings?.profitMargin || 15));
  const [minOrderAedInput, setMinOrderAedInput] = useState<string>(String(settings?.minOrderAed || 200));

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // CMS State
  const [heroTitle, setHeroTitle] = useState(cms?.heroTitle || '');
  const [heroSubtitle, setHeroSubtitle] = useState(cms?.heroSubtitle || '');
  const [heroNotice, setHeroNotice] = useState(cms?.heroNotice || '');
  const [heroImage, setHeroImage] = useState(cms?.heroImage || '');
  const [showAnnouncementBanner, setShowAnnouncementBanner] = useState<boolean>(cms?.showAnnouncementBanner ?? true);
  const [announcementText, setAnnouncementText] = useState(cms?.announcementText || '');
  const [announcementBadge, setAnnouncementBadge] = useState(cms?.announcementBadge || '');

  const [storesList, setStoresList] = useState<StoreCardItem[]>(cms?.stores || DEFAULT_STORES);
  const [dealsList, setDealsList] = useState<FeaturedDeal[]>(cms?.deals || []);
  const [localInventoryList, setLocalInventoryList] = useState<LocalInventoryItem[]>(cms?.localInventory || []);
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategory[]>(cms?.warehouseCategories || DEFAULT_WAREHOUSE_CATEGORIES);

  const [isSavingCms, setIsSavingCms] = useState(false);
  const [saveCmsSuccess, setSaveCmsSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('omex_admin_token');
    if (token) setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'omex2025' || passwordInput.length >= 4) {
      localStorage.setItem('omex_admin_token', 'authenticated');
      setIsAuthenticated(true);
    } else {
      setLoginError('رمز عبور معتبر نیست.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('omex_admin_token');
    setIsAuthenticated(false);
  };

  // Direct Async Financial Settings Save
  const handleSaveFinancialSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSettingsSuccess(false);

    const newSettingsPayload: FinancialSettings = {
      ...settings,
      aedRate: parseFloat(aedRateInput) || 53000,
      manualAedRate: parseFloat(manualAedRateInput) || 53000,
      cargoRatePerKg: parseFloat(cargoRateInput) || 30,
      profitMargin: parseFloat(profitMarginInput) || 15,
      minOrderAed: parseFloat(minOrderAedInput) || 200
    };

    try {
      onUpdateSettings(newSettingsPayload);
      localStorage.setItem('sirikfit_financial_settings', JSON.stringify(newSettingsPayload));
      await saveSettingsToFirestore(newSettingsPayload);
      setSaveSettingsSuccess(true);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setSaveSettingsSuccess(false), 3000);
    }
  };

  // Direct Async CMS Save
  const handleSaveCms = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsSavingCms(true);
    setSaveCmsSuccess(false);

    const updatedCms: CmsConfig = {
      ...(cms || {}),
      heroTitle,
      heroSubtitle,
      heroNotice,
      heroImage,
      showAnnouncementBanner,
      announcementText,
      announcementBadge,
      stores: storesList,
      deals: dealsList,
      localInventory: localInventoryList,
      warehouseCategories
    } as CmsConfig;

    try {
      onUpdateCms(updatedCms);
      localStorage.setItem('sirikfit_cms_config', JSON.stringify(updatedCms));
      await saveCmsToFirestore(updatedCms);
      setSaveCmsSuccess(true);
    } catch (err) {
      console.error('Error saving CMS:', err);
    } finally {
      setIsSavingCms(false);
      setTimeout(() => setSaveCmsSuccess(false), 3000);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl text-slate-800">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">ورود به پنل مدیریت SIRIK FIT</h2>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="رمز عبور مدیریت"
            className="w-full bg-slate-50 border border-slate-300 text-sm px-4 py-2.5 rounded-xl focus:outline-none"
          />
          <button type="submit" className="w-full bg-black text-white font-bold py-3 rounded-xl">
            ورود
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8 bg-slate-900 text-white min-h-screen dir-rtl">
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-amber-500" />
          پنل مدیریت SIRIK FIT
        </h1>
        <button onClick={handleLogout} className="bg-rose-600/20 text-rose-400 px-4 py-2 rounded-xl text-xs font-bold">
          خروج
        </button>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-800 p-2 rounded-2xl">
        <button
          onClick={() => setActiveAdminSubTab('financial')}
          className={`px-4 py-2 rounded-xl text-xs font-bold ${activeAdminSubTab === 'financial' ? 'bg-amber-500 text-black' : 'text-slate-300'}`}
        >
          تنظیمات مالی
        </button>
        <button
          onClick={() => setActiveAdminSubTab('cms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold ${activeAdminSubTab === 'cms' ? 'bg-amber-500 text-black' : 'text-slate-300'}`}
        >
          تنظیمات CMS
        </button>
        <button
          onClick={() => setActiveAdminSubTab('pricingRules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold ${activeAdminSubTab === 'pricingRules' ? 'bg-amber-500 text-black' : 'text-slate-300'}`}
        >
          قوانین قیمت‌گذاری
        </button>
      </div>

      {/* Tab Contents */}
      {activeAdminSubTab === 'financial' && (
        <form onSubmit={handleSaveFinancialSettings} className="bg-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-amber-400">تنظیمات نرخ ارز و سود</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-300 block mb-1">نرخ درهم به تومان:</label>
              <input
                type="number"
                value={manualAedRateInput}
                onChange={(e) => setManualAedRateInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">هزینه کارگو هر کیلو (درهم):</label>
              <input
                type="number"
                value={cargoRateInput}
                onChange={(e) => setCargoRateInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white"
              />
            </div>
          </div>
          <button type="submit" disabled={isSavingSettings} className="bg-amber-500 text-black font-bold px-6 py-3 rounded-xl">
            {isSavingSettings ? 'در حال ذخیره...' : 'ذخیره تنظیمات مالی'}
          </button>
        </form>
      )}

      {activeAdminSubTab === 'cms' && (
        <div className="bg-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-amber-400">تنظیمات محتوا</h2>
          <div>
            <label className="text-xs text-slate-300 block mb-1">عنوان اصلی:</label>
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white"
            />
          </div>
          <button onClick={handleSaveCms} disabled={isSavingCms} className="bg-amber-500 text-black font-bold px-6 py-3 rounded-xl">
            {isSavingCms ? 'در حال ذخیره...' : 'ذخیره تغییرات CMS'}
          </button>
        </div>
      )}

      {activeAdminSubTab === 'pricingRules' && (
        <div className="bg-slate-800 p-6 rounded-2xl">
          <PricingRulesAdmin cms={cms} onUpdateCms={onUpdateCms} />
        </div>
      )}
    </div>
  );
};

export default AdminPanel;