import api from './api';

/**
 * Fetch listings with optional filters.
 * Maps frontend filter names → backend query params.
 */
export async function fetchListings(filters = {}) {
  const params = {};

  if (filters.location && String(filters.location).trim()) {
    params.location = String(filters.location).trim();
  }

  const min = filters.budget_min ?? filters.minRent;
  if (min !== '' && min != null && !isNaN(Number(min))) {
    params.budget_min = Number(min);
  }

  const max = filters.budget_max ?? filters.maxRent;
  if (max !== '' && max != null && !isNaN(Number(max))) {
    params.budget_max = Number(max);
  }

  if (filters.room_type && String(filters.room_type).trim()) {
    params.room_type = filters.room_type;
  }

  const data = await api.get('/listings/', { params });
  return Array.isArray(data) ? data : [];
}

export async function fetchListingById(id) {
  return api.get(`/listings/${id}`);
}

export async function fetchMyListings() {
  const data = await api.get('/listings/my');
  return Array.isArray(data) ? data : [];
}

export async function createListing(payload) {
  return api.post('/listings/', payload);
}

export async function updateListing(id, payload) {
  return api.patch(`/listings/${id}`, payload);
}

/**
 * Toggle listing filled/available status.
 * Backend endpoint: PATCH /listings/{id}/filled
 *
 * Note: This is a TOGGLE — the backend flips the current state.
 * The `desiredFilled` param is accepted for API compatibility but not sent,
 * since the backend uses a toggle pattern (not an explicit set).
 */
export async function setListingFilled(id, desiredFilled) {
  return api.patch(`/listings/${id}/filled`);
}

/**
 * Alias for backward compatibility.
 */
export async function toggleListingFilled(id) {
  return api.patch(`/listings/${id}/filled`);
}

export async function deleteListing(id) {
  return api.delete(`/listings/${id}`);
}