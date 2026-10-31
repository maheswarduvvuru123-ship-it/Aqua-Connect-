import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import AdminSidebar from '../components/AdminSidebar';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminPayments from '../pages/admin/AdminPayments';
import AdminAccounts from '../pages/admin/AdminAccounts';
import AdminSubscriptions from '../pages/admin/AdminSubscriptions';
import AdminReports from '../pages/admin/AdminReports';
import AdminAuditLogs from '../pages/admin/AdminAuditLogs';

const AdminLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard onNavigateTab={setActiveTab} />;
      case 'orders':
        return <AdminOrders />;
      case 'payments':
        return <AdminPayments />;
      case 'accounts':
        return <AdminAccounts />;
      case 'subscriptions':
        return <AdminSubscriptions />;
      case 'reports':
        return <AdminReports />;
      case 'audit_logs':
        return <AdminAuditLogs />;
      case 'profile':
        return <AdminAccounts />;
      default:
        return <AdminDashboard onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
      <Navbar currentTab={activeTab} setCurrentTab={setActiveTab} />

      <div style={{ display: 'flex', flex: 1 }}>
        <AdminSidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        
        <main 
          className="page-container"
          style={{
            flex: 1,
            padding: '28px 32px',
            maxWidth: '1440px',
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

export default AdminLayout;
