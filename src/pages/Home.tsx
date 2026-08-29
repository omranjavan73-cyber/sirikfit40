import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { FeaturedDeal, LocalInventoryItem, FinancialSettings } from '../types';
import { PopularProductsCarousel } from '../components/PopularProductsCarousel';
import { HeroBanner } from '../components/HeroBanner';
import { LocalInventorySection } from '../components/LocalInventorySection';
import { FeaturedDeals } from '../components/FeaturedDeals';
import { useProducts } from '../context/ProductContext';

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
  settings = { aedRate: 54500, cargoRatePerKg: 35, profitMargin: 20 },
  cmsConfig,
  onSelectProduct,
  onAddToCart,
  showToast
}) => {
  const { popularProducts: contextPopular } = useProducts();
  const [deals, setDeals] = useState<FeaturedDeal[]>(initialDeals);
  const [localInventory, setLocalInventory] = useState<LocalInventoryItem[]>(initialLocal);

  useEffect(() => {
    setDeals(initialDeals || []);
  }, [initialDeals]);

  useEffect(() => {
    setLocalInventory(initialLocal || []);
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

  const activeDeals = deals.filter(d => d && d.isActive !== false && (d as any).isPublished !== false && (d as any).isDraft !== true);

  // Composite Homepage Popular Products Selector:
  // Strictly enforces: item.isPublished !== false && item.isPopular === true across both collections
  const popularProducts = useMemo(() => {
    const specialDeals = deals || [];
    const iranWarehouseProducts = localInventory || [];
    const sourceList = [...specialDeals, ...iranWarehouseProducts];
    const candidateList = sourceList.length > 0 ? sourceList : (contextPopular || []);

    const uniqueMap = new Map<string, any>();
    candidateList
      .filter((item: any) =>
        item &&
        item.id &&
        item.isPublished !== false &&
        item.isActive !== false &&
        item.isDraft !== true &&
        (item.isPopular === true || String(item.isPopular) === 'true')
      )
      .forEach((item: any) => {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });

    return Array.from(uniqueMap.values());
  }, [deals, localInventory, contextPopular]);

  return (
    <div className="space-y-8 font-['Vazirmatn',sans-serif]" dir="rtl">
      {popularProducts.length > 0 && (
        <PopularProductsCarousel
          products={popularProducts as any}
          settings={settings}
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
