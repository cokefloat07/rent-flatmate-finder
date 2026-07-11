// ── Currency ─────────────────────────────────────────────────────────────────
export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ── Dates ────────────────────────────────────────────────────────────────────
export const formatDate = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ── Score color helper ───────────────────────────────────────────────────────
export const getScoreColor = (score) => {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
};

// ── Truncate ─────────────────────────────────────────────────────────────────
export const truncate = (text, max = 100) => {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
};
