import React, { useState, useEffect } from 'react';
import { 
  User,
  PhoneCall, 
  Mail, 
  Phone, 
  MapPin, 
  Plus, 
  Trash2, 
  KeyRound, 
  Bell, 
  LogOut, 
  Save, 
  Check,
  ShieldAlert,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDoc, updateDoc, getPlatformSettings } from '../../services/firestoreData';
import { useNotifications } from '../../context/NotificationContext';
import TermsPrivacyModal from '../../components/TermsPrivacyModal';
import ZomatoLocationPickerModal, { reverseGeocodeCoords } from '../../components/ZomatoLocationPickerModal';

const CustomerProfile = () => {
  const { currentUser, logout, updateCurrentUser, deleteAccount, changePassword } = useAuth();
  const { showToast } = useNotifications();

  const [platformSettings, setPlatformSettings] = useState(getPlatformSettings());

  // Free Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
      showToast('✅ Password updated successfully for free! You can now use your new password.', 'success');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast('Failed to change password: ' + err.message, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: '',
    profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    address: ''
  });

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapTargetMode, setMapTargetMode] = useState('primary'); // 'primary' | 'saved'
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState('terms');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      showToast('Your customer account and personal data were permanently deleted.', 'info');
    } catch (err) {
      showToast('Failed to delete account: ' + err.message, 'error');
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        email: currentUser.email || '',
        profileImage: currentUser.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        address: currentUser.address || ''
      });
      if (currentUser.savedAddresses && currentUser.savedAddresses.length > 0) {
        setSavedAddresses(currentUser.savedAddresses);
      } else if (currentUser.address) {
        setSavedAddresses([
          { id: 'addr_1', label: 'Primary Delivery Address', address: currentUser.address, isPrimary: true }
        ]);
      } else {
        setSavedAddresses([]);
      }
    }
  }, [currentUser]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (currentUser?.uid) {
      if (updateCurrentUser) {
        updateCurrentUser({
          name: profile.name,
          phone: profile.phone,
          address: profile.address
        });
      }
      try {
        updateDoc('users', 'uid', currentUser.uid, {
          name: profile.name,
          phone: profile.phone,
          address: profile.address
        });
        updateDoc('customers', 'customerId', currentUser.uid, {
          name: profile.name,
          phone: profile.phone,
          address: profile.address
        });
      } catch (err) {
        // ignore
      }
    }
    setIsEditing(false);
    showToast('Profile information updated successfully!', 'success');
  };

  const saveAddressDirectly = (addressText) => {
    if (!addressText.trim()) return;

    const updatedAddresses = savedAddresses.length > 0 
      ? savedAddresses.map(a => a.isPrimary ? { ...a, address: addressText } : a)
      : [{ id: 'addr_1', label: 'Primary Delivery Address', address: addressText, isPrimary: true }];

    setSavedAddresses(updatedAddresses);
    setProfile(prev => ({ ...prev, address: addressText }));

    if (updateCurrentUser) {
      updateCurrentUser({
        address: addressText,
        savedAddresses: updatedAddresses
      });
    }

    if (currentUser?.uid) {
      try {
        updateDoc('users', 'uid', currentUser.uid, {
          address: addressText,
          savedAddresses: updatedAddresses
        });
        updateDoc('customers', 'customerId', currentUser.uid, {
          address: addressText
        });
      } catch (e) {
        console.warn("Storage update error", e);
      }
    }
  };

  const handleSelectMapLocation = (location) => {
    const fullAddress = location.fullAddress || location.formattedAddress || `${location.locality}, ${location.city}`;
    if (!fullAddress) return;

    if (mapTargetMode === 'saved') {
      setNewAddr(fullAddress);
      if (!newLabel && location.locality) {
        setNewLabel(location.locality);
      }
      showToast(`Selected location on map: ${location.locality || fullAddress}`, 'info');
    } else {
      saveAddressDirectly(fullAddress);
      showToast(`Primary delivery location updated: ${location.locality || fullAddress}`, 'success');
      setIsEditingAddress(false);
    }
    setIsMapModalOpen(false);
  };

  const handleDetectGPSLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setIsLocatingGPS(true);
    showToast('Acquiring precise GPS coordinates...', 'info');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await reverseGeocodeCoords(lat, lng);
          if (res && res.formattedAddress) {
            const fullAddress = res.formattedAddress;
            saveAddressDirectly(fullAddress);
            showToast(`GPS location detected: ${res.locality || fullAddress}!`, 'success');
            setIsEditingAddress(false);
          } else {
            showToast('Please select or search your locality on the interactive map.', 'info');
            setIsMapModalOpen(true);
          }
        } catch (err) {
          showToast('Failed to acquire GPS location: ' + err.message, 'error');
        } finally {
          setIsLocatingGPS(false);
        }
      },
      (err) => {
        setIsLocatingGPS(false);
        showToast('GPS location permission denied or timed out.', 'warning');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleAddAddress = () => {
    if (!newAddr.trim()) {
      showToast('Delivery address cannot be empty', 'warning');
      return;
    }
    const label = newLabel.trim() || 'Delivery Address';
    const addressText = newAddr.trim();
    const newEntry = {
      id: `addr_${Date.now()}`,
      label,
      address: addressText,
      isPrimary: savedAddresses.length === 0
    };
    const updated = [...savedAddresses, newEntry];
    setSavedAddresses(updated);

    const primaryAddr = (savedAddresses.length === 0 || !currentUser?.address) 
      ? addressText 
      : currentUser.address;

    if (updateCurrentUser) {
      updateCurrentUser({
        address: primaryAddr,
        savedAddresses: updated
      });
    }
    try {
      updateDoc('users', 'uid', currentUser?.uid, {
        address: primaryAddr,
        savedAddresses: updated
      });
      updateDoc('customers', 'customerId', currentUser?.uid, {
        address: primaryAddr
      });
    } catch (err) {
      // ignore
    }

    setProfile(prev => ({ ...prev, address: primaryAddr }));
    setNewLabel('');
    setNewAddr('');
    showToast('Delivery address saved successfully!', 'success');
  };

  const handleRemoveAddress = (id) => {
    const updated = savedAddresses.filter(a => a.id !== id);
    setSavedAddresses(updated);
    const newPrimary = updated.length > 0 ? updated[0].address : '';
    if (updateCurrentUser) {
      updateCurrentUser({
        address: newPrimary,
        savedAddresses: updated
      });
    }
    try {
      updateDoc('users', 'uid', currentUser?.uid, {
        address: newPrimary,
        savedAddresses: updated
      });
      updateDoc('customers', 'customerId', currentUser?.uid, {
        address: newPrimary
      });
    } catch (err) {
      // ignore
    }
    setProfile(prev => ({ ...prev, address: newPrimary }));
    showToast('Address removed', 'info');
  };

  const handleSetPrimary = (target) => {
    const updated = savedAddresses.map(a => ({
      ...a,
      isPrimary: a.id === target.id
    }));
    setSavedAddresses(updated);
    if (updateCurrentUser) {
      updateCurrentUser({
        address: target.address,
        savedAddresses: updated
      });
    }
    try {
      updateDoc('users', 'uid', currentUser?.uid, {
        address: target.address,
        savedAddresses: updated
      });
      updateDoc('customers', 'customerId', currentUser?.uid, {
        address: target.address
      });
    } catch (err) {
      // ignore
    }
    setProfile(prev => ({ ...prev, address: target.address }));
    showToast(`Set "${target.label}" as primary address`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Customer Account & Profile
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Manage delivery addresses, phone number, and password credentials.
          </p>
        </div>

        <button 
          className={isEditing ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* Main Profile Info (Section 17) */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
          <img 
            src={profile.profileImage}
            alt={profile.name}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #bae6fd',
              boxShadow: 'var(--shadow-md)'
            }}
          />
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {profile.name}
            </h3>
            <span className="badge badge-out-for-delivery" style={{ marginTop: '4px' }}>
              Active Water Customer
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Full Name
              </label>
              <input 
                type="text"
                disabled={!isEditing}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Phone Number
              </label>
              <input 
                type="text"
                disabled={!isEditing}
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Email Address
              </label>
              <input 
                type="email"
                disabled
                value={profile.email}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: '#f1f5f9' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2', backgroundColor: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0369a1', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={18} color="#0284c7" /> Primary Delivery Location & Address
                </label>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ffffff', color: '#0284c7', borderColor: '#bae6fd' }}
                    onClick={() => {
                      setMapTargetMode('primary');
                      setIsMapModalOpen(true);
                    }}
                  >
                    🗺️ Pick on Map
                  </button>

                  <button
                    type="button"
                    disabled={isLocatingGPS}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ffffff', color: '#059669', borderColor: '#a7f3d0' }}
                    onClick={handleDetectGPSLocation}
                  >
                    📍 {isLocatingGPS ? 'Detecting GPS...' : 'Detect GPS'}
                  </button>

                  {!isEditingAddress ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                      onClick={() => setIsEditingAddress(true)}
                    >
                      ✏️ Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                      onClick={() => {
                        saveAddressDirectly(profile.address);
                        setIsEditingAddress(false);
                        showToast('Delivery address updated!', 'success');
                      }}
                    >
                      <Save size={14} /> Save Address
                    </button>
                  )}
                </div>
              </div>

              <textarea 
                rows="2"
                disabled={!isEditing && !isEditingAddress}
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Click 'Pick on Map', 'Detect GPS', or type full house/flat address, street, landmark..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: (isEditing || isEditingAddress) ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  backgroundColor: (isEditing || isEditingAddress) ? '#ffffff' : '#f8fafc',
                  fontSize: '0.9rem',
                  lineHeight: 1.4
                }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                All your drinking water can orders and scheduled deliveries will be routed to this exact address.
              </p>
            </div>
          </div>

          {isEditing && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Save Changes
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Saved Addresses Section (Section 17: Saved Addresses) */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={20} color="#0284c7" /> Saved Delivery Addresses
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
          {savedAddresses.map((addr) => (
            <div 
              key={addr.id}
              style={{
                padding: '14px',
                border: '1px solid var(--border-light)',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                  {addr.label}
                </div>
                <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '2px' }}>
                  {addr.address}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {addr.address === profile.address ? (
                  <span className="badge badge-delivered" style={{ fontSize: '0.75rem' }}>
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    onClick={() => handleSetPrimary(addr)}
                  >
                    Set as Primary
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => handleRemoveAddress(addr.id)}
                  style={{ color: '#ef4444', padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
                  title="Remove address"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Address fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr auto auto', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text"
            placeholder="Label (e.g. Shop)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
          />
          <input 
            type="text"
            placeholder="Detailed address line & landmark"
            value={newAddr}
            onChange={(e) => setNewAddr(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}
          />
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            title="Pick address location on interactive map"
            onClick={() => {
              setMapTargetMode('saved');
              setIsMapModalOpen(true);
            }}
          >
            🗺️ Map
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleAddAddress}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

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
            Customer Care & Emergency Support
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#15803d', marginTop: '2px' }}>
            Helpline: {platformSettings.customerCarePhone || platformSettings.adminPhone || '8522828688'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '2px' }}>
            Email: {platformSettings.customerCareEmail || 'support@aquaconnect.com'} • WhatsApp: {platformSettings.customerCareWhatsapp || platformSettings.customerCarePhone || '8522828688'}
          </div>
        </div>
      </div>

      {/* Account actions: Change Password, Logout */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => setShowPasswordModal(true)}
        >
          <KeyRound size={16} /> Change Password (Free)
        </button>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => { setLegalTab('terms'); setShowLegalModal(true); }}
        >
          <FileText size={16} /> Terms & Conditions
        </button>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => { setLegalTab('privacy'); setShowLegalModal(true); }}
        >
          <ShieldCheck size={16} /> Privacy Policy
        </button>
        <button 
          className="btn btn-danger btn-sm"
          onClick={logout}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* Danger Zone: Permanent Account Deletion */}
      <div 
        style={{
          marginTop: '32px',
          padding: '20px 24px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b', marginBottom: '8px' }}>
          <ShieldAlert size={20} />
          <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
            Danger Zone: Delete Account
          </h4>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#b91c1c', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Permanently delete your AquaConnect customer account, delivery addresses, and personal profile from our live database. This action is irreversible.
        </p>
        <button
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
          <Trash2 size={16} /> Delete My Customer Account
        </button>
      </div>

      {/* Confirmation Modal for Account Deletion */}
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
              Permanently Delete Account?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              Are you sure you want to delete your AquaConnect customer account ({currentUser?.email})? All your delivery addresses and personal records will be completely removed from our live databases.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Cancel
              </button>
              <button
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
                {isDeleting ? 'Deleting Data...' : 'Yes, Delete Account'}
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
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '18px', lineHeight: '1.4' }}>
              Update your customer account password for free. Directly updates your local and Firebase credentials.
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
                  placeholder="Enter new password"
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

      {/* Terms & Privacy Policy Modal */}
      <TermsPrivacyModal 
        isOpen={showLegalModal} 
        onClose={() => setShowLegalModal(false)} 
        initialTab={legalTab} 
      />

      {/* Interactive Delivery Location Map Modal */}
      <ZomatoLocationPickerModal 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={handleSelectMapLocation}
        currentAddress={mapTargetMode === 'saved' ? newAddr : profile.address}
        role="customer"
      />
    </div>
  );
};

export default CustomerProfile;
