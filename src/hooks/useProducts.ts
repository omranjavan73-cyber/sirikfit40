import { useProducts, ProductContextType } from '../context/ProductContext';
import type { FeaturedDeal, LocalInventoryItem } from '../types';

export { useProducts } from '../context/ProductContext';
export type { ProductContextType } from '../context/ProductContext';

/**
 * Convenience hook to get special deals and loading state
 */
export function useSpecialDeals(): {
  deals: FeaturedDeal[];
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const { deals, isLoading, refetchProducts } = useProducts();
  return {
    deals,
    isLoading,
    refetch: refetchProducts
  };
}

/**
 * Convenience hook to get Iran warehouse items and loading state
 */
export function useIranWarehouse(): {
  warehouseItems: LocalInventoryItem[];
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const { warehouseItems, isLoading, refetchProducts } = useProducts();
  return {
    warehouseItems,
    isLoading,
    refetch: refetchProducts
  };
}

/**
 * Convenience hook to get Popular products
 */
export function usePopularProducts(): {
  popularProducts: any[];
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const { popularProducts, isLoading, refetchProducts } = useProducts();
  return {
    popularProducts,
    isLoading,
    refetch: refetchProducts
  };
}

export default useProducts;
