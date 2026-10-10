import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  AlertTriangle, 
  RotateCcw, 
  TrendingUp, 
  CheckCircle2, 
  Plus, 
  Minus, 
  ShieldAlert,
  Save,
  Check,
  Trash2
} from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import Modal from '../../components/Modal';
import { getCollection, updateDoc, deleteDoc, addNotification, subscribeToData } from '../../services/firestoreData';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

const SupplierInventory = () => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();
  const [inventory, setInventory] = useState([]);
  const [editingItem, setEditingItem] = useState(null);

  const loadInventory = () => {
    setInventory(getCollection('inventory'));
  };

  useEffect(() => {
    loadInventory();
    const unsub = subscribeToData((coll) => {
      if (coll === 'inventory' || coll === 'all') loadInventory();
    });
    return () => unsub();
  }, []);

  // Summary counts
  const totalStock = inventory.reduce((sum, i) => sum + (i.availableStock || 0), 0);
  const totalSold = inventory.reduce((sum, i) => sum + (i.soldQuantity || 0), 0);
  const totalReturned = inventory.reduce((sum, i) => sum + (i.returnedQuantity || 0), 0);
  const totalDamaged = inventory.reduce((sum, i) => sum + (i.damagedQuantity || 0), 0);

  const lowStockItems = inventory.filter(i => (i.availableStock || 0) <= (i.lowStockThreshold || 15));

  const handleUpdateStock = (inventoryId, field, delta) => {
    const item = inventory.find(i => i.inventoryId === inventoryId);
    if (!item) return;

    const newVal = Math.max(0, (item[field] || 0) + delta);
    updateDoc('inventory', 'inventoryId', inventoryId, { [field]: newVal });

    // Low stock trigger notification
    if (field === 'availableStock' && newVal <= (item.lowStockThreshold || 15)) {
      addNotification({
        userId: currentUser?.uid || 'primary_supplier',
        role: 'supplier',
        title: `Low Stock Alert: ${item.productName} ⚠️`,
        message: `Stock level dropped to ${newVal} units. Please schedule refilling.`,
        type: 'inventory_alert'
      });
      showToast(`Warning: ${item.productName} is now at low stock (${newVal})!`, 'warning');
    } else {
      showToast(`${item.productName} ${field} updated`, 'info');
    }
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!editingItem) return;

    updateDoc('inventory', 'inventoryId', editingItem.inventoryId, {
      availableStock: Number(editingItem.availableStock),
      soldQuantity: Number(editingItem.soldQuantity),
      returnedQuantity: Number(editingItem.returnedQuantity),
      damagedQuantity: Number(editingItem.damagedQuantity),
      lowStockThreshold: Number(editingItem.lowStockThreshold)
    });

    showToast(`Inventory figures for ${editingItem.productName} updated!`, 'success');
    setEditingItem(null);
  };

  const handleDeleteInventoryItem = (item) => {
    if (window.confirm(`Are you sure you want to permanently delete "${item.productName}" from inventory tracking?`)) {
      try {
        deleteDoc('inventory', 'inventoryId', item.inventoryId);
        showToast(`Removed "${item.productName}" from inventory`, 'info');
        loadInventory();
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      }
    }
  };

  const handleWriteOffDamaged = () => {
    if (totalDamaged <= 0) {
      showToast('No damaged cans currently recorded to write off', 'info');
      return;
    }
    if (window.confirm(`Permanently write off and delete all ${totalDamaged} damaged cans from inventory tracking?`)) {
      try {
        inventory.forEach(item => {
          if (item.damagedQuantity > 0) {
            updateDoc('inventory', 'inventoryId', item.inventoryId, { damagedQuantity: 0 });
          }
        });
        showToast(`Successfully wrote off and cleared ${totalDamaged} damaged cans!`, 'success');
        loadInventory();
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Plant Inventory & Can Management
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Track full bottles, customer returned empty jars, damages, and replenishment alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary"
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            onClick={handleWriteOffDamaged}
            title="Write off all damaged jars from active tracking"
          >
            <Trash2 size={16} /> Write-Off Damaged Cans ({totalDamaged})
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}
      >
        <StatsCard 
          title="Available Full Cans"
          value={totalStock}
          icon={Boxes}
          color="blue"
          subtitle="Ready for dispatch"
        />
        <StatsCard 
          title="Total Cans Delivered"
          value={totalSold}
          icon={TrendingUp}
          color="emerald"
          subtitle="Units fulfilled"
        />
        <StatsCard 
          title="Returned Empty Jars"
          value={totalReturned}
          icon={RotateCcw}
          color="cyan"
          subtitle="Collected from customers"
        />
        <StatsCard 
          title="Damaged / Leaking"
          value={totalDamaged}
          icon={AlertTriangle}
          color="rose"
          subtitle="Sent for scrapping/repair"
        />
      </div>

      {/* Low-stock warning banner if applicable */}
      {lowStockItems.length > 0 && (
        <div 
          style={{
            padding: '16px 20px',
            backgroundColor: '#fef2f2',
            border: '1.5px solid #fecaca',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            color: '#991b1b'
          }}
        >
          <AlertTriangle size={28} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              Low Stock Warnings Detected ({lowStockItems.length} Products)
            </h4>
            <p style={{ fontSize: '0.825rem', marginTop: '2px' }}>
              {lowStockItems.map(i => `${i.productName} (${i.availableStock} left)`).join(', ')}. Please schedule bottling line refills.
            </p>
          </div>
        </div>
      )}

      {/* Inventory Breakdown Table (Section 9 Example) */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Water Products & Jar Status</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Detailed counts for stock, returns, and damages</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Product</th>
                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Container Type</th>
                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Available Stock</th>
                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Delivered</th>
                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Returned Jars</th>
                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Damaged Jars</th>
                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Stock Status</th>
                <th style={{ padding: '14px 18px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLow = (item.availableStock || 0) <= (item.lowStockThreshold || 15);

                return (
                  <tr 
                    key={item.inventoryId}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        {item.productName}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#64748b' }}>
                      {item.containerType || 'Returnable Jar'}
                    </td>

                    {/* Available Stock with quick increment/decrement */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '4px 8px' }}>
                        <button 
                          onClick={() => handleUpdateStock(item.inventoryId, 'availableStock', -5)}
                          style={{ color: '#64748b', padding: '2px' }}
                          title="Reduce 5"
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: '32px', color: isLow ? '#dc2626' : '#059669' }}>
                          {item.availableStock}
                        </span>
                        <button 
                          onClick={() => handleUpdateStock(item.inventoryId, 'availableStock', 10)}
                          style={{ color: '#0284c7', padding: '2px' }}
                          title="Add 10"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>

                    {/* Delivered */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
                      {item.soldQuantity || 0}
                    </td>

                    {/* Returned */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.95rem' }}>
                          {item.returnedQuantity || 0}
                        </span>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                          onClick={() => handleUpdateStock(item.inventoryId, 'returnedQuantity', 1)}
                          title="Log +1 returned jar"
                        >
                          +1 Return
                        </button>
                      </div>
                    </td>

                    {/* Damaged */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.95rem' }}>
                          {item.damagedQuantity || 0}
                        </span>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.72rem', color: '#dc2626' }}
                          onClick={() => handleUpdateStock(item.inventoryId, 'damagedQuantity', 1)}
                          title="Log +1 damaged jar"
                        >
                          +1 Damage
                        </button>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                      {isLow ? (
                        <span className="badge badge-cancelled" style={{ fontSize: '0.72rem' }}>
                          Low Stock ⚠️
                        </span>
                      ) : (
                        <span className="badge badge-delivered" style={{ fontSize: '0.72rem' }}>
                          Adequate Stock
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingItem(item)}
                        >
                          Adjust
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '6px 8px' }}
                          title={`Delete ${item.productName} from inventory`}
                          onClick={() => handleDeleteInventoryItem(item)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Inventory Modal */}
      {editingItem && (
        <Modal 
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          title={`Adjust Inventory: ${editingItem.productName}`}
        >
          <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Available Stock
                </label>
                <input 
                  type="number"
                  min="0"
                  required
                  value={editingItem.availableStock}
                  onChange={(e) => setEditingItem({ ...editingItem, availableStock: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Total Delivered
                </label>
                <input 
                  type="number"
                  min="0"
                  value={editingItem.soldQuantity}
                  onChange={(e) => setEditingItem({ ...editingItem, soldQuantity: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Returned Empty Cans
                </label>
                <input 
                  type="number"
                  min="0"
                  value={editingItem.returnedQuantity}
                  onChange={(e) => setEditingItem({ ...editingItem, returnedQuantity: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Damaged Cans
                </label>
                <input 
                  type="number"
                  min="0"
                  value={editingItem.damagedQuantity}
                  onChange={(e) => setEditingItem({ ...editingItem, damagedQuantity: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Low Stock Alert Threshold
              </label>
              <input 
                type="number"
                min="1"
                value={editingItem.lowStockThreshold || 15}
                onChange={(e) => setEditingItem({ ...editingItem, lowStockThreshold: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Notification triggers when stock drops to or below this number.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SupplierInventory;
