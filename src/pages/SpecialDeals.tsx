import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { FeaturedDeal, FinancialSettings } from '../types';
import { fetchSpecialDealsFromFirestore } from '../services/productService';
import { FeaturedDeals } from '../components/FeaturedDeals';
import { ProductDetailModal } from '../components/ProductDetailModal';

interface SpecialDealsPageProps {
  deals?: FeaturedDeal[];
  settings?: FinancialSettings;
  onSelectDeal?: (deal: FeaturedDeal) => void;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SpecialDeals: React.FC<SpecialDealsPageProps> = ({
  deals: initialDeals,
  settings = { aedRate: 51400, cargoRatePerKg: 35, profitMargin: 20 },
  onSelectDeal,
  onAddToCart,
  showToast
}) => {
  const [dealsList, setDealsList] = useState<FeaturedDeal[]>(initialDeals || []);
const [selectedDeal, setSelectedDeal] = useState<FeaturedDeal | null>(null);
const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (initialDeals && initialDeals.length > 0) {
      setDealsList(initialDeals);
    }
  }, [initialDeals]);

  useEffect(() => {
    // Initial fetch fallback
    fetchSpecialDealsFromFirestore().then((items) => {
      if (items && items.length > 0) {
        setDealsList(items);
      }
    }).catch(() => {});

    // Real-time Firestore snapshot listener
    const unsub = onSnapshot(collection(db, 'special_deals'), (snap) => {
      if (!snap.empty) {
        const loaded: FeaturedDeal[] = [];
        snap.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as FeaturedDeal);
        });
        setDealsList(loaded);
      }
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
    <div className="container mx-auto px-4 py-6" dir="rtl">
      <FeaturedDeals
        deals={dealsList}
        settings={settings}
        onSelectDeal={handleSelect}
        onAddToCart={onAddToCart}
        showToast={showToast}
      />
      <ProductDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedDeal}
        settings={settings}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};

export default SpecialDeals;
