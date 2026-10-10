import React from 'react';
import { useAuth } from './context/AuthContext';
import WelcomePage from './pages/WelcomePage';
import SupplierLayout from './layouts/SupplierLayout';
import CustomerLayout from './layouts/CustomerLayout';
import Toast from './components/Toast';
import { Droplets } from 'lucide-react';

function App() {
  const { currentUser, userRole, loading } = useAuth();

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
          AquaConnect
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 600 }}>
          Starting Smart Water Delivery Management...
        </p>
      </div>
    );
  }

  // Not logged in -> Welcome & Login Screen (Section 2 & 23)
  if (!currentUser || !userRole) {
    return (
      <>
        <WelcomePage />
        <Toast />
      </>
    );
  }

  // Role-based Layout (Section 3, 23)
  return (
    <>
      {userRole === 'supplier' ? <SupplierLayout /> : <CustomerLayout />}
      <Toast />
    </>
  );
}

export default App;
