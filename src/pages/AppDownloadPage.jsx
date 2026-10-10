import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  Download, 
  QrCode, 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink, 
  HelpCircle,
  Copy,
  Check,
  Globe,
  Share2
} from 'lucide-react';

const APK_DOWNLOAD_URL = "https://github.com/maheswarduvvuru123-ship-it/Aqua-Connect-/releases/download/v1.0.0/app-release.apk";
const WEB_APP_URL = "https://aqua-ec4f5.web.app";
const QR_IMAGE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=0284c7&data=${encodeURIComponent("https://aqua-ec4f5.web.app/#download")}`;

const AppDownloadPage = ({ onBackToApp }) => {
  const [copied, setCopied] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' | 'supplier'

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileCheck = /android|iphone|ipad|ipod/i.test(userAgent);
    const androidCheck = /android/i.test(userAgent);
    setIsMobile(mobileCheck);
    setIsAndroid(androidCheck);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://aqua-ec4f5.web.app/#download");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadApk = () => {
    setDownloadStarted(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Header */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
               onClick={() => { window.location.hash = ''; if (onBackToApp) onBackToApp(); }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}>
              <Droplets size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                AquaConnect
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600, margin: 0 }}>
                Official Mobile & Web App
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => { window.location.hash = ''; if (onBackToApp) onBackToApp(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Globe size={16} color="#0284c7" />
              Open Web Version
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.15fr 0.85fr',
          gap: '32px',
          alignItems: 'center'
        }}>
          {/* Left Column: Download Info */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '16px'
            }}>
              <ShieldCheck size={16} color="#0284c7" />
              Official Release v1.0.0 • Safe & Verified
            </div>

            <h2 style={{
              fontSize: isMobile ? '1.85rem' : '2.4rem',
              fontWeight: 900,
              lineHeight: 1.2,
              color: '#0f172a',
              marginBottom: '14px'
            }}>
              Download AquaConnect <br />
              <span style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Smart Water Delivery App
              </span>
            </h2>

            <p style={{
              fontSize: '1rem',
              lineHeight: 1.6,
              color: '#475569',
              marginBottom: '24px'
            }}>
              Manage pure 20L water can deliveries, track live fleet dispatch, schedule auto-refills, 
              and calculate empty can returns directly from your mobile phone.
            </p>

            {/* Quick Specs Card */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              backgroundColor: '#ffffff',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              marginBottom: '28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, fontWeight: 600 }}>VERSION</p>
                <p style={{ fontSize: '1rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>v1.0.0 (Release)</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, fontWeight: 600 }}>SIZE</p>
                <p style={{ fontSize: '1rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>54.8 MB</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, fontWeight: 600 }}>OS SUPPORT</p>
                <p style={{ fontSize: '1rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>Android 7.0+</p>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <a
                href={APK_DOWNLOAD_URL}
                download="aquaconnect.apk"
                onClick={handleDownloadApk}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '16px 28px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(2, 132, 199, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Download size={22} />
                Download Android App (Release APK)
              </a>

              <button
                onClick={() => { window.location.hash = ''; if (onBackToApp) onBackToApp(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  color: '#0284c7',
                  border: '1.5px solid #0284c7',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Globe size={18} />
                Or Use Web Version in Browser (Instant Login)
              </button>
            </div>

            {downloadStarted && (
              <div style={{
                padding: '14px 18px',
                borderRadius: '12px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px'
              }}>
                <CheckCircle2 size={20} color="#10b981" />
                <span>
                  <strong>Download started!</strong> Check your browser downloads or notification bar for <code>aquaconnect.apk</code>.
                </span>
              </div>
            )}

            {/* Share / Copy Link */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleCopyLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                {copied ? 'Link Copied!' : 'Copy Download Link'}
              </button>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                https://aqua-ec4f5.web.app/#download
              </span>
            </div>
          </div>

          {/* Right Column: Scan QR Code Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '32px 24px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 12px 36px rgba(2, 132, 199, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              borderRadius: '20px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
              marginBottom: '18px'
            }}>
              📲 SCAN WITH PHONE CAMERA
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
              Instant App QR Code
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 20px 0' }}>
              Customers or suppliers can point their camera to open and download instantly.
            </p>

            {/* QR Code Container */}
            <div style={{
              display: 'inline-block',
              padding: '16px',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '2px solid #0284c7',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.12)',
              marginBottom: '16px'
            }}>
              <img 
                src={QR_IMAGE_URL} 
                alt="AquaConnect Scan Me QR Code" 
                style={{ width: '220px', height: '220px', display: 'block', borderRadius: '8px' }}
              />
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '0.8rem',
              color: '#475569',
              lineHeight: 1.5
            }}>
              💡 <strong>Tip for Suppliers:</strong> Print this QR code and paste it on your 20L water cans or billing counter so customers can re-order with a single scan!
            </div>
          </div>
        </div>

        {/* 3-Step Installation Guide */}
        <div style={{
          marginTop: '56px',
          padding: '32px 24px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
        }}>
          <h3 style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#0f172a',
            textAlign: 'center',
            marginBottom: '8px'
          }}>
            How to Install on Android in 3 Simple Steps
          </h3>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', marginBottom: '32px' }}>
            No Google Play account required • Direct fast installation
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '24px'
          }}>
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#0284c7',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1rem',
                marginBottom: '12px'
              }}>1</div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Download the APK
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                Click <strong>"Download Android App"</strong> above. If your browser asks <em>"File might be harmful"</em>, tap <strong>"Download Anyway"</strong>.
              </p>
            </div>

            <div style={{
              padding: '20px',
              borderRadius: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#0284c7',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1rem',
                marginBottom: '12px'
              }}>2</div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Allow Installation
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                Open <code>aquaconnect.apk</code> from your notifications. If prompted, toggle <strong>"Allow from this source"</strong> in Chrome/Files settings.
              </p>
            </div>

            <div style={{
              padding: '20px',
              borderRadius: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1rem',
                marginBottom: '12px'
              }}>3</div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Launch & Enjoy!
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                Tap <strong>"Install"</strong> then <strong>"Open"</strong>. Sign in as Customer or Water Supplier to begin!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '24px 16px',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: '#64748b'
      }}>
        <p style={{ margin: 0 }}>
          AquaConnect © {new Date().getFullYear()} • Smart Water Delivery & Plant Management
        </p>
      </footer>
    </div>
  );
};

export default AppDownloadPage;
