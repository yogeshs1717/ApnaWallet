/**
 * ApnaWallet - Centralized API Client Module
 * Handles base URL, cookies, CSRF protection, timeouts, and JSON parsing.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Helper to retrieve cookie value by name (e.g. csrftoken)
 */
export function getCookie(name) {
  let cookieValue = null;
  if (typeof document !== 'undefined' && document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Core fetch wrapper with credentials and error handling
 */
export async function fetchFromApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
  }

  const config = {
    ...options,
    method,
    headers,
    credentials: 'include', // Crucial: Includes HttpOnly sessionid and csrftoken cookies
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorMsg = data?.detail || 
                       data?.non_field_errors?.[0] || 
                       (data && typeof data === 'object' ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | ') : null) || 
                       `Server returned HTTP ${response.status}: ${response.statusText}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Backend request timed out. Please verify Django is running.');
    }
    throw err;
  }
}

/**
 * Ensures CSRF cookie is initialized
 */
export async function initCsrfToken() {
  return await fetchFromApi('/auth/csrf/');
}

/**
 * Health check probe
 */
export async function getBackendHealth() {
  return await fetchFromApi('/health/');
}

/**
 * User Registration
 */
export async function registerUser({ full_name, email, password }) {
  await initCsrfToken();
  return await fetchFromApi('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ full_name, email, password }),
  });
}

/**
 * User Login
 */
export async function loginUser({ email, password }) {
  await initCsrfToken();
  return await fetchFromApi('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * User Logout
 */
export async function logoutUser() {
  await initCsrfToken();
  return await fetchFromApi('/auth/logout/', {
    method: 'POST',
  });
}

/**
 * Get current authenticated user profile
 */
export async function getCurrentUserProfile() {
  return await fetchFromApi('/auth/me/');
}

/**
 * Get user's financial accounts
 */
export async function getFinancialAccounts() {
  return await fetchFromApi('/accounts/');
}

/**
 * Request password reset link (dispatches Brevo/console email)
 */
export async function requestPasswordReset(email) {
  await initCsrfToken();
  return await fetchFromApi('/auth/password-reset/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Confirm password reset using uid and token
 */
export async function confirmPasswordReset({ uid, token, new_password }) {
  await initCsrfToken();
  return await fetchFromApi('/auth/password-reset/confirm/', {
    method: 'POST',
    body: JSON.stringify({ uid, token, new_password }),
  });
}
