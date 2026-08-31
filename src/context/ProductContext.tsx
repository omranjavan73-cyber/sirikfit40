import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { FeaturedDeal, LocalInventoryItem } from '../types';

export interface ProductContextType {
  deals: FeaturedDeal[];
  warehouseItems: LocalInventoryItem[];
  generalProducts: any[];
  popularProducts: any[];
  isLoading: boolean;
  refetchProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Safe localStorage cache hydration helpers
const loadInitialDeals = (): FeaturedDeal[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sirikfit_special_deals');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const rawCms = localStorage.getItem('sirikfit_cms_config') || localStorage.getItem('omex_home_cms');
    if (rawCms) {
      const cms = JSON.parse(rawCms);
      if (Array.isArray(cms?.deals) && cms.deals.length > 0) return cms.deals;
    }
  } catch (_e) {}
  return [];
};

const loadInitialWarehouse = (): LocalInventoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sirikfit_iran_warehouse');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const rawCms = localStorage.getItem('sirikfit_cms_config') || localStorage.getItem('omex_home_cms');
    if (rawCms) {
      const cms = JSON.parse(rawCms);
      if (Array.isArray(cms?.localInventory) && cms.localInventory.length > 0) return cms.localInventory;
    }
  } catch (_e) {}
  return [];
};

const loadInitialProducts = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sirikfit_products');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_e) {}
  return [];
};

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deals, setDeals] = useState<FeaturedDeal[]>(loadInitialDeals);
  const [warehouseItems, setWarehouseItems] = useState<LocalInventoryItem[]>(loadInitialWarehouse);
  const [generalProducts, setGeneralProducts] = useState<any[]>(loadInitialProducts);
  
  // If we have cached items from local storage, we don't start in a blocking loading state
  const hasCache = deals.length > 0 || warehouseItems.length > 0;
  const [isLoading, setIsLoading] = useState<boolean>(!hasCache);

  const refetchProducts = async () => {
    try {
      const [dealsSnap, whSnap, prodSnap] = await Promise.all([
        getDocs(collection(db, 'special_deals')),
        getDocs(collection(db, 'iran_warehouse')),
        getDocs(collection(db, 'products')).catch(() => ({ forEach: () => {} } as any))
      ]);
      const loadedDeals: FeaturedDeal[] = [];
      dealsSnap.forEach((d) => loadedDeals.push({ id: d.id, ...d.data() } as FeaturedDeal));
      if (loadedDeals.length > 0) {
        setDeals(loadedDeals);
        try { localStorage.setItem('sirikfit_special_deals', JSON.stringify(loadedDeals)); } catch (_) {}
      }

      const loadedWh: LocalInventoryItem[] = [];
      whSnap.forEach((d) => loadedWh.push({ id: d.id, ...d.data() } as LocalInventoryItem));
      if (loadedWh.length > 0) {
        setWarehouseItems(loadedWh);
        try { localStorage.setItem('sirikfit_iran_warehouse', JSON.stringify(loadedWh)); } catch (_) {}
      }

      const loadedProd: any[] = [];
      prodSnap.forEach((d: any) => loadedProd.push({ id: d.id, ...d.data() }));
      if (loadedProd.length > 0) {
        setGeneralProducts(loadedProd);
        try { localStorage.setItem('sirikfit_products', JSON.stringify(loadedProd)); } catch (_) {}
      }
      setIsLoading(false);
    } catch (err) {
      console.warn('ProductContext refetch warning:', err);
    }
  };

  useEffect(() => {
    let loadedCount = 0;
    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= 2) setIsLoading(false);
    };

    const unsubDeals = onSnapshot(
      collection(db, 'special_deals'),
      (snap) => {
        const loaded: FeaturedDeal[] = [];
        snap.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as FeaturedDeal);
        });
        setDeals(loaded);
        try {
          localStorage.setItem('sirikfit_special_deals', JSON.stringify(loaded));
        } catch (_) {}
        checkDone();
      },
      (err) => {
        console.warn('Deals snapshot warning:', err);
        checkDone();
      }
    );

    const unsubWh = onSnapshot(
      collection(db, 'iran_warehouse'),
      (snap) => {
        const loaded: LocalInventoryItem[] = [];
        snap.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as LocalInventoryItem);
        });
        setWarehouseItems(loaded);
        try {
          localStorage.setItem('sirikfit_iran_warehouse', JSON.stringify(loaded));
        } catch (_) {}
        checkDone();
      },
      (err) => {
        console.warn('Iran warehouse snapshot warning:', err);
        checkDone();
      }
    );

    const unsubProd = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const loaded: any[] = [];
        snap.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (loaded.length > 0) {
          setGeneralProducts(loaded);
          try {
            localStorage.setItem('sirikfit_products', JSON.stringify(loaded));
          } catch (_) {}
        }
      },
      (err) => {
        console.warn('Products collection snapshot warning:', err);
      }
    );

    return () => {
      unsubDeals();
      unsubWh();
      unsubProd();
    };
  }, []);

  // Aggregate popular products across all operational collections, deduplicating by ID:
  // Strictly enforces: isPublished !== false && isActive !== false && (isPopular === true || isPopularSample === true)
  const popularProducts = useMemo(() => {
    const map = new Map<string, any>();

    // 1. From special_deals
    deals.forEach((d: any) => {
      if (!d || !d.id) return;
      const isPub = d.isPublished !== false && d.isActive !== false && d.isDraft !== true;
      const isPop = d.isPopular === true || String(d.isPopular) === 'true' || d.isPopularSample === true || String(d.isPopularSample) === 'true';
      if (isPub && isPop) {
        map.set(d.id, {
          ...d,
          isPublished: true,
          isPopular: true,
          type: 'deal'
        });
      }
    });

    // 2. From iran_warehouse
    warehouseItems.forEach((w: any) => {
      if (!w || !w.id) return;
      const isPub = w.isPublished !== false && w.isActive !== false && w.isDraft !== true && w.inStock !== false;
      const isPop = w.isPopular === true || String(w.isPopular) === 'true' || w.isPopularSample === true || String(w.isPopularSample) === 'true';
      if (isPub && isPop) {
        if (!map.has(w.id)) {
          map.set(w.id, {
            ...w,
            isPublished: true,
            isPopular: true,
            type: 'local'
          });
        }
      }
    });

    // 3. From products
    generalProducts.forEach((p: any) => {
      if (!p || !p.id) return;
      const isPub = p.isPublished !== false && p.isActive !== false && p.isDraft !== true;
      const isPop = p.isPopular === true || String(p.isPopular) === 'true' || p.isPopularSample === true || String(p.isPopularSample) === 'true';
      if (isPub && isPop) {
        if (!map.has(p.id)) {
          map.set(p.id, {
            ...p,
            isPublished: true,
            isPopular: true,
            type: 'custom'
          });
        }
      }
    });

    return Array.from(map.values());
  }, [deals, warehouseItems, generalProducts]);

  return (
    <ProductContext.Provider
      value={{
        deals,
        warehouseItems,
        generalProducts,
        popularProducts,
        isLoading,
        refetchProducts
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

export default ProductContext;
