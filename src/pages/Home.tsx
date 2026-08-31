import React, { useMemo } from 'react';
import type { FeaturedDeal, LocalInventoryItem, FinancialSettings } from '../types';
import { PopularProductsCarousel } from '../components/PopularProductsCarousel';
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
  deals: initialDeals,
  localInventory: initialLocal,
  settings = { aedRate: 54500, cargoRatePerKg: 35, profitMargin: 20 },
  onSelectProduct,
  onAddToCart,
  showToast
}) => {
  const { deals: contextDeals, warehouseItems: contextLocal, popularProducts: contextPopular, isLoading } = useProducts();

  const activeDeals = useMemo(() => {
    const source = (initialDeals && initialDeals.length > 0) ? initialDeals : contextDeals;
    return source.filter(d => d && d.isActive !== false && (d as any).isPublished !== false && (d as any).isDraft !== true);
  }, [initialDeals, contextDeals]);

  // Composite Homepage Popular Products Selector:
  const popularProducts = useMemo(() => {
    const dealsList = (initialDeals && initialDeals.length > 0) ? initialDeals : contextDeals;
    const localList = (initialLocal && initialLocal.length > 0) ? initialLocal : contextLocal;
    const sourceList = [...dealsList, ...localList];
    const candidateList = sourceList.length > 0 ? sourceList : (contextPopular || []);

    const uniqueMap = new Map<string, any>();
    candidateList
      .filter((item: any) =>
        item &&
        item.id &&
        item.isPublished !== false &&
        item.isActive !== false &&
        item.isDraft !== true &&
        (item.isPopular === true || String(item.isPopular) === 'true' || item.isPopularSample === true || String(item.isPopularSample) === 'true')
      )
      .forEach((item: any) => {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });

    return Array.from(uniqueMap.values());
  }, [initialDeals, initialLocal, contextDeals, contextLocal, contextPopular]);

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
        isLoading={isLoading}
        onSelectDeal={onSelectProduct || ((p) => window.dispatchEvent(new CustomEvent('openProductDetail', { detail: p })))}
        onAddToCart={onAddToCart}
        showToast={showToast}
      />
    </div>
  );
};

export default Home;
