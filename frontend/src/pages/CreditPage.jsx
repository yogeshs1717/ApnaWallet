/**
 * CreditPage.jsx
 * Redesigned with Playful Modern Fintech UI inspired by Taxmate references
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Plus, Search, CheckCircle2, Clock,
  ChevronDown, ChevronUp, AlertCircle, RefreshCw, Loader2,
  Calendar, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCredits, updateCredit } from '../api/client';
import CreditModal from '../components/transactions/CreditModal';
import RepayCreditModal from '../components/transactions/RepayCreditModal';

const STATUS_BADGES = {
  UNPAID: { label: 'Unpaid', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'bg-[#F2EAF9] text-[#7E45A8] border-purple-200' },
  FULLY_PAID: { label: 'Fully Settled', color: 'bg-[#E4F5EE] text-[#075743] border-emerald-200' },
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

export default function CreditPage() {
  const { selectedAccount, isAuthenticated, refreshUserData, setAuthView } = useAuth();

  const [data, setData] = useState({
    total_credit: '0.00',
    total_outstanding: '0.00',
    total_repaid: '0.00',
    results: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Active Modals
  const [activeModal, setActiveModal] = useState(null); // 'credit' | null
  const [repayTarget, setRepayTarget] = useState(null);
  const [editDateTarget, setEditDateTarget] = useState(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [editDateLoading, setEditDateLoading] = useState(false);

  // Accordion for repayment history
  const [expandedId, setExpandedId] = useState(null);

  const fetchCredits = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const res = await getCredits({
        account_id: selectedAccount?.id,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load credit records.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedAccount?.id, statusFilter, search]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const handleModalSuccess = (updatedAccount) => {
    setActiveModal(null);
    setRepayTarget(null);
    setEditDateTarget(null);
    fetchCredits();
    refreshUserData({ preserveUser: true, onlyAccounts: true });
  };

  const handleSaveDueDate = async (e) => {
    e.preventDefault();
    if (!editDateTarget) return;
    setEditDateLoading(true);
    try {
      await updateCredit(editDateTarget.id, { due_date: newDueDate || null });
      setEditDateTarget(null);
      fetchCredits();
    } catch (err) {
      setError(err.message || 'Failed to update due date.');
    } finally {
      setEditDateLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-[32px] bg-white p-8 sm:p-12 text-center border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] max-w-md mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#F2EAF9] text-[#7E45A8] mx-auto flex items-center justify-center">
          <CreditCard className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#24151B]">Sign in to track credit</h2>
        <p className="text-xs text-stone-400">
          Manage debts, creditors, due-date reminders, and paybacks securely.
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
  const totalCredit = parseFloat(data.total_credit || 0);
  const totalRepaid = parseFloat(data.total_repaid || 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#24151B]">
            Credit &amp; Liabilities
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
            Debts owed to creditors • Tracked transparently until settled
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={fetchCredits}
            disabled={loading}
            className="p-2.5 rounded-full bg-white border border-stone-200 hover:bg-[#FAF6F0] text-stone-500 hover:text-[#24151B] transition cursor-pointer disabled:opacity-40 shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('credit')}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-full bg-[#C5F52A] text-[#1C1014] text-xs font-extrabold hover:bg-[#B4E81E] active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Credit</span>
          </button>
        </div>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Outstanding Debt (Deep Plum Hero) */}
        <div className="rounded-[28px] bg-[#331B24] text-white p-5 sm:p-6 shadow-[0_12px_30px_rgba(51,27,36,0.15)] border border-[#462532] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D2B4ED]">
              Total Debt You Owe
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#FAF6F0]">
              ₹{formatCurrency(outstandingTotal)}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-rose-300 font-bold">
            Liability • Pay off before due dates
          </p>
        </div>

        {/* Total Credit Borrowed Historically */}
        <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Total Borrowed Historically
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#24151B]">
              ₹{formatCurrency(totalCredit)}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-stone-400">
            Total credit lines recorded
          </p>
        </div>

        {/* Total Debt Repaid */}
        <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Total Principal Repaid
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#075743]">
              ₹{formatCurrency(totalRepaid)}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#075743] font-bold">
            Cleared debts &amp; completed repayments
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-[28px] p-4 sm:p-5 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search creditor by name or notes…"
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

      {/* Creditor Cards List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-stone-400">
          <Loader2 className="w-7 h-7 animate-spin text-[#FF902B]" />
          <p className="text-xs font-medium">Loading credit records…</p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-center text-xs text-rose-600 font-semibold">
          {error}
        </div>
      ) : data.results.length === 0 ? (
        <div className="py-16 px-4 text-center border border-dashed border-stone-200 rounded-[32px] bg-white space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#F2EAF9] text-[#7E45A8] flex items-center justify-center">
            <CreditCard className="w-7 h-7" />
          </div>
          <h4 className="text-base font-extrabold text-[#24151B]">No Debt Records</h4>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Record money borrowed or store credit to track repayment schedules and avoid late fees.
          </p>
          <button
            type="button"
            onClick={() => setActiveModal('credit')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#C5F52A] text-[#1C1014] text-xs font-extrabold hover:bg-[#B4E81E] transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Credit Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {data.results.map((credit) => {
            const original = parseFloat(credit.original_amount || 0);
            const outstanding = parseFloat(credit.outstanding_amount || 0);
            const repaid = parseFloat(credit.amount_repaid || 0);
            const progressPct = original > 0 ? Math.min(100, Math.round((repaid / original) * 100)) : 0;
            const badge = STATUS_BADGES[credit.status] || STATUS_BADGES.UNPAID;
            const isExpanded = expandedId === credit.id;
            const isOverdue = credit.status !== 'FULLY_PAID' && credit.due_date && new Date(credit.due_date) < new Date();

            return (
              <div
                key={credit.id}
                className="bg-white rounded-[28px] border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] overflow-hidden transition-all hover:shadow-md"
              >
                <div className="p-5 sm:p-6 space-y-3.5">
                  {/* Top Row: Creditor Avatar & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-full bg-[#F2EAF9] text-[#7E45A8] flex items-center justify-center font-extrabold text-sm shrink-0">
                        {credit.creditor_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-extrabold text-[#24151B]">
                          {credit.creditor_name}
                        </h4>
                        <p className="text-[11px] text-stone-400">
                          Borrowed {formatDate(credit.credit_date)}
                          {credit.notes ? ` • "${credit.notes}"` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {isOverdue && (
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          OVERDUE
                        </span>
                      )}
                      <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Financial Metrics & Progress Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-stone-400 font-semibold">Remaining Liability:</span>
                      <span className="font-extrabold text-lg text-rose-600">
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
                      <span>Total Credit: ₹{formatCurrency(original)}</span>
                    </div>
                  </div>

                  {/* Due Date Indicator */}
                  {credit.due_date && (
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#FF902B]" />
                      <span>Due by: <strong>{formatDate(credit.due_date)}</strong></span>
                    </div>
                  )}

                  {/* Actions & Repayment Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-100 gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : credit.id)}
                      className="text-xs font-bold text-stone-500 hover:text-[#24151B] flex items-center gap-1 cursor-pointer"
                    >
                      <span>History ({credit.repayments?.length || 0})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditDateTarget(credit);
                          setNewDueDate(credit.due_date || '');
                        }}
                        className="px-3.5 py-1.5 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                      >
                        Set Due Date
                      </button>

                      {outstanding > 0 && (
                        <button
                          type="button"
                          onClick={() => setRepayTarget(credit)}
                          className="px-4 py-1.5 rounded-full bg-[#C5F52A] text-[#1C1014] text-xs font-extrabold hover:bg-[#B4E81E] active:scale-95 transition shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Repay Debt</span>
                        </button>
                      )}

                      {outstanding === 0 && (
                        <span className="text-xs font-extrabold text-[#075743] flex items-center gap-1 py-1">
                          <CheckCircle2 className="w-4 h-4" /> Settled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Repayment History */}
                {isExpanded && (
                  <div className="bg-[#FAF6F0] p-4 sm:p-5 border-t border-stone-100 space-y-2 text-xs">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                      Payment History
                    </p>
                    {(!credit.repayments || credit.repayments.length === 0) ? (
                      <p className="text-xs text-stone-400 italic">No repayments recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {credit.repayments.map((r) => (
                          <div key={r.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-stone-100 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-full bg-[#E4F5EE] text-[#075743]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="font-bold text-[#24151B]">Repaid from {r.source_balance_type}</span>
                                <span className="text-stone-400 block text-[10px]">{formatDate(r.repayment_date)} {r.note ? `• "${r.note}"` : ''}</span>
                              </div>
                            </div>
                            <span className="font-extrabold text-[#075743]">₹{formatCurrency(r.amount)}</span>
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

      {/* Due Date Edit Modal */}
      {editDateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-[36px] p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 border border-stone-100 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-[#24151B]">
              Update Due Date for {editDateTarget.creditor_name}
            </h3>
            <form onSubmit={handleSaveDueDate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-[#FAF6F0] text-sm text-[#24151B] focus:bg-white focus:outline-none focus:border-[#FF902B]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditDateTarget(null)}
                  className="flex-1 py-3 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editDateLoading}
                  className="flex-1 py-3 rounded-full bg-[#C5F52A] text-[#1C1014] text-xs font-extrabold hover:bg-[#B4E81E] transition disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {editDateLoading ? 'Saving…' : 'Save Due Date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {activeModal === 'credit' && selectedAccount && (
        <CreditModal
          accountId={selectedAccount.id}
          onSuccess={handleModalSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      {repayTarget && selectedAccount && (
        <RepayCreditModal
          accountId={selectedAccount.id}
          creditRecord={repayTarget}
          cashBalance={selectedAccount.cash_balance}
          bankBalance={selectedAccount.bank_balance}
          onSuccess={handleModalSuccess}
          onClose={() => setRepayTarget(null)}
        />
      )}
    </div>
  );
}
