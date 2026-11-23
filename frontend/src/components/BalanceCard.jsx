import React from 'react';
import WalletMascot from './WalletMascot';
import { 
  Plus, 
  Minus, 
  Wallet, 
  Landmark, 
  HandCoins, 
  CreditCard, 
  ArrowUpRight
} from 'lucide-react';

export default function BalanceCard({
  totalBalance = 0,
  cashBalance = 0,
  bankBalance = 0,
  lentBalance = 0,
  creditBalance = 0,
  currency = '₹',
  onNavigateTab,
  onAddCash,
  onExpense
}) {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(val || 0));
  };

  return (
    <div className="space-y-4">
      {/* Container with relative mascot peeking over the top */}
      <div className="relative pt-8 sm:pt-10">
        {/* Playful Orange Mascot peeking from top-center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-0">
          <WalletMascot className="w-24 h-16 sm:w-28 sm:h-20" />
        </div>

        {/* Deep Plum Hero Card */}
        <div className="relative z-10 overflow-hidden rounded-[32px] bg-[#331B24] text-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(51,27,36,0.22)] border border-[#462532]">
          {/* Subtle decorative radial glow */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#D2B4ED]/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-[#C5F52A]/10 blur-2xl pointer-events-none" />

          {/* Top Label & Currency Pill */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#C5F52A] animate-pulse" />
              <span className="text-xs font-bold tracking-wide uppercase text-[#D2B4ED]/90">
                Total Available Balance
              </span>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 text-[#F5EFE3] border border-white/10 backdrop-blur-sm">
              INR (₹)
            </span>
          </div>

          {/* Primary Amount Display */}
          <div className="mt-4 sm:mt-5 text-center sm:text-left">
            <div className="flex items-baseline justify-center sm:justify-start space-x-1">
              <span className="text-3xl sm:text-4xl font-semibold text-[#D2B4ED]">{currency}</span>
              <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#FAF6F0]">
                {formatCurrency(totalBalance)}
              </span>
            </div>

            {/* Cash & Bank Split Pills */}
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/90 border border-white/5">
                <Wallet className="w-3.5 h-3.5 text-[#FF902B]" />
                <span className="font-medium text-white/70">Cash:</span>
                <span className="font-bold">{currency}{formatCurrency(cashBalance)}</span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/90 border border-white/5">
                <Landmark className="w-3.5 h-3.5 text-[#C5F52A]" />
                <span className="font-medium text-white/70">Bank:</span>
                <span className="font-bold">{currency}{formatCurrency(bankBalance)}</span>
              </div>
            </div>
          </div>

          {/* Primary Pill Action Buttons inside Hero Card */}
          <div className="mt-6 sm:mt-7 grid grid-cols-2 gap-3 pt-5 border-t border-white/10">
            <button
              type="button"
              onClick={onAddCash}
              className="flex items-center justify-center space-x-2 py-3.5 px-4 rounded-full bg-white text-[#24151B] font-bold text-sm hover:bg-[#FAF6F0] active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#FF902B]" />
              <span>Add Cash</span>
            </button>
            <button
              type="button"
              onClick={onExpense}
              className="flex items-center justify-center space-x-2 py-3.5 px-4 rounded-full bg-[#C5F52A] text-[#1C1014] font-extrabold text-sm hover:bg-[#B4E81E] active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <Minus className="w-4 h-4 text-[#1C1014]" />
              <span>Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid: Money Lent (Receivables) & Credit Outstanding (Liabilities) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Money Lent Card (Warm Lavender / Amber) */}
        <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex flex-col justify-between hover:shadow-md transition-all group">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#FFF0E2] text-[#FF902B] flex items-center justify-center">
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Money Lent
                  </h4>
                  <p className="text-[11px] text-stone-400">Receivables (Assets)</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#FFF0E2] text-[#FF902B]">
                ASSET
              </span>
            </div>

            <div className="mt-4 flex items-baseline space-x-1">
              <span className="text-lg font-medium text-stone-400">{currency}</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#24151B]">
                {formatCurrency(lentBalance)}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Owed to you by friends &amp; borrowers
            </p>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('lending')}
              className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#FF902B] hover:text-[#E0791B] transition-colors cursor-pointer group-hover:translate-x-0.5"
            >
              <span>Manage Borrowers</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Credit Outstanding Card (Soft Plum / Rose) */}
        <div className="rounded-[28px] bg-white p-5 sm:p-6 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex flex-col justify-between hover:shadow-md transition-all group">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#F2EAF9] text-[#7E45A8] flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Credit Used
                  </h4>
                  <p className="text-[11px] text-stone-400">Debts &amp; Payables</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#F2EAF9] text-[#7E45A8]">
                LIABILITY
              </span>
            </div>

            <div className="mt-4 flex items-baseline space-x-1">
              <span className="text-lg font-medium text-stone-400">{currency}</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#24151B]">
                {formatCurrency(creditBalance)}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Outstanding debt owed to creditors
            </p>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('credit')}
              className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#7E45A8] hover:text-[#67348C] transition-colors cursor-pointer group-hover:translate-x-0.5"
            >
              <span>Manage Creditors</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
