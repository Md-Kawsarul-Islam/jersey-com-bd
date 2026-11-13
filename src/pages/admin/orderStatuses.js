/** Canonical order statuses (mirror server/db.js ORDER_STATUSES). */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const STATUS_TONE = {
  pending: { bg: '#fff4e0', fg: '#b45309', border: '#fde68a' },
  confirmed: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
  processing: { bg: '#fff7ed', fg: '#c2410c', border: '#fed7aa' },
  shipped: { bg: '#f5f3ff', fg: '#6d28d9', border: '#ddd6fe' },
  delivered: { bg: '#e8fbef', fg: '#15803d', border: '#bbf7d0' },
  cancelled: { bg: '#fdecec', fg: '#b91c1c', border: '#f5c2c2' },
  refunded: { bg: '#f1f5f9', fg: '#475569', border: '#e2e8f0' },
};

/** Normalize legacy values used before the 7-status lifecycle existed. */
export const normalizeStatus = (s) => {
  const v = String(s || '').toLowerCase().trim();
  if (v === 'dispatched') return 'shipped';
  return ORDER_STATUSES.includes(v) ? v : 'pending';
};
