/**
 * ActivityPage.jsx
 * Prompt 04 — Milestone 7: Transaction History with Search, Filters & Pagination
 *
 * Architecture note:
 *   - React holds filter state (search, type, date range, etc.)
 *   - On change, useEffect fires getTransactions(params) → Django REST API
 *   - Django applies Q() filter chains, annotates, and paginates via LimitOffsetPagination
 *   - PostgreSQL executes the final query on Neon
 *
 * Concept: Why no hard-delete?
 *   Voided transactions keep is_voided=True and restore balances.
 *   This preserves a full audit trail — critical for financial integrity.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, SlidersHorizontal, X, PlusCircle, ArrowDownRight, ArrowLeftRight,
  Wallet, Landmark, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  Pencil, Trash2, AlertCircle, CheckCircle, HandCoins, CreditCard
} from 'lucide-react';
import { getTransactions, getCategories, voidTransaction } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/transactions/ExpenseModal';
import AddCashModal from '../components/transactions/AddCashModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  ADD_CASH:          { label: 'Cash In',     color: 'bg-green-100 text-green-700',   Icon: PlusCircle,     sign: '+', amtColor: 'text-green-600' },
  EXPENSE:           { label: 'Expense',     color: 'bg-rose-100 text-rose-700',     Icon: ArrowDownRight, sign: '-', amtColor: 'text-rose-600'  },
  TRANSFER:          { label: 'Transfer',    color: 'bg-blue-100 text-blue-700',     Icon: ArrowLeftRight, sign: '',  amtColor: 'text-blue-600'  },
  LENDING:           { label: 'Money Lent',  color: 'bg-amber-100 text-amber-800',   Icon: HandCoins,      sign: '-', amtColor: 'text-amber-700' },
  LENDING_REPAYMENT: { label: 'Lend Repaid', color: 'bg-emerald-100 text-emerald-800', Icon: CheckCircle, sign: '+', amtColor: 'text-emerald-600' },
  CREDIT:            { label: 'Borrowed',    color: 'bg-indigo-100 text-indigo-800', Icon: CreditCard,    sign: '+', amtColor: 'text-indigo-600' },
  CREDIT_REPAYMENT:  { label: 'Debt Repaid', color: 'bg-purple-100 text-purple-800', Icon: CheckCircle,   sign: '-', amtColor: 'text-purple-700' },
};
const BAL_ICON = { CASH: Wallet, BANK: Landmark };
const PAGE_SIZE = 15;

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmt(amount, type) {
  const cfg = TYPE_CONFIG[type] || {};
  const num = parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${cfg.sign || ''}₹${num}`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { isAuthenticated, selectedAccount, refreshUserData } = useAuth();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [balFilter, setBalFilter]   = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset]         = useState(0);

  // ── Data state ────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount]     = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [categories, setCategories]     = useState([]);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [editTx, setEditTx]           = useState(null);  // ExpenseModal in edit mode
  const [voidConfirm, setVoidConfirm] = useState(null);  // tx to void
  const [voidLoading, setVoidLoading] = useState(false);
  const [voidError, setVoidError]     = useState('');
  const [voidSuccess, setVoidSuccess] = useState('');

  // debounce search
  const searchTimer = useRef(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (currentOffset = 0) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const params = {
        limit: PAGE_SIZE,
        offset: currentOffset,
        ...(search      && { search }),
        ...(typeFilter  && { type: typeFilter }),
        ...(balFilter   && { balance_type: balFilter }),
        ...(dateFrom    && { date_from: dateFrom }),
        ...(dateTo      && { date_to: dateTo }),
      };
      const data = await getTransactions(params);
      if (Array.isArray(data)) {
        setTransactions(data);
        setTotalCount(data.length);
      } else {
        setTransactions(data.results || []);
        setTotalCount(data.count || 0);
      }
    } catch (err) {
      setError('Failed to load transactions. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, search, typeFilter, balFilter, dateFrom, dateTo]);

  // Reload when filters change (reset to page 1)
  useEffect(() => {
    setOffset(0);
    fetchData(0);
  }, [fetchData]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function goToPage(page) {
    const newOffset = (page - 1) * PAGE_SIZE;
    setOffset(newOffset);
    fetchData(newOffset);
  }

  // ── Void/Delete ───────────────────────────────────────────────────────────
  async function handleVoid() {
    if (!voidConfirm) return;
    setVoidLoading(true);
    setVoidError('');
    setVoidSuccess('');
    try {
      await voidTransaction(voidConfirm.id);
      await refreshUserData();
      setVoidSuccess(`Transaction voided. Balance restored.`);
      setVoidConfirm(null);
      fetchData(offset);
    } catch (err) {
      setVoidError(err.message || 'Failed to void transaction.');
    } finally {
      setVoidLoading(false);
    }
  }

  // ── After edit success ────────────────────────────────────────────────────
  async function handleEditSuccess() {
    await refreshUserData();
    setEditTx(null);
    fetchData(offset);
  }

  function clearFilters() {
    setSearch('');
    setTypeFilter('');
    setBalFilter('');
    setDateFrom('');
    setDateTo('');
  }

  const hasActiveFilters = search || typeFilter || balFilter || dateFrom || dateTo;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Activity</h2>
          <p className="text-xs text-slate-500 mt-0.5">Your complete transaction history</p>
        </div>
        <button
          onClick={() => fetchData(offset)}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition cursor-pointer disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Void success toast */}
      {voidSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{voidSuccess}</span>
          <button onClick={() => setVoidSuccess('')} className="ml-auto text-green-700 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by note, description…"
              value={search}
              onChange={(e) => {
                clearTimeout(searchTimer.current);
                const val = e.target.value;
                setSearch(val);
              }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition"
            />
          </div>
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${showFilters || hasActiveFilters ? 'bg-orange-50 border-orange-300 text-orange-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            title="Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition cursor-pointer"
              title="Clear filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            {/* Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="col-span-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              <option value="">All Types</option>
              <option value="ADD_CASH">Cash In</option>
              <option value="EXPENSE">Expense</option>
              <option value="TRANSFER">Transfer</option>
              <option value="LENDING">Money Lent</option>
              <option value="LENDING_REPAYMENT">Lend Repaid</option>
              <option value="CREDIT">Borrowed / Credit</option>
              <option value="CREDIT_REPAYMENT">Debt Repaid</option>
            </select>

            {/* Balance type */}
            <select
              value={balFilter}
              onChange={(e) => setBalFilter(e.target.value)}
              className="col-span-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              <option value="">Cash &amp; Bank</option>
              <option value="CASH">Cash only</option>
              <option value="BANK">Bank only</option>
            </select>

            {/* Date from */}
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="col-span-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder="From"
            />

            {/* Date to */}
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="col-span-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder="To"
            />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-800">
            {loading ? 'Loading…' : `${totalCount} transaction${totalCount !== 1 ? 's' : ''}`}
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs">Fetching transactions…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="py-10 px-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Not authenticated */}
        {!loading && !error && !isAuthenticated && (
          <div className="py-16 px-6 text-center text-slate-500 text-sm">
            Please sign in to view your transaction history.
          </div>
        )}

        {/* Empty */}
        {!loading && !error && isAuthenticated && transactions.length === 0 && (
          <div className="py-16 px-6 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">No transactions found</p>
            <p className="text-xs text-slate-400">
              {hasActiveFilters ? 'Try adjusting your filters.' : 'Start by adding cash or recording an expense.'}
            </p>
          </div>
        )}

        {/* Void error */}
        {voidError && (
          <div className="mx-6 my-3 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{voidError}</span>
          </div>
        )}

        {/* Transaction rows */}
        {!loading && !error && transactions.length > 0 && (
          <div className="divide-y divide-slate-50">
            {transactions.map((tx) => {
              const cfg = TYPE_CONFIG[tx.transaction_type] || TYPE_CONFIG.EXPENSE;
              const Icon = cfg.Icon;
              const BalIcon = BAL_ICON[tx.balance_type] || Wallet;
              const isVoided = tx.is_voided;
              const canEdit  = tx.transaction_type === 'EXPENSE' && !isVoided;
              const canVoid  = !isVoided;

              return (
                <div
                  key={tx.id}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition ${isVoided ? 'opacity-40' : ''}`}
                >
                  {/* Type badge */}
                  <div className={`w-9 h-9 rounded-xl ${cfg.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                      {tx.category?.name && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{tx.category.name}</span>
                      )}
                      {isVoided && <span className="text-[10px] text-red-500 font-bold">VOIDED</span>}
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">{tx.note}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <BalIcon className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-400 capitalize">{tx.balance_type?.toLowerCase()}</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{formatDate(tx.transaction_date)}</span>
                    </div>
                  </div>

                  {/* Amount + actions */}
                  <div className="text-right shrink-0 space-y-1">
                    <p className={`text-sm font-bold ${isVoided ? 'line-through text-slate-400' : cfg.amtColor}`}>
                      {formatAmt(tx.amount, tx.transaction_type)}
                    </p>
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => setEditTx(tx)}
                          className="p-1 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition cursor-pointer"
                          title="Edit expense"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canVoid && (
                        <button
                          onClick={() => { setVoidConfirm(tx); setVoidError(''); }}
                          className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition cursor-pointer"
                          title="Void transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs text-slate-500">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Void Confirmation Modal ───────────────────────────────────────── */}
      {voidConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Void Transaction?</h3>
                <p className="text-xs text-slate-500">This cannot be undone.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 space-y-1">
              <p><span className="font-semibold">Type:</span> {TYPE_CONFIG[voidConfirm.transaction_type]?.label}</p>
              <p><span className="font-semibold">Amount:</span> ₹{parseFloat(voidConfirm.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p><span className="font-semibold">Note:</span> {voidConfirm.note}</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The transaction will be marked as voided and your balance will be restored.
              The record is kept for audit purposes.
            </p>
            {voidError && <p className="text-xs text-red-600">{voidError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setVoidConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={voidLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {voidLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Void
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Expense Modal ────────────────────────────────────────────── */}
      {editTx && selectedAccount && (
        <ExpenseModal
          accountId={selectedAccount.id}
          editTransaction={editTx}
          onSuccess={handleEditSuccess}
          onClose={() => setEditTx(null)}
        />
      )}
    </div>
  );
}
