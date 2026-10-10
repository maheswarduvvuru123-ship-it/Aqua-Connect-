import React from 'react';
import { Droplets, ShoppingBag, LogOut, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import NotificationCenter from './NotificationCenter';

const Navbar = ({ onOpenCart, currentTab, setCurrentTab }) => {
  const { currentUser, userRole, logout, isLiveFirebase } = useAuth();
  const { totalItems } = useCart();

  return (
    <header 
      style={{
        height: '70px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px'
      }}
    >
      {/* Brand logo & title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div 
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)'
          }}
        >
          <Droplets size={24} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              AquaConnect
            </span>
            <span 
              className={userRole === 'supplier' ? 'badge badge-confirmed' : 'badge badge-out-for-delivery'}
              style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}
            >
              {userRole === 'supplier' ? 'Supplier Portal' : 'Customer'}
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Smart Water Delivery Management
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Backend status tag */}
        <div 
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '20px',
            backgroundColor: isLiveFirebase ? '#ecfdf5' : '#f0f9ff',
            border: `1px solid ${isLiveFirebase ? '#a7f3d0' : '#bae6fd'}`,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isLiveFirebase ? '#065f46' : '#0369a1'
          }}
          className="desktop-only-badge"
        >
          <span 
            style={{
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              backgroundColor: isLiveFirebase ? '#10b981' : '#0284c7'
            }} 
          />
          {isLiveFirebase ? 'Firebase Live' : 'Active Realtime Sync'}
        </div>



        {/* Customer Cart button */}
        {userRole === 'customer' && (
          <button 
            onClick={onOpenCart}
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="View Cart"
          >
            <ShoppingBag size={20} />
            {totalItems > 0 && (
              <span 
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff'
                }}
              >
                {totalItems}
              </span>
            )}
          </button>
        )}

        {/* Notifications */}
        <NotificationCenter />

        {/* User Profile info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src={currentUser?.profileImage || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
            alt={currentUser?.name || "User"}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #e0f2fe'
            }}
          />
          <div className="hide-on-mobile" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {currentUser?.name || 'Aqua User'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {currentUser?.phone || currentUser?.email}
            </span>
          </div>

          <button 
            onClick={logout}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fee2e2',
              marginLeft: '4px'
            }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
