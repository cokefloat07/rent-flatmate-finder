import api from './api';

/**
 * POST /api/interests/  (tenant only)
 */
export function expressInterest(listingId) {
  return api.post('/interests/', { listing_id: listingId });
}

/**
 * GET /api/interests/my  (tenant only)
 */
export function fetchMyInterests() {
  return api.get('/interests/my');
}

/**
 * GET /api/interests/for-listing/{listing_id}  (tenant only)
 * Returns null if no interest yet, else interest object.
 */
export async function fetchMyInterestForListing(listingId) {
  try {
    const data = await api.get(`/interests/for-listing/${listingId}`);
    return data; // null or interest object
  } catch (err) {
    if (err.httpStatus === 404) return null;
    throw err;
  }
}

/**
 * GET /api/interests/incoming  (owner only)
 */
export function fetchIncomingInterests() {
  return api.get('/interests/incoming');
}

/**
 * PATCH /api/interests/{id}/respond  (owner only)
 * body: { action: "accept" | "decline" }
 */
export function respondToInterest(interestId, action) {
  return api.patch(`/interests/${interestId}/respond`, { action });
}

/**
 * PATCH /api/interests/{id}/revoke  (owner only)
 * Revoke a previously accepted interest.
 */
export function revokeInterest(interestId, reason = null) {
  return api.patch(`/interests/${interestId}/revoke`, { reason });
}