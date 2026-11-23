/**
 * LendingPage.jsx
 * Redesigned with Playful Modern Fintech UI inspired by Taxmate references
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  HandCoins, Plus, Search, Sliders, CheckCircle2, Clock,
  ChevronDown, ChevronUp, AlertCircle, RefreshCw, Loader2,
  TrendingUp, User, Wallet, Landmark, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLendings } from '../api/client';
import LendModal from '../components/transactions/LendModal';
import RepayLendModal from '../components/transactions/RepayLendModal';
import AdjustLendModal from '../components/transactions/AdjustLendModal';

const STATUS_BADGES = {
  UNPAID: { label: 'Unpaid', color: 'bg-[#FFF0E2] text-[#FF902B] border-amber-200' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'bg-[#F2EAF9] text-[#7E45A8] border-purple-200' },
  FULLY_PAID: { label: 'Fully Paid', color: 'bg-[#E4F5EE] text-[#075743] border-emerald-200' },
};

function formatCurrency(val) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(val || 0));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LendingPage() {
  const { selectedAccount, isAuthenticated, refreshUserData, setAuthView } = useAuth();

  const [data, setData] = useState({
    total_lent: '0.00',
    total_outstanding: '0.00',
    total_repaid: '0.00',
    results: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Active Modals
  const [activeModal, setActiveModal] = useState(null); // 'lend' | null
  const [repayTarget, setRepayTarget] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);

  // Accordion for repayment history
  const [expandedId, setExpandedId] = useState(null);

  const fetchLendings = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const res = await getLendings({
        account_id: selectedAccount?.id,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load lending records.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedAccount?.id, statusFilter, search]);

  useEffect(() => {
    fetchLendings();
  }, [fetchLendings]);

  const handleModalSuccess = (updatedAccount) => {
    setActiveModal(null);
    setRepayTarget(null);
    setAdjustTarget(null);
    fetchLendings();
    refreshUserData({ preserveUser: true, onlyAccounts: true });
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-[32px] bg-white p-8 sm:p-12 text-center border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] max-w-md mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FFF0E2] text-[#FF902B] mx-auto flex items-center justify-center">
          <HandCoins className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#24151B]">Sign in to track lending</h2>
        <p className="text-xs text-stone-400">
          Track money lent to friends and record repayments without corrupting your cash balances.
        </p>
        <button
          type="button"
          onClick={() => setAuthView('login')}
          className="mt-4 w-full rounded-full bg-[#FF902B] py-3 text-xs font-extrabold text-white hover:bg-[#E0791B] active:scale-95 transition-all shadow-md cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  const outstandingTotal = parseFloat(data.total_outstanding || 0);
  const totalLent = parseFloat(data.total_lent || 0);
  const totalRepaid = parseFloat(data.total_repaid || 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#24151B]">
            Money Lent (Receivables)
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
            Owed by borrowers • Tracked as assets without counting as expenses
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={fetchLendings}
            disabled={loading}
            className="p-2.5 rounded-full bg-white border border-stone-200 hover:bg-[#FAF6F0] text-stone-500 hover:text-[#24151B] transition cursor-pointer disabled:opacity-40 shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('lend')}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-full bg-[#C5F52A] text-[#1C1014] text-xs font-extrabold hover:bg-[#B4E81E] active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lend Money</span>
          </button>
        </div>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Outstanding Receivables (Deep Plum Hero) */}
        <div className="rounded-[28px] bg-[#331B24] text-white p-5 sm:p-6 shadow-[0_12px_30px_rgba(51,27,36,0.15)] border border-[#462532] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D2B4ED]">
              Outstanding Owed to You
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#FAF6F0]">
              ₹{formatCurrency(outstandingTotal)}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#C5F52A] font-bold">
            Asset • Not Spendable Cash
          </p>
        </div>

        {/* Total Lent */}
        <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Total Lent Historically
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#24151B]">
              ₹{formatCurrency(totalLent)}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-stone-400">
            Across all active &amp; settled loans
          </p>
        </div>

        {/* Total Repaid */}
        <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Total Repaid by Borrowers
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#075743]">
              ₹{formatCurrency(totalRepaid)}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#075743] font-bold">
            Credited back into wallet balances
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-[28px] p-4 sm:p-5 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search borrower by name or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-full border border-stone-200 bg-[#FAF6F0] focus:bg-white text-xs sm:text-sm text-[#24151B] placeholder:text-stone-400 focus:outline-none focus:border-[#FF902B] transition-all"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['', 'UNPAID', 'PARTIALLY_PAID', 'FULLY_PAID'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#331B24] text-white shadow-xs'
                  : 'bg-[#FAF6F0] text-stone-600 hover:bg-stone-100'
              }`}
            >
              {st === '' ? 'All' : STATUS_BADGES[st]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Borrower Cards List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-stone-400">
          <Loader2 className="w-7 h-7 animate-spin text-[#FF902B]" />
          <p className="text-xs font-medium">Loading borrower records…</p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-center text-xs text-rose-600 font-semibold">
          {error}
        </div>
      ) : data.results.length === 0 ? (
        <div className="py-16 px-4 text-center border border-dashed border-stone-200 rounded-[32px] bg-white space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#FFF0E2] text-[#FF902B] flex items-center justify-center">
            <HandCoins className="w-7 h-7" />
          </div>
          <h4 className="text-base font-extrabold text-[#24151B]">No Lending Records</h4>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            When you lend cash or bank funds to friends, record it here to track remaining dues with audit integrity.
          </p>
          <button
            type="button"
            onClick={() => setActiveModal('lend')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#C5F52A] text-[#1C1014] text-xs font-extrabold hover:bg-[#B4E81E] transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Loan Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {data.results.map((lending) => {
            const original = parseFloat(lending.original_amount || 0);
            const outstanding = parseFloat(lending.outstanding_amount || 0);
            const repaid = parseFloat(lending.amount_repaid || 0);
            const progressPct = original > 0 ? Math.min(100, Math.round((repaid / original) * 100)) : 0;
            const badge = STATUS_BADGES[lending.status] || STATUS_BADGES.UNPAID;
            const isExpanded = expandedId === lending.id;

            return (
              <div
                key={lending.id}
                className="bg-white rounded-[28px] border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] overflow-hidden transition-all hover:shadow-md"
              >
                <div className="p-5 sm:p-6 space-y-3.5">
                  {/* Top Row: Borrower Avatar & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-full bg-[#FFF0E2] text-[#FF902B] flex items-center justify-center font-extrabold text-sm shrink-0">
                        {lending.borrower_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-extrabold text-[#24151B]">
                          {lending.borrower_name}
                        </h4>
                        <p className="text-[11px] text-stone-400">
                          Lent {formatDate(lending.lending_date)}
                          {lending.notes ? ` • "${lending.notes}"` : ''}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Financial Metrics & Progress Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-stone-400 font-semibold">Remaining Due:</span>
                      <span className="font-extrabold text-lg text-[#24151B]">
                        ₹{formatCurrency(outstanding)}
                      </span>
                    </div>

                    <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#C5F52A] h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-stone-400">
                      <span>Repaid: ₹{formatCurrency(repaid)} ({progressPct}%)</span>
                      <span>Original: ₹{formatCurrency(original)}</span>
                    </div>
                  </div>

                  {/* Actions & Repayment Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-100 gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : lending.id)}
                      className="text-xs font-bold text-stone-500 hover:text-[#24151B] flex items-center gap-1 cursor-pointer"
                    >
                      <span>History ({(lending.repayments?.length || 0) + (lending.adjustments?.length || 0)})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-2">
                      {outstanding > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAdjustTarget(lending)}
                            className="px-3.5 py-1.5 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                            title="Manually adjust receivable"
                          >
                            <Sliders className="w-3 h-3 inline mr-1" />
                            Adjust
                          </button>
                          <button
                            type="button"
                            onClick={() => setRepayTarget(lending)}
                            className="px-4 py-1.5 rounded-full bg-[#C5F52A] text-[#1C1014] text-xs font-extrabold hover:bg-[#B4E81E] active:scale-95 transition shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Record Repayment</span>
                          </button>
                        </>
                      )}
                      {outstanding === 0 && (
                        <span className="text-xs font-extrabold text-[#075743] flex items-center gap-1 py-1">
                          <CheckCircle2 className="w-4 h-4" /> Fully Settled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Repayment & Adjustment History */}
                {isExpanded && (
                  <div className="bg-[#FAF6F0] p-4 sm:p-5 border-t border-stone-100 space-y-2 text-xs">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                      Audit &amp; Repayment History
                    </p>
                    {(!lending.repayments || lending.repayments.length === 0) &&
                     (!lending.adjustments || lending.adjustments.length === 0) ? (
                      <p className="text-xs text-stone-400 italic">No repayments or adjustments recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {lending.repayments?.map((r) => (
                          <div key={r.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-stone-100 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-full bg-[#E4F5EE] text-[#075743]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="font-bold text-[#24151B]">Repaid to {r.balance_type}</span>
                                <span className="text-stone-400 block text-[10px]">{formatDate(r.repayment_date)} {r.note ? `• "${r.note}"` : ''}</span>
                              </div>
                            </div>
                            <span className="font-extrabold text-[#075743]">+₹{formatCurrency(r.amount)}</span>
                          </div>
                        ))}

                        {lending.adjustments?.map((a) => (
                          <div key={a.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-stone-100 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-full bg-[#FFF0E2] text-[#FF902B]">
                                <Sliders className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="font-bold text-[#24151B]">Adjustment</span>
                                <span className="text-stone-400 block text-[10px]">Reason: "{a.reason}"</span>
                              </div>
                            </div>
                            <span className="font-extrabold text-stone-700">
                              {parseFloat(a.adjustment_amount) < 0 ? `-₹${formatCurrency(Math.abs(a.adjustment_amount))}` : `+₹${formatCurrency(a.adjustment_amount)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {activeModal === 'lend' && selectedAccount && (
        <LendModal
          accountId={selectedAccount.id}
          cashBalance={selectedAccount.cash_balance}
          bankBalance={selectedAccount.bank_balance}
          onSuccess={handleModalSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      {repayTarget && selectedAccount && (
        <RepayLendModal
          accountId={selectedAccount.id}
          lendingRecord={repayTarget}
          onSuccess={handleModalSuccess}
          onClose={() => setRepayTarget(null)}
        />
      )}

      {adjustTarget && selectedAccount && (
        <AdjustLendModal
          accountId={selectedAccount.id}
          lendingRecord={adjustTarget}
          onSuccess={handleModalSuccess}
          onClose={() => setAdjustTarget(null)}
        />
      )}
    </div>
  );
}
