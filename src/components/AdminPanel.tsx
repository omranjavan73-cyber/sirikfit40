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
  Plane,
  Home,
  ToggleLeft,
  ToggleRight,
  Phone,
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
  fetchSettingsFromFirestore, 
  saveCmsToFirestore, 
  getCmsFromFirestore 
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
  PricingRulesConfig,
  HomeBanner,
  DomainItem
} from '../types';

import { formatToman, formatAed, formatPersianDate, toPersianDigits } from '../utils/formatters';
import { getEffectiveGeminiKeysList, setEffectiveGeminiKeysList } from '../utils/geminiKey';
import PricingRulesAdmin from './PricingRulesAdmin';

interface AdminPanelProps {
  settings: FinancialSettings;
  onUpdateSettings: (newSettings: FinancialSettings) => void;
  cms: CmsConfig;
  onUpdateCms: (newCms: CmsConfig) => void;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, paymentStatus: PaymentStatus, shippingStatus: ShippingStatus) => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings,
  onUpdateSettings,
  cms,
  onUpdateCms,
  orders,
  onUpdateOrderStatus,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'financials' | 'cms' | 'orders' | 'pricing-rules'>('financials');
  
  // Financial State
  const [aedRateInput, setAedRateInput] = useState<string>(settings?.aedRate?.toString() || '53000');
  const [manualAedRateInput, setManualAedRateInput] = useState<string>(settings?.manualAedRate?.toString() || '53000');
  const [cargoRateInput, setCargoRateInput] = useState<string>(settings?.cargoRatePerKg?.toString() || '30');
  const [profitMarginInput, setProfitMarginInput] = useState<string>(settings?.profitMargin?.toString() || '15');
  const [minOrderAedInput, setMinOrderAedInput] = useState<string>(settings?.minOrderAed?.toString() || '200');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // CMS State
  const [heroTitle, setHeroTitle] = useState(cms?.heroTitle || '');
  const [heroSubtitle, setHeroSubtitle] = useState(cms?.heroSubtitle || '');
  const [heroNotice, setHeroNotice] = useState(cms?.heroNotice || '');
  const [heroImage, setHeroImage] = useState(cms?.heroImage || '');
  const [showAnnouncementBanner, setShowAnnouncementBanner] = useState(cms?.showAnnouncementBanner ?? true);
  const [announcementText, setAnnouncementText] = useState(cms?.announcementText || '');
  const [announcementBadge, setAnnouncementBadge] = useState(cms?.announcementBadge || '');
  
  // Lists
  const [homeBannersList, setHomeBannersList] = useState<HomeBanner[]>(cms?.homeBanners || []);
  const [storesList, setStoresList] = useState<StoreCardItem[]>(cms?.stores || []);
  const [dealsList, setDealsList] = useState<FeaturedDeal[]>(cms?.deals || []);
  const [localInventoryList, setLocalInventoryList] = useState<LocalInventoryItem[]>(cms?.localInventory || []);
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategory[]>(cms?.warehouseCategories || []);
  const [domainItemsList, setDomainItemsList] = useState<DomainItem[]>(cms?.apiConfig?.domainItems || []);

  // API Config
  const [currencyApiUrl, setCurrencyApiUrl] = useState(cms?.apiConfig?.currencyApiUrl || '');
  const [autoUpdateRates, setAutoUpdateRates] = useState(cms?.apiConfig?.autoUpdateRates ?? false);
  const [scraperEndpoint, setScraperEndpoint] = useState(cms?.apiConfig?.scraperEndpoint || '');
  const [geminiApiKey1, setGeminiApiKey1] = useState(cms?.apiConfig?.geminiApiKey1 || '');
  const [geminiApiKey2, setGeminiApiKey2] = useState(cms?.apiConfig?.geminiApiKey2 || '');
  const [geminiApiKey3, setGeminiApiKey3] = useState(cms?.apiConfig?.geminiApiKey3 || '');
  const [telegramBotToken, setTelegramBotToken] = useState(cms?.apiConfig?.telegramBotToken || '');
  const [adminChatId, setAdminChatId] = useState(cms?.apiConfig?.adminChatId || '');
  const [telegramNotifyEnabled, setTelegramNotifyEnabled] = useState(cms?.apiConfig?.telegramNotifyEnabled ?? false);
  const [adminDestinationEmail, setAdminDestinationEmail] = useState(cms?.apiConfig?.adminDestinationEmail || '');
  const [emailNotifyEnabled, setEmailNotifyEnabled] = useState(cms?.apiConfig?.emailNotifyEnabled ?? false);
  const [emailjsServiceId, setEmailjsServiceId] = useState(cms?.apiConfig?.emailjsServiceId || '');
  const [emailjsTemplateId, setEmailjsTemplateId] = useState(cms?.apiConfig?.emailjsTemplateId || '');
  const [emailjsPublicKey, setEmailjsPublicKey] = useState(cms?.apiConfig?.emailjsPublicKey || '');
  const [resendApiKey, setResendApiKey] = useState(cms?.apiConfig?.resendApiKey || '');
  const [enableDomainRestriction, setEnableDomainRestriction] = useState(cms?.apiConfig?.enableDomainRestriction ?? false);
  const [scraperApiKey, setScraperApiKey] = useState(cms?.apiConfig?.scraperApiKey || '');
  const [enableScraperApi, setEnableScraperApi] = useState(cms?.apiConfig?.enableScraperApi ?? false);

  // Warehouse UI
  const [showLocalInventory, setShowLocalInventory] = useState(cms?.showLocalInventory ?? true);
  const [warehouseBannerTitle, setWarehouseBannerTitle] = useState(cms?.warehouseBannerTitle || '');
  const [warehouseBannerSubtitle, setWarehouseBannerSubtitle] = useState(cms?.warehouseBannerSubtitle || '');
  const [warehouseBannerTheme, setWarehouseBannerTheme] = useState<'blue' | 'amber' | 'emerald' | 'purple'>(cms?.warehouseBannerTheme || 'amber');
  const [warehouseBannerButtonText, setWarehouseBannerButtonText] = useState(cms?.warehouseBannerButtonText || '');

  const [isSavingCms, setIsSavingCms] = useState(false);
  const [saveCmsSuccess, setSaveCmsSuccess] = useState(false);

  // Sync initial props to local states
  useEffect(() => {
    if (settings) {
      setAedRateInput(settings.aedRate?.toString() || '53000');
      setManualAedRateInput(settings.manualAedRate?.toString() || '53000');
      setCargoRateInput(settings.cargoRatePerKg?.toString() || '30');
      setProfitMarginInput(settings.profitMargin?.toString() || '15');
      setMinOrderAedInput(settings.minOrderAed?.toString() || '200');
    }
  }, [settings]);

  // Save Handlers
  const handleSaveFinancials = async () => {
    setIsSavingSettings(true);
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
      
      const isSaved = await saveSettingsToFirestore(newSettingsPayload);
      setSaveSettingsSuccess(true);
      if (isSaved) {
        alert('تنظیمات مالی با موفقیت در فایربیس ذخیره شد');
      } else {
        alert('تنظیمات در مرورگر ذخیره شد (اتصال مستقیم به فایربیس برقرار نشد)');
      }
    } catch (error) {
      console.error('Error saving financials:', error);
      alert('خطا در ثبت اطلاعات مالی');
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setSaveSettingsSuccess(false), 3000);
    }
  };

  const handleSaveCms = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsSavingCms(true);

    try {
      const updatedCms: CmsConfig = {
        heroTitle,
        heroSubtitle,
        heroNotice,
        heroImage,
        showAnnouncementBanner,
        announcementText,
        announcementBadge,
        homeBanners: homeBannersList,
        stores: storesList,
        deals: dealsList,
        showLocalInventory,
        warehouseBannerTitle,
        warehouseBannerSubtitle,
        warehouseBannerTheme,
        warehouseBannerButtonText,
        localInventory: localInventoryList,
        warehouseCategories,
        apiConfig: {
          currencyApiUrl,
          autoUpdateRates,
          scraperEndpoint,
          geminiApiKey: geminiApiKey1 || cms?.apiConfig?.geminiApiKey || '',
          geminiApiKey1,
          geminiApiKey2,
          geminiApiKey3,
          geminiApiKeys: [geminiApiKey1, geminiApiKey2, geminiApiKey3].filter(Boolean),
          telegramBotToken,
          adminChatId,
          telegramNotifyEnabled,
          adminDestinationEmail,
          emailNotifyEnabled,
          emailjsServiceId,
          emailjsTemplateId,
          emailjsPublicKey,
          resendApiKey,
          domainItems: domainItemsList,
          allowedDomains: domainItemsList.filter(d => d.enabled).map(d => d.domain),
          enableDomainRestriction,
          scraperApiKey,
          enableScraperApi
        }
      };

      onUpdateCms(updatedCms);
      localStorage.setItem('omex_cms_config', JSON.stringify(updatedCms));

      const isSaved = await saveCmsToFirestore(updatedCms);
      setSaveCmsSuccess(true);
      if (isSaved) {
        alert('تنظیمات ظاهر و CMS با موفقیت در فایربیس ذخیره شد');
      } else {
        alert('تنظیمات به‌صورت محلی ذخیره شد');
      }
    } catch (err) {
      console.error('Error saving CMS:', err);
      alert('خطا در ذخیره‌سازی محتوا');
    } finally {
      setIsSavingCms(false);
      setTimeout(() => setSaveCmsSuccess(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 dir-rtl p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-amber-500" />
            پنل مدیریت SIRIK FIT
          </h1>
          <p className="text-slate-400 text-sm mt-1">مدیریت نرخ درهم، قوانین قیمت‌گذاری، محتوا و سفارشات</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-rose-600/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl hover:bg-rose-600/30 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          خروج از پنل
        </button>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50">
        <button
          onClick={() => setActiveTab('financials')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'financials'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <Coins className="w-4 h-4" />
          تنظیمات نرخ و ارز
        </button>
        <button
          onClick={() => setActiveTab('cms')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'cms'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          مدیریت محتوا و CMS
        </button>
        <button
          onClick={() => setActiveTab('pricing-rules')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'pricing-rules'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          قوانین قیمت‌گذاری
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'orders'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          مدیریت سفارشات ({orders?.length || 0})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-amber-400 flex items-center gap-2">
              <Coins className="w-5 h-5" />
              تنظیمات مبنای نرخ درهم دبی
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-300 mb-2">نرخ درهم به تومان (دستی)</label>
                <input
                  type="number"
                  value={manualAedRateInput}
                  onChange={(e) => setManualAedRateInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="مثلا 53000"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">هزینه کارگو هر کیلوگرم (درهم)</label>
                <input
                  type="number"
                  value={cargoRateInput}
                  onChange={(e) => setCargoRateInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="مثلا 30"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">درصد سود پایه (%)</label>
                <input
                  type="number"
                  value={profitMarginInput}
                  onChange={(e) => setProfitMarginInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="مثلا 15"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">حداقل سفارش (درهم)</label>
                <input
                  type="number"
                  value={minOrderAedInput}
                  onChange={(e) => setMinOrderAedInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="مثلا 200"
                />
              </div>
            </div>
            
            <button
              onClick={handleSaveFinancials}
              disabled={isSavingSettings}
              className="mt-6 flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {isSavingSettings ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              ذخیره تنظیمات نرخ و مالی
            </button>
          </div>
        </div>
      )}

      {activeTab === 'cms' && (
        <div className="space-y-6">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-amber-400 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              مدیریت بنر و عناوین اصلی
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">عنوان اصلی (Hero Title)</label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">زیرعنوان اصلی (Hero Subtitle)</label>
                <input
                  type="text"
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">متن اطلاعیه بالا</label>
                <input
                  type="text"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              onClick={handleSaveCms}
              disabled={isSavingCms}
              className="mt-6 flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {isSavingCms ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              ذخیره تغییرات CMS
            </button>
          </div>
        </div>
      )}

      {activeTab === 'pricing-rules' && (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6">
          <PricingRulesAdmin 
            cms={cms} 
            onUpdateCms={onUpdateCms} 
          />
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-amber-400 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            لیست سفارشات دریافت شده
          </h2>
          {orders?.length === 0 ? (
            <p className="text-slate-400 py-8 text-center">هنوز هیچ سفارشی ثبت نشده است.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs text-amber-400 font-mono">#{order.id}</span>
                    <h3 className="font-bold text-white text-base mt-1">{order.userName || 'کاربر مهمان'} ({order.userPhone})</h3>
                    <p className="text-xs text-slate-400 mt-1">مبلغ کل: {formatToman(order.totalPriceToman)} تومان | تاریخ: {formatPersianDate(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      پرداخت: {order.paymentStatus}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      ارسال: {order.shippingStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;