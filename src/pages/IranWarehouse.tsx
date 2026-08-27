import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { LocalInventoryItem, FinancialSettings } from '../types';
import type { ProductDetailModalProduct } from '../components/ProductDetailModal';
import { fetchIranWarehouseFromFirestore } from '../services/productService';
import { InventoryPage } from '../components/InventoryPage';
import { ProductDetailModal } from '../components/ProductDetailModal';

interface IranWarehousePageProps {
  items?: LocalInventoryItem[];
  settings?: FinancialSettings;
  onSelectLocalProduct?: (item: LocalInventoryItem) => void;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenCart?: () => void;
}

/** Map a LocalInventoryItem to the shape expected by ProductDetailModal */
function toModalProduct(item: LocalInventoryItem, aedRate: number = 55000): ProductDetailModalProduct {
  const calcAed = item.priceAed || (item.priceToman && aedRate > 0 ? Math.round(item.priceToman / aedRate) : 0);
  return {
    id: item.id,
    title: item.title,
    englishTitle: item.englishTitle,
    url: item.url,
    priceAed: calcAed > 0 ? calcAed : 0,
    priceToman: item.priceToman,
    originalPriceToman: item.originalPriceToman,
    calculatedTomanOverride: item.calculatedTomanOverride || item.priceToman,
    isLocalInventory: item.isLocalInventory ?? true,
    isIranWarehouse: item.isIranWarehouse ?? true,
    weightKg: item.weightKg,
    image: item.image,
    images: item.images,
    galleryImages: item.galleryImages || item.images,
    storeName: 'انبار ایران',
    brand: item.brand || 'انبار ایران',
    category: item.category,
    description: item.description,
    deliveryBadge: item.deliveryBadge,
    flavors: item.flavors as string[] | undefined,
    sizes: item.sizes as string[] | undefined,
    variants: item.variants,
    variantMatrix: item.variantMatrix,
    variantGroups: item.variantGroups
  };
}

export const IranWarehouse: React.FC<IranWarehousePageProps> = ({
  items: initialItems,
  settings = { aedRate: 51400, cargoRatePerKg: 35, profitMargin: 20 },
  onSelectLocalProduct,
  onAddToCart,
  showToast,
  onOpenCart
}) => {
  const [itemsList, setItemsList] = useState<LocalInventoryItem[]>(initialItems || []);
  const [selectedItem, setSelectedItem] = useState<LocalInventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      const loaded: LocalInventoryItem[] = [];
      snap.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as LocalInventoryItem);
      });
      setItemsList(loaded);
    }, (err) => {
      console.warn('Iran Warehouse onSnapshot notice:', err);
    });

    return () => unsub();
  }, []);

  const handleSelect = (item: LocalInventoryItem) => {
    if (onSelectLocalProduct) {
      onSelectLocalProduct(item);
    } else {
      setSelectedItem(item);
      setIsModalOpen(true);
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
        onOpenCart={onOpenCart}
      />
      <ProductDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedItem ? toModalProduct(selectedItem, settings?.aedRate) : null}
        settings={settings}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};

export default IranWarehouse;
