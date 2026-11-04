import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Truck, 
  XCircle, 
  CreditCard, 
  ShieldCheck, 
  Award, 
  ArrowUpRight, 
  Eye, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Bell,
  UserCheck,
  Check,
  Trash2,
  LogOut 
} from 'lucide-react';
import { 
  getCollection, 
  subscribeToData, 
  deleteDoc,
  getSupplierSubscription,
  verifySupplierSubscription,
  acceptAndVerifySupplier,
  getPendingSupplierApprovals,
  getPendingCustomerApprovals,
  getAllPendingApprovals,
  verifyCustomerAccount,
  rejectPendingAccount,
  purgeAllDummyData
} from '../../services/firestoreData';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

const AdminDashboard = ({ onNavigateTab }) => {
  const { currentUser, logout } = useAuth();
  const { showToast } = useNotifications();
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [pendingSupplierSubs, setPendingSupplierSubs] = useState([]);
  const [allPendingApprovals, setAllPendingApprovals] = useState([]);

  const loadData = () => {
    setOrders(getCollection('orders') || []);
    setPayments(getCollection('payments') || []);
    setSuppliers(getCollection('suppliers') || []);
    setUsers(getCollection('users') || []);
    const supSubs = getCollection('supplier_subscriptions') || [];
    const custSubs = getCollection('customer_subscriptions') || [];
    setSubscriptions([...supSubs, ...custSubs]);
    setPendingSupplierSubs(getPendingSupplierApprovals());
    setAllPendingApprovals(getAllPendingApprovals());
  };

  const handleDeleteOrder = (orderId) => {
    if (!window.confirm(`Are you sure you want to permanently delete Order #${orderId}? This removes it from both backend and frontend.`)) return;
    try {
      deleteDoc('orders', 'orderId', orderId);
      showToast(`Order #${orderId} permanently deleted from backend and frontend`, 'info');
      loadData();
    } catch (err) {
      showToast('Failed to delete order: ' + err.message, 'error');
    }
  };

  const handleDeletePayment = (paymentId) => {
    if (!window.confirm(`Are you sure you want to permanently delete Payment #${paymentId}? This removes it from both backend and frontend.`)) return;
    try {
      deleteDoc('payments', 'paymentId', paymentId);
      showToast(`Payment #${paymentId} permanently deleted from backend and frontend`, 'info');
      loadData();
    } catch (err) {
      showToast('Failed to delete payment: ' + err.message, 'error');
    }
  };

  const handleWipeDummyData = () => {
    if (window.confirm("Are you sure you want to completely wipe all mock dummy seed data (orders, payments, deliveries, demo users, inventory)? Only genuine live user accounts and real orders will remain.")) {
      try {
        purgeAllDummyData(currentUser);
        showToast("🧹 All demo dummy seed data wiped clean permanently!", "success");
        loadData();
      } catch (err) {
        showToast(`Failed to clean dummy data: ${err.message}`, "error");
      }
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  // Financial Calculations per PRD Section 10:
  // 1. Water Order Value (belongs to suppliers)
  // 2. Reported Collections vs Verified Collections
  // 3. Aqua Connect Subscription Revenue (Platform's own revenue)
  const totalWaterOrderValue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  
  const reportedCollections = payments
    .filter(p => p.status === 'Reported' || p.status === 'Verified')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const verifiedCollections = payments
    .filter(p => p.status === 'Verified')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingVerificationAmount = payments
    .filter(p => p.status === 'Reported')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const subscriptionRevenue = subscriptions
    .filter(s => s.status === 'Active' || s.status === 'Grace Period')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const completedDeliveries = orders.filter(o => o.orderStatus === 'Delivered').length;
  const activeOrders = orders.filter(o => ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(o.orderStatus)).length;
  const cancelledOrders = orders.filter(o => o.orderStatus === 'Cancelled').length;

  const totalUnpaidBalance = orders.reduce((sum, o) => {
    const verified = (payments || [])
      .filter(p => String(p.orderId) === String(o.orderId) && p.status === 'Verified')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return sum + Math.max(0, (Number(o.totalAmount) || 0) - verified);
  }, 0);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
    .slice(0, 5);

  const suspendedAccountsCount = users.filter(u => u.accountStatus === 'Suspended' || u.status === 'Suspended' || u.isSuspended).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', backgroundColor: 'rgba(255, 255, 255, 0.15)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '12px' }}>
            <ShieldCheck size={16} color="#c7d2fe" />
            <span>Enterprise Admin Portal • Centralized Oversight</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Aqua connect Platform Dashboard
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#c7d2fe', marginTop: '6px', maxWidth: '650px', lineHeight: 1.5 }}>
            Real-time live monitoring of customer water orders, direct supplier payments (Cash & UPI), and subscription licensing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={logout}
            className="btn"
            style={{ 
              backgroundColor: '#0284c7', 
              color: '#ffffff', 
              fontWeight: 700, 
              padding: '10px 18px', 
              border: '1px solid #38bdf8',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            title="Log out of Admin and open Customer & Supplier Login"
          >
            <LogOut size={16} /> Switch to Customer/Supplier Login
          </button>
          <button 
            onClick={handleWipeDummyData}
            className="btn"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.2)', 
              color: '#fecaca', 
              fontWeight: 700, 
              padding: '10px 18px', 
              border: '1px solid rgba(239, 68, 68, 0.4)' 
            }}
            title="Clean all dummy/mock seed records and reset to live real data"
          >
            🧹 Wipe All Dummy Data
          </button>
          <button 
            onClick={() => onNavigateTab('orders')}
            className="btn btn-secondary"
            style={{ backgroundColor: '#ffffff', color: '#312e81', fontWeight: 700, padding: '10px 18px' }}
          >
            Manage Orders
          </button>
          <button 
            onClick={() => onNavigateTab('payments')}
            className="btn"
            style={{ backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 700, padding: '10px 18px', border: '1px solid #6366f1' }}
          >
            Reconcile Payments
          </button>
        </div>
      </div>

      {/* ⚡ Pending Account Approvals Alert (Suppliers & Customers) */}
      {allPendingApprovals.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
            borderRadius: '16px',
            padding: '20px 28px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 8px 20px -4px rgba(185, 28, 28, 0.45)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bell size={26} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  letterSpacing: '-0.3px'
                }}>
                  🔔 {allPendingApprovals.length} Account{allPendingApprovals.length > 1 ? 's' : ''} Waiting for Your Approval
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  backgroundColor: '#ffffff',
                  color: '#b91c1c',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  ACTION REQUIRED
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#fecaca', margin: 0, lineHeight: 1.5 }}>
                {allPendingApprovals.filter(a => a.role === 'supplier').length} Supplier(s), {allPendingApprovals.filter(a => a.role === 'customer').length} Customer(s) registered. Accept & verify to unlock their accounts.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexShrink: 0, alignItems: 'center' }}>
            {/* Show each pending account as a quick-action row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
              {allPendingApprovals.slice(0, 4).map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.78rem'
                }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '6px',
                    backgroundColor: item.role === 'supplier' ? '#7c3aed' : '#0284c7',
                    color: '#ffffff'
                  }}>
                    {item.role === 'supplier' ? '🏭 Supplier' : '👤 Customer'}
                  </span>
                  <span style={{ color: '#fee2e2', fontWeight: 700 }}>
                    {item.name || 'Account'}
                  </span>
                  <span style={{ color: '#fca5a5' }}>
                    {item.phone || item.details}
                  </span>
                  {item.paymentReference && item.paymentReference !== 'Free Consumer Verification' && (
                    <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', color: '#fef2f2' }}>
                      UTR: {item.paymentReference}
                    </code>
                  )}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        if (item.role === 'supplier') {
                          await acceptAndVerifySupplier(item, currentUser);
                        } else {
                          await verifyCustomerAccount(item.id, currentUser);
                        }
                        showToast(`🎉 Verified & Activated ${item.name}!`, 'success');
                        loadData();
                      } catch (err) {
                        showToast(err.message, 'error');
                      }
                    }}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      marginLeft: '6px'
                    }}
                    title="1-Click Approve this account"
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Decline and reject registration for ${item.name}?`)) {
                        rejectPendingAccount(item.id, item.role, currentUser);
                        showToast(`Declined registration for ${item.name}.`, 'info');
                        loadData();
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      color: '#fee2e2',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Reject registration"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {allPendingApprovals.length > 4 && (
                <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600 }}>
                  +{allPendingApprovals.length - 4} more pending...
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigateTab('accounts')}
              style={{
                padding: '12px 22px',
                backgroundColor: '#ffffff',
                color: '#b91c1c',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              <UserCheck size={18} /> Approve Now
            </button>
          </div>
        </div>
      )}

      {/* ⏸️ Temporarily Stopped Accounts Notice */}
      {suspendedAccountsCount > 0 && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              ⏸️
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#92400e' }}>
                {suspendedAccountsCount} Account{suspendedAccountsCount > 1 ? 's' : ''} Temporarily Stopped
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b45309' }}>
                You have temporarily paused access for these accounts. You can resume them at any time from the Accounts tab to let them continue as usual.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('accounts')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#92400e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Manage in Accounts →
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        {/* Total Orders */}
        <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Orders</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{orders.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
            {activeOrders} active in dispatch
          </div>
        </div>

        {/* Completed Deliveries */}
        <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Fulfilled Deliveries</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <Truck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{completedDeliveries}</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
            {orders.length > 0 ? `${Math.round((completedDeliveries / orders.length) * 100)}% completion rate` : '0%'}
          </div>
        </div>

        {/* Verified Collections */}
        <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Verified Collections</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{formatCurrency(verifiedCollections)}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Reported: {formatCurrency(reportedCollections)}
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Unpaid / Outstanding</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706' }}>{formatCurrency(totalUnpaidBalance)}</div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
            Awaiting verification or direct pay
          </div>
        </div>

        {/* Subscription Revenue (PRD Section 10 Requirement) */}
        <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#faf5ff', borderColor: '#d8b4fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8' }}>Platform Subscriptions</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6b21a8' }}>{formatCurrency(subscriptionRevenue)}</div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>
            Aqua connect Platform Subscription Revenue
          </div>
        </div>
      </div>

      {/* Main Split: Live Orders & Recent Payments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        {/* Recent Live Orders */}
        <div className="card" style={{ padding: '24px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Live Orders Feed
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Instant real-time stream of customer orders across all supplier plants.
              </p>
            </div>
            <button 
              onClick={() => onNavigateTab('orders')}
              style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No orders registered yet. Customer orders will appear here live.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentOrders.map(order => (
                <div 
                  key={order.orderId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#ffffff',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '10px', backgroundColor: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontWeight: 800, fontSize: '0.85rem' }}>
                      AC
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          #{order.orderId}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          • {order.customerName}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Plant: <strong style={{ color: '#0369a1' }}>{order.plantName || order.supplierName || 'Plant'}</strong> • {formatDateTime(order.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {formatCurrency(order.totalAmount)}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <StatusBadge status={order.orderStatus} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOrder(order.orderId);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '6px 8px', borderRadius: '8px' }}
                      title="Delete this order record permanently from backend & frontend"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Direct Payment Reconciliation Stream */}
        <div className="card" style={{ padding: '24px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Direct Payments & UPI Ledger
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Cash on delivery & direct UPI payments logged by suppliers.
              </p>
            </div>
            <button 
              onClick={() => onNavigateTab('payments')}
              style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              All Payments <ArrowUpRight size={14} />
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No payments logged yet. Direct payments recorded by suppliers will appear here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentPayments.map(p => (
                <div 
                  key={p.paymentId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    backgroundColor: p.status === 'Verified' ? '#f0fdf4' : p.status === 'Disputed' ? '#fef2f2' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '10px', 
                        backgroundColor: p.method === 'UPI' ? '#ede9fe' : '#fef3c7', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: p.method === 'UPI' ? '#7c3aed' : '#b45309' 
                      }}
                    >
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          {formatCurrency(p.amount)}
                        </span>
                        <span 
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            backgroundColor: p.method === 'UPI' ? '#ede9fe' : '#fef3c7',
                            color: p.method === 'UPI' ? '#7c3aed' : '#b45309'
                          }}
                        >
                          {p.method}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Order #{p.orderId} • Ref: {p.reference || 'None'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        {formatCurrency(p.amount)}
                      </div>
                      <span 
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          backgroundColor: p.status === 'Verified' ? '#dcfce7' : p.status === 'Disputed' ? '#fee2e2' : '#fef3c7',
                          color: p.status === 'Verified' ? '#15803d' : p.status === 'Disputed' ? '#b91c1c' : '#b45309',
                          marginTop: '2px'
                        }}
                      >
                        {p.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePayment(p.paymentId);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '6px 8px', borderRadius: '8px' }}
                      title="Delete this payment record permanently from backend & frontend"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
