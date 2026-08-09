import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AppDashboard } from './components/AppDashboard';
import { HeroCalculator } from './components/HeroCalculator';
import { HeroBanner } from './components/HeroBanner';
import { FeaturedDeals } from './components/FeaturedDeals';
import { StoreCards } from './components/StoreCards';
import { OrderForm } from './components/OrderForm';
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
import { toPersianDigits, getEffectiveAedRate } from './utils/formatters';
import { fetchSettingsFromFirestore, getCmsFromFirestore } from './firebase';
import { setEffectiveGeminiKeysList, getEffectiveGeminiKeysList } from './utils/geminiKey';
import { Plane } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('main');
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(true);

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

  // Analytics Visitor Tracking
  useEffect(() => {
    try {
      let vid = localStorage.getItem('omex_visitor_id');
      if (!vid) {
        vid = 'v-' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('omex_visitor_id', vid);
      }
      fetch('/api/analytics/track-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: vid,
          page: activeTab,
          referrer: document.referrer || 'Direct',
          userAgent: navigator.userAgent
        })
      }).catch(() => {});
    } catch (_e) {}
  }, [activeTab]);

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

  // Financial Settings State
  const [settings, setSettings] = useState<FinancialSettings>(() => {
    const rate = getEffectiveAedRate(null);
    return {
      aedRate: rate,
      manualAedRate: rate,
      cargoRatePerKg: 35,
      profitMargin: 15
    };
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // CMS State
  const [cmsConfig, setCmsConfig] = useState<CmsConfig | null>(null);
  const [isLocalInventoryModalOpen, setIsLocalInventoryModalOpen] = useState(false);

  // Active Selected Product for Order Form
  const [selectedProduct, setSelectedProduct] = useState<{
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    calculatedTomanOverride?: number;
  } | null>(null);

  // Selected Deal for Calculator Population
  const [selectedDealProduct, setSelectedDealProduct] = useState<{
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
  } | null>(null);

  // Active Pending Order for Payment Gateway Modal
  const [pendingOrderForPayment, setPendingOrderForPayment] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync user with localStorage
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

  // Fetch Settings & CMS Config directly via Firestore SDK with LocalStorage Fallback
  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const fsSettings = await fetchSettingsFromFirestore();
      if (fsSettings) {
        setSettings(prev => ({ ...prev, ...fsSettings }));
      } else {
        const saved = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed) setSettings(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch (err) {
      console.warn('Error loading settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const fetchCms = async () => {
    try {
      const fsCms = await getCmsFromFirestore();
      if (fsCms) {
        if (fsCms.homeContent) {
          fsCms.homeContent.appTitle = (fsCms.homeContent.appTitle || 'SIRIK FIT').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').replace(/PRO/gi, '').replace(/OMEX/gi, '').trim() || 'SIRIK FIT';
          fsCms.homeContent.brandTitle = (fsCms.homeContent.brandTitle || 'SIRIK FIT').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').replace(/PRO/gi, '').replace(/OMEX/gi, '').trim() || 'SIRIK FIT';
          fsCms.homeContent.brandSubtitle = (fsCms.homeContent.brandSubtitle || 'مکملهای ورزشی و اورجینال').replace(/PLATFORM IMPORTS/gi, '').replace(/SIRIK FIT PRO/gi, 'SIRIK FIT').trim() || 'مکملهای ورزشی و اورجینال';
        }
        setCmsConfig(fsCms);

        // Re-hydrate Gemini API keys in localStorage automatically upon page refresh/re-load
        const loadedKeys = getEffectiveGeminiKeysList(fsCms?.apiConfig?.geminiApiKeys || fsCms?.apiConfig?.geminiApiKey);
        if (loadedKeys.length > 0) {
          setEffectiveGeminiKeysList(loadedKeys);
        }
      } else {
        const raw = localStorage.getItem('sirikfit_cms_config') || localStorage.getItem('omex_home_cms');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) {
            setCmsConfig(parsed);
            const loadedKeys = getEffectiveGeminiKeysList(parsed?.apiConfig?.geminiApiKeys || parsed?.apiConfig?.geminiApiKey);
            if (loadedKeys.length > 0) {
              setEffectiveGeminiKeysList(loadedKeys);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error loading CMS config:', err);
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('omex_home_cms');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed.appTitle?.includes('PLATFORM IMPORTS') ||
          parsed.appTitle?.includes('PRO') ||
          parsed.brandTitle?.includes('PLATFORM IMPORTS') ||
          parsed.brandTitle?.includes('PRO')
        ) {
          parsed.appTitle = 'SIRIK FIT';
          parsed.brandTitle = 'SIRIK FIT';
          parsed.brandSubtitle = 'مکملهای ورزشی و اورجینال';
          parsed.appSubtitle = 'مکملهای ورزشی و اورجینال';
          localStorage.setItem('omex_home_cms', JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.error('Error purging localStorage:', e);
    }

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

  const handlePaymentSuccess = () => {
    //
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
      {/* Toast Notification Banner */}
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

      {/* Top Header */}
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

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {/* PUBLIC PAGE (MAIN / صفحه اصلی - COMPACT PREVIEW & CLEAN HOME SCREEN) */}
        {activeTab === 'main' && (
          <div id="home" className="space-y-4">
            {/* Dynamic Sports Hero Banner */}
            <HeroBanner cms={cmsConfig} />

            {/* Rotating Slogan Announcement Banner */}
            <AnnouncementBanner cms={cmsConfig} />

            {/* Compact Top Hero Calculator Box */}
            <div id="calculator-section" className="scroll-mt-16">
              <HeroCalculator
                settings={settings}
                cms={cmsConfig}
                selectedDealProduct={selectedDealProduct}
                onAddToCart={handleAddToCart}
                onProceedToOrder={handleAddToCart}
              />
            </div>

            {/* App Grid Dashboard Quick Access */}
            <AppDashboard
              settings={settings}
              cms={cmsConfig}
              currentUser={currentUser}
              isCalculatorOpen={isCalculatorVisible}
              onOpenCalculator={() => {
                const el = document.getElementById('calculator-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onSelectCategory={(category) => {
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

            {/* Popular Stores Banner */}
            <StoreCards stores={cmsConfig?.stores} cms={cmsConfig} onSelectStoreSample={handleSelectStoreSample} />

            {/* Support & Contact Section */}
            <div id="support-section" className="scroll-mt-16">
              <SupportSection cms={cmsConfig} />
            </div>
          </div>
        )}

        {/* DEDICATED PRODUCT DETAIL & CHECKOUT SCREEN (#detail) */}
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

        {/* DEDICATED INVENTORY PAGE (صفحه اختصاصی انبار ایران) */}
        {activeTab === 'inventory' && (
          <InventoryPage
            items={cmsConfig?.localInventory || []}
            categories={cmsConfig?.warehouseCategories}
            onSelectLocalProduct={(item) => {
              handleAddToCart({
                title: `${item.title} (موجودی انبار ایران)`,
                url: 'https://omex.ir/stock/' + item.id,
                priceAed: Math.round(item.priceToman / getEffectiveAedRate(settings)),
                weightKg: 0.5,
                image: item.image,
                storeName: 'انبار ایران (تحویل فوری)',
                calculatedToman: item.priceToman
              });
            }}
          />
        )}

        {/* DEDICATED SPECIAL OFFERS & FEATURED DEALS TAB (صفحه اختصاصی پیشنهادها) */}
        {activeTab === 'deals' && (
          <div className="space-y-6">
            <FeaturedDeals
              deals={cmsConfig?.deals}
              settings={settings}
              onSelectDeal={handleSelectDeal}
            />
          </div>
        )}

        {/* CUSTOMER ACCOUNT & ORDER TRACKING TAB (حساب کاربری / پیگیری سفارش) */}
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

        {/* EXCLUSIVE ADMIN PANEL TAB (ورود مدیر / مدیریت) */}
        {activeTab === 'admin' && (
          <AdminPanel
            settings={settings}
            onUpdateSettings={(newSettings) => setSettings(newSettings)}
            cms={cmsConfig}
            onUpdateCms={(newCms) => setCmsConfig(newCms)}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        showToast={showToast}
        onLoginSuccess={(user) => {
          handleAuthSuccess(user);
          setActiveTab('account');
        }}
      />

      {/* Payment Gateway Modal */}
      {pendingOrderForPayment && (
        <PaymentModal
          order={pendingOrderForPayment}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPendingOrderForPayment(null);
            setActiveTab('account');
          }}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Iran In-Stock Local Inventory Modal */}
      <LocalInventoryModal
        isOpen={isLocalInventoryModalOpen}
        onClose={() => setIsLocalInventoryModalOpen(false)}
        items={cmsConfig?.localInventory || []}
        onSelectLocalProduct={(item) => {
          setIsLocalInventoryModalOpen(false);
          handleProceedToOrder({
            title: `${item.title} (موجودی انبار ایران)`,
            url: 'https://omex.ir/stock/' + item.id,
            priceAed: Math.round(item.priceToman / getEffectiveAedRate(settings)),
            weightKg: 0.5,
            image: item.image,
            storeName: 'انبار ایران (تحویل فوری)',
            calculatedTomanOverride: item.priceToman
          });
        }}
      />

      {/* Public Bottom Navigation Bar */}
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
