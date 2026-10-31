import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import WelcomePage from './pages/WelcomePage';
import AppDownloadPage from './pages/AppDownloadPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import SupplierLayout from './layouts/SupplierLayout';
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';
import Toast from './components/Toast';
import OrderAlertPopup from './components/OrderAlertPopup';
import { Droplets, ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';

function checkIsAdminPath() {
  const p = window.location.pathname.toLowerCase();
  const h = window.location.hash.toLowerCase();
  return p.startsWith('/admin') || h.startsWith('#admin') || h.startsWith('#/admin');
}

function checkIsDownloadPath() {
  const p = window.location.pathname.toLowerCase();
  const h = window.location.hash.toLowerCase();
  return p === '/download' || h === '#download' || h === '#/download';
}

function App() {
  const { currentUser, userRole, loading, logout } = useAuth();
  const [isAdminRoute, setIsAdminRoute] = useState(checkIsAdminPath);
  const [isDownloadRoute, setIsDownloadRoute] = useState(checkIsDownloadPath);

  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(checkIsAdminPath());
      setIsDownloadRoute(checkIsDownloadPath());
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigateToHome = () => {
    window.location.hash = '';
    if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/download')) {
      window.history.pushState({}, '', '/');
    }
    setIsAdminRoute(false);
    setIsDownloadRoute(false);
  };

  if (isDownloadRoute) {
    return (
      <>
        <AppDownloadPage onBackToApp={navigateToHome} />
        <Toast />
        <OrderAlertPopup />
      </>
    );
  }

  if (loading) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f9ff'
        }}
      >
        <div 
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(2, 132, 199, 0.3)',
            animation: 'pulseGlow 2s infinite'
          }}
        >
          <Droplets size={34} />
        </div>
        <h3 style={{ marginTop: '16px', fontWeight: 800, color: '#0f172a' }}>
          Aqua connect
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 600 }}>
          Starting Smart Water Delivery Management...
        </p>
      </div>
    );
  }

  // ==========================================
  // DEDICATED ADMIN ROUTE (/admin or #admin)
  // ==========================================
  if (isAdminRoute) {
    // If not logged in -> Dedicated Admin Login Portal
    if (!currentUser || !userRole) {
      return (
        <>
          <AdminLoginPage onBackToApp={navigateToHome} />
          <Toast />
        </>
      );
    }

    // If logged in as admin or super_admin -> Enterprise Admin Dashboard
    if (userRole === 'admin' || userRole === 'super_admin') {
      return (
        <>
          <AdminLayout />
          <Toast />
        </>
      );
    }

    // If logged in as Customer or Supplier but visiting Admin Website -> Access Guard
    return (
      <div 
        style={{
          minHeight: '100vh',
          backgroundColor: '#090d16',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <div 
          style={{
            maxWidth: '440px',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '20px',
            padding: '36px 28px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}
        >
          <div 
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}
          >
            <ShieldAlert size={30} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0' }}>
            Administrator Access Only
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '24px' }}>
            You are currently signed in as a <strong style={{ color: '#38bdf8' }}>{userRole.toUpperCase()}</strong> ({currentUser.email}). The Admin Website requires elevated platform privileges.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={navigateToHome}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeft size={16} /> Return to {userRole === 'supplier' ? 'Supplier' : 'Customer'} App
            </button>
            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <LogOut size={16} /> Sign Out & Switch to Admin
            </button>
          </div>
        </div>
        <Toast />
      </div>
    );
  }

  // ==========================================
  // PUBLIC / CUSTOMER / SUPPLIER APP (/)
  // ==========================================
  // Not logged in -> Customer & Supplier Welcome & Login Screen (Section 2 & 23)
  if (!currentUser || !userRole) {
    return (
      <>
        <WelcomePage />
        <Toast />
      </>
    );
  }

  // If the account has been temporarily stopped/paused by Admin
  if (currentUser && (currentUser.accountStatus === 'Suspended' || currentUser.status === 'Suspended' || currentUser.isSuspended)) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          backgroundColor: '#090d16',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <div 
          style={{
            maxWidth: '460px',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '24px',
            padding: '36px 30px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}
        >
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              fontSize: '28px'
            }}
          >
            ⏸️
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '0 0 10px 0' }}>
            Account Temporarily Stopped
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
            Your {userRole === 'supplier' ? 'water supplier / plant' : 'customer'} account has been temporarily stopped by the administrator. Operations and order placement are temporarily paused.
          </p>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '14px', marginBottom: '24px', border: '1px solid #334155', textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
              Admin Contact for Reactivation:
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
              📞 Call/WhatsApp: 8522828688
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
              Once the administrator resumes your account, you can continue using the application as usual with all your data, orders, and products preserved.
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
        <Toast />
      </div>
    );
  }

  // Role-based Layout (Admin, Supplier, Customer)
  return (
    <>
      {(userRole === 'admin' || userRole === 'super_admin') ? (
        <>
          {!isAdminRoute && (
            <div 
              style={{
                backgroundColor: '#1e1b4b',
                color: '#e0e7ff',
                padding: '10px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid #3730a3',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>🛡️</span>
                <span>
                  <strong>Administrator Session Active</strong> (Helpline: <strong style={{ color: '#38bdf8' }}>+91 85228 28688</strong>)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#c7d2fe', fontSize: '0.82rem' }}>Want to sign in as a Customer or Water Supplier?</span>
                <button
                  onClick={logout}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Switch to Customer / Supplier Login →
                </button>
              </div>
            </div>
          )}
          <AdminLayout />
        </>
      ) : userRole === 'supplier' ? (
        <SupplierLayout />
      ) : (
        <CustomerLayout />
      )}
      <Toast />
      <OrderAlertPopup />
    </>
  );
}

export default App;
