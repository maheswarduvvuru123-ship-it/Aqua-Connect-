import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Search, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  ShoppingBag, 
  CreditCard,
  Trash2,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Filter,
  Pause,
  Play,
  Clock
} from 'lucide-react';
import { 
  getCollection, 
  subscribeToData, 
  getSupplierSubscription,
  verifySupplierSubscription,
  verifyCustomerAccount,
  rejectPendingAccount,
  getAllPendingApprovals,
  toggleSupplierVerification,
  toggleAccountSuspension,
  restoreDeletedAccount,
  purgeDeletedAccountPermanently,
  purgeAllDeletedAccounts,
  deleteAccountPermanently,
  purgeResidualAccounts,
  purgeAllDummyData,
  isDummyRecord,
  deleteDoc
} from '../../services/firestoreData';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const AdminAccounts = () => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState('suppliers'); // 'pending' | 'suppliers' | 'customers' | 'deleted'
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deletedAccounts, setDeletedAccounts] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveOnly, setLiveOnly] = useState(false);

  const isDummyAccount = (item) => isDummyRecord(item);

  const handleCleanDummyData = () => {
    if (window.confirm("Are you sure you want to completely wipe all mock demo seed data (orders, payments, deliveries, demo users, inventory)? Only genuine real registered accounts and orders will remain.")) {
      try {
        purgeAllDummyData(currentUser);
        showToast("🧹 All demo dummy seed data wiped clean permanently!", "success");
        loadData();
      } catch (err) {
        showToast(`Failed to clean dummy data: ${err.message}`, "error");
      }
    }
  };

  const handleDeleteSupplier = async (supplierId, name) => {
    if (window.confirm(`Are you sure you want to permanently delete supplier "${name}"? This removes their account, orders access, and directory listing.`)) {
      try {
        await deleteAccountPermanently(supplierId, 'supplier', 'Admin removed supplier from platform');
        setSuppliers(prev => prev.filter(s => (s.supplierId || s.id) !== supplierId));
        showToast(`🗑️ Supplier "${name}" has been deleted.`, 'success');
        loadData();
      } catch (err) {
        showToast(`Failed to delete: ${err.message}`, 'error');
      }
    }
  };

  const handleDeleteCustomer = async (customerId, name) => {
    if (window.confirm(`Are you sure you want to permanently delete customer "${name}"? This removes their account and directory listing.`)) {
      try {
        await deleteAccountPermanently(customerId, 'customer', 'Admin removed customer from platform');
        setCustomers(prev => prev.filter(c => (c.customerId || c.userId || c.id) !== customerId));
        showToast(`🗑️ Customer "${name}" has been deleted.`, 'success');
        loadData();
      } catch (err) {
        showToast(`Failed to delete: ${err.message}`, 'error');
      }
    }
  };

  const handlePurgeResidualAccounts = async () => {
    if (window.confirm("Permanently wipe all residual test accounts from backend and frontend? This will clear test suppliers and customers that are deleted in backend, ensuring the directory is completely synchronized.")) {
      try {
        await purgeResidualAccounts();
        setSuppliers([]);
        setCustomers([]);
        showToast("🧹 Residual test accounts wiped from frontend & backend!", "success");
        loadData();
      } catch (err) {
        showToast(`Failed: ${err.message}`, "error");
      }
    }
  };

  const handlePurgeAll = () => {
    if (window.confirm("Permanently erase all archive records from Deleted Accounts? This clears the archive completely.")) {
      purgeAllDeletedAccounts();
      showToast("🧹 All archive records permanently purged.", "info");
      loadData();
    }
  };

  const handleToggleVerifySupplier = (supplierId, plantName, currentVerified) => {
    try {
      toggleSupplierVerification(supplierId, !currentVerified);
      showToast(`${!currentVerified ? '✓ Verified' : 'Unverified'} plant account: ${plantName}! Syncing backend & frontend...`, 'success');
      loadData();
    } catch (err) {
      showToast('Verification update failed: ' + err.message, 'error');
    }
  };

  const handleToggleSuspendSupplier = (supplierId, plantName, isCurrentlySuspended) => {
    if (!isCurrentlySuspended) {
      if (!window.confirm(`Are you sure you want to temporarily STOP supplier "${plantName}"?\n\n• Their access will be paused immediately.\n• They will not receive customer orders.\n• You can resume their account at any time and they will continue as usual.`)) {
        return;
      }
    }
    try {
      toggleAccountSuspension(supplierId, 'supplier', !isCurrentlySuspended, currentUser);
      if (!isCurrentlySuspended) {
        showToast(`⏸️ Supplier "${plantName}" temporarily stopped. Access paused.`, 'warning');
      } else {
        showToast(`▶️ Supplier "${plantName}" resumed! They can now log in and continue as usual.`, 'success');
      }
      loadData();
    } catch (err) {
      showToast('Action failed: ' + err.message, 'error');
    }
  };

  const handleVerifyCustomer = (customerId, name) => {
    try {
      verifyCustomerAccount(customerId, currentUser);
      showToast(`✓ Accepted & Verified customer account: ${name}!`, 'success');
      loadData();
    } catch (err) {
      showToast(`Verification failed: ${err.message}`, 'error');
    }
  };

  const handleRejectAccount = (id, role, name) => {
    if (window.confirm(`Are you sure you want to decline registration for ${name}?`)) {
      try {
        rejectPendingAccount(id, role, currentUser);
        showToast(`Declined registration for ${name}.`, 'info');
        loadData();
      } catch (err) {
        showToast(`Action failed: ${err.message}`, 'error');
      }
    }
  };

  const handleToggleSuspendCustomer = (customerId, custName, isCurrentlySuspended) => {
    if (!isCurrentlySuspended) {
      if (!window.confirm(`Are you sure you want to temporarily STOP customer "${custName}"?\n\n• Their access will be paused.\n• They will not be able to place orders until resumed.\n• You can resume their account at any time.`)) {
        return;
      }
    }
    try {
      toggleAccountSuspension(customerId, 'customer', !isCurrentlySuspended, currentUser);
      if (!isCurrentlySuspended) {
        showToast(`⏸️ Customer "${custName}" temporarily stopped. Access paused.`, 'warning');
      } else {
        showToast(`▶️ Customer "${custName}" resumed! They can now log in and continue as usual.`, 'success');
      }
      loadData();
    } catch (err) {
      showToast('Action failed: ' + err.message, 'error');
    }
  };

  const loadData = () => {
    const allUsers = getCollection('users') || [];
    const rawSuppliers = getCollection('suppliers') || [];
    const rawCustomers = getCollection('customers') || [];
    const deleted = getCollection('deleted_accounts') || [];
    const deletedUserIds = new Set(deleted.map(d => String(d.userId)));
    const deletedEmails = new Set(deleted.map(d => (d.email || '').toLowerCase().trim()).filter(Boolean));

    // Merge registered suppliers (excluding deleted accounts)
    const supMap = new Map();
    rawSuppliers
      .filter(s => 
        !deletedUserIds.has(String(s.supplierId || s.id)) && 
        !deletedEmails.has((s.email || '').toLowerCase().trim()) && 
        s.status !== 'Deleted' && s.accountStatus !== 'Deleted'
      )
      .forEach(s => {
        const isSusp = s.status === 'Suspended' || s.accountStatus === 'Suspended' || s.isSuspended;
        supMap.set(s.supplierId || s.id, {
          ...s,
          isSuspended: isSusp,
          status: isSusp ? 'Suspended' : (s.status || 'Active')
        });
      });

    allUsers
      .filter(u => 
        u.role === 'supplier' && 
        !deletedUserIds.has(String(u.uid)) && 
        !deletedEmails.has((u.email || '').toLowerCase().trim()) && 
        u.accountStatus !== 'Deleted' && u.status !== 'Deleted'
      )
      .forEach(u => {
        const existing = supMap.get(u.uid);
        const isSusp = u.accountStatus === 'Suspended' || u.status === 'Suspended' || u.isSuspended || existing?.isSuspended;
        if (existing) {
          supMap.set(u.uid, { 
            ...existing, 
            ...u, 
            supplierId: u.uid, 
            businessName: existing.businessName || u.businessName || u.name,
            isSuspended: isSusp,
            status: isSusp ? 'Suspended' : (existing.status || u.accountStatus || 'Active')
          });
        } else {
          supMap.set(u.uid, {
            supplierId: u.uid,
            ownerName: u.name,
            businessName: u.businessName || `${u.name}'s Water Supply`,
            email: u.email,
            phone: u.phone,
            address: u.address || 'Water Plant Facility, Hyderabad',
            city: u.city || 'Hyderabad',
            status: isSusp ? 'Suspended' : (u.accountStatus || 'Active'),
            isSuspended: isSusp,
            planName: u.planName || 'Pro Flow Plan',
            billingCycle: u.billingCycle || 'Monthly',
            createdAt: u.createdAt || new Date().toISOString()
          });
        }
      });

    // Merge registered customers (excluding deleted accounts)
    const custMap = new Map();
    rawCustomers
      .filter(c => 
        !deletedUserIds.has(String(c.customerId || c.userId || c.id)) && 
        !deletedEmails.has((c.email || '').toLowerCase().trim()) && 
        c.status !== 'Deleted' && c.accountStatus !== 'Deleted'
      )
      .forEach(c => {
        const isSusp = c.status === 'Suspended' || c.accountStatus === 'Suspended' || c.isSuspended;
        custMap.set(c.customerId || c.userId || c.id, {
          ...c,
          isSuspended: isSusp,
          status: isSusp ? 'Suspended' : (c.status || 'Active')
        });
      });

    allUsers
      .filter(u => 
        u.role === 'customer' && 
        !deletedUserIds.has(String(u.uid)) && 
        !deletedEmails.has((u.email || '').toLowerCase().trim()) && 
        u.accountStatus !== 'Deleted' && u.status !== 'Deleted'
      )
      .forEach(u => {
        const existing = custMap.get(u.uid);
        const isSusp = u.accountStatus === 'Suspended' || u.status === 'Suspended' || u.isSuspended || existing?.isSuspended;
        if (existing) {
          custMap.set(u.uid, { 
            ...existing, 
            ...u, 
            customerId: u.uid,
            isSuspended: isSusp,
            status: isSusp ? 'Suspended' : (existing.status || u.accountStatus || 'Active')
          });
        } else {
          custMap.set(u.uid, {
            customerId: u.uid,
            name: u.name || u.email?.split('@')[0],
            email: u.email,
            phone: u.phone || 'Not provided',
            address: u.address || 'Not provided',
            status: isSusp ? 'Suspended' : (u.accountStatus || 'Active'),
            isSuspended: isSusp,
            createdAt: u.createdAt || new Date().toISOString()
          });
        }
      });

    setSuppliers(Array.from(supMap.values()));
    setCustomers(Array.from(custMap.values()));
    setDeletedAccounts(deleted);
    setOrders(getCollection('orders') || []);
    setPendingApprovals(getAllPendingApprovals());
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(() => loadData());
    return () => unsub();
  }, []);

  const handleRestore = (del) => {
    try {
      const ok = restoreDeletedAccount(del.deletedId);
      if (ok) {
        showToast(`✅ Successfully restored ${del.name} (${del.role.toUpperCase()}) to active directory!`, 'success');
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePurge = (del) => {
    if (window.confirm(`Are you sure you want to permanently erase ${del.name} from backend archive? This cannot be undone.`)) {
      purgeDeletedAccountPermanently(del.deletedId);
      showToast(`Purged ${del.name} record from backend archive.`, 'info');
      loadData();
    }
  };

  const filteredSuppliers = suppliers
    .filter(s => !liveOnly || !isDummyAccount(s))
    .filter(s => {
      const q = searchQuery.toLowerCase();
      return (s.businessName || s.ownerName || '').toLowerCase().includes(q) ||
             (s.city || '').toLowerCase().includes(q) ||
             (s.email || '').toLowerCase().includes(q) ||
             (s.phone || '').toLowerCase().includes(q);
    });

  const filteredCustomers = customers
    .filter(c => !liveOnly || !isDummyAccount(c))
    .filter(c => {
      const q = searchQuery.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) ||
             (c.email || '').toLowerCase().includes(q) ||
             (c.phone || '').toLowerCase().includes(q) ||
             (c.address || '').toLowerCase().includes(q);
    });

  const filteredPending = pendingApprovals.filter(p => {
    const q = searchQuery.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) ||
           (p.email || '').toLowerCase().includes(q) ||
           (p.phone || '').toLowerCase().includes(q) ||
           (p.role || '').toLowerCase().includes(q) ||
           (p.paymentReference || '').toLowerCase().includes(q) ||
           (p.address || '').toLowerCase().includes(q);
  });

  const filteredDeleted = deletedAccounts.filter(d => {
    const q = searchQuery.toLowerCase();
    return (d.name || '').toLowerCase().includes(q) ||
           (d.email || '').toLowerCase().includes(q) ||
           (d.phone || '').toLowerCase().includes(q) ||
           (d.role || '').toLowerCase().includes(q) ||
           (d.reason || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Suppliers & Customers Directory
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Inspect active suppliers, retail customers, and archived backend-deleted accounts.
        </p>
      </div>

      {/* Tabs and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              backgroundColor: activeTab === 'pending' ? '#ea580c' : (pendingApprovals.length > 0 ? '#fff7ed' : '#f1f5f9'),
              color: activeTab === 'pending' ? '#ffffff' : (pendingApprovals.length > 0 ? '#c2410c' : '#475569'),
              border: pendingApprovals.length > 0 && activeTab !== 'pending' ? '1px solid #fdba74' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={16} /> ⏳ Pending Approvals ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              backgroundColor: activeTab === 'suppliers' ? '#4338ca' : '#f1f5f9',
              color: activeTab === 'suppliers' ? '#ffffff' : '#475569',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Building2 size={16} /> Water Suppliers ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              backgroundColor: activeTab === 'customers' ? '#0284c7' : '#f1f5f9',
              color: activeTab === 'customers' ? '#ffffff' : '#475569',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Users size={16} /> Retail Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              backgroundColor: activeTab === 'deleted' ? '#dc2626' : '#f1f5f9',
              color: activeTab === 'deleted' ? '#ffffff' : '#475569',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Trash2 size={16} /> Deleted Accounts Archive ({deletedAccounts.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Live Only Filter Toggle */}
          <button
            type="button"
            onClick={() => setLiveOnly(!liveOnly)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: liveOnly ? '#059669' : '#f8fafc',
              color: liveOnly ? '#ffffff' : '#475569',
              border: liveOnly ? '1px solid #059669' : '1px solid #cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: liveOnly ? '0 2px 8px rgba(5, 150, 105, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={15} /> {liveOnly ? 'Live Accounts Only ✓' : 'Filter: Live Only'}
          </button>

          {/* Clean Dummy Data Button */}
          <button
            type="button"
            onClick={handleCleanDummyData}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: '#fff1f2',
              color: '#e11d48',
              border: '1px solid #fecdd3',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            title="Clean out demo seed accounts (sup_001, sup_002, cust_001)"
          >
            <Trash2 size={15} /> Clean Dummy Data
          </button>

          {/* Wipe Residual Accounts Button */}
          <button
            type="button"
            onClick={handlePurgeResidualAccounts}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #f87171',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(185, 28, 28, 0.15)',
              transition: 'all 0.15s ease'
            }}
            title="Wipe test accounts deleted in backend so frontend matches backend 100%"
          >
            <Trash2 size={15} /> Wipe Residual Accounts
          </button>

          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input 
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Content View */}
      {activeTab === 'pending' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Clock size={24} color="#ea580c" />
            <div>
              <h4 style={{ margin: 0, color: '#9a3412', fontSize: '1rem', fontWeight: 800 }}>
                Admin Verification Queue ({filteredPending.length} Accounts Waiting for Your Approval)
              </h4>
              <p style={{ margin: '4px 0 0', color: '#c2410c', fontSize: '0.84rem' }}>
                Both supplier plants and retail customers require your 1-click approval before they can sign in or access the platform.
              </p>
            </div>
          </div>

          {filteredPending.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '16px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 800 }}>Queue Clear! No Pending Approvals</h3>
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>All registered supplier and customer accounts have been reviewed and activated.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
              {filteredPending.map(item => (
                <div key={item.id} className="card" style={{ padding: '20px', borderRadius: '16px', border: '2px solid #fed7aa', backgroundColor: '#fffdfa', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: item.role === 'supplier' ? '#e0e7ff' : '#dbeafe',
                        color: item.role === 'supplier' ? '#4338ca' : '#1e40af',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {item.role === 'supplier' ? '🏭 Water Supplier' : '👤 Retail Customer'}
                      </span>
                      <h3 style={{ margin: '8px 0 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {item.name || item.businessName || item.plantName || 'New Registration'}
                      </h3>
                      {item.ownerName && item.ownerName !== item.name && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Owner: {item.ownerName}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' }}>
                      ⏳ Pending Approval
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>📞 <strong>Phone:</strong> {item.phone || 'Not provided'}</div>
                    <div>✉️ <strong>Email:</strong> {item.email || 'Not provided'}</div>
                    {item.address && <div>📍 <strong>Address:</strong> {item.address}</div>}
                    {item.paymentReference && (
                      <div style={{ fontSize: '0.78rem', backgroundColor: '#ecfdf5', color: '#047857', padding: '5px 10px', borderRadius: '6px', fontWeight: 700, width: 'fit-content', border: '1px solid #a7f3d0' }}>
                        💳 UTR / Ref: {item.paymentReference} {item.planName ? `• Plan: ${item.planName}` : ''}
                      </div>
                    )}
                    {item.requestedAt && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Requested: {formatDateTime(item.requestedAt)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #fed7aa' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.role === 'supplier') {
                          const subId = item.subscriptionId || `sub_gen_${item.supplierId || item.id}`;
                          verifySupplierSubscription(subId, currentUser);
                          showToast(`✓ Accepted & Verified supplier: ${item.name}!`, 'success');
                        } else {
                          verifyCustomerAccount(item.id, currentUser);
                          showToast(`✓ Accepted & Verified customer: ${item.name}!`, 'success');
                        }
                        loadData();
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                      }}
                    >
                      <CheckCircle2 size={16} /> Accept & Verify Account
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectAccount(item.id, item.role, item.name)}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #f87171',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'suppliers' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {filteredSuppliers.map(sup => {
            const supplierOrders = orders.filter(o => o.supplierId === sup.supplierId);
            const supRevenue = supplierOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
            const sub = getSupplierSubscription(sup.supplierId);
            const isSuspended = sup.status === 'Suspended' || sup.accountStatus === 'Suspended' || sup.isSuspended;

            return (
              <div key={sup.supplierId} className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px', border: isSuspended ? '2px solid #fde68a' : '1px solid var(--border-light)', backgroundColor: isSuspended ? '#fffdf5' : '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      {sup.businessName || sup.plantName}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Owner: {sup.ownerName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isSuspended ? (
                      <span 
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a'
                        }}
                      >
                        ⏸️ Stopped Temporarily
                      </span>
                    ) : (
                      <span 
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: isDummyAccount(sup) ? '#fef3c7' : '#dcfce7',
                          color: isDummyAccount(sup) ? '#92400e' : '#15803d',
                          border: isDummyAccount(sup) ? '1px solid #fde68a' : '1px solid #86efac'
                        }}
                      >
                        {isDummyAccount(sup) ? '📦 Demo Seed' : '🟢 Live Account'}
                      </span>
                    )}
                    <button 
                      type="button"
                      onClick={() => handleToggleVerifySupplier(sup.supplierId, sup.businessName || sup.plantName || sup.ownerName, !!sup.isVerified)}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        backgroundColor: sup.isVerified ? '#dcfce7' : '#fef3c7',
                        color: sup.isVerified ? '#15803d' : '#b45309',
                        border: sup.isVerified ? '1px solid #86efac' : '1px solid #fde68a',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      title={sup.isVerified ? 'Click to revoke verification status' : 'Click to Verify this plant in backend and live accounts'}
                    >
                      {sup.isVerified ? '✓ Verified' : '⏳ Click to Verify'}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>📍 {sup.address}, {sup.city}</div>
                  <div>📞 {sup.phone}</div>
                  <div>✉️ {sup.email}</div>
                  {(sub?.paymentReference || sup.paymentReference) && (
                    <div style={{ fontSize: '0.74rem', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, width: 'fit-content' }}>
                      💳 Payment UTR: {sub?.paymentReference || sup.paymentReference}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', marginTop: 'auto' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Orders Handled:</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{supplierOrders.length}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Water Value:</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#16a34a' }}>{formatCurrency(supRevenue)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b21a8', fontWeight: 600 }}>
                    Plan: {sub?.planName || sup.planName || 'Free Starter'} {sub?.billingCycle ? `(${sub.billingCycle})` : ''} • 
                    <span style={{ color: isSuspended ? '#b45309' : (sub?.status === 'Active' || sup.status === 'Active') ? '#16a34a' : '#d97706', fontWeight: 700, marginLeft: '4px' }}>
                      {isSuspended ? 'Suspended / Stopped' : (sub?.status || sup.status || 'Active')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {(sub?.status === 'Pending Verification' || sup.status === 'Pending Verification' || !sup.isVerified) && (
                      <>
                        <button
                          onClick={() => {
                            try {
                              const subIdToVerify = sub?.subscriptionId || `sub_gen_${sup.supplierId}`;
                              verifySupplierSubscription(subIdToVerify, currentUser);
                              showToast(`Confirmed & Activated ${sup.businessName || sup.plantName || sup.ownerName}!`, 'success');
                              loadData();
                            } catch (e) {
                              showToast(e.message, 'error');
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Accept & Verify Account
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectAccount(sup.supplierId || sup.uid, 'supplier', sup.businessName || sup.plantName || sup.ownerName)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #f87171',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}

                    {/* Temporary Stop / Resume Button */}
                    {isSuspended ? (
                      <button
                        type="button"
                        onClick={() => handleToggleSuspendSupplier(sup.supplierId, sup.businessName || sup.plantName || sup.ownerName, true)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #6ee7b7',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Reactivate and resume this supplier account so they can continue as usual"
                      >
                        <Play size={12} fill="#047857" /> Continue / Resume
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleSuspendSupplier(sup.supplierId, sup.businessName || sup.plantName || sup.ownerName, false)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Temporarily stop this supplier account from logging in or receiving orders"
                      >
                        <Pause size={12} /> Stop Account
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteSupplier(sup.supplierId, sup.businessName || sup.ownerName)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#fff1f2',
                        color: '#e11d48',
                        border: '1px solid #fecdd3',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Permanently delete supplier account"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === 'customers' ? (
        <div className="card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
              <tr>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Customer Name</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Contact Phone</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Email</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Primary Address</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Total Orders</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Account Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Admin Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No customer accounts found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust.customerId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{cust.name}</span>
                        <span 
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '8px',
                            backgroundColor: isDummyAccount(cust) ? '#fef3c7' : '#dcfce7',
                            color: isDummyAccount(cust) ? '#92400e' : '#15803d'
                          }}
                        >
                          {isDummyAccount(cust) ? '📦 Demo' : '🟢 Live'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                      {cust.phone || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                      {cust.email || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {cust.address || 'Address on file'}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 800 }}>
                      {cust.totalOrders || 0}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {cust.status === 'Pending Verification' || cust.accountStatus === 'Pending Verification' || !cust.isVerified ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74' }}>
                          ⏳ Pending Approval
                        </span>
                      ) : cust.status === 'Suspended' || cust.isSuspended ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                          ⏸️ Stopped
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d' }}>
                          🟢 Active
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {(cust.status === 'Pending Verification' || cust.accountStatus === 'Pending Verification' || !cust.isVerified) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleVerifyCustomer(cust.customerId || cust.id, cust.name || cust.email)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Accept & verify customer account"
                            >
                              ✓ Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectAccount(cust.customerId || cust.id, 'customer', cust.name || cust.email)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #f87171',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Reject registration"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {!(cust.status === 'Pending Verification' || cust.accountStatus === 'Pending Verification' || !cust.isVerified) && (
                          cust.status === 'Suspended' || cust.isSuspended ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspendCustomer(cust.customerId, cust.name, true)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #6ee7b7',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Reactivate customer account so they can continue as usual"
                            >
                              <Play size={12} fill="#047857" /> Continue
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspendCustomer(cust.customerId, cust.name, false)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Temporarily stop customer account"
                            >
                              <Pause size={12} /> Stop
                            </button>
                          )
                        )}
                        <button
                          onClick={() => handleDeleteCustomer(cust.customerId, cust.name)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fecdd3',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Permanently delete customer account"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* BACKEND DELETED ACCOUNTS ARCHIVE TAB */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div 
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldAlert size={22} color="#dc2626" />
              <div style={{ fontSize: '0.85rem', color: '#991b1b' }}>
                <strong>Backend Deleted Accounts Archive:</strong> When suppliers or customers delete their accounts, snapshots are safely retained in this archive with full timestamp logs. You can inspect why the account was deleted, restore them to the active directory, or permanently purge them.
              </div>
            </div>

            {deletedAccounts.length > 0 && (
              <button
                type="button"
                onClick={handlePurgeAll}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} /> Clear All Archive Records
              </button>
            )}
          </div>

          <div className="card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead style={{ backgroundColor: '#fff1f2', borderBottom: '1px solid #fecdd3' }}>
                  <tr>
                    <th style={{ padding: '14px 18px', fontWeight: 700, color: '#9f1239' }}>Account / Plant</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, color: '#9f1239' }}>Role</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, color: '#9f1239' }}>Contact</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, color: '#9f1239' }}>Deleted On</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, color: '#9f1239' }}>Deletion Reason</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, color: '#9f1239' }}>Status</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, color: '#9f1239', textAlign: 'center' }}>Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeleted.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No deleted accounts in backend archive.
                      </td>
                    </tr>
                  ) : (
                    filteredDeleted.map(del => (
                      <tr key={del.deletedId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b' }}>{del.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {del.address || 'No address logged'} • Plan: {del.planName || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span 
                            style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              backgroundColor: del.role === 'supplier' ? '#f3e8ff' : '#e0f2fe',
                              color: del.role === 'supplier' ? '#7e22ce' : '#0369a1'
                            }}
                          >
                            {del.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: '0.82rem' }}>
                          <div>{del.phone}</div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{del.email}</div>
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: '0.78rem', color: '#475569' }}>
                          {formatDateTime(del.deletedAt)}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: '#991b1b', maxWidth: '240px' }}>
                          {del.reason || 'User initiated account deletion'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                            🗑️ Deleted from Backend
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleRestore(del)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Restore account to active directory"
                            >
                              <RotateCcw size={13} /> Restore
                            </button>
                            <button
                              onClick={() => handlePurge(del)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Permanently remove from archive"
                            >
                              Purge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccounts;
