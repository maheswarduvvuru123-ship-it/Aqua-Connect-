import React, { useState } from 'react';
import { X, ShieldCheck, FileText, CheckCircle2, Droplets, Lock, AlertCircle } from 'lucide-react';

const TermsPrivacyModal = ({ isOpen, onClose, initialTab = 'terms' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
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
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Droplets size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                AquaConnect Platform Policies
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                Official terms, hygiene standards & data privacy commitments
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#e2e8f0',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <button
            onClick={() => setActiveTab('terms')}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: activeTab === 'terms' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'terms' ? '3px solid #0284c7' : '3px solid transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <FileText size={18} /> Terms & Conditions
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: activeTab === 'privacy' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'privacy' ? '3px solid #0284c7' : '3px solid transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <ShieldCheck size={18} /> Privacy Policy
          </button>
        </div>

        {/* Scrollable Policy Content */}
        <div 
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            flex: 1,
            color: '#334155',
            fontSize: '0.875rem',
            lineHeight: 1.6
          }}
        >
          {activeTab === 'terms' ? (
            <div>
              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>
                  Last Updated: October 2026 • Valid for all registered customers, suppliers, and water dispatch operations.
                </p>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                1. Service Scope & Platform Architecture
              </h3>
              <p>
                AquaConnect operates as a specialized point-of-sale (POS) and logistics dispatch software connecting certified water plant operators ("Suppliers") with commercial and residential consumers ("Customers"). AquaConnect provides inventory management, order dispatching, and direct payment tracking.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '16px', marginBottom: '6px' }}>
                2. Returnable 20L Water Cans & Deposit Policy
              </h3>
              <p>
                All 20-Litre polycarbonate jars and dispenser containers provided by suppliers remain the physical property of the respective water plant. Customers agree to:
              </p>
              <ul style={{ paddingLeft: '20px', marginTop: '6px', marginBottom: '12px' }}>
                <li>Exchange equal numbers of empty cans upon delivery of fresh cans.</li>
                <li>Maintain reasonable hygiene and protect jars against puncture, chemical contamination, or unauthorized reuse.</li>
                <li>Pay the standard container deposit (₹150 per can) if empty cans are not returned upon service termination.</li>
              </ul>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '16px', marginBottom: '6px' }}>
                3. Direct Payment Settlement & Disclaimers
              </h3>
              <p>
                Per AquaConnect platform rules, customer payments for drinking water are made directly to the assigned water supplier via Cash-on-Delivery (COD) or direct UPI transfer (using the supplier's verified UPI QR code / VPA). AquaConnect does not operate a third-party escrow or wallet; payment verification and ledger settlements are reconciled directly between the customer and the supplier plant.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '16px', marginBottom: '6px' }}>
                4. Quality & Purification Standards
              </h3>
              <p>
                Water suppliers registered on AquaConnect certify that all drinking water supplied complies with Indian Standards for Packaged Drinking Water (IS 14543) and underwent Reverse Osmosis (RO), Ultra-Violet (UV), and Ozonation treatments.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '16px', marginBottom: '6px' }}>
                5. Right of Account Deletion & Termination
              </h3>
              <p>
                Both customers and suppliers reserve the unconditional right to permanently delete their account and associated profile data at any time via Profile Settings.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#065f46', fontWeight: 600 }}>
                  🔒 Privacy First • Your phone numbers, delivery coordinates, and purchase records are never sold or rented.
                </p>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                1. Information We Collect
              </h3>
              <p>
                To facilitate on-time water deliveries, AquaConnect collects only the minimal required information:
              </p>
              <ul style={{ paddingLeft: '20px', marginTop: '6px', marginBottom: '12px' }}>
                <li><strong>Identity & Contact:</strong> Name, phone number, and optional email address.</li>
                <li><strong>Delivery Location:</strong> Address, flat/building number, and geolocation coordinates for delivery truck dispatch.</li>
                <li><strong>Order History:</strong> Quantities ordered, can return balances, and transaction timestamps.</li>
              </ul>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '16px', marginBottom: '6px' }}>
                2. How We Use Your Data
              </h3>
              <p>
                Your data is exclusively utilized to:
              </p>
              <ul style={{ paddingLeft: '20px', marginTop: '6px', marginBottom: '12px' }}>
                <li>Route delivery vehicles to your exact doorstep.</li>
                <li>Send automated delivery confirmations and real-time out-for-delivery notifications.</li>
                <li>Maintain accurate empty can deposit and return ledger records.</li>
              </ul>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '16px', marginBottom: '6px' }}>
                3. Data Security & Cloud Storage
              </h3>
              <p>
                All account records and transaction ledgers are encrypted in transit using SSL/TLS encryption and stored in secure Google Cloud infrastructure. Telemetry and crash metrics are kept strictly diagnostic.
              </p>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '16px', marginBottom: '6px' }}>
                4. Permanent Data Deletion (Right to Be Forgotten)
              </h3>
              <p>
                You maintain complete ownership of your personal data. You may permanently delete your profile, delivery addresses, and account credentials directly from your Profile page at any time. Upon deletion, all records are permanently eradicated from our live databases.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Verified AquaConnect Standards
          </div>
          <button 
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.85rem' }}
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsPrivacyModal;
