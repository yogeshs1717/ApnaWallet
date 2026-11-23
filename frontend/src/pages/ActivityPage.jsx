/**
 * ActivityPage.jsx
 * Redesigned with Playful Modern Fintech UI inspired by Taxmate references
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, SlidersHorizontal, X, Plus, Minus, ArrowLeftRight,
  Wallet, Landmark, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  Pencil, Trash2, AlertCircle, CheckCircle2, HandCoins, CreditCard
} from 'lucide-react';
import { getTransactions, getCategories, voidTransaction } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from '../components/transactions/ExpenseModal';

const TYPE_CONFIG = {
  ADD_CASH:          { label: 'Cash In',     bgCircle: 'bg-[#E4F5EE] text-[#075743]', Icon: Plus,           sign: '+', amtColor: 'text-[#075743]' },
  EXPENSE:           { label: 'Expense',     bgCircle: 'bg-[#F2EAF9] text-[#7E45A8]', Icon: Minus,          sign: '-', amtColor: 'text-[#24151B]'  },
  TRANSFER:          { label: 'Transfer',    bgCircle: 'bg-[#E4F5EE] text-[#075743]', Icon: ArrowLeftRight, sign: '',  amtColor: 'text-[#075743]'  },
  LENDING:           { label: 'Money Lent',  bgCircle: 'bg-[#FFF0E2] text-[#FF902B]', Icon: HandCoins,      sign: '-', amtColor: 'text-[#FF902B]' },
  LENDING_REPAYMENT: { label: 'Lend Repaid', bgCircle: 'bg-[#E4F5EE] text-[#075743]', Icon: CheckCircle2, sign: '+', amtColor: 'text-[#075743]' },
  CREDIT:            { label: 'Borrowed',    bgCircle: 'bg-[#FDE8EC] text-[#E11D48]', Icon: CreditCard,     sign: '+', amtColor: 'text-[#E11D48]' },
  CREDIT_REPAYMENT:  { label: 'Debt Repaid', bgCircle: 'bg-[#E4F5EE] text-[#075743]', Icon: CheckCircle2, sign: '-', amtColor: 'text-[#075743]' },
};

const BAL_ICON = { CASH: Wallet, BANK: Landmark };
const PAGE_SIZE = 50;

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmt(amount, type) {
  const cfg = TYPE_CONFIG[type] || {};
  const num = parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${cfg.sign || ''}₹${num}`;
}

export default function ActivityPage() {
  const { isAuthenticated, selectedAccount, refreshUserData } = useAuth();

  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [balFilter, setBalFilter]   = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset]         = useState(0);

  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount]     = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [categories, setCategories]     = useState([]);

  const [editTx, setEditTx]           = useState(null);
  const [voidConfirm, setVoidConfirm] = useState(null);
  const [voidLoading, setVoidLoading] = useState(false);
  const [voidError, setVoidError]     = useState('');
  const [voidSuccess, setVoidSuccess] = useState('');

  const searchTimer = useRef(null);

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

  useEffect(() => {
    setOffset(0);
    fetchData(0);
  }, [fetchData]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function goToPage(page) {
    const newOffset = (page - 1) * PAGE_SIZE;
    setOffset(newOffset);
    fetchData(newOffset);
  }

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

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#24151B]">
            Activity &amp; Ledger
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
            Audit-grade history stored on Neon PostgreSQL
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchData(offset)}
          disabled={loading}
          className="p-2.5 rounded-full bg-white border border-stone-200 hover:bg-[#FAF6F0] text-stone-500 hover:text-[#24151B] transition cursor-pointer disabled:opacity-40 shadow-2xs"
          title="Refresh activity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Success notification */}
      {voidSuccess && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#E4F5EE] border border-[#075743]/20 text-xs font-semibold text-[#075743]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{voidSuccess}</span>
          <button type="button" onClick={() => setVoidSuccess('')} className="ml-auto text-[#075743] hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filters Container */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-3">
        <div className="flex gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by note, description or payee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-full border border-stone-200 text-xs sm:text-sm bg-[#FAF6F0] focus:bg-white focus:outline-none focus:border-[#FF902B] focus:ring-2 focus:ring-[#FF902B]/20 transition-all text-[#24151B] placeholder:text-stone-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((p) => !p)}
            className={`px-4 py-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showFilters || hasActiveFilters 
                ? 'bg-[#331B24] border-[#331B24] text-[#FAF6F0]' 
                : 'border-stone-200 bg-[#FAF6F0] text-stone-600 hover:bg-stone-100'
            }`}
            title="Toggle filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="p-3 rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
              title="Clear all filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-stone-100">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs bg-[#FAF6F0] text-[#24151B] focus:outline-none focus:bg-white"
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

            <select
              value={balFilter}
              onChange={(e) => setBalFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs bg-[#FAF6F0] text-[#24151B] focus:outline-none focus:bg-white"
            >
              <option value="">Cash &amp; Bank</option>
              <option value="CASH">Cash only</option>
              <option value="BANK">Bank only</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs bg-[#FAF6F0] text-[#24151B] focus:outline-none focus:bg-white"
            />

            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl border border-stone-200 text-xs bg-[#FAF6F0] text-[#24151B] focus:outline-none focus:bg-white"
            />
          </div>
        )}
      </div>

      {/* Results Container */}
      <div className="bg-white rounded-[32px] border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-stone-100 bg-[#FAF6F0]/60">
          <span className="text-xs sm:text-sm font-extrabold text-[#24151B]">
            {loading ? 'Fetching transactions…' : `${totalCount} transaction${totalCount !== 1 ? 's' : ''}`}
          </span>
          {totalPages > 1 && (
            <span className="text-xs font-semibold text-stone-400">Page {currentPage} of {totalPages}</span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 flex flex-col items-center gap-3 text-stone-400">
            <Loader2 className="w-7 h-7 animate-spin text-[#FF902B]" />
            <span className="text-xs font-medium">Loading ledger from Neon…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="py-10 px-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xs text-rose-600 font-semibold">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && isAuthenticated && transactions.length === 0 && (
          <div className="py-16 px-6 text-center space-y-2">
            <p className="text-sm font-extrabold text-[#24151B]">No transactions found</p>
            <p className="text-xs text-stone-400">
              {hasActiveFilters ? 'Try adjusting your search criteria.' : 'Record your first transaction with Quick Actions.'}
            </p>
          </div>
        )}

        {/* Void Error */}
        {voidError && (
          <div className="mx-6 my-3 flex items-start gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{voidError}</span>
          </div>
        )}

        {/* Transaction Rows matching Taxmate reference */}
        {!loading && !error && transactions.length > 0 && (
          <div className="divide-y divide-stone-100 p-2 sm:p-3 space-y-1.5">
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
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-[#FAF6F0] transition-colors ${
                    isVoided ? 'opacity-40 line-through' : ''
                  }`}
                >
                  {/* Category circular pastel icon */}
                  <div className={`w-11 h-11 rounded-full ${cfg.bgCircle} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-stone-100 text-[#24151B]">
                        {cfg.label}
                      </span>
                      {tx.category?.name && (
                        <span className="text-[10px] font-semibold text-stone-500 bg-[#FAF6F0] px-2 py-0.5 rounded-full">
                          {tx.category.name}
                        </span>
                      )}
                      {isVoided && <span className="text-[10px] text-rose-600 font-extrabold uppercase">VOIDED</span>}
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-[#24151B] truncate mt-1">
                      {tx.note || tx.category?.name || cfg.label}
                    </p>

                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <BalIcon className="w-3 h-3" />
                        <span className="capitalize">{tx.balance_type?.toLowerCase()}</span>
                      </span>
                      <span>•</span>
                      <span>{formatDate(tx.transaction_date)}</span>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="text-right shrink-0 space-y-1 ml-2">
                    <p className={`text-sm sm:text-base font-extrabold ${isVoided ? 'line-through text-stone-400' : cfg.amtColor}`}>
                      {formatAmt(tx.amount, tx.transaction_type)}
                    </p>
                    <div className="flex items-center justify-end gap-1.5">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditTx(tx)}
                          className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-[#FF902B] transition cursor-pointer"
                          title="Edit expense note or category"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canVoid && (
                        <button
                          type="button"
                          onClick={() => { setVoidConfirm(tx); setVoidError(''); }}
                          className="p-1.5 rounded-full hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                          title="Void transaction and restore balance"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-[#FAF6F0]/40">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="flex items-center gap-1 px-4 py-2 rounded-full border border-stone-200 bg-white text-xs font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs font-semibold text-stone-400">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
            </span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="flex items-center gap-1 px-4 py-2 rounded-full border border-stone-200 bg-white text-xs font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Void Confirmation Modal ───────────────────────────────────────── */}
      {voidConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-[36px] p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 border border-stone-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#24151B]">Void Transaction?</h3>
                <p className="text-xs text-stone-400">Restores balance &amp; audits deletion</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6F0] text-xs text-stone-700 space-y-1.5 font-medium">
              <p><span className="font-bold text-[#24151B]">Type:</span> {TYPE_CONFIG[voidConfirm.transaction_type]?.label}</p>
              <p><span className="font-bold text-[#24151B]">Amount:</span> ₹{parseFloat(voidConfirm.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p><span className="font-bold text-[#24151B]">Note:</span> {voidConfirm.note || 'None'}</p>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Your wallet balance will be restored automatically and the ledger audit trail is preserved.
            </p>

            {voidError && <p className="text-xs text-rose-600 font-semibold">{voidError}</p>}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setVoidConfirm(null)}
                className="flex-1 py-3 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
              >
                Keep Record
              </button>
              <button
                type="button"
                onClick={handleVoid}
                disabled={voidLoading}
                className="flex-1 py-3 rounded-full bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-700 transition disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {voidLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirm Void
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
