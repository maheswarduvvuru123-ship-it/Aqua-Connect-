import React from 'react';

const StatsCard = ({ title, value, icon: Icon, color = 'blue', trend, subtitle, onClick }) => {
  const colorMap = {
    blue: {
      bg: '#e0f2fe',
      iconColor: '#0284c7',
      border: '#bae6fd'
    },
    cyan: {
      bg: '#cffafe',
      iconColor: '#0891b2',
      border: '#a5f3fc'
    },
    emerald: {
      bg: '#d1fae5',
      iconColor: '#059669',
      border: '#a7f3d0'
    },
    amber: {
      bg: '#fef3c7',
      iconColor: '#d97706',
      border: '#fde68a'
    },
    rose: {
      bg: '#ffe4e6',
      iconColor: '#e11d48',
      border: '#fecdd3'
    },
    indigo: {
      bg: '#e0e7ff',
      iconColor: '#4f46e5',
      border: '#c7d2fe'
    }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div 
      className="glass-card" 
      onClick={onClick}
      style={{
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '130px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </span>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            {value}
          </h3>
        </div>

        <div 
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: scheme.bg,
            border: `1px solid ${scheme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: scheme.iconColor,
            flexShrink: 0
          }}
        >
          {Icon && <Icon size={24} />}
        </div>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
        {trend && (
          <span style={{ 
            fontWeight: 700, 
            color: trend.isPositive ? '#059669' : '#dc2626',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            {trend.isPositive ? '↑' : '↓'} {trend.text}
          </span>
        )}
        {subtitle && (
          <span style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </span>
        )}
      </div>

      {/* Subtle bottom decorative line */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: scheme.iconColor,
          opacity: 0.8
        }} 
      />
    </div>
  );
};

export default StatsCard;
