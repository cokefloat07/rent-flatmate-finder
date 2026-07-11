import axios from 'axios';
import useAuthStore from '../store/authStore';
import { ROUTES } from '../utils/constants';

// ── Environment URLs ──────────────────────────────────────────────
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

// ── Singleton axios instance ──────────────────────────────────────
let _instance = null;

function getAxiosInstance() {
  if (!_instance) {
    _instance = axios.create({
      baseURL: `${API_URL}/api`,   // ✅ FIXED — now uses Render URL
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

export const api = getAxiosInstance();
export default api;

// ── Interceptors ──────────────────────────────────────────────────
function attachInterceptors(axiosInstance) {
  axiosInstance.interceptors.request.use(
    (config) => {
      const { token } = useAuthStore.getState();
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (requestError) => Promise.reject(requestError)
  );

  // Find this section in api.js and REPLACE it:

axiosInstance.interceptors.response.use(
  (response) => {
    const body = response.data;

    // Handle wrapped { success, data } responses
    if (body && typeof body === 'object' && body.success !== undefined) {
      if (!body.success) {
        // Server returned success=false — treat as error
        const error = new ApiError(body.message || 'Unknown server error', response.status);
        return Promise.reject(error);
      }
      
      // Return data if present, or the whole body for endpoints without .data
      return body.data !== undefined ? body.data : body;
    }

    // Fallback for non-wrapped responses
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

function normaliseError(error) {
  let message = 'Something went wrong. Please try again.';
  let status = 0;

  if (error.response) {
    status = error.response.status;
    const body = error.response.data;

    if (typeof body?.message === 'string') {
      message = body.message;
    } else if (typeof body?.detail === 'string') {
      message = body.detail;
    } else if (status === 401) {
      message = 'Session expired — please log in again.';
    } else if (status === 403) {
      message = 'You don\'t have permission for this action.';
    } else if (status === 404) {
      message = 'The requested resource was not found.';
    } else if (status >= 500) {
      message = 'A server error occurred. We have been notified.';
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAuthEndpoint =
      currentPath.startsWith(ROUTES.LOGIN) || currentPath.startsWith(ROUTES.REGISTER);

    if (status === 401 && !isAuthEndpoint) {
      requestAnimationFrame(() => useAuthStore.getState().logout());
    }
  } else if (error.request) {
    message = 'Network error — check your connection.';
    status = 0;
  } else if (error.message) {
    message = error.message;
  }

  error._isApiError = true;
  error.userMessage = message;
  error.httpStatus = status;
  return error;
}

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.httpStatus = status;
    this.userMessage = message;
  }
}