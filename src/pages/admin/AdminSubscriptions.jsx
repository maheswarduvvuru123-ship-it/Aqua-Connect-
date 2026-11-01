import React, { useState, useEffect } from 'react';
import {
  Award,
  Check,
  Clock,
  AlertCircle,
  Plus,
  Calendar,
  ShieldCheck,
  Building2,
  Users,
  Edit3,
  QrCode,
  Save,
  Upload,
  X,
  RefreshCw,
  Settings,
  Key,
  CheckCircle2,
  Sliders,
  DollarSign,
  Trash2,
  Send,
  Eye,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  getCollection,
  subscribeToData,
  updateSupplierSubscription,
  verifySupplierSubscription,
  updateSubscriptionPlan,
  createSubscriptionPlan,
  publishSubscriptionPlan,
  deleteSubscriptionPlan,
  getPlatformSettings,
  updatePlatformSettings,
  assignSupplierPlan,
  assignCustomerPlan,
  updateCustomerSubscription,
  getPendingSupplierApprovals,
  toggleAccountSuspension,
  reloadStore
} from '../../services/firestoreData';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

const AdminSubscriptions = () => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  // Active Main Tab: 'supplier' | 'customer' | 'settings'
  const [activeRoleTab, setActiveRoleTab] = useState('supplier');

  // Sub-view: 'plans' | 'subscribers'
  const [subView, setSubView] = useState('plans');

  const [plans, setPlans] = useState([]);
  const [supplierSubs, setSupplierSubs] = useState([]);
  const [customerSubs, setCustomerSubs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Platform Subscription Payment Settings State
  const [platformSettings, setPlatformSettings] = useState({
    adminUpiId: 'aquaconnect.admin@upi',
    adminPhone: '8522828688',
    adminQrCodeUrl: '',
    customerCarePhone: '+91 85228 28688',
    customerCareEmail: 'support@aquaconnect.com',
    customerCareWhatsapp: '+91 85228 28688',
    customerCareHours: '9:00 AM - 8:00 PM (Mon-Sat)',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Edit / Create Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planForm, setPlanForm] = useState({
    targetRole: 'supplier',
    name: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    trialDays: 14,
    orderLimit: '',
    status: 'draft',
    isPopular: false,
    featuresText: '',
    featureFlags: {
      onlineOrdering: true,
      routeOptimization: false,
      prioritySupport: false,
      analyticsExport: false,
      freeDelivery: false,
      cashback: false,
      dispenserCleaning: false,
    },
    limits: {
      maxOrdersPerMonth: 100,
      maxDeliveryStaff: 2,
      maxActiveOrders: 5,
    },
  });

  // Assign / Change Tier Modal
  const [tierModalTarget, setTierModalTarget] = useState(null); // { type: 'supplier' | 'customer', entity: obj }
  const [selectedTierPlanId, setSelectedTierPlanId] = useState('');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('Monthly');

  const loadData = () => {
    const allPlans = getCollection('subscription_plans') || [];
    setPlans(allPlans);
    setSupplierSubs(getCollection('supplier_subscriptions') || []);
    setCustomerSubs(getCollection('customer_subscriptions') || []);
    setSuppliers(getCollection('suppliers') || []);
    setCustomers(getCollection('customers') || []);
    setPlatformSettings(getPlatformSettings());
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(() => loadData());
    return () => unsub();
  }, []);

  // Filter plans based on active role tab ('supplier' or 'customer')
  const currentPlans = plans.filter(p => (p.targetRole || 'supplier') === activeRoleTab);

  // Open Create Plan Modal
  const handleOpenCreatePlan = () => {
    setEditingPlanId(null);
    setPlanForm({
      targetRole: activeRoleTab,
      name: '',
      monthlyPrice: activeRoleTab === 'supplier' ? 2999 : 199,
      yearlyPrice: activeRoleTab === 'supplier' ? 29999 : 1999,
      trialDays: 14,
      orderLimit: '',
      status: 'draft',
      isPopular: false,
      featuresText:
        activeRoleTab === 'supplier'
          ? 'Unlimited Customer Orders\nReal-time Order Alerts\nEmpty Can Tracking\nPriority Phone Support'
          : 'Free Doorstep Delivery on every order\n30-Min Express morning slot\n5% Instant monthly cashback',
      featureFlags:
        activeRoleTab === 'supplier'
          ? {
            onlineOrdering: true,
            routeOptimization: true,
            prioritySupport: true,
            analyticsExport: false,
          }
          : {
            freeDelivery: true,
            prioritySlot: true,
            cashback: true,
            dispenserCleaning: false,
          },
      limits:
        activeRoleTab === 'supplier'
          ? { maxOrdersPerMonth: 1000, maxDeliveryStaff: 5 }
          : { maxActiveOrders: 10 },
    });
    setIsPlanModalOpen(true);
  };

  // Open Edit Plan Modal
  const handleOpenEditPlan = plan => {
    setEditingPlanId(plan.planId);
    setPlanForm({
      targetRole: plan.targetRole || 'supplier',
      name: plan.name || '',
      monthlyPrice:
        plan.monthlyPrice !== undefined ? plan.monthlyPrice : plan.price || 0,
      yearlyPrice:
        plan.yearlyPrice !== undefined
          ? plan.yearlyPrice
          : (plan.price || 0) * 10,
      trialDays: plan.trialDays !== undefined ? plan.trialDays : 14,
      orderLimit:
        plan.orderLimit !== null && plan.orderLimit !== undefined
          ? plan.orderLimit
          : '',
      status: plan.status || 'published',
      isPopular: !!plan.isPopular,
      featuresText: (plan.features || []).join('\n'),
      featureFlags: plan.featureFlags || {},
      limits: plan.limits || {},
    });
    setIsPlanModalOpen(true);
  };

  // Save Plan (Draft or Published)
  const handleSavePlanSubmit = (e, targetStatus = null) => {
    if (e) e.preventDefault();
    if (!planForm.name.trim()) {
      showToast('Please provide a plan name.', 'error');
      return;
    }

    try {
      const features = planForm.featuresText
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const statusToApply = targetStatus || planForm.status || 'published';

      const payload = {
        targetRole: planForm.targetRole,
        name: planForm.name.trim(),
        monthlyPrice: Number(planForm.monthlyPrice) || 0,
        yearlyPrice:
          Number(planForm.yearlyPrice) ||
          Number(planForm.monthlyPrice) * 10 ||
          0,
        price: Number(planForm.monthlyPrice) || 0,
        trialDays: Number(planForm.trialDays) || 0,
        orderLimit:
          planForm.orderLimit === '' ? null : Number(planForm.orderLimit),
        status: statusToApply,
        isPopular: planForm.isPopular,
        features,
        featureFlags: planForm.featureFlags,
        limits: planForm.limits,
      };

      if (editingPlanId) {
        updateSubscriptionPlan(editingPlanId, payload, currentUser);
        showToast(
          `✅ Plan "${payload.name}" updated (${statusToApply.toUpperCase()})!`,
          'success'
        );
      } else {
        createSubscriptionPlan(payload, currentUser);
        showToast(
          `🎉 New ${planForm.targetRole.toUpperCase()} plan "${payload.name}" created (${statusToApply.toUpperCase()})!`,
          'success'
        );
      }

      setIsPlanModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Quick 1‑Click Publish for Draft plans
  const handlePublishLive = plan => {
    try {
      publishSubscriptionPlan(plan.planId, currentUser);
      showToast(
        `🚀 "${plan.name}" is now PUBLISHED & LIVE for ${plan.targetRole}s!`,
        'success'
      );
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete Plan
  const handleDeletePlan = plan => {
    if (
      window.confirm(`Are you sure you want to delete the plan "${plan.name}"?`)
    ) {
      try {
        deleteSubscriptionPlan(plan.planId, currentUser);
        showToast(`Plan "${plan.name}" deleted.`, 'success');
        loadData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  // Supplier Verification
  const handleVerifySupplierPlan = sub => {
    try {
      verifySupplierSubscription(sub.subscriptionId, currentUser);
      showToast(
        `🎉 Verified & Activated ${sub.supplierName}'s ${sub.planName}!`,
        'success'
      );
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Toggle Supplier Status
  const handleToggleSupplierStatus = sub => {
    const nextStatus =
      sub.status === 'Active'
        ? 'Grace Period'
        : sub.status === 'Grace Period'
          ? 'Expired'
          : 'Active';
    try {
      updateSupplierSubscription(
        sub.subscriptionId,
        { status: nextStatus },
        currentUser
      );
      showToast(`Supplier subscription status updated to ${nextStatus}`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Toggle Customer Status
  const handleToggleCustomerStatus = sub => {
    const nextStatus =
      sub.status === 'Active'
        ? 'Grace Period'
        : sub.status === 'Grace Period'
          ? 'Expired'
          : 'Active';
    try {
      updateCustomerSubscription(
        sub.subscriptionId,
        { status: nextStatus },
        currentUser
      );
      showToast(`Customer subscription status updated to ${nextStatus}`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Toggle Account Suspension (Stop / Resume)
  const handleToggleSuspendAccount = (id, role, isCurrentlySuspended, name) => {
    if (!isCurrentlySuspended) {
      if (!window.confirm(`Are you sure you want to temporarily STOP ${role} account "${name}"?\n\n• Their access will be paused immediately.\n• You can resume it at any time and they will continue as usual.`)) {
        return;
      }
    }
    try {
      toggleAccountSuspension(id, role, !isCurrentlySuspended, currentUser);
      if (!isCurrentlySuspended) {
        showToast(`⏸️ Account "${name}" temporarily stopped.`, 'warning');
      } else {
        showToast(`▶️ Account "${name}" resumed! They can now continue as usual.`, 'success');
      }
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Open Tier Assign Modal
  const handleOpenTierModal = (type, entity) => {
    setTierModalTarget({ type, entity });
    const eligiblePlans = plans.filter(p => (p.targetRole || 'supplier') === type);
    setSelectedTierPlanId(eligiblePlans[0]?.planId || '');
    setSelectedBillingCycle('Monthly');
  };

  // Apply Tier Modal Submission
  const handleApplyTierSubmit = e => {
    e.preventDefault();
    if (!tierModalTarget || !selectedTierPlanId) return;

    try {
      if (tierModalTarget.type === 'supplier') {
        assignSupplierPlan(
          tierModalTarget.entity.supplierId,
          selectedTierPlanId,
          selectedBillingCycle,
          currentUser
        );
        showToast(`🎉 Tier assigned to Supplier!`, 'success');
      } else {
        assignCustomerPlan(
          tierModalTarget.entity.customerId,
          selectedTierPlanId,
          selectedBillingCycle,
          currentUser
        );
        showToast(`🎉 Prime membership assigned to Customer!`, 'success');
      }
      setTierModalTarget(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Save Platform Payment Settings
  const handleSavePlatformSettings = e => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      updatePlatformSettings(platformSettings);
      showToast(
        '✅ Platform Subscription UPI & QR Code Settings Saved! Live across platform.',
        'success'
      );
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const pendingSupplierSubs = getPendingSupplierApprovals();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
            }}
          >
            Subscription Plans & Licensing Control Center
          </h1>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}
          >
            Full platform administration for Supplier SaaS licenses, Customer
            Prime memberships, feature flags, and QR gateways.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              reloadStore();
              loadData();
              showToast('Data refreshed from database! 🔄', 'info');
            }}
            style={{
              padding: '10px 16px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Reload latest records from storage"
          >
            <RefreshCw size={16} /> Refresh
          </button>

          {activeRoleTab !== 'settings' && (
            <button
              onClick={handleOpenCreatePlan}
              style={{
                padding: '10px 18px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              }}
            >
              <Plus size={18} /> Create New{' '}
              {activeRoleTab === 'supplier' ? 'Supplier' : 'Customer'} Plan
            </button>
          )}
        </div>
      </div>

      {/* Main Role Selector Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => {
            setActiveRoleTab('supplier');
            setSubView('plans');
          }}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeRoleTab === 'supplier' ? '#7c3aed' : '#f1f5f9',
            color: activeRoleTab === 'supplier' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Building2 size={18} /> Supplier Plans & SaaS Licenses (
          {plans.filter(p => (p.targetRole || 'supplier') === 'supplier').length})
        </button>

        <button
          onClick={() => {
            setActiveRoleTab('customer');
            setSubView('plans');
          }}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeRoleTab === 'customer' ? '#0284c7' : '#f1f5f9',
            color: activeRoleTab === 'customer' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={18} /> Customer Prime & VIP Plans (
          {plans.filter(p => p.targetRole === 'customer').length})
        </button>

        <button
          onClick={() => setActiveRoleTab('settings')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeRoleTab === 'settings' ? '#0f172a' : '#f1f5f9',
            color: activeRoleTab === 'settings' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <QrCode size={18} /> Admin UPI & QR Gateway
        </button>
      </div>

      {/* Sub‑view toggle (Plans vs Subscribers) */}
      {activeRoleTab !== 'settings' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSubView('plans')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border:
                subView === 'plans' ? '2px solid #0284c7' : '1px solid #cbd5e1',
              backgroundColor: subView === 'plans' ? '#e0f2fe' : '#ffffff',
              color: subView === 'plans' ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            📋 Plan Catalog & Pricing ({currentPlans.length})
          </button>

          <button
            onClick={() => setSubView('subscribers')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border:
                subView === 'subscribers'
                  ? '2px solid #0284c7'
                  : '1px solid #cbd5e1',
              backgroundColor:
                subView === 'subscribers' ? '#e0f2fe' : '#ffffff',
              color: subView === 'subscribers' ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            👥 Active Subscriptions (
            {activeRoleTab === 'supplier'
              ? supplierSubs.length
              : customerSubs.length}
            )
          </button>
        </div>
      )}

      {/* Pending Supplier Verification Alert — always shown when suppliers are awaiting approval */}
      {pendingSupplierSubs.length > 0 && (
        <div
          style={{
            backgroundColor: '#faf5ff',
            border: '2px solid #a855f7',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.12)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <ShieldCheck size={24} color="#7c3aed" />
            <div>
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#581c87',
                  margin: 0,
                }}
              >
                🔔 Pending Supplier Plan Confirmations ({pendingSupplierSubs.length})
              </h3>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: '#7e22ce',
                  margin: '2px 0 0 0',
                }}
              >
                Suppliers who submitted their UTR payment reference. Click
                below to verify and unlock their accounts instantly.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingSupplierSubs.map(sub => (
              <div
                key={sub.subscriptionId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: '1px solid #e9d5ff',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      color: '#1e293b',
                    }}
                  >
                    {sub.supplierName || sub.supplierId}
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#6b21a8',
                      marginTop: '2px',
                      display: 'flex',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      Plan:{' '}
                      <strong>
                        {sub.planName} ({sub.billingCycle || 'Monthly'})
                      </strong>
                    </span>
                    <span>
                      Fee:{' '}
                      <strong>{formatCurrency(sub.amount)}</strong>
                    </span>
                    <span>
                      UTR Reference:{' '}
                      <code
                        style={{
                          backgroundColor: '#f3e8ff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {sub.paymentReference}
                      </code>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleVerifySupplierPlan(sub)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Check size={16} /> Confirm & Activate Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* VIEW 1: PLANS CATALOG (SUPPLIER OR CUSTOMER)          */}
      {/* ==================================================== */}
      {activeRoleTab !== 'settings' && subView === 'plans' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {currentPlans.map(p => {
              const isDraft = (p.status || 'published') === 'draft';
              return (
                <div
                  key={p.planId}
                  className="card"
                  style={{
                    padding: '24px',
                    borderRadius: '16px',
                    border: p.isPopular
                      ? '2px solid #7c3aed'
                      : isDraft
                        ? '2px dashed #f59e0b'
                        : '1px solid var(--border-light)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: isDraft ? '#fffbeb' : '#ffffff',
                    boxShadow: p.isPopular
                      ? '0 4px 16px rgba(124, 58, 237, 0.12)'
                      : 'var(--shadow-sm)',
                  }}
                >
                  {/* Status & Popular Badges */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '18px',
                      display: 'flex',
                      gap: '6px',
                    }}
                  >
                    {isDraft ? (
                      <span
                        style={{
                          backgroundColor: '#d97706',
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '12px',
                        }}
                      >
                        DRAFT
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '12px',
                        }}
                      >
                        LIVE / PUBLISHED
                      </span>
                    )}

                    {p.isPopular && (
                      <span
                        style={{
                          backgroundColor: '#7c3aed',
                          color: '#ffffff',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '12px',
                        }}
                      >
                        POPULAR
                      </span>
                    )}
                  </div>

                  {/* Header & Edit Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginTop: '6px',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          margin: 0,
                          color: '#0f172a',
                        }}
                      >
                        {p.name}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        Target: {p.targetRole?.toUpperCase()} • Trial:{' '}
                        {p.trialDays || 0} days
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEditPlan(p)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#f3e8ff',
                          color: '#7c3aed',
                          border: '1px solid #d8b4fe',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p)}
                        style={{
                          padding: '5px 8px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                        title="Delete Plan"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Price Tag */}
                  <div style={{ margin: '14px 0 6px 0' }}>
                    <div
                      style={{
                        fontSize: '1.85rem',
                        fontWeight: 800,
                        color:
                          p.targetRole === 'customer' ? '#0284c7' : '#4338ca',
                      }}
                    >
                      {p.monthlyPrice === 0
                        ? 'Free'
                        : formatCurrency(p.monthlyPrice)}
                      <span
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                          fontWeight: 500,
                        }}
                      >
                        {' '}
                        / month
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#059669',
                        marginTop: '2px',
                      }}
                    >
                      Yearly:{' '}
                      {p.yearlyPrice === 0
                        ? 'Free'
                        : formatCurrency(p.yearlyPrice)}{' '}
                      / year
                    </div>
                  </div>

                  {/* Feature Flags Badges */}
                  {p.featureFlags && Object.keys(p.featureFlags).length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        margin: '8px 0',
                      }}
                    >
                      {Object.entries(p.featureFlags).map(([key, val]) => (
                        <span
                          key={key}
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: val ? '#dcfce7' : '#f1f5f9',
                            color: val ? '#166534' : '#94a3b8',
                          }}
                        >
                          {val ? '✓' : '✗'} {key}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Features List */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      marginTop: '8px',
                    }}
                  >
                    {(p.features || []).map((f, i) => (
                      <div
                        key={i}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Check size={14} color="#16a34a" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Draft Publish Action */}
                  {isDraft && (
                    <div
                      style={{
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '1px dashed #f59e0b',
                      }}
                    >
                      <button
                        onClick={() => handlePublishLive(p)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Send size={15} /> Publish Plan Live to Users
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* VIEW 2: ACTIVE SUBSCRIBERS TABLE                     */}
      {/* ==================================================== */}
      {activeRoleTab !== 'settings' && subView === 'subscribers' && (
        <div
          className="card"
          style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}
        >
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                margin: 0,
              }}
            >
              Active{' '}
              {activeRoleTab === 'supplier' ? 'Supplier' : 'Customer'} Licenses
              &amp; Memberships
            </h2>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                margin: '2px 0 0 0',
              }}
            >
              Assign plans, renew memberships, or manage grace periods and
              status.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.88rem',
              }}
            >
              <thead
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                <tr>
                  <th
                    style={{
                      padding: '14px 18px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {activeRoleTab === 'supplier' ? 'Supplier Name' : 'Customer Name'}
                  </th>
                  <th
                    style={{
                      padding: '14px 18px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Assigned Tier
                  </th>
                  <th
                    style={{
                      padding: '14px 18px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Fee
                  </th>
                  <th
                    style={{
                      padding: '14px 18px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: '14px 18px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Validity Window
                  </th>
                  <th
                    style={{
                      padding: '14px 18px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Reference
                  </th>
                  <th
                    style={{
                      padding: '14px 18px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      textAlign: 'center',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeRoleTab === 'supplier' ? (
                  supplierSubs.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          padding: '36px',
                          textAlign: 'center',
                          color: '#94a3b8',
                        }}
                      >
                        No supplier subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    supplierSubs.map(s => (
                      <tr
                        key={s.subscriptionId}
                        style={{ borderBottom: '1px solid var(--border-light)' }}
                      >
                        <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                          {s.supplierName || s.supplierId}
                        </td>
                        <td
                          style={{
                            padding: '14px 18px',
                            fontWeight: 600,
                            color: '#7c3aed',
                          }}
                        >
                          {s.planName}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 800 }}>
                          {formatCurrency(s.amount)}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor:
                                s.status === 'Suspended' || s.isSuspended
                                  ? '#fffbeb'
                                  : s.status === 'Active'
                                    ? '#dcfce7'
                                    : s.status === 'Grace Period'
                                      ? '#fef9c3'
                                      : '#fee2e2',
                              color:
                                s.status === 'Suspended' || s.isSuspended
                                  ? '#b45309'
                                  : s.status === 'Active'
                                    ? '#166534'
                                    : s.status === 'Grace Period'
                                      ? '#854d0e'
                                      : '#991b1b',
                            }}
                          >
                            {s.status === 'Suspended' || s.isSuspended ? '⏸️ Stopped' : s.status}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '14px 18px',
                            fontSize: '0.8rem',
                            color: '#64748b',
                          }}
                        >
                          {formatDate(s.startDate)} - {formatDate(s.endDate)}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: '0.78rem' }}>
                          <code>{s.paymentReference || 'N/A'}</code>
                        </td>
                        <td
                          style={{
                            padding: '14px 18px',
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                              justifyContent: 'center',
                            }}
                          >
                            <button
                              onClick={() => handleOpenTierModal('supplier', s)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                            >
                              Change Tier
                            </button>
                            <button
                              onClick={() => handleToggleSupplierStatus(s)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                            >
                              Toggle Status
                            </button>
                            {s.status === 'Suspended' || s.isSuspended ? (
                              <button
                                onClick={() => handleToggleSuspendAccount(s.supplierId, 'supplier', true, s.supplierName)}
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #6ee7b7',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                }}
                                title="Reactivate supplier account so they can continue as usual"
                              >
                                ▶️ Resume
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleSuspendAccount(s.supplierId, 'supplier', false, s.supplierName)}
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: '#fffbeb',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                }}
                                title="Temporarily stop this supplier account"
                              >
                                ⏸️ Stop
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                ) : customerSubs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        padding: '36px',
                        textAlign: 'center',
                        color: '#94a3b8',
                      }}
                    >
                      No customer subscriptions found.
                    </td>
                  </tr>
                ) : (
                  customerSubs.map(s => (
                    <tr
                      key={s.subscriptionId}
                      style={{ borderBottom: '1px solid var(--border-light)' }}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                        {s.customerName || s.customerId}
                      </td>
                      <td
                        style={{
                          padding: '14px 18px',
                          fontWeight: 600,
                          color: '#0284c7',
                        }}
                      >
                        {s.planName}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 800 }}>
                        {formatCurrency(s.amount)}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor:
                              s.status === 'Suspended' || s.isSuspended
                                ? '#fffbeb'
                                : s.status === 'Active'
                                  ? '#dcfce7'
                                  : s.status === 'Grace Period'
                                    ? '#fef9c3'
                                    : '#fee2e2',
                            color:
                              s.status === 'Suspended' || s.isSuspended
                                ? '#b45309'
                                : s.status === 'Active'
                                  ? '#166534'
                                  : s.status === 'Grace Period'
                                    ? '#854d0e'
                                    : '#991b1b',
                          }}
                        >
                          {s.status === 'Suspended' || s.isSuspended ? '⏸️ Stopped' : s.status}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '14px 18px',
                          fontSize: '0.8rem',
                          color: '#64748b',
                        }}
                      >
                        {formatDate(s.startDate)} - {formatDate(s.endDate)}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.78rem' }}>
                        <code>{s.paymentReference || 'N/A'}</code>
                      </td>
                      <td
                        style={{
                          padding: '14px 18px',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                            justifyContent: 'center',
                          }}
                        >
                          <button
                            onClick={() => handleOpenTierModal('customer', s)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            Change Tier
                          </button>
                          <button
                            onClick={() => handleToggleCustomerStatus(s)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            Toggle Status
                          </button>
                          {s.status === 'Suspended' || s.isSuspended ? (
                            <button
                              onClick={() => handleToggleSuspendAccount(s.customerId, 'customer', true, s.customerName)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #6ee7b7',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                              title="Reactivate customer account so they can continue as usual"
                            >
                              ▶️ Resume
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleSuspendAccount(s.customerId, 'customer', false, s.customerName)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                              title="Temporarily stop this customer account"
                            >
                              ⏸️ Stop
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* VIEW 3: PLATFORM UPI & QR CONFIGURATION              */}
      {/* ==================================================== */}
      {activeRoleTab === 'settings' && (
        <div
          className="card"
          style={{
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid #c7d2fe',
            backgroundColor: '#f8fafc',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <QrCode size={24} color="#4f46e5" />
            <div>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  margin: 0,
                  color: '#1e1b4b',
                }}
              >
                ⚙️ Platform Subscription QR & Admin UPI Gateway
              </h2>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: '#4338ca',
                  margin: '2px 0 0 0',
                }}
              >
                Configure the QR scanner, Admin UPI ID, and receiving phone
                number shown to subscribers during checkout.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSavePlatformSettings}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* Left Column: Admin UPI & Customer Care Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px' }}>
                  💳 Subscription Payment Receiving Credentials
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '6px',
                      }}
                    >
                      Admin Subscription UPI ID / VPA *
                    </label>
                    <input
                      type="text"
                      required
                      value={platformSettings.adminUpiId}
                      onChange={e =>
                        setPlatformSettings(prev => ({
                          ...prev,
                          adminUpiId: e.target.value,
                        }))
                      }
                      placeholder="e.g. aquaconnect.admin@upi"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '6px',
                      }}
                    >
                      Admin Phone / Google Pay Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={platformSettings.adminPhone}
                      onChange={e =>
                        setPlatformSettings(prev => ({
                          ...prev,
                          adminPhone: e.target.value,
                        }))
                      }
                      placeholder="e.g. 8522828688"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Customer Care & Support Details */}
              <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#166534', marginBottom: '12px' }}>
                  🎧 Customer Care & Platform Support Contacts
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '6px',
                      }}
                    >
                      Customer Care Phone / Helpline
                    </label>
                    <input
                      type="text"
                      value={platformSettings.customerCarePhone || ''}
                      onChange={e =>
                        setPlatformSettings(prev => ({
                          ...prev,
                          customerCarePhone: e.target.value,
                        }))
                      }
                      placeholder="e.g. +91 85228 28688"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '6px',
                      }}
                    >
                      Customer Care Support Email
                    </label>
                    <input
                      type="email"
                      value={platformSettings.customerCareEmail || ''}
                      onChange={e =>
                        setPlatformSettings(prev => ({
                          ...prev,
                          customerCareEmail: e.target.value,
                        }))
                      }
                      placeholder="e.g. support@aquaconnect.com"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '6px',
                      }}
                    >
                      WhatsApp Helpdesk Number
                    </label>
                    <input
                      type="text"
                      value={platformSettings.customerCareWhatsapp || ''}
                      onChange={e =>
                        setPlatformSettings(prev => ({
                          ...prev,
                          customerCareWhatsapp: e.target.value,
                        }))
                      }
                      placeholder="e.g. +91 85228 28688"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                style={{
                  padding: '14px',
                  backgroundColor: '#4338ca',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(67, 56, 202, 0.25)',
                }}
              >
                {isSavingSettings ? 'Saving Settings...' : '💾 Save Gateway & Customer Care Settings'}
              </button>
            </div>

            {/* Right Column: Live QR Preview & Photo Upload (Same as Supplier Account) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '24px',
                borderRadius: '16px',
                border: '1.5px solid #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#1e293b',
                  marginBottom: '12px',
                }}
              >
                📱 Live Subscription Payment QR Code
              </div>

              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '2px solid #6366f1',
                  marginBottom: '14px',
                }}
              >
                <img
                  src={
                    platformSettings.adminQrCodeUrl &&
                    platformSettings.adminQrCodeUrl.trim().length > 5
                      ? platformSettings.adminQrCodeUrl
                      : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                          'upi://pay?pa=' +
                            (platformSettings.adminUpiId || 'aquaconnect.admin@upi') +
                            '&pn=AquaConnect%20Admin&cu=INR'
                        )}`
                  }
                  alt="Admin Subscription Payment QR"
                  style={{
                    width: '180px',
                    height: '180px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>

              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#4338ca' }}>
                {platformSettings.adminUpiId || 'aquaconnect.admin@upi'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                Phone / GPay: {platformSettings.adminPhone || '8522828688'}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  width: '100%',
                  marginTop: '16px',
                }}
              >
                <label
                  className="btn btn-primary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backgroundColor: '#4338ca',
                    color: '#ffffff',
                    borderRadius: '8px',
                  }}
                >
                  <Upload size={14} /> Upload Custom Admin QR Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPlatformSettings(prev => ({
                            ...prev,
                            adminQrCodeUrl: reader.result,
                          }));
                          showToast('Custom Admin QR code photo uploaded!', 'success');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>

                {platformSettings.adminQrCodeUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlatformSettings(prev => ({
                        ...prev,
                        adminQrCodeUrl: '',
                      }));
                      showToast('Reset to auto-generated dynamic QR code', 'info');
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Reset to Auto-Generated Dynamic QR
                  </button>
                )}
              </div>

              <p
                style={{
                  fontSize: '0.72rem',
                  color: '#64748b',
                  margin: '12px 0 0 0',
                  lineHeight: '1.4',
                }}
              >
                This QR code is shown to suppliers when they choose a subscription plan on the checkout screen.
              </p>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CREATE / EDIT SUBSCRIPTION PLAN               */}
      {/* ==================================================== */}
      {isPlanModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    margin: 0,
                    color: '#0f172a',
                  }}
                >
                  {editingPlanId ? '✏️ Edit Subscription Plan' : '✨ Create New Subscription Plan'}
                </h3>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    margin: '2px 0 0 0',
                  }}
                >
                  Target Role:{' '}
                  <strong style={{ color: '#0284c7' }}>
                    {planForm.targetRole.toUpperCase()}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={e => handleSavePlanSubmit(e)}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  Target Role *
                </label>
                <select
                  value={planForm.targetRole}
                  onChange={e => setPlanForm({ ...planForm, targetRole: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="supplier">Supplier (B2B Plant SaaS License)</option>
                  <option value="customer">Customer (B2C Prime / Family Membership)</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Growth Pro Tier or Aqua Prime"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '4px',
                    }}
                  >
                    Monthly Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={planForm.monthlyPrice}
                    onChange={e => {
                      const m = Number(e.target.value);
                      setPlanForm({ ...planForm, monthlyPrice: m, yearlyPrice: m * 10 });
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '4px',
                    }}
                  >
                    Yearly Price (₹) (2 mo free)
                  </label>
                  <input
                    type="number"
                    value={planForm.yearlyPrice}
                    onChange={e => setPlanForm({ ...planForm, yearlyPrice: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 730,
                    marginBottom: '4px',
                  }}
                >
                  Free Trial Duration (Days)
                </label>
                <input
                  type="number"
                  value={planForm.trialDays}
                  onChange={e => setPlanForm({ ...planForm, trialDays: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              {/* Feature Flags Checklist */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: '6px',
                  }}
                >
                  Feature Flags
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Object.keys(planForm.featureFlags || {}).map(fKey => (
                    <label
                      key={fKey}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={!!planForm.featureFlags[fKey]}
                        onChange={e =>
                          setPlanForm({
                            ...planForm,
                            featureFlags: { ...planForm.featureFlags, [fKey]: e.target.checked },
                          })
                        }
                      />
                      <span>{fKey}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  Perks & Features List (One per line)
                </label>
                <textarea
                  rows={4}
                  value={planForm.featuresText}
                  onChange={e => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={e => handleSavePlanSubmit(e, 'draft')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fcd34d',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  onClick={e => handleSavePlanSubmit(e, 'published')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  🚀 Publish Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ASSIGN / CHANGE TIER FOR SUBSCRIBER           */}
      {/* ==================================================== */}
      {tierModalTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                Assign {tierModalTarget.type === 'supplier' ? 'Supplier' : 'Customer'} Plan
              </h3>
              <button onClick={() => setTierModalTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyTierSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  Select Plan
                </label>
                <select
                  value={selectedTierPlanId}
                  onChange={e => setSelectedTierPlanId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  {plans
                    .filter(p => (p.targetRole || 'supplier') === tierModalTarget.type)
                    .map(p => (
                      <option key={p.planId} value={p.planId}>
                        {p.name} - ₹{p.monthlyPrice}/mo or ₹{p.yearlyPrice}/yr
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: '4px',
                  }}
                >
                  Billing Cycle
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle('Monthly')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: selectedBillingCycle === 'Monthly' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: selectedBillingCycle === 'Monthly' ? '#f0f9ff' : '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle('Yearly')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: selectedBillingCycle === 'Yearly' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: selectedBillingCycle === 'Yearly' ? '#f0f9ff' : '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setTierModalTarget(null)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Apply Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptions;