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
import { fetchSettingsFromFirestore, getCmsFromFirestore } from './firebase';

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

  // Analytics Visitor Tracking (Safe catch)
  useEffect(() => {
    try {
      let vid = localStorage.getItem('omex_visitor_id');
      if (!vid) {
        vid = 'v-' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('omex_visitor_id', vid);
      }
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
    showToast(`✅ ${product.title} به سبد خرید اضافه شد`, 'success');
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
    try {
      const saved = localStorage.getItem('sirikfit_financial_settings');
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return {
      aedRate: 19500,
      cargoRatePerKg: 35,
      profitMargin: 15
    };
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

 // CMS State with Safe Default Arrays (Prevents .filter crashes)
  const [cmsConfig, setCmsConfig] = useState<CmsConfig>(() => {
    try {
      const saved = localStorage.getItem('sirikfit_cms_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          stores: parsed.stores || [],
          localInventory: parsed.localInventory || [],
          deals: parsed.deals || [],
          warehouseCategories: parsed.warehouseCategories || [],
          showLocalInventory: parsed.showLocalInventory ?? true,
          pricingRules: parsed.pricingRules || null,
          apiConfig: parsed.apiConfig || { currencyApiUrl: '', autoUpdateRates: true, scraperEndpoint: '', geminiApiKey: '' }
        };
      }
    } catch (_e) {}
    return {
      stores: [],
      localInventory: [],
      deals: [],
      warehouseCategories: [],
      showLocalInventory: true,
      pricingRules: null,
      apiConfig: { currencyApiUrl: '', autoUpdateRates: true, scraperEndpoint: '', geminiApiKey: '' }
    };
  });
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

  // 🟢 [FIXED_BY_AI]: Direct Firebase fetching for settings and CMS
  const fetchSettings = async () => {
    try {
      const cloudData = await fetchSettingsFromFirestore();
      if (cloudData) {
        setSettings(cloudData as FinancialSettings);
        localStorage.setItem('sirikfit_financial_settings', JSON.stringify(cloudData));
      }
    } catch (err) {
      console.log('Using local settings fallback');
    }
  };

  const fetchCms = async () => {
    try {
      const cloudData = await getCmsFromFirestore();
      if (cloudData) {
        setCmsConfig(cloudData as CmsConfig);
        localStorage.setItem('sirikfit_cms_config', JSON.stringify(cloudData));
      }
    } catch (err) {
      console.log('Using local CMS fallback');
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

  const handlePaymentSuccess = () => {};

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
        {/* PUBLIC PAGE (MAIN) */}
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

            <StoreCards stores={cmsConfig?.stores} cms={cmsConfig} onSelectStoreSample={handleSelectStoreSample} />

            <div id="support-section" className="scroll-mt-16">
              <SupportSection cms={cmsConfig} />
            </div>
          </div>
        )}

        {/* DEDICATED PRODUCT DETAIL & CHECKOUT SCREEN */}
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

        {/* DEDICATED INVENTORY PAGE */}
        {activeTab === 'inventory' && (
          <InventoryPage
            items={cmsConfig?.localInventory || []}
            categories={cmsConfig?.warehouseCategories}
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

        {/* DEDICATED SPECIAL OFFERS & FEATURED DEALS TAB */}
        {activeTab === 'deals' && (
          <div className="space-y-6">
            <FeaturedDeals
              deals={cmsConfig?.deals}
              settings={settings}
              onSelectDeal={handleSelectDeal}
            />
          </div>
        )}

        {/* CUSTOMER ACCOUNT & ORDER TRACKING TAB */}
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

        {/* EXCLUSIVE ADMIN PANEL TAB */}
        {activeTab === 'admin' && (
          <AdminPanel
            settings={settings}
            onUpdateSettings={(newSettings) => {
              setSettings(newSettings);
              localStorage.setItem('sirikfit_financial_settings', JSON.stringify(newSettings));
            }}
            cms={cmsConfig}
            onUpdateCms={(newCms) => {
              setCmsConfig(newCms);
              localStorage.setItem('sirikfit_cms_config', JSON.stringify(newCms));
            }}
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

      {/* Local Inventory Modal */}
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

      {/* Bottom Navigation */}
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