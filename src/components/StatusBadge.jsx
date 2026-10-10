import React from 'react';
import { getStatusMeta } from '../utils/formatters';

const StatusBadge = ({ status, size = 'normal' }) => {
  const meta = getStatusMeta(status);
  
  return (
    <span 
      className={`badge ${meta.className}`}
      style={{
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        padding: size === 'small' ? '2px 8px' : '4px 10px'
      }}
    >
      <span 
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: meta.color,
          display: 'inline-block'
        }} 
      />
      {meta.label}
    </span>
  );
};

export default StatusBadge;
