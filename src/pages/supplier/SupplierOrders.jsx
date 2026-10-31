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
  Trash2,
  CreditCard,
  AlertTriangle,
  Award
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import OrderTimeline from '../../components/OrderTimeline';
import DeliveryAssignModal from '../../components/DeliveryAssignModal';
import InvoiceModal from '../../components/InvoiceModal';
import { 
  getCollection, 
  updateOrderStatus, 
  subscribeToData, 
  deleteDoc, 
  deleteOrder,
  recordDirectPayment,
  calculateOutstandingBalance,
  getOrderPayments,
  checkSupplierSubscriptionValid
} from '../../services/firestoreData';
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

  // Direct Payment Recording State
  const [recordingPaymentOrder, setRecordingPaymentOrder] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI'); // 'UPI' | 'Cash'
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Subscription status
  const subscriptionInfo = checkSupplierSubscriptionValid(currentUser?.uid);

  const loadOrders = () => {
    const rawOrders = getCollection('orders') || [];
    const filtered = filterOrdersForSupplier(
      rawOrders,
      currentUser?.uid,
      currentUser?.address,
      currentUser?.city,
      currentUser?.deliveryAreas || [],
      currentUser?.email,
      currentUser?.phone
    );
    setOrders(filtered);
  };

  useEffect(() => {
    loadOrders();
    const unsub = subscribeToData((coll) => {
      if (coll === 'orders' || coll === 'payments' || coll === 'all') loadOrders();
    });
    return () => unsub();
  }, [currentUser]);

  const handleStatusChange = (orderId, newStatus, note = '') => {
    try {
      updateOrderStatus(orderId, newStatus, note, currentUser);
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

  // Open Direct Payment Modal
  const handleOpenRecordPayment = (order) => {
    const balanceInfo = calculateOutstandingBalance(order.orderId);
    setRecordingPaymentOrder(order);
    setPayAmount(String(balanceInfo.verifiedBalance || order.totalAmount));
    setPayMethod(order.paymentMethod === 'Cash' ? 'Cash' : 'UPI');
    setPayReference('');
    setPayNotes('');
  };

  // Submit Direct Payment
  const handleSubmitPayment = (e) => {
    e.preventDefault();
    if (!recordingPaymentOrder) return;

    const numAmount = Number(payAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid payment amount.', 'warning');
      return;
    }

    setIsSubmittingPay(true);
    try {
      recordDirectPayment({
        orderId: recordingPaymentOrder.orderId,
        amount: numAmount,
        method: payMethod,
        reference: payReference || (payMethod === 'Cash' ? 'CASH_REC' : `UPI_${Date.now()}`),
        notes: payNotes,
        recordedBy: {
          uid: currentUser?.uid || 'supplier',
          name: currentUser?.name || 'Plant Supervisor',
          role: 'supplier'
        }
      });

      showToast(`₹${numAmount} logged via ${payMethod} successfully! Status: Reported.`, 'success');
      setRecordingPaymentOrder(null);
      loadOrders();

      if (selectedOrder && selectedOrder.orderId === recordingPaymentOrder.orderId) {
        const updated = getCollection('orders').find(o => o.orderId === recordingPaymentOrder.orderId);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      showToast(`Failed to record payment: ${err.message}`, 'error');
    } finally {
      setIsSubmittingPay(false);
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
      {/* Subscription Status Banner if expired or grace period */}
      {subscriptionInfo && !subscriptionInfo.isValid && (
        <div 
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#dc2626" />
            <div>
              <span style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.88rem' }}>
                Subscription {subscriptionInfo.status}:
              </span>
              <span style={{ fontSize: '0.82rem', color: '#7f1d1d', marginLeft: '6px' }}>
                Your {subscriptionInfo.planName} has lapsed. Please renew your plan to ensure uninterrupted route dispatch. Historical orders remain intact.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{ 
                fontSize: '0.78rem', 
                fontWeight: 700, 
                color: '#991b1b', 
                backgroundColor: '#fee2e2', 
                padding: '4px 10px', 
                borderRadius: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              Lapsed Plan
            </span>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('navigate-supplier-tab', { detail: 'profile' }));
                }
              }}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              ⚡ Upgrade Plan in Settings →
            </button>
          </div>
        </div>
      )}

      {/* Title & Stats summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Order Management & Collections
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Accept, prepare, assign trucks, and record direct customer payments (Cash & UPI).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredOrders.length}</strong> assigned orders
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input 
              type="text" 
              placeholder="Search by Order ID, customer, address or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 38px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Date Picker Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} color="#64748b" />
            <input 
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.82rem',
                backgroundColor: '#ffffff'
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
        </div>

        {/* Status Pill Filters */}
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
                  cursor: 'pointer',
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
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Amount & Pay</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Driver / Route</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const primaryItem = order.items?.[0] || { name: '20L Can', quantity: 1 };
                  const extraCount = (order.items?.length || 1) - 1;
                  const balanceInfo = calculateOutstandingBalance(order.orderId);
                  const isFullyPaid = order.paymentStatus === 'Paid' || 
                                      order.paymentMethod === 'UPI' || 
                                      order.paymentMethod === 'Online Payment' || 
                                      order.paymentStatus === 'Pending Verification' || 
                                      balanceInfo.verifiedBalance === 0;

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
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '190px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📍 {order.deliveryAddress}
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
                          Slot: {order.deliveryTime || 'Standard'}
                        </div>
                      </td>

                      {/* Amount & Direct Payment Status */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                          {formatCurrency(order.totalAmount)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span 
                            style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isFullyPaid ? '#dcfce7' : '#fee2e2',
                              color: isFullyPaid ? '#15803d' : '#b91c1c'
                            }}
                          >
                            {order.paymentMethod || 'Direct'} • {isFullyPaid ? 'Paid' : (order.paymentStatus || 'Unpaid')}
                          </span>
                        </div>
                        {!isFullyPaid && balanceInfo.verifiedBalance > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600, marginTop: '2px' }}>
                            Due: {formatCurrency(balanceInfo.verifiedBalance)}
                          </div>
                        )}
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
                          {/* Record Direct Payment Button */}
                          {!isFullyPaid && (
                            <button
                              className="btn btn-sm"
                              style={{ 
                                backgroundColor: '#10b981', 
                                color: '#ffffff', 
                                border: 'none', 
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onClick={() => handleOpenRecordPayment(order)}
                              title="Log Cash or UPI Payment Received"
                            >
                              <CreditCard size={13} /> Collect Pay
                            </button>
                          )}

                          {/* Quick order status transitions */}
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
                              <Trash2 size={14} />
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

      {/* RECORD DIRECT PAYMENT MODAL */}
      {recordingPaymentOrder && (
        <Modal
          isOpen={Boolean(recordingPaymentOrder)}
          onClose={() => setRecordingPaymentOrder(null)}
          title={`Record Direct Payment for #${recordingPaymentOrder.orderId}`}
        >
          <form onSubmit={handleSubmitPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Balance Summary Box */}
            <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '10px', border: '1px solid #bbf7d0', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#166534' }}>Customer:</span>
                <strong>{recordingPaymentOrder.customerName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#166534' }}>Order Total:</span>
                <strong>{formatCurrency(recordingPaymentOrder.totalAmount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #bbf7d0' }}>
                <span style={{ color: '#166534', fontWeight: 700 }}>Outstanding Due:</span>
                <strong style={{ color: '#15803d', fontSize: '1rem' }}>
                  {formatCurrency(calculateOutstandingBalance(recordingPaymentOrder.orderId).verifiedBalance)}
                </strong>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Collection Method:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPayMethod('UPI')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: payMethod === 'UPI' ? '2px solid #7c3aed' : '1px solid var(--border-light)',
                    backgroundColor: payMethod === 'UPI' ? '#faf5ff' : '#ffffff',
                    color: payMethod === 'UPI' ? '#6b21a8' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                >
                  📱 Direct UPI (QR / PhonePe)
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('Cash')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: payMethod === 'Cash' ? '2px solid #059669' : '1px solid var(--border-light)',
                    backgroundColor: payMethod === 'Cash' ? '#ecfdf5' : '#ffffff',
                    color: payMethod === 'Cash' ? '#065f46' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                >
                  💵 Cash on Delivery
                </button>
              </div>
            </div>

            {/* Amount Field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                Amount Collected (₹):
              </label>
              <input 
                type="number"
                min="1"
                step="1"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.95rem',
                  fontWeight: 700
                }}
              />
            </div>

            {/* Reference field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                {payMethod === 'UPI' ? 'UPI UTR / Transaction Ref ID:' : 'Cash Memo / Receipt Note (Optional):'}
              </label>
              <input 
                type="text"
                placeholder={payMethod === 'UPI' ? 'e.g. 2026102688419' : 'e.g. Received at doorstep by driver Suresh'}
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Notes / Audit Remark:
              </label>
              <input 
                type="text"
                placeholder="e.g. Customer paid in full upon delivery"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button 
                type="button"
                onClick={() => setRecordingPaymentOrder(null)}
                className="btn btn-secondary"
                disabled={isSubmittingPay}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn btn-primary"
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                disabled={isSubmittingPay}
              >
                {isSubmittingPay ? 'Recording...' : 'Submit Payment Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}

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

            {/* Direct Payment History for this Order */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                  Direct Payment Records
                </h4>
                {selectedOrder.paymentStatus !== 'Paid' && (
                  <button
                    onClick={() => handleOpenRecordPayment(selectedOrder)}
                    className="btn btn-sm"
                    style={{ backgroundColor: '#10b981', color: '#ffffff', fontSize: '0.75rem', padding: '4px 8px', gap: '4px' }}
                  >
                    <CreditCard size={12} /> Log Payment
                  </button>
                )}
              </div>

              {getOrderPayments(selectedOrder.orderId).length === 0 ? (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  No payments recorded yet for this order. Payment method chosen: <strong>{selectedOrder.paymentMethod || 'Cash'}</strong>.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {getOrderPayments(selectedOrder.orderId).map(p => (
                    <div 
                      key={p.paymentId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: p.status === 'Verified' ? '#f0fdf4' : '#ffffff',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div>
                        <strong>{formatCurrency(p.amount)}</strong> via <span style={{ fontWeight: 600, color: '#0284c7' }}>{p.method}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Ref: {p.reference || 'None'} • {formatDateTime(p.paidAt)}
                        </div>
                      </div>
                      <span 
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: p.status === 'Verified' ? '#dcfce7' : '#fef3c7',
                          color: p.status === 'Verified' ? '#15803d' : '#b45309'
                        }}
                      >
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Delete Completed Order */}
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
