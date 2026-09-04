import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PopularProductsCarousel, PopularProductItem } from '../PopularProductsCarousel';
import type { FinancialSettings } from '../../types';
import { cleanupGhostPopularProducts } from '../../services/popularProductsService';

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
    cleanupGhostPopularProducts().catch(() => {});

    try {
      const processSnapshot = (snapshot: any) => {
        if (snapshot.empty) {
          setPopularItems([]);
          return;
        }

        // Eradicate any orphan document titled "محصول پرطرفدار" or ghost document
        snapshot.docs.forEach((docSnap: any) => {
          const data = docSnap.data();
          const tFa = (data?.titleFa || '').trim();
          const tEn = (data?.title || '').trim();
          const name = (data?.name || '').trim();
          const fullTitle = tFa || tEn || name;
          const isGhost = !fullTitle || fullTitle === 'محصول بدون عنوان' || fullTitle === 'بدون عنوان' || fullTitle === 'محصول پرطرفدار';
          const hasPrice = Number(data?.priceAed || data?.price || data?.priceToman || data?.manualPriceToman || 0) > 0;
          const hasImage = Boolean(data?.imageUrl || data?.image || (Array.isArray(data?.images) && data.images.length > 0));
          if (isGhost && !hasPrice && !hasImage) {
            deleteDoc(docSnap.ref).catch(() => {});
          }
        });

        const fetched = snapshot.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as PopularProductItem))
          .filter((p: any) => {
            const tFa = (p.titleFa || '').trim();
            const tEn = (p.title || '').trim();
            const name = (p.name || '').trim();
            const fullTitle = tFa || tEn || name;
            const isGhost = !fullTitle || fullTitle === 'محصول بدون عنوان' || fullTitle === 'بدون عنوان' || fullTitle === 'محصول پرطرفدار';
            const hasPrice = Number(p.priceAed || p.price || p.priceToman || p.manualPriceToman || 0) > 0;
            const hasImage = Boolean(p.imageUrl || p.image || (Array.isArray(p.images) && p.images.length > 0));
            const isPub = p.isPublished !== false && p.isActive !== false;
            return isPub && (!isGhost || hasPrice || hasImage) && (p.popularOrder === undefined || p.popularOrder >= 0);
          });

        // Sort ascending by popularOrder (0 is highest priority), then newest first
        fetched.sort((a: any, b: any) => {
          const orderA = typeof a.popularOrder === 'number' && a.popularOrder >= 0 ? a.popularOrder : 999999999;
          const orderB = typeof b.popularOrder === 'number' && b.popularOrder >= 0 ? b.popularOrder : 999999999;
          if (orderA !== orderB) return orderA - orderB;
          const timeA = new Date(a.sectionAddedAt || a.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.sectionAddedAt || b.createdAt || b.updatedAt || 0).getTime();
          return timeB - timeA;
        });
        setPopularItems(fetched);
      };

      const popularQuery = query(
        collection(db, 'products'),
        where('isPopular', '==', true),
        orderBy('popularOrder', 'asc')
      );

      let unsubscribeFallback: (() => void) | null = null;
      const unsubscribe = onSnapshot(
        popularQuery,
        (snapshot) => {
          processSnapshot(snapshot);
        },
        (error) => {
          console.warn('[PopularProducts] onSnapshot index warning, using resilient fallback:', error?.message || error);
          // Resilient fallback: query isPopular == true without orderBy and sort in-memory
          const fallbackQuery = query(
            collection(db, 'products'),
            where('isPopular', '==', true)
          );
          unsubscribeFallback = onSnapshot(fallbackQuery, (fbSnap) => {
            processSnapshot(fbSnap);
          }, (fbErr) => {
            console.warn('[PopularProducts] Fallback snapshot error:', fbErr);
          });
        }
      );

      return () => {
        unsubscribe();
        if (unsubscribeFallback) unsubscribeFallback();
      };
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
