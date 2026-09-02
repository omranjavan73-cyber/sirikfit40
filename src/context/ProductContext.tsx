import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { collection, doc, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { FeaturedDeal, LocalInventoryItem } from '../types';
import { sortPopularProducts, normalizeProductId } from '../services/popularProductsService';

export interface ProductContextType {
  deals: FeaturedDeal[];
  warehouseItems: LocalInventoryItem[];
  generalProducts: any[];
  popularProducts: any[];
  popularSamplesOrder: string[];
  isLoading: boolean;
  refetchProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const sortNewestFirst = <T extends any>(arr: T[]): T[] => {
  if (!Array.isArray(arr) || arr.length <= 1) return arr;
  return [...arr].sort((a: any, b: any) => {
    const getTime = (item: any): number => {
      if (!item) return 0;
      const candidate = item.sectionAddedAt || item.createdAt || item.updatedAt;
      if (candidate) {
        if (typeof candidate === 'number' && !isNaN(candidate) && candidate > 0) return candidate;
        if (typeof candidate === 'object' && candidate !== null) {
          if (typeof candidate.toMillis === 'function') return candidate.toMillis();
          if (typeof candidate.seconds === 'number') return candidate.seconds * 1000;
        }
        const parsed = new Date(candidate).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (typeof item.id === 'string') {
        const idParts = item.id.split(/[-_]/);
        for (let i = idParts.length - 1; i >= 0; i--) {
          const num = Number(idParts[i]);
          if (!isNaN(num) && num > 1600000000000 && num < 2500000000000) return num;
        }
      }
      return 0;
    };
    return getTime(b) - getTime(a);
  });
};

// Safe localStorage cache hydration helpers
const loadInitialDeals = (): FeaturedDeal[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sirikfit_special_deals');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return sortNewestFirst(parsed);
    }
    const rawCms = localStorage.getItem('sirikfit_cms_config') || localStorage.getItem('omex_home_cms');
    if (rawCms) {
      const cms = JSON.parse(rawCms);
      if (Array.isArray(cms?.deals) && cms.deals.length > 0) return sortNewestFirst(cms.deals);
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
      if (Array.isArray(parsed) && parsed.length > 0) return sortNewestFirst(parsed);
    }
    const rawCms = localStorage.getItem('sirikfit_cms_config') || localStorage.getItem('omex_home_cms');
    if (rawCms) {
      const cms = JSON.parse(rawCms);
      if (Array.isArray(cms?.localInventory) && cms.localInventory.length > 0) return sortNewestFirst(cms.localInventory);
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
      if (Array.isArray(parsed) && parsed.length > 0) return sortNewestFirst(parsed);
    }
  } catch (_e) {}
  return [];
};

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deals, setDeals] = useState<FeaturedDeal[]>(loadInitialDeals);
  const [warehouseItems, setWarehouseItems] = useState<LocalInventoryItem[]>(loadInitialWarehouse);
  const [generalProducts, setGeneralProducts] = useState<any[]>(loadInitialProducts);
  const [popularSamplesOrder, setPopularSamplesOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('sirikfit_cms_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.popularSamplesOrder)) return parsed.popularSamplesOrder;
      }
    } catch (_) {}
    return [];
  });
  
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
      const sortedDeals = sortNewestFirst(loadedDeals);
      if (sortedDeals.length > 0) {
        setDeals(sortedDeals);
        try { localStorage.setItem('sirikfit_special_deals', JSON.stringify(sortedDeals)); } catch (_) {}
      }

      const loadedWh: LocalInventoryItem[] = [];
      whSnap.forEach((d) => loadedWh.push({ id: d.id, ...d.data() } as LocalInventoryItem));
      const sortedWh = sortNewestFirst(loadedWh);
      if (sortedWh.length > 0) {
        setWarehouseItems(sortedWh);
        try { localStorage.setItem('sirikfit_iran_warehouse', JSON.stringify(sortedWh)); } catch (_) {}
      }

      const loadedProd: any[] = [];
      prodSnap.forEach((d: any) => loadedProd.push({ id: d.id, ...d.data() }));
      const sortedProd = sortNewestFirst(loadedProd);
      if (sortedProd.length > 0) {
        setGeneralProducts(sortedProd);
        try { localStorage.setItem('sirikfit_products', JSON.stringify(sortedProd)); } catch (_) {}
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
        const sorted = sortNewestFirst(loaded);
        setDeals((prev) => {
          if (sorted.length === 0 && prev.length > 0) return prev;
          return sorted;
        });
        if (sorted.length > 0) {
          try {
            localStorage.setItem('sirikfit_special_deals', JSON.stringify(sorted));
          } catch (_) {}
        }
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
        const sorted = sortNewestFirst(loaded);
        setWarehouseItems((prev) => {
          if (sorted.length === 0 && prev.length > 0) return prev;
          return sorted;
        });
        if (sorted.length > 0) {
          try {
            localStorage.setItem('sirikfit_iran_warehouse', JSON.stringify(sorted));
          } catch (_) {}
        }
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

    const unsubCms = onSnapshot(
      doc(db, 'settings', 'cms'),
      (snap) => {
        if (snap.exists()) {
          const cmsData = snap.data();
          if (Array.isArray(cmsData?.popularSamplesOrder)) {
            setPopularSamplesOrder(cmsData.popularSamplesOrder);
          }
        }
      },
      (err) => console.warn('CMS settings snapshot warning:', err)
    );

    const handlePopularOrderUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (Array.isArray(customEvent.detail)) {
        setPopularSamplesOrder(customEvent.detail.map((p: any) => p.id));
      } else if (Array.isArray(customEvent.detail?.popularSamplesOrder)) {
        setPopularSamplesOrder(customEvent.detail.popularSamplesOrder);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popularOrderUpdated', handlePopularOrderUpdate);
      window.addEventListener('settingsUpdated', handlePopularOrderUpdate);
    }

    return () => {
      unsubDeals();
      unsubWh();
      unsubProd();
      unsubCms();
      if (typeof window !== 'undefined') {
        window.removeEventListener('popularOrderUpdated', handlePopularOrderUpdate);
        window.removeEventListener('settingsUpdated', handlePopularOrderUpdate);
      }
    };
  }, []);

  // Aggregate popular products across all operational collections, deduplicating by ID:
  // Strictly enforces: isPublished !== false && isActive !== false && (isPopular === true || isPopularSample === true)
  // Ordered strictly by the canonical popularSamplesOrder or displayOrder
  const popularProducts = useMemo(() => {
    const candidateList: any[] = [];

    // 1. From special_deals
    deals.forEach((d: any) => {
      if (!d || !d.id) return;
      candidateList.push({
        ...d,
        rawItem: d,
        type: 'deal',
        targetSection: 'special_deals'
      });
    });

    // 2. From iran_warehouse
    warehouseItems.forEach((w: any) => {
      if (!w || !w.id) return;
      candidateList.push({
        ...w,
        rawItem: w,
        type: 'local',
        targetSection: 'iran_warehouse'
      });
    });

    // 3. From general products collection
    generalProducts.forEach((p: any) => {
      if (!p || !p.id) return;
      candidateList.push({
        ...p,
        rawItem: p,
        type: p.type || 'custom',
        targetSection: p.targetSection || 'products'
      });
    });

    return sortPopularProducts(candidateList, popularSamplesOrder);
  }, [deals, warehouseItems, generalProducts, popularSamplesOrder]);

  const contextValue = useMemo<ProductContextType>(() => ({
    deals,
    warehouseItems,
    generalProducts,
    popularProducts,
    popularSamplesOrder,
    isLoading,
    refetchProducts
  }), [deals, warehouseItems, generalProducts, popularProducts, popularSamplesOrder, isLoading]);

  return (
    <ProductContext.Provider value={contextValue}>
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
