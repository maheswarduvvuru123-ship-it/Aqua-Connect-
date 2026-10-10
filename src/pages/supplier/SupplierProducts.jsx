import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Layers, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Boxes, 
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import ProductModal from '../../components/ProductModal';
import EmptyState from '../../components/EmptyState';
import { getCollection, updateDoc, deleteDoc, subscribeToData } from '../../services/firestoreData';
import { formatCurrency } from '../../utils/formatters';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

const SupplierProducts = () => {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const loadProducts = () => {
    setProducts(getCollection('products'));
  };

  useEffect(() => {
    loadProducts();
    const unsub = subscribeToData((coll) => {
      if (coll === 'products' || coll === 'all') loadProducts();
    });
    return () => unsub();
  }, []);

  const handleToggleActive = (product) => {
    try {
      updateDoc('products', 'productId', product.productId, { isActive: !product.isActive });
      showToast(`${product.name} is now ${!product.isActive ? 'Active' : 'Hidden'} in catalog`, 'info');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleQuickStockUpdate = (productId, delta) => {
    const p = products.find(prod => prod.productId === productId);
    if (!p) return;
    const newStock = Math.max(0, (p.stock || 0) + delta);
    updateDoc('products', 'productId', productId, { stock: newStock });
    showToast(`Stock updated for ${p.name}: ${newStock} units available`, 'info');
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDeleteProduct = (product) => {
    if (window.confirm(`Are you sure you want to permanently delete "${product.name}" from your catalog?`)) {
      try {
        deleteDoc('products', 'productId', product.productId);
        showToast(`Deleted "${product.name}" from catalog`, 'success');
        loadProducts();
      } catch (err) {
        showToast(`Failed to delete product: ${err.message}`, 'error');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Water Products Catalog
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Manage 20L jars, 10L cans, water bottle packs, prices, and stock inventory.
          </p>
        </div>

        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add New Water Product
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <EmptyState 
          icon={Layers}
          title="No products configured"
          description="Click Add New Water Product to add 20L cans, bottles, or dispensers."
          actionText="Add Product"
          onAction={openAddModal}
        />
      ) : (
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}
        >
          {products.map((product) => {
            const isLowStock = (product.stock || 0) <= 15;

            return (
              <div 
                key={product.productId}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                  border: isLowStock ? '1.5px solid #fca5a5' : '1px solid var(--border-light)'
                }}
              >
                {/* Image */}
                <div style={{ position: 'relative', height: '170px', width: '100%', overflow: 'hidden' }}>
                  <img 
                    src={product.image} 
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  {/* Status overlay */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                    <span 
                      className={product.isActive ? 'badge badge-delivered' : 'badge badge-cancelled'}
                      style={{ fontSize: '0.72rem' }}
                    >
                      {product.isActive ? 'Active in Store' : 'Inactive'}
                    </span>
                  </div>

                  {isLowStock && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span className="badge badge-cancelled" style={{ fontSize: '0.72rem', backgroundColor: '#dc2626', color: '#fff' }}>
                        Low Stock: {product.stock}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {product.name}
                      </h3>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                      {product.unit} • {product.containerType}
                    </div>

                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                      {product.description}
                    </p>
                  </div>

                  <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                          SELLING PRICE
                        </span>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                          {formatCurrency(product.price)}
                        </div>
                      </div>

                      {/* Stock quick controls */}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                          STOCK AVAILABLE
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            onClick={() => handleQuickStockUpdate(product.productId, -5)}
                            title="Decrease stock by 5"
                          >
                            -5
                          </button>
                          <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: '32px', textAlign: 'center' }}>
                            {product.stock}
                          </span>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            onClick={() => handleQuickStockUpdate(product.productId, 10)}
                            title="Add 10 cans to stock"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => openEditModal(product)}
                      >
                        <Edit3 size={15} /> Edit
                      </button>

                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ color: product.isActive ? '#d97706' : '#059669' }}
                        onClick={() => handleToggleActive(product)}
                        title={product.isActive ? 'Hide from customer store' : 'Activate in store'}
                      >
                        {product.isActive ? 'Hide' : 'Show'}
                      </button>

                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                        onClick={() => handleDeleteProduct(product)}
                        title="Delete product from catalog"
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <ProductModal 
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
          supplierId={currentUser?.uid || 'primary_supplier'}
        />
      )}
    </div>
  );
};

export default SupplierProducts;
