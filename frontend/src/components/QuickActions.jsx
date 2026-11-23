/**
 * QuickActions.jsx
 * Redesigned for Premium Fintech UI with playful pastel rounded icons
 */
import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Minus, 
  ArrowLeftRight, 
  HandCoins, 
  CreditCard 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AddCashModal from './transactions/AddCashModal';
import ExpenseModal from './transactions/ExpenseModal';
import TransferModal from './transactions/TransferModal';
import LendModal from './transactions/LendModal';
import CreditModal from './transactions/CreditModal';

export default function QuickActions({ expenseOpenSignal, addCashOpenSignal, onTransactionSuccess }) {
  const { selectedAccount, refreshUserData, updateAccountLocally, isAuthenticated, setAuthView } = useAuth();
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    if (expenseOpenSignal > 0 && isAuthenticated) {
      setActiveModal('expense');
    }
  }, [expenseOpenSignal, isAuthenticated]);

  useEffect(() => {
    if (addCashOpenSignal > 0 && isAuthenticated) {
      setActiveModal('add-cash');
    }
  }, [addCashOpenSignal, isAuthenticated]);

  const actions = [
    {
      id: 'add-cash',
      label: 'Add Cash',
      icon: Plus,
      bgCircle: 'bg-[#FFF0E2] text-[#FF902B]',
    },
    {
      id: 'expense',
      label: 'Expense',
      icon: Minus,
      bgCircle: 'bg-[#FDE8EC] text-[#E11D48]',
    },
    {
      id: 'transfer',
      label: 'Transfer',
      icon: ArrowLeftRight,
      bgCircle: 'bg-[#E4F5EE] text-[#075743]',
    },
    {
      id: 'lend',
      label: 'Lend',
      icon: HandCoins,
      bgCircle: 'bg-[#FEF9C3] text-[#D97706]',
    },
    {
      id: 'credit',
      label: 'Credit',
      icon: CreditCard,
      bgCircle: 'bg-[#F2EAF9] text-[#7E45A8]',
    },
  ];

  function handleClick(action) {
    if (!isAuthenticated) {
      setAuthView('login');
      return;
    }
    setActiveModal(action.id);
  }

  function handleSuccess(updatedAccount, _record) {
    if (updatedAccount && updateAccountLocally) {
      updateAccountLocally(updatedAccount);
    }
    setActiveModal(null);
    if (onTransactionSuccess) onTransactionSuccess();
    refreshUserData({ preserveUser: true, onlyAccounts: true });
  }

  return (
    <>
      <div className="bg-white rounded-[28px] p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stone-500 tracking-wider uppercase">
            Quick Actions
          </h3>
          <span className="text-[11px] text-stone-400">Tap to record transaction</span>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => handleClick(act)}
                className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl hover:bg-[#FAF6F0] active:scale-95 transition-all group cursor-pointer"
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${act.bgCircle} flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 duration-200 mb-2`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-[#24151B] text-center line-clamp-1">
                  {act.label}
                </span>
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
          cashBalance={selectedAccount.cash_balance}
          bankBalance={selectedAccount.bank_balance}
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
          cashBalance={selectedAccount.cash_balance}
          bankBalance={selectedAccount.bank_balance}
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
