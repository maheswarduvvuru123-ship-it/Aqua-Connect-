import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Layers, Image as ImageIcon, Save, Trash2 } from 'lucide-react';
import { setDoc, updateDoc, deleteDoc } from '../services/firestoreData';
import { useNotifications } from '../context/NotificationContext';

const CONTAINER_TYPES = [
  'Returnable Jar',
  'Disposable Bottle',
  'Packaged Box',
  'Dispenser Bubble Top',
  'Custom Packaging'
];

const PRESET_IMAGES = [
  { label: '20L Plastic Can', url: 'https://5.imimg.com/data5/AP/MU/MY-4515526/20-litre-can-jug-jar-dispenser-500x500.jpg' },
  { label: '20L Cool Camper Can', url: 'https://5.imimg.com/data5/SELLER/Default/2021/4/AM/HZ/GJ/35689307/20ltres-cool-can-1--500x500.jpeg' },
  { label: '1L Water Bottles', url: 'https://5.imimg.com/data5/SELLER/Default/2022/11/NF/WB/JJ/45711328/1-litre-packed-drinking-water-bottle-500x500.jpg' },
  { label: 'Water Packets (50s)', url: 'https://5.imimg.com/data5/SELLER/Default/2024/3/401402931/HR/MG/JG/11262634/ldpe-packed-drinking-water-pouch-500x500.jpg' },
  { label: '5L Water Dispenser', url: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=500&auto=format&fit=crop&q=80' }
];

const ProductModal = ({ isOpen, onClose, product, supplierId }) => {
  const { showToast } = useNotifications();
  const isEditing = Boolean(product);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 50,
    stock: 50,
    unit: '20L',
    containerType: 'Returnable Jar',
    image: PRESET_IMAGES[0].url,
    isActive: true
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        stock: product.stock || 0,
        unit: product.unit || '20L',
        containerType: product.containerType || 'Returnable Jar',
        image: product.image || PRESET_IMAGES[0].url,
        isActive: product.isActive !== undefined ? product.isActive : true
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 50,
        stock: 50,
        unit: '20L',
        containerType: 'Returnable Jar',
        image: PRESET_IMAGES[0].url,
        isActive: true
      });
    }
  }, [product, isOpen]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image size should be less than 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result }));
        showToast('Product photo selected from device!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name) {
      showToast('Product name is required', 'error');
      return;
    }

    try {
      if (isEditing) {
        updateDoc('products', 'productId', product.productId, {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock)
        });
        showToast(`Product "${formData.name}" updated successfully!`, 'success');
      } else {
        const newId = `prod_${Date.now()}`;
        setDoc('products', 'productId', {
          productId: newId,
          supplierId: supplierId || 'primary_supplier',
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock)
        });

        // Also add entry to inventory
        setDoc('inventory', 'inventoryId', {
          inventoryId: `inv_${Date.now()}`,
          supplierId: supplierId || 'primary_supplier',
          productId: newId,
          productName: formData.name,
          containerType: formData.containerType,
          availableStock: Number(formData.stock),
          soldQuantity: 0,
          returnedQuantity: 0,
          damagedQuantity: 0,
          lowStockThreshold: 15,
          updatedAt: new Date().toISOString()
        });

        showToast(`New product "${formData.name}" added to catalog!`, 'success');
      }
      onClose();
    } catch (err) {
      showToast(`Error saving product: ${err.message}`, 'error');
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to deactivate or remove "${formData.name}"?`)) {
      deleteDoc('products', 'productId', product.productId);
      showToast('Product removed from catalog', 'info');
      onClose();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? `Edit Product: ${product?.name}` : 'Add New Water Product'}
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Name and Container type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Product Name *
            </label>
            <input 
              type="text"
              required
              placeholder="e.g. 20L Water Can"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Container Type
            </label>
            <select
              value={formData.containerType}
              onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                backgroundColor: '#ffffff',
                fontSize: '0.9rem'
              }}
            >
              {CONTAINER_TYPES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Price, Stock, Unit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Price (₹) *
            </label>
            <input 
              type="number"
              min="0"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Available Stock *
            </label>
            <input 
              type="number"
              min="0"
              required
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Unit / Volume
            </label>
            <input 
              type="text"
              placeholder="e.g. 20L, 500ml x 24"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            rows="2"
            placeholder="Purified drinking water with minerals..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              fontSize: '0.9rem',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Image selection / Device Photo Picker */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
            Product Image (from Gallery or Preset)
          </label>

          {/* Photo Preview & Device Upload Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            {formData.image && (
              <img 
                src={formData.image} 
                alt="Product preview" 
                style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            )}
            <div>
              <label 
                className="btn btn-secondary btn-sm"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 12px' }}
              >
                <ImageIcon size={16} /> Choose Photo from Gallery / Device
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                Select JPG or PNG directly from your device storage.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {PRESET_IMAGES.map((preset, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setFormData({ ...formData, image: preset.url })}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: formData.image === preset.url ? '2px solid #0284c7' : '1px solid var(--border-light)',
                  backgroundColor: formData.image === preset.url ? '#e0f2fe' : '#ffffff',
                  fontSize: '0.78rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
            <input 
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
            />
            Active & Visible in Customer Storefront
          </label>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          {isEditing ? (
            <button 
              type="button" 
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
            >
              <Trash2 size={16} /> Delete Product
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={18} /> {isEditing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ProductModal;
