import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  User, 
  Play, 
  UserPlus, 
  Check, 
  Search,
  AlertCircle
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import DeliveryAssignModal from '../../components/DeliveryAssignModal';
import { getCollection, updateOrderStatus, updateDoc, subscribeToData } from '../../services/firestoreData';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { filterOrdersForSupplier } from '../../utils/locationMatcher';

const TABS = [
  { id: 'all', label: "All Deliveries" },
  { id: 'today', label: "Today's Deliveries" },
  { id: 'pending', label: "Pending Assignment" },
  { id: 'assigned', label: "Assigned & Out" },
  { id: 'completed', label: "Completed" }
];

const SupplierDeliveries = () => {
  const { showToast } = useNotifications();
  const { currentUser } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState(null);

  const loadData = () => {
    const rawOrders = getCollection('orders') || [];
    const filteredOrders = filterOrdersForSupplier(
      rawOrders,
      currentUser?.uid,
      currentUser?.address,
      currentUser?.city,
      currentUser?.deliveryAreas || []
    );
    const orderIds = new Set(filteredOrders.map(o => o.orderId));
    const rawDeliveries = getCollection('deliveries') || [];
    const filteredDeliveries = rawDeliveries.filter(d => {
      // If delivery is stamped with another specific supplier's ID, do NOT leak to this supplier
      if (d.supplierId && d.supplierId !== 'supplier' && d.supplierId !== 'sup_001') {
        return d.supplierId === currentUser?.uid;
      }
      return orderIds.has(d.orderId);
    });

    setDeliveries(filteredDeliveries);
    setOrders(filteredOrders);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(() => loadData());
    return () => unsub();
  }, [currentUser]);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleStartDelivery = (orderId) => {
    try {
      updateOrderStatus(orderId, 'Out for Delivery', 'Driver departed from water plant');
      showToast(`Order #${orderId} is now Out for Delivery! 🚚`, 'success');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleMarkDelivered = (orderId) => {
    try {
      updateOrderStatus(orderId, 'Delivered', 'Water bottles delivered successfully to customer address');
      showToast(`Order #${orderId} marked as Delivered! 💧`, 'success');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Combine delivery data with orders
  const deliveryList = deliveries.map(del => {
    const matchedOrder = orders.find(o => o.orderId === del.orderId) || {};
    return {
      ...del,
      order: matchedOrder,
      items: matchedOrder.items || [],
      totalAmount: matchedOrder.totalAmount || 0,
      createdAt: matchedOrder.createdAt || del.assignedAt,
      deliveryStatus: matchedOrder.orderStatus || del.status
    };
  });

  // Filter deliveries based on tab
  const filteredDeliveries = deliveryList.filter(d => {
    const matchesSearch = 
      d.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.deliveryAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.deliveryPersonName?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'today') {
      return d.createdAt?.startsWith(todayStr) || d.order?.deliveryDate === todayStr;
    }
    if (activeTab === 'pending') {
      return d.deliveryStatus === 'Pending' || d.deliveryStatus === 'Confirmed' || !d.deliveryPersonName || d.deliveryPersonName === 'Unassigned';
    }
    if (activeTab === 'assigned') {
      return d.deliveryStatus === 'Preparing' || d.deliveryStatus === 'Out for Delivery';
    }
    if (activeTab === 'completed') {
      return d.deliveryStatus === 'Delivered';
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Delivery Fleet Management
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Schedule dispatches, assign delivery trucks/drivers, and mark drops completed.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div 
        className="glass-card"
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  backgroundColor: activeTab === tab.id ? '#0284c7' : '#f1f5f9',
                  color: activeTab === tab.id ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input 
              type="text"
              placeholder="Search driver, route, or order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Delivery Cards Grid */}
      {filteredDeliveries.length === 0 ? (
        <EmptyState 
          icon={Truck}
          title="No deliveries match this view"
          description="Deliveries created from customer orders will be listed here."
        />
      ) : (
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '18px'
          }}
        >
          {filteredDeliveries.map((delivery) => {
            const isDelivered = delivery.deliveryStatus === 'Delivered';
            const isOut = delivery.deliveryStatus === 'Out for Delivery';
            const isUnassigned = !delivery.deliveryPersonName || delivery.deliveryPersonName === 'Unassigned';

            return (
              <div 
                key={delivery.deliveryId}
                className="glass-card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderLeft: `5px solid ${isDelivered ? '#10b981' : isOut ? '#0284c7' : '#f59e0b'}`
                }}
              >
                <div>
                  {/* Card Header: Order ID & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0284c7' }}>
                        #{delivery.orderId}
                      </span>
                      <StatusBadge status={delivery.deliveryStatus} size="small" />
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      🕒 {delivery.expectedDeliveryTime || 'Slot: Regular'}
                    </div>
                  </div>

                  {/* Customer & Address */}
                  <div style={{ margin: '14px 0 10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                      {delivery.customerName}
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '2px' }}>
                      📞 {delivery.customerPhone}
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                      <MapPin size={15} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{delivery.deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Water Product & Quantity summary */}
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                    📦 {delivery.productSummary || delivery.items?.map(i => `${i.name} × ${i.quantity}`).join(', ')}
                  </div>

                  {/* Assigned driver info */}
                  <div style={{ fontSize: '0.825rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={15} color="#0284c7" />
                    <span>
                      Driver: <strong>{delivery.deliveryPersonName || 'Unassigned'}</strong>
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons (Section 8 requirements: Assign Delivery, Start Delivery, Mark Delivered) */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  {/* Button 1: Assign Delivery */}
                  <button 
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setSelectedOrderForAssign(delivery.order || { orderId: delivery.orderId, customerName: delivery.customerName, customerPhone: delivery.customerPhone, deliveryAddress: delivery.deliveryAddress })}
                  >
                    <UserPlus size={14} /> Assign
                  </button>

                  {/* Button 2: Start Delivery */}
                  {!isOut && !isDelivered && (
                    <button 
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handleStartDelivery(delivery.orderId)}
                    >
                      <Play size={14} /> Start Delivery
                    </button>
                  )}

                  {/* Button 3: Mark Delivered */}
                  {isOut && (
                    <button 
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, backgroundColor: '#059669', borderColor: '#059669' }}
                      onClick={() => handleMarkDelivered(delivery.orderId)}
                    >
                      <CheckCircle2 size={14} /> Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      {selectedOrderForAssign && (
        <DeliveryAssignModal 
          isOpen={Boolean(selectedOrderForAssign)}
          onClose={() => setSelectedOrderForAssign(null)}
          order={selectedOrderForAssign}
        />
      )}
    </div>
  );
};

export default SupplierDeliveries;
