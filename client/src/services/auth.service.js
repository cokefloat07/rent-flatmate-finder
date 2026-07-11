import api from './api';
import useAuthStore from '../store/authStore';

/**
 * POST /api/auth/register
 *
 * Returns: { user: {id,name,email,role}, token: string }
 * Throws: ApiError on duplicate email, validation error, or network failure.
 */
function extractAuth(result) {
  const user = result.user;
  const tokenField = result.token;

  let token;
  if (typeof tokenField === 'string') {
    token = tokenField;
  } else if (tokenField && typeof tokenField === 'object') {
    token = tokenField.access_token || tokenField.token;
  }

  if (!token || typeof token !== 'string') {
    throw new Error('Server did not return a valid token');
  }

  return { user, token };
}
export async function registerUser({ name, email, password, role }) {
  const store = useAuthStore.getState();
  store.setLoading(true);
  store.clearError();

  try {
    const result = await api.post('/auth/register', { name, email, password, role });
    store.setAuth(result);
    return result;
  } catch (err) {
    store.setError(err.userMessage || 'Registration failed.');
    throw err;
  }
}

/**
 * POST /api/auth/login
 *
 * Returns: { user, token }
 * Throws: ApiError on invalid credentials, etc.
 */
export async function loginUser({ email, password }) {
  const store = useAuthStore.getState();
  store.setLoading(true);
  store.clearError();

  try {
    const result = await api.post('/auth/login', { email, password });
    const auth = extractAuth(result);
    store.setAuth(auth);
    return auth;
  } catch (err) {
    store.setError(err.userMessage || 'Login failed.');
    throw err;
  }
}

/**
 * Fetches the authenticated user profile using the existing token.
 * Called on app startup to restore session (if needed later) or after updating profile.
 *
 * Returns: { id, name, email, role }
 * Throws: ApiError if token missing/expired.
 */
export async function fetchCurrentUser() {
  const store = useAuthStore.getState();
  if (!store.token) return null;

  try {
    const user = await api.get('/auth/me');

    // Update just the user part — keep whatever token we have
    useAuthStore.setState({ user, error: null });
    return user;
  } catch (err) {
    // 401 / expired token
    store.logout();
    return null;
  }
}
