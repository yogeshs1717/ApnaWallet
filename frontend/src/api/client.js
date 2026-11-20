/**
 * ApnaWallet - Centralized API Client Module
 * Handles base URL, cookies, CSRF protection, timeouts, and JSON parsing.
 */

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').trim();
const API_BASE_URL = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, '')}/api`;

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
 * Token Authentication helpers for cross-origin mobile storage
 */
export function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('apna_auth_token');
  }
  return null;
}

export function setAuthToken(token) {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('apna_auth_token', token);
    } else {
      localStorage.removeItem('apna_auth_token');
    }
  }
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

  // Add Token header for robust cross-origin authentication on mobile
  const authToken = getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Token ${authToken}`;
  }

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
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for remote cloud DB & Neon cold starts

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
 * Ensures CSRF cookie is initialized (cached once obtained)
 */
let csrfPromise = null;
export async function initCsrfToken(force = false) {
  if (!force && getCookie('csrftoken')) {
    return { detail: 'CSRF token already present' };
  }
  if (!csrfPromise) {
    csrfPromise = fetchFromApi('/auth/csrf/').finally(() => {
      csrfPromise = null;
    });
  }
  return await csrfPromise;
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
  const res = await fetchFromApi('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ full_name, email, password }),
  });
  if (res?.token) {
    setAuthToken(res.token);
  }
  return res;
}

/**
 * User Login
 */
export async function loginUser({ email, password }) {
  await initCsrfToken();
  const res = await fetchFromApi('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res?.token) {
    setAuthToken(res.token);
  }
  return res;
}

/**
 * User Logout
 */
export async function logoutUser() {
  try {
    await initCsrfToken();
    return await fetchFromApi('/auth/logout/', {
      method: 'POST',
    });
  } finally {
    setAuthToken(null);
  }
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
  const merged = { limit: 100, ...params };
  const cleanParams = Object.fromEntries(
    Object.entries(merged).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const qs = new URLSearchParams(cleanParams).toString();
  return await fetchFromApi(`/transactions/${qs ? `?${qs}` : ''}`);
}

// ─── Lending Operations (Prompt 05) ──────────────────────────────────────────

/**
 * List lending records with summary metrics
 */
export async function getLendings(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const qs = new URLSearchParams(cleanParams).toString();
  return await fetchFromApi(`/lending/${qs ? `?${qs}` : ''}`);
}

/**
 * Create a new lending record (disburses from Cash or Bank)
 */
export async function createLend({ account_id, borrower_name, amount, balance_type, date, note }) {
  await initCsrfToken();
  return await fetchFromApi('/lending/', {
    method: 'POST',
    body: JSON.stringify({ account_id, borrower_name, amount, balance_type, date, note }),
  });
}

/**
 * Retrieve single lending detail with repayment & adjustment history
 */
export async function getLendingDetail(lendingId) {
  return await fetchFromApi(`/lending/${lendingId}/`);
}

/**
 * Update lending non-financial metadata (borrower_name, notes)
 */
export async function updateLending(lendingId, { borrower_name, notes }) {
  await initCsrfToken();
  return await fetchFromApi(`/lending/${lendingId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ borrower_name, notes }),
  });
}

/**
 * Record partial or full repayment for a loan
 */
export async function repayLending(lendingId, { amount, balance_type, date, note }) {
  await initCsrfToken();
  return await fetchFromApi(`/lending/${lendingId}/repay/`, {
    method: 'POST',
    body: JSON.stringify({ amount, balance_type, date, note }),
  });
}

/**
 * Manually adjust outstanding balance (requires reason, does NOT touch Cash/Bank)
 */
export async function adjustLending(lendingId, { new_outstanding_amount, reason }) {
  await initCsrfToken();
  return await fetchFromApi(`/lending/${lendingId}/adjust/`, {
    method: 'POST',
    body: JSON.stringify({ new_outstanding_amount, reason }),
  });
}

// ─── Credit Operations (Prompt 05) ───────────────────────────────────────────

/**
 * List credit records with summary metrics
 */
export async function getCredits(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const qs = new URLSearchParams(cleanParams).toString();
  return await fetchFromApi(`/credit/${qs ? `?${qs}` : ''}`);
}

/**
 * Create a new credit liability record
 */
export async function createCredit({
  account_id,
  creditor_name,
  amount,
  credit_date,
  pay_by_date,
  description,
  receive_funds,
  destination_balance_type,
}) {
  await initCsrfToken();
  return await fetchFromApi('/credit/', {
    method: 'POST',
    body: JSON.stringify({
      account_id,
      creditor_name,
      amount,
      credit_date,
      pay_by_date: pay_by_date || null,
      description,
      receive_funds: !!receive_funds,
      destination_balance_type: receive_funds ? destination_balance_type : null,
    }),
  });
}

/**
 * Retrieve single credit detail with repayments
 */
export async function getCreditDetail(creditId) {
  return await fetchFromApi(`/credit/${creditId}/`);
}

/**
 * Update credit metadata or due date
 */
export async function updateCredit(creditId, { creditor_name, description, pay_by_date, clear_due_date }) {
  await initCsrfToken();
  return await fetchFromApi(`/credit/${creditId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ creditor_name, description, pay_by_date, clear_due_date }),
  });
}

/**
 * Repay debt from Cash or Bank
 */
export async function repayCredit(creditId, { amount, payment_source, date, note }) {
  await initCsrfToken();
  return await fetchFromApi(`/credit/${creditId}/repay/`, {
    method: 'POST',
    body: JSON.stringify({ amount, payment_source, date, note }),
  });
}

// ─── Savings & Investment Operations (Prompt 06) ────────────────────────────
export async function getSavings() {
  return await fetchFromApi('/savings/');
}
export async function createSavingsGoal({ name, target_amount, target_date }) {
  await initCsrfToken();
  return await fetchFromApi('/savings/', { method: 'POST', body: JSON.stringify({ name, target_amount, target_date: target_date || null }) });
}
export async function depositSavings(goalId, { amount, balance_type }) {
  await initCsrfToken();
  return await fetchFromApi(`/savings/${goalId}/deposit/`, { method: 'POST', body: JSON.stringify({ amount, balance_type }) });
}
export async function withdrawSavings(goalId, { amount, balance_type }) {
  await initCsrfToken();
  return await fetchFromApi(`/savings/${goalId}/withdraw/`, { method: 'POST', body: JSON.stringify({ amount, balance_type }) });
}
export async function actOnSavingsGoal(goalId, action, balance_type) {
  await initCsrfToken();
  return await fetchFromApi(`/savings/${goalId}/action/`, { method: 'POST', body: JSON.stringify({ action, balance_type }) });
}
export async function getInvestments() {
  return await fetchFromApi('/investments/');
}
export async function createInvestment(payload) {
  await initCsrfToken();
  return await fetchFromApi('/investments/', {
    method: 'POST',
    body: JSON.stringify({ ...payload, link_to_balance: false, separate: true }),
  });
}
export async function updateInvestment(id, payload) {
  await initCsrfToken();
  return await fetchFromApi(`/investments/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function sellInvestment(id, payload) {
  await initCsrfToken();
  return await fetchFromApi(`/investments/${id}/`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, link_to_balance: false, separate: true }),
  });
}
export async function deleteInvestment(id) {
  await initCsrfToken();
  return await fetchFromApi(`/investments/${id}/`, { method: 'DELETE' });
}

// ─── Budgets & Recurring Expenses (Prompt 07) ───────────────────────────────
export async function getBudgets({ account_id, month }) {
  const qs = new URLSearchParams({ ...(account_id && { account_id }), ...(month && { month }) }).toString();
  return await fetchFromApi(`/budgets/?${qs}`);
}

export async function createBudget(payload) {
  await initCsrfToken();
  return await fetchFromApi('/budgets/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateBudget(id, payload) {
  await initCsrfToken();
  return await fetchFromApi(`/budgets/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteBudget(id) {
  await initCsrfToken();
  return await fetchFromApi(`/budgets/${id}/`, { method: 'DELETE' });
}

export async function getRecurringExpenses({ account_id, enabled } = {}) {
  const params = Object.fromEntries(Object.entries({ account_id, enabled }).filter(([, value]) => value !== undefined && value !== ''));
  const qs = new URLSearchParams(params).toString();
  return await fetchFromApi(`/recurring-expenses/${qs ? `?${qs}` : ''}`);
}

export async function createRecurringExpense(payload) {
  await initCsrfToken();
  return await fetchFromApi('/recurring-expenses/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateRecurringExpense(id, payload) {
  await initCsrfToken();
  return await fetchFromApi(`/recurring-expenses/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function cancelRecurringExpense(id) {
  await initCsrfToken();
  return await fetchFromApi(`/recurring-expenses/${id}/`, { method: 'DELETE' });
}

export async function recordRecurringExpense(id, scheduled_date) {
  await initCsrfToken();
  return await fetchFromApi(`/recurring-expenses/${id}/record/`, {
    method: 'POST',
    body: JSON.stringify({ scheduled_date }),
  });
}

// ─── In-app Notifications (Prompt 08) ───────────────────────────────────────
export async function getNotifications() {
  return await fetchFromApi('/notifications/');
}

export async function getNotificationUnreadCount() {
  return await fetchFromApi('/notifications/unread-count/');
}

export async function markNotificationRead(id) {
  await initCsrfToken();
  return await fetchFromApi(`/notifications/${id}/read/`, { method: 'POST' });
}

export async function dismissNotification(id) {
  await initCsrfToken();
  return await fetchFromApi(`/notifications/${id}/dismiss/`, { method: 'POST' });
}

export async function respondToDailyReminder(response) {
  await initCsrfToken();
  return await fetchFromApi('/notifications/daily-response/', {
    method: 'POST',
    body: JSON.stringify({ response }),
  });
}

// ─── Financial Reports (Prompt 09) ───────────────────────────────────────
export async function getReportSummary(params = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))).toString();
  return await fetchFromApi(`/reports/summary/${qs ? `?${qs}` : ''}`);
}

export async function getReportCategories(params = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))).toString();
  return await fetchFromApi(`/reports/categories/${qs ? `?${qs}` : ''}`);
}

export async function getReportTrends(params = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))).toString();
  return await fetchFromApi(`/reports/trends/${qs ? `?${qs}` : ''}`);
}

async function downloadReport(endpoint, params, fallbackName) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))).toString();
  const url = `${API_BASE_URL}${endpoint}${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`Report export failed (${response.status})`);
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadReportCsv(params = {}) {
  await downloadReport('/reports/export/csv/', params, 'apnawallet-transactions.csv');
}

export async function downloadReportPdf(params = {}) {
  await downloadReport('/reports/export/pdf/', params, 'apnawallet-report.pdf');
}
