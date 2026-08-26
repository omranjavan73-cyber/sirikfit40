import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: {
    id: string;
    title: string;
    priceAED: number;
    priceToman: number;
    selectedSize?: string;
    selectedFlavor?: string;
    imageUrl?: string;
    image?: string;
    quantity?: number;
    product?: any;
  }) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  syncAbandonedCart: (phone: string, fullName?: string) => Promise<void>;
  markCartRecovered: (phone: string) => Promise<void>;
  totalToman: number;
  totalAed: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('omex_cart_items') || localStorage.getItem('sirikfit_cart');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('omex_cart_items', JSON.stringify(cart));
        localStorage.setItem('sirikfit_cart', JSON.stringify(cart));
      } catch (_) {}
    }
  }, [cart]);

  const addToCart = (item: {
    id: string;
    title: string;
    priceAED: number;
    priceToman: number;
    selectedSize?: string;
    selectedFlavor?: string;
    imageUrl?: string;
    image?: string;
    quantity?: number;
    product?: any;
  }) => {
    const sizeStr = item.selectedSize || '';
    const flavorStr = item.selectedFlavor || '';
    const uniqueId = `${item.id}_${sizeStr}_${flavorStr}`;
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;

    setCart((prev) => {
      const idx = prev.findIndex((i) => (i.cartItemId === uniqueId || i.id === uniqueId));
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          ...item,
          quantity: (updated[idx].quantity || 1) + qty
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: uniqueId,
          cartItemId: uniqueId,
          title: item.title,
          url: item.product?.url || '',
          priceAed: item.priceAED,
          priceToman: item.priceToman,
          selectedSize: item.selectedSize,
          selectedFlavor: item.selectedFlavor,
          image: item.imageUrl || item.image,
          quantity: qty,
          weightKg: item.product?.weightKg || 0.8,
          product: item.product || item
        };
        return [newItem, ...prev];
      }
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId && i.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => ((i.cartItemId === cartItemId || i.id === cartItemId) ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setCart([]);

  const totalToman = cart.reduce((sum, i) => sum + (i.priceToman || 0) * (i.quantity || 1), 0);
  const totalAed = cart.reduce((sum, i) => sum + (i.priceAed || 0) * (i.quantity || 1), 0);
  const itemCount = cart.reduce((sum, i) => sum + (i.quantity || 1), 0);

  const syncAbandonedCart = async (phone: string, fullName?: string) => {
    if (!phone || cart.length === 0) return;
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const standardPhone = cleanPhone.startsWith('98') ? '0' + cleanPhone.slice(2) : (cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone);
      
      const payload = {
        phone: standardPhone,
        fullName: fullName || '',
        items: cart.map(i => ({
          title: i.title,
          priceToman: i.priceToman || 0,
          priceAed: i.priceAed || 0,
          quantity: i.quantity || 1,
          image: i.image || '',
          variant: i.selectedSize || i.selectedFlavor || ''
        })),
        totalAmountToman: totalToman
      };

      await fetch('/api/abandoned-cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (_e) {}
  };

  const markCartRecovered = async (phone: string) => {
    if (!phone) return;
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const standardPhone = cleanPhone.startsWith('98') ? '0' + cleanPhone.slice(2) : (cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone);

      await fetch('/api/abandoned-cart/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: standardPhone })
      }).catch(() => {});
    } catch (_e) {}
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncAbandonedCart,
        markCartRecovered,
        totalToman,
        totalAed,
        itemCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
