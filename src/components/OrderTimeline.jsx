import React from 'react';
import { Check, Clock, Truck, Package, CheckCircle2, XCircle } from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

const STAGES = [
  { id: 'Order Placed', label: 'Order Placed', icon: Clock },
  { id: 'Confirmed', label: 'Confirmed', icon: Check },
  { id: 'Preparing', label: 'Preparing', icon: Package },
  { id: 'Out for Delivery', label: 'Out for Delivery', icon: Truck },
  { id: 'Delivered', label: 'Delivered', icon: CheckCircle2 }
];

const OrderTimeline = ({ orderStatus, timeline = [] }) => {
  const isCancelled = orderStatus === 'Cancelled';

  const getCurrentIndex = () => {
    if (isCancelled) return -1;
    switch (orderStatus) {
      case 'Order Placed':
      case 'Pending':
        return 0;
      case 'Confirmed':
        return 1;
      case 'Preparing':
        return 2;
      case 'Out for Delivery':
        return 3;
      case 'Delivered':
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = getCurrentIndex();

  if (isCancelled) {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          backgroundColor: '#fee2e2',
          borderRadius: '12px',
          border: '1px solid #fecaca',
          color: '#991b1b'
        }}
      >
        <XCircle size={28} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Order Cancelled</div>
          <div style={{ fontSize: '0.85rem' }}>This order was cancelled and will not be delivered.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px 0' }}>
      {/* Horizontal timeline on desktop / wrap */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          position: 'relative',
          padding: '10px 0'
        }}
      >
        {/* Background track */}
        <div 
          style={{
            position: 'absolute',
            top: '26px',
            left: '30px',
            right: '30px',
            height: '4px',
            backgroundColor: '#e2e8f0',
            zIndex: 1
          }}
        />

        {/* Active colored track */}
        <div 
          style={{
            position: 'absolute',
            top: '26px',
            left: '30px',
            width: `${Math.max(0, Math.min(100, (currentIndex / (STAGES.length - 1)) * 100))}%`,
            height: '4px',
            background: 'linear-gradient(90deg, #0284c7 0%, #10b981 100%)',
            transition: 'width 0.4s ease',
            zIndex: 2
          }}
        />

        {STAGES.map((stage, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const matchedLog = timeline.find(t => 
            t.status.toLowerCase() === stage.id.toLowerCase() || 
            (stage.id === 'Order Placed' && t.status.toLowerCase() === 'pending')
          );
          const Icon = stage.icon;

          return (
            <div 
              key={stage.id} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                zIndex: 3,
                width: '18%'
              }}
            >
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? '#0284c7' : '#ffffff',
                  border: isCompleted ? '2px solid #0284c7' : '2px solid #cbd5e1',
                  color: isCompleted ? '#ffffff' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrent ? '0 0 0 5px rgba(2, 132, 199, 0.2)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                <Icon size={18} />
              </div>

              <div style={{ marginTop: '8px' }}>
                <div 
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                    color: isCurrent ? '#0284c7' : isCompleted ? '#0f172a' : '#94a3b8'
                  }}
                >
                  {stage.label}
                </div>
                {matchedLog && (
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                    {new Date(matchedLog.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTimeline;
