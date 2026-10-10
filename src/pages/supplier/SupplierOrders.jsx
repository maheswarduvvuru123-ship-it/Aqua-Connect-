import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Truck, 
  Check, 
  X, 
  Package, 
  CheckCircle2, 
  FileText, 
  Calendar, 
  Phone, 
  MapPin, 
  Download,
  AlertCircle,
  Trash2
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import OrderTimeline from '../../components/OrderTimeline';
import DeliveryAssignModal from '../../components/DeliveryAssignModal';
import InvoiceModal from '../../components/InvoiceModal';
import { getCollection, updateOrderStatus, subscribeToData, deleteDoc, deleteOrder } from '../../services/firestoreData';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { filterOrdersForSupplier } from '../../utils/locationMatcher';

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

const SupplierOrders = () => {
  const { showToast } = useNotifications();
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  
  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryOrder, setDeliveryOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const loadOrders = () => {
    const rawOrders = getCollection('orders') || [];
    const filtered = filterOrdersForSupplier(
      rawOrders,
      currentUser?.uid,
      currentUser?.address,
      currentUser?.city,
      currentUser?.deliveryAreas || []
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

  const handleStatusChange = (orderId, newStatus, note = '') => {
    try {
      updateOrderStatus(orderId, newStatus, note);
      showToast(`Order #${orderId} marked as ${newStatus}`, 'success');
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          orderStatus: newStatus,
          timeline: [...(prev.timeline || []), { status: newStatus, time: new Date().toISOString(), note }]
        }));
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteOrder = (orderId) => {
    if (window.confirm(`Are you sure you want to permanently delete completed order #${orderId}? This cannot be undone.`)) {
      try {
        deleteOrder(orderId);
        showToast(`Order #${orderId} deleted permanently`, 'success');
        if (selectedOrder && selectedOrder.orderId === orderId) {
          setSelectedOrder(null);
        }
        loadOrders();
      } catch (err) {
        showToast(`Failed to delete order: ${err.message}`, 'error');
      }
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone?.includes(searchQuery) ||
      o.deliveryAddress?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || o.orderStatus === statusFilter;
    const matchesDate = !dateFilter || o.createdAt?.startsWith(dateFilter) || o.deliveryDate === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Stats summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Order Management
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Accept, prepare, assign trucks, and track water jar deliveries.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        className="glass-card"
        style={{
          padding: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input 
            type="text"
            placeholder="Search by Order ID, customer, phone, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 38px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="#64748b" />
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              fontSize: '0.85rem'
            }}
          />
          {dateFilter && (
            <button 
              onClick={() => setDateFilter('')}
              style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
          {STATUS_FILTERS.map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? '#0284c7' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#475569',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredOrders.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <EmptyState 
              title="No matching orders" 
              description="No water delivery orders match the current search or status filter."
              actionText="Reset Filters"
              onAction={() => {
                setSearchQuery('');
                setStatusFilter('All');
                setDateFilter('');
              }}
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Order ID</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Customer</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Products & Qty</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Amount</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Driver / Route</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const primaryItem = order.items?.[0] || { name: '20L Can', quantity: 1 };
                  const extraCount = (order.items?.length || 1) - 1;

                  return (
                    <tr 
                      key={order.orderId}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                    >
                      {/* ID, Plant & Date */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.925rem' }}>
                          #{order.orderId}
                        </span>
                        {order.plantName && (
                          <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, marginTop: '2px' }}>
                            🏭 {order.plantName}
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                          {formatDateTime(order.createdAt)}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                          {order.customerName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {order.customerPhone}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {order.deliveryAddress}
                        </div>
                      </td>

                      {/* Products */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#334155' }}>
                          {primaryItem.name} × {primaryItem.quantity}
                        </div>
                        {extraCount > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                            +{extraCount} additional items
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Slot: {order.deliveryTime}
                        </div>
                      </td>

                      {/* Amount & Method */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                          {formatCurrency(order.totalAmount)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: order.paymentStatus === 'Paid' ? '#059669' : '#d97706', fontWeight: 600 }}>
                          {order.paymentMethod} • {order.paymentStatus}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <StatusBadge status={order.orderStatus} />
                      </td>

                      {/* Driver */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', fontSize: '0.825rem', color: '#475569' }}>
                        {order.deliveryPerson || <span style={{ color: '#94a3b8' }}>Unassigned</span>}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Quick transitions according to Section 5 */}
                          {order.orderStatus === 'Pending' && (
                            <>
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => handleStatusChange(order.orderId, 'Confirmed', 'Order confirmed by plant manager')}
                                title="Accept & Confirm Order"
                              >
                                <Check size={14} /> Accept
                              </button>
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleStatusChange(order.orderId, 'Cancelled', 'Cancelled by supplier')}
                                title="Reject Order"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}

                          {order.orderStatus === 'Confirmed' && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ borderColor: '#bae6fd', color: '#0284c7' }}
                              onClick={() => handleStatusChange(order.orderId, 'Preparing', 'Cans sanitized and placed on loading pallet')}
                            >
                              <Package size={14} /> Preparing
                            </button>
                          )}

                          {order.orderStatus === 'Preparing' && (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => setDeliveryOrder(order)}
                            >
                              <Truck size={14} /> Assign Driver
                            </button>
                          )}

                          {order.orderStatus === 'Out for Delivery' && (
                            <button 
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                              onClick={() => handleStatusChange(order.orderId, 'Delivered', 'Water bottles handed over to customer')}
                            >
                              <CheckCircle2 size={14} /> Mark Delivered
                            </button>
                          )}

                          {/* Order Details Modal Trigger */}
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedOrder(order)}
                            title="View Full Order Timeline & Items"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Print Invoice Modal Trigger */}
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setInvoiceOrder(order)}
                            title="Print Invoice / Delivery Challan"
                          >
                            <FileText size={14} />
                          </button>

                          {/* Delete Completed / Cancelled Order */}
                          {(order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled') && (
                            <button 
                              className="btn btn-sm"
                              style={{ 
                                borderColor: '#fca5a5', 
                                color: '#dc2626', 
                                backgroundColor: '#fef2f2',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onClick={() => handleDeleteOrder(order.orderId)}
                              title="Delete Completed Order Record"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <Modal 
          isOpen={Boolean(selectedOrder)} 
          onClose={() => setSelectedOrder(null)} 
          title={`Order Details #${selectedOrder.orderId}`}
          maxWidth="680px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Status & Summary header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>CURRENT STATUS</span>
                <div style={{ marginTop: '4px' }}>
                  <StatusBadge status={selectedOrder.orderStatus} />
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>TOTAL AMOUNT</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {formatCurrency(selectedOrder.totalAmount)}
                </div>
              </div>
            </div>

            {/* Live Order Timeline */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>
                Delivery Progress Timeline
              </h4>
              <OrderTimeline orderStatus={selectedOrder.orderStatus} timeline={selectedOrder.timeline} />
            </div>

            {/* Customer & Address */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>CUSTOMER DETAILS</span>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginTop: '4px' }}>
                  {selectedOrder.customerName}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  📞 {selectedOrder.customerPhone}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>DELIVERY ADDRESS & TIME</span>
                <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '4px' }}>
                  📍 {selectedOrder.deliveryAddress}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  🕒 Slot: {selectedOrder.deliveryTime}
                </div>
              </div>
            </div>

            {/* Products Ordered */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>
                Water Products in this Order
              </h4>
              <div style={{ border: '1px solid var(--border-light)', borderRadius: '10px', overflow: 'hidden' }}>
                {selectedOrder.items?.map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: idx < selectedOrder.items.length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.name}</span>
                      {item.unit && <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '6px' }}>({item.unit})</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Qty: <strong>{item.quantity}</strong></span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Status Overrides for Supplier */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                Update Order Status:
              </h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    className="btn btn-secondary btn-sm"
                    disabled={selectedOrder.orderStatus === st}
                    onClick={() => handleStatusChange(selectedOrder.orderId, st)}
                    style={{
                      fontSize: '0.78rem',
                      opacity: selectedOrder.orderStatus === st ? 0.5 : 1
                    }}
                  >
                    Mark as {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Danger Zone: Delete Completed Order */}
            {(selectedOrder.orderStatus === 'Delivered' || selectedOrder.orderStatus === 'Cancelled') && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#991b1b' }}>Danger Zone</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Permanently remove this completed order from database</div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteOrder(selectedOrder.orderId)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={14} /> Delete Completed Order
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modals for delivery assignment and invoice */}
      {deliveryOrder && (
        <DeliveryAssignModal 
          isOpen={Boolean(deliveryOrder)}
          onClose={() => setDeliveryOrder(null)}
          order={deliveryOrder}
        />
      )}

      {invoiceOrder && (
        <InvoiceModal 
          isOpen={Boolean(invoiceOrder)}
          onClose={() => setInvoiceOrder(null)}
          order={invoiceOrder}
        />
      )}
    </div>
  );
};

export default SupplierOrders;
