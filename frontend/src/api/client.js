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

// ─── Financial Account ────────────────────────────────────────────────────────

/**
 * Get a specific financial account's balances
 */
export async function getAccountDetail(accountId) {
  return await fetchFromApi(`/accounts/${accountId}/`);
}

// ─── Categories ───────────────────────────────────────────────────────────────

/**
 * Get all expense categories (system + user's own)
 */
export async function getCategories() {
  return await fetchFromApi('/categories/');
}

/**
 * Create a custom expense category
 */
export async function createCategory(name) {
  await initCsrfToken();
  return await fetchFromApi('/categories/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * Delete (soft-archive) a user-owned category
 */
export async function deleteCategory(categoryId) {
  await initCsrfToken();
  return await fetchFromApi(`/categories/${categoryId}/`, {
    method: 'DELETE',
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/**
 * Add Cash — increments cash_balance or bank_balance
 * @param {Object} p
 * @param {string} p.account_id  UUID of the financial account
 * @param {string|number} p.amount
 * @param {'CASH'|'BANK'} p.balance_type   destination
 * @param {string} p.note        min 3 chars after trim
 * @param {string} p.date        YYYY-MM-DD
 * @param {string} [p.category_id]
 */
export async function addCash({ account_id, amount, balance_type, note, date, category_id }) {
  await initCsrfToken();
  return await fetchFromApi('/transactions/add-cash/', {
    method: 'POST',
    body: JSON.stringify({ account_id, amount, balance_type, note, date, ...(category_id && { category_id }) }),
  });
}

/**
 * Record an Expense — deducts from cash_balance or bank_balance
 */
export async function createExpense({ account_id, amount, balance_type, note, date, category_id }) {
  await initCsrfToken();
  return await fetchFromApi('/transactions/expense/', {
    method: 'POST',
    body: JSON.stringify({ account_id, amount, balance_type, note, date, category_id }),
  });
}

/**
 * Update an existing expense (differential balance recalculation in backend)
 */
export async function updateExpense(transactionId, { amount, balance_type, note, date, category_id }) {
  await initCsrfToken();
  return await fetchFromApi(`/transactions/${transactionId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ amount, balance_type, note, date, category_id }),
  });
}

/**
 * Cash ↔ Bank Transfer — total balance unchanged
 */
export async function createTransfer({ account_id, amount, balance_type, destination_balance_type, note, date }) {
  await initCsrfToken();
  return await fetchFromApi('/transactions/transfer/', {
    method: 'POST',
    body: JSON.stringify({ account_id, amount, balance_type, destination_balance_type, note, date }),
  });
}

/**
 * Void a transaction (soft-delete with balance restoration)
 */
export async function voidTransaction(transactionId) {
  await initCsrfToken();
  return await fetchFromApi(`/transactions/${transactionId}/`, {
    method: 'DELETE',
  });
}

/**
 * Get paginated transaction list with optional filters
 * @param {Object} params
 * @param {string} [params.search]        note/description search
 * @param {string} [params.type]          ADD_CASH | EXPENSE | TRANSFER
 * @param {string} [params.balance_type]  CASH | BANK
 * @param {string} [params.category]      UUID
 * @param {string} [params.date_from]     YYYY-MM-DD
 * @param {string} [params.date_to]       YYYY-MM-DD
 * @param {number} [params.amount_min]
 * @param {number} [params.amount_max]
 * @param {number} [params.limit]         default 20
 * @param {number} [params.offset]        default 0
 */
export async function getTransactions(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const qs = new URLSearchParams(cleanParams).toString();
  return await fetchFromApi(`/transactions/${qs ? `?${qs}` : ''}`);
}
