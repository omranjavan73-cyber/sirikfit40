import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AppDashboard } from './components/AppDashboard';
import { HeroCalculator } from './components/HeroCalculator';
import { HeroBanner } from './components/HeroBanner';
import { FeaturedDeals } from './components/FeaturedDeals';
import { StoreCards } from './components/StoreCards';
import { ProductDetailView } from './components/ProductDetailView';
import { PaymentModal } from './components/PaymentModal';
import { CustomerAccountView } from './components/CustomerAccountView';
import { AdminPanel } from './components/AdminPanel';
import { SupportSection } from './components/SupportSection';
import { AuthModal } from './components/AuthModal';
import { LocalInventoryModal } from './components/LocalInventoryModal';
import { InventoryPage } from './components/InventoryPage';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import type { FinancialSettings, Order, TabType, CmsConfig, User, FeaturedDeal, CartItem } from './types';
import { toPersianDigits } from './utils/formatters';
import { DEFAULT_PRICING_RULES } from './utils/pricingEngine';

// Safe Default CMS Config (Guarantees no undefined arrays across any tab)
const SAFE_DEFAULT_CMS: CmsConfig = {
  heroTitle: 'واردات مستقیم مکمل از دبی',
  heroSubtitle: 'تضمین ۱۰۰٪ اصالت کالا و تحویل سریع',
  heroNotice: '',
  heroImage: '',
  showAnnouncementBanner: true,
  announcementText: 'ارسال مستقیم و تضمینی کالا از دبی تا درب منزل',
  announcementBadge: 'تحویل ۵ الی ۷ روز کاری',
  announcementSlogans: [
    '⚡ ارسال مستقیم و تضمینی کالا از دبی تا درب منزل',
    '💯 تضمین ۱۰۰٪ اصالت مکملها و ضمانت بازگشت',
    '🚀 تحویل سریع و ایمن بین ۵ تا ۷ روز کاری'
  ],
  homeBanners: [],
  stores: [],
  deals: [],
  showLocalInventory: true,
  warehouseBannerTitle: 'کالاهای موجود در انبار ایران (ارسال فوری)',
  warehouseBannerSubtitle: 'تحویل ۱ تا ۲ روزه در سراسر کشور • کالاها پلمپ و اورجینال',
  warehouseBannerTheme: 'light',
  warehouseBannerButtonText: 'جستجو و مشاهده همه',
  localInventory: [],
  warehouseCategories: [],
  pricingRules: DEFAULT_PRICING_RULES,
  homeContent: {
    topPromoText: 'سیریک فیت - مکمل‌های تخصصی ورزشی و اورجینال',
    showTopPromo: false,
    appTitle: 'SIRIK FIT',
    appSubtitle: 'مکمل‌های ورزشی و اورجینال',
    brandTitle: 'SIRIK FIT',
    brandSubtitle: 'مکمل‌های ورزشی و اورجینال',
    headerPillSlogan: 'مکمل‌های ورزشی و اورجینال',
    logoUrl: '',
    heroMainHeadline: 'فقط اورجینال، فقط',
    heroHighlightWord: 'نتیجه.',
    heroSubtitle: 'تضمین اصالت کالا، تضمین کیفیت.',
    heroImageUrl: '',
    calcBlackBadge: '✦ خرید مستقیم از دبی',
    calcMainHeadline: 'برآورد قیمت و ثبت سفارش',
    calcSubtitle: 'لینک محصول را وارد کنید تا قیمت تحویل در ایران فوری محاسبه شود.',
    calcScheduleBadge: '📅 ارسال هر دوشنبه و پنجشنبه',
    telegramHandle: '@SIRIK_FIT_Support',
    telegramLink: 'https://t.me/SIRIK_FIT_Support',
    whatsappPhone: 'پاسخگویی سریع ۲۴ ساعته',
    whatsappLink: 'https://wa.me/989120000000',
    showWhatsappCard: true,
    officePhone: '021-91000000',
    dubaiPhone: '+971-500000000',
    showDubaiPhone: true,
    supportHeadline: 'پشتیبانی و مشاوره تخصصی واردات دبی',
    supportSubtitle: 'پاسخگویی ۲۴ ساعته توسط کارشناسان تغذیه و لاجستیک',
    showSupportSection: true,
    showTelegramCard: true,
    telegramTitle: 'ارتباط با پشتیبانی در تلگرام',
    showEmailCard: true,
    emailTitle: 'ارتباط از طریق ایمیل پشتیبانی',
    showPhoneCard: true,
    phoneTitle: 'تلفن پشتیبانی',
    trustBadge1: 'اصالت ۱۰۰٪ کالا',
    trustBadge2: 'حمل ایمن کارگو',
    trustBadge3: 'تحویل ۵ تا ۷ روزه'
  },
  apiConfig: {
    currencyApiUrl: '',
    autoUpdateRates: true,
    scraperEndpoint: '',
    geminiApiKey: ''
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('main');
  const [isCalculatorVisible] = useState(true);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('omex_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('omex_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('omex_cart_items', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Error saving cart items:', e);
    }
  }, [cartItems]);

  const handleAddToCart = (product: {
    title: string;
    url: string;
    priceAed: number;
    originalPriceAed?: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    calculatedToman?: number;
    quantity?: number;
  }) => {
    const qtyToAdd = product.quantity && product.quantity > 0 ? product.quantity : 1;
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.title === product.title || (product.url && item.url === product.url));
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += qtyToAdd;
        return updated;
      }
      return [
        ...prev,
        {
          id: Date.now().toString(),
          title: product.title,
          url: product.url,
          priceAed: product.priceAed,
          originalPriceAed: product.originalPriceAed,
          weightKg: product.weightKg,
          image: product.image,
          storeName: product.storeName,
          calculatedToman: product.calculatedToman,
          quantity: qtyToAdd
        }
      ];
    });

    setSelectedProduct(product);
    showToast(`✅ ${toPersianDigits(qtyToAdd)} عدد ${product.title} به سبد خرید اضافه شد`, 'success');
  };

  const handleUpdateCartQuantity = (id: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    showToast('محصول از سبد خرید حذف شد', 'success');
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Central Financial Settings State (Heart of the app with strict fallback)
  const [settings, setSettings] = useState<FinancialSettings>(() => {
    try {
      const saved = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return {
      aedRate: 19500,
      manualAedRate: 19500,
      autoUpdateRates: true,
      cargoRatePerKg: 35,
      profitMargin: 15,
      minOrderAed: 200
    };
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Safe CMS State Initialization (Never Null)
  const [cmsConfig, setCmsConfig] = useState<CmsConfig>(() => {
    try {
      const saved = localStorage.getItem('sirikfit_cms_config') || localStorage.getItem('omex_home_cms');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...SAFE_DEFAULT_CMS,
          ...parsed,
          stores: parsed.stores || [],
          deals: parsed.deals || [],
          localInventory: parsed.localInventory || [],
          warehouseCategories: parsed.warehouseCategories || [],
          pricingRules: parsed.pricingRules || DEFAULT_PRICING_RULES,
          homeContent: { ...SAFE_DEFAULT_CMS.homeContent, ...(parsed.homeContent || {}) },
          apiConfig: { ...SAFE_DEFAULT_CMS.apiConfig, ...(parsed.apiConfig || {}) }
        };
      }
    } catch (_e) {}
    return SAFE_DEFAULT_CMS;
  });

  const [isLocalInventoryModalOpen, setIsLocalInventoryModalOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<{
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    calculatedTomanOverride?: number;
  } | null>(null);

  const [selectedDealProduct] = useState<{
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
  } | null>(null);

  const [pendingOrderForPayment, setPendingOrderForPayment] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('omex_current_user', JSON.stringify(user));
    } catch (e) {
      console.error('Error saving user:', e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('omex_current_user');
    } catch (e) {
      console.error('Error removing user:', e);
    }
  };

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && data.aedRate) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } font-medium: finally {
      setIsLoadingSettings(false);
    }
  };

  const fetchCms = async () => {
    try {
      const res = await fetch('/api/cms');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setCmsConfig(prev => ({
            ...SAFE_DEFAULT_CMS,
            ...prev,
            ...data,
            stores: data.stores || prev.stores || [],
            deals: data.deals || prev.deals || [],
            localInventory: data.localInventory || prev.localInventory || [],
            warehouseCategories: data.warehouseCategories || prev.warehouseCategories || [],
            pricingRules: data.pricingRules || prev.pricingRules || DEFAULT_PRICING_RULES
          }));
        }
      }
    } catch (err) {
      console.error('Error loading CMS config:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchCms();
  }, []);

  const handleProceedToOrder = (product: {
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    calculatedTomanOverride?: number;
  }) => {
    setSelectedProduct(product);
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderCreated = (newOrder: Order) => {
    setSelectedProduct(null);
    setPendingOrderForPayment(newOrder);
    setIsPaymentModalOpen(true);
  };

  const handleSelectDeal = (deal: FeaturedDeal) => {
    handleAddToCart({
      title: deal.title,
      url: deal.url,
      priceAed: deal.priceAed,
      weightKg: deal.weightKg || 0.5,
      image: deal.image,
      storeName: deal.storeName || deal.brand || 'دبی'
    });
  };

  const handleSelectStoreSample = (storeName: string, defaultUrl: string) => {
    let sampleProduct = {
      title: `محصول سفارشی از ${storeName}`,
      url: defaultUrl,
      priceAed: 150,
      weightKg: 0.5,
      image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
      storeName: storeName
    };
    if (storeName.toLowerCase().includes('gnc')) {
      sampleProduct = {
        title: 'مولتی ویتامین GNC Mega Men Sport',
        url: defaultUrl,
        priceAed: 95,
        weightKg: 0.18,
        image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
        storeName: 'GNC UAE'
      };
    } else if (storeName.toLowerCase().includes('life')) {
      sampleProduct = {
        title: 'امگا ۳ Pharmacy Omega-3 1000mg',
        url: defaultUrl,
        priceAed: 95,
        weightKg: 0.18,
        image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
        storeName: 'Life Pharmacy UAE'
      };
    } else if (storeName.toLowerCase().includes('doctor') || storeName.toLowerCase().includes('dr')) {
      sampleProduct = {
        title: 'مکمل پروتئین وی ON Gold Standard 100% (۵ پوندی)',
        url: defaultUrl,
        priceAed: 320,
        weightKg: 2.3,
        image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
        storeName: 'Dr. Nutrition'
      };
    }
    handleAddToCart(sampleProduct);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-['Vazirmatn',sans-serif] selection:bg-[#7C3AED] selection:text-white pb-24">
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-full shadow-lg font-bold text-xs flex items-center gap-2 border dir-rtl ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <Header
        settings={settings}
        cms={cmsConfig}
        currentUser={currentUser}
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onRefreshSettings={fetchSettings}
        isLoadingSettings={isLoadingSettings}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenCart={() => {
          setActiveTab('detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAccountTab={() => {
          setActiveTab('account');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAdmin={() => {
          setActiveTab('admin');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isCartActive={activeTab === 'detail'}
        isAccountActive={activeTab === 'account'}
        isAdminActive={activeTab === 'admin'}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {activeTab === 'main' && (
          <div id="home" className="space-y-4">
            <HeroBanner cms={cmsConfig} />
            <AnnouncementBanner cms={cmsConfig} />
            <div id="calculator-section" className="scroll-mt-16">
              <HeroCalculator
                settings={settings}
                cms={cmsConfig}
                selectedDealProduct={selectedDealProduct}
                onAddToCart={handleAddToCart}
                onProceedToOrder={handleAddToCart}
              />
            </div>
            <AppDashboard
              settings={settings}
              cms={cmsConfig}
              currentUser={currentUser}
              isCalculatorOpen={isCalculatorVisible}
              onOpenCalculator={() => {
                const el = document.getElementById('calculator-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onSelectCategory={() => {
                setActiveTab('deals');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenSupport={() => {
                const el = document.getElementById('support-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onOpenLocalStock={() => {
                setActiveTab('inventory');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            <StoreCards stores={cmsConfig?.stores || []} cms={cmsConfig} onSelectStoreSample={handleSelectStoreSample} />
            <div id="support-section" className="scroll-mt-16">
              <SupportSection cms={cmsConfig} />
            </div>
          </div>
        )}

        {activeTab === 'detail' && (
          <ProductDetailView
            product={selectedProduct || {
              title: 'مکمل پروتئین وی ON Gold Standard 100% (۵ پوندی)',
              url: 'https://www.drnutrition.com',
              priceAed: 320,
              weightKg: 2.3,
              image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
              storeName: 'Dr. Nutrition'
            }}
            cartItems={cartItems}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveCartItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            settings={settings}
            cms={cmsConfig}
            currentUser={currentUser}
            onBackToMain={() => {
              setActiveTab('main');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOrderCreated={handleOrderCreated}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryPage
            items={cmsConfig?.localInventory || []}
            categories={cmsConfig?.warehouseCategories || []}
            onSelectLocalProduct={(item) => {
              handleAddToCart({
                title: `${item.title} (موجودی انبار ایران)`,
                url: 'https://omex.ir/stock/' + item.id,
                priceAed: Math.round(item.priceToman / (settings.aedRate || 19500)),
                weightKg: 0.5,
                image: item.image,
                storeName: 'انبار ایران (تحویل فوری)',
                calculatedToman: item.priceToman
              });
            }}
          />
        )}

        {activeTab === 'deals' && (
          <div className="space-y-6">
            <FeaturedDeals
              deals={cmsConfig?.deals || []}
              settings={settings}
              onSelectDeal={handleSelectDeal}
            />
          </div>
        )}

        {activeTab === 'account' && (
          <CustomerAccountView
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onLoginSuccess={(user) => {
              handleAuthSuccess(user);
              setActiveTab('account');
            }}
            showToast={showToast}
            onPayPendingOrder={(order) => {
              setPendingOrderForPayment(order);
              setIsPaymentModalOpen(true);
            }}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            settings={settings}
            onUpdateSettings={(newSettings) => setSettings(newSettings)}
            cms={cmsConfig}
            onUpdateCms={(newCms) => setCmsConfig(newCms)}
          />
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        showToast={showToast}
        onLoginSuccess={(user) => {
          handleAuthSuccess(user);
          setActiveTab('account');
        }}
      />

      {pendingOrderForPayment && (
        <PaymentModal
          order={pendingOrderForPayment}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPendingOrderForPayment(null);
            setActiveTab('account');
          }}
          onPaymentSuccess={() => {}}
        />
      )}

      <LocalInventoryModal
        isOpen={isLocalInventoryModalOpen}
        onClose={() => setIsLocalInventoryModalOpen(false)}
        items={cmsConfig?.localInventory || []}
        onSelectLocalProduct={(item) => {
          setIsLocalInventoryModalOpen(false);
          handleProceedToOrder({
            title: `${item.title} (موجودی انبار ایران)`,
            url: 'https://omex.ir/stock/' + item.id,
            priceAed: Math.round(item.priceToman / (settings.aedRate || 19500)),
            weightKg: 0.5,
            image: item.image,
            storeName: 'انبار ایران (تحویل فوری)',
            calculatedTomanOverride: item.priceToman
          });
        }}
      />

      <BottomNav
        activeTab={activeTab}
        showLocalInventory={cmsConfig?.showLocalInventory ?? true}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}