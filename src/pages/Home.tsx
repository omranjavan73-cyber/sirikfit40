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
  cmsConfig,
  onSelectProduct,
  onAddToCart,
  showToast
}) => {
  const { deals: contextDeals, warehouseItems: contextLocal, popularProducts: contextPopular, isLoading } = useProducts();

  const activeDeals = useMemo(() => {
    const source = (initialDeals && initialDeals.length > 0) ? initialDeals : contextDeals;
    return source.filter(d => d && d.isActive !== false && (d as any).isPublished !== false && (d as any).isDraft !== true);
  }, [initialDeals, contextDeals]);

  // Single source of truth: directly use canonical popularProducts from ProductContext
  const popularList = useMemo(() => {
    return contextPopular && contextPopular.length > 0 ? contextPopular : [];
  }, [contextPopular]);

  return (
    <div className="space-y-8 font-['Vazirmatn',sans-serif]" dir="rtl">
      {popularList.length > 0 && (
        <PopularProductsCarousel
          items={popularList as any}
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
