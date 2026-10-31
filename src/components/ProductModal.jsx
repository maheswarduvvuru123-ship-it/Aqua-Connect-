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
  'Water Packet',
  'Custom Packaging'
];

export const STANDARD_WATER_TEMPLATES = [
  {
    id: 'tpl_normal_can',
    name: '20L Normal RO Water Can',
    description: 'Standard 20 Litre purified RO+UV mineral water in returnable crystal blue can.',
    price: 50,
    stock: 60,
    unit: '20L',
    containerType: 'Returnable Jar',
    image: '/images/bubble_top_can.jpg',
    tag: '💧 Normal Water'
  },
  {
    id: 'tpl_cool_can',
    name: '20L Cool / Chilled Water Can',
    description: 'Chilled 20 Litre purified mineral water insulated camper can with dispensing tap.',
    price: 65,
    stock: 50,
    unit: '20L Chilled',
    containerType: 'Returnable Jar',
    image: '/images/cool_water_can.jpg',
    tag: '❄️ Cool Water'
  },
  {
    id: 'tpl_water_packets',
    name: 'Drinking Water Packets (50 Pouches)',
    description: 'Bundle of 50 hygienic 250ml sealed food-grade pure drinking water pouches.',
    price: 75,
    stock: 60,
    unit: '250ml x 50',
    containerType: 'Water Packet',
    image: '/images/water_pouches_pack.jpg',
    tag: '📦 Water Packets'
  },
  {
    id: 'tpl_bottles_1l',
    name: '1L Water Bottles (Box of 12)',
    description: 'Carton of twelve 1 Litre packaged natural mineral water bottles.',
    price: 180,
    stock: 45,
    unit: '1L x 12',
    containerType: 'Packaged Box',
    image: '/images/bottled_water_pack.jpg',
    tag: '🍾 1L Bottles'
  },
  {
    id: 'tpl_bottles_500ml',
    name: '500ml Water Bottles (Box of 24)',
    description: 'Carton of 24 packaged 500ml pure mineral water bottles for travel & events.',
    price: 220,
    stock: 40,
    unit: '500ml x 24',
    containerType: 'Packaged Box',
    image: '/images/bottled_water_pack.jpg',
    tag: '🥤 500ml Bottles'
  }
];

const PRESET_IMAGES = [
  { label: '💧 20L Normal Can', url: '/images/bubble_top_can.jpg' },
  { label: '❄️ 20L Cool Can', url: '/images/cool_water_can.jpg' },
  { label: '📦 Water Packets (50s)', url: '/images/water_pouches_pack.jpg' },
  { label: '🍾 Bottled Water Pack', url: '/images/bottled_water_pack.jpg' }
];

const ProductModal = ({ isOpen, onClose, product, supplierId, initialTemplate = null }) => {
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

  const applyTemplate = (tpl) => {
    setFormData({
      name: tpl.name,
      description: tpl.description,
      price: tpl.price,
      stock: tpl.stock,
      unit: tpl.unit,
      containerType: tpl.containerType,
      image: tpl.image,
      isActive: true
    });
    showToast(`Loaded template for "${tpl.name}"!`, 'info');
  };

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
    } else if (initialTemplate) {
      applyTemplate(initialTemplate);
    } else {
      setFormData({
        name: '20L Normal RO Water Can',
        description: 'Standard 20 Litre purified RO+UV mineral water in returnable crystal blue can.',
        price: 50,
        stock: 50,
        unit: '20L',
        containerType: 'Returnable Jar',
        image: PRESET_IMAGES[0].url,
        isActive: true
      });
    }
  }, [product, isOpen, initialTemplate]);

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
        {!isEditing && (
          <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '12px 14px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '8px' }}>
              ⚡ 1-Click Quick Fill from Standard Water Products
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '8px' }}>
              {STANDARD_WATER_TEMPLATES.map((tpl) => (
                <button
                  type="button"
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px 6px',
                    borderRadius: '8px',
                    backgroundColor: formData.name === tpl.name ? '#e0f2fe' : '#ffffff',
                    border: formData.name === tpl.name ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <img 
                    src={tpl.image} 
                    alt={tpl.name}
                    style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px', marginBottom: '4px' }}
                  />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                    {tpl.tag}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 800, marginTop: '2px' }}>
                    ₹{tpl.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

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
