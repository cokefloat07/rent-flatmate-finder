// ── Route paths (single source of truth) ─────────────────────────────────────
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  OWNER_DASHBOARD: '/owner',
  TENANT_DASHBOARD: '/tenant',
  LISTING_DETAILS: '/listings/:id',
  CHAT: '/chat/:interestId',
  ADMIN_DASHBOARD: '/admin',
};

// Helper to build parameterised paths
export const buildRoute = {
  listingDetails: (id) => `/listings/${id}`,
  chat: (interestId) => `/chat/${interestId}`,
};

// ── User roles (mirrors backend enum) ────────────────────────────────────────
export const ROLES = {
  OWNER: 'owner',
  TENANT: 'tenant',
  ADMIN: 'admin',
};

// ── Compatibility score thresholds ───────────────────────────────────────────
export const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
};

// ── Room types & furnishing (matches backend enums) ─────────────────────────
export const ROOM_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'shared', label: 'Shared' },
  { value: 'studio', label: 'Studio' },
];

export const FURNISHING_STATUSES = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'semi-furnished', label: 'Semi-furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
];
