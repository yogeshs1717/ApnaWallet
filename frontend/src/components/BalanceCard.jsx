import React from 'react';
import logoImg from '../assets/logo.jpg';
import { IndianRupee, Landmark, Banknote, TrendingUp, Sparkles, HandCoins, CreditCard, ArrowRight } from 'lucide-react';

export default function BalanceCard({
  totalBalance = 0,
  cashBalance = 0,
  bankBalance = 0,
  lentBalance = 0,
  creditBalance = 0,
  currency = '₹',
  onNavigateTab
}) {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(val || 0));
  };

  return (
    <div className="space-y-4">
      {/* Primary Hero Card: Total Available Balance */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-amber-600 p-6 text-white shadow-lg shadow-orange-500/15">
        {/* Decorative background glow */}
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

        {/* Branded Watermark in Hero Card */}
        <div className="hidden sm:block absolute right-6 bottom-4 w-24 h-24 rounded-2xl overflow-hidden opacity-20 pointer-events-none border border-white/20 shadow-md">
          <img src={logoImg} alt="ApnaWallet emblem" className="w-full h-full object-cover" />
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-amber-100" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">
                Total Available Balance
              </p>
            </div>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white">
              INR (₹)
            </span>
          </div>

          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-light text-amber-100">{currency}</span>
              <span className="text-4xl md:text-5xl font-extrabold tracking-tight">
                {formatCurrency(totalBalance)}
              </span>
            </div>
            <p className="text-xs text-amber-100/90 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Available Balance = Cash + Bank (Spendable Funds)
            </p>
          </div>
        </div>
      </div>

      {/* Sub-balances: Cash vs Bank Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cash Balance Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cash Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-lg font-light text-slate-400">{currency}</span>
            <span className="text-2xl font-bold text-slate-800">
              {formatCurrency(cashBalance)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Physical cash on hand</p>
        </div>

        {/* Bank Balance Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Bank Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-lg font-light text-slate-400">{currency}</span>
            <span className="text-2xl font-bold text-slate-800">
              {formatCurrency(bankBalance)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Savings &amp; checking accounts</p>
        </div>
      </div>

      {/* Prompt 05 Milestone 10: Money Lent (Receivables) & Credit Outstanding (Liabilities) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Money Lent Card */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <HandCoins className="w-4 h-4 text-amber-600" />
                Money Lent (Receivables)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Asset
              </span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-light text-amber-600">{currency}</span>
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrency(lentBalance)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Money owed to you by others (not spendable cash)
            </p>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('lending')}
              className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 hover:text-amber-800 group-hover:translate-x-0.5 transition-all cursor-pointer"
            >
              <span>Manage Borrowers &amp; Repayments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Credit Outstanding Card */}
        <div className="bg-white rounded-2xl p-5 border border-rose-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-rose-600" />
                Credit Outstanding (Liabilities)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Liability
              </span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-light text-rose-500">{currency}</span>
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrency(creditBalance)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Debts you owe to creditors &amp; stores
            </p>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('credit')}
              className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-700 hover:text-rose-800 group-hover:translate-x-0.5 transition-all cursor-pointer"
            >
              <span>Manage Creditors &amp; Repay Debt</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
