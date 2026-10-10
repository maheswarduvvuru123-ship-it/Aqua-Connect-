import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Search, 
  X, 
  Check, 
  Loader2, 
  Building2, 
  Home, 
  Compass, 
  Crosshair, 
  CheckCircle2, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

const POPULAR_LOCALITIES = [
  { name: 'Madhapur', city: 'Hyderabad', lat: 17.4483, lng: 78.3915, pincode: '500081' },
  { name: 'Hitec City', city: 'Hyderabad', lat: 17.4435, lng: 78.3772, pincode: '500081' },
  { name: 'Gachibowli', city: 'Hyderabad', lat: 17.4401, lng: 78.3489, pincode: '500032' },
  { name: 'Kondapur', city: 'Hyderabad', lat: 17.4699, lng: 78.3578, pincode: '500084' },
  { name: 'Jubilee Hills', city: 'Hyderabad', lat: 17.4319, lng: 78.4073, pincode: '500033' },
  { name: 'Banjara Hills', city: 'Hyderabad', lat: 17.4156, lng: 78.4354, pincode: '500034' },
  { name: 'Kukatpally', city: 'Hyderabad', lat: 17.4875, lng: 78.4039, pincode: '500072' },
  { name: 'Manikonda', city: 'Hyderabad', lat: 17.3995, lng: 78.3888, pincode: '500089' },
  { name: 'Financial District', city: 'Hyderabad', lat: 17.4168, lng: 78.3428, pincode: '500075' },
  { name: 'Begumpet', city: 'Hyderabad', lat: 17.4448, lng: 78.4665, pincode: '500016' }
];

export const reverseGeocodeCoords = async (lat, lng) => {
  // 1. Try OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'AquaConnect-Web/2.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const houseNumber = addr.house_number || addr.building || '';
      const street = addr.road || addr.pedestrian || addr.street || '';
      const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.city_district || '';
      const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Local Area';
      const postcode = addr.postcode || '';
      const state = addr.state || '';

      const parts = [
        houseNumber,
        street,
        locality && locality !== street ? locality : '',
        city,
        state,
        postcode
      ].filter(Boolean);

      return {
        formattedAddress: parts.join(', ') || data.display_name?.split(',').slice(0, 4).join(',') || `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        locality: locality || street || city || 'Current Location',
        city: city,
        postcode: postcode,
        lat,
        lng
      };
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode error:', err);
  }

  // 2. Secondary fallback: BigDataCloud
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const locality = bdcData.locality || bdcData.principalSubdivision || '';
      const city = bdcData.city || bdcData.locality || 'Local Area';
      const postcode = bdcData.postcode || '';
      const state = bdcData.principalSubdivision || '';

      const parts = [locality, city, state, postcode].filter(Boolean);
      return {
        formattedAddress: parts.join(', ') || `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        locality: locality || city || 'Detected Area',
        city: city,
        postcode: postcode,
        lat,
        lng
      };
    }
  } catch (err) {
    console.warn('BigDataCloud reverse geocode error:', err);
  }

  return {
    formattedAddress: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    locality: 'Detected Pin',
    city: 'Local Area',
    postcode: '',
    lat,
    lng
  };
};

const ZomatoLocationPickerModal = ({ 
  isOpen, 
  onClose, 
  onSelectLocation, 
  currentAddress = '', 
  role = 'customer' 
}) => {
  const [selectedLocality, setSelectedLocality] = useState(POPULAR_LOCALITIES[0]);
  const [coords, setCoords] = useState({ lat: 17.4483, lng: 78.3915 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [doorFlatDetails, setDoorFlatDetails] = useState('');
  const [detectedAddress, setDetectedAddress] = useState(currentAddress || 'Madhapur Main Rd, Hitec City Zone, Hyderabad, 500081');
  const [statusMessage, setStatusMessage] = useState('');
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen && currentAddress) {
      setDetectedAddress(currentAddress);
    }
  }, [isOpen, currentAddress]);

  // Handle GPS detection
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingGPS(true);
    setStatusMessage('Acquiring high-accuracy satellite GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });

        const result = await reverseGeocodeCoords(latitude, longitude);
        if (result) {
          setDetectedAddress(result.formattedAddress);
          setSelectedLocality({
            name: result.locality,
            city: result.city,
            lat: latitude,
            lng: longitude,
            pincode: result.postcode
          });
          setStatusMessage(`📍 Location auto-detected: ${result.locality}, ${result.city}`);
        } else {
          setDetectedAddress(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}, Hyderabad`);
          setStatusMessage('Location coordinates acquired.');
        }
        setIsLocatingGPS(false);
      },
      (err) => {
        console.warn('GPS error:', err);
        // Fallback to default prominent locality if permission denied or error
        const fallback = POPULAR_LOCALITIES[0];
        setSelectedLocality(fallback);
        setCoords({ lat: fallback.lat, lng: fallback.lng });
        setDetectedAddress(`${fallback.name}, ${fallback.city}, ${fallback.pincode}`);
        setStatusMessage('GPS permission skipped. Using high-precision map selection.');
        setIsLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  };

  // Real-time search with debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!val || val.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Query OpenStreetMap Nominatim for search
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(val.trim())}&countrycodes=in&addressdetails=1&limit=6`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 450);
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setCoords({ lat, lng: lon });
    const addr = result.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Local Area';
    const postcode = addr.postcode || '';
    const locality = addr.suburb || addr.neighbourhood || addr.road || result.name || 'Selected Area';
    const displayName = result.display_name.split(',').slice(0, 4).join(',');
    setDetectedAddress(displayName);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedLocality({
      name: locality,
      city: city,
      lat,
      lng: lon,
      pincode: postcode
    });
    setStatusMessage(`📍 Selected: ${locality}, ${city}`);
  };

  const handleSelectPopularLocality = (loc) => {
    setSelectedLocality(loc);
    setCoords({ lat: loc.lat, lng: loc.lng });
    const full = `${loc.name}, ${loc.city} - ${loc.pincode}`;
    setDetectedAddress(full);
    setStatusMessage(`📍 Selected: ${loc.name}`);
  };

  const handleConfirm = () => {
    let finalAddress = detectedAddress;
    if (doorFlatDetails.trim()) {
      finalAddress = `${doorFlatDetails.trim()}, ${detectedAddress}`;
    }
    onSelectLocation({
      address: finalAddress,
      locality: selectedLocality?.name || 'Local Area',
      city: selectedLocality?.city || 'Hyderabad',
      pincode: selectedLocality?.pincode || '',
      lat: coords.lat,
      lng: coords.lng
    });
    onClose();
  };

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
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                <MapPin size={20} color="#ffffff" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                {role === 'supplier' ? 'Set Water Plant & Hub Location' : 'Choose Delivery Location'}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
              {role === 'supplier' 
                ? 'Zomato-style map & GPS detection for your fulfillment facility'
                : 'Exact locality detection matches you to your nearest water supplier'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Quick GPS Button (Exact Zomato "Use Current Location") */}
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isLocatingGPS}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '12px',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: isLocatingGPS ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(22, 101, 52, 0.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.2)'
                }}
              >
                {isLocatingGPS ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#166534' }}>
                  {isLocatingGPS ? 'Detecting satellite GPS...' : 'Use Current Location (GPS)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#15803d', opacity: 0.9 }}>
                  Using device GPS • Auto-fills complete locality & pincode
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>
              Auto-Detect →
            </span>
          </button>

          {/* Search Input Bar */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search area, landmark, street, colony..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: '#f8fafc'
                }}
              />
              {isSearching && (
                <Loader2 size={16} color="#0284c7" className="animate-spin" style={{ position: 'absolute', right: '12px' }} />
              )}
            </div>

            {/* Search Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                  border: '1px solid #e2e8f0',
                  marginTop: '4px',
                  zIndex: 20,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(item)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.825rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <MapPin size={15} color="#0284c7" style={{ flexShrink: 0 }} />
                    <span style={{ color: '#1e293b' }}>{item.display_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Map Visual View */}
          <div 
            style={{
              position: 'relative',
              height: '190px',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '2px solid #e2e8f0',
              backgroundColor: '#e2e8f0',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
            }}
          >
            {/* OpenStreetMap dynamic static/interactive iframe */}
            <iframe
              title="Locality Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.015}%2C${coords.lat - 0.015}%2C${coords.lng + 0.015}%2C${coords.lat + 0.015}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
              style={{ border: 0, pointerEvents: 'auto' }}
            />

            {/* Bouncing Pin Overlay (Zomato Exact Center Pin) */}
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div 
                style={{
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  marginBottom: '2px',
                  letterSpacing: '0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ color: '#22c55e' }}>●</span>
                {role === 'supplier' ? 'PLANT LOCATION' : 'DELIVER HERE'}
              </div>
              <MapPin size={38} color="#ef4444" fill="#ef4444" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }} />
              <div 
                style={{
                  width: '10px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  marginTop: '-2px'
                }}
              />
            </div>

            {/* Map corner badge */}
            <div 
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 600,
                color: '#475569'
              }}
            >
              GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </div>
          </div>



          {/* Form details: Flat/Door/Building info */}
          <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Address Preview & Landmark:
              </span>
              <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                ✓ Locality Verified
              </span>
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              📍 {detectedAddress}
            </div>

            <input
              type="text"
              value={doorFlatDetails}
              onChange={(e) => setDoorFlatDetails(e.target.value)}
              placeholder="Flat / House / Floor No., Apartment Name, Landmark (Optional)"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {statusMessage && (
            <div style={{ fontSize: '0.75rem', color: '#0369a1', backgroundColor: '#f0f9ff', padding: '6px 12px', borderRadius: '6px' }}>
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer Confirmation */}
        <div 
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
          >
            <Check size={18} />
            Confirm Location & Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZomatoLocationPickerModal;
