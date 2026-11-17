/**
 * CreditPage.jsx
 * Prompt 05 — Milestone 9: Credit & Liability Management Screen (Mobile-First)
 *
 * Tracks:
 *   - Total Outstanding Debt / Liabilities owed to creditors
 *   - Individual Creditor Cards with repayment progress and optional due dates
 *   - Overdue status derivation (Milestone 11)
 *   - Quick actions: Add Credit, Repay Debt, Edit / Due Date, View Payment History
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, PlusCircle, Search, CheckCircle, Clock,
  ChevronDown, ChevronUp, AlertCircle, RefreshCw, Loader2,
  Calendar, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCredits, updateCredit } from '../api/client';
import CreditModal from '../components/transactions/CreditModal';
import RepayCreditModal from '../components/transactions/RepayCreditModal';

const STATUS_BADGES = {
  UNPAID: { label: 'Unpaid', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  FULLY_PAID: { label: 'Fully Settled', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
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

  async function handleOpSuccess() {
    await refreshUserData();
    fetchCredits();
    setActiveModal(null);
    setRepayTarget(null);
    setEditDateTarget(null);
  }

  async function handleSaveDueDate(e) {
    e.preventDefault();
    if (!editDateTarget) return;
    setEditDateLoading(true);
    try {
      await updateCredit(editDateTarget.id, {
        pay_by_date: newDueDate || null,
        clear_due_date: !newDueDate,
      });
      setEditDateTarget(null);
      fetchCredits();
    } catch (err) {
      alert(err.message || 'Failed to update due date.');
    } finally {
      setEditDateLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Title & Add Credit CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-amber-100/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <CreditCard className="w-5 h-5" />
            </span>
            Credit &amp; Liabilities (Money Owed)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage borrowed funds, store tabs, loans, and credit repayments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCredits}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              if (!isAuthenticated) { setAuthView('login'); return; }
              setActiveModal('credit');
            }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-blue-600 hover:to-indigo-700 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Credit / Debt</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Outstanding Debt */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs bg-gradient-to-br from-rose-50/50 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
            Total Outstanding Debt (You Owe)
          </p>
          <p className="text-2xl font-extrabold text-rose-700 mt-1">
            ₹{formatCurrency(data.total_outstanding)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active liability claim against your funds</p>
        </div>

        {/* Total Credit Recorded */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Credit Incurred
          </p>
          <p className="text-xl font-bold text-slate-800 mt-1">
            ₹{formatCurrency(data.total_credit)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Lifetime obligations recorded</p>
        </div>

        {/* Total Principal Repaid */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Debt Extinguished
          </p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            ₹{formatCurrency(data.total_repaid)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Principal paid down</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by creditor name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: '', label: 'All' },
            { id: 'UNPAID', label: 'Unpaid' },
            { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
            { id: 'FULLY_PAID', label: 'Settled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-blue-100 text-blue-800 border border-blue-300 font-bold'
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
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-xs">Loading credit obligations…</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center text-xs text-red-600">
          {error}
        </div>
      ) : data.results.length === 0 ? (
        <div className="py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Debt Obligations Recorded</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You currently have no recorded liabilities. When you take a loan, receive credit, or maintain a grocery store tab, track it here with optional due dates and repayment tracking.
          </p>
          <button
            onClick={() => setActiveModal('credit')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Credit Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.results.map((credit) => {
            const original = parseFloat(credit.original_amount || 0);
            const outstanding = parseFloat(credit.outstanding_amount || 0);
            const repaid = parseFloat(credit.amount_repaid || 0);
            const progressPct = original > 0 ? Math.min(100, Math.round((repaid / original) * 100)) : 0;
            const badge = STATUS_BADGES[credit.status] || STATUS_BADGES.UNPAID;
            const isExpanded = expandedId === credit.id;
            const isOverdue = credit.is_overdue;

            return (
              <div
                key={credit.id}
                className={`bg-white rounded-2xl border shadow-xs transition-all overflow-hidden ${
                  isOverdue ? 'border-red-300 bg-red-50/10' : 'border-slate-100 hover:border-blue-200'
                }`}
              >
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Top Row: Creditor Name + Due Date Pill + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        isOverdue ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {credit.creditor_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {credit.creditor_name}
                          </h4>
                          {isOverdue && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
                              <AlertTriangle className="w-3 h-3" />
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Borrowed on {formatDate(credit.credit_date)}
                          {credit.pay_by_date ? ` • Pay by: ${formatDate(credit.pay_by_date)}` : ' • No due date'}
                          {credit.description ? ` • "${credit.description}"` : ''}
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
                      <span className="text-slate-500">Remaining Debt:</span>
                      <span className="font-extrabold text-rose-700 text-sm">
                        ₹{formatCurrency(outstanding)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Repaid: ₹{formatCurrency(repaid)} ({progressPct}%)</span>
                      <span>Total Owed: ₹{formatCurrency(original)}</span>
                    </div>
                  </div>

                  {/* Actions & Repayment Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : credit.id)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Repayment History ({credit.repayments?.length || 0})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditDateTarget(credit);
                          setNewDueDate(credit.pay_by_date || '');
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        title="Set or update pay-by due date"
                      >
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Due Date
                      </button>

                      {outstanding > 0 && (
                        <button
                          onClick={() => setRepayTarget(credit)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold hover:from-blue-700 hover:to-indigo-700 transition shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Repay Debt</span>
                        </button>
                      )}

                      {outstanding === 0 && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 py-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Fully Settled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Payment History */}
                {isExpanded && (
                  <div className="bg-slate-50/70 p-4 border-t border-slate-100 space-y-2 text-xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Payment History
                    </p>
                    {!credit.repayments || credit.repayments.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No repayments recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {credit.repayments.map((r) => (
                          <div key={r.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-md bg-blue-50 text-blue-600">
                                <CheckCircle className="w-3 h-3" />
                              </span>
                              <div>
                                <span className="font-semibold text-slate-800">Repaid from {r.payment_source}</span>
                                <span className="text-slate-400 block text-[10px]">{formatDate(r.repayment_date)} {r.note ? `• "${r.note}"` : ''}</span>
                              </div>
                            </div>
                            <span className="font-bold text-rose-600">-₹{formatCurrency(r.amount)}</span>
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
      {activeModal === 'credit' && selectedAccount && (
        <CreditModal
          accountId={selectedAccount.id}
          onSuccess={handleOpSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      {repayTarget && selectedAccount && (
        <RepayCreditModal
          credit={repayTarget}
          cashBalance={selectedAccount.cash_balance}
          bankBalance={selectedAccount.bank_balance}
          onSuccess={handleOpSuccess}
          onClose={() => setRepayTarget(null)}
        />
      )}

      {/* ── Due Date Edit Modal ────────────────────────────────────────── */}
      {editDateTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setEditDateTarget(null); }}
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Set Pay By Date</h3>
              <button onClick={() => setEditDateTarget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              For debt to <strong>{editDateTarget.creditor_name}</strong>. Clear date to remove due date.
            </p>
            <form onSubmit={handleSaveDueDate} className="space-y-4">
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewDueDate('')}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Clear Date
                </button>
                <button
                  type="submit"
                  disabled={editDateLoading}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer disabled:opacity-60"
                >
                  {editDateLoading ? 'Saving…' : 'Save Date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
