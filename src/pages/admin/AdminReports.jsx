import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Building2, 
  ShoppingBag, 
  CreditCard, 
  Award, 
  TrendingUp,
  Trash2 
} from 'lucide-react';
import { 
  getCollection, 
  subscribeToData,
  deleteDoc 
} from '../../services/firestoreData';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';

const AdminReports = () => {
  const { showToast } = useNotifications();
  const [timeRange, setTimeRange] = useState('all'); // 'today' | 'week' | 'month' | 'all'
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const loadData = () => {
    setOrders(getCollection('orders') || []);
    setPayments(getCollection('payments') || []);
    setSuppliers(getCollection('suppliers') || []);
    setSubscriptions(getCollection('supplier_subscriptions') || []);
  };

  const handleDeletePeriodRecords = () => {
    if (filteredOrders.length === 0) {
      showToast('No orders found in the selected period to delete.', 'info');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete all ${filteredOrders.length} order records for period "${timeRange.toUpperCase()}"? This will permanently remove them from both backend and frontend.`)) return;

    try {
      const orderIds = new Set(filteredOrders.map(o => o.orderId));
      orderIds.forEach(id => {
        deleteDoc('orders', 'orderId', id);
      });
      // Also delete linked payments
      payments.filter(p => orderIds.has(p.orderId)).forEach(p => {
        deleteDoc('payments', 'paymentId', p.paymentId);
      });
      showToast(`Successfully deleted ${filteredOrders.length} order records & linked payments from backend & frontend!`, 'success');
      loadData();
    } catch (err) {
      showToast('Failed to delete records: ' + err.message, 'error');
    }
  };

  const handleDeletePlantRecords = (supplierId, plantName) => {
    if (!window.confirm(`Are you sure you want to clear all order and payment records for plant "${plantName}"? This permanently deletes them from backend & frontend.`)) return;

    try {
      const plantOrders = orders.filter(o => o.supplierId === supplierId || o.supplierId === `sup_${supplierId}`);
      plantOrders.forEach(o => {
        deleteDoc('orders', 'orderId', o.orderId);
      });
      const orderIds = new Set(plantOrders.map(o => o.orderId));
      payments.filter(p => orderIds.has(p.orderId) || p.supplierId === supplierId).forEach(p => {
        deleteDoc('payments', 'paymentId', p.paymentId);
      });
      showToast(`Cleared ${plantOrders.length} records for ${plantName} in backend and frontend!`, 'info');
      loadData();
    } catch (err) {
      showToast('Failed to clear plant records: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(() => loadData());
    return () => unsub();
  }, []);

  // Filter orders by time range
  const now = new Date();
  const filteredOrders = orders.filter(o => {
    if (timeRange === 'all') return true;
    const d = new Date(o.createdAt);
    if (timeRange === 'today') {
      return d.toDateString() === now.toDateString();
    }
    if (timeRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= oneWeekAgo;
    }
    if (timeRange === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const totalWaterValue = filteredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const totalCansSold = filteredOrders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((isum, item) => isum + (Number(item.quantity) || 1), 0);
  }, 0);

  const verifiedCollections = payments
    .filter(p => p.status === 'Verified')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const reportedCollections = payments
    .filter(p => p.status === 'Reported' || p.status === 'Verified')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const subscriptionRevenue = subscriptions
    .filter(s => s.status === 'Active' || s.status === 'Grace Period')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Supplier-wise breakdown
  const supplierBreakdown = suppliers.map(sup => {
    const sOrders = filteredOrders.filter(o => o.supplierId === sup.supplierId);
    const sPayments = payments.filter(p => p.supplierId === sup.supplierId);
    const sWaterValue = sOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const sVerifiedPay = sPayments.filter(p => p.status === 'Verified').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return {
      supplierId: sup.supplierId,
      name: sup.businessName || sup.plantName || sup.ownerName,
      city: sup.city,
      ordersCount: sOrders.length,
      waterValue: sWaterValue,
      verifiedPayments: sVerifiedPay
    };
  });

  // Export CSV per PRD Section 5 & 10
  const handleExportCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer Name', 'Customer Phone', 'Supplier Plant', 'Total Amount', 'Order Status', 'Payment Method', 'Payment Status'];
    const rows = filteredOrders.map(o => [
      o.orderId,
      formatDate(o.createdAt),
      `"${o.customerName || ''}"`,
      o.customerPhone || '',
      `"${o.plantName || o.supplierName || ''}"`,
      o.totalAmount,
      o.orderStatus,
      o.paymentMethod || 'Cash',
      o.paymentStatus
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Aqua_connect_Orders_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Reports & Financial Analytics
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Consolidated reporting separating supplier water revenues from Aqua connect platform subscription revenue.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            <Download size={16} /> Export Orders CSV
          </button>
          <button 
            onClick={handleDeletePeriodRecords}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#dc2626', borderColor: '#fca5a5' }}
            title="Delete all order and payment records for current period filter"
          >
            <Trash2 size={16} /> Clear Period Order Records
          </button>
        </div>
      </div>

      {/* Time Range Filter Bar */}
      <div className="card" style={{ padding: '12px 18px', borderRadius: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '6px' }}>
          Period:
        </span>
        {[
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'Past 7 Days' },
          { id: 'month', label: 'This Month' },
          { id: 'all', label: 'All Time' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTimeRange(item.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: timeRange === item.id ? 700 : 500,
              backgroundColor: timeRange === item.id ? '#4338ca' : 'transparent',
              color: timeRange === item.id ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Supplier Water Order Value</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>{formatCurrency(totalWaterValue)}</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Belongs to Water Suppliers</div>
        </div>

        <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verified Collections</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', margin: '8px 0' }}>{formatCurrency(verifiedCollections)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reported: {formatCurrency(reportedCollections)}</div>
        </div>

        <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Units / Jars Delivered</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0369a1', margin: '8px 0' }}>{totalCansSold} Cans</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across 20L cans, chilled & bottles</div>
        </div>

        <div className="card" style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#faf5ff', borderColor: '#d8b4fe' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b21a8', fontWeight: 700 }}>Aqua connect Subscription Revenue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6b21a8', margin: '8px 0' }}>{formatCurrency(subscriptionRevenue)}</div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>Platform Subscription Revenue</div>
        </div>
      </div>

      {/* Supplier-wise Breakdown */}
      <div className="card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
            Supplier Plant Financial & Volume Performance
          </h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
              <tr>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Supplier Plant</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Region / City</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Orders Volume</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Gross Water Sales</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Verified Collections</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {supplierBreakdown.map(sup => (
                <tr key={sup.supplierId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700 }}>{sup.name}</td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>{sup.city || 'Hyderabad'}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 800 }}>{sup.ordersCount} orders</td>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(sup.waterValue)}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#16a34a' }}>{formatCurrency(sup.verifiedPayments)}</td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDeletePlantRecords(sup.supplierId, sup.name)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Clear all orders and direct payments for this plant from database"
                    >
                      <Trash2 size={13} /> Clear Records
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
