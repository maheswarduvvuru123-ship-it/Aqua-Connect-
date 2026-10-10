import React, { useState } from 'react';
import { 
  Droplets, 
  Truck, 
  ShieldCheck, 
  Boxes, 
  BarChart3, 
  ArrowRight, 
  UserCheck, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  MapPin, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  Crosshair,
  Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import ZomatoLocationPickerModal, { reverseGeocodeCoords } from '../components/ZomatoLocationPickerModal';

const WelcomePage = () => {
  const { login, signup, authError, isLiveFirebase, resetPassword } = useAuth();
  const { showToast } = useNotifications();

  // Mode: 'welcome' | 'login' | 'signup' | 'forgot_password'
  const [mode, setMode] = useState('welcome');
  const [selectedRole, setSelectedRole] = useState('supplier'); // 'supplier' | 'customer'
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const handleQuickDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser. Please select your location on the map.', 'warning');
      setIsMapModalOpen(true);
      return;
    }

    setIsDetectingLocation(true);
    showToast('📡 Detecting your current GPS location...', 'info');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const result = await reverseGeocodeCoords(latitude, longitude);
        if (result && result.formattedAddress) {
          setAddress(result.formattedAddress);
          showToast(`📍 Location auto-detected: ${result.locality}, ${result.city}!`, 'success');
        } else {
          setAddress(`Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}, Hyderabad`);
          showToast('GPS coordinates acquired!', 'success');
        }
        setIsDetectingLocation(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        showToast('GPS permission not granted. Opening interactive map picker...', 'info');
        setIsDetectingLocation(false);
        setIsMapModalOpen(true);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  };

  const handleOpenAuth = (role, authMode = 'login') => {
    setSelectedRole(role);
    setMode(authMode);
    setPassword('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password, selectedRole);
      showToast(`Welcome back, ${selectedRole === 'supplier' ? 'Supplier Partner' : 'Valued Customer'}! 💧`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signup({
        name,
        email,
        password,
        phone,
        role: selectedRole,
        address
      });
      showToast(`Account created successfully as ${selectedRole}!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email address to receive the password reset link', 'error');
      return;
    }
    setIsLoading(true);
    try {
      if (resetPassword) {
        await resetPassword(email);
      }
      showToast(`Password recovery mail sent to ${email}! Please check your inbox.`, 'success');
      setMode('login');
    } catch (err) {
      showToast(err.message || 'Could not send recovery email. Verify that email is registered.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="water-bg-pattern"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        position: 'relative'
      }}
    >
      {/* Decorative Top Floating Header */}
      <header 
        style={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          boxShadow: '0 4px 20px rgba(2, 132, 199, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}
          >
            <Droplets size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
              AquaConnect
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>
              Smart Water Delivery Management
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span 
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: isLiveFirebase ? '#ecfdf5' : '#f0f9ff',
              color: isLiveFirebase ? '#065f46' : '#0369a1',
              border: `1px solid ${isLiveFirebase ? '#a7f3d0' : '#bae6fd'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isLiveFirebase ? '#10b981' : '#0284c7' }} />
            {isLiveFirebase ? 'Firebase Live' : 'Active Realtime Engine'}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main 
        style={{
          maxWidth: '1100px',
          width: '100%',
          margin: '40px auto',
          display: 'grid',
          gridTemplateColumns: mode === 'welcome' ? '1.2fr 1fr' : '1fr',
          gap: '40px',
          alignItems: 'center'
        }}
      >
        {/* Left Side: Hero Introduction & Value Props */}
        {mode === 'welcome' && (
          <div>
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: '18px'
              }}
            >
              <Sparkles size={16} /> Specialized Water-Can POS & Dispatch
            </div>

            <h2 style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-1px' }}>
              Pure Water Deliveries, <br />
              <span style={{ 
                background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent' 
              }}>
                Seamlessly Managed.
              </span>
            </h2>

            <p style={{ fontSize: '1.05rem', color: '#475569', marginTop: '16px', lineHeight: 1.6, maxWidth: '520px' }}>
              Built specifically for water plants, 20L can suppliers, and retail customers. Track returnable jars, assign truck routes, manage pending balances, and deliver on-time.
            </p>

            {/* Quick feature bullets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                <CheckCircle2 size={18} color="#0284c7" /> Empty Can Returns Tracking
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                <CheckCircle2 size={18} color="#0284c7" /> Real-time Delivery Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                <CheckCircle2 size={18} color="#0284c7" /> Instant Thermal Invoices
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                <CheckCircle2 size={18} color="#0284c7" /> Low-Stock Can Alerts
              </div>
            </div>

          </div>
        )}

        {/* Right Side: Welcome Card / Auth Form */}
        <div 
          className="glass-card"
          style={{
            maxWidth: '460px',
            width: '100%',
            margin: '0 auto',
            padding: '36px 32px',
            boxShadow: 'var(--shadow-xl)',
            backgroundColor: '#ffffff'
          }}
        >
          {/* WELCOME VIEW (Section 2) */}
          {mode === 'welcome' && (
            <div style={{ textAlign: 'center' }}>
              <div 
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 16px rgba(2, 132, 199, 0.25)'
                }}
              >
                <Droplets size={32} />
              </div>

              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                AquaConnect
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px', marginBottom: '28px' }}>
                "Smart Water Delivery Management"
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Supplier Login */}
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={() => handleOpenAuth('supplier', 'login')}
                  style={{ width: '100%', justifyContent: 'space-between', padding: '16px 20px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Truck size={22} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>Supplier Login</div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>Water plant & delivery owners</div>
                    </div>
                  </div>
                  <ArrowRight size={18} />
                </button>

                {/* 2. Customer Login */}
                <button 
                  className="btn btn-secondary btn-lg"
                  onClick={() => handleOpenAuth('customer', 'login')}
                  style={{ 
                    width: '100%', 
                    justifyContent: 'space-between', 
                    padding: '16px 20px',
                    borderColor: '#bae6fd',
                    backgroundColor: '#f0f9ff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <User size={22} color="#0284c7" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Customer Login</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Homes, offices & cafes</div>
                    </div>
                  </div>
                  <ArrowRight size={18} color="#0284c7" />
                </button>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '18px' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  New to AquaConnect?{' '}
                  <button 
                    onClick={() => handleOpenAuth('customer', 'signup')}
                    style={{ color: '#0284c7', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Create an Account
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* LOGIN VIEW */}
          {mode === 'login' && (
            <div>
              <button 
                onClick={() => setMode('welcome')}
                style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
              >
                ← Back to Selection
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedRole === 'supplier' ? 'Supplier Portal Login' : 'Customer Login'}
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '22px' }}>
                Enter your credentials to access your {selectedRole} account.
              </p>

              {/* Role Toggle inside auth */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '10px',
                  padding: '4px',
                  marginBottom: '20px'
                }}
              >
                <button
                  type="button"
                  onClick={() => handleOpenAuth('supplier', 'login')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    backgroundColor: selectedRole === 'supplier' ? '#ffffff' : 'transparent',
                    color: selectedRole === 'supplier' ? '#0284c7' : '#64748b',
                    boxShadow: selectedRole === 'supplier' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Supplier
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAuth('customer', 'login')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    backgroundColor: selectedRole === 'customer' ? '#ffffff' : 'transparent',
                    color: selectedRole === 'customer' ? '#0284c7' : '#64748b',
                    boxShadow: selectedRole === 'customer' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Customer
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot_password')}
                      style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 600 }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg" 
                  disabled={isLoading}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  {isLoading ? 'Signing in...' : `Login as ${selectedRole === 'supplier' ? 'Supplier' : 'Customer'}`}
                </button>
              </form>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                Don't have an account?{' '}
                <button 
                  onClick={() => setMode('signup')}
                  style={{ color: '#0284c7', fontWeight: 700 }}
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* SIGN UP VIEW */}
          {mode === 'signup' && (
            <div>
              <button 
                onClick={() => setMode('login')}
                style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ← Back to Login
              </button>

              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                Create {selectedRole === 'supplier' ? 'Supplier' : 'Customer'} Account
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                Choose your account type below to get started:
              </p>

              {/* Role Toggle inside Signup */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '10px',
                  padding: '4px',
                  marginBottom: '14px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedRole('supplier')}
                  style={{
                    padding: '9px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedRole === 'supplier' ? '#ffffff' : 'transparent',
                    color: selectedRole === 'supplier' ? '#0284c7' : '#64748b',
                    boxShadow: selectedRole === 'supplier' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Truck size={16} />
                  Water Supplier
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('customer')}
                  style={{
                    padding: '9px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedRole === 'customer' ? '#ffffff' : 'transparent',
                    color: selectedRole === 'customer' ? '#0284c7' : '#64748b',
                    boxShadow: selectedRole === 'customer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <User size={16} />
                  Customer
                </button>
              </div>

              {/* Role Context Banner */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: selectedRole === 'supplier' ? '#eff6ff' : '#f0fdf4',
                  border: `1px solid ${selectedRole === 'supplier' ? '#bfdbfe' : '#bbf7d0'}`,
                  color: selectedRole === 'supplier' ? '#1e40af' : '#166534',
                  fontSize: '0.8rem',
                  marginBottom: '18px'
                }}
              >
                <strong>{selectedRole === 'supplier' ? '🏭 Water Supplier / Plant Portal' : '🏠 Customer / Consumer Portal'}</strong>
                <div style={{ marginTop: '2px', opacity: 0.9 }}>
                  {selectedRole === 'supplier'
                    ? 'Manage water plants, POS orders, fleet drivers, and jar inventories.'
                    : 'Order water cans, schedule recurring subscriptions, and manage jar deposits.'}
                </div>
              </div>

              <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    {selectedRole === 'supplier' ? 'Plant / Business Name *' : 'Full Name *'}
                  </label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={selectedRole === 'supplier' ? 'e.g. City Pure Water Plant' : 'e.g. Alex Johnson'}
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                    Email Address *
                  </label>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      Phone *
                    </label>
                    <input 
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91..."
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
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      Password *
                    </label>
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
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

                {/* Zomato-Style Location & Address Input for Both Supplier and Customer */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                      {selectedRole === 'supplier' ? '🏭 Plant / Hub Location Address *' : '🏠 Delivery Address (Home/Office) *'}
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Sparkles size={12} /> Live Auto Detection
                    </span>
                  </div>

                  {/* Dual Action Buttons: Use GPS & Choose on Map */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={handleQuickDetectLocation}
                      disabled={isDetectingLocation}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        color: '#15803d',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: isDetectingLocation ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Crosshair size={14} className={isDetectingLocation ? 'animate-spin' : ''} />
                      {isDetectingLocation ? 'Detecting GPS...' : 'Use Current Location'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMapModalOpen(true)}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        color: '#1d4ed8',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <MapPin size={14} />
                      Set on Map / Choose
                    </button>
                  </div>

                  {/* Textarea for Manual Adjustment & Full Address */}
                  <textarea 
                    rows="2"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={
                      selectedRole === 'supplier'
                        ? 'e.g. Plot 12, Phase 2, Madhapur, Hyderabad, 500081'
                        : 'e.g. Flat 301, Sai residency, Hitec City, Hyderabad, 500081'
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.85rem',
                      lineHeight: '1.4'
                    }}
                  />
                  {address && (
                    <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} />
                      <span>Location registered: Ready to match with local water suppliers & customers</span>
                    </div>
                  )}
                </div>

                {/* Zomato Map Modal */}
                <ZomatoLocationPickerModal 
                  isOpen={isMapModalOpen}
                  onClose={() => setIsMapModalOpen(false)}
                  currentAddress={address}
                  role={selectedRole}
                  onSelectLocation={(loc) => {
                    setAddress(loc.address);
                    showToast(`📍 Location pinned: ${loc.locality}, ${loc.city}!`, 'success');
                  }}
                />

                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg" 
                  disabled={isLoading}
                  style={{ width: '100%', marginTop: '6px' }}
                >
                  {isLoading ? 'Creating Account...' : `Create ${selectedRole === 'supplier' ? 'Supplier' : 'Customer'} Account`}
                </button>

                <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                  Already have an account?{' '}
                  <button 
                    type="button"
                    onClick={() => setMode('login')}
                    style={{ color: '#0284c7', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {mode === 'forgot_password' && (
            <div>
              <button 
                onClick={() => setMode('login')}
                style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
              >
                ← Back to Login
              </button>

              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                Reset Your Password
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
                Enter your registered email address and we'll send you recovery instructions.
              </p>

              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  Send Password Reset Link
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '16px 0' }}>
        AquaConnect © 2026 • Dedicated POS & Delivery Management for Water Suppliers
      </footer>
    </div>
  );
};

export default WelcomePage;
