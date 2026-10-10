import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import SupplierDashboard from '../pages/supplier/SupplierDashboard';
import SupplierOrders from '../pages/supplier/SupplierOrders';
import SupplierProducts from '../pages/supplier/SupplierProducts';
import SupplierCustomers from '../pages/supplier/SupplierCustomers';
import SupplierDeliveries from '../pages/supplier/SupplierDeliveries';
import SupplierInventory from '../pages/supplier/SupplierInventory';
import SupplierReports from '../pages/supplier/SupplierReports';
import SupplierProfile from '../pages/supplier/SupplierProfile';

const SupplierLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SupplierDashboard onNavigateTab={setActiveTab} />;
      case 'orders':
        return <SupplierOrders />;
      case 'products':
        return <SupplierProducts />;
      case 'customers':
        return <SupplierCustomers />;
      case 'deliveries':
        return <SupplierDeliveries />;
      case 'inventory':
        return <SupplierInventory />;
      case 'reports':
        return <SupplierReports />;
      case 'profile':
        return <SupplierProfile />;
      default:
        return <SupplierDashboard onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
      <Navbar currentTab={activeTab} setCurrentTab={setActiveTab} />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        
        <main 
          className="page-container"
          style={{
            flex: 1,
            padding: '28px 32px',
            maxWidth: '1400px',
            width: '100%',
            margin: '0 auto',
            overflowX: 'hidden'
          }}
        >
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default SupplierLayout;
