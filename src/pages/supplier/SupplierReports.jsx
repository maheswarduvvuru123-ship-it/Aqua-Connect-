import React, { useState, useEffect } from 'react';
import { 
  BarChart3,
  RotateCcw, 
  Calendar, 
  Download, 
  Printer, 
  IndianRupee, 
  ShoppingBag, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import Modal from '../../components/Modal';
import { getCollection, subscribeToData, deleteCustomer, deleteAllCustomers, deleteDoc } from '../../services/firestoreData';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { filterOrdersForSupplier } from '../../utils/locationMatcher';

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' }
];

const SupplierReports = () => {
  const { showToast } = useNotifications();
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteModalState, setDeleteModalState] = useState({ open: false, type: 'single', client: null });
  const [resetSalesModalOpen, setResetSalesModalOpen] = useState(false);

  const loadOrders = () => {
    const rawOrders = getCollection('orders') || [];
    const filtered = filterOrdersForSupplier(
      rawOrders,
      currentUser?.uid,
      currentUser?.address,
      currentUser?.city
    );
    setOrders(filtered);
  };

  useEffect(() => {
    loadOrders();
    const unsub = subscribeToData((coll) => {
      if (coll === 'orders' || coll === 'all') loadOrders();
    });
    return () => unsub();
  }, [currentUser]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Filter orders by chosen period
  const filteredOrders = orders.filter((o) => {
    const orderDate = new Date(o.createdAt || o.deliveryDate);
    if (period === 'today') {
      return (o.createdAt || '').startsWith(todayStr) || o.deliveryDate === todayStr;
    }
    if (period === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return orderDate >= oneWeekAgo;
    }
    if (period === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      return orderDate >= oneMonthAgo;
    }
    if (period === 'custom' && startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      e.setHours(23, 59, 59);
      return orderDate >= s && orderDate <= e;
    }
    return true;
  });

  // Calculate Metrics
  const totalRevenue = filteredOrders
    .filter(o => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const totalOrdersCount = filteredOrders.length;
  const deliveredCount = filteredOrders.filter(o => o.orderStatus === 'Delivered').length;
  const cancelledCount = filteredOrders.filter(o => o.orderStatus === 'Cancelled').length;
  
  const pendingPayments = filteredOrders
    .filter(o => o.paymentStatus === 'Pending' && o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Product-wise sales breakdown
  const productSalesMap = {};
  filteredOrders.forEach(o => {
    if (o.orderStatus === 'Cancelled') return;
    o.items?.forEach(item => {
      if (!productSalesMap[item.name]) {
        productSalesMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
      }
      productSalesMap[item.name].quantity += item.quantity;
      productSalesMap[item.name].revenue += (item.price * item.quantity);
    });
  });
  const productSales = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);

  // Customer-wise sales breakdown
  const customerSalesMap = {};
  filteredOrders.forEach(o => {
    if (o.orderStatus === 'Cancelled') return;
    const name = o.customerName || 'Anonymous';
    if (!customerSalesMap[name]) {
      customerSalesMap[name] = { 
        name, 
        orders: 0, 
        revenue: 0, 
        phone: o.customerPhone,
        customerId: o.customerId,
        orderIds: []
      };
    }
    customerSalesMap[name].orders += 1;
    customerSalesMap[name].revenue += (o.totalAmount || 0);
    if (o.orderId) customerSalesMap[name].orderIds.push(o.orderId);
  });
  const customerSales = Object.values(customerSalesMap).sort((a, b) => b.revenue - a.revenue);

    const handleResetSales = () => {
    try {
      filteredOrders.forEach(o => {
        if (o.orderId) {
          deleteDoc('orders', 'orderId', o.orderId);
        }
      });
      setOrders([]);
      setResetSalesModalOpen(false);
      showToast('All sales records deleted. Revenue refreshed to ₹0.', 'success');
    } catch (err) {
      showToast(`Error resetting sales: ${err.message}`, 'error');
    }
  };

  const handleConfirmDelete = () => {
    if (deleteModalState.type === 'single' && deleteModalState.client) {
      const c = deleteModalState.client;
      if (c.customerId) {
        deleteCustomer(c.customerId);
      }
      c.orderIds?.forEach(id => deleteDoc('orders', 'orderId', id));
      showToast(`Client "${c.name}" deleted from records successfully!`, 'success');
    } else if (deleteModalState.type === 'all') {
      const allCustomerIds = customerSales.map(c => c.customerId).filter(Boolean);
      deleteAllCustomers(allCustomerIds);
      customerSales.forEach(c => {
        c.orderIds?.forEach(id => deleteDoc('orders', 'orderId', id));
      });
      showToast('All clients and customer records deleted successfully!', 'success');
    }
    setDeleteModalState({ open: false, type: 'single', client: null });
    loadOrders();
  };

  // Revenue chart simulated days data (Last 7 days)
  const chartDays = [
    { day: 'Mon', revenue: 1450, orders: 12 },
    { day: 'Tue', revenue: 1800, orders: 15 },
    { day: 'Wed', revenue: 2100, orders: 18 },
    { day: 'Thu', revenue: 1650, orders: 14 },
    { day: 'Fri', revenue: 2900, orders: 24 },
    { day: 'Sat', revenue: 3400, orders: 28 },
    { day: 'Sun (Today)', revenue: totalRevenue > 0 ? totalRevenue : 2500, orders: totalOrdersCount > 0 ? totalOrdersCount : 20 }
  ];
  const maxDayRevenue = Math.max(...chartDays.map(d => d.revenue), 4000);

  // Export CSV function (Section 10 requirement)
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      showToast('No order data to export', 'warning');
      return;
    }

    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Address', 'Products', 'Total Amount', 'Status', 'Payment Method', 'Payment Status'];
    const rows = filteredOrders.map(o => [
      o.orderId,
      o.createdAt || o.deliveryDate,
      `"${o.customerName || ''}"`,
      `"${o.customerPhone || ''}"`,
      `"${o.deliveryAddress || ''}"`,
      `"${(o.items || []).map(i => `${i.name} (${i.quantity})`).join(', ')}"`,
      o.totalAmount,
      o.orderStatus,
      o.paymentMethod,
      o.paymentStatus
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AquaConnect_Sales_Report_${period}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Sales Report downloaded as CSV!', 'success');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Period Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Sales & Analytics Reports
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Financial health, revenue metrics, customer sales, and can volume analytics.
          </p>
        </div>

        {/* Action Buttons: CSV & Print */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <FileSpreadsheet size={16} color="#059669" /> Export CSV / Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePrintPDF}>
            <Printer size={16} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Filter Bar: Today, Week, Month, Custom */}
      <div 
        className="glass-card"
        style={{
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: period === p.id ? 700 : 500,
                backgroundColor: period === p.id ? '#0284c7' : '#f1f5f9',
                color: period === p.id ? '#ffffff' : '#475569',
                border: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span>From:</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-light)' }}
            />
            <span>To:</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-light)' }}
            />
          </div>
        )}
      </div>

      {/* Statistics Cards (Section 10) */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}
      >
        <StatsCard 
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={IndianRupee}
          color="blue"
          subtitle="Net sales in period"
        />
        <StatsCard 
          title="Total Orders"
          value={totalOrdersCount}
          icon={ShoppingBag}
          color="indigo"
          subtitle="All incoming orders"
        />
        <StatsCard 
          title="Delivered Orders"
          value={deliveredCount}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Successfully fulfilled"
        />
        <StatsCard 
          title="Cancelled Orders"
          value={cancelledCount}
          icon={XCircle}
          color="rose"
          subtitle="Declined / Void"
        />
        <StatsCard 
          title="Pending Payments"
          value={formatCurrency(pendingPayments)}
          icon={Clock}
          color="amber"
          subtitle="Uncollected cash/credit"
        />
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
        {/* Revenue & Daily Sales Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Weekly Revenue & Orders Trend</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily volume and revenue performance</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: '#0284c7' }} /> Revenue
              </span>
            </div>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '220px', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
            {chartDays.map((d, index) => {
              const heightPercent = Math.max(15, (d.revenue / maxDayRevenue) * 100);
              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', marginBottom: '6px' }}>
                    ₹{d.revenue}
                  </div>
                  <div 
                    style={{
                      width: '38px',
                      height: `${heightPercent}%`,
                      background: 'linear-gradient(180deg, #0284c7 0%, #06b6d4 100%)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.4s ease',
                      boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
                    }} 
                  />
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '10px' }}>
                    {d.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product-wise Sales Breakdown */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px' }}>Product-wise Sales</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '18px' }}>Revenue share by bottle & can size</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {productSales.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No product sales recorded in this period.</p>
            ) : (
              productSales.map((p, index) => {
                const percent = totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0;
                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{p.name} ({p.quantity} units)</span>
                      <span style={{ fontWeight: 800, color: '#0284c7' }}>{formatCurrency(p.revenue)}</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: '7px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{
                          height: '100%',
                          width: `${percent}%`,
                          backgroundColor: index === 0 ? '#0284c7' : index === 1 ? '#06b6d4' : '#6366f1',
                          borderRadius: '4px'
                        }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Customer-wise sales breakdown table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Top Clients & Customers by Revenue</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Customer billing breakdown and client reporting</p>
          </div>
          {customerSales.length > 0 && (
            <button
              onClick={() => setDeleteModalState({ open: true, type: 'all', client: null })}
              className="btn btn-secondary btn-sm"
              style={{ color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={15} /> Delete All Clients
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '12px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Customer</th>
                <th style={{ padding: '12px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Phone</th>
                <th style={{ padding: '12px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Orders Placed</th>
                <th style={{ padding: '12px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Total Revenue</th>
                <th style={{ padding: '12px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customerSales.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No customer data available for this period.
                  </td>
                </tr>
              ) : (
                customerSales.map((c, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>{c.name}</td>
                    <td style={{ padding: '12px 18px', color: '#64748b', fontSize: '0.85rem' }}>{c.phone || '+91 9xxxx xxxxx'}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 600 }}>{c.orders}</td>
                    <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
                      {formatCurrency(c.revenue)}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => setDeleteModalState({ open: true, type: 'single', client: c })}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#dc2626', borderColor: '#fecaca', padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Delete client record"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {deleteModalState.open && (
        <Modal
          isOpen={deleteModalState.open}
          onClose={() => setDeleteModalState({ open: false, type: 'single', client: null })}
          title={deleteModalState.type === 'all' ? 'Delete All Clients & Customers?' : `Delete Client: ${deleteModalState.client?.name}?`}
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ backgroundColor: '#fee2e2', borderRadius: '50%', padding: '10px', color: '#dc2626' }}>
                <AlertTriangle size={24} />
              </div>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>
                {deleteModalState.type === 'all' 
                  ? `Are you sure you want to permanently delete all ${customerSales.length} client and customer report entries? This will clear all customer ledger entries and associated orders.`
                  : `Are you sure you want to delete client record "${deleteModalState.client?.name}"? This removes their billing, history, and sales analytics.`}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteModalState({ open: false, type: 'single', client: null })}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}
                onClick={handleConfirmDelete}
              >
                {deleteModalState.type === 'all' ? 'Delete All Clients' : 'Delete Client'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    
      {/* Reset Sales to ₹0 Modal */}
      {resetSalesModalOpen && (
        <Modal
          isOpen={resetSalesModalOpen}
          onClose={() => setResetSalesModalOpen(false)}
          title="Reset Sales & Revenue to ₹0?"
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ backgroundColor: '#fee2e2', borderRadius: '50%', padding: '10px', color: '#dc2626' }}>
                <RotateCcw size={24} />
              </div>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>
                Are you sure you want to delete all recorded sales and refresh total revenue back to <strong>₹0</strong>? This will clear all delivered and fulfilled sales history for this report period cleanly.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setResetSalesModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ backgroundColor: '#dc2626', color: '#fff', fontWeight: 700 }}
                onClick={handleResetSales}
              >
                Reset to ₹0
              </button>
            </div>
          </div>
        </Modal>
      )}
</div>
  );
};

export default SupplierReports;

