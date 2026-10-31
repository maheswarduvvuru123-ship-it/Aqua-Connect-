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
  RefreshCw,
  ShieldAlert,
  FileText,
  Trash2,
  PhoneCall,
  Zap,
  Award,
  QrCode,
  ArrowRight,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  getDoc, 
  updateDoc, 
  getCollection, 
  requestSupplierSubscription, 
  getPlatformSettings, 
  checkSupplierSubscriptionValid,
  subscribeToData 
} from '../../services/firestoreData';
import { useNotifications } from '../../context/NotificationContext';
import ZomatoLocationPickerModal from '../../components/ZomatoLocationPickerModal';
import TermsPrivacyModal from '../../components/TermsPrivacyModal';

const PRESET_PLANT_PHOTOS = [
  { label: 'Modern RO Facility', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80' },
  { label: 'Industrial Water Plant', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80' },
  { label: 'Automated Bottling', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80' },
  { label: 'Spring Water Station', url: 'https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?w=800&auto=format&fit=crop&q=80' },
  { label: 'Can Filling Center', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80' },
];

const SupplierProfile = () => {
  const { currentUser, logout, deleteAccount, updateCurrentUser, changePassword } = useAuth();
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
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState('terms');
  const [isDeleting, setIsDeleting] = useState(false);

  // Free Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Subscription Plan Upgrade State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('plan_pro');
  const [billingCycle, setBillingCycle] = useState('Monthly');
  const [upgradeUtr, setUpgradeUtr] = useState('');
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
  const [platformSettings, setPlatformSettings] = useState({
    adminUpiId: 'aquaconnect.admin@upi',
    adminPhone: '8522828688',
    adminQrCodeUrl: ''
  });

  const subStatus = checkSupplierSubscriptionValid(currentUser?.uid);

  useEffect(() => {
    setPlatformSettings(getPlatformSettings());
  }, []);

  const handleUpgradeSubmit = (e) => {
    e.preventDefault();
    const cleanUtr = upgradeUtr.replace(/\D/g, '');
    if (cleanUtr.length !== 12) {
      showToast('Please enter a valid 12-digit numeric UTR transaction number', 'warning');
      return;
    }
    setIsSubmittingUpgrade(true);
    try {
      const plans = getCollection('subscription_plans') || [];
      const selectedPlan = plans.find(p => p.planId === selectedPlanId) || { yearlyPrice: 9999, monthlyPrice: 999, name: 'Pro Flow Plan' };
      const amount = billingCycle === 'Yearly' ? (selectedPlan.yearlyPrice || 9999) : (selectedPlan.monthlyPrice || 999);
      requestSupplierSubscription({
        supplierId: currentUser.uid,
        supplierName: supplierData.businessName || currentUser.name || 'Water Plant',
        planId: selectedPlanId,
        billingCycle,
        paymentReference: cleanUtr,
        amount
      });
      showToast('🎉 Upgrade request submitted! Admin will verify and activate your plan shortly.', 'success');
      setShowUpgradeModal(false);
      setUpgradeUtr('');
      setSupplierData(prev => ({
        ...prev,
        status: 'Pending Verification',
        planName: selectedPlan.name,
        billingCycle
      }));
    } catch (err) {
      showToast('Failed to submit upgrade: ' + err.message, 'error');
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      if (changePassword) {
        await changePassword(newPassword);
      }
      showToast('✅ Password changed successfully for free! You can now use your new password.', 'success');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast('Failed to change password: ' + err.message, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const persistAreas = (updatedAreas) => {
    if (currentUser?.uid) {
      try {
        updateDoc('suppliers', 'supplierId', currentUser.uid, { deliveryAreas: updatedAreas });
        updateDoc('users', 'uid', currentUser.uid, { deliveryAreas: updatedAreas });
        if (updateCurrentUser) {
          updateCurrentUser({ deliveryAreas: updatedAreas });
        }
      } catch (err) {
        console.warn("Error auto-persisting delivery areas:", err);
      }
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      showToast('Your supplier plant and account data have been permanently deleted.', 'info');
    } catch (err) {
      showToast('Failed to delete supplier account: ' + err.message, 'error');
      setIsDeleting(false);
    }
  };

  const handleSelectMapArea = (location) => {
    const areaName = location.locality || location.city;
    if (areaName && !supplierData.deliveryAreas?.includes(areaName)) {
      const updated = [...(supplierData.deliveryAreas || []), areaName];
      setSupplierData(prev => ({
        ...prev,
        deliveryAreas: updated
      }));
      persistAreas(updated);
      showToast(`📍 Added & saved "${areaName}" to active delivery zones!`, 'success');
    }
    setIsMapModalOpen(false);
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
        profileImage: supplierData.logo,
        upiId: supplierData.upiId,
        upiPhoneNumber: supplierData.upiPhoneNumber,
        qrCodeUrl: supplierData.qrCodeUrl,
        codEnabled: supplierData.codEnabled,
        upiEnabled: supplierData.upiEnabled
      });
    }
    setIsEditing(false);
    showToast('Business profile and plant details saved successfully!', 'success');
  };

  const handleSavePaymentSettings = () => {
    if (currentUser?.uid) {
      updateDoc('suppliers', 'supplierId', currentUser.uid, {
        upiId: supplierData.upiId,
        upiPhoneNumber: supplierData.upiPhoneNumber,
        qrCodeUrl: supplierData.qrCodeUrl,
        codEnabled: supplierData.codEnabled,
        upiEnabled: supplierData.upiEnabled
      });
      updateDoc('users', 'uid', currentUser.uid, {
        upiId: supplierData.upiId,
        upiPhoneNumber: supplierData.upiPhoneNumber,
        qrCodeUrl: supplierData.qrCodeUrl,
        codEnabled: supplierData.codEnabled,
        upiEnabled: supplierData.upiEnabled
      });
    }
    setIsEditingPayment(false);
    showToast('Merchant QR code & UPI payment setup saved successfully!', 'success');
  };

  const handleAddArea = () => {
    const trimmed = newArea.trim();
    if (!trimmed) return;
    if (supplierData.deliveryAreas?.includes(trimmed)) {
      showToast('Delivery area already added', 'warning');
      return;
    }
    const updated = [...(supplierData.deliveryAreas || []), trimmed];
    setSupplierData(prev => ({
      ...prev,
      deliveryAreas: updated
    }));
    persistAreas(updated);
    setNewArea('');
    showToast(`📍 Added & saved "${trimmed}" to active delivery zones!`, 'success');
  };

  const handleRemoveArea = (area) => {
    const updated = (supplierData.deliveryAreas || []).filter(a => a !== area);
    setSupplierData(prev => ({
      ...prev,
      deliveryAreas: updated
    }));
    persistAreas(updated);
    showToast(`Removed "${area}" from delivery zones.`, 'info');
  };

  const handleClearAllAreas = () => {
    setSupplierData(prev => ({
      ...prev,
      deliveryAreas: []
    }));
    persistAreas([]);
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowPasswordModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <KeyRound size={16} /> Change Password (Free)
          </button>
          <button 
            className={isEditing ? 'btn btn-secondary' : 'btn btn-primary'}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>
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

        {/* Customer Payment Settings & QR Scanner Setup */}
        {(() => {
          const isPaymentEditable = isEditing || isEditingPayment;
          return (
            <div className="glass-card" style={{ padding: '24px', border: isPaymentEditable ? '2px solid #0284c7' : '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={20} color="#0284c7" /> Direct Customer Payment & QR Scanner Setup
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '8px', display: 'inline-block', marginTop: '4px' }}>
                    Direct Supplier Settlement (Zero Commission)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!isEditing && (
                    !isEditingPayment ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0284c7', borderColor: '#bae6fd' }}
                        onClick={() => setIsEditingPayment(true)}
                      >
                        ✏️ Edit QR & UPI
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setIsEditingPayment(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={handleSavePaymentSettings}
                        >
                          <Save size={15} /> Save QR Setup
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>

              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                When customers order water cans from your plant, they pay directly to your account using the UPI ID, mobile number, or QR code you configure below.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {/* Left Column: Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: isPaymentEditable ? 'pointer' : 'default' }}>
                    <input 
                      type="checkbox"
                      disabled={!isPaymentEditable}
                      checked={supplierData.codEnabled}
                      onChange={(e) => setSupplierData({ ...supplierData, codEnabled: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#0284c7' }}
                    />
                    Accept Cash on Delivery (COD) for water can drop-offs
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: isPaymentEditable ? 'pointer' : 'default' }}>
                    <input 
                      type="checkbox"
                      disabled={!isPaymentEditable}
                      checked={supplierData.upiEnabled}
                      onChange={(e) => setSupplierData({ ...supplierData, upiEnabled: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#0284c7' }}
                    />
                    Accept Direct UPI & QR Code Payments
                  </label>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                      Merchant UPI ID / VPA *
                    </label>
                    <input 
                      type="text"
                      disabled={!isPaymentEditable}
                      placeholder="e.g. srikrishna.water@upi or 9876543210@paytm"
                      value={supplierData.upiId || ''}
                      onChange={(e) => setSupplierData({ ...supplierData, upiId: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isPaymentEditable ? '#ffffff' : '#f8fafc' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                      UPI Mobile Number (for GPay / PhonePe / Paytm number transfer)
                    </label>
                    <input 
                      type="text"
                      disabled={!isPaymentEditable}
                      placeholder="e.g. +91 98765 43210"
                      value={supplierData.upiPhoneNumber || supplierData.phone || ''}
                      onChange={(e) => setSupplierData({ ...supplierData, upiPhoneNumber: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isPaymentEditable ? '#ffffff' : '#f8fafc' }}
                    />
                  </div>
                </div>

                {/* Right Column: Live QR Scanner Preview & Upload */}
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                    Live Customer Checkout QR Preview
                  </div>

                  <img 
                    src={supplierData.qrCodeUrl && supplierData.qrCodeUrl.length > 5 
                      ? supplierData.qrCodeUrl 
                      : `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('upi://pay?pa=' + (supplierData.upiId || 'plant.water@upi') + '&pn=' + encodeURIComponent(supplierData.businessName || 'Water Plant') + '&cu=INR')}`}
                    alt="Plant Merchant QR Code"
                    style={{ width: '130px', height: '130px', borderRadius: '8px', border: '2px solid #0284c7', backgroundColor: '#ffffff', padding: '6px' }}
                  />

                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369a1', marginTop: '6px' }}>
                    {supplierData.upiId || 'plant.water@upi'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Fulfilling: {supplierData.businessName || 'My Water Supply Plant'}
                  </div>

                  {isPaymentEditable && (
                    <div style={{ marginTop: '10px' }}>
                      <label 
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '5px 10px', cursor: 'pointer' }}
                      >
                        Upload Custom QR Scanner Image
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setSupplierData(prev => ({ ...prev, qrCodeUrl: reader.result }));
                                showToast('Custom QR scanner image loaded!', 'success');
                              };
                              reader.readAsDataURL(file);
                            }
                          }} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                      {supplierData.qrCodeUrl && (
                        <button
                          type="button"
                          onClick={() => setSupplierData(prev => ({ ...prev, qrCodeUrl: '' }))}
                          style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '0.7rem', cursor: 'pointer', display: 'block', margin: '4px auto 0' }}
                        >
                          Reset to Auto-Generated QR
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Subscription Plan & Status */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#7c3aed" /> Subscription Plan & Status
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span 
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  backgroundColor: subStatus.isExpired ? '#fee2e2' : (supplierData.status === 'Pending Verification' ? '#fef3c7' : '#dcfce7'),
                  color: subStatus.isExpired ? '#dc2626' : (supplierData.status === 'Pending Verification' ? '#b45309' : '#15803d')
                }}
              >
                {subStatus.isExpired ? '🚫 Plan Expired' : (supplierData.status === 'Pending Verification' ? '⏳ Pending Admin Verification' : '✓ Active')}
              </span>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
                }}
              >
                <Zap size={14} /> Upgrade / Renew Plan
              </button>
            </div>
          </div>

          {/* Expired warning if applicable */}
          {subStatus.isExpired && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: 600 }}>
                ⚠️ Your 1-Day Free Trial has expired. Upgrade to a paid plan to keep receiving customer orders.
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Choose Paid Plan →
              </button>
            </div>
          )}

          {(() => {
            const planTitle = supplierData.planName || currentUser?.planName || 'Free Trial (1 Day)';
            const cycle = supplierData.billingCycle || currentUser?.billingCycle || '1-Day Free Trial';
            const isTrial = planTitle.toLowerCase().includes('trial') || 
                            cycle.toLowerCase().includes('trial') || 
                            supplierData.isTrial || 
                            currentUser?.isTrial;
            const isYearly = cycle === 'Yearly';
            const isEnterprise = planTitle.toLowerCase().includes('enterprise');

            const feeDisplay = isTrial 
              ? '₹0 (1-Day Free Trial)' 
              : isEnterprise 
                ? (isYearly ? '₹24,999 / year' : '₹2,499 / month')
                : (isYearly ? '₹9,999 / year' : '₹999 / month');

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: subStatus.isExpired ? '#fef2f2' : '#faf5ff', border: subStatus.isExpired ? '1px solid #fecaca' : '1px solid #e9d5ff', borderRadius: '12px', padding: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ fontSize: '0.8rem', color: subStatus.isExpired ? '#dc2626' : '#6b21a8', fontWeight: 700 }}>
                    {subStatus.isExpired ? 'EXPIRED PLAN' : 'CURRENT ACTIVE PLAN'}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: subStatus.isExpired ? '#991b1b' : '#581c87', marginTop: '2px' }}>
                    {isTrial ? 'Free Trial (1 Day)' : `${planTitle} (${cycle})`}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: subStatus.isExpired ? '#b91c1c' : '#7e22ce', marginTop: '4px' }}>
                    {subStatus.isExpired 
                      ? 'Access expired. Click "Upgrade / Renew Plan" above to activate full monthly or yearly access.'
                      : (isTrial 
                        ? '1-Day Free Trial active. Direct customer dispatch & full water plant access enabled.' 
                        : 'Direct customer dispatch, unlimited jar orders & isolated merchant payments enabled.')}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b21a8' }}>Platform Fee:</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#581c87' }}>
                    {feeDisplay}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: subStatus.isExpired ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                    {subStatus.isExpired ? 'Expired' : (supplierData.status === 'Pending Verification' ? '⏳ Under Review' : '✓ Admin Verified')}
                  </div>
                </div>
              </div>
            );
          })()}
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
            className="btn btn-secondary btn-sm"
            onClick={() => { setLegalTab('terms'); setShowLegalModal(true); }}
          >
            <FileText size={16} /> Terms & Conditions
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => { setLegalTab('privacy'); setShowLegalModal(true); }}
          >
            <ShieldCheck size={16} /> Privacy Policy
          </button>
          <button 
            type="button" 
            className="btn btn-danger btn-sm"
            onClick={logout}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Danger Zone: Permanent Account Deletion */}
        <div 
          style={{
            marginTop: '24px',
            padding: '20px 24px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b', marginBottom: '8px' }}>
            <ShieldAlert size={20} />
            <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
              Danger Zone: Delete Supplier Account & Plant Facility
            </h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#b91c1c', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Permanently remove your water plant facility, supplier profile, delivery areas, and can catalog from our live database. This operation is irreversible.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            style={{
              padding: '9px 18px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
            }}
          >
            <Trash2 size={16} /> Delete My Supplier Account & Plant
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Supplier Account Deletion */}
      {showDeleteModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}
          >
            <div 
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}
            >
              <ShieldAlert size={30} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
              Delete Supplier Account?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              Are you sure you want to permanently delete your supplier plant facility ({supplierData.businessName || currentUser?.email})? All plant details, delivery configurations, and listings will be permanently eradicated.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                {isDeleting ? 'Deleting Plant...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Password Change Modal */}
      {showPasswordModal && (
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
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#0284c7" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Change Password (Free)
                </h3>
              </div>
              <button 
                onClick={() => setShowPasswordModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '18px', lineHeight: '1.4' }}>
              Update your account password for free. Works directly with your local account and Firebase Authentication.
            </p>

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  New Password (min 6 characters) *
                </label>
                <input 
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Confirm New Password *
                </label>
                <input 
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Upgrade & Subscription Modal */}
      {showUpgradeModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
            overflowY: 'auto'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpgradeModal(false); }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '620px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={22} color="#7c3aed" /> Upgrade Supplier Platform Plan
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                  Choose your business subscription plan to unlock unlimited customer orders & live delivery dispatch.
                </p>
              </div>
              <button 
                onClick={() => setShowUpgradeModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Billing Cycle Toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setBillingCycle('Monthly')}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    backgroundColor: billingCycle === 'Monthly' ? '#ffffff' : 'transparent',
                    color: billingCycle === 'Monthly' ? '#7c3aed' : '#64748b',
                    boxShadow: billingCycle === 'Monthly' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('Yearly')}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    backgroundColor: billingCycle === 'Yearly' ? '#ffffff' : 'transparent',
                    color: billingCycle === 'Yearly' ? '#7c3aed' : '#64748b',
                    boxShadow: billingCycle === 'Yearly' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Yearly Billing</span>
                  <span style={{ fontSize: '0.68rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '6px' }}>Save 17%</span>
                </button>
              </div>
            </div>

            {/* Plan Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
              {/* Pro Flow Plan */}
              <div
                onClick={() => setSelectedPlanId('plan_pro')}
                style={{
                  border: selectedPlanId === 'plan_pro' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                  backgroundColor: selectedPlanId === 'plan_pro' ? '#faf5ff' : '#ffffff',
                  borderRadius: '14px',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>MOST POPULAR</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>Pro Flow Plan</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#7c3aed' }}>
                  {billingCycle === 'Yearly' ? '₹9,999' : '₹999'}
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>/{billingCycle === 'Yearly' ? 'year' : 'mo'}</span>
                </div>
                <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>✓ Unlimited customer orders</li>
                  <li>✓ Live real-time delivery alerts</li>
                  <li>✓ Custom UPI & QR code payments</li>
                  <li>✓ Priority support assistance</li>
                </ul>
              </div>

              {/* Enterprise Aqua */}
              <div
                onClick={() => setSelectedPlanId('plan_enterprise')}
                style={{
                  border: selectedPlanId === 'plan_enterprise' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                  backgroundColor: selectedPlanId === 'plan_enterprise' ? '#faf5ff' : '#ffffff',
                  borderRadius: '14px',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>MULTI-PLANT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>Enterprise Aqua</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0284c7' }}>
                  {billingCycle === 'Yearly' ? '₹24,999' : '₹2,499'}
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>/{billingCycle === 'Yearly' ? 'year' : 'mo'}</span>
                </div>
                <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>✓ Everything in Pro Flow</li>
                  <li>✓ Multi-vehicle delivery fleet</li>
                  <li>✓ Dedicated Account Manager</li>
                  <li>✓ 24/7 VIP Emergency Helpline</li>
                </ul>
              </div>
            </div>

            {/* Admin Payment Info & UPI QR Code */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <QrCode size={16} color="#0284c7" /> Step 1: Scan & Pay Platform Subscription Fee
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=${platformSettings.adminUpiId || 'aquaconnect.admin@upi'}&pn=AquaConnect%20Admin&am=${selectedPlanId === 'plan_enterprise' ? (billingCycle === 'Yearly' ? 24999 : 2499) : (billingCycle === 'Yearly' ? 9999 : 999)}&cu=INR`)}`}
                  alt="Admin Subscription QR Code"
                  style={{ width: '110px', height: '110px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '4px' }}
                />
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Admin Official UPI ID:</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{platformSettings.adminUpiId || 'aquaconnect.admin@upi'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>Admin Helpline / WhatsApp:</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0284c7' }}>📞 8522828688</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Payable Amount: <strong style={{ color: '#15803d' }}>₹{selectedPlanId === 'plan_enterprise' ? (billingCycle === 'Yearly' ? '24,999' : '2,499') : (billingCycle === 'Yearly' ? '9,999' : '999')}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Enter 12-digit UTR */}
            <form onSubmit={handleUpgradeSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Step 2: Enter 12-digit UPI Transaction Ref (UTR) *
                </label>
                <input 
                  type="text"
                  required
                  maxLength={12}
                  value={upgradeUtr}
                  onChange={(e) => setUpgradeUtr(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 402819284712 (12 numeric digits)"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #7c3aed',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    letterSpacing: '1px'
                  }}
                />
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                  Found on your GPay / PhonePe / Paytm transaction receipt as "UPI Ref No" or "UTR".
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUpgradeModal(false)}
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpgrade || upgradeUtr.length !== 12}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: upgradeUtr.length === 12 ? '#7c3aed' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: upgradeUtr.length === 12 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Zap size={16} />
                  <span>{isSubmittingUpgrade ? 'Submitting...' : 'Submit Upgrade for Admin Approval'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terms & Privacy Policy Modal */}
      <TermsPrivacyModal 
        isOpen={showLegalModal} 
        onClose={() => setShowLegalModal(false)} 
        initialTab={legalTab} 
      />

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
