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
  Search,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useNotifications } from '../../context/NotificationContext';
import { getCollection, updateDoc, subscribeToData } from '../../services/firestoreData';
import { formatCurrency } from '../../utils/formatters';
import { findSurroundingSuppliers } from '../../utils/locationMatcher';
import ZomatoLocationPickerModal from '../../components/ZomatoLocationPickerModal';

const CustomerHome = ({ onOpenCart }) => {
  const { currentUser, updateCurrentUser } = useAuth();
  const { addToCart, cartItems, setDeliveryInfo } = useCart();
  const { showToast } = useNotifications();

  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [matchedPlant, setMatchedPlant] = useState(null);
  const [latestOrder, setLatestOrder] = useState(null);

  const loadProducts = () => {
    const all = getCollection('products') || [];
    setProducts(all.filter(p => p.isActive !== false));
  };

  const loadLatestOrder = () => {
    if (!currentUser) {
      setLatestOrder(null);
      return;
    }
    const all = getCollection('orders') || [];
    const myUid = String(currentUser.uid || currentUser.id || '').trim();
    const myEmail = (currentUser.email || '').toLowerCase().trim();
    const myOrders = all.filter(o => {
      if (!o) return false;
      const orderCustId = String(o.customerId || '').trim();
      const orderEmail = (o.customerEmail || '').toLowerCase().trim();
      return (myUid && orderCustId === myUid) || (myEmail && (orderEmail === myEmail || orderCustId === myEmail));
    });
    myOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setLatestOrder(myOrders[0] || null);
  };

  const resolveMatchedPlant = () => {
    const custAddr = currentUser?.address || '';
    const surrounding = findSurroundingSuppliers(custAddr, currentUser?.city);
    if (surrounding.length > 0) {
      setMatchedPlant(surrounding[0]);
    } else {
      const allSuppliers = (getCollection('suppliers') || []).filter(s => 
        s.status !== 'Deleted from Backend' && s.status !== 'Suspended' && !s.isSuspended
      );
      if (allSuppliers.length > 0) {
        setMatchedPlant(allSuppliers[0]);
      } else {
        const allUsers = (getCollection('users') || []).filter(u => u.role === 'supplier' && !u.isSuspended);
        setMatchedPlant(allUsers[0] || null);
      }
    }
  };

  useEffect(() => {
    loadProducts();
    resolveMatchedPlant();
    loadLatestOrder();
    const unsub = subscribeToData((coll) => {
      if (coll === 'products' || coll === 'all' || coll === 'suppliers' || coll === 'users' || coll === 'orders') {
        loadProducts();
        resolveMatchedPlant();
        loadLatestOrder();
      }
    });
    return () => unsub();
  }, [currentUser]);

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

  const handleSelectLocation = (location) => {
    const fullAddress = location.fullAddress || location.formattedAddress || `${location.locality}, ${location.city}`;
    if (!fullAddress) return;

    if (updateCurrentUser) {
      updateCurrentUser({ address: fullAddress });
    }
    if (setDeliveryInfo) {
      setDeliveryInfo(prev => ({ ...prev, address: fullAddress }));
    }
    if (currentUser?.uid) {
      try {
        updateDoc('users', 'uid', currentUser.uid, { address: fullAddress });
        updateDoc('customers', 'customerId', currentUser.uid, { address: fullAddress });
      } catch (e) {
        console.warn("Storage update error", e);
      }
    }
    setIsMapModalOpen(false);
    showToast(`Delivery location updated to: ${location.locality || fullAddress}! 📍`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Active Delivery Location Bar */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '14px 20px',
          border: '1.5px solid #bae6fd',
          boxShadow: '0 2px 10px rgba(2, 132, 199, 0.08)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
          <div 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MapPin size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#0369a1', letterSpacing: '0.5px' }}>
              📍 DELIVERING WATER TO YOUR LOCATION
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              {currentUser?.address || 'Flat 402, Sai Residency, Madhapur, Hyderabad'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMapModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            borderRadius: '10px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
            transition: 'all 0.15s ease'
          }}
        >
          🗺️ Change Location on Map
        </button>
      </div>

      {/* Live Order Delivery Status Banner */}
      {latestOrder && (
        <div 
          style={{
            backgroundColor: latestOrder.orderStatus === 'Delivered' ? '#f0fdf4' : '#f0f9ff',
            border: `1.5px solid ${latestOrder.orderStatus === 'Delivered' ? '#86efac' : '#bae6fd'}`,
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.6rem' }}>
              {latestOrder.orderStatus === 'Delivered' ? '✅' : '🚚'}
            </span>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Order #{latestOrder.orderId} • Status: <span style={{ color: latestOrder.orderStatus === 'Delivered' ? '#16a34a' : '#0284c7' }}>{latestOrder.orderStatus} {latestOrder.orderStatus === 'Delivered' ? '🎉' : ''}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                {latestOrder.orderStatus === 'Delivered' 
                  ? 'Water cans delivered to your door! Tap to view invoice & details.'
                  : `Your delivery is in progress. Status: ${latestOrder.orderStatus}.`}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('navigate-customer-tab', { detail: 'orders' }));
              }
            }}
            style={{
              backgroundColor: latestOrder.orderStatus === 'Delivered' ? '#16a34a' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            {latestOrder.orderStatus === 'Delivered' ? 'View Delivered Order →' : 'Track Order →'}
          </button>
        </div>
      )}

      {/* Linked Fulfilling Water Plant based on Customer Location */}
      {matchedPlant ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f0fdf4',
            borderRadius: '16px',
            padding: '14px 20px',
            border: '1.5px solid #86efac',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem'
              }}
            >
              🏭
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.5px' }}>
                  FULFILLING WATER SUPPLY PLANT
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 8px', borderRadius: '10px' }}>
                  {matchedPlant.isVerified ? '✓ Verified Certified Plant' : '🟢 Live Account'}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 8px', borderRadius: '10px' }}>
                  Within Delivery Range
                </span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {matchedPlant.businessName || matchedPlant.plantName || matchedPlant.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                📍 {matchedPlant.address || matchedPlant.city} • 📞 {matchedPlant.phone}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={18} color="#16a34a" /> Direct Doorstep Delivery Active
          </div>
        </div>
      ) : (currentUser?.address) ? (
        <div style={{
          backgroundColor: '#fef9c3',
          border: '1px solid #fde047',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '0.85rem',
          color: '#713f12',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '1.1rem' }}>📍</span>
          <span>No certified water plant found near your location. Update your delivery address in Profile or contact support.</span>
        </div>
      ) : null}

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
                {(() => {
                  const fallbackImg = (product.name || '').toLowerCase().includes('cool') || (product.name || '').toLowerCase().includes('chill')
                    ? '/images/cool_water_can.jpg'
                    : (product.name || '').toLowerCase().includes('packet') || (product.name || '').toLowerCase().includes('pouch')
                    ? '/images/water_pouches_pack.jpg'
                    : (product.name || '').toLowerCase().includes('bottle')
                    ? '/images/bottled_water_pack.jpg'
                    : '/images/bubble_top_can.jpg';

                  const resolvedSrc = (() => {
                    const raw = (product.image || '').trim();
                    if (raw.startsWith('assets/')) return raw.replace('assets', '');
                    if (raw.startsWith('/images/')) return raw;
                    if (raw.startsWith('data:') || raw.startsWith('http')) return raw;
                    return fallbackImg;
                  })();

                  return (
                    <img 
                      src={resolvedSrc} 
                      alt={product.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackImg;
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  );
                })()}
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

      {/* Interactive Delivery Location Map Modal */}
      <ZomatoLocationPickerModal 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={handleSelectLocation}
        currentAddress={currentUser?.address || 'NH40, Vaddagandla, Andhra Pradesh, 518112'}
        role="customer"
      />
    </div>
  );
};

export default CustomerHome;
