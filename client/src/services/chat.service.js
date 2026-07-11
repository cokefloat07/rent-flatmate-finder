import api from './api';

/**
 * GET /api/chat/{interest_id}/messages
 *
 * Returns array of Message objects, oldest first.
 * Requires the caller to be either the tenant or the owner of the interest.
 * Backend returns 403 if the interest isn't accepted yet.
 */
export function fetchChatHistory(interestId, params = {}) {
  return api.get(`/chat/${interestId}/messages`, { params });
}

/**
 * GET /api/interests/{id} — used by chat page to verify access
 * and get metadata (the other participant's identity, etc.)
 */
export function fetchInterest(interestId) {
  return api.get(`/interests/${interestId}`);
}
