import api from './api';

/**
 * GET /api/listings/?location=&budget_min=&budget_max=&skip=&limit=
 *
 * Public — no auth required for browsing.
 * Authenticated tenants will receive compatibility scores per listing.
 */
export function fetchListings(params = {}) {
  const query = {};

  if (params.location) query.location = params.location;
  if (params.budget_min !== undefined && params.budget_min !== '') {
    query.budget_min = params.budget_min;
  }
  if (params.budget_max !== undefined && params.budget_max !== '') {
    query.budget_max = params.budget_max;
  }
  if (params.room_type) query.room_type = params.room_type;
  if (params.skip !== undefined) query.skip = params.skip;
  if (params.limit !== undefined) query.limit = params.limit;

  return api.get('/listings/', { params: query });
}

/**
 * GET /api/listings/{id}
 */
export function fetchListingById(id) {
  return api.get(`/listings/${id}`);
}

/**
 * GET /api/listings/my   (owner only)
 */
export function fetchMyListings() {
  return api.get('/listings/my');
}

/**
 * POST /api/listings/   (owner only)
 */
export function createListing(data) {
  return api.post('/listings/', data);
}

/**
 * PATCH /api/listings/{id}   (owner only)
 *
 * Use this for editing listing fields such as location, rent, photos etc.
 * For toggling filled/available status, use setListingFilled() below.
 */
export function updateListing(id, data) {
  return api.patch(`/listings/${id}`, data);
}

/**
 * PATCH /api/listings/{id}/filled   (owner only)
 *
 * Dedicated endpoint for marking a listing as filled or available.
 * Filled listings are hidden from tenant browse results but remain
 * visible on the owner's own dashboard.
 */
export function setListingFilled(id, isFilled) {
  return api.patch(`/listings/${id}/filled`, { is_filled: isFilled });
}

/**
 * DELETE /api/listings/{id}   (owner only)
 */
export function deleteListing(id) {
  return api.delete(`/listings/${id}`);
}