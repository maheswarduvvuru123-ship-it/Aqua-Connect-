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
import { setDoc, addNotification, getDoc } from '../services/firestoreData';
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

      const surroundingSuppliers = findSurroundingSuppliers(deliveryInfo.address, currentUser?.city);
      const allSuppliers = (getCollection('users') || []).filter(u => u.role === 'supplier');
      const targetSupplier = surroundingSuppliers.length > 0 ? surroundingSuppliers[0] : (allSuppliers.length > 0 ? allSuppliers[0] : null);
      const targetSupplierId = targetSupplier?.uid || targetSupplier?.id || cartItems[0]?.supplierId || 'sup_001';
      const plantName = targetSupplier?.name || targetSupplier?.businessName || 'AquaConnect Certified Water Plant';

      const newOrder = {
        orderId: newOrderId,
        customerId: currentUser?.uid || 'cust_guest',
        customerName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Customer',
        customerPhone: currentUser?.phone || '',
        supplierId: targetSupplierId,
        plantName: plantName,
        items: cartItems.map(i => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          unit: i.unit || ''
        })),
        totalAmount: grandTotal,
        deliveryAddress: deliveryInfo.address,
        deliveryDate: deliveryInfo.deliveryDate,
        deliveryTime: deliveryInfo.deliverySlot,
        deliveryPerson: 'Unassigned',
        paymentMethod: deliveryInfo.paymentMethod,
        paymentStatus: deliveryInfo.paymentMethod === 'UPI' ? 'Paid' : 'Pending',
        orderStatus: 'Pending',
        timeline: [
          {
            status: 'Order Placed',
            time: new Date().toISOString(),
            note: `Order placed via Customer Portal. Payment: ${deliveryInfo.paymentMethod}`
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save order to Firestore
      setDoc('orders', 'orderId', newOrder);

      // Create delivery record
      setDoc('deliveries', 'deliveryId', {
        deliveryId: `del_${Date.now()}`,
        orderId: newOrderId,
        supplierId: targetSupplierId,
        customerId: currentUser?.uid || 'cust_guest',
        customerName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Customer',
        customerPhone: currentUser?.phone || '',
        deliveryPersonId: null,
        deliveryPersonName: 'Unassigned',
        deliveryAddress: deliveryInfo.address,
        productSummary: cartItems.map(i => `${i.name} × ${i.quantity}`).join(', '),
        status: 'Pending',
        expectedDeliveryTime: deliveryInfo.deliverySlot,
        assignedAt: null,
        deliveredAt: null
      });

      // Notify Supplier of new order
      addNotification({
        userId: targetSupplierId,
        role: 'supplier',
        title: 'New Water Order Received! 💧',
        message: `${currentUser?.name || currentUser?.email || 'Customer'} placed order #${newOrderId} for ${formatCurrency(grandTotal)}.`,
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
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '8px',
                          objectFit: 'cover'
                        }}
                      />
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
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>GPay, PhonePe, Paytm, BHIM</div>
                    </div>
                  </label>

                  {/* Online Payment */}
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
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Credit / Debit Card</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cards & Netbanking gateway</div>
                    </div>
                  </label>
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
