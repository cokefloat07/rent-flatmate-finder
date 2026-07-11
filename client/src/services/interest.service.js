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
