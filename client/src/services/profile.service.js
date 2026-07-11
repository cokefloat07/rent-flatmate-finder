import api from './api';

/**
 * POST /api/profiles/  (tenant only — create)
 */
export function createProfile(data) {
  return api.post('/profiles/', data);
}

/**
 * GET /api/profiles/me  (tenant only)
 */
export function fetchMyProfile() {
  return api.get('/profiles/me');
}

/**
 * PATCH /api/profiles/me  (tenant only — update)
 */
export function updateProfile(data) {
  return api.patch('/profiles/me', data);
}

/**
 * DELETE /api/profiles/me  (tenant only)
 */
export function deleteMyProfile() {
  return api.delete('/profiles/me');
}
