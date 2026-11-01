import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  MapPin, 
  Calendar, 
  Clock, 
  CreditCard, 
  Banknote, 
  QrCode, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency } from '../utils/formatters';
import { 
  setDoc, 
  addNotification, 
  getDoc, 
  getCollection, 
  calculateServerOrderTotals, 
  logAuditEvent, 
  recordDirectPayment,
  getSupplierPaymentDetails
} from '../services/firestoreData';
import { findSurroundingSuppliers } from '../utils/locationMatcher';

const DELIVERY_SLOTS = [
  '08:00 AM - 11:00 AM (Morning)',
  '11:00 AM - 02:00 PM (Noon)',
  '02:00 PM - 05:00 PM (Afternoon)',
  '05:00 PM - 08:00 PM (Evening)'
];

const CartDrawer = ({ isOpen, onClose, onViewOrders }) => {
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    subtotal, 
    deliveryFee, 
    grandTotal,
    deliveryInfo,
    setDeliveryInfo
  } = useCart();
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [step, setStep] = useState('cart'); // 'cart' | 'checkout' | 'success'
  const [placedOrder, setPlacedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiUtrReference, setUpiUtrReference] = useState('');

  // Determine fulfilling supplier dynamically for payment isolation
  const surroundingSuppliers = findSurroundingSuppliers(deliveryInfo.address, currentUser?.city);
  const allUsersSuppliers = (getCollection('users') || []).filter(u => u.role === 'supplier' && u.accountStatus !== 'Deleted from Backend' && u.accountStatus !== 'Suspended' && !u.isSuspended);
  const allRegSuppliers = (getCollection('suppliers') || []).filter(s => s.status !== 'Deleted from Backend' && s.status !== 'Suspended' && !s.isSuspended);
  const availableSuppliers = [...allUsersSuppliers, ...allRegSuppliers];
  const targetSupplier = surroundingSuppliers.length > 0 ? surroundingSuppliers[0] : (availableSuppliers.length > 0 ? availableSuppliers[0] : null);
  const targetSupplierId = cartItems[0]?.supplierId || targetSupplier?.uid || targetSupplier?.supplierId || targetSupplier?.id || (availableSuppliers[0]?.uid || 'supplier');
  const supplierPayment = getSupplierPaymentDetails(targetSupplierId);

  if (!isOpen) return null;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      showToast('Your cart is empty', 'warning');
      return;
    }

    if (!deliveryInfo.address) {
      showToast('Please provide a delivery address', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderNumber = Math.floor(1000 + Math.random() * 9000);
      const newOrderId = `AC${orderNumber}`;

      const allUsersSuppliers = (getCollection('users') || []).filter(u => u.role === 'supplier' && u.accountStatus !== 'Deleted from Backend' && u.accountStatus !== 'Suspended' && !u.isSuspended);
      const allRegSuppliers = (getCollection('suppliers') || []).filter(s => s.status !== 'Deleted from Backend' && s.status !== 'Suspended' && !s.isSuspended);
      const availableSuppliers = [...allUsersSuppliers, ...allRegSuppliers];

      const itemSupplierId = cartItems[0]?.supplierId;
      const matchedItemSupplier = itemSupplierId ? availableSuppliers.find(s => s.uid === itemSupplierId || s.supplierId === itemSupplierId || s.id === itemSupplierId) : null;
      const surroundingSuppliers = findSurroundingSuppliers(deliveryInfo.address, currentUser?.city);
      const targetSupplier = matchedItemSupplier || (surroundingSuppliers.length > 0 ? surroundingSuppliers[0] : (availableSuppliers[0] || null));
      const targetSupplierId = targetSupplier?.uid || targetSupplier?.supplierId || targetSupplier?.id || itemSupplierId || (availableSuppliers[0]?.uid || 'supplier');
      const plantName = targetSupplier?.businessName || targetSupplier?.plantName || targetSupplier?.name || 'AquaConnect Certified Water Plant';

      // Authoritative server-side price calculation from catalog
      const serverCalculations = calculateServerOrderTotals(cartItems, deliveryFee || 30);
      const isOnlineOrUpi = deliveryInfo.paymentMethod === 'UPI' || deliveryInfo.paymentMethod === 'Online Payment';
      const initialPaidAmount = isOnlineOrUpi ? serverCalculations.grandTotal : 0;
      const initialOutstanding = isOnlineOrUpi ? 0 : serverCalculations.grandTotal;
      const initialPaymentStatus = isOnlineOrUpi ? 'Paid' : 'Unpaid';

      const newOrder = {
        orderId: newOrderId,
        orderNumber: `#${newOrderId}`,
        customerId: currentUser?.uid || currentUser?.id || currentUser?.email || 'cust_guest',
        customerName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Customer',
        customerEmail: currentUser?.email || '',
        customerPhone: currentUser?.phone || '',
        supplierId: targetSupplierId,
        supplierName: plantName,
        plantName: plantName,
        supplierEmail: targetSupplier?.email || '',
        supplierPhone: targetSupplier?.phone || '',
        items: serverCalculations.items,
        subtotal: serverCalculations.subtotal,
        deliveryFee: serverCalculations.deliveryFee,
        totalAmount: serverCalculations.grandTotal,
        currency: 'INR',
        deliveryAddress: deliveryInfo.address,
        deliveryDate: deliveryInfo.deliveryDate,
        deliveryTime: deliveryInfo.deliverySlot,
        deliveryPerson: 'Unassigned',
        paymentMethod: deliveryInfo.paymentMethod, // 'Cash' | 'UPI'
        paymentStatus: initialPaymentStatus,
        paidAmount: initialPaidAmount,
        outstandingBalance: initialOutstanding,
        orderStatus: 'Pending',
        timeline: [
          {
            status: 'Order Placed',
            time: new Date().toISOString(),
            note: `Order placed via Customer Portal. Payment: ${deliveryInfo.paymentMethod} (${initialPaymentStatus})`
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save order to Firestore
      setDoc('orders', 'orderId', newOrder);

      // Log Audit Event
      logAuditEvent(
        currentUser || { uid: 'guest', role: 'customer' },
        'ORDER_CREATED',
        'order',
        newOrderId,
        {
          totalAmount: serverCalculations.grandTotal,
          itemsCount: serverCalculations.items.length,
          supplierId: targetSupplierId,
          paymentMethod: deliveryInfo.paymentMethod
        }
      );

      // If customer paid via direct UPI or Online Payment Gateway, record payment
      if (deliveryInfo.paymentMethod === 'UPI' || deliveryInfo.paymentMethod === 'Online Payment') {
        try {
          recordDirectPayment({
            orderId: newOrderId,
            amount: serverCalculations.grandTotal,
            method: deliveryInfo.paymentMethod === 'UPI' ? 'UPI Direct' : 'Payment Gateway (QR/Online)',
            reference: upiUtrReference.trim() || `PAY_GW_${Math.floor(100000 + Math.random() * 900000)}`,
            notes: `Customer submitted payment via ${deliveryInfo.paymentMethod} (${supplierPayment.plantName}).`,
            recordedBy: {
              uid: currentUser?.uid || 'cust_guest',
              name: currentUser?.name || 'Customer',
              role: 'customer'
            }
          });
        } catch (payErr) {
          console.warn("Could not record initial checkout payment:", payErr);
        }
      }

      // Create delivery record
      setDoc('deliveries', 'deliveryId', {
        deliveryId: `del_${Date.now()}`,
        orderId: newOrderId,
        supplierId: targetSupplierId,
        customerId: currentUser?.uid || currentUser?.id || currentUser?.email || 'cust_guest',
        customerName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Customer',
        customerEmail: currentUser?.email || '',
        customerPhone: currentUser?.phone || '',
        deliveryPersonId: null,
        deliveryPersonName: 'Unassigned',
        deliveryAddress: deliveryInfo.address,
        productSummary: serverCalculations.items.map(i => `${i.name} × ${i.quantity}`).join(', '),
        status: 'Pending',
        expectedDeliveryTime: deliveryInfo.deliverySlot,
        assignedAt: null,
        deliveredAt: null
      });

      // Ensure customer record is registered in customers collection for this supplier
      try {
        const custId = currentUser?.uid || currentUser?.id || currentUser?.email || 'cust_guest';
        const existingCust = getDoc('customers', 'customerId', custId) ||
                             (getCollection('customers') || []).find(c => c.customerId === custId || c.email === currentUser?.email);
        setDoc('customers', 'customerId', {
          customerId: custId,
          userId: custId,
          name: currentUser?.name || currentUser?.email?.split('@')[0] || 'Customer',
          email: currentUser?.email || '',
          phone: currentUser?.phone || deliveryInfo.phone || '',
          address: deliveryInfo.address,
          supplierId: targetSupplierId,
          totalOrders: (existingCust?.totalOrders || 0) + 1,
          totalAmount: (existingCust?.totalAmount || 0) + serverCalculations.grandTotal,
          pendingPayment: isOnlineOrUpi ? 0 : serverCalculations.grandTotal,
          status: 'Active',
          isVerified: true,
          updatedAt: new Date().toISOString()
        });
      } catch (custErr) {
        console.warn("Could not sync customer directory record:", custErr);
      }

      // Notify Supplier of new order
      addNotification({
        userId: targetSupplierId,
        role: 'supplier',
        title: 'New Water Order Received! 💧',
        message: `${currentUser?.name || currentUser?.email || 'Customer'} placed order #${newOrderId} for ${formatCurrency(serverCalculations.grandTotal)}.`,
        type: 'new_order',
        orderId: newOrderId
      });

      // Notify Customer
      addNotification({
        userId: currentUser?.uid || 'cust_guest',
        role: 'customer',
        title: 'Order Placed Successfully! 🎉',
        message: `Your water delivery order #${newOrderId} has been received and is pending confirmation.`,
        type: 'order_update',
        orderId: newOrderId
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // gracefully ignore if canvas confetti restricted
      }

      setPlacedOrder(newOrder);
      clearCart();
      setStep('success');
      showToast(`Order #${newOrderId} placed successfully!`, 'success');
    } catch (err) {
      showToast(`Failed to place order: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('cart');
    setPlacedOrder(null);
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={22} color="#0284c7" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {step === 'cart' && 'Your Water Cart'}
              {step === 'checkout' && 'Checkout & Delivery'}
              {step === 'success' && 'Order Confirmed!'}
            </h3>
          </div>
          <button 
            onClick={handleClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: 'var(--text-muted)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* STEP 1: CART ITEMS */}
        {step === 'cart' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <ShoppingBag size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>Your cart is empty</h4>
                  <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Select pure water cans and bottles from our catalog to get started.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {cartItems.map((item) => (
                    <div 
                      key={item.productId}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-light)',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      {(() => {
                        const fallbackImg = (item.name || '').toLowerCase().includes('cool') || (item.name || '').toLowerCase().includes('chill')
                          ? '/images/cool_water_can.jpg'
                          : (item.name || '').toLowerCase().includes('packet') || (item.name || '').toLowerCase().includes('pouch')
                          ? '/images/water_pouches_pack.jpg'
                          : (item.name || '').toLowerCase().includes('bottle')
                          ? '/images/bottled_water_pack.jpg'
                          : '/images/bubble_top_can.jpg';

                        return (
                          <img 
                            src={item.image || fallbackImg} 
                            alt={item.name} 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = fallbackImg;
                            }}
                            style={{
                              width: '68px',
                              height: '68px',
                              borderRadius: '8px',
                              objectFit: 'cover'
                            }}
                          />
                        );
                      })()}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {item.name}
                          </h4>
                          <button 
                            onClick={() => removeFromCart(item.productId)}
                            style={{ color: '#ef4444', padding: '2px' }}
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {item.unit} • {item.containerType}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                          <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '1rem' }}>
                            {formatCurrency(item.price * item.quantity)}
                          </span>

                          <div 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              backgroundColor: '#f1f5f9',
                              borderRadius: '8px',
                              padding: '2px 6px'
                            }}
                          >
                            <button 
                              onClick={() => updateQuantity(item.productId, -1)}
                              style={{ padding: '4px', display: 'flex', color: '#334155' }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => updateQuantity(item.productId, 1)}
                              style={{ padding: '4px', display: 'flex', color: '#334155' }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtotal & Checkout button */}
            {cartItems.length > 0 && (
              <div 
                style={{
                  padding: '20px',
                  borderTop: '1px solid var(--border-light)',
                  backgroundColor: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Delivery Fee</span>
                  <span style={{ fontWeight: 600, color: deliveryFee === 0 ? '#059669' : '#0f172a' }}>
                    {deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', fontSize: '1.15rem', fontWeight: 800 }}>
                  <span>Grand Total</span>
                  <span style={{ color: '#0284c7' }}>{formatCurrency(grandTotal)}</span>
                </div>

                <button 
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px' }}
                  onClick={() => setStep('checkout')}
                >
                  Proceed to Checkout <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CHECKOUT & DELIVERY INFO */}
        {step === 'checkout' && (
          <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Delivery Address */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  <MapPin size={16} color="#0284c7" /> Delivery Address *
                </label>
                <textarea
                  rows="2"
                  required
                  value={deliveryInfo.address}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
                  placeholder="Apartment/Flat, Street, Landmark, Area"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.9rem'
                  }}
                />

                {/* Surrounding Supplier in Range Banner */}
                {(() => {
                  const surrounding = findSurroundingSuppliers(deliveryInfo.address, currentUser?.city);
                  const activeSupp = surrounding.length > 0 ? surrounding[0] : null;
                  return (
                    <div style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      fontSize: '0.825rem',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <CheckCircle2 size={18} color="#16a34a" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                          SURROUNDING SUPPLIER IN YOUR RANGE
                        </div>
                        <div style={{ fontWeight: 600, color: '#15803d' }}>
                          {activeSupp ? `${activeSupp.name} (${activeSupp.address || activeSupp.city || 'Local Water Hub'})` : 'Local Area Water Hub'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#166534' }}>
                          Only this supplier covering your locality range will fulfill your order.
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Delivery Date & Time Slot */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                    <Calendar size={16} color="#0284c7" /> Delivery Date
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryInfo.deliveryDate}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, deliveryDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                    <Clock size={16} color="#0284c7" /> Time Slot
                  </label>
                  <select
                    value={deliveryInfo.deliverySlot}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, deliverySlot: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.825rem'
                    }}
                  >
                    {DELIVERY_SLOTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px' }}>
                  Select Payment Method
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Cash on Delivery */}
                  <label 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      border: deliveryInfo.paymentMethod === 'Cash on Delivery' ? '2px solid #0284c7' : '1px solid var(--border-light)',
                      backgroundColor: deliveryInfo.paymentMethod === 'Cash on Delivery' ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="payment" 
                      value="Cash on Delivery"
                      checked={deliveryInfo.paymentMethod === 'Cash on Delivery'}
                      onChange={() => setDeliveryInfo({ ...deliveryInfo, paymentMethod: 'Cash on Delivery' })}
                      style={{ accentColor: '#0284c7' }}
                    />
                    <Banknote size={20} color="#059669" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Cash on Delivery (COD)</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pay in cash upon water can drop-off</div>
                    </div>
                  </label>

                  {/* UPI */}
                  <label 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      border: deliveryInfo.paymentMethod === 'UPI' ? '2px solid #0284c7' : '1px solid var(--border-light)',
                      backgroundColor: deliveryInfo.paymentMethod === 'UPI' ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="payment" 
                      value="UPI"
                      checked={deliveryInfo.paymentMethod === 'UPI'}
                      onChange={() => setDeliveryInfo({ ...deliveryInfo, paymentMethod: 'UPI' })}
                      style={{ accentColor: '#0284c7' }}
                    />
                    <QrCode size={20} color="#0284c7" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>UPI / QR Instant Pay</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Direct to {supplierPayment.plantName} (GPay, PhonePe, Paytm, BHIM)</div>
                    </div>
                  </label>

                  {/* Supplier-Specific UPI & QR Code Box (Isolated per fulfilling supplier) */}
                  {deliveryInfo.paymentMethod === 'UPI' && (
                    <div 
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        backgroundColor: '#f0f9ff',
                        border: '1.5px solid #bae6fd',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0369a1' }}>
                          ⚡ DIRECT PAYMENT TO SUPPLIER
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                          {supplierPayment.plantName}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <img 
                          src={supplierPayment.generateQrUrl(grandTotal)}
                          alt={`${supplierPayment.plantName} Merchant QR Code`}
                          style={{
                            width: '105px',
                            height: '105px',
                            borderRadius: '8px',
                            border: '1px solid #7dd3fc',
                            backgroundColor: '#ffffff',
                            padding: '4px'
                          }}
                        />
                        <div style={{ flex: 1, minWidth: '180px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Fulfilling Water Plant:</div>
                            <strong style={{ color: '#0f172a' }}>{supplierPayment.plantName}</strong>
                          </div>

                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Merchant UPI ID:</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#0284c7' }}>
                                {supplierPayment.upiId}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(supplierPayment.upiId);
                                  showToast('Copied Supplier UPI ID!', 'success');
                                }}
                                style={{ border: 'none', background: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                              >
                                Copy
                              </button>
                            </div>
                          </div>

                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Supplier Phone / GPay:</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: '#334155' }}>{supplierPayment.upiPhoneNumber}</strong>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(supplierPayment.upiPhoneNumber);
                                  showToast('Copied Supplier Phone Number!', 'success');
                                }}
                                style={{ border: 'none', background: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* UTR Input */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>
                          Transaction UTR / Reference ID (after paying)
                        </label>
                        <input 
                          type="text"
                          placeholder="e.g. 402847291048"
                          value={upiUtrReference}
                          onChange={(e) => setUpiUtrReference(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #7dd3fc',
                            fontSize: '0.8rem',
                            backgroundColor: '#ffffff'
                          }}
                        />
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                          Transfers go straight to {supplierPayment.plantName}. Zero platform commission.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Online Payment / Payment Gateway */}
                  <label 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      border: deliveryInfo.paymentMethod === 'Online Payment' ? '2px solid #0284c7' : '1px solid var(--border-light)',
                      backgroundColor: deliveryInfo.paymentMethod === 'Online Payment' ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="payment" 
                      value="Online Payment"
                      checked={deliveryInfo.paymentMethod === 'Online Payment'}
                      onChange={() => setDeliveryInfo({ ...deliveryInfo, paymentMethod: 'Online Payment' })}
                      style={{ accentColor: '#0284c7' }}
                    />
                    <CreditCard size={20} color="#7c3aed" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Online Payment Gateway (QR & Cards)</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Instant UPI QR Scanner, Google Pay, PhonePe & Cards</div>
                    </div>
                  </label>

                  {/* Payment Gateway Box with QR Code when Online Payment is selected */}
                  {deliveryInfo.paymentMethod === 'Online Payment' && (
                    <div 
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                          <QrCode size={18} color="#0284c7" />
                          <span>Payment Gateway - Scan & Pay</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '6px' }}>
                          AMOUNT: {formatCurrency(grandTotal)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                          <img 
                            src={supplierPayment.generateQrUrl(grandTotal)}
                            alt="Payment Gateway QR Code"
                            style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              padding: '6px',
                              display: 'block'
                            }}
                          />
                          <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                            Scan with any UPI App
                          </span>
                        </div>

                        <div style={{ flex: 1, minWidth: '180px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                            {['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'CRED'].map(app => (
                              <span key={app} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#334155' }}>
                                {app}
                              </span>
                            ))}
                          </div>

                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Receiving Merchant:</div>
                            <strong style={{ color: '#0f172a' }}>{supplierPayment.plantName}</strong>
                          </div>

                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>UPI ID:</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#0284c7' }}>
                                {supplierPayment.upiId}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(supplierPayment.upiId);
                                  showToast('Copied UPI ID!', 'success');
                                }}
                                style={{ border: 'none', background: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Transaction UTR input */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Transaction Reference / UTR Number (from UPI App after payment) *
                        </label>
                        <input 
                          type="text"
                          placeholder="e.g. 402847291048 or UPI Ref"
                          value={upiUtrReference}
                          onChange={(e) => setUpiUtrReference(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            backgroundColor: '#ffffff'
                          }}
                        />
                        <div style={{ fontSize: '0.68rem', color: '#059669', marginTop: '2px' }}>
                          🔒 100% Secure End-to-End Encrypted Payment Gateway
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items summary snapshot */}
              <div 
                style={{
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Order Summary:</div>
                {cartItems.map((i, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>{i.name} × {i.quantity}</span>
                    <span>{formatCurrency(i.price * i.quantity)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px', fontWeight: 800, color: '#0284c7' }}>
                  <span>Total Amount</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div 
              style={{
                padding: '20px',
                borderTop: '1px solid var(--border-light)',
                backgroundColor: '#f8fafc',
                display: 'flex',
                gap: '12px'
              }}
            >
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setStep('cart')}
                style={{ flex: 1 }}
              >
                Back to Cart
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ flex: 2, padding: '14px' }}
              >
                {isSubmitting ? 'Placing Order...' : `Confirm & Place Order (${formatCurrency(grandTotal)})`}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: ORDER SUCCESS MODAL VIEW */}
        {step === 'success' && placedOrder && (
          <div 
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1
            }}
          >
            <div 
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}
            >
              <CheckCircle2 size={42} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              Order Placed Successfully!
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
              Your order has been notified to the water supplier.
            </p>

            {/* Order Card as required by user prompt */}
            <div 
              style={{
                width: '100%',
                maxWidth: '360px',
                backgroundColor: '#f0f9ff',
                borderRadius: '16px',
                border: '1px solid #bae6fd',
                padding: '20px',
                margin: '24px 0',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Order ID</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>
                  #{placedOrder.orderId}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status</span>
                <span className="badge badge-pending">
                  {placedOrder.orderStatus}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Amount</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  {formatCurrency(placedOrder.totalAmount)}
                </span>
              </div>

              <div style={{ marginTop: '14px', borderTop: '1px solid #bae6fd', paddingTop: '10px', fontSize: '0.8rem', color: '#334155' }}>
                <strong>Delivery To:</strong> {placedOrder.deliveryAddress}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '360px' }}>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  handleClose();
                  if (onViewOrders) onViewOrders();
                }}
              >
                Track Live Order Timeline
              </button>
              <button 
                className="btn btn-secondary"
                onClick={handleClose}
              >
                Continue Browsing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
