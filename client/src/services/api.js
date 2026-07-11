import axios from 'axios';
import useAuthStore from '../store/authStore';
import { ROUTES } from '../utils/constants';

/**
 * Singleton axios instance.
 *
 * Backend contract (from BACKEND_PROMPT Section 8):
 *   • All REST endpoints live under /api
 *   • JWT returned in response body → stored in authStore
 *   • Sent as Authorization: Bearer <token>
 *   • Successful response shape: { success: true, data: … }
 *   • Failure shape:          { success: false, message: … }
 *                               OR FastAPI default { detail: "…" }
 */

// ── Factory creates a fresh instance each time we import this module ─────────
let _instance = null;

function getAxiosInstance() {
  if (!_instance) {
    _instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 15_000,
    });

    attachInterceptors(_instance);
  }
  return _instance;
}

// Named export is cleaner than a default singleton — allows mocking in tests later
export const api = getAxiosInstance();
export default api;

// ── Interceptor attachment (runs once per instance lifecycle) ─────────────────
function attachInterceptors(axiosInstance) {
  // 1) REQUEST – inject the Bearer token if the user has one
  axiosInstance.interceptors.request.use(
    (config) => {
      const { token } = useAuthStore.getState();

      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (requestError) => {
      return Promise.reject(requestError);
    }
  );

  // 2) RESPONSE – normalise success / error into a single usable contract
  axiosInstance.interceptors.response.use(
    (response) => {
      /*
       * Backend ALWAYS wraps data in { success, data }.
       * Unwrap: return just the inner `.data` payload on success.
       * This lets service methods do: const users = await api.get('/admin/users');
       */
      const body = response.data;

      if (body && typeof body === 'object' && body.success !== undefined) {
        if (!body.success) {
          // Server responded with HTTP 2xx but business logic says failure
          throw new ApiError(body.message || 'Unknown server error', response.status);
        }

        // Return the actual payload that callers care about
        return body.data ?? response;
      }

      // Fallback: some health-check routes might not follow { success, data }
      return response.data;
    },

    (error) => {
      if (!axios.isCancel(error)) {
        normaliseError(error);
      }
      return Promise.reject(error);
    }
  );
}

// ── Error normaliser — turns any HTTP / network / server failure into ──────────
//     a single { message, status } shape attached to the thrown error object.
function normaliseError(error) {
  let message = 'Something went wrong. Please try again.';
  let status = 0; // 0 means network/unknown

  // Case A: got a response back, so parse its body
  if (error.response) {
    status = error.response.status;
    const body = error.response.data;

    // FastAPI custom exception handler → { detail }  or  { success:false, message }
    if (typeof body?.message === 'string') {
      message = body.message;
    } else if (typeof body?.detail === 'string') {
      message = body.detail;
    } else if (status === 401) {
      message = 'Session expired — please log in again.';
    } else if (status === 403) {
      message = 'You don’t have permission for this action.';
    } else if (status === 404) {
      message = 'The requested resource was not found.';
    } else if (status >= 500) {
      message = 'A server error occurred. We’ve been notified.';
    }

    // Auto-logout on 401 (except during login/register to avoid loop)
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAuthEndpoint =
      currentPath.startsWith(ROUTES.LOGIN) || currentPath.startsWith(ROUTES.REGISTER);

    if (status === 401 && !isAuthEndpoint) {
      // Delayed logout so we don't break the current render cycle
      requestAnimationFrame(() => useAuthStore.getState().logout());
    }
  }
  // Case B: never reached the server at all
  else if (error.request) {
    message = 'Network error — check your connection.';
    status = 0;
  }
  // Case C: something threw synchronously (programmer bug)
  else if (error.message) {
    message = error.message;
  }

  // Attach standardised fields so callers can use them directly
  error._isApiError = true;
  error.userMessage = message;
  error.httpStatus = status;
  return error;
}

/**
 * Helper class for programmatic throws inside interceptors / services.
 * Inherits from Error so try/catch works naturally.
 */
export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.httpStatus = status;
    this.userMessage = message;
  }
}
