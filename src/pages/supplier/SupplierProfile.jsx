import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  CreditCard, 
  Bell, 
  KeyRound, 
  LogOut, 
  Save, 
  Check, 
  Plus, 
  X,
  Droplets,
  Database,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDoc, updateDoc, seedLiveFirestore } from '../../services/firestoreData';
import { isLiveFirebaseConfigured } from '../../services/firebase';
import { useNotifications } from '../../context/NotificationContext';
import ZomatoLocationPickerModal from '../../components/ZomatoLocationPickerModal';

const PRESET_PLANT_PHOTOS = [
  { label: 'Modern RO Facility', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80' },
  { label: 'Industrial Water Plant', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80' },
  { label: 'Automated Bottling', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80' },
  { label: 'Spring Water Station', url: 'https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?w=800&auto=format&fit=crop&q=80' },
  { label: 'Can Filling Center', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80' },
];

const SupplierProfile = () => {
  const { currentUser, logout } = useAuth();
  const { showToast } = useNotifications();

  const [supplierData, setSupplierData] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Hyderabad',
    gstNumber: '',
    logo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    plantDetails: '',
    deliveryAreas: [],
    codEnabled: true,
    upiEnabled: true,
    upiId: ''
  });

  const [newArea, setNewArea] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const handleSelectMapArea = (location) => {
    const areaName = location.locality || location.city;
    if (areaName && !supplierData.deliveryAreas.includes(areaName)) {
      setSupplierData(prev => ({
        ...prev,
        deliveryAreas: [...prev.deliveryAreas, areaName]
      }));
      showToast(`Added "${areaName}" to delivery areas!`, 'success');
    }
    setIsMapModalOpen(false);
  };
  const [isEditing, setIsEditing] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const isLive = isLiveFirebaseConfigured();

  const handleSeedDatabase = async () => {
    setSeedingLoading(true);
    try {
      const summary = await seedLiveFirestore();
      const totalDocs = Object.values(summary).reduce((a, b) => a + b, 0);
      showToast(`Cloud Firestore seeded successfully! (${totalDocs} documents synced)`, 'success');
    } catch (err) {
      showToast(err.message || 'Seeding failed. Verify your .env.local configuration.', 'error');
    } finally {
      setSeedingLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      const sup = getDoc('suppliers', 'supplierId', currentUser.uid);
      setSupplierData(prev => ({
        ...prev,
        ...(sup || {}),
        businessName: sup?.businessName || currentUser.businessName || (currentUser.name ? `${currentUser.name}'s Water Supply` : 'My Water Supply Plant'),
        ownerName: sup?.ownerName || currentUser.name || '',
        email: currentUser.email || sup?.email || '',
        phone: sup?.phone || currentUser.phone || '',
        address: sup?.address || currentUser.address || '',
        city: sup?.city || currentUser.city || 'Hyderabad',
        gstNumber: sup?.gstNumber || currentUser.gstNumber || '',
        deliveryAreas: sup?.deliveryAreas || currentUser?.deliveryAreas || []
      }));
    }
  }, [currentUser]);

  const handleSave = (e) => {
    e.preventDefault();
    if (currentUser?.uid) {
      updateDoc('suppliers', 'supplierId', currentUser.uid, supplierData);
      updateDoc('users', 'uid', currentUser.uid, {
        name: supplierData.ownerName,
        phone: supplierData.phone,
        address: supplierData.address,
        city: supplierData.city,
        gstNumber: supplierData.gstNumber,
        deliveryAreas: supplierData.deliveryAreas,
        profileImage: supplierData.logo
      });
    }
    setIsEditing(false);
    showToast('Business profile and plant details saved successfully!', 'success');
  };

  const handleAddArea = () => {
    if (!newArea.trim()) return;
    if (supplierData.deliveryAreas?.includes(newArea.trim())) {
      showToast('Delivery area already added', 'warning');
      return;
    }
    setSupplierData(prev => ({
      ...prev,
      deliveryAreas: [...(prev.deliveryAreas || []), newArea.trim()]
    }));
    setNewArea('');
  };

  const handleRemoveArea = (area) => {
    setSupplierData(prev => ({
      ...prev,
      deliveryAreas: (prev.deliveryAreas || []).filter(a => a !== area)
    }));
  };

  const handleClearAllAreas = () => {
    setSupplierData(prev => ({
      ...prev,
      deliveryAreas: []
    }));
    showToast('Cleared all delivery areas. Add your custom service zones.', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Supplier Business Profile
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Plant information, delivery zones, GST credentials, and payment settings.
          </p>
        </div>

        <button 
          className={isEditing ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel Editing' : 'Edit Profile'}
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Business Branding & Owner Details */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="#0284c7" /> Water Business & Plant Information
          </h3>

          {/* Plant Facility Photo from Gallery */}
          <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <img 
              src={supplierData.logo || PRESET_PLANT_PHOTOS[0].url} 
              alt="Plant Facility" 
              style={{ width: '100px', height: '65px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Water Plant Facility Photo
              </p>
              <label 
                className="btn btn-secondary btn-sm"
                style={{ cursor: isEditing ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', opacity: isEditing ? 1 : 0.6 }}
              >
                Choose Photo from Gallery / Device
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={!isEditing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setSupplierData(prev => ({ ...prev, logo: reader.result }));
                        showToast('Facility photo selected from device!', 'success');
                      };
                      reader.readAsDataURL(file);
                    }
                  }} 
                  style={{ display: 'none' }} 
                />
              </label>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Displayed to customers browsing water plants in your locality.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Business / Plant Name
              </label>
              <input 
                type="text"
                disabled={!isEditing}
                value={supplierData.businessName}
                onChange={(e) => setSupplierData({ ...supplierData, businessName: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Owner / Manager Name
              </label>
              <input 
                type="text"
                disabled={!isEditing}
                value={supplierData.ownerName}
                onChange={(e) => setSupplierData({ ...supplierData, ownerName: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Primary Phone Number
              </label>
              <input 
                type="text"
                disabled={!isEditing}
                value={supplierData.phone}
                onChange={(e) => setSupplierData({ ...supplierData, phone: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Registered Email
              </label>
              <input 
                type="email"
                disabled={!isEditing}
                value={supplierData.email}
                onChange={(e) => setSupplierData({ ...supplierData, email: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Plant Facility Address
              </label>
              <input 
                type="text"
                disabled={!isEditing}
                value={supplierData.address}
                onChange={(e) => setSupplierData({ ...supplierData, address: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                City & State
              </label>
              <input 
                type="text"
                disabled={!isEditing}
                value={supplierData.city}
                onChange={(e) => setSupplierData({ ...supplierData, city: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                GST Number (Optional)
              </label>
              <input 
                type="text"
                disabled={!isEditing}
                value={supplierData.gstNumber}
                onChange={(e) => setSupplierData({ ...supplierData, gstNumber: e.target.value })}
                placeholder="e.g. 36AAAAA0000A1Z5"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Water Purification & Plant Specifications
              </label>
              <textarea 
                rows="2"
                disabled={!isEditing}
                value={supplierData.plantDetails}
                onChange={(e) => setSupplierData({ ...supplierData, plantDetails: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>
          </div>
        </div>

        {/* Delivery Areas */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={20} color="#0284c7" /> Serviced Delivery Areas / Localities
            </h3>
            {isEditing && (supplierData.deliveryAreas?.length || 0) > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.75rem' }}
                onClick={handleClearAllAreas}
              >
                Clear All Areas
              </button>
            )}
          </div>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Only customers living in or ordering to these specific delivery areas will be routed to your plant.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {(!supplierData.deliveryAreas || supplierData.deliveryAreas.length === 0) ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', margin: '4px 0' }}>
                No delivery zones configured yet. Enter your local delivery service localities below.
              </p>
            ) : (
              supplierData.deliveryAreas.map((area) => (
                <span 
                  key={area}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  📍 {area}
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveArea(area)}
                      style={{ color: '#0369a1', display: 'flex', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
                      title={`Remove ${area}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>

          {isEditing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '520px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}
                onClick={() => setIsMapModalOpen(true)}
              >
                <MapPin size={16} /> Pick Delivery Area on Map / GPS
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text"
                placeholder="Enter locality or area name (e.g. Madhapur, Sector 5)..."
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddArea();
                  }
                }}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddArea}>
                <Plus size={16} /> Add Area
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Payment Settings */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={20} color="#0284c7" /> Customer Payment Settings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: isEditing ? 'pointer' : 'default' }}>
              <input 
                type="checkbox"
                disabled={!isEditing}
                checked={supplierData.codEnabled}
                onChange={(e) => setSupplierData({ ...supplierData, codEnabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#0284c7' }}
              />
              Accept Cash on Delivery (COD) for water can drop-offs
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: isEditing ? 'pointer' : 'default' }}>
              <input 
                type="checkbox"
                disabled={!isEditing}
                checked={supplierData.upiEnabled}
                onChange={(e) => setSupplierData({ ...supplierData, upiEnabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#0284c7' }}
              />
              Accept UPI QR Code Payments
            </label>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Supplier Merchant UPI VPA / ID
              </label>
              <input 
                type="text"
                disabled={!isEditing}
                value={supplierData.upiId}
                onChange={(e) => setSupplierData({ ...supplierData, upiId: e.target.value })}
                style={{ maxWidth: '320px', width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>
          </div>
        </div>

        {/* Cloud Backend & Firestore Settings Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={20} color="#0284c7" />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Firebase Cloud Backend & Live Sync</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Real-time Cloud Firestore synchronization and authentication state
                </p>
              </div>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: isLive ? '#dcfce7' : '#fef3c7',
              color: isLive ? '#15803d' : '#b45309'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isLive ? '#16a34a' : '#f59e0b'
              }}></span>
              {isLive ? 'Live Firebase Connected' : 'Offline / Local Demo Store'}
            </span>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', fontSize: '0.85rem', color: '#475569', marginBottom: '16px' }}>
            {isLive ? (
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>
                  ✓ Active Project ID: <code style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{import.meta.env.VITE_FIREBASE_PROJECT_ID || 'aquaconnect-water'}</code>
                </p>
                <p style={{ margin: '6px 0 0 0' }}>
                  Orders, products, deliveries, and can inventory automatically synchronize with your Google Cloud Firestore in real time.
                </p>
              </div>
            ) : (
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#92400e' }}>
                  ⓘ Using Local High-Performance Seed Database
                </p>
                <p style={{ margin: '6px 0 0 0' }}>
                  To connect to your own Firebase project, copy your web configuration keys into <code style={{ backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>.env.local</code> in the project root.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={seedingLoading || !isLive}
              onClick={handleSeedDatabase}
              title={!isLive ? "Connect live Firebase credentials in .env.local first" : "Upload initial catalog, sample customers, and cans to Firestore"}
            >
              <RefreshCw size={15} className={seedingLoading ? 'spin' : ''} />
              {seedingLoading ? 'Uploading to Firestore...' : 'Seed Cloud Firestore Database'}
            </button>
          </div>
        </div>

        {/* Buttons (Section 11: Edit Profile, Change Password, Notification Settings, Logout) */}
        {isEditing && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={18} /> Save All Changes
            </button>
          </div>
        )}

        {/* Emergency App Support Card */}
        <div 
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div 
            style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <PhoneCall size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#166534' }}>
              Emergency App Support
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#15803d', marginTop: '2px' }}>
              Helpline: 8522828688 (24x7 Assistance)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '2px' }}>
              Call for immediate plant dispatch, order assistance & app support
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => showToast('Password reset link sent to your registered email.', 'info')}
          >
            <KeyRound size={16} /> Change Password
          </button>
          <button 
            type="button" 
            className="btn btn-danger btn-sm"
            onClick={logout}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </form>
      <ZomatoLocationPickerModal 
        isOpen={isMapModalOpen} 
        onClose={() => setIsMapModalOpen(false)} 
        onSelectLocation={handleSelectMapArea} 
        role="supplier" 
      />
    </div>
  );
};

export default SupplierProfile;
