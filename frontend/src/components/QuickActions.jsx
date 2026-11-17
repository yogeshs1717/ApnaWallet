/**
 * QuickActions.jsx
 * Prompt 05 — Milestone 3, 6, 10: Wire Lend and Credit quick actions
 */
import React, { useEffect, useState } from 'react';
import { PlusCircle, ArrowDownRight, HandCoins, CreditCard, ArrowLeftRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AddCashModal from './transactions/AddCashModal';
import ExpenseModal from './transactions/ExpenseModal';
import TransferModal from './transactions/TransferModal';
import LendModal from './transactions/LendModal';
import CreditModal from './transactions/CreditModal';

export default function QuickActions({ expenseOpenSignal, onTransactionSuccess }) {
  const { selectedAccount, refreshUserData, isAuthenticated, setAuthView } = useAuth();
  const [activeModal, setActiveModal] = useState(null); // 'add-cash' | 'expense' | 'transfer' | 'lend' | 'credit' | null

  useEffect(() => {
    if (expenseOpenSignal > 0 && isAuthenticated) {
      setActiveModal('expense');
    }
  }, [expenseOpenSignal, isAuthenticated]);

  const actions = [
    {
      id: 'add-cash',
      label: 'Add Cash',
      icon: PlusCircle,
      bgColor: 'bg-orange-50 text-orange-600 border-orange-100',
      live: true,
    },
    {
      id: 'expense',
      label: 'Expense',
      icon: ArrowDownRight,
      bgColor: 'bg-rose-50 text-rose-600 border-rose-100',
      live: true,
    },
    {
      id: 'transfer',
      label: 'Transfer',
      icon: ArrowLeftRight,
      bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      live: true,
    },
    {
      id: 'lend',
      label: 'Lend',
      icon: HandCoins,
      bgColor: 'bg-amber-50 text-amber-700 border-amber-100',
      live: true, // PROMPT 05 LIVE
    },
    {
      id: 'credit',
      label: 'Credit',
      icon: CreditCard,
      bgColor: 'bg-blue-50 text-blue-600 border-blue-100',
      live: true, // PROMPT 05 LIVE
    },
  ];

  function handleClick(action) {
    if (!action.live) return;
    if (!isAuthenticated) {
      setAuthView('login');
      return;
    }
    setActiveModal(action.id);
  }

  // Called when a modal reports success; refreshes live balances in AuthContext
  async function handleSuccess(updatedAccount, _record) {
    await refreshUserData();
    setActiveModal(null);
    if (onTransactionSuccess) onTransactionSuccess();
  }

  return (
    <>
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Quick Actions</h3>
          <span className="text-xs text-slate-400">Tap to record transaction</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {actions.map((act) => {
            const Icon = act.icon;
            const isComingSoon = !act.live;
            return (
              <button
                key={act.id}
                onClick={() => handleClick(act)}
                disabled={isComingSoon}
                title={isComingSoon ? `Coming in Prompt ${act.prompt}` : act.label}
                className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-100 transition-all group text-center
                  ${isComingSoon
                    ? 'opacity-50 cursor-not-allowed bg-slate-50/30'
                    : 'hover:border-amber-300 hover:shadow-md cursor-pointer bg-slate-50/50 hover:bg-white'
                  }`}
              >
                <div className={`w-11 h-11 rounded-2xl ${act.bgColor} flex items-center justify-center mb-2.5 shadow-xs ${!isComingSoon ? 'transition-transform group-hover:scale-110' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-semibold text-slate-800 ${!isComingSoon ? 'group-hover:text-amber-800' : ''}`}>
                  {act.label}
                </span>
                {isComingSoon && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-slate-200 text-slate-500 rounded px-1 py-0.5 leading-none">
                    P{act.prompt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {activeModal === 'add-cash' && selectedAccount && (
        <AddCashModal
          accountId={selectedAccount.id}
          onSuccess={handleSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'expense' && selectedAccount && (
        <ExpenseModal
          accountId={selectedAccount.id}
          onSuccess={handleSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'transfer' && selectedAccount && (
        <TransferModal
          accountId={selectedAccount.id}
          cashBalance={selectedAccount.cash_balance}
          bankBalance={selectedAccount.bank_balance}
          onSuccess={handleSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'lend' && selectedAccount && (
        <LendModal
          accountId={selectedAccount.id}
          onSuccess={handleSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'credit' && selectedAccount && (
        <CreditModal
          accountId={selectedAccount.id}
          onSuccess={handleSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}
