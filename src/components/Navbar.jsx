import React from 'react';
import { Droplets, ShoppingBag, LogOut, ShieldCheck, UserCheck, RefreshCw, Smartphone } from 'lucide-react';
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
              Aqua connect
            </span>
            <span 
              className={
                userRole === 'super_admin' || userRole === 'admin'
                  ? 'badge'
                  : userRole === 'supplier'
                  ? 'badge badge-confirmed'
                  : 'badge badge-out-for-delivery'
              }
              style={{ 
                fontSize: '0.7rem', 
                textTransform: 'uppercase',
                backgroundColor: (userRole === 'super_admin' || userRole === 'admin') ? '#ede9fe' : undefined,
                color: (userRole === 'super_admin' || userRole === 'admin') ? '#6b21a8' : undefined,
                border: (userRole === 'super_admin' || userRole === 'admin') ? '1px solid #d8b4fe' : undefined
              }}
            >
              {userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Admin Portal' : userRole === 'supplier' ? 'Supplier Portal' : 'Customer'}
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Smart Water Delivery Management
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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

        {/* Get App / QR Download Button */}
        <button
          onClick={() => { window.location.hash = '#download'; }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '10px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            color: '#0284c7',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Download Mobile App / Scan QR"
        >
          <Smartphone size={16} />
          <span className="hide-on-mobile">Get App</span>
        </button>

        {/* Notifications */}
        <NotificationCenter />

        {/* Clickable User Profile info */}
        <div 
          onClick={() => setCurrentTab && setCurrentTab('profile')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '12px',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          title="Open Profile & Account Settings"
        >
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
              {(userRole === 'admin' || userRole === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.email?.endsWith('@aquaconnect.com') || (currentUser?.name && currentUser.name.toLowerCase().includes('admin')))
                ? '+91 85228 28688'
                : ((currentUser?.phone && !currentUser.phone.includes('00001')) ? currentUser.phone : (currentUser?.email || '+91 85228 28688'))}
            </span>
          </div>
        </div>

        {/* Dedicated Switch Portal button for Admins */}
        {(userRole === 'admin' || userRole === 'super_admin') && (
          <button 
            onClick={logout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#0284c7',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Sign out of Admin and open Customer & Supplier Login"
          >
            <RefreshCw size={14} />
            <span className="hide-on-mobile">Customer/Supplier Portal</span>
          </button>
        )}

        {/* Clear Sign Out button */}
        <button 
          onClick={logout}
          style={{
            height: '36px',
            padding: '0 12px',
            borderRadius: '8px',
            color: 'var(--danger)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
          title="Sign Out of Account"
        >
          <LogOut size={15} />
          <span className="hide-on-mobile">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
