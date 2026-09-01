import React, { useState, useEffect, useMemo } from 'react';
import type { LocalInventoryItem, FinancialSettings } from '../types';
import type { ProductDetailModalProduct } from '../components/ProductDetailModal';
import { InventoryPage } from '../components/InventoryPage';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { useProducts, sortNewestFirst } from '../context/ProductContext';

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
  settings = { aedRate: 54500, cargoRatePerKg: 35, profitMargin: 20 },
  onSelectLocalProduct,
  onAddToCart,
  showToast,
  onOpenCart
}) => {
  const { warehouseItems: contextWarehouse, isLoading } = useProducts();
  const [selectedItem, setSelectedItem] = useState<LocalInventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stale-While-Revalidate: retain existing items in state during background re-syncs
  const [persistedItems, setPersistedItems] = useState<LocalInventoryItem[]>(() => {
    if (initialItems && initialItems.length > 0) return initialItems;
    if (contextWarehouse && contextWarehouse.length > 0) return contextWarehouse;
    return [];
  });

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setPersistedItems(initialItems);
    } else if (contextWarehouse && contextWarehouse.length > 0) {
      setPersistedItems(contextWarehouse);
    }
  }, [initialItems, contextWarehouse]);

  const visibleItems = useMemo(() => {
    const filtered = persistedItems.filter(item => item && (item as any).isActive !== false && (item as any).isPublished !== false && (item as any).isDraft !== true);
    return sortNewestFirst(filtered);
  }, [persistedItems]);

  const handleSelect = (item: LocalInventoryItem) => {
    if (onSelectLocalProduct) {
      onSelectLocalProduct(item);
    } else {
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="container mx-auto px-1 sm:px-3 py-0" dir="rtl">
      <InventoryPage
        items={visibleItems}
        settings={settings}
        isLoading={isLoading && visibleItems.length === 0}
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
