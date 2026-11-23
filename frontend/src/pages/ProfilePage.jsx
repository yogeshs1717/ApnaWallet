/**
 * ProfilePage.jsx
 * Inspired directly by the 2nd phone screen in the Taxmate reference
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSavings, getInvestments } from '../api/client';
import { 
  Lightbulb, 
  CheckCircle2, 
  ArrowRight, 
  HandCoins, 
  CreditCard, 
  PieChart, 
  Briefcase, 
  BarChart3, 
  ShieldCheck, 
  LogOut, 
  Sparkles,
  ChevronRight,
  User as UserIcon,
  Flame,
  Wallet
} from 'lucide-react';

const money = (val) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(val || 0));

export default function ProfilePage({ onNavigateTab }) {
  const { user, selectedAccount, logout, isAuthenticated, setAuthView } = useAuth();
  const [savings, setSavings] = useState(null);
  const [investments, setInvestments] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.allSettled([getSavings(), getInvestments()]).then(([sRes, iRes]) => {
      if (sRes.status === 'fulfilled') setSavings(sRes.value);
      if (iRes.status === 'fulfilled') setInvestments(iRes.value);
    });
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-[32px] bg-white p-8 sm:p-12 text-center border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] max-w-md mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FFF0E2] text-[#FF902B] mx-auto flex items-center justify-center">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#24151B]">Sign in to your Profile</h2>
        <p className="text-xs text-stone-400">
          Access your personal financial health check, connected accounts and security preferences.
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

  const cash = parseFloat(selectedAccount?.cash_balance || 0);
  const bank = parseFloat(selectedAccount?.bank_balance || 0);
  const total = cash + bank;
  const savedWallet = parseFloat(savings?.saved_wallet_balance || 0);
  const activeGoal = savings?.active_goal;
  const lent = parseFloat(selectedAccount?.total_lent_outstanding || 0);
  const credit = parseFloat(selectedAccount?.total_credit_outstanding || 0);

  const initial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  const menuSections = [
    {
      id: 'lending',
      label: 'Money Lent (Receivables)',
      desc: `₹${money(lent)} owed by borrowers`,
      icon: HandCoins,
      color: 'bg-[#FFF0E2] text-[#FF902B]',
    },
    {
      id: 'credit',
      label: 'Credit Outstanding (Liabilities)',
      desc: `₹${money(credit)} owed to creditors`,
      icon: CreditCard,
      color: 'bg-[#F2EAF9] text-[#7E45A8]',
    },
    {
      id: 'budgets',
      label: 'Monthly Budgets & Subscriptions',
      desc: 'Category spending caps & recurring bills',
      icon: PieChart,
      color: 'bg-[#E4F5EE] text-[#075743]',
    },
    {
      id: 'portfolio',
      label: 'Portfolio & Saved Assets',
      desc: `₹${money(savedWallet)} saved in reserve`,
      icon: Briefcase,
      color: 'bg-[#FEF9C3] text-[#D97706]',
    },
    {
      id: 'reports',
      label: 'Analytics & Monthly Reports',
      desc: 'Spending trends, PDF and CSV exports',
      icon: BarChart3,
      color: 'bg-[#FDE8EC] text-[#E11D48]',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Profile Header with Reference Wavy Flower Badge */}
      <div className="text-center pt-2">
        <div className="relative inline-block">
          {/* Lavender Floral / Cloud decorative badge around avatar */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#D2B4ED] p-2 flex items-center justify-center mx-auto shadow-md">
            <div className="w-full h-full rounded-full bg-[#331B24] text-white flex items-center justify-center text-3xl sm:text-4xl font-extrabold shadow-inner">
              {initial}
            </div>
          </div>
          <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#C5F52A] border-2 border-white flex items-center justify-center text-[#1C1014] text-xs font-black shadow-xs">
            ✓
          </span>
        </div>

        <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#24151B]">
          {user?.full_name || 'My Account'}
        </h2>
        <p className="text-xs font-semibold text-stone-400 mt-0.5">
          {selectedAccount?.name || 'Personal'} Account • {user?.email}
        </p>
      </div>

      {/* Bento Grid (Matching 2nd screen from reference) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Top-Left Card: On Track status */}
        <div className="rounded-[28px] bg-white p-5 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex flex-col justify-between">
          <div className="w-10 h-10 rounded-full bg-[#F2EAF9] text-[#7E45A8] flex items-center justify-center">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-extrabold text-[#24151B]">On Track</h4>
            <p className="text-[11px] text-stone-400">Financial status healthy</p>
          </div>
        </div>

        {/* Top-Right Card: Deep Plum Checklist / Active Goal */}
        <div 
          onClick={() => onNavigateTab?.('portfolio')}
          className="rounded-[28px] bg-[#331B24] text-white p-5 shadow-[0_8px_30px_rgba(51,27,36,0.12)] border border-[#462532] flex flex-col justify-between cursor-pointer active:scale-95 transition-all"
        >
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[#D2B4ED] uppercase tracking-wider">
                Goal Checklist
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#C5F52A]">
                {activeGoal ? 'In Progress' : 'Ready'}
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-[#FAF6F0] mt-2 line-clamp-1">
              {activeGoal?.name || 'Create New Goal'}
            </h4>
          </div>
          <button
            type="button"
            className="mt-4 w-full py-2 px-3 rounded-full bg-[#C5F52A] text-[#1C1014] font-extrabold text-xs shadow-xs text-center"
          >
            {activeGoal ? 'Save / Withdraw' : 'Set Goal'}
          </button>
        </div>

        {/* Bottom-Left Card: Saved */}
        <div className="rounded-[28px] bg-white p-5 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Total Saved
          </span>
          <p className="text-xs text-stone-400">In Reserve Wallet</p>
          <div className="mt-3 text-xl sm:text-2xl font-extrabold text-[#075743]">
            ₹{money(savedWallet)}
          </div>
        </div>

        {/* Bottom-Right Card: Spendable Available Cash */}
        <div className="rounded-[28px] bg-white p-5 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Available
          </span>
          <p className="text-xs text-stone-400">Cash + Bank Spendable</p>
          <div className="mt-3 text-xl sm:text-2xl font-extrabold text-[#FF902B]">
            ₹{money(total)}
          </div>
        </div>
      </div>

      {/* Module Navigation List */}
      <div className="rounded-[28px] bg-white p-4 sm:p-5 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-1.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 px-3 pt-1 pb-2">
          Fintech Modules
        </h4>

        {menuSections.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigateTab?.(item.id)}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#FAF6F0] active:scale-[0.99] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-[#24151B]">
                    {item.label}
                  </h5>
                  <p className="text-[11px] text-stone-400">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300" />
            </button>
          );
        })}
      </div>

      {/* Security & Sign Out Section */}
      <div className="rounded-[28px] bg-white p-4 sm:p-5 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex items-center justify-between">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-10 h-10 rounded-full bg-[#E4F5EE] text-[#075743] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs sm:text-sm font-bold text-[#24151B]">
              Neon PostgreSQL Secured
            </h5>
            <p className="text-[11px] text-stone-400">
              Encrypted tokens &amp; transactional integrity
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold active:scale-95 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
