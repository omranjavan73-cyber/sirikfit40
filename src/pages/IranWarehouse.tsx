import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { LocalInventoryItem, FinancialSettings } from '../types';
import { fetchIranWarehouseFromFirestore } from '../services/productService';
import { InventoryPage } from '../components/InventoryPage';

interface IranWarehousePageProps {
  items?: LocalInventoryItem[];
  settings?: FinancialSettings;
  onSelectLocalProduct?: (item: LocalInventoryItem) => void;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const IranWarehouse: React.FC<IranWarehousePageProps> = ({
  items: initialItems,
  settings = { aedRate: 51400, cargoRatePerKg: 35, profitMargin: 20 },
  onSelectLocalProduct,
  onAddToCart,
  showToast
}) => {
  const [itemsList, setItemsList] = useState<LocalInventoryItem[]>(initialItems || []);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItemsList(initialItems);
    }
  }, [initialItems]);

  useEffect(() => {
    // Initial fetch fallback
    fetchIranWarehouseFromFirestore().then((items) => {
      if (items && items.length > 0) {
        setItemsList(items);
      }
    }).catch(() => {});

    // Real-time Firestore snapshot listener
    const unsub = onSnapshot(collection(db, 'iran_warehouse'), (snap) => {
      if (!snap.empty) {
        const loaded: LocalInventoryItem[] = [];
        snap.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as LocalInventoryItem);
        });
        setItemsList(loaded);
      }
    }, (err) => {
      console.warn('Iran Warehouse onSnapshot notice:', err);
    });

    return () => unsub();
  }, []);

  const handleSelect = (item: LocalInventoryItem) => {
    if (onSelectLocalProduct) {
      onSelectLocalProduct(item);
    } else {
      window.dispatchEvent(new CustomEvent('openProductDetail', { detail: item }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-6" dir="rtl">
      <InventoryPage
        items={itemsList}
        settings={settings}
        onSelectLocalProduct={handleSelect}
        onAddToCart={onAddToCart}
        showToast={showToast}
      />
    </div>
  );
};

export default IranWarehouse;
