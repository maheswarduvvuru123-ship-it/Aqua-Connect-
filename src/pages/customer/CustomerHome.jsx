import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  Sparkles, 
  Truck, 
  ShieldCheck, 
  Clock, 
  CheckCircle2,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useNotifications } from '../../context/NotificationContext';
import { getCollection, subscribeToData } from '../../services/firestoreData';
import { formatCurrency } from '../../utils/formatters';

const CustomerHome = ({ onOpenCart }) => {
  const { currentUser } = useAuth();
  const { addToCart, cartItems } = useCart();
  const { showToast } = useNotifications();

  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');

  const loadProducts = () => {
    const all = getCollection('products');
    setProducts(all.filter(p => p.isActive));
  };

  useEffect(() => {
    loadProducts();
    const unsub = subscribeToData((coll) => {
      if (coll === 'products' || coll === 'all') loadProducts();
    });
    return () => unsub();
  }, []);

  const handleQtyChange = (productId, delta) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      return { ...prev, [productId]: Math.max(1, current + delta) };
    });
  };

  const handleAddToCart = (product) => {
    const qty = quantities[product.productId] || 1;
    addToCart(product, qty);
    showToast(`Added ${qty} × ${product.name} to cart! 💧`, 'success');
  };

  const categories = ['All', '20L Jars', '10L Jars', 'Packaged Bottles'];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || 
                          p.description?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (categoryFilter === '20L Jars') return p.name.includes('20L');
    if (categoryFilter === '10L Jars') return p.name.includes('10L');
    if (categoryFilter === 'Packaged Bottles') return p.name.includes('Bottle');
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Welcome Banner as required in Section 13 */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0c4a6e 100%)',
          borderRadius: '24px',
          padding: '36px 40px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)'
        }}
      >
        <div style={{ maxWidth: '640px', position: 'relative', zIndex: 2 }}>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(4px)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '12px'
            }}
          >
            <Sparkles size={14} /> Certified RO + UV Mineral Water Delivery
          </div>

          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
            Hello, {currentUser?.name?.split(' ')[0] || 'Valued Customer'}! 👋
          </h2>
          <p style={{ fontSize: '1.25rem', fontWeight: 600, opacity: 0.95, marginTop: '6px' }}>
            Need water? Order now.
          </p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '8px', lineHeight: 1.5 }}>
            Clean, sanitized, and sealed 20L jars & natural mineral water delivered straight to your doorstep in 45-60 minutes.
          </p>

          <div style={{ display: 'flex', gap: '20px', marginTop: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
              <Truck size={18} color="#7dd3fc" /> Same-Day Doorstep Dispatch
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
              <ShieldCheck size={18} color="#7dd3fc" /> Quality Sealed & Tested
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
              <Clock size={18} color="#7dd3fc" /> Choose Delivery Slot
            </div>
          </div>
        </div>

        {/* Decorative water waves in background */}
        <div 
          style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-40px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            zIndex: 1
          }} 
        />
        <div 
          style={{
            position: 'absolute',
            right: '80px',
            top: '-20px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            backgroundColor: 'rgba(14, 165, 233, 0.18)',
            zIndex: 1
          }} 
        />
      </div>

      {/* Filter and Search controls */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        {/* Categories */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: categoryFilter === cat ? 700 : 500,
                backgroundColor: categoryFilter === cat ? '#0284c7' : '#ffffff',
                color: categoryFilter === cat ? '#ffffff' : 'var(--text-secondary)',
                border: categoryFilter === cat ? '1px solid #0284c7' : '1px solid var(--border-light)',
                boxShadow: categoryFilter === cat ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input 
            type="text"
            placeholder="Search water cans, bottles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '20px',
              border: '1px solid var(--border-light)',
              backgroundColor: '#ffffff',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Water Products Grid (Section 13) */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}
      >
        {filteredProducts.map((product) => {
          const qty = quantities[product.productId] || 1;
          const isInCart = cartItems.some(i => i.productId === product.productId);

          return (
            <div 
              key={product.productId}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                backgroundColor: '#ffffff'
              }}
            >
              {/* Product Image */}
              <div style={{ height: '180px', position: 'relative', overflow: 'hidden' }}>
                <img 
                  src={product.image} 
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                  <span className="badge badge-delivered" style={{ fontSize: '0.72rem' }}>
                    Available
                  </span>
                </div>
                <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                  <span 
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    {product.unit}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {product.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                    {product.containerType}
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                    {product.description}
                  </p>
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Price</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(product.price)}
                      </div>
                    </div>

                    {/* Quantity Selector: [-] 1 [+] (Section 13 requirement) */}
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '10px',
                        padding: '4px 8px'
                      }}
                    >
                      <button 
                        onClick={() => handleQtyChange(product.productId, -1)}
                        style={{ padding: '4px', color: '#334155' }}
                        title="Decrease"
                      >
                        <Minus size={16} />
                      </button>
                      <span style={{ fontWeight: 800, minWidth: '22px', textAlign: 'center', fontSize: '0.95rem' }}>
                        {qty}
                      </span>
                      <button 
                        onClick={() => handleQtyChange(product.productId, 1)}
                        style={{ padding: '4px', color: '#0284c7' }}
                        title="Increase"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Add to Cart button */}
                  <button 
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px' }}
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingBag size={18} /> Add to Cart ({formatCurrency(product.price * qty)})
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerHome;
