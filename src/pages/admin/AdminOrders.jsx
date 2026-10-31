import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  ShoppingBag, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  Building2, 
  Download, 
  CheckCircle2, 
  Clock, 
  X,
  Trash2 
} from 'lucide-react';
import { 
  getCollection, 
  subscribeToData, 
  deleteDoc,
  getOrderPayments, 
  calculateOutstandingBalance 
} from '../../services/firestoreData';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { useNotifications } from '../../context/NotificationContext';

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
const PAYMENT_STATUS_FILTERS = ['All', 'Unpaid', 'Pending Verification', 'Partially Paid', 'Paid', 'Disputed'];

const AdminOrders = () => {
  const { showToast } = useNotifications();
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = () => {
    setOrders(getCollection('orders') || []);
  };

  const handleDeleteOrder = (orderId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete Order #${orderId} from the database?`)) return;
    try {
      deleteDoc('orders', 'orderId', orderId);
      showToast(`Order #${orderId} deleted permanently from backend and frontend`, 'info');
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(null);
      }
      loadOrders();
    } catch (err) {
      showToast('Failed to delete order: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    loadOrders();
    const unsub = subscribeToData(() => loadOrders());
    return () => unsub();
  }, []);

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (o.orderId || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerPhone || '').toLowerCase().includes(q) ||
      (o.plantName || o.supplierName || '').toLowerCase().includes(q) ||
      (o.deliveryAddress || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || o.orderStatus === statusFilter;
    const matchesPayment = paymentFilter === 'All' || o.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Central Orders Management
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Inspect, filter, and track customer orders across all supplier plants in real-time.
          </p>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredOrders.length}</strong> of {orders.length} total orders
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '18px 20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input 
              type="text"
              placeholder="Search by Order ID, customer, plant, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Payment Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff'
              }}
            >
              {PAYMENT_STATUS_FILTERS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pill Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {STATUS_FILTERS.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: statusFilter === st ? 700 : 500,
                backgroundColor: statusFilter === st ? '#4338ca' : '#f1f5f9',
                color: statusFilter === st ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
              <tr>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Order ID</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Customer</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Supplier Plant</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Total Amount</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Order Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Payment Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Date & Time</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No orders match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const payStatus = order.paymentStatus || 'Unpaid';
                  const isPaid = payStatus === 'Paid';
                  const isPending = payStatus === 'Pending Verification';

                  return (
                    <tr 
                      key={order.orderId}
                      style={{ borderBottom: '1px solid var(--border-light)' }}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#4338ca' }}>
                        #{order.orderId}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{order.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.customerPhone}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#0369a1' }}>
                          {order.plantName || order.supplierName || 'Plant'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <StatusBadge status={order.orderStatus} />
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: isPaid ? '#dcfce7' : isPending ? '#fef3c7' : '#fee2e2',
                            color: isPaid ? '#15803d' : isPending ? '#b45309' : '#b91c1c'
                          }}
                        >
                          {payStatus}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '4px' }}
                          >
                            <Eye size={14} /> View
                          </button>
                          <button
                            onClick={(e) => handleDeleteOrder(order.orderId, e)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}
                            title="Delete this order record permanently"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedOrder(null)} 
          title={`Order #${selectedOrder.orderId} Details`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Summary Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status:</span>
                <div style={{ marginTop: '2px' }}><StatusBadge status={selectedOrder.orderStatus} /></div>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Direct Payment:</span>
                <div style={{ fontWeight: 800, color: '#4338ca' }}>{selectedOrder.paymentMethod || 'Cash'} • {selectedOrder.paymentStatus}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Grand Total:</span>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>{formatCurrency(selectedOrder.totalAmount)}</div>
              </div>
            </div>

            {/* Customer & Supplier Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#0369a1', marginBottom: '8px' }}>
                  <User size={15} /> Customer Information
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedOrder.customerName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{selectedOrder.customerPhone}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  📍 {selectedOrder.deliveryAddress}
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#4338ca', marginBottom: '8px' }}>
                  <Building2 size={15} /> Supplier Plant
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedOrder.plantName || selectedOrder.supplierName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {selectedOrder.supplierId}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Slot: {selectedOrder.deliveryTime || 'Standard'}
                </div>
              </div>
            </div>

            {/* Order Items Table */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Order Items Snapshot:</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '6px 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '6px 0' }}>Unit Price</th>
                    <th style={{ textAlign: 'right', padding: '6px 0' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '8px 0', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency((item.price || 0) * (item.quantity || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '0.85rem', lineHeight: 1.8 }}>
                <div>Subtotal: <strong>{formatCurrency(selectedOrder.subtotal || (selectedOrder.totalAmount - (selectedOrder.deliveryFee || 30)))}</strong></div>
                <div>Delivery Fee: <strong>{formatCurrency(selectedOrder.deliveryFee || 30)}</strong></div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Grand Total: {formatCurrency(selectedOrder.totalAmount)}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Order Progression Timeline:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedOrder.timeline || []).map((tl, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#4338ca', fontWeight: 700 }}>•</span>
                    <div style={{ flex: 1 }}>
                      <strong>{tl.status}</strong> — <span style={{ color: 'var(--text-muted)' }}>{tl.note}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{formatDateTime(tl.time)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions Footer: Delete Record */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => handleDeleteOrder(selectedOrder.orderId)}
                className="btn btn-secondary btn-sm"
                style={{ color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={15} /> Delete Order From Backend & Frontend
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="btn btn-primary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminOrders;
