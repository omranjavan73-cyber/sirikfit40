import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PaymentCallback } from './pages/PaymentCallback';
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
import { TrustBadgesSection } from './components/TrustBadgesSection';
import { AuthModal } from './components/AuthModal';
import { LocalInventoryModal } from './components/LocalInventoryModal';
import { LocalInventorySection } from './components/LocalInventorySection';
import { InventoryPage } from './components/InventoryPage';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { PopularProductsCarousel, PopularProductItem } from './components/PopularProductsCarousel';
import { CircularCategoryRow } from './components/CircularCategoryRow';
import { ReviewsSection } from './components/ReviewsSection';
import { FAQView } from './components/FAQView';
import { SeoHeadInjector } from './components/SeoHeadInjector';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { FinancialSettings, Order, TabType, CmsConfig, User, FeaturedDeal, CartItem } from './types';
import { toPersianDigits, getEffectiveAedRate, calculateFinalToman } from './utils/formatters';
import { fetchSettingsFromFirestore, getCmsFromFirestore, db, isFirestoreGrpcNoise } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { setEffectiveGeminiKeysList, getEffectiveGeminiKeysList } from './utils/geminiKey';
import { SettingsProvider, useSettings } from './context/SettingsContext';

function MainApp() {
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

  // Analytics Visitor Tracking (resilient, never crashes)
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

  // Browser & Mobile Back Button Navigation (Prevents website exit on Cart/Detail view)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (activeTab === 'cart' || activeTab === 'detail' || activeTab === 'inventory' || activeTab === 'deals' || activeTab === 'faq') {
        setActiveTab('main');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);



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

  // Financial Settings State - Single Source of Truth initialized from LocalStorage FIRST
  const [settings, setSettings] = useState<FinancialSettings>(() => {
    let rate: number | null = null;
    let cargo = 35;
    let margin = 15;
    let minOrderToman = 0;
    let minOrderAed = 0;

    if (typeof window !== 'undefined') {
      try {
        const directRate = localStorage.getItem('sirikfit_aed_rate');
        if (directRate && !isNaN(Number(directRate)) && Number(directRate) > 0) {
          rate = Number(directRate);
        }

        const saved = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed) {
            const exRate = Number(parsed.exchangeRate || parsed.aedRate || parsed.manualAedRate);
            if (!isNaN(exRate) && exRate > 0 && !directRate) {
              rate = exRate;
            }
            if (typeof parsed.cargoRatePerKg === 'number') cargo = parsed.cargoRatePerKg;
            if (typeof parsed.profitMargin === 'number') margin = parsed.profitMargin;
            if (typeof parsed.minOrderAmountToman === 'number') minOrderToman = parsed.minOrderAmountToman;
            if (typeof parsed.minOrderAed === 'number') minOrderAed = parsed.minOrderAed;
          }
        }
      } catch (_e) {}
    }

    return {
      aedRate: rate,
      manualAedRate: rate,
      cargoRatePerKg: cargo,
      profitMargin: margin,
      minOrderAmountToman: minOrderToman,
      minOrderAed: minOrderAed
    };
  });

  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // CMS State initialized from LocalStorage FIRST
  const [cmsConfig, setCmsConfig] = useState<CmsConfig | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sirikfit_cms_config') || localStorage.getItem('omex_home_cms');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed) return parsed;
        }
      } catch (_e) {}
    }
    return null;
  });

  const [isLocalInventoryModalOpen, setIsLocalInventoryModalOpen] = useState(false);

  // Active Selected Product for Order Form / Product Detail
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
  const [selectedDealProduct] = useState<{
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

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const addToCart = (product: any, selectedFlavor?: string, selectedSize?: string) => {
    const flavorStr = selectedFlavor || product.selectedFlavor || '';
    const sizeStr = selectedSize || product.selectedSize || '';
    const id = product.id || product.url || product.title || 'item';
    const cartItemId = `${id}-${flavorStr}-${sizeStr}`;
    const qtyToAdd = typeof product.quantity === 'number' && product.quantity > 0 ? product.quantity : 1;

    setCartItems((prevCart: any[]) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.cartItemId === cartItemId || (item.id === id && item.selectedFlavor === selectedFlavor && item.selectedSize === selectedSize)
      );

      let updatedCart: any[];
      if (existingItemIndex > -1) {
        updatedCart = [...prevCart];
        updatedCart[existingItemIndex].quantity += qtyToAdd;
      } else {
        const newItem = {
          ...product,
          id: product.id || id,
          cartItemId,
          product,
          selectedFlavor: flavorStr || undefined,
          selectedSize: sizeStr || undefined,
          quantity: qtyToAdd
        };
        updatedCart = [...prevCart, newItem];
      }

      try {
        localStorage.setItem('omex_cart_items', JSON.stringify(updatedCart));
      } catch (e) {
        console.error('Error persisting cart items:', e);
      }
      return updatedCart;
    });

    showToast("محصول با موفقیت به سبد خرید اضافه شد", "success");
  };

  const handleAddToCart = addToCart;

  // Global Event Listener for Real-Time Settings and Rate Updates (STEP 2 PIPELINE)
  useEffect(() => {
    const syncSettingsFromStorage = (e?: Event) => {
      if (typeof window === 'undefined') return;
      try {
        let eventRate: number | null = null;
        const detail = (e as CustomEvent)?.detail;
        if (detail?.aedRate) {
          eventRate = detail.aedRate;
        } else if (detail?.financialSettings?.aedRate) {
          eventRate = detail.financialSettings.aedRate;
        }

        let currentLocalRate = eventRate;
        if (!currentLocalRate) {
          const directRate = localStorage.getItem('sirikfit_aed_rate');
          if (directRate && !isNaN(Number(directRate)) && Number(directRate) > 0) {
            currentLocalRate = Number(directRate);
          }
        }

        const savedFin = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
        if (savedFin) {
          const parsedFin = JSON.parse(savedFin);
          if (parsedFin) {
            const finalRate = currentLocalRate || Number(parsedFin.exchangeRate || parsedFin.aedRate || parsedFin.manualAedRate);
            setSettings(prev => ({
              ...prev,
              ...parsedFin,
              ...(detail?.financialSettings || {}),
              aedRate: finalRate || prev.aedRate,
              manualAedRate: finalRate || prev.manualAedRate
            }));
          }
        } else if (currentLocalRate) {
          setSettings(prev => ({
            ...prev,
            ...(detail?.financialSettings || {}),
            aedRate: currentLocalRate,
            manualAedRate: currentLocalRate
          }));
        }

        if (detail?.cmsConfig) {
          setCmsConfig(prev => ({
            ...(prev || {}),
            ...detail.cmsConfig
          }));
        } else {
          const savedCms = localStorage.getItem('sirikfit_cms_config');
          if (savedCms) {
            const parsedCms = JSON.parse(savedCms);
            if (parsedCms) {
              setCmsConfig(parsedCms);
            }
          }
        }
      } catch (err) {
        console.warn('Error syncing settings from storage event:', err);
      }
    };

    window.addEventListener('settingsUpdated', syncSettingsFromStorage as EventListener);
    window.addEventListener('storage', syncSettingsFromStorage as EventListener);

    return () => {
      window.removeEventListener('settingsUpdated', syncSettingsFromStorage as EventListener);
      window.removeEventListener('storage', syncSettingsFromStorage as EventListener);
    };
  }, []);

  // 🟢 Real-time Firestore listeners for settings/app, settings/cms, and settings/general
  useEffect(() => {
    let unsubApp: (() => void) | null = null;
    let unsubCms: (() => void) | null = null;
    let unsubGen: (() => void) | null = null;

    try {
      unsubApp = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const rate = Number(data.aedRate || data.manualAedRate || 0);
          if (rate > 0) {
            try {
              localStorage.setItem('sirikfit_aed_rate', String(rate));
            } catch (_e) {}
            setSettings(prev => ({
              ...prev,
              ...data,
              aedRate: rate,
              manualAedRate: rate
            }));
          } else {
            setSettings(prev => ({ ...prev, ...data }));
          }
          if (data.features) {
            try {
              localStorage.setItem('sirikfit_features_config', JSON.stringify(data.features));
            } catch (_e) {}
          }
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('Firestore app settings onSnapshot notice:', err);
      });

      unsubCms = onSnapshot(doc(db, 'settings', 'cms'), (snap) => {
        if (snap.exists()) {
          const cmsData = snap.data() as CmsConfig;
          if (cmsData) {
            setCmsConfig(prev => ({ ...prev, ...cmsData }));
            try {
              localStorage.setItem('sirikfit_cms_config', JSON.stringify(cmsData));
            } catch (_e) {}
          }
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('Firestore cms settings onSnapshot notice:', err);
      });

      unsubGen = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists()) {
          const genData = snap.data();
          if (genData) {
            const revVal = genData.showReviewsSection !== undefined
              ? Boolean(genData.showReviewsSection)
              : (genData.showComments !== undefined ? Boolean(genData.showComments) : (genData.showReviews !== undefined ? Boolean(genData.showReviews) : undefined));

            setCmsConfig(prev => {
              if (!prev) return prev;
              const finalRev = revVal !== undefined ? revVal : (prev.showReviewsSection !== undefined ? prev.showReviewsSection : true);
              return {
                ...prev,
                showReviewsSection: finalRev,
                showReviews: finalRev,
                showComments: finalRev,
                features: {
                  ...(prev.features || {}),
                  showReviews: finalRev,
                  showComments: finalRev
                },
                showPriceBreakdown: genData.showPriceBreakdown !== undefined ? Boolean(genData.showPriceBreakdown) : prev.showPriceBreakdown,
                showAnnouncementBanner: genData.showAnnouncementBanner !== undefined ? Boolean(genData.showAnnouncementBanner) : prev.showAnnouncementBanner,
                showLocalInventory: genData.showLocalInventory !== undefined ? Boolean(genData.showLocalInventory) : prev.showLocalInventory
              };
            });
          }
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('Firestore general settings onSnapshot notice:', err);
      });
    } catch (fsErr) {
      console.warn('Error setting up Firestore onSnapshot listeners:', fsErr);
    }

    return () => {
      if (unsubApp) unsubApp();
      if (unsubCms) unsubCms();
      if (unsubGen) unsubGen();
    };
  }, []);

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

  // Fetch Settings & CMS Config directly via Firestore SDK with LocalStorage Precedence & Timeout Guard
  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

    try {
      let localRate: number | null = null;
      let localSettings: any = null;

      if (typeof window !== 'undefined') {
        const direct = localStorage.getItem('sirikfit_aed_rate');
        if (direct && !isNaN(Number(direct)) && Number(direct) > 0) {
          localRate = Number(direct);
        }
        const saved = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
        if (saved) {
          try {
            localSettings = JSON.parse(saved);
          } catch (_e) {}
        }
      }

      const fsSettings = await Promise.race([fetchSettingsFromFirestore(), timeoutPromise]);

      if (fsSettings) {
        setSettings(prev => {
          const fsRate = Number(fsSettings.aedRate || fsSettings.manualAedRate || 0);
          const effectiveRate = (localRate && localRate > 0) ? localRate : (fsRate > 0 ? fsRate : prev.aedRate);
          return {
            ...prev,
            ...fsSettings,
            aedRate: effectiveRate,
            manualAedRate: effectiveRate,
            cargoRatePerKg: typeof fsSettings.cargoRatePerKg === 'number' ? fsSettings.cargoRatePerKg : prev.cargoRatePerKg,
            profitMargin: typeof fsSettings.profitMargin === 'number' ? fsSettings.profitMargin : prev.profitMargin
          };
        });
      } else if (localSettings) {
        setSettings(prev => ({
          ...prev,
          ...localSettings,
          aedRate: localRate || Number(localSettings.aedRate || localSettings.manualAedRate) || prev.aedRate,
          manualAedRate: localRate || Number(localSettings.manualAedRate || localSettings.aedRate) || prev.manualAedRate
        }));
      }
    } catch (err) {
      console.warn('Error loading settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const fetchCms = async () => {
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

    try {
      const fsCms = await Promise.race([getCmsFromFirestore(), timeoutPromise]);
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

  const handleRefreshAllData = async () => {
    await Promise.all([fetchSettings(), fetchCms()]);
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

  const handleInitiatePaymentForOrder = async (order: Order) => {
    setPendingOrderForPayment(order);
    const activeGw = (cmsConfig as any)?.paymentGateway?.activeGateway || 'zibal';
    if (activeGw === 'zibal') {
      try {
        const { initiateZibalPayment } = await import('./services/paymentService');
        await initiateZibalPayment({
          ...order,
          amount: order.calculatedToman || (order as any).totalToman || 0
        });
        return;
      } catch (err) {
        console.error('Direct Zibal payment initiation failed, opening modal fallback:', err);
      }
    }
    setIsPaymentModalOpen(true);
  };

  const handleOrderCreated = (newOrder: Order) => {
    setSelectedProduct(null);
    handleInitiatePaymentForOrder(newOrder);
  };

  const handlePaymentSuccess = () => {
    //
  };

  const handleSelectDeal = (deal: FeaturedDeal) => {
    setSelectedProduct({
      title: deal.title,
      url: deal.url,
      priceAed: deal.priceAed,
      originalPriceAed: deal.originalPriceAed,
      discountPercent: deal.discountPercent,
      weightKg: deal.weightKg || 0.5,
      image: deal.image,
      storeName: deal.storeName || deal.brand || 'دبی',
      brand: deal.brand || deal.storeName || 'دبی',
      category: deal.category,
      description: deal.description || 'پیشنهاد ویژه خرید مستقیم از دبی با بهترین قیمت',
      badge: deal.badge || '🔥 پیشنهاد ویژه',
      inStock: true
    });
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStoreSample = (storeName: string, defaultUrl: string) => {
    let sampleProduct: any = {
      title: `محصول سفارشی از ${storeName}`,
      url: defaultUrl,
      priceAed: 150,
      weightKg: 0.5,
      image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
      storeName: storeName,
      brand: storeName,
      category: 'نمونه فروشگاه',
      description: 'خرید مستقیم از نمایندگی رسمی با تضمین ۱۰۰٪ اصالت کالا'
    };
    if (storeName.toLowerCase().includes('gnc')) {
      sampleProduct = {
        title: 'مولتی ویتامین GNC Mega Men Sport',
        url: defaultUrl,
        priceAed: 95,
        weightKg: 0.18,
        image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
        storeName: 'GNC UAE',
        brand: 'GNC',
        category: 'مولتی ویتامین',
        description: 'مولتی ویتامین تخصصی آقایان، حاوی ترکیب کامل ویتامین‌ها، مواد معدنی و آنتی‌اکسیدان‌های قوی'
      };
    } else if (storeName.toLowerCase().includes('life')) {
      sampleProduct = {
        title: 'امگا ۳ Pharmacy Omega-3 1000mg',
        url: defaultUrl,
        priceAed: 95,
        weightKg: 0.18,
        image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
        storeName: 'Life Pharmacy UAE',
        brand: 'Life Pharmacy',
        category: 'ویتامین و سلامت',
        description: 'اسیدهای چرب امگا ۳ خالص فاقد جیوه، برای تقویت سلامت قلب، مفاصل و مغز'
      };
    } else if (storeName.toLowerCase().includes('doctor') || storeName.toLowerCase().includes('dr')) {
      sampleProduct = {
        title: 'مکمل پروتئین وی ON Gold Standard 100% (۵ پوندی)',
        url: defaultUrl,
        priceAed: 320,
        weightKg: 2.3,
        image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400',
        storeName: 'Dr. Nutrition',
        brand: 'Optimum Nutrition',
        category: 'مکمل‌های ورزشی',
        description: 'پروتئین وی ایزوله زودجذب با کیفیت بالا، حاوی ۵.۵ گرم BCAA و ۴ گرم گلوتامین در هر سروینگ'
      };
    }
    setSelectedProduct(sampleProduct);
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        onRefreshSettings={handleRefreshAllData}
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-3 pb-8">
        {/* PUBLIC PAGE (MAIN / صفحه اصلی - COMPACT PREVIEW & CLEAN HOME SCREEN) */}
        {activeTab === 'main' && (
          <div id="home" className="space-y-2.5">
            {/* Dynamic Sports Hero Banner */}
            <HeroBanner cms={cmsConfig} />

            {/* Rotating Slogan Announcement Banner */}
            <AnnouncementBanner cms={cmsConfig} />

            {/* Popular Samples Section (نمونه‌های محبوب) */}
            {(() => {
              const popularDeals = (cmsConfig?.deals || []).filter(d => d && (d.isPopularSample || d.isFeaturedInCalculator) && d.isActive !== false);
              const popularLocal = (cmsConfig?.localInventory || []).filter(i => i && i.isPopularSample && i.inStock !== false);

              const getLocalPrice = (item: any) => {
                return item.priceToman || item.price || item.calculatedToman;
              };

              const getDealPrice = (deal: any) => {
                if (deal.priceToman) return deal.priceToman;
                if (deal.calculatedToman) return deal.calculatedToman;
                if (deal.priceAed) {
                  const effectiveRate = getEffectiveAedRate(settings, cmsConfig) || settings.aedRate || 23000;
                  return calculateFinalToman(
                    deal.priceAed,
                    deal.weightKg || 0.5,
                    settings.cargoRatePerKg || 35,
                    settings.profitMargin || 20,
                    effectiveRate
                  );
                }
                return deal.price;
              };

              let popularList: PopularProductItem[] = [
                ...popularLocal.map(item => ({
                  id: `local-${item.id}`,
                  title: item.title,
                  price: getLocalPrice(item),
                  image: item.image || 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80',
                  rawItem: item,
                  type: 'local' as const
                })),
                ...popularDeals.map(deal => ({
                  id: `deal-${deal.id}`,
                  title: deal.title,
                  price: getDealPrice(deal),
                  image: deal.image || 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=500&auto=format&fit=crop&q=80',
                  rawItem: deal,
                  type: 'deal' as const
                }))
              ];

              if (popularList.length === 0) {
                const fallbackLocal = (cmsConfig?.localInventory || []).slice(0, 3);
                const fallbackDeals = (cmsConfig?.deals || []).slice(0, 3);
                popularList = [
                  ...fallbackLocal.map(item => ({
                    id: `local-${item.id}`,
                    title: item.title,
                    price: getLocalPrice(item),
                    image: item.image || 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80',
                    rawItem: item,
                    type: 'local' as const
                  })),
                  ...fallbackDeals.map(deal => ({
                    id: `deal-${deal.id}`,
                    title: deal.title,
                    price: getDealPrice(deal),
                    image: deal.image || 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=500&auto=format&fit=crop&q=80',
                    rawItem: deal,
                    type: 'deal' as const
                  }))
                ];
              }

              const popularOrder = (cmsConfig as any)?.popularSamplesOrder || [];
              if (popularOrder.length > 0) {
                popularList.sort((a, b) => {
                  const rawIdA = a.rawItem ? a.rawItem.id : a.id;
                  const rawIdB = b.rawItem ? b.rawItem.id : b.id;

                  const idxA = popularOrder.indexOf(a.id) !== -1
                    ? popularOrder.indexOf(a.id)
                    : (popularOrder.indexOf(rawIdA) !== -1 ? popularOrder.indexOf(rawIdA) : 999);

                  const idxB = popularOrder.indexOf(b.id) !== -1
                    ? popularOrder.indexOf(b.id)
                    : (popularOrder.indexOf(rawIdB) !== -1 ? popularOrder.indexOf(rawIdB) : 999);

                  return idxA - idxB;
                });
              }

              return (
                <PopularProductsCarousel
                  items={popularList}
                  onAddToCart={addToCart}
                  onSelectProduct={(item) => {
                    const effectiveRate = getEffectiveAedRate(settings, cmsConfig) || 1;
                    if (item.type === 'local' && item.rawItem) {
                      const local = item.rawItem;
                      const calcAed = Math.round((local.priceToman || 0) / effectiveRate);
                      setSelectedProduct({
                        title: `${local.title} (موجودی انبار ایران)`,
                        url: 'https://omex.ir/stock/' + local.id,
                        priceAed: calcAed > 0 ? calcAed : 100,
                        originalPriceAed: local.originalPriceToman ? Math.round(local.originalPriceToman / effectiveRate) : 0,
                        weightKg: 0.5,
                        image: local.image || 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80',
                        storeName: 'انبار ایران (تحویل فوری)',
                        brand: 'انبار ایران',
                        calculatedTomanOverride: local.priceToman,
                        category: local.category || 'موجودی ایران',
                        description: local.description || 'اورجینال - موجود در انبار ایران جهت ارسال فوری ۲۴ ساعته',
                        badge: local.deliveryBadge || '⚡ تحویل فوری ۲۴ ساعته',
                        inStock: local.inStock ?? true,
                        isLocalInventory: true,
                        flavors: local.flavors || [],
                        sizes: local.sizes || []
                      });
                      setActiveTab('detail');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else if (item.type === 'deal' && item.rawItem) {
                      const deal = item.rawItem;
                      setSelectedProduct({
                        title: deal.title || 'پیشنهاد ویژه دبی',
                        url: deal.url || 'https://drnutrition.com',
                        priceAed: deal.priceAed || 100,
                        originalPriceAed: deal.originalPriceAed || 0,
                        discountPercent: deal.discountPercent || 0,
                        weightKg: deal.weightKg || 0.5,
                        image: deal.image || 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=500&auto=format&fit=crop&q=80&w=400',
                        storeName: deal.storeName || deal.brand || 'فروشگاه دبی',
                        brand: deal.brand || deal.storeName || 'دبی',
                        category: deal.category || 'پیشنهاد ویژه',
                        description: deal.description || 'پیشنهاد ویژه خرید مستقیم از دبی با بهترین قیمت',
                        badge: deal.badge || '🔥 پیشنهاد ویژه',
                        inStock: true,
                        flavors: deal.flavors || [],
                        sizes: deal.sizes || []
                      });
                      setActiveTab('detail');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      setSelectedProduct({
                        title: item.title || 'محصول نمونه محبوب',
                        url: 'https://drnutrition.com',
                        priceAed: 150,
                        weightKg: 0.5,
                        image: item.image || 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80',
                        storeName: 'فروشگاه آنلاین دبی',
                        brand: 'دبی',
                        category: 'مکمل‌های ورزشی',
                        description: 'ضمانت اصالت ۱۰۰٪، کیفیت اورجینال و ارسال مستقیم از دبی',
                        badge: '⭐ محبوب',
                        inStock: true
                      });
                      setActiveTab('detail');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  onSelectCategory={() => {
                    setActiveTab('deals');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              );
            })()}

            {/* Compact Top Hero Calculator Box */}
            <div id="calculator-section" className="scroll-mt-16">
              <HeroCalculator
                settings={settings}
                cms={cmsConfig}
                selectedDealProduct={selectedDealProduct}
                onAddToCart={addToCart}
                onProceedToOrder={handleProceedToOrder}
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

            {/* Popular Stores Banner */}
            <StoreCards stores={cmsConfig?.stores} cms={cmsConfig} onSelectStoreSample={handleSelectStoreSample} />

            {/* Reviews & Suggestions Section (Global visibility controlled via Admin Panel -> General Settings) */}
            <ReviewsSection showReviewsSection={(cmsConfig?.features?.showReviews ?? cmsConfig?.features?.showComments ?? cmsConfig?.showReviewsSection ?? cmsConfig?.showReviews ?? cmsConfig?.showComments) !== false} cms={cmsConfig} />

            {/* Support & Contact Section */}
            <div id="support-section" className="scroll-mt-16">
              <SupportSection
                cms={cmsConfig}
                onOpenFAQ={() => {
                  setActiveTab('faq');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>

            {/* Trust Badges Section (eNamad & Samandehi) */}
            <TrustBadgesSection cms={cmsConfig} settings={settings} />
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
            onAddToCart={addToCart}
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
            onAddToCart={addToCart}
            onSelectLocalProduct={(item) => {
              const effectiveRate = getEffectiveAedRate(settings, cmsConfig) || 1;
              const calcAed = Math.round((item.priceToman || 0) / effectiveRate);
              setSelectedProduct({
                title: `${item.title} (موجودی انبار ایران)`,
                url: 'https://omex.ir/stock/' + item.id,
                priceAed: calcAed > 0 ? calcAed : 100,
                originalPriceAed: item.originalPriceToman ? Math.round(item.originalPriceToman / effectiveRate) : 0,
                weightKg: 0.5,
                image: item.image || 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80',
                storeName: 'انبار ایران (تحویل فوری)',
                brand: 'انبار ایران',
                calculatedTomanOverride: item.priceToman,
                category: item.category || 'موجودی ایران',
                description: item.description || 'اورجینال - موجود در انبار ایران جهت ارسال فوری ۲۴ ساعته',
                badge: item.deliveryBadge || '⚡ تحویل فوری ۲۴ ساعته',
                inStock: item.inStock ?? true,
                isLocalInventory: true,
                flavors: item.flavors || [],
                sizes: item.sizes || []
              });
              setActiveTab('detail');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* DEDICATED SPECIAL OFFERS & FEATURED DEALS TAB (صفحه اختصاصی پیشنهادها) */}
        {activeTab === 'deals' && (
          <div className="space-y-6">
            <FeaturedDeals
              deals={cmsConfig?.deals}
              categories={cmsConfig?.warehouseCategories}
              settings={settings}
              onSelectDeal={handleSelectDeal}
              onAddToCart={addToCart}
            />
          </div>
        )}

        {/* DEDICATED FAQ PAGE (صفحه اختصاصی سوالات متداول و راهنمای خرید) */}
        {activeTab === 'faq' && (
          <FAQView
            onBack={() => {
              setActiveTab('main');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            showToast={showToast}
          />
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
              handleInitiatePaymentForOrder(order);
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
            showToast={showToast}
            onRefresh={handleRefreshAllData}
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
          activeGateway={(cmsConfig as any)?.paymentGateway?.activeGateway || 'zibal'}
          settings={settings}
          gatewayConfig={(cmsConfig as any)?.paymentGateway}
        />
      )}

      {/* Iran In-Stock Local Inventory Modal */}
      <LocalInventoryModal
        isOpen={isLocalInventoryModalOpen}
        onClose={() => setIsLocalInventoryModalOpen(false)}
        items={cmsConfig?.localInventory || []}
        onAddToCart={addToCart}
        onSelectLocalProduct={(item) => {
          setIsLocalInventoryModalOpen(false);
          const effectiveRate = getEffectiveAedRate(settings, cmsConfig) || 1;
          const priceToman = item.calculatedTomanOverride || (item as any).priceToman || 0;
          const calcAed = Math.round(priceToman / effectiveRate);
          setSelectedProduct({
            title: `${item.title} (موجودی انبار ایران)`,
            url: item.url || 'https://omex.ir/stock/' + (item as any).id,
            priceAed: calcAed > 0 ? calcAed : 100,
            weightKg: 0.5,
            brand: 'انبار ایران',
            calculatedTomanOverride: priceToman,
            category: (item as any).category || 'موجودی ایران',
            description: (item as any).description || 'اورجینال - موجود در انبار ایران جهت ارسال فوری ۲۴ ساعته',
            badge: '⚡ تحویل فوری ۲۴ ساعته',
            inStock: true,
            isLocalInventory: true,
            flavors: item.flavors || [],
            sizes: item.sizes || []
          });
          setActiveTab('detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Public Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        showLocalInventory={cmsConfig?.features?.showLocalInventory ?? cmsConfig?.showLocalInventory ?? true}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <SeoHeadInjector />
        <BrowserRouter>
          <Routes>
            <Route path="/payment/callback" element={<PaymentCallback />} />
            <Route path="/payment-callback" element={<PaymentCallback />} />
            <Route path="/*" element={<MainApp />} />
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
