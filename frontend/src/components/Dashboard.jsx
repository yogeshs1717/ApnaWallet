/**
 * Dashboard.jsx
 * Premium Playful Fintech Redesign inspired by Taxmate references
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AccountSelector from './AccountSelector';
import BalanceCard from './BalanceCard';
import QuickActions from './QuickActions';
import RecentTransactions from './RecentTransactions';
import ApiStatus from './ApiStatus';
import { getSavings, getInvestments } from '../api/client';
import { 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Target, 
  TrendingUp, 
  Flame, 
  Coins, 
  PieChart, 
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const money = (val) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(val || 0));

export default function Dashboard({ onNavigateTab, expenseOpenSignal }) {
  const {
    user,
    accounts,
    selectedAccount,
    setSelectedAccount,
    isAuthenticated,
    setAuthView,
  } = useAuth();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [addCashSignal, setAddCashSignal] = useState(0);
  const [internalExpenseSignal, setInternalExpenseSignal] = useState(0);

  // Bento overview summary states (from backend)
  const [savingsSummary, setSavingsSummary] = useState(null);
  const [investmentsSummary, setInvestmentsSummary] = useState(null);

  const cash   = parseFloat(selectedAccount?.cash_balance           || 0);
  const bank   = parseFloat(selectedAccount?.bank_balance           || 0);
  const lent   = parseFloat(selectedAccount?.total_lent_outstanding   || 0);
  const credit = parseFloat(selectedAccount?.total_credit_outstanding || 0);
  const total  = cash + bank;

  // Load savings & investments summary for Bento cards
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    Promise.allSettled([getSavings(), getInvestments()]).then(([sRes, iRes]) => {
      if (!isMounted) return;
      if (sRes.status === 'fulfilled') setSavingsSummary(sRes.value);
      if (iRes.status === 'fulfilled') setInvestmentsSummary(iRes.value);
    });
    return () => { isMounted = false; };
  }, [isAuthenticated, refreshTrigger, selectedAccount?.id]);

  const activeGoal = savingsSummary?.active_goal;
  const totalInvested = investmentsSummary?.total_invested || '0.00';
  const savedWallet = savingsSummary?.saved_wallet_balance || '0.00';

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">

      {/* Guest Mode Callout Banner */}
      {!isAuthenticated && (
        <div className="p-5 rounded-[28px] bg-gradient-to-r from-[#FFF0E2] via-[#FAF6F0] to-[#E4F5EE] border border-[#FF902B]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-full bg-[#FF902B] text-white flex items-center justify-center shadow-xs shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[#24151B]">
                Previewing ApnaWallet in Guest Mode
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Sign in to manage your real balances, transactions, and live PostgreSQL accounts.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setAuthView('login')}
              className="px-4 py-2 rounded-full text-xs font-bold text-[#24151B] bg-white hover:bg-stone-50 border border-stone-200 shadow-2xs cursor-pointer active:scale-95 transition-all"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthView('register')}
              className="px-5 py-2 rounded-full text-xs font-extrabold bg-[#C5F52A] text-[#1C1014] shadow-xs hover:bg-[#B4E81E] active:scale-95 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header: Greeting, User Name, Stats Pill & Account Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#24151B]">
              {getGreeting()}, {isAuthenticated ? (user?.full_name?.split(' ')[0] || 'Friend') : 'Friend'}
            </h2>
            <span className="text-lg animate-bounce">👋</span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5 font-medium">
            {isAuthenticated
              ? `${selectedAccount?.name || 'Personal'} Account • ${user?.email}`
              : 'Take control of your money, your rules.'}
          </p>
        </div>

        {/* Header Right: Stats Pill (Coin/Streak inspired by reference) & Account Selector */}
        <div className="flex items-center space-x-2.5">
          {isAuthenticated && (
            <div className="hidden min-[480px]:flex items-center space-x-3 px-3.5 py-1.5 rounded-full bg-white border border-stone-200/80 shadow-2xs text-xs font-bold text-[#24151B]">
              <div className="flex items-center space-x-1 text-[#D97706]">
                <Coins className="w-3.5 h-3.5" />
                <span>₹{money(total)}</span>
              </div>
              <div className="w-px h-3.5 bg-stone-200" />
              <div className="flex items-center space-x-1 text-[#FF5E2C]">
                <Flame className="w-3.5 h-3.5" />
                <span>Active</span>
              </div>
            </div>
          )}

          <AccountSelector
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={setSelectedAccount}
          />
        </div>
      </div>

      {/* Silent Backend Health Monitor */}
      <ApiStatus />

      {/* Primary Hero Balance Card with Mascot */}
      <BalanceCard
        totalBalance={total}
        cashBalance={cash}
        bankBalance={bank}
        lentBalance={lent}
        creditBalance={credit}
        currency="₹"
        onNavigateTab={onNavigateTab}
        onAddCash={() => setAddCashSignal((n) => n + 1)}
        onExpense={() => setInternalExpenseSignal((n) => n + 1)}
      />

      {/* Quick Actions Bar */}
      <QuickActions 
        expenseOpenSignal={expenseOpenSignal || internalExpenseSignal} 
        addCashOpenSignal={addCashSignal}
        onTransactionSuccess={() => setRefreshTrigger((n) => n + 1)} 
      />

      {/* Bento Grid: Financial Overview (Savings, Investments, Budgets) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stone-500 tracking-wider uppercase">
            Financial Bento Overview
          </h3>
          <span className="text-[11px] text-stone-400">Synced with PostgreSQL</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Active Savings Goal (Soft Lavender / Mint) */}
          <div 
            onClick={() => onNavigateTab?.('portfolio')}
            className="rounded-[28px] bg-white p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-[#F2EAF9] text-[#7E45A8] flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                {activeGoal && (
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#E4F5EE] text-[#075743]">
                    {activeGoal.progress_percentage}%
                  </span>
                )}
              </div>

              <div className="mt-4">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  Active Savings Goal
                </span>
                <h4 className="text-base sm:text-lg font-extrabold text-[#24151B] truncate mt-0.5">
                  {activeGoal?.name || 'No active goal'}
                </h4>
              </div>

              {activeGoal ? (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#075743]">₹{money(activeGoal.saved_amount)}</span>
                    <span className="text-stone-400">Target ₹{money(activeGoal.target_amount)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-[#C5F52A] transition-all duration-500"
                      style={{ width: `${Math.min(100, activeGoal.progress_percentage || 0)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-stone-400">
                  Set a goal to reserve funds for vacations, emergencies or assets.
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#7E45A8] group-hover:translate-x-0.5 transition-transform">
              <span>View Savings Wallet (₹{money(savedWallet)})</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Investment Portfolio (Forest Green / Mint) */}
          <div 
            onClick={() => onNavigateTab?.('portfolio')}
            className="rounded-[28px] bg-white p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-[#E4F5EE] text-[#075743] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#FFF0E2] text-[#FF902B]">
                  ASSETS
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  Investments
                </span>
                <div className="flex items-baseline space-x-1 mt-0.5">
                  <span className="text-lg font-medium text-stone-400">₹</span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#24151B]">
                    {money(totalInvested)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-stone-400">
                Gold, stocks, crypto &amp; mutual funds tracked outside cash.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#075743] group-hover:translate-x-0.5 transition-transform">
              <span>Manage Portfolio</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Budgets & Recurring (Deep Plum / Lime Highlight) */}
          <div 
            onClick={() => onNavigateTab?.('budgets')}
            className="rounded-[28px] bg-[#331B24] text-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(51,27,36,0.12)] border border-[#462532] hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-white/10 text-[#C5F52A] flex items-center justify-center">
                  <PieChart className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#C5F52A] text-[#1C1014]">
                  SMART
                </span>
              </div>

              <div className="mt-4">
                <span className="text-[10px] font-bold text-[#D2B4ED] uppercase tracking-wider">
                  Monthly Budgets
                </span>
                <h4 className="text-base sm:text-lg font-extrabold text-[#FAF6F0] mt-0.5">
                  Spending Limits &amp; Bills
                </h4>
              </div>
              <p className="mt-2 text-xs text-white/70">
                Set category budgets, automated subscriptions and avoid overspending.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-extrabold text-[#C5F52A] group-hover:translate-x-0.5 transition-transform">
              <span>Open Budgets &amp; Subscriptions</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity List */}
      <RecentTransactions 
        refreshTrigger={refreshTrigger} 
        onNavigateTab={onNavigateTab} 
      />
    </div>
  );
}
