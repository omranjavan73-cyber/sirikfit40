import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PopularProductsCarousel, PopularProductItem } from '../PopularProductsCarousel';
import type { FinancialSettings } from '../../types';

export interface PopularProductsProps {
  items?: PopularProductItem[];
  settings?: FinancialSettings;
  onSelectCategory?: (categoryKey: string) => void;
  onSelectProduct?: (item: PopularProductItem) => void;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Homepage Popular Products component.
 * Queries Firestore strictly by where('isPopular', '==', true) & orderBy('popularOrder', 'asc')
 * to ensure that custom admin ordering and auto-prioritized items render in exact sequence.
 */
export const PopularProducts: React.FC<PopularProductsProps> = ({
  items: initialItems,
  settings,
  onSelectCategory,
  onSelectProduct,
  onAddToCart,
  showToast
}) => {
  const [popularItems, setPopularItems] = useState<PopularProductItem[]>(initialItems || []);

  useEffect(() => {
    if (!db) return;

    try {
      const popularQuery = query(
        collection(db, 'products'),
        where('isActive', '==', true),
        where('isPopular', '==', true),
        orderBy('popularOrder', 'asc')
      );

      const unsubscribe = onSnapshot(
        popularQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PopularProductItem));
            // Sort ascending by popularOrder
            fetched.sort((a: any, b: any) => {
              const orderA = typeof a.popularOrder === 'number' ? a.popularOrder : 9999;
              const orderB = typeof b.popularOrder === 'number' ? b.popularOrder : 9999;
              if (orderA !== orderB) return orderA - orderB;
              const dateA = a.updatedAt || a.createdAt || '';
              const dateB = b.updatedAt || b.createdAt || '';
              return dateB.localeCompare(dateA);
            });
            setPopularItems(fetched);
          }
        },
        (error) => {
          console.warn('[PopularProducts] onSnapshot query notice:', error?.message || error);
        }
      );

      return () => unsubscribe();
    } catch (_e) {}
  }, []);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      const sorted = [...initialItems].sort((a: any, b: any) => {
        const orderA = typeof a.popularOrder === 'number' ? a.popularOrder : 9999;
        const orderB = typeof b.popularOrder === 'number' ? b.popularOrder : 9999;
        if (orderA !== orderB) return orderA - orderB;
        const dateA = a.updatedAt || a.createdAt || '';
        const dateB = b.updatedAt || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
      setPopularItems(sorted);
    }
  }, [initialItems]);

  return (
    <PopularProductsCarousel
      items={popularItems}
      settings={settings}
      onSelectCategory={onSelectCategory}
      onSelectProduct={onSelectProduct}
      onAddToCart={onAddToCart}
      showToast={showToast}
    />
  );
};

export default PopularProducts;
