// FILE: client/src/utils/helpers.js

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const getDaysToExpiry = (expiryDate) => {
  const diff = new Date(expiryDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getUrgencyColor = (level) => {
  switch (level) {
    case 'critical': return 'text-red-400';
    case 'high':     return 'text-orange-400';
    case 'warning':  return 'text-yellow-400';
    default:         return 'text-green-400';
  }
};

export const getUrgencyBg = (level) => {
  switch (level) {
    case 'critical': return 'bg-red-500/10 border-red-500/30 text-red-400';
    case 'high':     return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
    case 'warning':  return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
    default:         return 'bg-green-500/10 border-green-500/30 text-green-400';
  }
};

export const getStatusBadge = (status) => {
  const map = {
    Pending:   'badge-pending',
    Approved:  'badge-approved',
    Completed: 'badge-completed',
    Rejected:  'badge-rejected',
    Cancelled: 'badge-rejected',
  };
  return map[status] || 'badge-normal';
};

export const formatCurrency = (val) => {
  if (!val) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
};
