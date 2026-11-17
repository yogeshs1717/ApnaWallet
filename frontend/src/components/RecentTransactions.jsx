/**
 * RecentTransactions.jsx
 * Prompt 04 — Milestone 7/8: Real transactions from API, top-5 view
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Receipt, Clock, PlusCircle, ArrowDownRight, ArrowLeftRight,
  Wallet, Landmark, Loader2, RefreshCw, HandCoins, CreditCard, CheckCircle
} from 'lucide-react';
import { getTransactions } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  ADD_CASH:          { label: 'Cash In',     color: 'bg-green-100 text-green-700',  Icon: PlusCircle,     sign: '+', amtColor: 'text-green-600' },
  EXPENSE:           { label: 'Expense',     color: 'bg-rose-100 text-rose-700',    Icon: ArrowDownRight, sign: '-', amtColor: 'text-rose-600' },
  TRANSFER:          { label: 'Transfer',    color: 'bg-blue-100 text-blue-700',    Icon: ArrowLeftRight, sign: '',  amtColor: 'text-blue-600' },
  LENDING:           { label: 'Money Lent',  color: 'bg-amber-100 text-amber-800',  Icon: HandCoins,      sign: '-', amtColor: 'text-amber-700' },
  LENDING_REPAYMENT: { label: 'Lend Repaid', color: 'bg-emerald-100 text-emerald-800', Icon: CheckCircle, sign: '+', amtColor: 'text-emerald-600' },
  CREDIT:            { label: 'Borrowed',    color: 'bg-indigo-100 text-indigo-800', Icon: CreditCard,    sign: '+', amtColor: 'text-indigo-600' },
  CREDIT_REPAYMENT:  { label: 'Debt Repaid', color: 'bg-purple-100 text-purple-800', Icon: CheckCircle, sign: '-', amtColor: 'text-purple-700' },
};

const BALANCE_ICON = { CASH: Wallet, BANK: Landmark };

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatAmount(amount, type) {
  const cfg = TYPE_CONFIG[type] || {};
  const num = parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  return `${cfg.sign || ''}₹${num}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RecentTransactions({ refreshTrigger }) {
  const { isAuthenticated, selectedAccount } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecent = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const data = await getTransactions({ limit: 5, offset: 0 });
      // API returns { results: [...], count, ... } OR plain array
      setTransactions(Array.isArray(data) ? data.slice(0, 5) : (data.results || []).slice(0, 5));
    } catch (err) {
      setError('Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent, refreshTrigger]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
            <Receipt className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Recent Transactions</h3>
        </div>
        {isAuthenticated && (
          <button
            onClick={fetchRecent}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs">Loading transactions…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="py-6 text-center text-xs text-red-500">{error}</div>
      )}

      {/* Guest / Not authenticated */}
      {!loading && !error && !isAuthenticated && (
        <div className="py-10 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">Sign in to see transactions</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Your financial activity is private and stored securely on Neon PostgreSQL.
          </p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && isAuthenticated && transactions.length === 0 && (
        <div className="py-10 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">No Transactions Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Use Quick Actions above to add cash, record an expense, or transfer funds.
          </p>
        </div>
      )}

      {/* Transaction list */}
      {!loading && !error && transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const cfg = TYPE_CONFIG[tx.transaction_type] || TYPE_CONFIG.EXPENSE;
            const Icon = cfg.Icon;
            const BalIcon = BALANCE_ICON[tx.balance_type] || Wallet;
            const amtColor = cfg.amtColor || 'text-slate-800';

            return (
              <div
                key={tx.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50/60 transition ${tx.is_voided ? 'opacity-40 line-through' : ''}`}
              >
                {/* Type icon */}
                <div className={`w-9 h-9 rounded-xl ${cfg.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Middle: category + note */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {tx.category?.name || cfg.label}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{tx.note}</p>
                </div>

                {/* Right: amount + date + balance type */}
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${amtColor}`}>
                    {formatAmount(tx.amount, tx.transaction_type)}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <BalIcon className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400">{formatDate(tx.transaction_date)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
