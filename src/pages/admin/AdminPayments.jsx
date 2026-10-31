import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  FileText, 
  Check, 
  X, 
  ShieldCheck,
  Trash2 
} from 'lucide-react';
import { 
  getCollection, 
  subscribeToData, 
  deleteDoc,
  verifyPayment, 
  disputePayment, 
  calculateOutstandingBalance 
} from '../../services/firestoreData';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import Modal from '../../components/Modal';

const STATUS_FILTERS = ['All', 'Reported', 'Verified', 'Disputed'];

const AdminPayments = () => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');

  // Action modals
  const [verifyingPayment, setVerifyingPayment] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [disputingPayment, setDisputingPayment] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = () => {
    setPayments(getCollection('payments') || []);
    setOrders(getCollection('orders') || []);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToData(() => loadData());
    return () => unsub();
  }, []);

  const handleConfirmVerify = () => {
    if (!verifyingPayment) return;
    setIsSubmitting(true);
    try {
      verifyPayment(
        verifyingPayment.paymentId, 
        { notes: verificationNotes || 'Verified by Admin against bank credits' }, 
        currentUser
      );
      showToast(`Payment #${verifyingPayment.paymentId} marked as Verified! 💧`, 'success');
      setVerifyingPayment(null);
      setVerificationNotes('');
      loadData();
    } catch (err) {
      showToast(`Failed to verify payment: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDispute = () => {
    if (!disputingPayment) return;
    if (!disputeReason.trim()) {
      showToast('Please provide a dispute or discrepancy reason.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      disputePayment(disputingPayment.paymentId, disputeReason, currentUser);
      showToast(`Payment flagged as Disputed for audit review.`, 'info');
      setDisputingPayment(null);
      setDisputeReason('');
      loadData();
    } catch (err) {
      showToast(`Failed to dispute payment: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = (paymentId) => {
    if (!window.confirm(`Are you sure you want to permanently delete Payment #${paymentId}? This will remove it from both backend and frontend.`)) return;
    try {
      deleteDoc('payments', 'paymentId', paymentId);
      showToast(`Payment #${paymentId} permanently deleted`, 'info');
      loadData();
    } catch (err) {
      showToast('Failed to delete payment: ' + err.message, 'error');
    }
  };

  const filteredPayments = payments.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (p.paymentId || '').toLowerCase().includes(q) ||
      (p.orderId || '').toLowerCase().includes(q) ||
      (p.reference || '').toLowerCase().includes(q) ||
      (p.customerName || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesMethod = methodFilter === 'All' || p.method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Direct Payments & Reconciliation
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Review, verify, and resolve disputes for direct Cash on Delivery and UPI payments.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '18px 20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input 
              type="text"
              placeholder="Search by Payment ID, Order ID, UPI UTR reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="All">All Methods</option>
              <option value="Cash">Cash on Delivery</option>
              <option value="UPI">Direct UPI</option>
            </select>
          </div>
        </div>

        {/* Status Pill Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {STATUS_FILTERS.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: statusFilter === st ? 700 : 500,
                backgroundColor: statusFilter === st ? '#7c3aed' : '#f1f5f9',
                color: statusFilter === st ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
              <tr>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Payment ID</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Order ID</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Customer</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Amount</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Method & Ref</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Recorded By</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Paid At</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Reconciliation Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No payment records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => {
                  const isVerified = p.status === 'Verified';
                  const isDisputed = p.status === 'Disputed';

                  return (
                    <tr key={p.paymentId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#7c3aed' }}>
                        #{p.paymentId}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0369a1' }}>
                        #{p.orderId}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600 }}>{p.customerName || 'Customer'}</div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(p.amount)}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: p.method === 'UPI' ? '#ede9fe' : '#fef3c7',
                            color: p.method === 'UPI' ? '#7c3aed' : '#b45309'
                          }}
                        >
                          {p.method}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Ref: {p.reference || 'None'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {p.recordedBy?.name || 'Staff'} ({p.recordedBy?.role || 'user'})
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: isVerified ? '#dcfce7' : isDisputed ? '#fee2e2' : '#fef3c7',
                            color: isVerified ? '#15803d' : isDisputed ? '#b91c1c' : '#b45309'
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {formatDateTime(p.paidAt || p.createdAt)}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          {!isVerified && !isDisputed ? (
                            <>
                              <button
                                onClick={() => setVerifyingPayment(p)}
                                className="btn btn-sm"
                                style={{ backgroundColor: '#16a34a', color: '#ffffff', padding: '5px 10px', fontSize: '0.78rem', gap: '4px' }}
                              >
                                <Check size={13} /> Verify
                              </button>
                              <button
                                onClick={() => setDisputingPayment(p)}
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#b91c1c', borderColor: '#fca5a5', padding: '5px 10px', fontSize: '0.78rem', gap: '4px' }}
                              >
                                <X size={13} /> Dispute
                              </button>
                            </>
                          ) : isVerified ? (
                            <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                              ✓ Verified by {p.verifiedBy?.name || 'Admin'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600 }}>
                              ⚠️ Under Dispute
                            </span>
                          )}
                          <button
                            onClick={() => handleDeletePayment(p.paymentId)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '5px 8px', fontSize: '0.78rem' }}
                            title="Delete this payment record permanently from backend & frontend"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verify Confirmation Modal */}
      {verifyingPayment && (
        <Modal
          isOpen={true}
          onClose={() => setVerifyingPayment(null)}
          title={`Confirm Payment Verification`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You are verifying direct payment <strong>#{verifyingPayment.paymentId}</strong> for Order <strong>#{verifyingPayment.orderId}</strong> amounting to <strong>{formatCurrency(verifyingPayment.amount)}</strong>.
            </p>

            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
              <div>Method: <strong>{verifyingPayment.method}</strong></div>
              <div>Reference UTR: <strong>{verifyingPayment.reference || 'N/A'}</strong></div>
              <div>Recorded By: <strong>{verifyingPayment.recordedBy?.name} ({verifyingPayment.recordedBy?.role})</strong></div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Verification Note (Optional):
              </label>
              <input 
                type="text"
                placeholder="e.g. Verified against bank statement credit..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button 
                onClick={() => setVerifyingPayment(null)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmVerify}
                className="btn btn-primary"
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Verifying...' : 'Confirm Verification'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dispute Modal */}
      {disputingPayment && (
        <Modal
          isOpen={true}
          onClose={() => setDisputingPayment(null)}
          title={`Dispute Payment Record`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.9rem', color: '#b91c1c', lineHeight: 1.5 }}>
              Flagging payment <strong>#{disputingPayment.paymentId}</strong> as disputed will mark the order balance for review and notify stakeholders.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Dispute Reason / Discrepancy Note:
              </label>
              <textarea 
                rows="3"
                placeholder="e.g. UTR reference not found in bank ledger, duplicate claim..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button 
                onClick={() => setDisputingPayment(null)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDispute}
                className="btn"
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Flag as Disputed'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminPayments;
