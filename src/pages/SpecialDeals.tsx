import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { FeaturedDeal, FinancialSettings } from '../types';
import type { ProductDetailModalProduct } from '../components/ProductDetailModal';
import { fetchSpecialDealsFromFirestore } from '../services/productService';
import { FeaturedDeals } from '../components/FeaturedDeals';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { calculateFinalToman, getEffectiveAedRate } from '../utils/formatters';

interface SpecialDealsPageProps {
  deals?: FeaturedDeal[];
  settings?: FinancialSettings;
  onSelectDeal?: (deal: FeaturedDeal) => void;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenCart?: () => void;
}

function toModalDeal(deal: FeaturedDeal, settings: FinancialSettings): ProductDetailModalProduct {
  const effectiveRate = getEffectiveAedRate(settings) || settings.aedRate || 55000;
  const margin = deal.profitMargin !== undefined ? deal.profitMargin : (deal.marginPercent !== undefined ? deal.marginPercent : (settings.profitMargin || 20));
  const finalToman = (deal.priceToman && deal.priceToman > 0)
    ? deal.priceToman
    : (deal.calculatedTomanOverride && deal.calculatedTomanOverride > 0
        ? deal.calculatedTomanOverride
        : calculateFinalToman(deal.priceAed || 100, deal.weightKg || 0.5, settings.cargoRatePerKg || 35, margin, effectiveRate));

  return {
    id: deal.id,
    title: deal.title,
    englishTitle: deal.englishTitle,
    url: deal.url,
    priceAed: deal.priceAed,
    originalPriceAed: deal.originalPriceAed,
    priceToman: finalToman,
    originalPriceToman: deal.originalPriceToman,
    calculatedTomanOverride: finalToman,
    profitMargin: margin,
    discountPercent: deal.discountPercent,
    weightKg: deal.weightKg || 0.5,
    image: deal.image,
    images: deal.images || (deal.image ? [deal.image] : []),
    galleryImages: deal.galleryImages || deal.images || (deal.image ? [deal.image] : []),
    storeName: deal.storeName || deal.brand || 'فروشگاه دبی',
    brand: deal.brand || deal.storeName || 'دبی',
    category: deal.category,
    description: deal.description || '',
    badge: deal.badge || '🔥 پیشنهاد ویژه',
    flavors: deal.flavors as string[] | undefined,
    sizes: deal.sizes as string[] | undefined,
    variants: deal.variants,
    variantMatrix: deal.variantMatrix,
    variantGroups: deal.variantGroups
  };
}

export const SpecialDeals: React.FC<SpecialDealsPageProps> = ({
  deals: initialDeals,
  settings = { aedRate: 51400, cargoRatePerKg: 35, profitMargin: 20 },
  onSelectDeal,
  onAddToCart,
  showToast,
  onOpenCart
}) => {
  const [dealsList, setDealsList] = useState<FeaturedDeal[]>(initialDeals || []);
  const [selectedDeal, setSelectedDeal] = useState<FeaturedDeal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setDealsList(initialDeals || []);
  }, [initialDeals]);

  useEffect(() => {
    // Initial fetch fallback
    fetchSpecialDealsFromFirestore().then((items) => {
      setDealsList(items || []);
    }).catch(() => {});

    // Real-time Firestore snapshot listener
    const unsub = onSnapshot(collection(db, 'special_deals'), (snap) => {
      const loaded: FeaturedDeal[] = [];
      snap.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as FeaturedDeal);
      });
      setDealsList(loaded);
    }, (err) => {
      console.warn('Special Deals onSnapshot notice:', err);
    });

    return () => unsub();
  }, []);

  const handleSelect = (deal: FeaturedDeal) => {
    if (onSelectDeal) {
      onSelectDeal(deal);
    } else {
      setSelectedDeal(deal);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-2" dir="rtl">
      <FeaturedDeals
        deals={dealsList}
        settings={settings}
        onSelectDeal={handleSelect}
        onAddToCart={onAddToCart}
        showToast={showToast}
        onOpenCart={onOpenCart}
      />
      <ProductDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedDeal ? toModalDeal(selectedDeal, settings) : null}
        settings={settings}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};

export default SpecialDeals;
