import React from 'react';
import { PackageOpen } from 'lucide-react';

const EmptyState = ({ 
  icon: Icon = PackageOpen, 
  title = 'No items found', 
  description = 'There is currently no data to display here.',
  actionText,
  onAction 
}) => {
  return (
    <div 
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px dashed var(--border-light)',
        margin: '16px 0'
      }}
    >
      <div 
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0284c7',
          marginBottom: '16px'
        }}
      >
        <Icon size={32} />
      </div>
      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
        {title}
      </h4>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: actionText ? '20px' : '0' }}>
        {description}
      </p>
      {actionText && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
