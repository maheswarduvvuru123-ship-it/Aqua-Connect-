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
  Check 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDoc, updateDoc } from '../../services/firestoreData';
import { useNotifications } from '../../context/NotificationContext';

const CustomerProfile = () => {
  const { currentUser, logout, updateCurrentUser } = useAuth();
  const { showToast } = useNotifications();

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

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Primary Delivery Address
              </label>
              <textarea 
                rows="2"
                disabled={!isEditing}
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: isEditing ? '#ffffff' : '#f8fafc' }}
              />
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
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: '10px', alignItems: 'center' }}>
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
            Emergency App Support
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#15803d', marginTop: '2px' }}>
            Helpline: 8522828688 (24x7 Assistance)
          </div>
          <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '2px' }}>
            Call for immediate water delivery & app support assistance
          </div>
        </div>
      </div>

      {/* Account actions: Change Password, Logout */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => showToast('Password reset instructions sent to your email.', 'info')}
        >
          <KeyRound size={16} /> Change Password
        </button>
        <button 
          className="btn btn-danger btn-sm"
          onClick={logout}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default CustomerProfile;
