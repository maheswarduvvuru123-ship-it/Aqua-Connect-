import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Truck, 
  Boxes, 
  BarChart3, 
  User, 
  Layers 
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'products', label: 'Water Products', icon: Layers },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: User }
];

const Sidebar = ({ activeTab, onSelectTab }) => {
  return (
    <aside 
      style={{
        width: '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--border-light)',
        minHeight: 'calc(100vh - 70px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        flexShrink: 0
      }}
      className="supplier-sidebar"
    >
      <div style={{ marginBottom: '14px', padding: '0 12px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          SUPPLIER MANAGEMENT
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#0284c7' : 'var(--text-secondary)',
                backgroundColor: isActive ? '#f0f9ff' : 'transparent',
                border: isActive ? '1px solid #bae6fd' : '1px solid transparent',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={19} color={isActive ? '#0284c7' : '#64748b'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Supplier quick plant status info */}
      <div 
        style={{
          marginTop: 'auto',
          padding: '14px',
          backgroundColor: '#f0f9ff',
          borderRadius: '12px',
          border: '1px solid #bae6fd'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1' }}>Plant Operating</span>
        </div>
        <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
          Active RO & UV filtration lines live
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
