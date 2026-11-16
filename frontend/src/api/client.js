/**
 * ApnaWallet - Centralized API Client Module
 * Handles base URL configuration, headers, timeouts, and JSON parsing.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

/**
 * Generic fetch wrapper with error handling and timeout
 */
export async function fetchFromApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Backend request timed out. Please verify Django is running.');
    }
    // Network errors (e.g. backend server down or blocked by CORS)
    throw new Error(err.message || 'Unable to connect to ApnaWallet backend server.');
  }
}

/**
 * Health check endpoint call: GET /api/health/
 */
export async function getBackendHealth() {
  return await fetchFromApi('/health/');
}
