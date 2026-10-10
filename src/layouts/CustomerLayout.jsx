import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import CustomerNav from '../components/CustomerNav';
import CustomerHome from '../pages/customer/CustomerHome';
import CustomerOrders from '../pages/customer/CustomerOrders';
import CustomerReports from '../pages/customer/CustomerReports';
import CustomerProfile from '../pages/customer/CustomerProfile';
import CartDrawer from '../components/CartDrawer';

const CustomerLayout = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <CustomerHome onOpenCart={() => setIsCartOpen(true)} />;
      case 'orders':
        return <CustomerOrders onBrowseMore={() => setActiveTab('home')} />;
      case 'reports':
        return <CustomerReports />;
      case 'profile':
        return <CustomerProfile />;
      default:
        return <CustomerHome onOpenCart={() => setIsCartOpen(true)} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
      {/* Top Navbar */}
      <Navbar 
        onOpenCart={() => setIsCartOpen(true)} 
        currentTab={activeTab} 
        setCurrentTab={setActiveTab} 
      />

      {/* Customer Tabs / Mobile Bottom Bar */}
      <CustomerNav 
        activeTab={activeTab} 
        onSelectTab={setActiveTab} 
        onOpenCart={() => setIsCartOpen(true)} 
      />

      {/* Main Page Area */}
      <main 
        className="page-container"
        style={{
          flex: 1,
          padding: '24px 20px',
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          overflowX: 'hidden'
        }}
      >
        {renderContent()}
      </main>

      {/* Sliding Cart & Checkout Drawer */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onViewOrders={() => {
          setIsCartOpen(false);
          setActiveTab('orders');
        }}
      />
    </div>
  );
};

export default CustomerLayout;
