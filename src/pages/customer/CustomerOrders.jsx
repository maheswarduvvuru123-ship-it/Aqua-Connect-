import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Phone, 
  Receipt, 
  Calendar,
  AlertCircle,
  Trash2
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import OrderTimeline from '../../components/OrderTimeline';
import EmptyState from '../../components/EmptyState';
import InvoiceModal from '../../components/InvoiceModal';
import { useAuth } from '../../context/AuthContext';
import { getCollection, updateOrderStatus, deleteDoc, subscribeToData } from '../../services/firestoreData';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';

const CustomerOrders = ({ onBrowseMore }) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'previous' | 'cancelled'
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loadOrders = () => {
    if (!currentUser) return;
    const all = getCollection('orders');
    const myOrders = all.filter(o => {
      const cName = (o.customerName || '').toLowerCase();
      const pName = (o.plantName || o.supplierName || '').toLowerCase();
      const cId = (o.customerId || '').toLowerCase();
      if (cName.includes('@') || pName.includes('@') || cId.includes('@') || cName.includes('paddu') || cName.includes('jaya') || pName.includes('paddu') || pName.includes('jaya')) {
        return false;
      }
      return o.customerId === currentUser.uid || (currentUser.email && o.customerId === currentUser.email);
    });
    myOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setOrders(myOrders);
  };

  useEffect(() => {
    loadOrders();
    const unsub = subscribeToData((coll) => {
      if (coll === 'orders' || coll === 'all') loadOrders();
    });
    return () => unsub();
  }, [currentUser]);

  const handleCancelOrder = (orderId) => {
    if (window.confirm(`Are you sure you want to cancel order #${orderId}?`)) {
      try {
        updateOrderStatus(orderId, 'Cancelled', 'Cancelled by customer');
        showToast(`Order #${orderId} has been cancelled`, 'info');
      } catch (err) {
        showToast(`Failed to cancel: ${err.message}`, 'error');
      }
    }
  };

  const handleDeleteOrder = (orderId) => {
    if (window.confirm(`Are you sure you want to permanently remove order #${orderId} from your order history?`)) {
      try {
        deleteDoc('orders', 'orderId', orderId);
        showToast(`Order #${orderId} deleted from records`, 'info');
        loadOrders();
      } catch (err) {
        showToast(`Failed to delete order: ${err.message}`, 'error');
      }
    }
  };

  // Categorize orders (Section 15 requirements: Current, Previous, Cancelled)
  const currentOrders = orders.filter(o => 
    ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(o.orderStatus)
  );
  const previousOrders = orders.filter(o => o.orderStatus === 'Delivered');
  const cancelledOrders = orders.filter(o => o.orderStatus === 'Cancelled');

  const displayedOrders = 
    activeTab === 'current' ? currentOrders :
    activeTab === 'previous' ? previousOrders :
    cancelledOrders;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Title */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
          My Water Deliveries
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Track active deliveries in real-time, view order histories, and download receipts.
        </p>
      </div>

      {/* Tabs: Current orders, Previous orders, Cancelled orders (Section 15) */}
      <div 
        style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          width: 'fit-content'
        }}
      >
        <button
          onClick={() => setActiveTab('current')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'current' ? 700 : 500,
            backgroundColor: activeTab === 'current' ? '#ffffff' : 'transparent',
            color: activeTab === 'current' ? '#0284c7' : '#64748b',
            boxShadow: activeTab === 'current' ? 'var(--shadow-sm)' : 'none',
            border: 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Active Deliveries ({currentOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('previous')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'previous' ? 700 : 500,
            backgroundColor: activeTab === 'previous' ? '#ffffff' : 'transparent',
            color: activeTab === 'previous' ? '#0284c7' : '#64748b',
            boxShadow: activeTab === 'previous' ? 'var(--shadow-sm)' : 'none',
            border: 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Past Orders ({previousOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'cancelled' ? 700 : 500,
            backgroundColor: activeTab === 'cancelled' ? '#ffffff' : 'transparent',
            color: activeTab === 'cancelled' ? '#0284c7' : '#64748b',
            boxShadow: activeTab === 'cancelled' ? 'var(--shadow-sm)' : 'none',
            border: 'none',
            transition: 'all 0.15s ease'
          }}
        >
          Cancelled ({cancelledOrders.length})
        </button>
      </div>

      {/* Orders List */}
      {displayedOrders.length === 0 ? (
        <EmptyState 
          icon={Package}
          title={
            activeTab === 'current' ? 'No active deliveries right now' :
            activeTab === 'previous' ? 'No previous completed orders' :
            'No cancelled orders'
          }
          description={
            activeTab === 'current' ? 'Place an order for fresh water cans from our home catalog.' :
            'Your fulfilled orders will be saved here for your records.'
          }
          actionText={activeTab === 'current' ? 'Order Water Now' : undefined}
          onAction={onBrowseMore}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {displayedOrders.map((order) => {
            const canCancel = order.orderStatus === 'Pending' || order.orderStatus === 'Confirmed';

            return (
              <div 
                key={order.orderId}
                className="glass-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  backgroundColor: '#ffffff'
                }}
              >
                {/* Prominent Water Plant Header (Not just cryptic AC1004) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                        🏭 {order.plantName || order.supplierName || 'AquaConnect Certified Water Plant'}
                      </span>
                      <StatusBadge status={order.orderStatus} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#0284c7' }}>Order #{order.orderId}</span>
                      <span>•</span>
                      <span>Placed on {formatDateTime(order.createdAt)}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                      {formatCurrency(order.totalAmount)}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: order.paymentStatus === 'Paid' ? '#059669' : '#d97706', fontWeight: 600 }}>
                      {order.paymentMethod} • {order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Direct Fulfilling Plant Badge */}
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  color: '#166534',
                  fontWeight: 600
                }}>
                  <span>✓</span>
                  <span>Fulfilling Water Plant: <strong>{order.plantName || order.supplierName || 'AquaConnect Certified Water Plant'}</strong> • Direct Delivery</span>
                </div>

                {/* Items Summary */}
                <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {order.items?.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>
                          {item.name} × {item.quantity}
                        </span>
                        <span style={{ fontWeight: 600, color: '#475569' }}>
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '10px', paddingTop: '8px', fontSize: '0.825rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      📍 <strong>Drop Address:</strong> {order.deliveryAddress}
                    </div>
                    {order.deliveryPerson && order.deliveryPerson !== 'Unassigned' && (
                      <div>
                        🚚 <strong>Driver:</strong> {order.deliveryPerson}
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Order Timeline (Section 15: Order Placed -> Confirmed -> Preparing -> Out for Delivery -> Delivered) */}
                <div>
                  <OrderTimeline orderStatus={order.orderStatus} timeline={order.timeline} />
                </div>

                {/* Actions Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  <div>
                    {canCancel && (
                      <button 
                        className="btn btn-danger btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleCancelOrder(order.orderId)}
                      >
                        <XCircle size={15} /> Cancel Order
                      </button>
                    )}
                    {(order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled') && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleDeleteOrder(order.orderId)}
                        title="Delete this order record from history"
                      >
                        <Trash2 size={15} /> Delete Record
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedInvoice(order)}
                    >
                      <Receipt size={15} /> View Delivery Receipt
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice modal */}
      {selectedInvoice && (
        <InvoiceModal 
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          order={selectedInvoice}
        />
      )}
    </div>
  );
};

export default CustomerOrders;
