import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useProducts, ProductContextType } from '../context/ProductContext';
import type { FeaturedDeal, LocalInventoryItem } from '../types';
import type { Product } from '../types/product';

export { useProducts } from '../context/ProductContext';
export type { ProductContextType } from '../context/ProductContext';

/**
 * Hook for subscribing to products filtered by targetSection with memoized query and Stale-While-Revalidate.
 */
export function useProductsBySection(activeTab: 'deals' | 'iran_warehouse' | string = 'deals') {
  const targetSectionKey = activeTab === 'deals' ? 'deals' : 'iran_warehouse';

  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(`sirikfit_section_${targetSectionKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {}
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(products.length === 0);

  const stableQuery = useMemo(() => {
    return query(
      collection(db, 'products'),
      where('isActive', '==', true),
      where('targetSection', '==', targetSectionKey),
      orderBy('createdAt', 'desc')
    );
  }, [targetSectionKey]);

  useEffect(() => {
    if (products.length === 0) {
      setIsLoading(true);
    }
    const unsubscribe = onSnapshot(
      stableQuery,
      (snapshot) => {
        const prods = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Product));
        if (prods.length > 0) {
          setProducts(prods);
          try {
            localStorage.setItem(`sirikfit_section_${targetSectionKey}`, JSON.stringify(prods));
          } catch (_e) {}
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [stableQuery, targetSectionKey]);

  return { products, isLoading, setProducts };
}

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
