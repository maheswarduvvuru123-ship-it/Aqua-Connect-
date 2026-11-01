import React, { useState, useEffect } from 'react';
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
  Navigation,
  Smartphone,
  Download,
  QrCode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getCollection, subscribeToData, getPlatformSettings } from '../services/firestoreData';
import ZomatoLocationPickerModal, { reverseGeocodeCoords } from '../components/ZomatoLocationPickerModal';
import TermsPrivacyModal from '../components/TermsPrivacyModal';

const WelcomePage = () => {
  const { login, signup, authError, resetPassword } = useAuth();
  const { showToast } = useNotifications();

  // Mode: 'welcome' | 'login' | 'signup' | 'forgot_password'
  const [mode, setMode] = useState('welcome');
  const [selectedRole, setSelectedRole] = useState('supplier'); // 'supplier' | 'customer'
  const [isLoading, setIsLoading] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState('terms');

  // Dynamic Plans & Platform Subscription QR Settings
  const [plans, setPlans] = useState([]);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [modalPlanRole, setModalPlanRole] = useState('supplier');
  const [platformSettings, setPlatformSettings] = useState({
    adminUpiId: 'aquaconnect.admin@upi',
    adminPhone: '8522828688',
    adminQrCodeUrl: ''
  });

  useEffect(() => {
    const updateLocal = () => {
      const allPlans = getCollection('subscription_plans') || [];
      setPlans(allPlans);
      setPlatformSettings(getPlatformSettings());
    };
    updateLocal();
    const unsub = subscribeToData((coll) => {
      if (!coll || coll === 'subscription_plans' || coll === 'platform_settings' || coll === 'all') {
        updateLocal();
      }
    });
    return () => unsub();
  }, []);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [address, setAddress] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('plan_starter');
  const [billingCycle, setBillingCycle] = useState('Monthly'); // 'Monthly' | 'Yearly'
  const [utrDigits, setUtrDigits] = useState('');

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
          showToast('Please choose or type your exact locality on the map.', 'info');
          setIsMapModalOpen(true);
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
    setEmail('');
    setPassword('');
    setName('');
    setPhoneDigits('');
    setUtrDigits('');
  };

  const handleSwitchSignupRole = (newRole) => {
    setSelectedRole(newRole);
    setName('');
    setEmail('');
    setPassword('');
    setPhoneDigits('');
    setUtrDigits('');
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
    const cleanPhone = phoneDigits.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      showToast('Please enter a valid 10-digit Indian phone number', 'error');
      return;
    }
    const formattedPhone = `+91 ${cleanPhone}`;

    let finalPaymentReference = '';
    if (selectedRole === 'supplier' && selectedPlanId !== 'plan_starter') {
      const cleanUtr = utrDigits.replace(/\D/g, '');
      if (cleanUtr.length !== 12) {
        showToast('Please enter a valid 12-digit numeric UTR number (constant UPI + 12 numbers)', 'warning');
        return;
      }
      finalPaymentReference = `UPI${cleanUtr}`;
    }

    setIsLoading(true);
    try {
      const activePlan = plans.find(p => p.planId === selectedPlanId);
      const planAmount = selectedPlanId === 'plan_starter' 
        ? 0 
        : (billingCycle === 'Yearly' 
            ? (activePlan?.yearlyPrice || 29999) 
            : (activePlan?.monthlyPrice || activePlan?.price || 2999));

      const effectiveBillingCycle = selectedPlanId === 'plan_starter' ? '1-Day Free Trial' : billingCycle;
      const res = await signup({
        name,
        email,
        password,
        phone: formattedPhone,
        role: selectedRole,
        address,
        planId: selectedPlanId,
        billingCycle: effectiveBillingCycle,
        paymentReference: finalPaymentReference,
        planAmount
      });

      if (res?.requiresVerification) {
        showToast(`🎉 Registration & Payment UTR #${finalPaymentReference} submitted! Your account is pending Admin approval. You can log in once Admin confirms your plan.`, 'success');
        setMode('login');
        setPassword('');
      } else {
        showToast(`Account created successfully as ${selectedRole}!`, 'success');
      }
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
        const res = await resetPassword(email);
        showToast(res?.message || `Password recovery mail sent to ${email}! Please check your inbox.`, 'success');
      }
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
              Aqua connect
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>
              Smart Water Delivery Management
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => { window.location.hash = '#download'; }}
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '7px 14px',
              borderRadius: '20px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Smartphone size={15} />
            Download App (.apk)
          </button>

          <button
            onClick={() => { window.location.hash = '#admin'; }}
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '7px 14px',
              borderRadius: '20px',
              backgroundColor: '#ede9fe',
              color: '#6d28d9',
              border: '1px solid #d8b4fe',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(109, 40, 217, 0.15)',
              transition: 'all 0.15s ease'
            }}
            title="Open Enterprise Admin Portal"
          >
            <ShieldCheck size={15} />
            Admin Portal
          </button>
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
                Aqua connect
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px', marginBottom: '28px' }}>
                "Smart Water Delivery Management"
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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



              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  New to Aqua connect?{' '}
                  <button 
                    onClick={() => handleOpenAuth('customer', 'signup')}
                    style={{ color: '#0284c7', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Create an Account
                  </button>
                </p>

                {/* View Live Plans Button */}
                <button
                  type="button"
                  onClick={() => {
                    setModalPlanRole('supplier');
                    setShowPlansModal(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#faf5ff',
                    border: '1px solid #d8b4fe',
                    color: '#6b21a8',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '12px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Sparkles size={16} color="#7c3aed" /> View Subscription Plans & Live Pricing
                </button>
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
                {selectedRole === 'supplier' 
                  ? 'Manage your water bottling plant, direct payments & delivery dispatch.'
                  : 'Order water cans, track live deliveries & view receipts.'}
              </p>

              {/* Role Toggle for Supplier, Customer & Admin */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
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
                    fontSize: '0.82rem',
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
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    backgroundColor: selectedRole === 'customer' ? '#ffffff' : 'transparent',
                    color: selectedRole === 'customer' ? '#0284c7' : '#64748b',
                    boxShadow: selectedRole === 'customer' ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => { window.location.hash = '#admin'; }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    backgroundColor: 'transparent',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }}
                  title="Switch to Admin Portal"
                >
                  <ShieldCheck size={14} />
                  Admin
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
                  {isLoading 
                    ? 'Signing in...' 
                    : `Login as ${selectedRole === 'admin' ? 'Administrator' : selectedRole === 'supplier' ? 'Supplier' : 'Customer'}`}
                </button>
              </form>

              {selectedRole === 'admin' ? (
                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8rem', color: '#7c3aed', backgroundColor: '#faf5ff', padding: '10px', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                  🛡️ Protected Route: Admin privileges are managed exclusively by the Super Admin.
                </div>
              ) : (
                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                  Don't have an account?{' '}
                  <button 
                    onClick={() => setMode('signup')}
                    style={{ color: '#0284c7', fontWeight: 700 }}
                  >
                    Sign Up
                  </button>
                </div>
              )}
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
                  onClick={() => handleSwitchSignupRole('supplier')}
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
                  onClick={() => handleSwitchSignupRole('customer')}
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
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '0 10px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid var(--border-light)',
                          borderRight: 'none',
                          borderTopLeftRadius: '8px',
                          borderBottomLeftRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          userSelect: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input 
                        type="tel"
                        required
                        maxLength={10}
                        value={phoneDigits}
                        onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderTopLeftRadius: '0',
                          borderBottomLeftRadius: '0',
                          borderTopRightRadius: '8px',
                          borderBottomRightRadius: '8px',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
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

                {/* Customer Free Account Notice */}
                {selectedRole === 'customer' && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '12px 16px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '12px',
                      border: '1px solid #bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div style={{ fontSize: '1.25rem' }}>💧</div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534' }}>
                        100% Free Consumer Account
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#15803d' }}>
                        Zero subscription fees. Order water cans anytime with doorstep plant delivery!
                      </div>
                    </div>
                  </div>
                )}

                {/* Supplier Subscription Plan Selection & Payment */}
                {selectedRole === 'supplier' && (
                  <div 
                    style={{
                      marginTop: '6px',
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                        📋 Select Subscription Plan *
                      </label>

                      {/* Billing Cycle Toggle */}
                      <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '8px', padding: '2px' }}>
                        <button
                          type="button"
                          onClick={() => setBillingCycle('Monthly')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            backgroundColor: billingCycle === 'Monthly' ? '#ffffff' : 'transparent',
                            color: billingCycle === 'Monthly' ? '#0284c7' : '#64748b',
                            boxShadow: billingCycle === 'Monthly' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingCycle('Yearly')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            backgroundColor: billingCycle === 'Yearly' ? '#0284c7' : 'transparent',
                            color: billingCycle === 'Yearly' ? '#ffffff' : '#64748b',
                            boxShadow: billingCycle === 'Yearly' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          Yearly (Save 17%)
                        </button>
                      </div>
                    </div>

                    {/* Plan Options Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                      {(() => {
                        const supplierPlans = plans
                          .filter(p => (!p.targetRole || p.targetRole === 'supplier') && p.status !== 'draft' && p.planId !== 'plan_pro' && p.price !== 999);
                        const activeList = supplierPlans.length > 0 ? supplierPlans : [
                          { planId: 'plan_starter', name: 'Free Trial (1 Day)', price: 0, monthlyPrice: 0, yearlyPrice: 0, orderLimit: 25 },
                          { planId: 'plan_enterprise', name: 'Enterprise', price: 2999, monthlyPrice: 2999, yearlyPrice: 29999, isPopular: true }
                        ];

                        return activeList.map(p => {
                          const isSelected = selectedPlanId === p.planId;
                          const isFree = (p.monthlyPrice === 0 || p.price === 0 || p.planId === 'plan_starter');
                          const displayPrice = isFree
                            ? 'Free'
                            : `₹${(billingCycle === 'Yearly' ? (p.yearlyPrice || p.price * 10) : (p.monthlyPrice || p.price)).toLocaleString('en-IN')}`;

                          return (
                            <div
                              key={p.planId}
                              onClick={() => setSelectedPlanId(p.planId)}
                              style={{
                                padding: '10px 8px',
                                borderRadius: '8px',
                                border: isSelected ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                                backgroundColor: isSelected ? '#faf5ff' : '#ffffff',
                                cursor: 'pointer',
                                textAlign: 'center',
                                position: 'relative',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {p.isPopular && (
                                <span style={{ position: 'absolute', top: '-7px', right: '4px', backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '0.55rem', fontWeight: 800, padding: '1px 5px', borderRadius: '6px' }}>
                                  POPULAR
                                </span>
                              )}
                              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                                {p.planId === 'plan_starter' ? 'Free Trial' : p.name.replace(' Plan', '')}
                              </div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isSelected ? '#7c3aed' : '#0284c7', margin: '2px 0' }}>
                                {displayPrice}
                              </div>
                              <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                                {isFree ? '1-Day Trial (Auto-Lock)' : (billingCycle === 'Yearly' ? '/year' : '/month')}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* 1-Day Trial Warning Banner */}
                    {selectedPlanId === 'plan_starter' && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde68a',
                        fontSize: '0.8rem',
                        color: '#92400e',
                        marginBottom: '12px',
                        lineHeight: 1.4
                      }}>
                        ⚡ <strong>Free Trial (1 Day Only):</strong> You get full water plant access for 24 hours. After 1 day, credentials will automatically block until upgraded to a paid plan. (1 trial allowed per plant/phone/email).
                      </div>
                    )}

                    {/* Paid Plan QR & UTR Reference Box */}
                    {selectedPlanId !== 'plan_starter' ? (
                      (() => {
                        const curPlan = plans.find(p => p.planId === selectedPlanId);
                        const curAmount = billingCycle === 'Yearly' 
                          ? (curPlan?.yearlyPrice || 29999) 
                          : (curPlan?.monthlyPrice || curPlan?.price || 2999);
                        const adminUpi = platformSettings.adminUpiId || 'aquaconnect.admin@upi';
                        const adminPhone = platformSettings.adminPhone || '8522828688';
                        const dynamicQrUri = `upi://pay?pa=${adminUpi}&pn=AquaConnect%20Admin&am=${curAmount}&cu=INR`;
                        const qrSrc = platformSettings.adminQrCodeUrl && platformSettings.adminQrCodeUrl.trim().length > 5
                          ? platformSettings.adminQrCodeUrl
                          : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(dynamicQrUri)}`;

                        return (
                          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                              <img 
                                src={qrSrc}
                                alt="Admin Subscription QR Code" 
                                style={{ width: '85px', height: '85px', borderRadius: '8px', border: '1px solid #cbd5e1', objectFit: 'contain' }}
                              />
                              <div style={{ flex: 1, minWidth: '180px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>
                                  Scan to Pay Subscription:
                                </div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#7c3aed', margin: '2px 0' }}>
                                  ₹{curAmount.toLocaleString('en-IN')} ({billingCycle})
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  Admin UPI: <strong style={{ color: '#0f172a' }}>{adminUpi}</strong>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  Phone / GPay: <strong style={{ color: '#0f172a' }}>{adminPhone}</strong>
                                </div>
                                {platformSettings.customerCarePhone && (
                                  <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '2px' }}>
                                    Support Helpline: <strong>{platformSettings.customerCarePhone}</strong>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ marginTop: '10px' }}>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                                Transaction Reference / UTR Number * (UPI + 12 Digits)
                              </label>
                              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                <div 
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 12px',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid var(--border-light)',
                                    borderRight: 'none',
                                    borderTopLeftRadius: '6px',
                                    borderBottomLeftRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    letterSpacing: '0.5px',
                                    userSelect: 'none'
                                  }}
                                >
                                  UPI
                                </div>
                                <input 
                                  type="text"
                                  required={selectedPlanId !== 'plan_starter'}
                                  maxLength={12}
                                  placeholder="567890432189 (12 numbers)"
                                  value={utrDigits}
                                  onChange={(e) => setUtrDigits(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderTopLeftRadius: '0',
                                    borderBottomLeftRadius: '0',
                                    borderTopRightRadius: '6px',
                                    borderBottomRightRadius: '6px',
                                    border: '1px solid var(--border-light)',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px'
                                  }}
                                />
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#047857', marginTop: '4px' }}>
                                🛡️ Once submitted, Admin will 1-click verify and activate your plan in Admin Login.
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div style={{ fontSize: '0.72rem', color: '#047857', backgroundColor: '#f0fdf4', padding: '8px 10px', borderRadius: '6px' }}>
                        ✅ Free Starter Plan: Instant activation. No payment required.
                      </div>
                    )}
                  </div>
                )}

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
      <footer style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '16px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span>Aqua connect © 2026 • Dedicated POS & Delivery Management</span>
        <span>•</span>
        <button
          type="button"
          onClick={() => { setLegalTab('terms'); setShowLegalModal(true); }}
          style={{ background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
        >
          Terms & Conditions
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => { setLegalTab('privacy'); setShowLegalModal(true); }}
          style={{ background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
        >
          Privacy Policy
        </button>
        <span>•</span>
        <a 
          href="#admin" 
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = '#admin';
          }}
          style={{ color: '#64748b', textDecoration: 'underline', cursor: 'pointer' }}
        >
          Admin Portal
        </a>
      </footer>

      {/* Terms & Privacy Policy Modal */}
      <TermsPrivacyModal 
        isOpen={showLegalModal} 
        onClose={() => setShowLegalModal(false)} 
        initialTab={legalTab} 
      />

      {/* Subscription Plans & Live Pricing Modal */}
      {showPlansModal && (
        <div 
          className="modal-overlay animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowPlansModal(false)}
        >
          <div 
            className="modal-content animate-slide-up"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Subscription Plans
                  </h2>
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    🟢 Live Synced
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
                  Subscription plans for Water Supply Plants & Distributors. Customers order 100% free with no plans required.
                </p>
              </div>
              <button
                onClick={() => setShowPlansModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Plans Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {(() => {
                const filtered = plans.filter(p => (p.targetRole || 'supplier') === 'supplier' && p.status !== 'draft' && p.planId !== 'plan_pro' && p.price !== 999);
                const listToUse = filtered.length > 0 ? filtered : [
                  { planId: 'plan_starter', name: 'Free Trial (1 Day)', targetRole: 'supplier', price: 0, monthlyPrice: 0, yearlyPrice: 0, orderLimit: 25, features: ['1-Day Full Platform Access', 'Direct Cash & UPI Order Logging', 'Live Delivery Tracking', 'Automatic lock after 1 day'] },
                  { planId: 'plan_enterprise', name: 'Enterprise Aqua', targetRole: 'supplier', price: 2999, monthlyPrice: 2999, yearlyPrice: 29999, isPopular: true, orderLimit: null, features: ['Unlimited orders', 'Multi-plant management', 'Custom invoices & branding', '24/7 dedicated support'] }
                ];

                return listToUse.map(p => {
                  const isFree = (p.monthlyPrice === 0 || p.price === 0 || p.planId === 'plan_starter');
                  const isTrial = p.planId === 'plan_starter' || p.name?.toLowerCase().includes('trial');
                  const displayMonthly = isFree ? (isTrial ? 'Free Trial (1 Day)' : 'Free') : `₹${(p.monthlyPrice || p.price).toLocaleString('en-IN')}/mo`;
                  const displayYearly = isFree ? 'Free' : `₹${(p.yearlyPrice || (p.price * 10)).toLocaleString('en-IN')}/yr`;

                  return (
                    <div
                      key={p.planId}
                      style={{
                        borderRadius: '16px',
                        border: p.isPopular ? '2px solid #7c3aed' : isTrial ? '2px dashed #f59e0b' : '1px solid #e2e8f0',
                        backgroundColor: p.isPopular ? '#faf5ff' : isTrial ? '#fffbeb' : '#ffffff',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                      }}
                    >
                      {p.isPopular && (
                        <span style={{ position: 'absolute', top: '-10px', right: '16px', backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                          MOST POPULAR
                        </span>
                      )}

                      {isTrial && (
                        <span style={{ position: 'absolute', top: '-10px', right: '16px', backgroundColor: '#d97706', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                          1-DAY FREE TRIAL
                        </span>
                      )}

                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                        SUPPLIER PLAN
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 10px' }}>
                        {p.name}
                      </h3>

                      <div style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '1.45rem', fontWeight: 800, color: p.isPopular ? '#7c3aed' : isTrial ? '#b45309' : '#0284c7' }}>
                          {displayMonthly}
                        </span>
                        {!isFree && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            or {displayYearly} (save 17%)
                          </div>
                        )}
                        {isTrial && (
                          <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>
                            Valid for 24 hours • Auto-locks credentials
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px dashed #cbd5e1' }}>
                        Allowance: <strong>{isTrial ? 'Full access for 1 day' : (p.orderLimit ? `${p.orderLimit} orders/month` : 'Unlimited orders')}</strong>
                      </div>

                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: '#475569', flex: 1, marginBottom: '20px' }}>
                        {(p.features || []).map((feat, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => {
                          setShowPlansModal(false);
                          setSelectedRole(p.targetRole || modalPlanRole);
                          setSelectedPlanId(p.planId);
                          setMode('signup');
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          backgroundColor: p.isPopular ? '#7c3aed' : isTrial ? '#d97706' : '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isTrial ? '⚡ Start 1-Day Free Trial' : `Select ${p.name}`} <ArrowRight size={14} />
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Delivery & Plant Location Map Picker Modal */}
      <ZomatoLocationPickerModal 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={(locData) => {
          const finalAddr = locData.formattedAddress || `${locData.locality}, ${locData.city}`;
          setAddress(finalAddr);
          setIsMapModalOpen(false);
          showToast(`📍 Location registered: ${locData.locality}, ${locData.city}!`, 'success');
        }}
        currentAddress={address}
        role={selectedRole}
      />
    </div>
  );
};

export default WelcomePage;
