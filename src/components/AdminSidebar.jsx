import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  CreditCard, 
  Users, 
  Award, 
  BarChart3, 
  ShieldCheck,
  Bell,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { getCollection, subscribeToData, getPendingSupplierApprovals } from '../services/firestoreData';
import { useAuth } from '../context/AuthContext';

const ADMIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders Center', icon: ShoppingBag },
  { id: 'payments', label: 'Direct Payments', icon: CreditCard },
  { id: 'accounts', label: 'Suppliers & Users', icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: Award, badgeKey: 'pendingSubs' },
  { id: 'reports', label: 'Reports & CSV', icon: BarChart3 },
  { id: 'audit_logs', label: 'Audit Trail', icon: ShieldCheck }
];

const AdminSidebar = ({ activeTab, onSelectTab }) => {
  const { logout } = useAuth();
  const [pendingSubsCount, setPendingSubsCount] = useState(0);

  useEffect(() => {
    const computePending = () => {
      const pending = getPendingSupplierApprovals();
      setPendingSubsCount(pending.length);
    };
    computePending();
    const unsub = subscribeToData(() => computePending());
    return () => unsub();
  }, []);

  const getBadgeCount = (item) => {
    if (item.badgeKey === 'pendingSubs') return pendingSubsCount;
    return 0;
  };

  return (
    <aside 
      style={{
        width: '250px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--border-light)',
        minHeight: 'calc(100vh - 70px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        flexShrink: 0
      }}
      className="admin-sidebar"
    >
      <div style={{ marginBottom: '14px', padding: '0 12px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          ENTERPRISE PLATFORM
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          const badgeCount = getBadgeCount(item);

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#6b21a8' : 'var(--text-secondary)',
                backgroundColor: isActive ? '#faf5ff' : (badgeCount > 0 && item.id === 'subscriptions' ? '#fffbeb' : 'transparent'),
                border: isActive ? '1px solid #d8b4fe' : (badgeCount > 0 && item.id === 'subscriptions' ? '1px solid #fde68a' : '1px solid transparent'),
                textAlign: 'left',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = badgeCount > 0 && item.id === 'subscriptions' ? '#fffbeb' : 'transparent';
              }}
            >
              <Icon size={19} color={isActive ? '#7c3aed' : (badgeCount > 0 && item.id === 'subscriptions' ? '#d97706' : '#64748b')} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {badgeCount > 0 && (
                <span style={{
                  minWidth: '20px',
                  height: '20px',
                  borderRadius: '10px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pending Approvals Quick Alert */}
      {pendingSubsCount > 0 && (
        <div
          onClick={() => onSelectTab('subscriptions')}
          style={{
            margin: '12px 0',
            padding: '12px 14px',
            backgroundColor: '#fef2f2',
            borderRadius: '12px',
            border: '1.5px solid #fca5a5',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Bell size={15} color="#dc2626" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b91c1c' }}>
              {pendingSubsCount} Pending Approval{pendingSubsCount > 1 ? 's' : ''}
            </span>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#991b1b', margin: 0, lineHeight: 1.4 }}>
            Supplier{pendingSubsCount > 1 ? 's' : ''} paid & waiting for your verification. Tap to approve →
          </p>
        </div>
      )}

      {/* Admin security status info */}
      <div 
        style={{
          padding: '14px',
          backgroundColor: '#faf5ff',
          borderRadius: '12px',
          border: '1px solid #e9d5ff',
          marginBottom: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b21a8' }}>Platform Oversight</span>
        </div>
        <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
          Direct UPI & Cash reconciliation active
        </p>
      </div>

      {/* Quick Portal Switcher & Logout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            color: '#0284c7',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease'
          }}
          title="Sign out of Admin and switch to Customer/Supplier Login"
        >
          <RefreshCw size={15} />
          <span>Customer & Supplier App</span>
        </button>

        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease'
          }}
          title="Sign Out of Admin"
        >
          <LogOut size={15} />
          <span>Sign Out of Admin</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
