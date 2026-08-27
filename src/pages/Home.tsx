import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { FeaturedDeal, LocalInventoryItem, FinancialSettings } from '../types';
import { PopularProductsCarousel } from '../components/PopularProductsCarousel';
import { HeroBanner } from '../components/HeroBanner';
import { LocalInventorySection } from '../components/LocalInventorySection';
import { FeaturedDeals } from '../components/FeaturedDeals';

interface HomePageProps {
  deals?: FeaturedDeal[];
  localInventory?: LocalInventoryItem[];
  settings?: FinancialSettings;
  cmsConfig?: any;
  onSelectProduct?: (product: any) => void;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const Home: React.FC<HomePageProps> = ({
  deals: initialDeals = [],
  localInventory: initialLocal = [],
  settings = { aedRate: 51400, cargoRatePerKg: 35, profitMargin: 20 },
  cmsConfig,
  onSelectProduct,
  onAddToCart,
  showToast
}) => {
  const [deals, setDeals] = useState<FeaturedDeal[]>(initialDeals);
  const [localInventory, setLocalInventory] = useState<LocalInventoryItem[]>(initialLocal);

  useEffect(() => {
    if (initialDeals.length > 0) setDeals(initialDeals);
  }, [initialDeals]);

  useEffect(() => {
    if (initialLocal.length > 0) setLocalInventory(initialLocal);
  }, [initialLocal]);

  useEffect(() => {
    const unsubDeals = onSnapshot(collection(db, 'special_deals'), (snap) => {
      const list: FeaturedDeal[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as FeaturedDeal));
      setDeals(list);
    }, () => {});

    const unsubLocal = onSnapshot(collection(db, 'iran_warehouse'), (snap) => {
      const list: LocalInventoryItem[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as LocalInventoryItem));
      setLocalInventory(list);
    }, () => {});

    return () => {
      unsubDeals();
      unsubLocal();
    };
  }, []);

  const activeDeals = deals.filter(d => d.isActive === true);
  const popularDeals = deals.filter(d => d.isActive === true && (d as any).isPopular === true);

  return (
    <div className="space-y-8 font-['Vazirmatn',sans-serif]" dir="rtl">
      {popularDeals.length > 0 && (
        <PopularProductsCarousel
          products={popularDeals as any}
          onSelectProduct={onSelectProduct || ((p) => window.dispatchEvent(new CustomEvent('openProductDetail', { detail: p })))}
          onAddToCart={onAddToCart}
          showToast={showToast}
        />
      )}

      <FeaturedDeals
        deals={activeDeals}
        settings={settings}
        onSelectDeal={onSelectProduct || ((p) => window.dispatchEvent(new CustomEvent('openProductDetail', { detail: p })))}
        onAddToCart={onAddToCart}
        showToast={showToast}
      />
    </div>
  );
};

export default Home;
