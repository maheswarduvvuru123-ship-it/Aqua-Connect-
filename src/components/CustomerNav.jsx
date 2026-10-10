import React from 'react';
import { Home, Package, BarChart2, User, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

const CustomerNav = ({ activeTab, onSelectTab, onOpenCart }) => {
  const { totalItems } = useCart();

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <>
      {/* Desktop sub-navigation bar */}
      <div 
        className="customer-desktop-nav"
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-light)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', gap: '4px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 18px',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#0284c7' : 'var(--text-secondary)',
                  borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                  backgroundColor: 'transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} color={isActive ? '#0284c7' : '#64748b'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile bottom navigation bar */}
      <div 
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '62px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid var(--border-light)',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 90,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.72rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0284c7' : 'var(--text-secondary)',
                padding: '6px 12px'
              }}
            >
              <Icon size={20} color={isActive ? '#0284c7' : '#64748b'} />
              {tab.label}
            </button>
          );
        })}

        {/* Cart tab in bottom nav */}
        <button
          onClick={onOpenCart}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.72rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            padding: '6px 12px',
            position: 'relative'
          }}
        >
          <ShoppingBag size={20} color="#64748b" />
          <span>Cart</span>
          {totalItems > 0 && (
            <span 
              style={{
                position: 'absolute',
                top: '2px',
                right: '10px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 800,
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export default CustomerNav;
