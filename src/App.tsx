import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AppDashboard } from './components/AppDashboard';
import { HeroCalculator } from './components/HeroCalculator';
import { HeroBanner } from './components/HeroBanner';
import { FeaturedDeals } from './components/FeaturedDeals';
import { StoreCards } from './components/StoreCards';
import { ProductDetailView } from './components/ProductDetailView';
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
import { ReviewsSection } from './components/ReviewsSection';
import { FAQView } from './components/FAQView';
import { PaymentReceipt } from './components/PaymentReceipt';
import { PromoPopupModal } from './components/PromoPopupModal';
import { AboutUsSection } from './components/AboutUsSection';
import { ServicesFeaturesSection } from './components/ServicesFeaturesSection';
import { ContactSupportSection } from './components/ContactSupportSection';
import { TermsSection } from './components/TermsSection';
import { TermsModal } from './components/TermsModal';
import { Footer } from './components/Footer';
import { CompactLandingFooter } from './components/CompactLandingFooter';
import { FloatingSupportWidget } from './components/common/FloatingSupportWidget';
import type { FinancialSettings, Order, TabType, CmsConfig, User, FeaturedDeal, CartItem, LandingSettings } from './types';
import { defaultLandingSettings } from './types';
import { getLandingSettings } from './services/settingsService';
import { toPersianDigits, getEffectiveAedRate, calculateFinalToman, isArtificialFallback } from './utils/formatters';
import { fetchSettingsFromFirestore, getCmsFromFirestore, db, isFirestoreGrpcNoise } from './firebase';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { setEffectiveGeminiKeysList, getEffectiveGeminiKeysList } from './utils/geminiKey';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { PricingProvider } from './context/PricingContext';
import { ProductProvider, useProducts, sortNewestFirst } from './context/ProductContext';
import { SupportProvider } from './context/SupportContext';
import { CartProvider } from './context/CartContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getSafeItem, setSafeItem } from './utils/safeStorage';
import { extractLogoUrl } from './utils/logoHelper';
import { navigateToPaymentGateway } from './utils/paymentRedirect';

function MainApp() {
  const { deals: contextDeals, warehouseItems: contextWarehouse, generalProducts: contextProducts, popularProducts, isLoading: isProductsLoading } = useProducts();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      if (p.startsWith('/payment/receipt') || p.startsWith('/payment-result') || p.startsWith('/payment/result')) {
        return 'receipt';
      }
    }
    return 'main';
  });
  const [isCalculatorVisible] = useState(true);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return getSafeItem<User | null>('omex_current_user', null);
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    return getSafeItem<CartItem[]>('omex_cart_items', []);
  });

  useEffect(() => {
    setSafeItem('omex_cart_items', cartItems);
  }, [cartItems]);

  // Analytics Visitor Tracking (resilient, never crashes)
  useEffect(() => {
    try {
      let vid = getSafeItem<string>('omex_visitor_id', '');
      if (!vid) {
        vid = 'v-' + Math.random().toString(36).substring(2, 11);
        setSafeItem('omex_visitor_id', vid);
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
      if (activeTab === 'cart' || activeTab === 'detail' || activeTab === 'inventory' || activeTab === 'deals' || activeTab === 'faq' || activeTab === 'receipt') {
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
          if (item.id === id || item.cartItemId === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id && item.cartItemId !== id));
    showToast('محصول از سبد خرید حذف شد', 'success');
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const [landingSettings, setLandingSettings] = useState<LandingSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sirikfit_landing_settings');
        if (saved) return { ...defaultLandingSettings, ...JSON.parse(saved) };
      } catch (_) {}
    }
    return defaultLandingSettings;
  });

  // Financial Settings State - Single Source of Truth initialized from LocalStorage FIRST
  const [settings, setSettings] = useState<FinancialSettings>(() => {
    let rate: number | null = null;
    let cargo = 35;
    let margin = 15;
    let minOrderToman = 0;
    let minOrderAed = 0;
    let minLimitEnabled = false;

    const directRate = getSafeItem<string>('sirikfit_aed_rate', '');
    if (directRate && !isNaN(Number(directRate)) && Number(directRate) > 0) {
      rate = Number(directRate);
    }

    const saved = getSafeItem<any>('sirikfit_financial_settings', null) ||
      getSafeItem<any>('sirikfit_app_settings', null) ||
      getSafeItem<any>('omex_pricing_rules', null) ||
      getSafeItem<any>('omex_financial_settings', null);

    if (saved && typeof saved === 'object') {
      const exRate = Number(saved.exchangeRate || saved.aedRate || saved.manualAedRate);
      if (!isNaN(exRate) && exRate > 0 && !directRate) {
        rate = exRate;
      }
      if (typeof saved.cargoRatePerKg === 'number') cargo = saved.cargoRatePerKg;
      if (typeof saved.profitMargin === 'number') margin = saved.profitMargin;
      if (typeof saved.minOrderAmountToman === 'number') minOrderToman = saved.minOrderAmountToman;
      else if (typeof saved.minOrderToman === 'number') minOrderToman = saved.minOrderToman;

      if (typeof saved.minOrderAed === 'number') minOrderAed = saved.minOrderAed;
      if (typeof saved.minOrderLimitEnabled === 'boolean') minLimitEnabled = saved.minOrderLimitEnabled;
      else if (minOrderToman > 0) minLimitEnabled = true;
    }

    return {
      aedRate: rate,
      manualAedRate: rate,
      cargoRatePerKg: cargo,
      profitMargin: margin,
      minOrderAmountToman: minLimitEnabled ? minOrderToman : 0,
      minOrderLimitEnabled: minLimitEnabled,
      minOrderAed: minOrderAed
    };
  });

  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // CMS State initialized from LocalStorage FIRST with instant cache hydration
  const [cmsConfig, setCmsConfig] = useState<CmsConfig | null>(() => {
    const saved = getSafeItem<any>('sirikfit_cms_config', null) || getSafeItem<any>('omex_home_cms', null);
    if (saved && typeof saved === 'object') {
      return saved;
    }
    return null;
  });

  const [isLocalInventoryModalOpen, setIsLocalInventoryModalOpen] = useState(false);

  // Active Selected Product for Order Form / Product Detail
  const [selectedProduct, setSelectedProduct] = useState<{
    id?: string;
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    calculatedTomanOverride?: number;
    brand?: string;
    category?: string;
    description?: string;
    badge?: string;
    inStock?: boolean;
    isLocalInventory?: boolean;
    flavors?: string[];
    sizes?: string[];
    originalPriceAed?: number;
    priceToman?: number;
    originalPriceToman?: number;
    discountPercent?: number;
    servings?: string;
    origin?: string;
    profitMargin?: number;
    marginPercent?: number;
    [key: string]: any;
  } | null>(null);

  // Selected Deal for Calculator Population
  const [selectedDealProduct] = useState<{
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    [key: string]: any;
  } | null>(null);

  // Active Pending Order for Payment Gateway Modal
  const [pendingOrderForPayment, setPendingOrderForPayment] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const addToCart = (product: any, selectedFlavor?: string | null, selectedSize?: string | null) => {
    const rawFlavor = selectedFlavor !== undefined ? selectedFlavor : product?.selectedFlavor;
    const rawSize = selectedSize !== undefined ? selectedSize : product?.selectedSize;
    const flavorStr = (rawFlavor && !isArtificialFallback(rawFlavor)) ? rawFlavor : null;
    const sizeStr = (rawSize && !isArtificialFallback(rawSize)) ? rawSize : null;
    const id = product?.id || product?.url || product?.title || 'item';
    const cartItemId = `${id}-${flavorStr || 'default'}-${sizeStr || 'default'}`;
    const qtyToAdd = (typeof product?.quantity === 'number' && Number.isFinite(product.quantity) && product.quantity > 0)
      ? Math.max(1, Math.floor(product.quantity))
      : 1;

    setCartItems((prevCart: any[]) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.cartItemId === cartItemId || (item.id === id && item.selectedFlavor === flavorStr && item.selectedSize === sizeStr)
      );

      let updatedCart: any[];
      if (existingItemIndex > -1) {
        // Move existing item to top (index 0) with updated quantity
        const existingItem = prevCart[existingItemIndex];
        const updatedItem = {
          ...existingItem,
          ...product,
          id: existingItem.id || id,
          cartItemId: existingItem.cartItemId || cartItemId,
          selectedFlavor: flavorStr ?? existingItem.selectedFlavor ?? null,
          selectedSize: sizeStr ?? existingItem.selectedSize ?? null,
          quantity: (existingItem.quantity || 1) + qtyToAdd
        };
        const otherItems = prevCart.filter((_, idx) => idx !== existingItemIndex);
        updatedCart = [updatedItem, ...otherItems];
      } else {
        const newItem = {
          ...product,
          id: product.id || id,
          cartItemId,
          product,
          selectedFlavor: flavorStr,
          selectedSize: sizeStr,
          quantity: qtyToAdd
        };
        // Prepend brand-new item to the very top (index 0)
        updatedCart = [newItem, ...prevCart];
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
          if (directRate && !isNaN(Number(directRate)) && Number(directRate) >= 54000) {
            currentLocalRate = Number(directRate);
          } else if (directRate) {
            try { localStorage.removeItem('sirikfit_aed_rate'); } catch (_e) {}
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
            ...detail.cmsConfig,
            deals: (detail.cmsConfig.deals && detail.cmsConfig.deals.length > 0) ? detail.cmsConfig.deals : prev?.deals,
            localInventory: (detail.cmsConfig.localInventory && detail.cmsConfig.localInventory.length > 0) ? detail.cmsConfig.localInventory : prev?.localInventory
          }));
        } else {
          const savedCms = localStorage.getItem('sirikfit_cms_config');
          if (savedCms) {
            const parsedCms = JSON.parse(savedCms);
            if (parsedCms) {
              setCmsConfig(prev => ({
                ...(prev || {}),
                ...parsedCms,
                deals: (parsedCms.deals && parsedCms.deals.length > 0) ? parsedCms.deals : prev?.deals,
                localInventory: (parsedCms.localInventory && parsedCms.localInventory.length > 0) ? parsedCms.localInventory : prev?.localInventory
              }));
            }
          }
        }
      } catch (err) {
        console.warn('Error syncing settings from storage event:', err);
      }
    };

    const syncLandingFromStorage = (e?: any) => {
      const data = e?.detail || getLandingSettings();
      if (data && typeof data === 'object' && 'then' in data) {
        data.then((res: any) => {
          if (res) setLandingSettings(res);
        });
      } else if (data) {
        setLandingSettings(data);
      }
    };

    // Initial mount sync from persistent storage and Firestore
    syncLandingFromStorage();
    getLandingSettings().then((fetched) => {
      if (fetched) setLandingSettings(fetched);
    });

    window.addEventListener('settingsUpdated', syncSettingsFromStorage as EventListener);
    window.addEventListener('landingSettingsUpdated', syncLandingFromStorage as EventListener);
    window.addEventListener('storage', syncSettingsFromStorage as EventListener);

    return () => {
      window.removeEventListener('settingsUpdated', syncSettingsFromStorage as EventListener);
      window.removeEventListener('landingSettingsUpdated', syncLandingFromStorage as EventListener);
      window.removeEventListener('storage', syncSettingsFromStorage as EventListener);
    };
  }, []);

  // 🟢 Real-time Firestore listeners for settings/pricing, settings/app, settings/financial, settings/cms, and settings/general
  useEffect(() => {
    let unsubApp: (() => void) | null = null;
    let unsubPricing: (() => void) | null = null;
    let unsubPricingRules: (() => void) | null = null;
    let unsubFinancial: (() => void) | null = null;
    let unsubCms: (() => void) | null = null;
    let unsubHome: (() => void) | null = null;
    let unsubGen: (() => void) | null = null;
    let unsubLanding: (() => void) | null = null;
    let unsubSpecialDeals: (() => void) | null = null;
    let unsubIranWarehouse: (() => void) | null = null;

    const handlePricingUpdate = (data: any) => {
      if (!data) return;
      const rawMin = data.minOrderAmountToman !== undefined
        ? Number(data.minOrderAmountToman)
        : (data.minOrderToman !== undefined ? Number(data.minOrderToman) : undefined);
      const isEnabled = data.minOrderLimitEnabled !== undefined
        ? Boolean(data.minOrderLimitEnabled)
        : (rawMin !== undefined ? rawMin > 0 : undefined);

      if (rawMin !== undefined || isEnabled !== undefined) {
        const resolvedMin = (isEnabled !== false && rawMin !== undefined && !isNaN(rawMin) && rawMin > 0) ? rawMin : 0;
        const resolvedEnabled = isEnabled !== undefined ? isEnabled : (resolvedMin > 0);

        setSettings(prev => ({
          ...prev,
          minOrderAmountToman: resolvedMin,
          minOrderLimitEnabled: resolvedEnabled
        }));

        setCmsConfig(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            pricingRules: {
              ...(prev.pricingRules || {}),
              minOrderAmountToman: resolvedMin,
              minOrderLimitEnabled: resolvedEnabled
            } as any
          };
        });
      }
    };

    try {
      // 1. Primary Source of Truth: settings/pricing
      unsubPricing = onSnapshot(doc(db, 'settings', 'pricing'), (snap) => {
        if (snap.exists()) {
          const pricingData = snap.data();
          handlePricingUpdate(pricingData);
          if (pricingData.aedRate && Number(pricingData.aedRate) > 0) {
            const rate = Number(pricingData.aedRate);
            setSettings(prev => ({ ...prev, aedRate: rate, manualAedRate: rate }));
          }
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('Firestore pricing onSnapshot notice:', err);
      });

      // 2. App Settings: settings/app
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
          if (data.minOrderAmountToman !== undefined || data.minOrderLimitEnabled !== undefined) {
            handlePricingUpdate(data);
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

      // 3. Pricing Rules Config: settings/pricingRules
      unsubPricingRules = onSnapshot(doc(db, 'settings', 'pricingRules'), (snap) => {
        if (snap.exists()) {
          handlePricingUpdate(snap.data());
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('Firestore pricingRules onSnapshot notice:', err);
      });

      // 4. Financial Settings: settings/financial
      unsubFinancial = onSnapshot(doc(db, 'settings', 'financial'), (snap) => {
        if (snap.exists()) {
          handlePricingUpdate(snap.data());
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('Firestore financial onSnapshot notice:', err);
      });

      // 5. CMS Settings: settings/cms (pure CMS content, do NOT overwrite pricing rules)
      unsubCms = onSnapshot(doc(db, 'settings', 'cms'), (snap) => {
        if (snap.exists()) {
          const cmsData = snap.data() as CmsConfig;
          if (cmsData) {
            setCmsConfig(prev => {
              const merged = { ...prev, ...cmsData };
              // Preserve active landing settings from dedicated settings/landing doc
              if (prev?.landingSettings) {
                merged.landingSettings = prev.landingSettings;
              }
              // Preserve active pricing rules from settings/pricing
              if (prev?.pricingRules) {
                merged.pricingRules = {
                  ...(cmsData.pricingRules || {}),
                  minOrderAmountToman: prev.pricingRules.minOrderAmountToman,
                  minOrderLimitEnabled: prev.pricingRules.minOrderLimitEnabled
                } as any;
              }
              if (Array.isArray(cmsData.deals)) {
                merged.deals = cmsData.deals;
              }
              if (Array.isArray(cmsData.localInventory)) {
                merged.localInventory = cmsData.localInventory;
              }
              return merged;
            });
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

      unsubLanding = onSnapshot(doc(db, 'settings', 'landing'), (snap) => {
        if (snap.exists()) {
          const landingData = snap.data() as Partial<LandingSettings>;
          if (landingData) {
            setLandingSettings(prev => ({
              ...prev,
              ...landingData
            }));
            setCmsConfig(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                landingSettings: {
                  ...defaultLandingSettings,
                  ...(prev.landingSettings || {}),
                  ...landingData
                }
              };
            });
            try {
              localStorage.setItem('sirikfit_landing_settings', JSON.stringify(landingData));
            } catch (_) {}
          }
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('Firestore landing settings onSnapshot notice:', err);
      });

      // 7.5 Real-time listener for settings/home (single source of truth for home banners, stores, logo)
      unsubHome = onSnapshot(doc(db, 'settings', 'home'), (snap) => {
        if (snap.exists()) {
          const homeData = snap.data();
          if (homeData) {
            setCmsConfig(prev => {
              const next = prev ? { ...prev } : ({} as any);
              const stores = homeData.partnerStores || homeData.stores;
              if (Array.isArray(stores) && stores.length > 0) {
                next.stores = stores;
              }
              const banners = homeData.banners || homeData.homeBanners;
              if (Array.isArray(banners) && banners.length > 0) {
                next.homeBanners = banners;
              }
              const l = extractLogoUrl(homeData);
              if (l) {
                next.logoUrl = l;
                if (!next.homeContent) next.homeContent = {} as any;
                next.homeContent.logoUrl = l;
                next.homeContent.headerLogoUrl = l;
                (next.homeContent as any).logo = l;
                (next.homeContent as any).headerLogo = l;
              }
              return next;
            });
          }
        }
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('Firestore home settings onSnapshot notice:', err);
      });

      // 8. Real-time collection sync for special_deals (sorted newest-first)
      unsubSpecialDeals = onSnapshot(collection(db, 'special_deals'), (snap) => {
        const loadedDeals: any[] = [];
        snap.forEach(docSnap => {
          loadedDeals.push({ id: docSnap.id, ...docSnap.data() });
        });
        const sorted = sortNewestFirst(loadedDeals);
        setCmsConfig(prev => {
          if (!prev) return prev;
          return { ...prev, deals: sorted };
        });
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('Firestore special_deals onSnapshot notice:', err);
      });

      // 9. Real-time collection sync for iran_warehouse (sorted newest-first)
      unsubIranWarehouse = onSnapshot(collection(db, 'iran_warehouse'), (snap) => {
        const loadedLocal: any[] = [];
        snap.forEach(docSnap => {
          loadedLocal.push({ id: docSnap.id, ...docSnap.data() });
        });
        const sorted = sortNewestFirst(loadedLocal);
        setCmsConfig(prev => {
          if (!prev) return prev;
          return { ...prev, localInventory: sorted };
        });
      }, (err) => {
        if (!isFirestoreGrpcNoise(err)) console.warn('Firestore iran_warehouse onSnapshot notice:', err);
      });
    } catch (fsErr) {
      console.warn('Error setting up Firestore onSnapshot listeners:', fsErr);
    }

    return () => {
      if (unsubApp) unsubApp();
      if (unsubPricing) unsubPricing();
      if (unsubPricingRules) unsubPricingRules();
      if (unsubFinancial) unsubFinancial();
      if (unsubCms) unsubCms();
      if (unsubHome) unsubHome();
      if (unsubGen) unsubGen();
      if (unsubLanding) unsubLanding();
      if (unsubSpecialDeals) unsubSpecialDeals();
      if (unsubIranWarehouse) unsubIranWarehouse();
    };
  }, []);

  // Dynamic SEO & Meta Tag Sync Effect
  useEffect(() => {
    try {
      const seo = (cmsConfig as any)?.seo;
      const localSeoRaw = localStorage.getItem('sirikfit_seo_settings');
      let localSeo: any = null;
      if (localSeoRaw) {
        try { localSeo = JSON.parse(localSeoRaw); } catch (_e) {}
      }
      const activeSeo = seo || localSeo || {};

      const title = activeSeo.siteTitle || 'سیریک فیت | خرید مستقیم مکمل از دبی | Sirik Fit';
      const description = activeSeo.metaDescription || 'فروشگاه آنلاین سیریک فیت؛ مرجع خرید بدون واسطه مکملهای ورزشی، ویتامین و پروتئین اورجینال از نمایندگیهای معتبر دبی با ارسال سریع به سراسر ایران.';
      const keywords = activeSeo.keywords || 'سیریک فیت, sirikfit, sirikfit.ir, خرید مکمل از دبی, مکمل اصل دبی, خرید پروتئین وی, مکمل ورزشی اورجینال, پروتئین وی دبی, خرید ویتامین اصل';
      const ogImage = activeSeo.ogImage || 'https://sirikfit.ir/assets/og-preview.jpg';
      const canonicalUrl = activeSeo.canonicalUrl || 'https://sirikfit.ir/';
      const ogTitle = activeSeo.ogTitle || title;
      const ogDescription = activeSeo.ogDescription || description;

      // 1. Document Title
      document.title = title;

      // Helper to update/create meta tag
      const setMetaTag = (attrName: string, attrVal: string, contentVal: string) => {
        let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attrName, attrVal);
          document.head.appendChild(el);
        }
        el.setAttribute('content', contentVal);
      };

      // 2. Standard Meta Tags
      setMetaTag('name', 'description', description);
      setMetaTag('name', 'keywords', keywords);
      setMetaTag('name', 'robots', activeSeo.robotsIndexing || 'index, follow');

      // 3. Google Site Verification
      if (activeSeo.googleSiteVerification) {
        setMetaTag('name', 'google-site-verification', activeSeo.googleSiteVerification.replace(/<[^>]*>/g, '').trim());
      }

      // 4. Canonical Link
      let canonicalEl = document.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', canonicalUrl);

      // 5. Open Graph Meta Tags
      setMetaTag('property', 'og:type', 'website');
      setMetaTag('property', 'og:url', canonicalUrl);
      setMetaTag('property', 'og:title', ogTitle);
      setMetaTag('property', 'og:description', ogDescription);
      setMetaTag('property', 'og:image', ogImage);
      setMetaTag('property', 'og:site_name', 'سیریک فیت - Sirik Fit');
      setMetaTag('property', 'og:locale', 'fa_IR');

      // 6. Twitter Cards
      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', ogTitle);
      setMetaTag('name', 'twitter:description', ogDescription);
      setMetaTag('name', 'twitter:image', ogImage);

      // 7. Schema.org JSON-LD Structured Data
      let jsonLdEl = document.querySelector('script[type="application/ld+json"]#sirikfit-live-jsonld');
      if (!jsonLdEl) {
        jsonLdEl = document.createElement('script');
        jsonLdEl.setAttribute('type', 'application/ld+json');
        jsonLdEl.setAttribute('id', 'sirikfit-live-jsonld');
        document.head.appendChild(jsonLdEl);
      }
      jsonLdEl.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'OnlineStore',
        'name': 'سیریک فیت - Sirik Fit',
        'url': canonicalUrl.replace(/\/$/, ''),
        'logo': 'https://sirikfit.ir/favicon.svg',
        'description': description,
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${canonicalUrl.replace(/\/$/, '')}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }, null, 2);

    } catch (_e) {}
  }, [cmsConfig]);

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

  // Fetch Settings & CMS Config directly via Firestore SDK with LocalStorage Precedence
  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      let localRate: number | null = null;
      let localSettings: any = null;

      if (typeof window !== 'undefined') {
        const direct = localStorage.getItem('sirikfit_aed_rate');
        if (direct && !isNaN(Number(direct)) && Number(direct) >= 54000) {
          localRate = Number(direct);
        } else if (direct) {
          try { localStorage.removeItem('sirikfit_aed_rate'); } catch (_e) {}
        }
        const saved = localStorage.getItem('sirikfit_financial_settings') || localStorage.getItem('omex_financial_settings');
        if (saved) {
          try {
            localSettings = JSON.parse(saved);
          } catch (_e) {}
        }
      }

      const fsSettings = await fetchSettingsFromFirestore();

      if (fsSettings) {
        setSettings(prev => {
          const fsRate = Number(fsSettings.aedRate || fsSettings.manualAedRate || 0);
          const effectiveRate = fsRate > 0 ? fsRate : ((localRate && localRate > 0) ? localRate : prev.aedRate);
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
    try {
      const fsCms = (await getCmsFromFirestore()) || {};
      try {
        if (db) {
          const homeSnap = await getDoc(doc(db, 'settings', 'home'));
          if (homeSnap.exists()) {
            const hData = homeSnap.data();
            const l = extractLogoUrl(hData);
            if (l) {
              fsCms.logoUrl = l;
              if (!fsCms.homeContent) fsCms.homeContent = {};
              fsCms.homeContent.logoUrl = l;
              fsCms.homeContent.headerLogoUrl = l;
              (fsCms.homeContent as any).logo = l;
              (fsCms.homeContent as any).headerLogo = l;
            }
            const stores = hData.stores || hData.partnerStores;
            if (Array.isArray(stores) && stores.length > 0) {
              fsCms.stores = stores;
            }
            const banners = hData.homeBanners || hData.banners;
            if (Array.isArray(banners) && banners.length > 0) {
              fsCms.homeBanners = banners;
            }
          }
        }
      } catch (_hErr) {}

      if (fsCms && Object.keys(fsCms).length > 0) {
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
      // Purge stale CMS data that causes ghost products
      const keysToClean = ['sirikfit_cms_config', 'omex_home_cms'];
      keysToClean.forEach(key => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              let changed = false;
              if ('deals' in parsed) { delete parsed.deals; changed = true; }
              if ('localInventory' in parsed) { delete parsed.localInventory; changed = true; }
              // Also fix stale brand titles
              if (parsed.appTitle?.includes('PLATFORM IMPORTS') || parsed.appTitle?.includes('PRO')) {
                parsed.appTitle = 'SIRIK FIT'; changed = true;
              }
              if (parsed.brandTitle?.includes('PLATFORM IMPORTS') || parsed.brandTitle?.includes('PRO')) {
                parsed.brandTitle = 'SIRIK FIT';
                parsed.brandSubtitle = 'مکملهای ورزشی و اورجینال';
                changed = true;
              }
              if (changed) localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        } catch (_) {}
      });
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

  const redirectToBankPayment = async (order: Order) => {
    const rawAmount =
      order.calculatedToman ??
      (order as any).totalToman ??
      (order as any).totalPrice ??
      (order as any).amount ??
      0;

    const sanitizedAmount = typeof rawAmount === 'string'
      ? Math.round(Number(String(rawAmount).replace(/[^0-9.]/g, '')))
      : Math.round(Number(rawAmount) || 0);

    const orderId = order.id || order.trackingCode;

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          orderData: order,
          amountToman: sanitizedAmount,
          amount: sanitizedAmount,
          callbackUrl: window.location.origin + '/api/payment/callback'
        })
      });

      const data = await res.json();
      const targetUrl = data.paymentUrl || data.redirectUrl || data.url;
      if (res.ok && data.success && (targetUrl || data.trackId)) {
        handleClearCart();
        navigateToPaymentGateway(targetUrl, data.trackId);
      } else {
        showToast(data.error || 'خطا در دریافت لینک پرداخت زیبال.', 'error');
      }
    } catch (err) {
      console.error('Direct bank redirect error:', err);
      showToast('خطا در اتصال به درگاه بانکی.', 'error');
    }
  };

  const handleOrderCreated = (newOrder: Order) => {
    redirectToBankPayment(newOrder);
  };

  const handlePaymentSuccess = () => {
    //
  };

  const handleSelectDeal = (deal: FeaturedDeal) => {
    const effectiveRate = getEffectiveAedRate(settings, cmsConfig) || 1;
    const dealMargin = deal.profitMargin !== undefined ? deal.profitMargin : (deal.marginPercent !== undefined ? deal.marginPercent : settings.profitMargin);
    const finalToman = (deal.priceToman && deal.priceToman > 0)
      ? deal.priceToman
      : calculateFinalToman(
          deal.priceAed || 0,
          deal.weightKg || 0.5,
          settings.cargoRatePerKg,
          dealMargin,
          effectiveRate
        );

    setSelectedProduct({
      id: deal.id,
      title: deal.title,
      englishTitle: deal.englishTitle,
      url: deal.url,
      priceAed: deal.priceAed,
      originalPriceAed: deal.originalPriceAed,
      discountPercent: deal.discountPercent,
      weightKg: deal.weightKg || 0.5,
      image: deal.image,
      images: deal.images || (deal.image ? [deal.image] : []),
      galleryImages: deal.galleryImages || deal.images || (deal.image ? [deal.image] : []),
      storeName: deal.storeName || deal.brand || 'دبی',
      brand: deal.brand || deal.storeName || 'دبی',
      category: deal.category,
      description: deal.description || 'پیشنهاد ویژه خرید مستقیم از دبی با بهترین قیمت',
      badge: deal.badge || '🔥 پیشنهاد ویژه',
      priceToman: finalToman,
      calculatedTomanOverride: finalToman,
      profitMargin: dealMargin,
      flavors: deal.flavors || [],
      sizes: deal.sizes || [],
      variants: deal.variants || [],
      variantMatrix: deal.variantMatrix || undefined,
      variantGroups: deal.variantGroups || undefined,
      options: deal.options || [],
      inStock: true
    });
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🟢 Global Storefront Event Listeners: openProductDetail & addToCartDirect
  useEffect(() => {
    const handleOpenProductDetailEvent = (e: any) => {
      const prod = e?.detail;
      if (prod) {
        handleSelectDeal(prod);
      }
    };

    const handleAddToCartDirectEvent = (e: any) => {
      const prod = e?.detail;
      if (prod) {
        addToCart(prod);
      }
    };

    const handleOpenCartDirectEvent = () => {
      setSelectedProduct(null);
      setActiveTab('detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('openProductDetail', handleOpenProductDetailEvent as EventListener);
    window.addEventListener('addToCartDirect', handleAddToCartDirectEvent as EventListener);
    window.addEventListener('openCartDirect', handleOpenCartDirectEvent as EventListener);

    return () => {
      window.removeEventListener('openProductDetail', handleOpenProductDetailEvent as EventListener);
      window.removeEventListener('addToCartDirect', handleAddToCartDirectEvent as EventListener);
      window.removeEventListener('openCartDirect', handleOpenCartDirectEvent as EventListener);
    };
  }, [settings, cmsConfig]);

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
    <div
      className="min-h-screen min-h-[100dvh] bg-[#F8FAFC] text-slate-800 flex flex-col font-['Vazirmatn',sans-serif] selection:bg-[#7C3AED] selection:text-white pb-24"
      style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
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

      {/* Top Header (Omitted on listing tabs for compact search-and-cart header experience) */}
      {activeTab !== 'deals' && activeTab !== 'inventory' && (
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
            setSelectedProduct(null);
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
      )}

      {/* Main Container */}
      <main className={`flex-1 max-w-4xl w-full mx-auto px-2 sm:px-4 pb-8 ${activeTab === 'deals' || activeTab === 'inventory' ? 'pt-1' : 'pt-3'}`}>
        {/* PUBLIC PAGE (MAIN / صفحه اصلی - COMPACT PREVIEW & CLEAN HOME SCREEN) */}
        {activeTab === 'main' && (
          <div id="home" className="space-y-2.5">
            {/* Dynamic Sports Hero Banner */}
            <HeroBanner cms={cmsConfig} />

            {/* Rotating Slogan Announcement Banner */}
            <AnnouncementBanner cms={cmsConfig} />

            {/* Popular Samples Section (نمونه‌های محبوب) */}
            {(() => {
              if (isProductsLoading && (!popularProducts || popularProducts.length === 0)) {
                return (
                  <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-4 space-y-3 animate-pulse shadow-2xs my-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                    </div>
                    <div className="flex gap-4 overflow-hidden">
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} className="w-28 sm:w-36 shrink-0 space-y-2">
                          <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // Resilient popular products retrieval:
              // Prefer popularProducts from context. If empty, gracefully fall back to contextDeals so the section never disappears!
              const candidateProducts = (popularProducts && popularProducts.length > 0)
                ? popularProducts
                : ((contextDeals && contextDeals.length > 0) ? contextDeals.slice(0, 15) : []);

              if (!candidateProducts || candidateProducts.length === 0) {
                return null;
              }

              // Transform canonical sorted products to PopularProductItem format
              const carouselItems: PopularProductItem[] = candidateProducts
                .filter(p => {
                  if (!p || !p.id) return false;
                  const t = (p.titleFa || p.title || p.name || '').trim();
                  return t && t !== 'محصول پرطرفدار' && (p.popularOrder === undefined || p.popularOrder >= 0);
                })
                .map(p => ({
                  id: p.id,
                  title: p.titleFa || p.title || '',
                  titleFa: p.titleFa || p.title || '',
                  image: p.image || p.imageUrl || (p.galleryImages && p.galleryImages[0]) || '',
                  imageUrl: p.imageUrl || p.image || '',
                  galleryImages: p.galleryImages || p.images || [],
                  rawItem: p.rawItem || p,
                  popularOrder: p.popularOrder,
                  isPopular: true,
                  priceToman: p.priceToman,
                  priceAed: p.priceAed || p.priceAED || p.samplePriceAed,
                  samplePriceAed: p.samplePriceAed || p.priceAed || p.priceAED,
                  type: (p.type === 'local' || p.targetSection === 'iran_warehouse' || p.id?.startsWith('local-') || p.id?.startsWith('iran-')) ? 'local' : 'deal'
                }));

              return (
                <PopularProductsCarousel
                  items={carouselItems}
                  settings={settings}
                  onAddToCart={addToCart}
                  onSelectProduct={(item) => {
                    const effectiveRate = getEffectiveAedRate(settings, cmsConfig) || 1;
                    if (item.type === 'local' && item.rawItem) {
                      const local = item.rawItem;
                      const calcAed = Math.round((local.priceToman || 0) / effectiveRate);
                      setSelectedProduct({
                        id: local.id,
                        title: `${local.title} (موجودی انبار ایران)`,
                        url: 'https://omex.ir/stock/' + local.id,
                        priceAed: calcAed > 0 ? calcAed : 100,
                        originalPriceAed: local.originalPriceToman ? Math.round(local.originalPriceToman / effectiveRate) : 0,
                        priceToman: local.priceToman,
                        originalPriceToman: local.originalPriceToman,
                        calculatedTomanOverride: local.priceToman,
                        weightKg: local.weightKg || 0.5,
                        image: local.image || 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80',
                        storeName: 'انبار ایران (تحویل فوری)',
                        brand: 'انبار ایران',
                        category: local.category || 'موجودی ایران',
                        description: local.description || 'اورجینال - موجود در انبار ایران جهت ارسال فوری',
                        badge: local.deliveryBadge || '⚡ ارسال فوری (انبار ایران)',
                        inStock: local.inStock ?? true,
                        isLocalInventory: true,
                        flavors: local.flavors || [],
                        sizes: local.sizes || [],
                        variants: local.variants || []
                      });
                      setActiveTab('detail');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else if (item.type === 'deal' && item.rawItem) {
                      const deal = item.rawItem;
                      const dealMargin = deal.profitMargin !== undefined ? deal.profitMargin : (deal.marginPercent !== undefined ? deal.marginPercent : settings.profitMargin);
                      const finalToman = (deal.priceToman && deal.priceToman > 0)
                        ? deal.priceToman
                        : (deal.calculatedTomanOverride && deal.calculatedTomanOverride > 0
                            ? deal.calculatedTomanOverride
                            : (deal.calculatedToman && deal.calculatedToman > 0
                                ? deal.calculatedToman
                                : calculateFinalToman(
                                    deal.priceAed || 0,
                                    deal.weightKg || 0.5,
                                    settings.cargoRatePerKg,
                                    dealMargin,
                                    effectiveRate
                                  )));
                      setSelectedProduct({
                        id: deal.id,
                        title: deal.title || 'پیشنهاد ویژه دبی',
                        url: deal.url || 'https://drnutrition.com',
                        priceAed: deal.priceAed || 0,
                        originalPriceAed: deal.originalPriceAed || 0,
                        discountPercent: deal.discountPercent || 0,
                        weightKg: deal.weightKg || 0.5,
                        image: deal.image || 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=500&auto=format&fit=crop&q=80&w=400',
                        storeName: deal.storeName || deal.brand || 'فروشگاه دبی',
                        brand: deal.brand || deal.storeName || 'دبی',
                        category: deal.category || 'پیشنهاد ویژه',
                        description: deal.description || 'پیشنهاد ویژه خرید مستقیم از دبی با بهترین قیمت',
                        badge: deal.badge || '🔥 پیشنهاد ویژه',
                        priceToman: finalToman,
                        calculatedTomanOverride: finalToman,
                        profitMargin: dealMargin,
                        inStock: true,
                        flavors: deal.flavors || [],
                        sizes: deal.sizes || [],
                        variants: deal.variants || []
                      });
                      setActiveTab('detail');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      const finalToman = calculateFinalToman(150, 0.5, settings.cargoRatePerKg, settings.profitMargin, effectiveRate);
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
                        priceToman: finalToman,
                        calculatedTomanOverride: finalToman,
                        profitMargin: settings.profitMargin,
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

            {/* Compact Integrated Landing Footer (Screenshot 2700 Layout) */}
            <CompactLandingFooter
              settings={landingSettings}
              onOpenTerms={() => setIsTermsModalOpen(true)}
              onOpenRules={() => setIsTermsModalOpen(true)}
              onOpenFaq={() => {
                setActiveTab('faq');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenAbout={() => {
                setActiveTab('faq');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenBenefits={() => {
                setActiveTab('deals');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenContact={() => {
                const tg = (landingSettings.telegramId || '@SIRIK_FIT_Support').replace('@', '').replace('https://t.me/', '');
                window.open(`https://t.me/${tg}`, '_blank');
              }}
            />
          </div>
        )}

        {/* DEDICATED PRODUCT DETAIL & CHECKOUT SCREEN (#detail or #cart) */}
        {(activeTab === 'detail' || (activeTab as any) === 'cart') && (
          <ProductDetailView
            product={selectedProduct}
            cartItems={cartItems}
            onAddToCart={addToCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveCartItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            settings={settings}
            cms={cmsConfig}
            currentUser={currentUser}
            onBackToMain={() => {
              setSelectedProduct(null);
              setActiveTab('main');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOrderCreated={handleOrderCreated}
          />
        )}

        {/* DEDICATED INVENTORY PAGE (صفحه اختصاصی انبار ایران) */}
        {activeTab === 'inventory' && (
          <InventoryPage
            items={(cmsConfig?.localInventory && cmsConfig.localInventory.length > 0) ? cmsConfig.localInventory : contextWarehouse}
            categories={cmsConfig?.warehouseCategories}
            settings={settings}
            isLoading={isProductsLoading && (!cmsConfig?.localInventory || cmsConfig.localInventory.length === 0) && contextWarehouse.length === 0}
            onAddToCart={addToCart}
            onOpenCart={() => {
              setSelectedProduct(null);
              setActiveTab('detail');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectLocalProduct={(item) => {
              const effectiveRate = getEffectiveAedRate(settings, cmsConfig) || 1;
              const calcAed = Math.round((item.priceToman || 0) / effectiveRate);
              setSelectedProduct({
                id: item.id,
                title: `${item.title} (موجودی انبار ایران)`,
                url: 'https://omex.ir/stock/' + item.id,
                priceAed: calcAed > 0 ? calcAed : 100,
                originalPriceAed: item.originalPriceToman ? Math.round(item.originalPriceToman / effectiveRate) : 0,
                priceToman: item.priceToman,
                originalPriceToman: item.originalPriceToman,
                weightKg: item.weightKg || 0.5,
                image: item.image || 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80',
                images: item.images || (item.image ? [item.image] : []),
                galleryImages: item.galleryImages || item.images || (item.image ? [item.image] : []),
                storeName: 'انبار ایران (تحویل فوری)',
                brand: 'انبار ایران',
                calculatedTomanOverride: item.priceToman,
                category: item.category || 'موجودی ایران',
                description: item.description || 'اورجینال - موجود در انبار ایران جهت ارسال فوری',
                badge: item.deliveryBadge || '⚡ ارسال فوری (انبار ایران)',
                inStock: item.inStock ?? true,
                isLocalInventory: true,
                flavors: item.flavors || [],
                sizes: item.sizes || [],
                variants: item.variants || [],
                variantMatrix: item.variantMatrix || undefined,
                variantGroups: item.variantGroups || undefined,
                options: item.options || []
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
              deals={(cmsConfig?.deals && cmsConfig.deals.length > 0) ? cmsConfig.deals : contextDeals}
              categories={cmsConfig?.warehouseCategories}
              settings={settings}
              isLoading={isProductsLoading && (!cmsConfig?.deals || cmsConfig.deals.length === 0) && contextDeals.length === 0}
              onSelectDeal={handleSelectDeal}
              onAddToCart={addToCart}
              onOpenCart={() => {
                setSelectedProduct(null);
                setActiveTab('detail');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
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

        {/* PAYMENT RECEIPT PAGE (صفحه تایید پرداخت و فاکتور نهایی) */}
        {activeTab === 'receipt' && (
          <PaymentReceipt
            cms={cmsConfig}
            onNavigateHome={() => {
              window.history.pushState({}, '', '/');
              setActiveTab('main');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateAccount={() => {
              window.history.pushState({}, '', '/');
              setActiveTab('account');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onRetryPayment={(ord) => {
              redirectToBankPayment(ord);
            }}
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
              redirectToBankPayment(order);
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
            description: (item as any).description || 'اورجینال - موجود در انبار ایران جهت ارسال فوری',
            badge: (item as any).deliveryBadge || '⚡ ارسال فوری (انبار ایران)',
            inStock: true,
            isLocalInventory: true,
            flavors: (item as any).flavors || [],
            sizes: (item as any).sizes || []
          });
          setActiveTab('detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Promo & Offer Popup Engine */}
      <PromoPopupModal
        config={cmsConfig?.promoPopup}
        currentTab={activeTab}
      />

      {/* Terms & Conditions Modal View */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        cms={cmsConfig}
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

      {/* Persistent Floating Quick-Support Widget (WhatsApp & Telegram Support Bot) */}
      <FloatingSupportWidget />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary name="SirikFit Application">
      <SettingsProvider>
        <PricingProvider>
          <ProductProvider>
            <SupportProvider>
              <CartProvider>
                <MainApp />
              </CartProvider>
            </SupportProvider>
          </ProductProvider>
        </PricingProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

