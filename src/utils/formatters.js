export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const getStatusMeta = (status) => {
  switch (status) {
    case 'Pending':
      return { label: 'Pending', className: 'badge-pending', color: '#b45309', bg: '#fef3c7' };
    case 'Confirmed':
      return { label: 'Confirmed', className: 'badge-confirmed', color: '#4338ca', bg: '#e0e7ff' };
    case 'Preparing':
      return { label: 'Preparing', className: 'badge-preparing', color: '#d97706', bg: '#fef3c7' };
    case 'Out for Delivery':
      return { label: 'Out for Delivery', className: 'badge-out-for-delivery', color: '#0369a1', bg: '#e0f2fe' };
    case 'Delivered':
      return { label: 'Delivered', className: 'badge-delivered', color: '#047857', bg: '#d1fae5' };
    case 'Cancelled':
      return { label: 'Cancelled', className: 'badge-cancelled', color: '#b91c1c', bg: '#fee2e2' };
    default:
      return { label: status, className: 'badge-pending', color: '#64748b', bg: '#f1f5f9' };
  }
};
