import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Clock, 
  User, 
  FileText, 
  Layers,
  Trash2 
} from 'lucide-react';
import { 
  getAuditLogs, 
  getCollection,
  deleteDoc,
  subscribeToData 
} from '../../services/firestoreData';
import { formatDateTime } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';

const ACTION_FILTERS = [
  'All', 
  'ORDER_CREATED', 
  'ORDER_STATUS_UPDATE', 
  'PAYMENT_RECORDED', 
  'PAYMENT_VERIFIED', 
  'PAYMENT_DISPUTED', 
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_RENEWED'
];

const AdminAuditLogs = () => {
  const { showToast } = useNotifications();
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = () => {
    setLogs(getAuditLogs() || []);
  };

  const handleClearAllLogs = () => {
    if (!window.confirm('Are you sure you want to clear all audit log records? This permanently removes them from backend and frontend.')) return;
    try {
      const allLogs = getCollection('audit_logs') || [];
      allLogs.forEach(l => {
        deleteDoc('audit_logs', 'logId', l.logId);
      });
      showToast('All audit logs permanently cleared from backend and frontend', 'info');
      loadLogs();
    } catch (err) {
      showToast('Failed to clear logs: ' + err.message, 'error');
    }
  };

  const handleDeleteLog = (logId) => {
    try {
      deleteDoc('audit_logs', 'logId', logId);
      showToast(`Audit log #${logId} deleted`, 'info');
      loadLogs();
    } catch (err) {
      showToast('Failed to delete log: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    loadLogs();
    const unsub = subscribeToData(() => loadLogs());
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (log.action || '').toLowerCase().includes(q) ||
      (log.actor?.name || '').toLowerCase().includes(q) ||
      (log.actor?.role || '').toLowerCase().includes(q) ||
      (log.entityType || '').toLowerCase().includes(q) ||
      (log.entityId || '').toLowerCase().includes(q);

    const matchesAction = actionFilter === 'All' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            System Security & Audit Trail
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Chronological immutable record of order status changes, payment reconciliations, and administrative actions.
          </p>
        </div>
        <div>
          <button
            onClick={handleClearAllLogs}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#dc2626', borderColor: '#fca5a5' }}
            title="Permanently remove all audit log history from database"
          >
            <Trash2 size={16} /> Clear All Audit Logs
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '18px 20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input 
            type="text"
            placeholder="Search by actor, action, order ID, payment ID..."
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

        {/* Action Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ACTION_FILTERS.map(af => (
            <button
              key={af}
              onClick={() => setActionFilter(af)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: actionFilter === af ? 700 : 500,
                backgroundColor: actionFilter === af ? '#312e81' : '#f1f5f9',
                color: actionFilter === af ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {af}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
              <tr>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Timestamp</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Actor</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Action</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Entity Type & ID</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)' }}>Details / Metadata</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No audit records found matching the query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const role = log.actor?.role || 'user';
                  const roleColor = role === 'admin' ? '#7c3aed' : role === 'supplier' ? '#0284c7' : '#059669';

                  return (
                    <tr key={log.logId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{log.actor?.name || 'User'}</div>
                        <span 
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: roleColor,
                            textTransform: 'uppercase'
                          }}
                        >
                          {role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span 
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: log.action.includes('PAYMENT') ? '#ede9fe' : log.action.includes('ORDER') ? '#e0f2fe' : '#f1f5f9',
                            color: log.action.includes('PAYMENT') ? '#6b21a8' : log.action.includes('ORDER') ? '#0369a1' : '#334155'
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                          {log.entityType} #{log.entityId}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.78rem', color: '#334155', maxWidth: '350px', overflowX: 'auto' }}>
                          {JSON.stringify(log.metadata, null, 1)}
                        </pre>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteLog(log.logId)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '5px 8px', fontSize: '0.78rem' }}
                          title="Delete this audit log entry from database"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
