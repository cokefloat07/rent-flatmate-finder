import api from './api';

/**
 * Unwrap { success, data } envelope if present.
 * Handles the case where the axios interceptor already returns response.data,
 * so `res` here is the body directly, NOT the axios response object.
 */
const unwrap = (res) => {
  // Interceptor already returned response.data, so res IS the body
  if (Array.isArray(res)) return res;
  if (res === null || res === undefined) return [];
  if (typeof res !== 'object') return res;

  // { success: true, data: [...] } envelope
  if ('data' in res) return res.data;

  // Common alternative wrappers your backend might use
  if (Array.isArray(res.users)) return res.users;
  if (Array.isArray(res.listings)) return res.listings;
  if (Array.isArray(res.events)) return res.events;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.results)) return res.results;

  // Unknown shape — return as-is
  return res;
};

// ── Users ────────────────────────────────────────────────────────────────────
export async function fetchAllUsers() {
  // api.get returns body directly (interceptor already called response.data)
  const res = await api.get('/admin/users');
  console.log('[admin] users body:', res);
  const data = unwrap(res);
  console.log('[admin] users extracted:', data);
  return data;
}

export async function updateUser(userId, patch) {
  const res = await api.patch(`/admin/users/${userId}`, patch);
  return unwrap(res);
}

export async function deleteUser(userId) {
  const res = await api.delete(`/admin/users/${userId}`);
  return unwrap(res);
}

// ── Listings ─────────────────────────────────────────────────────────────────
export async function fetchAllListings() {
  const res = await api.get('/admin/listings');
  console.log('[admin] listings body:', res);
  const data = unwrap(res);
  console.log('[admin] listings extracted:', data);
  return data;
}

export async function deleteListingAsAdmin(listingId) {
  const res = await api.delete(`/admin/listings/${listingId}`);
  return unwrap(res);
}

// ── Activity Log ─────────────────────────────────────────────────────────────
export async function fetchActivityLog({ limit = 50 } = {}) {
  const res = await api.get('/admin/activity', { params: { limit } });
  console.log('[admin] activity body:', res);
  const data = unwrap(res);
  console.log('[admin] activity extracted:', data);
  return data;
}
