/**
 * RecentTransactions.jsx
 * Redesigned for Premium Fintech UI inspired by Taxmate reference
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Receipt, Clock, Plus, Minus, ArrowLeftRight,
  Wallet, Landmark, Loader2, RefreshCw, HandCoins, CreditCard, CheckCircle,
  ArrowRight
} from 'lucide-react';
import { getTransactions } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Pastel circular category badge colors matching the reference
const TYPE_CONFIG = {
  ADD_CASH: { 
    label: 'Cash In',     
    bgCircle: 'bg-[#E4F5EE] text-[#075743]', 
    Icon: Plus,           
    sign: '+', 
    amtColor: 'text-[#075743]',
    pillLabel: 'Deposit'
  },
  EXPENSE: { 
    label: 'Expense',     
    bgCircle: 'bg-[#F2EAF9] text-[#7E45A8]', 
    Icon: Minus,          
    sign: '-', 
    amtColor: 'text-[#24151B]',
    pillLabel: 'Check'
  },
  TRANSFER: { 
    label: 'Transfer',    
    bgCircle: 'bg-[#E4F5EE] text-[#075743]', 
    Icon: ArrowLeftRight, 
    sign: '',  
    amtColor: 'text-[#075743]',
    pillLabel: 'Move'
  },
  LENDING: { 
    label: 'Money Lent',  
    bgCircle: 'bg-[#FFF0E2] text-[#FF902B]', 
    Icon: HandCoins,      
    sign: '-', 
    amtColor: 'text-[#FF902B]',
    pillLabel: 'Lend'
  },
  LENDING_REPAYMENT: { 
    label: 'Lend Repaid', 
    bgCircle: 'bg-[#E4F5EE] text-[#075743]', 
    Icon: CheckCircle,    
    sign: '+', 
    amtColor: 'text-[#075743]',
    pillLabel: 'Repaid'
  },
  CREDIT: { 
    label: 'Borrowed',    
    bgCircle: 'bg-[#FDE8EC] text-[#E11D48]', 
    Icon: CreditCard,     
    sign: '+', 
    amtColor: 'text-[#E11D48]',
    pillLabel: 'Credit'
  },
  CREDIT_REPAYMENT: { 
    label: 'Debt Repaid', 
    bgCircle: 'bg-[#E4F5EE] text-[#075743]', 
    Icon: CheckCircle,    
    sign: '-', 
    amtColor: 'text-[#075743]',
    pillLabel: 'Paid'
  },
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

export default function RecentTransactions({ refreshTrigger, onNavigateTab }) {
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecent = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const data = await getTransactions({ limit: 5, offset: 0 });
      setTransactions(Array.isArray(data) ? data.slice(0, 5) : (data.results || []).slice(0, 5));
    } catch {
      setError('Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent, refreshTrigger]);

  return (
    <div className="bg-white rounded-[28px] p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-4">
      {/* Header with See All */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-[#24151B]">
            Recent Activity
          </h3>
          <p className="text-[11px] text-stone-400">Latest wallet transactions</p>
        </div>

        <div className="flex items-center space-x-2">
          {isAuthenticated && onNavigateTab && (
            <button
              onClick={() => onNavigateTab('activity')}
              className="text-xs font-bold text-[#FF902B] hover:text-[#E0791B] px-3 py-1.5 rounded-full hover:bg-[#FFF0E2] transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>See All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={fetchRecent}
              disabled={loading}
              className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition cursor-pointer disabled:opacity-40"
              title="Refresh transactions"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-8 flex flex-col items-center gap-2 text-stone-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF902B]" />
          <span className="text-xs font-medium">Syncing transactions…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="py-4 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl">{error}</div>
      )}

      {/* Guest / Not authenticated */}
      {!loading && !error && !isAuthenticated && (
        <div className="py-10 px-4 text-center border border-dashed border-stone-200 rounded-[24px]">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#FFF0E2] text-[#FF902B] flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#24151B]">Sign in to view activity</h4>
          <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">
            Your transactions are encrypted and stored in PostgreSQL.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && isAuthenticated && transactions.length === 0 && (
        <div className="py-10 px-4 text-center border border-dashed border-stone-200 rounded-[24px]">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#E4F5EE] text-[#075743] flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#24151B]">No Transactions Yet</h4>
          <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">
            Use the Add Cash or Expense buttons above to get started.
          </p>
        </div>
      )}

      {/* Transaction list matching Taxmate reference rows */}
      {!loading && !error && transactions.length > 0 && (
        <div className="space-y-2.5">
          {transactions.map((tx) => {
            const cfg = TYPE_CONFIG[tx.transaction_type] || TYPE_CONFIG.EXPENSE;
            const Icon = cfg.Icon;
            const BalIcon = BALANCE_ICON[tx.balance_type] || Wallet;
            const amtColor = cfg.amtColor || 'text-[#24151B]';

            return (
              <div
                key={tx.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF6F0] hover:bg-[#F2EBE0] transition-colors ${
                  tx.is_voided ? 'opacity-40 line-through' : ''
                }`}
              >
                {/* Left: Circular icon + info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-11 h-11 rounded-full ${cfg.bgCircle} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#24151B] truncate">
                      {tx.category?.name || tx.note || cfg.label}
                    </p>
                    <div className="flex items-center space-x-1.5 mt-0.5 text-[11px] text-stone-400">
                      <span>{formatDate(tx.transaction_date)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <BalIcon className="w-3 h-3" />
                        <span className="capitalize">{tx.balance_type?.toLowerCase()}</span>
                      </span>
                      {tx.note && tx.category?.name && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline truncate max-w-[140px]">{tx.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Action Pill */}
                <div className="flex items-center space-x-3 shrink-0 ml-3">
                  <span className={`text-sm sm:text-base font-extrabold ${amtColor}`}>
                    {formatAmount(tx.amount, tx.transaction_type)}
                  </span>
                  <span className="hidden sm:inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-white text-stone-600 border border-stone-200/70 shadow-2xs">
                    {cfg.pillLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
