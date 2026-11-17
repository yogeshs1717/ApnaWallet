/**
 * Dashboard.jsx
 * Prompt 04 — Milestone 8: Connected to live backend data
 *
 * - Balances are read from selectedAccount (fetched from /api/accounts/ on login)
 * - After any financial operation, refreshUserData() is called in QuickActions → 
 *   AuthContext re-fetches accounts → new balances flow here via props
 * - RecentTransactions receives a refreshTrigger so it re-fetches after each op
 */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AccountSelector from './AccountSelector';
import BalanceCard from './BalanceCard';
import QuickActions from './QuickActions';
import RecentTransactions from './RecentTransactions';
import ApiStatus from './ApiStatus';
import { Sparkles, Shield, ArrowRight } from 'lucide-react';

export default function Dashboard({ onNavigateTab }) {
  const {
    user,
    accounts,
    selectedAccount,
    setSelectedAccount,
    isAuthenticated,
    setAuthView,
  } = useAuth();

  // Incremented after any successful financial operation to trigger RecentTransactions refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // QuickActions calls refreshUserData internally; we also bump the trigger
  // by wrapping setSelectedAccount so RecentTransactions sees the change
  const cash   = parseFloat(selectedAccount?.cash_balance           || 0);
  const bank   = parseFloat(selectedAccount?.bank_balance           || 0);
  const lent   = parseFloat(selectedAccount?.total_lent_outstanding   || 0);
  const credit = parseFloat(selectedAccount?.total_credit_outstanding || 0);
  const total  = cash + bank;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Guest Mode Callout Banner */}
      {!isAuthenticated && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-xs shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                You are previewing ApnaWallet in Guest Mode
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Sign in or register to get your personal financial accounts and live PostgreSQL sync.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setAuthView('login')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthView('register')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs hover:from-orange-600 hover:to-amber-600 flex items-center space-x-1 cursor-pointer"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Greeting & Account Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-amber-100/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {isAuthenticated ? `Welcome, ${user?.full_name}` : 'Financial Overview'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAuthenticated
              ? `Account: ${selectedAccount?.name || 'Personal'} (${user?.email})`
              : 'Welcome back to your personal financial hub.'}
          </p>
        </div>

        <AccountSelector
          accounts={accounts}
          selectedAccount={selectedAccount}
          onSelectAccount={setSelectedAccount}
        />
      </div>

      {/* Backend Live Health Probe */}
      <ApiStatus />

      {/* Live Balance Card — real values from Neon via selectedAccount */}
      <BalanceCard
        totalBalance={total}
        cashBalance={cash}
        bankBalance={bank}
        lentBalance={lent}
        creditBalance={credit}
        currency="₹"
        onNavigateTab={onNavigateTab}
      />

      {/* Quick Actions — open modals, call refreshUserData on success */}
      <QuickActions onTransactionSuccess={() => setRefreshTrigger((n) => n + 1)} />

      {/* Recent Transactions — re-fetches when refreshTrigger changes */}
      <RecentTransactions refreshTrigger={refreshTrigger} />
    </div>
  );
}
