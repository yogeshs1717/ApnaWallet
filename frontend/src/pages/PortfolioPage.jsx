import React, { useEffect, useState } from 'react';
import { Target, TrendingUp, Plus, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Trash2, Loader2, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  actOnSavingsGoal,
  createInvestment,
  createSavingsGoal,
  deleteInvestment,
  depositSavings,
  getInvestments,
  getSavings,
  sellInvestment,
  withdrawSavings,
} from '../api/client';

const money = (value) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0));

const todayStr = () => new Date().toISOString().split('T')[0];

const sanitizeDate = (val) => {
  if (!val) return val;
  const parts = val.split('-');
  if (parts[0] && parts[0].length > 4) {
    parts[0] = parts[0].slice(0, 4);
    return parts.join('-');
  }
  return val;
};

const initialGoalForm = { name: '', target_amount: '', target_date: '' };
const inputClass =
  'w-full rounded-2xl border border-stone-200 bg-[#FAF6F0] px-3.5 py-3 text-sm text-[#24151B] focus:border-[#FF902B] focus:bg-white focus:outline-none transition-all';

function Field({ label, ...props }) {
  return (
    <label className="space-y-1.5 text-xs font-bold text-stone-600 block">
      <span>{label}</span>
      <input className={inputClass} {...props} />
    </label>
  );
}

export default function PortfolioPage() {
  const { refreshUserData, isAuthenticated, setAuthView } = useAuth();
  const [savings, setSavings] = useState(null);
  const [investments, setInvestments] = useState(null);
  const [goalForm, setGoalForm] = useState(initialGoalForm);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);
  const [investmentForm, setInvestmentForm] = useState({
    name: '',
    investment_type: 'STOCKS',
    amount: '',
    platform: '',
    purchase_date: todayStr(),
    note: '',
  });
  const [sale, setSale] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!isAuthenticated) return;
    try {
      const [s, i] = await Promise.all([getSavings(), getInvestments()]);
      setSavings(s);
      setInvestments(i);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (operation) => {
    setError('');
    try {
      await operation();
      await Promise.all([load(), refreshUserData({ preserveUser: true, onlyAccounts: true })]);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeposit = async () => {
    if (isSubmitting) return;
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setError('Please enter a valid amount to save.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await depositSavings(active.id, { amount: num, balance_type: 'BANK' });
      const depositedAmount = num;
      setAmount(''); // Reset input amount to prevent duplicate deposits
      await Promise.all([load(), refreshUserData({ preserveUser: true, onlyAccounts: true })]);
      setModalFeedback({
        title: 'Savings Added!',
        message: `₹${money(depositedAmount)} successfully saved toward "${active.name}".`,
        type: 'success',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (isSubmitting) return;
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setError('Please enter a valid amount to withdraw.');
      return;
    }
    if (active && num > parseFloat(active.saved_amount)) {
      setError(`Cannot withdraw ₹${money(num)}. Only ₹${money(active.saved_amount)} is currently saved.`);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await withdrawSavings(active.id, { amount: num, balance_type: 'BANK' });
      const withdrawnAmount = num;
      setAmount(''); // Reset input amount to 0/empty to prevent duplicate withdrawals
      await Promise.all([load(), refreshUserData({ preserveUser: true, onlyAccounts: true })]);
      setModalFeedback({
        title: 'Withdrawal Successful!',
        message: `₹${money(withdrawnAmount)} has been withdrawn from "${active.name}" and returned to your Bank balance.`,
        type: 'success',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelGoal = async () => {
    if (isSubmitting) return;
    if (!window.confirm(`Are you sure you want to cancel the goal "${active.name}"? Any remaining balance will be returned to Bank.`)) {
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await actOnSavingsGoal(active.id, 'cancel', 'BANK');
      setAmount('');
      await Promise.all([load(), refreshUserData({ preserveUser: true, onlyAccounts: true })]);
      setModalFeedback({
        title: 'Goal Cancelled',
        message: `"${active.name}" was cancelled. Remaining funds have been refunded to Bank.`,
        type: 'info',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-[32px] bg-white p-8 sm:p-12 text-center border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] max-w-md mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FFF0E2] text-[#FF902B] mx-auto flex items-center justify-center">
          <Target className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#24151B]">Sign in to manage portfolio</h2>
        <p className="text-xs text-stone-400">
          Track assets, set savings targets, and keep emergency funds separate from spendable cash.
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

  const active = savings?.active_goal;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#24151B]">
          Savings &amp; Investments
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-stone-400">
          Reserve money intentionally and track assets without turning them into daily expenses.
        </p>
      </div>

      {error && <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 font-semibold">{error}</div>}

      {/* Hero Bento Cards: Saved Wallet vs Investment Portfolio */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Saved Wallet (Deep Plum Card) */}
        <div className="rounded-[32px] bg-[#331B24] text-white p-6 sm:p-8 shadow-[0_16px_40px_rgba(51,27,36,0.18)] border border-[#462532] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#D2B4ED]">
                <Target className="h-4 w-4 text-[#C5F52A]" />
                <span>Saved Wallet</span>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white/10 text-[#C5F52A]">
                RESERVED
              </span>
            </div>
            <div className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#FAF6F0]">
              ₹{money(savings?.saved_wallet_balance)}
            </div>
          </div>
          <p className="mt-4 text-xs text-[#D2B4ED]/80">
            Excluded from your spendable Available Balance.
          </p>
        </div>

        {/* Investment Portfolio (Clean White Card) */}
        <div className="rounded-[32px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                <TrendingUp className="h-4 w-4 text-[#FF902B]" />
                <span>Investment Portfolio</span>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#FFF0E2] text-[#FF902B]">
                GROWTH
              </span>
            </div>
            <div className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#24151B]">
              ₹{money(investments?.total_invested)}
            </div>
          </div>
          <p className="mt-4 text-xs text-stone-400">
            Gold, stocks, crypto &amp; assets tracked independently.
          </p>
        </div>
      </section>

      {/* Active Savings Goal */}
      <section className="rounded-[32px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#24151B]">Active Savings Goal</h2>
            <p className="text-[11px] text-stone-400">Lock money away toward a target</p>
          </div>
          {active && (
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#E4F5EE] text-[#075743]">
              {active.progress_percentage}% Reached
            </span>
          )}
        </div>

        {active ? (
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-baseline text-sm">
              <span className="font-extrabold text-[#24151B] text-base">{active.name}</span>
              <span className="font-bold text-stone-500">
                <span className="text-[#075743] font-extrabold">₹{money(active.saved_amount)}</span> / ₹{money(active.target_amount)}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-stone-100 p-0.5">
              <div
                className="h-full rounded-full bg-[#C5F52A] transition-all duration-500 shadow-xs"
                style={{ width: `${Math.min(100, active.progress_percentage || 0)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-2">
              <Field
                label="Amount (₹)"
                type="number"
                min="0.01"
                step="any"
                placeholder="0.00"
                value={amount}
                disabled={isSubmitting}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                type="button"
                disabled={isSubmitting || !amount || Number(amount) <= 0}
                className="mt-6 flex items-center justify-center gap-1.5 rounded-full bg-[#C5F52A] px-4 py-3 text-xs font-extrabold text-[#1C1014] hover:bg-[#B4E81E] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                onClick={handleDeposit}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#1C1014]" />
                ) : (
                  <ArrowDownToLine className="h-4 w-4" />
                )}
                <span>Save</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting || !amount || Number(amount) <= 0}
                className="mt-6 flex items-center justify-center gap-1.5 rounded-full bg-[#FF902B] px-4 py-3 text-xs font-extrabold text-white hover:bg-[#E0791B] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                onClick={handleWithdraw}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpFromLine className="h-4 w-4" />
                )}
                <span>Withdraw</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="mt-6 rounded-full border border-stone-200 px-4 py-3 text-xs font-bold text-stone-600 hover:bg-stone-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                onClick={handleCancelGoal}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form
            className="grid gap-3 sm:grid-cols-3 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await createSavingsGoal(goalForm);
                setGoalForm(initialGoalForm);
              });
            }}
          >
            <Field
              label="Goal name"
              required
              placeholder="e.g. Vacation Fund"
              value={goalForm.name}
              onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
            />
            <Field
              label="Target amount (₹)"
              required
              type="number"
              min="0.01"
              step="any"
              placeholder="e.g. 50000"
              value={goalForm.target_amount}
              onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })}
            />
            <Field
              label="Target date (optional)"
              type="date"
              min={todayStr()}
              max="2099-12-31"
              value={goalForm.target_date}
              onChange={(e) => setGoalForm({ ...goalForm, target_date: sanitizeDate(e.target.value) })}
            />
            <button 
              type="submit"
              className="rounded-full bg-[#C5F52A] px-5 py-3.5 text-xs font-extrabold text-[#1C1014] sm:col-span-3 hover:bg-[#B4E81E] active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create Savings Goal
            </button>
          </form>
        )}
      </section>

      {/* Goal History */}
      <section className="rounded-[32px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-4">
        <h2 className="text-base sm:text-lg font-extrabold text-[#24151B]">Goal History</h2>
        {(savings?.goals || []).filter((g) => g.status !== 'ACTIVE').length === 0 ? (
          <p className="text-xs text-stone-400 py-3">No past savings goals recorded yet.</p>
        ) : (
          (savings?.goals || [])
            .filter((g) => g.status !== 'ACTIVE')
            .map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-2xl bg-[#FAF6F0] p-3.5 text-xs font-semibold text-stone-600"
              >
                <span className="flex items-center gap-2 font-bold text-[#24151B]">
                  <CheckCircle2 className="h-4 w-4 text-[#075743]" />
                  {g.name}
                </span>
                <span>
                  {g.status === 'COMPLETED' ? 'Mission Accomplished' : 'Cancelled'} • ₹{money(g.saved_amount)}
                </span>
              </div>
            ))
        )}
      </section>

      {/* Add Investment */}
      <section className="rounded-[32px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#24151B]">Record Investment Asset</h2>
          <p className="text-xs text-stone-400">Tracked as a separate asset without touching your main wallet balance.</p>
        </div>

        <form
          className="grid gap-3 sm:grid-cols-2 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await createInvestment(investmentForm);
              setInvestmentForm({
                name: '',
                investment_type: 'STOCKS',
                amount: '',
                platform: '',
                note: '',
                purchase_date: todayStr(),
              });
            });
          }}
        >
          <Field
            label="Investment name"
            required
            placeholder="e.g. Gold, Nifty 50, Bitcoin"
            value={investmentForm.name}
            onChange={(e) => setInvestmentForm({ ...investmentForm, name: e.target.value })}
          />
          <Field
            label="Amount invested (₹)"
            required
            type="number"
            min="0.01"
            step="any"
            placeholder="e.g. 5000"
            value={investmentForm.amount}
            onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })}
          />
          <Field
            label="Platform / Broker"
            placeholder="e.g. Zerodha, Groww, CoinDCX"
            value={investmentForm.platform}
            onChange={(e) => setInvestmentForm({ ...investmentForm, platform: e.target.value })}
          />
          <label className="space-y-1.5 text-xs font-bold text-stone-600 block">
            <span>Asset Type</span>
            <select
              className={inputClass}
              value={investmentForm.investment_type}
              onChange={(e) => setInvestmentForm({ ...investmentForm, investment_type: e.target.value })}
            >
              {['GOLD', 'CRYPTO', 'STOCKS', 'MUTUAL_FUNDS', 'OTHER'].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Purchase date"
            type="date"
            min="1970-01-01"
            max={todayStr()}
            value={investmentForm.purchase_date}
            onChange={(e) =>
              setInvestmentForm({ ...investmentForm, purchase_date: sanitizeDate(e.target.value) })
            }
          />
          <button 
            type="submit"
            className="rounded-full bg-[#FF902B] px-5 py-3.5 text-xs font-extrabold text-white sm:col-span-2 hover:bg-[#E0791B] active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Record Purchase
          </button>
        </form>
      </section>

      {/* Investment History */}
      <section className="rounded-[32px] bg-white p-6 sm:p-8 border border-stone-200/60 shadow-[0_8px_30px_rgba(51,27,36,0.04)] space-y-3">
        <h2 className="text-base sm:text-lg font-extrabold text-[#24151B]">Investment Assets</h2>
        {(!investments?.investments || investments.investments.length === 0) ? (
          <div className="rounded-2xl bg-[#FAF6F0] p-6 text-center text-xs text-stone-400">
            No investments recorded yet. Record your assets above.
          </div>
        ) : (
          investments.investments.map((i) => (
            <div
              key={i.id}
              className={`rounded-2xl border p-4 transition-all ${
                i.is_closed ? 'bg-stone-50 text-stone-400 border-stone-100' : 'bg-[#FAF6F0] border-stone-200/60'
              }`}
            >
              <div className="flex justify-between items-baseline text-sm font-extrabold text-[#24151B]">
                <span>
                  {i.name} <span className="text-xs font-normal text-stone-400">({i.investment_type})</span>
                </span>
                <span className="text-[#075743]">₹{money(i.cost_basis)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/50 pt-2.5 text-xs text-stone-500">
                <span>{i.platform || 'Direct'} • {i.purchase_date}</span>
                <div className="flex items-center gap-2">
                  {!i.is_closed && (
                    <button
                      type="button"
                      className="font-extrabold text-[#FF902B] hover:text-[#E0791B] px-3 py-1 rounded-full bg-white border border-stone-200 shadow-2xs transition"
                      onClick={() =>
                        setSale({ id: i.id, max: i.cost_basis, proceeds: '', cost_basis_sold: '' })
                      }
                    >
                      Record Sale
                    </button>
                  )}
                  <button
                    type="button"
                    className="font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-full hover:bg-rose-50 transition flex items-center gap-1"
                    title="Delete investment asset"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${i.name}?`)) {
                        run(() => deleteInvestment(i.id));
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
              {sale?.id === i.id && (
                <form
                  className="mt-3 grid grid-cols-2 gap-2 p-3 bg-white rounded-2xl border border-stone-200"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      await sellInvestment(i.id, {
                        cost_basis_sold: sale.cost_basis_sold,
                        proceeds: sale.proceeds,
                      });
                      setSale(null);
                    });
                  }}
                >
                  <Field
                    label="Cost basis sold (₹)"
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    max={sale.max}
                    placeholder="0.00"
                    value={sale.cost_basis_sold}
                    onChange={(e) => setSale({ ...sale, cost_basis_sold: e.target.value })}
                  />
                  <Field
                    label="Actual proceeds (₹)"
                    required
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={sale.proceeds}
                    onChange={(e) => setSale({ ...sale, proceeds: e.target.value })}
                  />
                  <button 
                    type="submit"
                    className="rounded-full bg-[#075743] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#054333] transition col-span-2 cursor-pointer mt-1"
                  >
                    Confirm Sale
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </section>

      {/* Acknowledgment Modal Popup */}
      {modalFeedback && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setModalFeedback(null)}
        >
          <div
            className="w-full max-w-sm rounded-[36px] bg-white p-6 sm:p-7 shadow-2xl text-center space-y-4 border border-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E4F5EE] text-[#075743]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#24151B]">{modalFeedback.title}</h3>
              <p className="mt-2 text-xs text-stone-500">{modalFeedback.message}</p>
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => setModalFeedback(null)}
              className="w-full rounded-full bg-[#C5F52A] py-3 text-xs font-extrabold text-[#1C1014] hover:bg-[#B4E81E] active:scale-95 transition shadow-sm cursor-pointer"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
