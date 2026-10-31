import React, { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, ArrowRight, X, Sparkles, Bell } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const OrderAlertPopup = () => {
  const { activeOrderPopup, dismissOrderPopup, markAsRead } = useNotifications();
  const { userRole } = useAuth();

  useEffect(() => {
    if (!activeOrderPopup) return;
    // Auto-dismiss after 12 seconds
    const timer = setTimeout(() => {
      dismissOrderPopup();
    }, 12000);
    return () => clearTimeout(timer);
  }, [activeOrderPopup, dismissOrderPopup]);

  if (!activeOrderPopup) return null;

  const handleViewOrder = () => {
    if (activeOrderPopup.notificationId) {
      markAsRead(activeOrderPopup.notificationId);
    }
    dismissOrderPopup();
    // Dispatch navigation event to switch to orders tab
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('navigate-customer-tab', { detail: 'orders' }));
      window.dispatchEvent(new CustomEvent('navigate-supplier-tab', { detail: 'orders' }));
      window.dispatchEvent(new CustomEvent('navigate-admin-tab', { detail: 'orders' }));
    }
  };

  return (
    <div 
      className="animate-slide-down"
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 10000,
        maxWidth: '420px',
        width: 'calc(100vw - 48px)',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px -10px rgba(2, 132, 199, 0.35), 0 0 0 2px #0284c7',
        border: '1px solid #bae6fd',
        overflow: 'hidden',
        pointerEvents: 'auto'
      }}
    >
      {/* Top Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          padding: '12px 16px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulseGlow 2s infinite'
            }}
          >
            <Bell size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, letterSpacing: '-0.2px' }}>
              New Order Received! 💧
            </div>
            <div style={{ fontSize: '0.68rem', opacity: 0.9 }}>
              {activeOrderPopup.orderId ? `Order #${activeOrderPopup.orderId}` : 'Incoming Water Delivery'}
            </div>
          </div>
        </div>
        <button
          onClick={dismissOrderPopup}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            borderRadius: '6px'
          }}
          title="Dismiss alert"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body Details */}
      <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>
          {activeOrderPopup.message}
        </p>

        {activeOrderPopup.amount && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Order Value:</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
              {formatCurrency(activeOrderPopup.amount)}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button
            onClick={handleViewOrder}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <ShoppingBag size={15} /> View Order Details <ArrowRight size={14} />
          </button>
          <button
            onClick={dismissOrderPopup}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderAlertPopup;

