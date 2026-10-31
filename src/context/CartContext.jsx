import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getCollection, subscribeToData } from '../services/firestoreData';

const defaultCartContext = {
  cartItems: [],
  addToCart: () => {},
  updateQuantity: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
  deliveryFee: 0,
  grandTotal: 0,
  deliveryInfo: {
    address: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    deliverySlot: '02:00 PM - 05:00 PM',
    paymentMethod: 'Cash on Delivery',
    notes: ''
  },
  setDeliveryInfo: () => {}
};

const CartContext = createContext(defaultCartContext);

export const CartProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('aquaconnect_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deliveryInfo, setDeliveryInfo] = useState({
    address: currentUser?.address || 'NH40, Vaddagandla, Andhra Pradesh, 518112',
    deliveryDate: new Date().toISOString().split('T')[0],
    deliverySlot: '02:00 PM - 05:00 PM',
    paymentMethod: 'Cash on Delivery',
    notes: ''
  });

  // Keep cart items strictly in sync with latest catalog photos, prices and details
  useEffect(() => {
    const syncCartWithCatalog = () => {
      const catalog = getCollection('products') || [];
      if (catalog.length === 0) return;

      setCartItems(prev => {
        let changed = false;
        const next = prev.map(item => {
          const catItem = catalog.find(p => p.productId === item.productId);
          if (catItem) {
            const freshImage = catItem.image || (
              (catItem.name || '').toLowerCase().includes('cool') ? '/images/cool_water_can.jpg' :
              (catItem.name || '').toLowerCase().includes('packet') ? '/images/water_pouches_pack.jpg' :
              (catItem.name || '').toLowerCase().includes('bottle') ? '/images/bottled_water_pack.jpg' :
              '/images/bubble_top_can.jpg'
            );
            if (freshImage !== item.image || catItem.price !== item.price || catItem.name !== item.name) {
              changed = true;
              return {
                ...item,
                image: freshImage,
                price: catItem.price,
                name: catItem.name,
                unit: catItem.unit || item.unit,
                containerType: catItem.containerType || item.containerType
              };
            }
          }
          return item;
        });
        return changed ? next : prev;
      });
    };

    syncCartWithCatalog();
    const unsub = subscribeToData((coll) => {
      if (coll === 'products' || coll === 'all') {
        syncCartWithCatalog();
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUser?.address) {
      setDeliveryInfo(prev => ({
        ...prev,
        address: currentUser.address
      }));
    }
  }, [currentUser?.address]);

  useEffect(() => {
    try {
      localStorage.setItem('aquaconnect_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn("Cart storage error", e);
    }
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    const productImage = product.image || (
      (product.name || '').toLowerCase().includes('cool') ? '/images/cool_water_can.jpg' :
      (product.name || '').toLowerCase().includes('packet') ? '/images/water_pouches_pack.jpg' :
      (product.name || '').toLowerCase().includes('bottle') ? '/images/bottled_water_pack.jpg' :
      '/images/bubble_top_can.jpg'
    );

    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.productId);
      if (existing) {
        return prev.map(item =>
          item.productId === product.productId
            ? { ...item, image: productImage, price: product.price, name: product.name, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        productId: product.productId,
        name: product.name,
        price: product.price,
        image: productImage,
        unit: product.unit,
        containerType: product.containerType,
        quantity: Math.max(1, quantity)
      }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCartItems(prev => {
      return prev
        .map(item => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 300 || subtotal === 0 ? 0 : 20; // Free delivery over ₹300
  const grandTotal = subtotal + deliveryFee;

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      totalItems,
      subtotal,
      deliveryFee,
      grandTotal,
      deliveryInfo,
      setDeliveryInfo
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    return defaultCartContext;
  }
  return context;
};
