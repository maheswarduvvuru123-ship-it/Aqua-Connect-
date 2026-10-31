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
  Trash2,
  QrCode,
  X
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import OrderTimeline from '../../components/OrderTimeline';
import EmptyState from '../../components/EmptyState';
import InvoiceModal from '../../components/InvoiceModal';
import { useAuth } from '../../context/AuthContext';
import { 
  getCollection, 
  updateOrderStatus, 
  deleteDoc, 
  subscribeToData, 
  calculateOutstandingBalance, 
  getOrderPayments,
  recordDirectPayment,
  getSupplierPaymentDetails
} from '../../services/firestoreData';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';

const CustomerOrders = ({ onBrowseMore }) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'previous' | 'cancelled'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [qrModalOrder, setQrModalOrder] = useState(null);
  const [paymentUtr, setPaymentUtr] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const loadOrders = () => {
    if (!currentUser) {
      setOrders([]);
      return;
    }
    const all = getCollection('orders') || [];
    const myUid = String(currentUser.uid || currentUser.id || '').trim();
    const myEmail = (currentUser.email || '').toLowerCase().trim();

    // Strict Account Isolation: Only show orders belonging exclusively to this customer
    const myOrders = all.filter(o => {
      if (!o) return false;
      const orderCustId = String(o.customerId || '').trim();
      const orderEmail = (o.customerEmail || '').toLowerCase().trim();

      const matchesUid = Boolean(myUid && orderCustId === myUid);
      const matchesEmail = Boolean(myEmail && (orderEmail === myEmail || orderCustId === myEmail));

      return Boolean(matchesUid || matchesEmail);
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

  const handleConfirmDelivered = (orderId) => {
    try {
      updateOrderStatus(orderId, 'Delivered', 'Water delivery verified & confirmed by customer', currentUser);
      showToast(`🎉 Order #${orderId} marked as Delivered! Thank you!`, 'success');
      loadOrders();
      // Switch to Past Orders tab so user can see the delivered order
      setTimeout(() => setActiveTab('previous'), 400);
    } catch (err) {
      showToast(`Failed to update status: ${err.message}`, 'error');
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

  const handleConfirmDirectPayment = () => {
    if (!qrModalOrder) return;
    setIsSubmittingPay(true);
    try {
      const generatedRef = paymentUtr.trim() || `UPI-${Date.now().toString().slice(-6)}`;
      recordDirectPayment({
        orderId: qrModalOrder.orderId,
        amount: Number(qrModalOrder.amount),
        method: 'UPI',
        reference: generatedRef,
        referenceNumber: generatedRef,
        notes: 'Submitted via customer Pay via QR gateway',
        recordedBy: currentUser || { uid: 'customer', name: 'Customer' },
        recordedByName: currentUser?.name || currentUser?.displayName || 'Customer'
      });

      showToast(`Payment of ${formatCurrency(qrModalOrder.amount)} recorded! Ref: ${generatedRef}`, 'success');
      setQrModalOrder(null);
      setPaymentUtr('');
      loadOrders();
    } catch (err) {
      showToast(`Payment failed: ${err.message}`, 'error');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Categorize orders (Section 15 requirements: Current, Previous, Cancelled, All)
  const currentOrders = orders.filter(o => 
    ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(o.orderStatus)
  );
  const previousOrders = orders.filter(o => o.orderStatus === 'Delivered');
  const cancelledOrders = orders.filter(o => o.orderStatus === 'Cancelled');

  // If customer is on "Active Deliveries" (current) tab, but has no active orders and has delivered orders,
  // gracefully fall back to showing the delivered orders so the user never sees an empty screen after delivery!
  const isShowingDeliveredFallback = activeTab === 'current' && currentOrders.length === 0 && previousOrders.length > 0;

  const displayedOrders = 
    activeTab === 'current' ? (isShowingDeliveredFallback ? previousOrders : currentOrders) :
    activeTab === 'previous' ? previousOrders :
    activeTab === 'all' ? orders :
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

      {/* Tabs: Current orders, Previous orders, Cancelled orders, All orders (Section 15) */}
      <div 
        style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          width: 'fit-content',
          flexWrap: 'wrap'
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
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'all' ? 700 : 500,
            backgroundColor: activeTab === 'all' ? '#ffffff' : 'transparent',
            color: activeTab === 'all' ? '#0284c7' : '#64748b',
            boxShadow: activeTab === 'all' ? 'var(--shadow-sm)' : 'none',
            border: 'none',
            transition: 'all 0.15s ease'
          }}
        >
          All Orders ({orders.length})
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

      {/* Real-time Delivered Order Announcement Banner */}
      {isShowingDeliveredFallback && (
        <div 
          style={{
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>🎉</span>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>
                Your Water Order Was Delivered Successfully!
              </div>
              <div style={{ fontSize: '0.82rem', color: '#166534', marginTop: '2px' }}>
                The water supplier completed delivery to your address. View order details and download your tax receipt below.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            All Orders ({orders.length}) →
          </button>
        </div>
      )}

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
            const orderBalance = calculateOutstandingBalance(order.orderId);
            const orderPayments = getOrderPayments(order.orderId);

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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', marginTop: '2px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        fontWeight: 700,
                        backgroundColor: '#dcfce7',
                        color: '#166534'
                      }}>
                        {order.paymentMethod || 'Direct'} • Paid
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                        ✓ Payment Received
                      </span>
                    </div>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {order.items?.map((item, idx) => {
                      const itemImg = item.image || (
                        (item.name || '').toLowerCase().includes('cool') ? '/images/cool_water_can.jpg' :
                        (item.name || '').toLowerCase().includes('packet') ? '/images/water_pouches_pack.jpg' :
                        (item.name || '').toLowerCase().includes('bottle') ? '/images/bottled_water_pack.jpg' :
                        '/images/bubble_top_can.jpg'
                      );

                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img 
                              src={itemImg} 
                              alt={item.name}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/images/bubble_top_can.jpg';
                              }}
                              style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                            />
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>
                              {item.name} × {item.quantity}
                            </span>
                          </div>
                          <span style={{ fontWeight: 600, color: '#475569' }}>
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      );
                    })}
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

                {/* Direct Payments History for this order */}
                {orderPayments.length > 0 && (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Direct Payments ({orderPayments.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {orderPayments.map((p, pIdx) => (
                        <div key={p.paymentId || pIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', flexWrap: 'wrap', gap: '6px', padding: '4px 0', borderBottom: pIdx < orderPayments.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                          <div>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(p.amount)}</span>
                            <span style={{ color: '#64748b', marginLeft: '6px' }}>via {p.method}</span>
                            {p.referenceNumber && (
                              <span style={{ color: '#0284c7', marginLeft: '8px', fontFamily: 'monospace', fontSize: '0.78rem' }}>Ref: {p.referenceNumber}</span>
                            )}
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            backgroundColor: p.verificationStatus === 'Verified' ? '#dcfce7' : p.verificationStatus === 'Disputed' ? '#fee2e2' : '#fef9c3',
                            color: p.verificationStatus === 'Verified' ? '#166534' : p.verificationStatus === 'Disputed' ? '#991b1b' : '#854d0e'
                          }}>
                            {p.verificationStatus === 'Verified' ? '✓ Verified' : p.verificationStatus === 'Disputed' ? '⚠️ Disputed' : '⏳ Pending Verification'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivered celebration banner */}
                {order.orderStatus === 'Delivered' && (
                  <div style={{
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem'
                  }}>
                    <CheckCircle2 size={18} /> Order Delivered & Handed Over! All 5 stages completed.
                  </div>
                )}

                {/* Live Order Timeline (Section 15: Order Placed -> Confirmed -> Preparing -> Out for Delivery -> Delivered) */}
                <div>
                  <OrderTimeline orderStatus={order.orderStatus} timeline={order.timeline} />
                </div>

                {/* Actions Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled' && (
                      <button 
                        className="btn btn-sm"
                        style={{ 
                          backgroundColor: '#16a34a', 
                          color: '#ffffff', 
                          borderColor: '#16a34a',
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          fontWeight: 700 
                        }}
                        onClick={() => handleConfirmDelivered(order.orderId)}
                        title="Mark delivery as complete once you receive water cans"
                      >
                        <CheckCircle2 size={15} /> Confirm Delivered (Water Received)
                      </button>
                    )}
                    {orderBalance.outstandingBalance > 0 && order.paymentStatus !== 'Paid' && order.orderStatus !== 'Cancelled' && (
                      <button 
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                        onClick={() => {
                          setQrModalOrder({
                            orderId: order.orderId,
                            supplierId: order.supplierId,
                            supplierName: order.plantName || order.supplierName,
                            amount: orderBalance.outstandingBalance
                          });
                          setPaymentUtr('');
                        }}
                      >
                        <QrCode size={15} /> Pay via QR ({formatCurrency(orderBalance.outstandingBalance)})
                      </button>
                    )}
                    {canCancel && (
                      <button 
                        className="btn btn-danger btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleCancelOrder(order.orderId)}
                      >
                        <XCircle size={15} /> Cancel Order
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#ef4444', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => handleDeleteOrder(order.orderId)}
                      title="Permanently remove this order record from history"
                    >
                      <Trash2 size={15} /> Delete Record
                    </button>
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

      {/* Pay via QR Code Gateway Modal */}
      {qrModalOrder && (() => {
        const supPay = getSupplierPaymentDetails(qrModalOrder.supplierId);
        const qrUrl = supPay.generateQrUrl(qrModalOrder.amount);

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setQrModalOrder(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>

              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  marginBottom: '8px'
                }}>
                  <QrCode size={24} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  UPI Payment Gateway
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Order #{qrModalOrder.orderId} • {supPay.plantName}
                </p>
              </div>

              {/* Amount to pay */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Amount Due:</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>
                  {formatCurrency(qrModalOrder.amount)}
                </div>
              </div>

              {/* QR Code display */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #0284c7',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)'
                }}>
                  <img 
                    src={qrUrl} 
                    alt="UPI Payment QR Code" 
                    style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }}
                  />
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>
                  Scan with any UPI App (GPay, PhonePe, Paytm, BHIM, Cred)
                </div>
              </div>

              {/* UPI ID copy pill */}
              <div style={{
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                marginBottom: '16px'
              }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>UPI ID:</span>
                <code style={{ color: '#0284c7', fontWeight: 700 }}>{supPay.upiId}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(supPay.upiId);
                    showToast('UPI ID copied to clipboard!', 'info');
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Copy
                </button>
              </div>

              {/* UTR Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  UPI Reference / UTR Number (Optional if scanned)
                </label>
                <input 
                  type="text" 
                  value={paymentUtr}
                  onChange={(e) => setPaymentUtr(e.target.value)}
                  placeholder="e.g. 402812345678 or UTR Number"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* Confirm button */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setQrModalOrder(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 2, backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                  onClick={handleConfirmDirectPayment}
                  disabled={isSubmittingPay}
                >
                  {isSubmittingPay ? 'Recording...' : '✓ I Have Paid'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CustomerOrders;
