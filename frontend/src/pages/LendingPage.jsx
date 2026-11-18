/**
 * LendingPage.jsx
 * Prompt 05 — Milestone 9: Lending Management Screen (Mobile-First)
 *
 * Tracks:
 *   - Total Money Lent, Total Outstanding Receivables, Total Repaid
 *   - Individual Borrower Cards with repayment progress bars
 *   - Quick actions: Lend Money, Record Repayment, Adjust Receivable, View History
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  HandCoins, PlusCircle, Search, Sliders, CheckCircle, Clock,
  ChevronDown, ChevronUp, AlertCircle, RefreshCw, Loader2, ArrowDownRight,
  TrendingUp, User, Wallet, Landmark
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLendings } from '../api/client';
import LendModal from '../components/transactions/LendModal';
import RepayLendModal from '../components/transactions/RepayLendModal';
import AdjustLendModal from '../components/transactions/AdjustLendModal';

const STATUS_BADGES = {
  UNPAID: { label: 'Unpaid', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  FULLY_PAID: { label: 'Fully Paid', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
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

  async function handleOpSuccess() {
    await refreshUserData();
    fetchLendings();
    setActiveModal(null);
    setRepayTarget(null);
    setAdjustTarget(null);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Title & Add Lend CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-amber-100/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <HandCoins className="w-5 h-5" />
            </span>
            Money Lent (Receivables)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track money lent to friends, family, and borrowers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLendings}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              if (!isAuthenticated) { setAuthView('login'); return; }
              setActiveModal('lend');
            }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-xs font-bold shadow-sm hover:from-amber-600 hover:to-yellow-700 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lend Money</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Outstanding Due */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs bg-gradient-to-br from-amber-50/50 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
            Total Outstanding (Due to you)
          </p>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">
            ₹{formatCurrency(data.total_outstanding)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Asset claim on future cash flow</p>
        </div>

        {/* Total Money Lent */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Principal Disbursed
          </p>
          <p className="text-xl font-bold text-slate-800 mt-1">
            ₹{formatCurrency(data.total_lent)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Lifetime loans given</p>
        </div>

        {/* Total Repaid */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Principal Recovered
          </p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            ₹{formatCurrency(data.total_repaid)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Re-credited to your accounts</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by borrower name or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:bg-white"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: '', label: 'All' },
            { id: 'UNPAID', label: 'Unpaid' },
            { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
            { id: 'FULLY_PAID', label: 'Fully Paid' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <p className="text-xs">Loading lending records…</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center text-xs text-red-600">
          {error}
        </div>
      ) : data.results.length === 0 ? (
        <div className="py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <HandCoins className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Lending Records Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When you lend money to friends or family, record it here to track remaining dues and repayments accurately without distorting your income or expenses.
          </p>
          <button
            onClick={() => setActiveModal('lend')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Lend Money Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
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
                className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-amber-200 transition-all overflow-hidden"
              >
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Top Row: Borrower name + Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-sm shrink-0 border border-amber-100">
                        {lending.borrower_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {lending.borrower_name}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Lent on {formatDate(lending.lending_date)}
                          {lending.notes ? ` • "${lending.notes}"` : ''}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Financial Metrics & Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Outstanding:</span>
                      <span className="font-extrabold text-amber-700 text-sm">
                        ₹{formatCurrency(outstanding)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Repaid: ₹{formatCurrency(repaid)} ({progressPct}%)</span>
                      <span>Total: ₹{formatCurrency(original)}</span>
                    </div>
                  </div>

                  {/* Actions & Repayment Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : lending.id)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>History ({(lending.repayments?.length || 0) + (lending.adjustments?.length || 0)})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-1.5">
                      {outstanding > 0 && (
                        <>
                          <button
                            onClick={() => setAdjustTarget(lending)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                            title="Manually adjust remaining receivable"
                          >
                            <Sliders className="w-3 h-3 inline mr-1" />
                            Adjust
                          </button>
                          <button
                            onClick={() => setRepayTarget(lending)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[11px] font-bold hover:from-emerald-600 hover:to-teal-700 transition shadow-2xs cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Repay</span>
                          </button>
                        </>
                      )}
                      {outstanding === 0 && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 py-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Fully Settled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Repayment & Adjustment History */}
                {isExpanded && (
                  <div className="bg-slate-50/70 p-4 border-t border-slate-100 space-y-2 text-xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Audit &amp; Repayment History
                    </p>
                    {(!lending.repayments || lending.repayments.length === 0) &&
                     (!lending.adjustments || lending.adjustments.length === 0) ? (
                      <p className="text-[11px] text-slate-400 italic">No repayments or adjustments recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {lending.repayments?.map((r) => (
                          <div key={r.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                                <CheckCircle className="w-3 h-3" />
                              </span>
                              <div>
                                <span className="font-semibold text-slate-800">Repayment Received ({r.balance_type})</span>
                                <span className="text-slate-400 block text-[10px]">{formatDate(r.repayment_date)} {r.note ? `• "${r.note}"` : ''}</span>
                              </div>
                            </div>
                            <span className="font-bold text-emerald-600">+₹{formatCurrency(r.amount)}</span>
                          </div>
                        ))}

                        {lending.adjustments?.map((a) => (
                          <div key={a.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-md bg-amber-50 text-amber-700">
                                <Sliders className="w-3 h-3" />
                              </span>
                              <div>
                                <span className="font-semibold text-slate-800">Financial Adjustment</span>
                                <span className="text-slate-400 block text-[10px]">Reason: "{a.reason}"</span>
                              </div>
                            </div>
                            <span className="font-bold text-slate-700">
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

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {activeModal === 'lend' && selectedAccount && (
        <LendModal
          accountId={selectedAccount.id}
          cashBalance={selectedAccount.cash_balance}
          bankBalance={selectedAccount.bank_balance}
          onSuccess={handleOpSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      {repayTarget && (
        <RepayLendModal
          lending={repayTarget}
          onSuccess={handleOpSuccess}
          onClose={() => setRepayTarget(null)}
        />
      )}

      {adjustTarget && (
        <AdjustLendModal
          lending={adjustTarget}
          onSuccess={handleOpSuccess}
          onClose={() => setAdjustTarget(null)}
        />
      )}
    </div>
  );
}
