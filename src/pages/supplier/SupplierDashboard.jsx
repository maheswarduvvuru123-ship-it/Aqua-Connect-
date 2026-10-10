import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Check, 
  IndianRupee, 
  AlertCircle, 
  Users, 
  ArrowUpRight, 
  Calendar,
  Layers,
  FileText,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import DeliveryAssignModal from '../../components/DeliveryAssignModal';
import InvoiceModal from '../../components/InvoiceModal';
import { getCollection, updateOrderStatus, subscribeToData } from '../../services/firestoreData';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { filterOrdersForSupplier, filterCustomersForSupplier } from '../../utils/locationMatcher';

const SupplierDashboard = ({ onNavigateTab }) => {
  const { showToast } = useNotifications();
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);

  const loadData = () => {
    const rawOrders = getCollection('orders') || [];
    const rawCustomers = getCollection('customers') || [];
    const filteredOrders = filterOrdersForSupplier(
      rawOrders,
      currentUser?.uid,
      currentUser?.address,
      currentUser?.city,
      currentUser?.deliveryAreas || []
    );
    const filteredCustomers = filterCustomersForSupplier(
      rawCustomers,
      rawOrders,
      currentUser?.uid,
      currentUser?.address,
      currentUser?.city,
      currentUser?.deliveryAreas || []
    );
    setOrders(filteredOrders);
    setInventory(getCollection('inventory') || []);
    setCustomers(filteredCustomers);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(() => loadData());
    return () => unsub();
  }, [currentUser]);

  // Today's date string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate statistics according to Section 4
  const todaysOrders = orders.filter(o => o.createdAt?.startsWith(todayStr) || o.deliveryDate === todayStr);
  const pendingOrders = orders.filter(o => o.orderStatus === 'Pending');
  const confirmedOrders = orders.filter(o => o.orderStatus === 'Confirmed');
  const outForDeliveryOrders = orders.filter(o => o.orderStatus === 'Out for Delivery');
  const deliveredOrders = orders.filter(o => o.orderStatus === 'Delivered');

  // Revenue calculations
  const todaysRevenue = todaysOrders
    .filter(o => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const pendingPaymentsTotal = orders
    .filter(o => o.paymentStatus === 'Pending' && o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Recent 6 orders
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  const handleQuickStatus = (orderId, newStatus) => {
    try {
      updateOrderStatus(orderId, newStatus);
      showToast(`Order #${orderId} marked as ${newStatus}`, 'success');
    } catch (err) {
      showToast(`Error updating order: ${err.message}`, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Supplier Operations Dashboard
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Overview of plant dispatches, order statuses, water-can returns & revenue.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateTab('deliveries')}
          >
            <Truck size={16} /> View All Deliveries
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => onNavigateTab('orders')}
          >
            <ShoppingBag size={16} /> Manage Orders
          </button>
        </div>
      </div>

      {/* Statistics Cards (Section 4) */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}
      >
        <StatsCard 
          title="Today's Orders"
          value={todaysOrders.length}
          icon={ShoppingBag}
          color="blue"
          subtitle="Orders received today"
          onClick={() => onNavigateTab('orders')}
        />
        <StatsCard 
          title="Pending Approval"
          value={pendingOrders.length}
          icon={Clock}
          color="amber"
          subtitle="Needs confirmation"
          onClick={() => onNavigateTab('orders')}
        />
        <StatsCard 
          title="Confirmed"
          value={confirmedOrders.length}
          icon={Check}
          color="indigo"
          subtitle="Ready for loading"
          onClick={() => onNavigateTab('orders')}
        />
        <StatsCard 
          title="Delivered"
          value={deliveredOrders.length}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Fulfilled orders"
          onClick={() => onNavigateTab('orders')}
        />
        <StatsCard 
          title="Today's Revenue"
          value={formatCurrency(todaysRevenue)}
          icon={IndianRupee}
          color="blue"
          subtitle="Estimated collections"
          onClick={() => onNavigateTab('reports')}
        />
        <StatsCard 
          title="Pending Payments"
          value={formatCurrency(pendingPaymentsTotal)}
          icon={AlertCircle}
          color="rose"
          subtitle="Uncollected COD & credit"
          onClick={() => onNavigateTab('customers')}
        />
      </div>

      {/* Main Grid: Recent Orders & Inventory Snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Recent Orders Section (Section 4) */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Recent Customer Orders</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest water delivery requests</p>
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => onNavigateTab('orders')}
            >
              View All ({orders.length}) <ChevronRight size={14} />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState title="No orders received yet" description="Orders placed by customers will appear here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentOrders.map((order) => {
                const primaryItem = order.items?.[0] || { name: '20L Can', quantity: 1 };
                const extraItemsCount = (order.items?.length || 1) - 1;

                return (
                  <div 
                    key={order.orderId}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-light)',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Order ID & Customer */}
                    <div style={{ minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0284c7' }}>
                          #{order.orderId}
                        </span>
                        <StatusBadge status={order.orderStatus} size="small" />
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        {order.customerName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {order.customerPhone}
                      </div>
                    </div>

                    {/* Water Type & Quantity */}
                    <div style={{ minWidth: '150px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                        {primaryItem.name} × {primaryItem.quantity}
                        {extraItemsCount > 0 && <span style={{ fontSize: '0.75rem', color: '#64748b' }}> (+{extraItemsCount} more)</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        Slot: {order.deliveryTime || 'Standard'}
                      </div>
                    </div>

                    {/* Amount & Payment */}
                    <div style={{ minWidth: '100px', textAlign: 'right' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(order.totalAmount)}
                      </div>
                      <span 
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: order.paymentStatus === 'Paid' ? '#059669' : '#d97706'
                        }}
                      >
                        {order.paymentMethod} ({order.paymentStatus})
                      </span>
                    </div>

                    {/* Quick action buttons - direct Mark Delivered */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {order.orderStatus === 'Pending' && (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleQuickStatus(order.orderId, 'Confirmed')}
                        >
                          <Check size={14} /> Accept
                        </button>
                      )}

                      {(order.orderStatus === 'Pending' || order.orderStatus === 'Confirmed') && (
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                          onClick={() => handleQuickStatus(order.orderId, 'Delivered')}
                        >
                          <CheckCircle2 size={14} /> Mark Delivered
                        </button>
                      )}

                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedOrderForInvoice(order)}
                        title="Print Challan / Invoice"
                      >
                        <FileText size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Quick Inventory & Returnable Can Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Can Inventory Snapshot */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Stock & Cans Health</h3>
              <button 
                onClick={() => onNavigateTab('inventory')}
                style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700 }}
              >
                Manage
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {inventory.slice(0, 4).map((item) => {
                const isLow = (item.availableStock || 0) <= (item.lowStockThreshold || 15);
                return (
                  <div 
                    key={item.inventoryId}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: isLow ? '#fef2f2' : '#f8fafc',
                      border: `1px solid ${isLow ? '#fecaca' : '#e2e8f0'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                        {item.productName}
                      </span>
                      {isLow && (
                        <span className="badge badge-cancelled" style={{ fontSize: '0.65rem' }}>
                          Low Stock
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                      <span>In Stock: <strong style={{ color: isLow ? '#dc2626' : '#059669' }}>{item.availableStock}</strong></span>
                      <span>Delivered: <strong>{item.soldQuantity}</strong></span>
                      {item.returnedQuantity !== undefined && (
                        <span>Returned: <strong style={{ color: '#0284c7' }}>{item.returnedQuantity}</strong></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="glass-card" style={{ padding: '20px', backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0369a1', marginBottom: '12px' }}>
              Supplier Quick Actions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab('products')}
                style={{ width: '100%', justifyContent: 'flex-start', backgroundColor: '#ffffff' }}
              >
                <Layers size={16} color="#0284c7" /> Add / Update Water Product
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab('customers')}
                style={{ width: '100%', justifyContent: 'flex-start', backgroundColor: '#ffffff' }}
              >
                <Users size={16} color="#0284c7" /> View Customer Balances
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab('reports')}
                style={{ width: '100%', justifyContent: 'flex-start', backgroundColor: '#ffffff' }}
              >
                <FileText size={16} color="#0284c7" /> Download Daily Sales PDF / CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedOrderForDelivery && (
        <DeliveryAssignModal 
          isOpen={Boolean(selectedOrderForDelivery)}
          onClose={() => setSelectedOrderForDelivery(null)}
          order={selectedOrderForDelivery}
        />
      )}

      {selectedOrderForInvoice && (
        <InvoiceModal 
          isOpen={Boolean(selectedOrderForInvoice)}
          onClose={() => setSelectedOrderForInvoice(null)}
          order={selectedOrderForInvoice}
        />
      )}
    </div>
  );
};

export default SupplierDashboard;
