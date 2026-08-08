import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategoryFilter } from './components/CategoryFilter';
import { ProductGrid } from './components/ProductGrid';
import { AdminPanel } from './components/AdminPanel';
import { CartDrawer } from './components/CartDrawer';
import { PaymentModal } from './components/PaymentModal';
import { AuthModal } from './components/AuthModal';
import { FinancialSettings, CmsConfig, CartItem, Product } from './types';
import { getSettingsFromFirestore, getCmsFromFirestore } from './firebase';

const DEFAULT_SETTINGS: FinancialSettings = {
  aedRate: 19500,
  profitMarginPercent: 15,
  shippingPerKgAed: 10,
  customsTaxPercent: 5,
  packingFeeToman: 50000,
  fixedShippingToman: 100000
};

export default function App() {
  const [settings, setSettings] = useState<FinancialSettings>(DEFAULT_SETTINGS);
  const [cms, setCms] = useState<CmsConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'deals' | 'inventory' | 'admin'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // بارگذاری مستقیم تنظیمات و CMS از دیتابیس Firestore بدون نیاز به API
  useEffect(() => {
    const loadFirestoreData = async () => {
      try {
        const dbSettings = await getSettingsFromFirestore();
        if (dbSettings) {
          setSettings(dbSettings);
        }

        const dbCms = await getCmsFromFirestore();
        if (dbCms) {
          setCms(dbCms);
        }
      } catch (error) {
        console.error('Firestore load error:', error);
      }
    };

    loadFirestoreData();
  }, []);

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-['Vazirmatn',sans-serif] pb-24 dir-rtl">
      <Header
        aedRate={settings.aedRate}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => setActiveTab('admin')}
        onOpenAuth={() => setIsAuthOpen(true)}
        user={user}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'admin' ? (
          <AdminPanel
            settings={settings}
            onUpdateSettings={setSettings}
            cms={cms}
            onUpdateCms={setCms}
          />
        ) : (
          <>
            <Hero heroImageUrl={cms?.homeContent?.heroImageUrl || cms?.heroImage} />
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            <ProductGrid
              settings={settings}
              selectedCategory={selectedCategory}
              onAddToCart={handleAddToCart}
            />
          </>
        )}
      </main>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        setCart={setCart}
        settings={settings}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsPaymentOpen(true);
        }}
      />

      {isPaymentOpen && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          cart={cart}
          settings={settings}
          cms={cms}
          onSuccess={() => setCart([])}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onUserChange={setUser}
        />
      )}
    </div>
  );
}