import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('aquaconnect_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deliveryInfo, setDeliveryInfo] = useState({
    address: 'Flat 402, Green Meadows, Madhapur, Hyderabad',
    deliveryDate: new Date().toISOString().split('T')[0],
    deliverySlot: '02:00 PM - 05:00 PM',
    paymentMethod: 'Cash on Delivery',
    notes: ''
  });

  useEffect(() => {
    try {
      localStorage.setItem('aquaconnect_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn("Cart storage error", e);
    }
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.productId);
      if (existing) {
        return prev.map(item =>
          item.productId === product.productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        productId: product.productId,
        name: product.name,
        price: product.price,
        image: product.image,
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
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
