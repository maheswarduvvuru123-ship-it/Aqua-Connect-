import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  IndianRupee, 
  Calendar, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  ArrowRight,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { getCollection, updateDoc, subscribeToData, deleteCustomer, deleteAllCustomers } from '../../services/firestoreData';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { filterCustomersForSupplier, filterOrdersForSupplier } from '../../utils/locationMatcher';

const SupplierCustomers = () => {
  const { showToast } = useNotifications();
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: 'single', customer: null });

  const loadData = () => {
    const rawCustomers = getCollection('customers');
    const customerUsers = getCollection('users').filter(u => u.role === 'customer');

    const custMap = new Map();
    rawCustomers.forEach(c => {
      const key = c.customerId || c.userId || c.id;
      if (key) custMap.set(key, c);
    });

    customerUsers.forEach(u => {
      const existing = custMap.get(u.uid);
      if (existing) {
        custMap.set(u.uid, {
          ...existing,
          name: u.name || existing.name,
          phone: u.phone || existing.phone || 'Not provided',
          address: u.address || existing.address || 'Not provided',
          email: u.email || existing.email
        });
      } else {
        custMap.set(u.uid, {
          customerId: u.uid,
          userId: u.uid,
          name: u.name || u.email?.split('@')[0],
          phone: u.phone || 'Not provided',
          email: u.email,
          address: u.address || 'Not provided',
          totalOrders: 0,
          totalAmount: 0,
          pendingPayment: 0,
          status: 'Active',
          createdAt: u.createdAt || new Date().toISOString()
        });
      }
    });

    const allCustomers = Array.from(custMap.values());
    const allOrders = getCollection('orders') || [];

    const myOrders = filterOrdersForSupplier(allOrders, currentUser?.uid, currentUser?.address, currentUser?.city);
    const myCustomers = filterCustomersForSupplier(allCustomers, allOrders, currentUser?.uid, currentUser?.address, currentUser?.city);

    setCustomers(myCustomers);
    setOrders(myOrders);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(() => loadData());
    return () => unsub();
  }, [currentUser]);

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Customer specific order history
  const customerOrders = selectedCustomer 
    ? orders.filter(o => o.customerId === selectedCustomer.customerId || o.customerId === selectedCustomer.userId)
    : [];

  const handleClearBalance = (customerId) => {
    updateDoc('customers', 'customerId', customerId, { pendingPayment: 0 });
    // Also mark related orders as paid
    customerOrders.forEach(o => {
      if (o.paymentStatus === 'Pending') {
        updateDoc('orders', 'orderId', o.orderId, { paymentStatus: 'Paid' });
      }
    });
    showToast('Pending balance cleared and marked as collected!', 'success');
    if (selectedCustomer) {
      setSelectedCustomer(prev => ({ ...prev, pendingPayment: 0 }));
    }
  };

  const handleExecuteDelete = () => {
    if (deleteConfirm.type === 'single' && deleteConfirm.customer) {
      const cust = deleteConfirm.customer;
      const custId = cust.customerId || cust.userId || cust.id;
      deleteCustomer(custId);
      showToast(`Customer "${cust.name}" deleted successfully!`, 'success');
      if (selectedCustomer && (selectedCustomer.customerId === custId || selectedCustomer.userId === custId)) {
        setSelectedCustomer(null);
      }
    } else if (deleteConfirm.type === 'all') {
      const ids = filteredCustomers.map(c => c.customerId || c.userId || c.id).filter(Boolean);
      deleteAllCustomers(ids);
      showToast(`Deleted all ${ids.length} customers successfully!`, 'success');
      setSelectedCustomer(null);
    }
    setDeleteConfirm({ open: false, type: 'single', customer: null });
    loadData();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Customer Management
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Manage delivery accounts, pending jar payments, and repeat ordering history.
          </p>
        </div>

        {filteredCustomers.length > 0 && (
          <button
            className="btn btn-secondary"
            style={{ color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setDeleteConfirm({ open: true, type: 'all', customer: null })}
          >
            <Trash2 size={16} /> Delete All Customers
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ position: 'relative', maxWidth: '420px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input 
            type="text"
            placeholder="Search customers by name, phone number, or locality..."
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
      </div>

      {/* Customer Directory Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredCustomers.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <EmptyState 
              icon={Users}
              title="No customers found"
              description="No customers match your search criteria."
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Customer</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Contact & Address</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Total Orders</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Total Business</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Pending Dues</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => {
                  const hasDue = (cust.pendingPayment || 0) > 0;

                  return (
                    <tr 
                      key={cust.customerId}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                    >
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                          {cust.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          ID: #{cust.customerId.slice(-6)}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                          📞 {cust.phone}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📍 {cust.address}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span 
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}
                        >
                          {cust.totalOrders || 0}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                          {formatCurrency(cust.totalAmount || 0)}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        {hasDue ? (
                          <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.9rem' }}>
                            {formatCurrency(cust.pendingPayment)}
                          </span>
                        ) : (
                          <span style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 600 }}>
                            All Cleared ✓
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <span className="badge badge-delivered" style={{ fontSize: '0.72rem' }}>
                          {cust.status || 'Active'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedCustomer(cust)}
                          >
                            <Eye size={15} /> View Profile & History
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#dc2626', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Delete Customer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ open: true, type: 'single', customer: cust });
                            }}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
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

      {/* Customer Full Profile & History Modal */}
      {selectedCustomer && (
        <Modal 
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={`Customer: ${selectedCustomer.name}`}
          maxWidth="720px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Customer Details Box */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '12px',
                border: '1px solid #bae6fd'
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>PHONE</span>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{selectedCustomer.phone}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>DELIVERY ADDRESS</span>
                <div style={{ fontSize: '0.85rem', color: '#334155' }}>{selectedCustomer.address}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>TOTAL SPENT</span>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0284c7' }}>
                  {formatCurrency(selectedCustomer.totalAmount || 0)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>PENDING DUES</span>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: (selectedCustomer.pendingPayment || 0) > 0 ? '#dc2626' : '#059669' }}>
                  {formatCurrency(selectedCustomer.pendingPayment || 0)}
                </div>
              </div>
            </div>

            {/* Clear balance action */}
            {(selectedCustomer.pendingPayment || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fee2e2', padding: '12px 16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>
                  Customer has {formatCurrency(selectedCustomer.pendingPayment)} in pending payments.
                </span>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleClearBalance(selectedCustomer.customerId)}
                >
                  Mark Dues as Collected
                </button>
              </div>
            )}

            {/* Order History */}
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>
                Delivery & Order History ({customerOrders.length} orders)
              </h4>

              {customerOrders.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No orders found for this customer.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                  {customerOrders.map(order => (
                    <div 
                      key={order.orderId}
                      style={{
                        padding: '12px',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#0284c7' }}>#{order.orderId}</span>
                          <StatusBadge status={order.orderStatus} size="small" />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                          {formatDateTime(order.createdAt)} • {order.items?.map(i => `${i.name} × ${i.quantity}`).join(', ')}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800 }}>{formatCurrency(order.totalAmount)}</div>
                        <span style={{ fontSize: '0.72rem', color: order.paymentStatus === 'Paid' ? '#059669' : '#d97706' }}>
                          {order.paymentMethod} ({order.paymentStatus})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '14px', marginTop: '4px' }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: '#dc2626', borderColor: '#fecaca', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setDeleteConfirm({ open: true, type: 'single', customer: selectedCustomer })}
              >
                <Trash2 size={15} /> Delete Customer Record
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedCustomer(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <Modal
          isOpen={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ open: false, type: 'single', customer: null })}
          title={deleteConfirm.type === 'all' ? 'Delete All Customers?' : `Delete Customer: ${deleteConfirm.customer?.name}?`}
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ backgroundColor: '#fee2e2', borderRadius: '50%', padding: '10px', color: '#dc2626' }}>
                <AlertTriangle size={24} />
              </div>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>
                {deleteConfirm.type === 'all' 
                  ? `Are you sure you want to permanently delete all ${filteredCustomers.length} customer records? This will clear their profiles and ledger history.`
                  : `Are you sure you want to delete customer record "${deleteConfirm.customer?.name}"? This removes their profile and ledger information.`}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm({ open: false, type: 'single', customer: null })}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}
                onClick={handleExecuteDelete}
              >
                {deleteConfirm.type === 'all' ? 'Delete All Customers' : 'Delete Customer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SupplierCustomers;
