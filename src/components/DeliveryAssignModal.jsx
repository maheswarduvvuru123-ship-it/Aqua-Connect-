import React, { useState } from 'react';
import Modal from './Modal';
import { Truck, Clock, User, CheckCircle2 } from 'lucide-react';
import { assignOrderDelivery, updateOrderStatus } from '../services/firestoreData';
import { useNotifications } from '../context/NotificationContext';

const DEFAULT_DRIVERS = [
  'Mahesh (Truck #1 - Route Gachibowli)',
  'Suresh (Mini-Van #2 - Route Madhapur)',
  'Ravi (E-Rickshaw #3 - Route Jubilee Hills)',
  'Kiran (Pickup #4 - Express)'
];

const DeliveryAssignModal = ({ isOpen, onClose, order }) => {
  const { showToast } = useNotifications();
  const [driver, setDriver] = useState(DEFAULT_DRIVERS[0]);
  const [customDriver, setCustomDriver] = useState('');
  const [expectedTime, setExpectedTime] = useState('Within 1 - 2 hours');
  const [startDeliveryNow, setStartDeliveryNow] = useState(true);

  if (!order) return null;

  const handleAssign = (e) => {
    e.preventDefault();
    const finalDriver = driver === 'custom' ? customDriver : driver;

    if (!finalDriver) {
      showToast('Please select or specify a delivery person', 'error');
      return;
    }

    try {
      assignOrderDelivery(order.orderId, finalDriver, expectedTime);

      if (startDeliveryNow && order.orderStatus !== 'Out for Delivery') {
        updateOrderStatus(
          order.orderId, 
          'Out for Delivery', 
          `Assigned to ${finalDriver}. Estimated arrival: ${expectedTime}`
        );
        showToast(`Order #${order.orderId} assigned to ${finalDriver} and marked Out for Delivery! 🚚`, 'success');
      } else {
        showToast(`Delivery person assigned to Order #${order.orderId}`, 'success');
      }

      onClose();
    } catch (err) {
      showToast(`Failed to assign delivery: ${err.message}`, 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Delivery - Order #${order.orderId}`}>
      <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Order summary pill */}
        <div 
          style={{
            padding: '14px',
            backgroundColor: '#f0f9ff',
            borderRadius: '12px',
            border: '1px solid #bae6fd',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1' }}>
            Customer: {order.customerName} ({order.customerPhone})
          </div>
          <div style={{ fontSize: '0.8rem', color: '#475569' }}>
            📍 {order.deliveryAddress}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
            Items: {order.items?.map(i => `${i.name} (Qty: ${i.quantity})`).join(', ')}
          </div>
        </div>

        {/* Driver selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
            Select Delivery Driver / Vehicle
          </label>
          <select
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              backgroundColor: '#ffffff',
              fontSize: '0.9rem'
            }}
          >
            {DEFAULT_DRIVERS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="custom">+ Add other driver / vehicle...</option>
          </select>

          {driver === 'custom' && (
            <input 
              type="text"
              placeholder="Enter driver name & phone / vehicle number"
              value={customDriver}
              onChange={(e) => setCustomDriver(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                marginTop: '8px',
                fontSize: '0.9rem'
              }}
            />
          )}
        </div>

        {/* Expected delivery window */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
            Expected Delivery Time / Slot
          </label>
          <input 
            type="text"
            value={expectedTime}
            onChange={(e) => setExpectedTime(e.target.value)}
            placeholder="e.g. 03:30 PM or Within 45 mins"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Checkbox to also move order to Out for Delivery */}
        <label 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            color: '#1e293b',
            cursor: 'pointer',
            marginTop: '4px'
          }}
        >
          <input 
            type="checkbox"
            checked={startDeliveryNow}
            onChange={(e) => setStartDeliveryNow(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
          />
          Automatically mark order status as <strong>"Out for Delivery"</strong> now
        </label>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <Truck size={18} /> Confirm & Dispatch
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DeliveryAssignModal;
