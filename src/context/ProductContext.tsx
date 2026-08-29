import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { FeaturedDeal, LocalInventoryItem } from '../types';

interface ProductContextType {
  deals: FeaturedDeal[];
  warehouseItems: LocalInventoryItem[];
  generalProducts: any[];
  popularProducts: any[];
  isLoading: boolean;
  refetchProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deals, setDeals] = useState<FeaturedDeal[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<LocalInventoryItem[]>([]);
  const [generalProducts, setGeneralProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refetchProducts = async () => {
    try {
      const [dealsSnap, whSnap, prodSnap] = await Promise.all([
        getDocs(collection(db, 'special_deals')),
        getDocs(collection(db, 'iran_warehouse')),
        getDocs(collection(db, 'products')).catch(() => ({ forEach: () => {} } as any))
      ]);
      const loadedDeals: FeaturedDeal[] = [];
      dealsSnap.forEach((d) => loadedDeals.push({ id: d.id, ...d.data() } as FeaturedDeal));
      setDeals(loadedDeals);

      const loadedWh: LocalInventoryItem[] = [];
      whSnap.forEach((d) => loadedWh.push({ id: d.id, ...d.data() } as LocalInventoryItem));
      setWarehouseItems(loadedWh);

      const loadedProd: any[] = [];
      prodSnap.forEach((d: any) => loadedProd.push({ id: d.id, ...d.data() }));
      setGeneralProducts(loadedProd);
    } catch (err) {
      console.warn('ProductContext refetch warning:', err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    console.info('[Firebase] Connected to project: sirikfit40 (Products)');
    let loadedCount = 0;
    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= 3) setIsLoading(false);
    };

    const unsubDeals = onSnapshot(
      collection(db, 'special_deals'),
      (snap) => {
        const loaded: FeaturedDeal[] = [];
        snap.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as FeaturedDeal);
        });
        setDeals(loaded);
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
        setGeneralProducts(loaded);
        checkDone();
      },
      (err) => {
        console.warn('Products collection snapshot warning:', err);
        checkDone();
      }
    );

    return () => {
      unsubDeals();
      unsubWh();
      unsubProd();
    };
  }, []);

  // Aggregate popular products across all operational collections, deduplicating by ID
  // Aggregate popular products across all operational collections:
  // Must be strictly: isPublished !== false && isActive !== false && isPopular === true
  const popularProducts = useMemo(() => {
    const map = new Map<string, any>();

    // 1. From special_deals
    deals.forEach((d: any) => {
      const isPub = d && d.isPublished !== false && d.isActive !== false && d.isDraft !== true;
      const isPop = d && d.isPopular !== false && (d.isPopular === true || String(d.isPopular) === 'true');
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
      const isPub = w && w.isPublished !== false && w.isActive !== false && w.isDraft !== true;
      const isPop = w && w.isPopular !== false && (w.isPopular === true || String(w.isPopular) === 'true');
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
      const isPub = p && p.isPublished !== false && p.isActive !== false && p.isDraft !== true;
      const isPop = p && p.isPopular !== false && (p.isPopular === true || String(p.isPopular) === 'true');
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
